import { ItemSelection, Keyframe, ShapeDefinition } from "../../lib/types";
import { flatten, verticesFromPoints } from "../../lib/vertices";
import { createProgram, WebGLRenderer } from "../../lib/webgl";
import {
  createShapeMutationList,
  MAX_MUTATION_VECTORS,
  mutationShader,
  mutationValueShader,
} from "./mutatePoint";
import { flattenShapes, getAnchor } from "./utils";

const compositionVertexShader = `
  uniform vec2 viewport;
  uniform vec3 translate;
  uniform vec3 basePosition;
  uniform vec4 scale;
  uniform float mutation; 

  attribute vec2 coordinates;

  mat4 viewportScale = mat4(
    2.0 / viewport.x, 0, 0, 0,   
    0, -2.0 / viewport.y, 0, 0,    
    0, 0, 1, 0,    
    -1, +1, 0, 1
  );

  ${mutationValueShader}
  ${mutationShader}

  void main() {
    vec3 deform = mutatePoint(vec3(coordinates + translate.xy, 1.0), int(mutation));

    vec4 pos = viewportScale * vec4((deform.xy + basePosition.xy) * scale.x, translate.z, 1.0);
    gl_Position = vec4((pos.xy + scale.ba) * scale.y, pos.z - 1.0, 1.0);
  }
`;

const compositionFragmentShader = `
  precision mediump float;

  void main(void) {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
`;

export const showCompositionMap = (): {
  setImage(image: HTMLImageElement): void;
  setShapes(s: ShapeDefinition[]): void;
  setVectorValues(v: Keyframe): void;
  setZoom(zoom: number): void;
  setPan(x: number, y: number): void;
  setLayerSelected(layer: null | ItemSelection): void;
  renderer: WebGLRenderer;
} => {
  const stride = 2;

  let shapes: ShapeDefinition[] | null = null;

  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let vertexBuffer: WebGLBuffer | null = null;
  let img: HTMLImageElement | null = null;
  let layersSelected: string[] = [];
  let vectorValues: Keyframe = {};

  let elements: {
    name: string;
    start: number;
    amount: number;
    mutator: number;
    x: number;
    y: number;
    z: number;
  }[] = [];
  let mutators: string[] = [];
  let zoom = 1.0;
  let pan = [0, 0];
  let scale = 1.0;

  const populateShapes = () => {
    if (!shapes || !gl || !vertexBuffer || !program) return;
    const vertices: number[] = [];
    elements = [];
    mutators = [];

    gl.useProgram(program);
    const sprites = flattenShapes(shapes);
    sprites.forEach((shape, index) => {
      const anchor = getAnchor(shape);
      const itemOffset = [...shape.translate, index * 0.1];
      const points = shape.points.map(([x, y]) => [
        x - anchor[0],
        y - anchor[1],
      ]);
      const list = verticesFromPoints(points);

      elements.push({
        name: shape.name,
        start: vertices.length / stride,
        amount: list.length / 2,
        mutator: 0,
        x: itemOffset[0],
        y: itemOffset[1],
        z: itemOffset[2] * 0.001,
      });
      vertices.push(...list);
    });

    const {
      parentList,
      vectorSettings,
      mutatorMapping,
      shapeMutatorMapping,
    } = createShapeMutationList(shapes);

    elements.forEach((element) => {
      element.mutator = shapeMutatorMapping[element.name];
    });

    mutators = Object.keys(mutatorMapping);

    elements.sort((a, b) => (b.z || 0) - (a.z || 0));

    const uMutationVectors = gl.getUniformLocation(program, "uMutationVectors");
    gl.uniform4fv(uMutationVectors, flatten(vectorSettings));

    const uMutationParent = gl.getUniformLocation(program, "uMutationParent");
    gl.uniform1fv(uMutationParent, parentList);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  };

  let cWidth = 0;
  let cHeight = 0;
  let basePosition = [0, 0, 0.1];

  return {
    setImage(image) {
      img = image;
    },
    setShapes(s) {
      shapes = s;
      populateShapes();
    },
    setVectorValues(v) {
      vectorValues = v;
      if (mutators.length === 0 || !program || !gl) return;
      gl.useProgram(program);

      const uMutationValues = gl.getUniformLocation(program, "uMutationValues");
      const mutationValues = new Float32Array(MAX_MUTATION_VECTORS * 2).fill(0);
      Object.entries(vectorValues).forEach(([key, value]) => {
        const index = mutators.indexOf(key);
        if (index === -1) return;
        mutationValues[index * 2] = value[0];
        mutationValues[index * 2 + 1] = value[1];
      });
      gl.uniform2fv(uMutationValues, mutationValues);
    },
    setZoom(newZoom) {
      zoom = newZoom;
    },
    setPan(x, y) {
      pan = [x, y];
    },
    setLayerSelected(layer) {
      if (layer === null || shapes === null) {
        layersSelected = [];
        return;
      }

      const checkMatch = (shape: ShapeDefinition, item: ItemSelection) =>
        (shape.name === item.name && item.type === "layer") ||
        (item.type === "vector" &&
          (shape.type === "sprite" || shape.type === "folder") &&
          shape.mutationVectors &&
          shape.mutationVectors.map((v) => v.name).includes(item.name));

      const collectSpriteNames = (
        s: ShapeDefinition[],
        collect = false
      ): string[] =>
        s.reduce(
          (result, shape) =>
            shape.type === "sprite"
              ? collect || checkMatch(shape, layer)
                ? result.concat(shape.name)
                : result
              : result.concat(
                  collectSpriteNames(
                    shape.items,
                    collect || checkMatch(shape, layer)
                  )
                ),
          [] as string[]
        );

      layersSelected = collectSpriteNames(shapes);
    },
    renderer(initgl: WebGLRenderingContext, { getSize }) {
      gl = initgl;

      vertexBuffer = gl.createBuffer();

      const [shaderProgram, programCleanup] = createProgram(
        gl,
        compositionVertexShader,
        compositionFragmentShader
      );
      program = shaderProgram;

      return {
        render() {
          if (!img || !shapes) {
            return;
          }
          const gl = initgl;
          gl.useProgram(shaderProgram);
          gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

          const coord = gl.getAttribLocation(shaderProgram, "coordinates");
          gl.vertexAttribPointer(
            coord,
            2,
            gl.FLOAT,
            false,
            Float32Array.BYTES_PER_ELEMENT * stride,
            /* offset */ 0
          );
          gl.enableVertexAttribArray(coord);

          const [canvasWidth, canvasHeight] = getSize();
          if (canvasWidth !== cWidth || canvasHeight !== cHeight) {
            const landscape =
              img.width / canvasWidth > img.height / canvasHeight;

            scale = landscape
              ? canvasWidth / img.width
              : canvasHeight / img.height;

            gl.uniform2f(
              gl.getUniformLocation(shaderProgram, "viewport"),
              canvasWidth,
              canvasHeight
            );

            basePosition = [
              canvasWidth / 2 / scale,
              canvasHeight / 2 / scale,
              0.1,
            ];
            cWidth = canvasWidth;
            cHeight = canvasHeight;
          }

          gl.uniform4f(
            gl.getUniformLocation(shaderProgram, "scale"),
            scale,
            zoom,
            pan[0],
            pan[1]
          );

          const translate = gl.getUniformLocation(shaderProgram, "translate");
          const uBasePosition = gl.getUniformLocation(
            shaderProgram,
            "basePosition"
          );
          gl.uniform3f(
            uBasePosition,
            basePosition[0],
            basePosition[1],
            basePosition[2]
          );
          const mutation = gl.getUniformLocation(shaderProgram, "mutation");

          elements.forEach((element) => {
            if (layersSelected.includes(element.name) && element.amount > 0) {
              // if (element.amount > 0) {
              gl.uniform3f(translate, element.x, element.y, element.z);
              gl.uniform1f(mutation, element.mutator);

              for (let i = 0; i < element.amount; i += 3) {
                gl.drawArrays(initgl.LINE_LOOP, element.start + i, 3);
              }
            }
          });
        },
        cleanup() {
          const gl = initgl;
          gl.deleteBuffer(vertexBuffer);
          programCleanup();
        },
      };
    },
  };
};

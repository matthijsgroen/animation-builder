import { vectorNamesFromShape } from "src/lib/definitionHelpers";
import { flatten } from "src/lib/vertices";
import {
  isShapeDefinition,
  isShapeMutationVector,
  visitShapes,
} from "src/lib/visit";
import {
  ItemSelection,
  Keyframe,
  MutationVectorTypes,
  ShapeDefinition,
} from "../../lib/types";
import { createProgram, WebGLRenderer } from "../../lib/webgl";
import {
  createShapeMutationList,
  MAX_MUTATION_VECTORS,
  mutationShader,
  mutationValueShader,
} from "./mutatePoint";

const compositionVertexShader = `
  varying mediump vec4 vColor;
  varying mediump vec4 vCircle;
  varying mediump vec2 vViewport;
  uniform float mutation; 

  uniform vec2 viewport;
  uniform vec3 translate;
  uniform vec3 basePosition;
  uniform vec4 scale;

  attribute vec2 coordinates;
  attribute vec4 color;

  mat4 viewportScale = mat4(
    2.0 / viewport.x, 0, 0, 0,   
    0, -2.0 / viewport.y, 0, 0,    
    0, 0, 1, 0,    
    -1, +1, 0, 1
  );

  ${mutationValueShader}
  ${mutationShader}

  void main() {
    vec3 deform = mutatePoint(vec3(translate.xy, 1.0), int(mutation));

    vec4 pos = viewportScale * vec4((deform.xy + basePosition.xy) * scale.x, translate.z, 1.0);

    int pointIndex = int(coordinates.x);
    float radius = abs(coordinates.y);

    vec2 spec = vec2(-1.0, -1.0);

    if (pointIndex == 1) {
      spec = vec2(1.0, -1.0);
    }

    if (pointIndex == 2) {
      spec = vec2(-1.0, 1.0);
    }

    if (pointIndex == 3) {
      spec = vec2(1.0, 1.0);
    }

    vec2 size = (vec4(spec.xy * radius, 1.0, 1.0) * viewportScale).xy;
    if (coordinates.y > 0.0) {
      size *= scale.y * scale.x;
    } else {
      size *= -coordinates.y;
    }

    vec2 center = (pos.xy + scale.ba) * scale.y;

    gl_Position = vec4(center + size, pos.z - 1.0, 1.0);

    vCircle = vec4(center, abs(size.x), abs(size.y));

    vColor = color;
    vViewport = viewport;
  }
`;

const compositionFragmentShader = `
  precision mediump float;
  varying mediump vec4 vColor;
  varying mediump vec4 vCircle;
  varying mediump vec2 vViewport;

  void main(void) {
    vec2 screenPos = ((gl_FragCoord.xy / (vViewport / 2.0)) - 1.0);

    float distX = abs(vCircle.x - screenPos.x) / vCircle.z;
    if (distX > 1.0 || distX < -1.0) discard;
    float distY = abs(vCircle.y - screenPos.y) / vCircle.a;
    if (distY > 1.0 || distY < -1.0) discard;

    vec2 quadPos = vec2(distX, distY);
    float distSquared = dot(quadPos, quadPos);

    if (distSquared > 1.0) discard;

    gl_FragColor = vec4(vColor.rgb * vColor.a, vColor.a);
  }
`;

type Color = [number, number, number];

const orange = [238, 115, 0].map((v) => v / 256.0) as Color;
const red = [230, 0, 0].map((v) => v / 256.0) as Color;
const purple = [187, 0, 255].map((v) => v / 256.0) as Color;
const green = [0, 180, 0].map((v) => v / 256.0) as Color;
const white = [240, 240, 240].map((v) => v / 256.0) as Color;

const colorMapping: Record<MutationVectorTypes, Color> = {
  deform: orange,
  rotate: red,
  stretch: purple,
  translate: green,
  opacity: white,
  lightness: white,
  colorize: orange,
};

export const showCompositionVectors = (): {
  setImage(image: HTMLImageElement): void;
  setShapes(s: ShapeDefinition[]): void;
  setVectorValues(v: Keyframe): void;
  setZoom(zoom: number): void;
  setPan(x: number, y: number): void;
  setLayerSelected(layer: null | ItemSelection): void;
  renderer: WebGLRenderer;
} => {
  const stride = 6;

  let shapes: ShapeDefinition[] | null = null;

  let gl: WebGLRenderingContext | null = null;
  let vertexBuffer: WebGLBuffer | null = null;
  let indexBuffer: WebGLBuffer | null = null;
  let img: HTMLImageElement | null = null;
  let program: WebGLProgram | null = null;
  let vectorsSelected: string[] = [];
  let vectorValues: Keyframe = {};

  let vectors: {
    name: string;
    start: number;
    amount: number;
    mutator: number;
    boundToLayer: string;
    x: number;
    y: number;
    z: number;
  }[] = [];
  let mutators: string[] = [];
  let zoom = 1.0;
  let pan = [0, 0];
  let scale = 1.0;

  const populateShapes = () => {
    if (!shapes || !gl || !indexBuffer || !vertexBuffer || !program) return;
    const vertices: number[] = [];
    const indices: number[] = [];
    gl.useProgram(program);

    vectors = [];
    visitShapes(shapes, (shape) => {
      if (!isShapeDefinition(shape)) {
        return undefined;
      }

      shape.mutationVectors
        .filter(isShapeMutationVector)
        .forEach((vector, i) => {
          const start = indices.length;
          vectors.push({
            name: vector.name,
            mutator: 0,
            boundToLayer: shape.name,
            x: vector.origin[0],
            y: vector.origin[1],
            z: 0.00001 * i,
            start,
            amount: 6,
          });
          const offset = vertices.length / stride;
          const color = colorMapping[vector.type];
          vertices.push(0, -3, ...color, 1);
          vertices.push(1, -3, ...color, 1);
          vertices.push(2, -3, ...color, 1);
          vertices.push(3, -3, ...color, 1);

          indices.push(
            offset,
            offset + 1,
            offset + 2,
            offset + 1,
            offset + 2,
            offset + 3
          );

          if (
            vector.type === "deform" ||
            (vector.type === "translate" && vector.radius !== -1)
          ) {
            const start = indices.length;
            vectors.push({
              name: vector.name,
              mutator: 0,
              boundToLayer: shape.name,
              x: vector.origin[0],
              y: vector.origin[1],
              z: 0.2 + 0.00001 * i,
              start,
              amount: 6,
            });
            const offset = vertices.length / stride;
            const color = colorMapping[vector.type];
            vertices.push(0, vector.radius, ...color, 0.2);
            vertices.push(1, vector.radius, ...color, 0.2);
            vertices.push(2, vector.radius, ...color, 0.2);
            vertices.push(3, vector.radius, ...color, 0.2);

            indices.push(
              offset,
              offset + 1,
              offset + 2,
              offset + 1,
              offset + 2,
              offset + 3
            );
          }
        });
      return undefined;
    });

    const {
      parentList,
      vectorSettings,
      mutatorMapping,
    } = createShapeMutationList(shapes);

    vectors.forEach((vector) => {
      vector.mutator = mutatorMapping[vector.name];
    });

    mutators = Object.keys(mutatorMapping);

    const uMutationVectors = gl.getUniformLocation(program, "uMutationVectors");
    gl.uniform4fv(uMutationVectors, flatten(vectorSettings));

    const uMutationParent = gl.getUniformLocation(program, "uMutationParent");
    gl.uniform1fv(uMutationParent, parentList);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  };

  let cWidth = 0;
  let cHeight = 0;
  let basePosition = [0, 0, 0.1];

  return {
    setImage(image: HTMLImageElement) {
      img = image;
    },
    setShapes(s: ShapeDefinition[]) {
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
    setPan(x: number, y: number) {
      pan = [x, y];
    },
    setLayerSelected(layer) {
      if (layer === null || shapes === null) {
        vectorsSelected = [];
        return;
      }

      const checkMatch = (shape: ShapeDefinition, item: ItemSelection) =>
        shape.name === item.name && item.type === "layer"; //||

      const collectVectorNames = (
        s: ShapeDefinition[],
        collect = false
      ): string[] =>
        s.reduce(
          (result, shape) =>
            shape.type === "sprite"
              ? collect || checkMatch(shape, layer)
                ? result.concat(vectorNamesFromShape(shape))
                : result.concat(
                    vectorNamesFromShape(shape).filter(
                      (n) => layer.type === "vector" && n === layer.name
                    )
                  )
              : result.concat(
                  vectorNamesFromShape(shape).filter(
                    (n) =>
                      (layer.type === "vector" && n === layer.name) || collect
                  ),
                  collectVectorNames(
                    shape.items,
                    collect || checkMatch(shape, layer)
                  )
                ),
          [] as string[]
        );

      vectorsSelected = collectVectorNames(shapes);
    },
    renderer(initgl: WebGLRenderingContext, { getSize }) {
      gl = initgl;

      vertexBuffer = gl.createBuffer();
      indexBuffer = gl.createBuffer();

      const [shaderProgram, programCleanup] = createProgram(
        gl,
        compositionVertexShader,
        compositionFragmentShader
      );
      program = shaderProgram;

      const translate = gl.getUniformLocation(shaderProgram, "translate");
      const mutation = gl.getUniformLocation(shaderProgram, "mutation");
      const uBasePosition = gl.getUniformLocation(
        shaderProgram,
        "basePosition"
      );

      return {
        render() {
          if (!img || !shapes) {
            return;
          }
          const gl = initgl;
          gl.useProgram(shaderProgram);
          gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

          const coord = gl.getAttribLocation(shaderProgram, "coordinates");
          gl.vertexAttribPointer(
            coord,
            2,
            gl.FLOAT,
            false,
            stride * Float32Array.BYTES_PER_ELEMENT,
            /* offset */ 0
          );
          gl.enableVertexAttribArray(coord);

          const colors = gl.getAttribLocation(shaderProgram, "color");
          gl.vertexAttribPointer(
            colors,
            4,
            gl.FLOAT,
            false,
            stride * Float32Array.BYTES_PER_ELEMENT,
            /* offset */ 2 * Float32Array.BYTES_PER_ELEMENT
          );
          gl.enableVertexAttribArray(colors);

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

          gl.uniform3f(
            uBasePosition,
            basePosition[0],
            basePosition[1],
            basePosition[2]
          );

          vectors.forEach((vector) => {
            if (vectorsSelected.includes(vector.name)) {
              gl.uniform3f(translate, vector.x, vector.y, vector.z);
              gl.uniform1f(mutation, vector.mutator);
              gl.drawElements(
                gl.TRIANGLES,
                vector.amount,
                gl.UNSIGNED_SHORT,
                vector.start * 2
              );
            }
          });
        },
        cleanup() {
          const gl = initgl;
          gl.deleteBuffer(vertexBuffer);
          gl.deleteBuffer(indexBuffer);
          programCleanup();
        },
      };
    },
  };
};

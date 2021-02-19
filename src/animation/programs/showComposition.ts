import Delaunator from "delaunator";
import {
  isMutationVector,
  isShapeDefinition,
  visitShapes,
} from "src/lib/visit";
import { ShapeDefinition, Vec2 } from "../../lib/types";
import { createProgram, WebGLRenderer } from "../../lib/webgl";
import {
  MAX_TREE_SIZE,
  mutationShader,
  vectorTypeMapping,
} from "./mutatePoint";
import { flattenShapes, getAnchor } from "./utils";

const MAX_MUTATION_VECTORS = 20;

const compositionVertexShader = `
  uniform vec2 viewport;
  uniform vec3 translate;
  uniform vec4 scale;

  attribute vec2 coordinates;
  attribute vec2 aTextureCoord;

  varying lowp vec2 vTextureCoord;

  mat4 viewportScale = mat4(
    2.0 / viewport.x, 0, 0, 0,   
    0, -2.0 / viewport.y, 0, 0,    
    0, 0, 1, 0,    
    -1, +1, 0, 1
  );

  ${mutationShader}

  void main() {
    vec2 deform = mutatePoint(coordinates, int(mutation));

    vec4 pos = viewportScale * vec4((deform + translate.xy) * scale.x, translate.z, 1.0);
    gl_Position = vec4((pos.xy + scale.ba) * scale.y, pos.z, 1.0);
    vTextureCoord = aTextureCoord.xy;
  }
`;

const compositionFragmentShader = `
  precision mediump float;

  varying mediump vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform mediump vec2 uTextureDimensions;

  void main(void) {
    highp vec2 coord = vTextureCoord.xy / uTextureDimensions;
    mediump vec4 texelColor = texture2D(uSampler, coord);

    gl_FragColor = vec4(texelColor.rgb * texelColor.a, texelColor.a);
  }
`;

export const showComposition = (): {
  setImage(image: HTMLImageElement): void;
  setShapes(s: ShapeDefinition[]): void;
  setVectorValues(v: Record<string, Vec2>): void;
  setZoom(zoom: number): void;
  setPan(x: number, y: number): void;
  renderer: WebGLRenderer;
} => {
  const stride = 4;

  let shapes: ShapeDefinition[] | null = null;

  let gl: WebGLRenderingContext | null = null;
  let vertexBuffer: WebGLBuffer | null = null;
  let indexBuffer: WebGLBuffer | null = null;
  let img: HTMLImageElement | null = null;
  let texture: WebGLTexture | null = null;
  let program: WebGLProgram | null = null;

  let vectorValues: Record<string, Vec2> = {};
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
  let scale = 1.0;
  let pan = [0, 0];

  const setImageTexture = (): void => {
    if (img === null || texture === null || gl === null || program === null) {
      return;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    gl.uniform2f(
      gl.getUniformLocation(program, "uTextureDimensions"),
      img.width,
      img.height
    );
  };

  const populateShapes = () => {
    if (!shapes || !gl || !indexBuffer || !vertexBuffer || !program) return;
    const vertices: number[] = [];
    const indices: number[] = [];
    elements = [];
    mutators = [];

    gl.useProgram(program);

    const uMutationVectors = gl.getUniformLocation(program, "uMutationVectors");
    const vectorSettings: number[] = Array(MAX_MUTATION_VECTORS * 4).fill(0);

    const treeInfo: { mutator: number; shape: ShapeDefinition }[][] = [];

    visitShapes(shapes, (item, parents) => {
      if (isMutationVector(item)) {
        const index = mutators.length;
        mutators.push(item.name);
        vectorSettings[index * 4] = vectorTypeMapping[item.type];
        vectorSettings[index * 4 + 1] = item.origin[0];
        vectorSettings[index * 4 + 2] = item.origin[1];
        if (item.type === "deform") {
          vectorSettings[index * 4 + 3] = item.radius;
        }

        const existingBranch = treeInfo.find((branch) =>
          branch.find((node) => parents.includes(node.shape))
        );
        if (existingBranch) {
          existingBranch.push({
            mutator: index + 1,
            shape: parents
              .reverse()
              .find((e) => isShapeDefinition(e)) as ShapeDefinition,
          });
        } else {
          treeInfo.push([
            {
              mutator: index + 1,
              shape: parents
                .reverse()
                .find((e) => isShapeDefinition(e)) as ShapeDefinition,
            },
          ]);
        }
      }
      return undefined;
    });

    let level = 1;
    while (Math.pow(2, level) < treeInfo.length) {
      level++;
    }

    const childrenOf = (node: number): [number, number] => [
      node * 2,
      node * 2 + 1,
    ];

    const treeData = new Float32Array(MAX_TREE_SIZE).fill(0);
    const startElement = Math.pow(2, level);

    if (mutators.length >= MAX_MUTATION_VECTORS) {
      throw new Error("More vectors than shader permits");
    }

    gl.uniform4fv(uMutationVectors, vectorSettings);

    const sprites = flattenShapes(shapes);

    sprites.forEach((shape, index) => {
      const anchor = getAnchor(shape);

      const shapeIndices = Delaunator.from(shape.points).triangles;
      const start = indices.length;

      const itemOffset = [...shape.translate, index * 0.1];
      elements.push({
        name: shape.name,
        start,
        amount: shapeIndices.length,
        mutator: 0,
        x: itemOffset[0],
        y: itemOffset[1],
        z: itemOffset[2] * 0.001,
      });
      const offset = vertices.length / stride;
      shape.points.forEach(([x, y]) => {
        vertices.push(x - anchor[0], y - anchor[1], x, y);
      });

      shapeIndices.forEach((index) => {
        indices.push(index + offset);
      });
    });

    treeInfo.forEach((vectors, index) => {
      let nodeIndex = startElement + index;
      vectors.forEach((item, branchIndex) => {
        if (branchIndex > 0) {
          nodeIndex = childrenOf(nodeIndex)[0];
        }
        treeData[nodeIndex] = item.mutator;
        elements.forEach((e) => {
          if (
            (e.name === item.shape.name ||
              (item.shape.type === "folder" &&
                item.shape.items.find(
                  (c) => c.type === "sprite" && c.name === e.name
                ))) &&
            e.mutator < nodeIndex
          ) {
            e.mutator = nodeIndex;
          }
        });
      });
    });

    elements.sort((a, b) => (b.z || 0) - (a.z || 0));

    const uMutationTree = gl.getUniformLocation(program, "uMutationTree");
    gl.uniform1fv(uMutationTree, treeData);

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
      setImageTexture();
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
    renderer(initgl: WebGLRenderingContext, { getUnit, getSize }) {
      gl = initgl;

      const unit = getUnit();
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      vertexBuffer = gl.createBuffer();
      indexBuffer = gl.createBuffer();

      const [shaderProgram, programCleanup] = createProgram(
        gl,
        compositionVertexShader,
        compositionFragmentShader
      );
      program = shaderProgram;

      gl.useProgram(shaderProgram);
      gl.uniform1i(
        gl.getUniformLocation(shaderProgram, "uSampler"),
        unit.index
      );
      setImageTexture();
      populateShapes();

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
            Float32Array.BYTES_PER_ELEMENT * stride,
            /* offset */ 0
          );
          gl.enableVertexAttribArray(coord);
          const texCoord = gl.getAttribLocation(shaderProgram, "aTextureCoord");
          gl.vertexAttribPointer(
            texCoord,
            2,
            gl.FLOAT,
            false,
            Float32Array.BYTES_PER_ELEMENT * stride,
            /* offset */ 2 * Float32Array.BYTES_PER_ELEMENT
          );
          gl.enableVertexAttribArray(texCoord);

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

            gl.uniform2f(
              gl.getUniformLocation(shaderProgram, "uTextureDimensions"),
              img.width,
              img.height
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

          gl.activeTexture(unit.unit);
          gl.bindTexture(gl.TEXTURE_2D, texture);

          const translate = gl.getUniformLocation(shaderProgram, "translate");
          const mutation = gl.getUniformLocation(shaderProgram, "mutation");

          elements.forEach((element) => {
            if (element.amount === 0) {
              return;
            }
            gl.uniform3f(
              translate,
              basePosition[0] + element.x,
              basePosition[1] + element.y,
              basePosition[2] + element.z
            );
            gl.uniform1f(mutation, element.mutator);
            gl.drawElements(
              gl.TRIANGLES,
              element.amount,
              gl.UNSIGNED_SHORT,
              element.start * 2
            );
          });
        },
        cleanup() {
          const gl = initgl;
          gl.deleteTexture(texture);
          gl.deleteBuffer(vertexBuffer);
          gl.deleteBuffer(indexBuffer);
          programCleanup();
        },
      };
    },
  };
};

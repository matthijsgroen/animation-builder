import { Keyframe, ShapesDefinition, Vec3 } from "../../lib/types";
import { verticesFromPoints } from "../../lib/vertices";
import { createProgram, WebGLRenderer } from "../../lib/webgl";

const compositionVertexShader = `
  attribute vec2 coordinates;
  uniform vec2 viewport;
  uniform vec3 translate;
  uniform vec4 scale;

  uniform vec3 uDeformPositions[16];
  uniform vec2 uDeformValues[16];
  uniform vec4 moveAndSqueeze;

  mat4 viewportScale = mat4(
    2.0 / viewport.x, 0, 0, 0,   
    0, -2.0 / viewport.y, 0, 0,    
    0, 0, 1, 0,    
    -1, +1, 0, 1
  );

  void main() {
    vec2 deform = coordinates;

    for(int i = 0; i < 16; i++) {
      vec3 position = uDeformPositions[i];
      if (position.z > 0.0) {
        float effect = 1.0 - clamp(distance(coordinates, position.xy), 0.0, position.z) / position.z;

        deform = deform + uDeformValues[i] * effect;
      }
    }

    vec4 pos = viewportScale * vec4((deform * moveAndSqueeze.ba + moveAndSqueeze.xy + translate.xy) * scale.x, translate.z, 1.0);
    gl_Position = vec4((pos.xy + scale.ba) * scale.y, pos.z - 1.0, 1.0);
  }
`;

const compositionFragmentShader = `
  precision mediump float;

  void main(void) {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
`;

const getParentOffset = (
  shape: ShapesDefinition | undefined,
  shapes: ShapesDefinition[]
): Vec3 => {
  if (!shape || !shape.settings.parent) {
    return [0, 0, 0];
  }
  const parentId = shape.settings.parent.id;
  const parent = shapes.find((e) => e.name === parentId);
  const parentOffset = getParentOffset(parent, shapes);
  return [
    shape.settings.parent.offset[0] + parentOffset[0],
    shape.settings.parent.offset[1] + parentOffset[1],
    shapes.indexOf(shape) * 0.1,
  ];
};

type MutationVector = {
  index: number;
  vector: Vec3;
};

export const showCompositionMap = (): {
  setImage(image: HTMLImageElement): void;
  setShapes(s: ShapesDefinition[]): void;
  setZoom(zoom: number): void;
  setPan(x: number, y: number): void;
  setLayerSelected(layer: null | string): void;
  setKeyframe(frame: Keyframe | null): void;
  renderer: WebGLRenderer;
} => {
  const stride = 2;

  let shapes: ShapesDefinition[] | null = null;

  let gl: WebGLRenderingContext | null = null;
  let vertexBuffer: WebGLBuffer | null = null;
  let indexBuffer: WebGLBuffer | null = null;
  let img: HTMLImageElement | null = null;
  let layerSelected: string | null = null;
  let keyframe: Keyframe | null = null;

  let elements: {
    start: number;
    amount: number;
    deformationVectors: Record<string, MutationVector>;
  }[] = [];
  let zoom = 1.0;
  let pan = [0, 0];

  const populateShapes = () => {
    if (!shapes || !gl || !indexBuffer || !vertexBuffer) return;
    const vertices: number[] = [];
    elements = [];

    shapes.forEach((shape) => {
      const anchor = shape.settings.anchor;
      const points = shape.points.map(([x, y]) => [
        x - anchor[0],
        y - anchor[1],
      ]);
      const list = verticesFromPoints(points);
      const deformationVectors = Object.entries(
        shape.mutationVectors || {}
      ).reduce(
        (result, [key, value], index) => ({
          ...result,
          [key]: { vector: value, index },
        }),
        {} as Record<string, MutationVector>
      );
      elements.push({
        start: vertices.length / stride,
        amount: list.length / 2,
        deformationVectors,
      });
      vertices.push(...list);
    });
    const indices = Array(vertices.length / stride)
      .fill(0)
      .map((_, i) => i);

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

  return {
    setImage(image: HTMLImageElement) {
      img = image;
    },
    setShapes(s: ShapesDefinition[]) {
      shapes = s;
      populateShapes();
    },
    setZoom(newZoom) {
      zoom = newZoom;
    },
    setPan(x: number, y: number) {
      pan = [x, y];
    },
    setLayerSelected(layer) {
      layerSelected = layer;
    },
    setKeyframe(frame) {
      keyframe = frame;
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

          const [canvasWidth, canvasHeight] = getSize();
          const landscape = img.width / canvasWidth > img.height / canvasHeight;

          const scale = landscape
            ? canvasWidth / img.width
            : canvasHeight / img.height;

          gl.uniform2f(
            gl.getUniformLocation(shaderProgram, "viewport"),
            canvasWidth,
            canvasHeight
          );

          gl.uniform4f(
            gl.getUniformLocation(shaderProgram, "scale"),
            scale,
            zoom,
            pan[0],
            pan[1]
          );

          const basePosition = [
            canvasWidth / 2 / scale,
            canvasHeight / 2 / scale,
            0.1,
          ];
          const items = shapes;

          const calculatedElements = elements.map((element, index) => {
            const shape = items[index];
            const itemOffset = getParentOffset(shape, items);

            const deformationVectorList = Object.values(
              element.deformationVectors
            ).reduce((list, item) => list.concat(item.vector), [] as number[]);

            return {
              name: shape.name,
              ...element,
              x: basePosition[0] + itemOffset[0],
              y: basePosition[1] + itemOffset[1],
              z: basePosition[2] - itemOffset[2] * 0.001,
              deformationVectorList,
            };
          });

          calculatedElements.sort((a, b) => (b.z || 0) - (a.z || 0));

          const translate = gl.getUniformLocation(shaderProgram, "translate");
          const deformation = gl.getUniformLocation(
            shaderProgram,
            "uDeformPositions"
          );
          const deformationValues = gl.getUniformLocation(
            shaderProgram,
            "uDeformValues"
          );
          const moveAndSqueeze = gl.getUniformLocation(
            shaderProgram,
            "moveAndSqueeze"
          );

          calculatedElements.forEach((element) => {
            if (element.name === layerSelected) {
              gl.uniform3f(translate, element.x, element.y, element.z);

              const elementData = keyframe && keyframe[element.name];
              const deformValues: number[] = Array(16 * 2).fill(0);
              const moveSquezeValues: number[] = [0, 0, 1, 1];

              if (elementData) {
                Object.entries(elementData.deformations || {}).forEach(
                  ([key, value]) => {
                    const index = element.deformationVectors[key].index;

                    deformValues[index * 2] = value[0];
                    deformValues[index * 2 + 1] = value[1];
                  }
                );
                if (elementData.stretchX) {
                  moveSquezeValues[2] = elementData.stretchX;
                }
                if (elementData.stretchY) {
                  moveSquezeValues[3] = elementData.stretchY;
                }
                if (elementData.translateX) {
                  moveSquezeValues[0] = elementData.translateX;
                }
                if (elementData.translateY) {
                  moveSquezeValues[1] = elementData.translateY;
                }
              }

              gl.uniform4f(
                moveAndSqueeze,
                moveSquezeValues[0],
                moveSquezeValues[1],
                moveSquezeValues[2],
                moveSquezeValues[3]
              );
              gl.uniform3fv(
                deformation,
                element.deformationVectorList
                  .concat(Array(16 * 3).fill(0))
                  .slice(0, 16 * 3)
              );
              gl.uniform2fv(deformationValues, deformValues);

              gl.drawArrays(initgl.LINE_STRIP, element.start, element.amount);
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

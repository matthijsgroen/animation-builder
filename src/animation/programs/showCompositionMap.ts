import { ShapesDefinition, Vec3 } from "../../lib/types";
import { verticesFromPoints } from "../../lib/vertices";
import { createProgram, WebGLRenderer } from "../../lib/webgl";

const compositionVertexShader = `
  attribute vec2 coordinates;
  uniform vec2 viewport;
  uniform vec3 translate;
  uniform vec4 scale;

  mat4 viewportScale = mat4(
    2.0 / viewport.x, 0, 0, 0,   
    0, -2.0 / viewport.y, 0, 0,    
    0, 0, 1, 0,    
    -1, +1, 0, 1
  );

  void main() {
    vec4 pos = viewportScale * vec4((coordinates + translate.xy) * scale.x, translate.z, 1.0);
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

export const showCompositionMap = (): {
  setImage(image: HTMLImageElement): void;
  setShapes(s: ShapesDefinition[]): void;
  setZoom(zoom: number): void;
  setPan(x: number, y: number): void;
  setLayerSelected(layer: null | string): void;
  renderer: WebGLRenderer;
} => {
  const stride = 2;

  let shapes: ShapesDefinition[] | null = null;

  let gl: WebGLRenderingContext | null = null;
  let vertexBuffer: WebGLBuffer | null = null;
  let indexBuffer: WebGLBuffer | null = null;
  let img: HTMLImageElement | null = null;
  let layerSelected: string | null = null;

  let elements: { start: number; amount: number }[] = [];
  let zoom = 1.0;
  let pan = [0, 0];

  const populateShapes = () => {
    if (!shapes || !gl || !indexBuffer || !vertexBuffer) return;
    const vertices: number[] = [];
    elements = [];

    shapes.forEach((shape) => {
      const list = verticesFromPoints(shape.points);
      elements.push({
        start: vertices.length / stride,
        amount: list.length / 2,
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
            return {
              name: shape.name,
              ...element,
              x: basePosition[0] + itemOffset[0] - shape.settings.anchor[0],
              y: basePosition[1] + itemOffset[1] - shape.settings.anchor[1],
              z: basePosition[2] - itemOffset[2] * 0.001,
            };
          });

          calculatedElements.sort((a, b) => (b.z || 0) - (a.z || 0));

          const translate = gl.getUniformLocation(shaderProgram, "translate");
          calculatedElements.forEach((element) => {
            if (element.name === layerSelected) {
              gl.uniform3f(translate, element.x, element.y, element.z);
              // gl.drawElements(
              //   gl.TRIANGLES,
              //   element.amount,
              //   gl.UNSIGNED_SHORT,
              //   element.start * 2
              // );
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
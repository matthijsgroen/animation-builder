import { Vec2 } from "./types";

export enum ShaderType {
  Vertex,
  Fragment,
}

export type ShaderAttribute = {
  name: string;
  width: number;
};
export type AttributeList = ShaderAttribute[];

export const compileShader = (
  gl: WebGLRenderingContext,
  source: string,
  shaderType: ShaderType
): WebGLShader => {
  const shader = gl.createShader(
    shaderType === ShaderType.Vertex ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER
  );
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    source.split("\n").forEach((line, index) => {
      console.log(index + 1, line);
    });
    throw new Error(gl.getShaderInfoLog(shader) as string);
  }
  return shader;
};

interface ProgramAPI {
  getUnit(): { unit: number; index: number };
  getSize(): [number, number];
}

type Attribute = {
  name: string;
  width: number;
  bytes: number;
  type: WebGLRenderingContext["FLOAT"];
  offset: number;
  location: number;
};

export type AttributeTable = { [key: string]: Attribute };

export type RenderAPI = {
  render(): void;
  cleanup(): void;
};

export type WebGLRenderer = (
  gl: WebGLRenderingContext,
  api: ProgramAPI
) => Promise<RenderAPI> | RenderAPI;

export const webGLScene = async (
  element: HTMLCanvasElement,
  programs: WebGLRenderer[]
): Promise<RenderAPI> => {
  const gl = element.getContext("webgl", {
    premultipliedalpha: true,
    depth: true,
    antialias: true,
    powerPreference: "low-power",
  }) as WebGLRenderingContext;

  if (!gl) {
    throw new Error("No WebGL Support");
  }

  let textureCounter = 0;
  const units = [
    gl.TEXTURE0,
    gl.TEXTURE1,
    gl.TEXTURE2,
    gl.TEXTURE3,
    gl.TEXTURE4,
    gl.TEXTURE5,
    gl.TEXTURE6,
  ];

  const api: ProgramAPI = {
    getUnit: () => ({ index: textureCounter, unit: units[textureCounter++] }),
    getSize: () => [element.width, element.height],
  };

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
  } else {
    gl.clearColor(0.67, 0.67, 0.67, 1.0);
  }
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const renders = await Promise.all<RenderAPI>(
    programs.map((program) => program(gl, api))
  );

  return {
    render: () => {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.viewport(0, 0, element.width, element.height);
      renders.forEach((item) => item.render());
    },
    cleanup: () => {
      renders.forEach((item) => item.cleanup());
    },
  };
};

export const createProgram = (
  gl: WebGLRenderingContext,
  vertexShader: string,
  fragmentShader: string
): [WebGLProgram, () => void] => {
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create shader program");
  const vertex = compileShader(gl, vertexShader, ShaderType.Vertex);
  const fragment = compileShader(gl, fragmentShader, ShaderType.Fragment);

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Link failed: " + gl.getProgramInfoLog(program));
    console.error("vs info-log: " + gl.getShaderInfoLog(vertex));
    console.error("fs info-log: " + gl.getShaderInfoLog(fragment));
    throw new Error("Could not initialise shade(rs");
  }

  return [
    program,
    () => {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteProgram(program);
    },
  ];
};

export const getTextureCoordinate = (
  canvasSize: Vec2,
  textureSize: Vec2,
  panning: Vec2,
  zoom: number,
  coordinate: Vec2
): Vec2 => {
  const [texW, texH] = textureSize;
  const [canvW, canvH] = canvasSize;
  const [panX, panY] = panning;
  const [coordX, coordY] = coordinate;

  const landscape = texW / canvW > texH / canvH;

  const scale = landscape ? canvW / texW : canvH / texH;
  const scaledCanvasWidth = canvW / scale;
  const scaledCanvasHeight = canvH / scale;
  const relativeX = (coordX / canvW) * scaledCanvasWidth;
  const relativeY = (coordY / canvH) * scaledCanvasHeight;
  const halfH = texH / 2;
  const halfW = texW / 2;
  const top =
    scaledCanvasHeight / 2 - halfH - (panY * scaledCanvasHeight * zoom) / 2;
  const left =
    scaledCanvasWidth / 2 - halfW + (panX * scaledCanvasWidth * zoom) / 2;

  const x = (relativeX - left - halfW) / zoom + halfW;
  const y = (relativeY - top - halfH) / zoom + halfH;

  return [Math.round(x), Math.round(y)];
};

export const zoomFactor = (texture: HTMLImageElement | null): number =>
  texture ? (texture.height / screen.height) * 2.0 : 1.0;

export const maxZoomFactor = (texture: HTMLImageElement | null): number =>
  zoomFactor(texture) * 4.0;

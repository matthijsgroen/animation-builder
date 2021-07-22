import { fileredTriangles, flatten } from "src/lib/vertices";
import { Keyframe, ShapeDefinition } from "../../lib/types";
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
  uniform vec3 basePosition;
  uniform vec3 translate;
  uniform vec4 scale;
  uniform float mutation; 

  attribute vec2 coordinates;
  attribute vec2 aTextureCoord;

  varying lowp vec2 vTextureCoord;
  varying lowp float vOpacity;

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
    gl_Position = vec4((pos.xy + scale.ba) * scale.y, pos.z, 1.0);
    vTextureCoord = aTextureCoord.xy;
    vOpacity = deform.z;
  }
`;

const compositionFragmentShader = `
  precision mediump float;

  varying mediump vec2 vTextureCoord;
  varying mediump float vOpacity;
  uniform sampler2D uSampler;
  uniform mediump vec2 uTextureDimensions;
  uniform mediump vec4 uColorEffect;

  float RGBToL(vec3 color) {
    lowp float fmin = min(min(color.r, color.g), color.b);    //Min. value of RGB
    lowp float fmax = max(max(color.r, color.g), color.b);    //Max. value of RGB
    
    return (fmax + fmin) / 2.0; // Luminance
  }

  vec3 RGBToHSL(vec3 color) {
    vec3 hsl; 

    float fmin = min(min(color.r, color.g), color.b);
    float fmax = max(max(color.r, color.g), color.b); 
    float delta = fmax - fmin;

    hsl.z = (fmax + fmin) / 2.0; // Luminance

    if (delta == 0.0)	{
      hsl.x = 0.0;	// Hue
      hsl.y = 0.0;	// Saturation
    } else                                  {
      if (hsl.z < 0.5)
        hsl.y = delta / (fmax + fmin); // Saturation
      else
        hsl.y = delta / (2.0 - fmax - fmin); // Saturation

    float deltaR = (((fmax - color.r) / 6.0) + (delta / 2.0)) / delta;
    float deltaG = (((fmax - color.g) / 6.0) + (delta / 2.0)) / delta;
    float deltaB = (((fmax - color.b) / 6.0) + (delta / 2.0)) / delta;

    if (color.r == fmax )
      hsl.x = deltaB - deltaG; // Hue
    else if (color.g == fmax)
      hsl.x = (1.0 / 3.0) + deltaR - deltaB; // Hue
    else if (color.b == fmax)
      hsl.x = (2.0 / 3.0) + deltaG - deltaR; // Hue

    if (hsl.x < 0.0)
      hsl.x += 1.0; // Hue
      else if (hsl.x > 1.0)
      hsl.x -= 1.0; // Hue
    }

    return hsl;
  }

  float HueToRGB(lowp float f1, lowp float f2, lowp float hue) {
    if (hue < 0.0)
        hue += 1.0;
    else if (hue > 1.0)
        hue -= 1.0;
    lowp float res;
    if ((6.0 * hue) < 1.0)
        res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0)
        res = f2;
    else if ((3.0 * hue) < 2.0)
        res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else
        res = f1;
    return res;
  }

  vec3 HSLToRGB(vec3 hsl) {
    lowp vec3 rgb;

    if (hsl.y == 0.0)
        rgb = vec3(hsl.z); // Luminance
    else {
        lowp float f2;
        if (hsl.z < 0.5)
            f2 = hsl.z * (1.0 + hsl.y);
        else
            f2 = (hsl.z + hsl.y) - (hsl.y * hsl.z);
        float f1 = 2.0 * hsl.z - f2;
        
        rgb.r = HueToRGB(f1, f2, hsl.x + (1.0/3.0));
        rgb.g = HueToRGB(f1, f2, hsl.x);
        rgb.b = HueToRGB(f1, f2, hsl.x - (1.0/3.0));
    }

    return rgb;
  }

  void main(void) {
    float lightness = uColorEffect.r;
    float saturation = uColorEffect.g;
    float targetHue = uColorEffect.b;
    float targetSaturation = uColorEffect.a;

    highp vec2 coord = vTextureCoord.xy / uTextureDimensions;
    mediump vec4 texelColor = texture2D(uSampler, coord);

    vec3 color = texelColor.rgb;

    vec3 hsl = RGBToHSL(color);
    color = mix(
      HSLToRGB(vec3(hsl.x, hsl.y * saturation, hsl.z)),
      HSLToRGB(vec3(targetHue, targetSaturation, hsl.z)), 
      1.0 - saturation
    ) * lightness;

    float contrast = 1.0;
    color = ((color.rgb - 0.5) * max(contrast, 0.0)) + 0.5;

    gl_FragColor = vec4(color * texelColor.a * vOpacity, texelColor.a * vOpacity);
  }
`;

export const showComposition = (): {
  setImage(image: HTMLImageElement): void;
  setShapes(s: ShapeDefinition[]): void;
  setVectorValues(v: Keyframe): void;
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

  let vectorValues: Keyframe = {};
  let elements: {
    name: string;
    start: number;
    amount: number;
    mutator: number;
    lightness: number;
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

    gl.useProgram(program);
    const sprites = flattenShapes(shapes);
    sprites.forEach((shape, index) => {
      const anchor = getAnchor(shape);
      const shapeIndices = fileredTriangles(shape.points);
      const start = indices.length;

      const itemOffset = [...shape.translate, index * 0.1];
      elements.push({
        name: shape.name,
        start,
        amount: shapeIndices.length,
        mutator: 0,
        x: itemOffset[0],
        y: itemOffset[1],
        z: -0.5 + itemOffset[2] * 0.001,
        lightness: 1.0,
      });
      const offset = vertices.length / stride;
      shape.points.forEach(([x, y]) => {
        vertices.push(x - anchor[0], y - anchor[1], x, y);
      });

      shapeIndices.forEach((index) => {
        indices.push(index + offset);
      });
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
      const translate = gl.getUniformLocation(shaderProgram, "translate");
      const mutation = gl.getUniformLocation(shaderProgram, "mutation");
      const uColorEffect = gl.getUniformLocation(program, "uColorEffect");

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

          gl.uniform3f(
            uBasePosition,
            basePosition[0],
            basePosition[1],
            basePosition[2]
          );

          elements.forEach((element) => {
            if (element.amount === 0) {
              return;
            }
            gl.uniform3f(translate, element.x, element.y, element.z);
            gl.uniform1f(mutation, element.mutator);

            // lightness, saturation, targetHue, targetSaturation,
            gl.uniform4f(uColorEffect, element.lightness, 1.0, 1.0, 1.0);

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

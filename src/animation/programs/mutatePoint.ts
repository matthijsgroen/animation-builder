import {
  MutationVector,
  MutationVectorTypes,
  ShapeDefinition,
  Vec4,
} from "src/lib/types";
import {
  isShapeDefinition,
  isShapeMutationVector,
  visitShapes,
} from "src/lib/visit";

export const MAX_MUTATION_VECTORS = 60;
export const MAX_CONTROLS = 20;
export const MAX_MUTATION_CONTROL_VECTORS = 120;

export const vectorTypeMapping: Record<MutationVectorTypes, number> = {
  translate: 1,
  stretch: 2,
  rotate: 3,
  deform: 4,
  opacity: 5,
  lightness: 6,
  colorize: 7,
};

export const mutationControlShader = `
  uniform vec2 uControlMutationValues[${MAX_MUTATION_CONTROL_VECTORS}];
  uniform vec3 uMutationValueIndices[${MAX_MUTATION_CONTROL_VECTORS}];
  uniform vec2 uControlMutationIndices[${MAX_MUTATION_VECTORS}];

  uniform float uControlValues[${MAX_CONTROLS}];
  uniform vec2 uMutationValues[${MAX_MUTATION_VECTORS}];

  vec2 getMutationValue(int mutationIndex, int mutationType) {
    vec2 result = uMutationValues[mutationIndex];
    vec2 controlMutations = uControlMutationIndices[mutationIndex];
    int start = int(controlMutations.x);
    int steps = int(controlMutations.y);
    if (steps == 0) {
      return result;
    }
    for(int i = 0; i < ${MAX_CONTROLS}; i++) {
      if (i < steps) {
        vec3 valueIndices = uMutationValueIndices[start + i];
        // x = offset
        // y = control value index
        // z = stepType
        float controlValue = uControlValues[int(valueIndices.y)];

        int startIndex = int(floor(valueIndices.x + controlValue));
        int endIndex = int(ceil(valueIndices.x + controlValue));
        float mixFactor = controlValue - floor(controlValue);

        vec2 mutAValue = uControlMutationValues[startIndex];
        vec2 mutBValue = uControlMutationValues[endIndex];
        vec2 mutValue = mix(mutAValue, mutBValue, mixFactor);

        if (mutationType == 2 || mutationType == 5) { // Stretch & Opacity
          result *= mutValue;
        } else {
          result += mutValue;
        }
      } else {
        return result;
      }
    }

    return result;
  }
`;

export const mutationValueShader = `
  uniform vec2 uMutationValues[${MAX_MUTATION_VECTORS}];

  vec2 getMutationValue(int mutationIndex, int mutationType) {
    return uMutationValues[mutationIndex];
  }
`;

export const mutationShader = `
  #define PI_FRAC 0.017453292519943295

  // x = type, yz = origin, a = radius
  uniform vec4 uMutationVectors[${MAX_MUTATION_VECTORS}];
  uniform float uMutationParent[${MAX_MUTATION_VECTORS}];

  vec3 mutateOnce(vec3 startValue, int mutationIndex) {
    vec4 mutation = uMutationVectors[mutationIndex];
    int mutationType = int(mutation.x);

    vec2 mutationValue = getMutationValue(mutationIndex, mutationType);
    vec2 origin = mutation.yz;
    vec3 result = startValue;

    if (mutationType == 1) { // Translate
      float effect = 1.0;
      if (mutation.a > 0.0 && distance(startValue.xy, origin) > mutation.a) {
        effect = 0.0;
      }
      result = vec3(startValue.xy + mutationValue * effect, startValue.z);
    }

    if (mutationType == 2) { // Stretch
      result = vec3(origin.xy + vec2(
        (startValue.x - origin.x) * mutationValue.x, 
        (startValue.y - origin.y) * mutationValue.y
      ), startValue.z);
    }

    if (mutationType == 3) { // Rotation
      float rotation = mutationValue.x * PI_FRAC;
      mat2 entityRotationMatrix = mat2(cos(rotation), sin(rotation), -sin(rotation), cos(rotation));
      result = vec3((startValue.xy - origin) * entityRotationMatrix + origin, startValue.z);
    }

    if (mutationType == 4) { // Deform
      float effect = 1.0 - clamp(distance(startValue.xy, origin), 0.0, mutation.a) / mutation.a;	
      result = vec3(startValue.xy + mutationValue * effect, startValue.z);	
    }

    if (mutationType == 5) { // Opacity
      float opacity = mutationValue.x;
      result = vec3(startValue.xy, startValue.z * opacity);	
    }

    return result;
  }

  vec3 mutatePoint(vec3 startValue, int mutationIndex) {
    int currentNode = mutationIndex;
    vec3 result = startValue;

    for(int i = 0; i < ${MAX_MUTATION_VECTORS}; i++) {
        if (currentNode == -1) {
            return result;
        }
        result = mutateOnce(result, currentNode);
        currentNode = int(uMutationParent[currentNode]);
    }
    return result;
  }

`;

const mutatorToVec4 = (mutator: MutationVector): Vec4 => [
  vectorTypeMapping[mutator.type],
  mutator.origin[0],
  mutator.origin[1],
  mutator.type === "deform" || mutator.type === "translate"
    ? mutator.radius
    : -1,
];

const getParentMutation = (
  parents: (ShapeDefinition | MutationVector)[],
  self?: MutationVector
): MutationVector | null => {
  const parentShape = parents[parents.length - 1];
  if (isShapeDefinition(parentShape)) {
    const mutatorIndex = self ? parentShape.mutationVectors.indexOf(self) : -1;
    if (mutatorIndex > 0) {
      return parentShape.mutationVectors[mutatorIndex - 1];
    }
    for (let i = parents.length - (self ? 2 : 1); i >= 0; i--) {
      const shape = parents[i];
      if (
        shape &&
        isShapeDefinition(shape) &&
        shape.mutationVectors.length > 0
      ) {
        return shape.mutationVectors[shape.mutationVectors.length - 1];
      }
    }
  }
  return null;
};

export const createShapeMutationList = (
  shapes: ShapeDefinition[]
): {
  parentList: Float32Array;
  vectorSettings: Vec4[];
  shapeMutatorMapping: Record<string, number>;
  mutatorMapping: Record<string, number>;
} => {
  const mutatorIndices: { name: string; index: number; parent: number }[] = [];
  const mutators: Vec4[] = [];

  const mutatorMapping: Record<string, number> = {};

  visitShapes(shapes, (item, parents) => {
    if (isShapeMutationVector(item)) {
      const value = mutatorToVec4(item);
      const index = mutators.length;
      mutators.push(value);

      const parentMutation = getParentMutation(parents, item);
      const mutatorIndex =
        parentMutation === null
          ? -1
          : mutatorIndices.findIndex((e) => e.name === parentMutation.name);
      mutatorIndices.push({ name: item.name, index, parent: mutatorIndex });
      mutatorMapping[item.name] = mutatorIndex;
    }
    return undefined;
  });

  const shapeMutatorMapping: Record<string, number> = {};
  visitShapes(shapes, (item, parents) => {
    if (isShapeDefinition(item)) {
      const parentMutation = getParentMutation(parents.concat(item));
      const mutatorIndex =
        parentMutation === null
          ? -1
          : mutatorIndices.findIndex((e) => e.name === parentMutation.name);
      shapeMutatorMapping[item.name] = mutatorIndex;
    }
    return undefined;
  });

  const parentList = new Float32Array(mutators.length);

  mutatorIndices.forEach((item, index) => {
    parentList[index] = item.parent;
  });

  return {
    mutatorMapping,
    parentList,
    vectorSettings: mutators,
    shapeMutatorMapping,
  };
};

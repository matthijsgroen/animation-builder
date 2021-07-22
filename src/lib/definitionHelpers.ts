import {
  ControlDefinition,
  FolderDefinition,
  ImageDefinition,
  ItemSelection,
  MutationVector,
  MutationVectorTypes,
  ShapeDefinition,
  SpriteDefinition,
  Vec2,
} from "./types";
import {
  isControlDefinition,
  isMutationVector,
  isShapeDefinition,
  visit,
} from "./visit";

export const renameKey = <T extends Record<string, unknown>>(
  object: T,
  currentName: string,
  newName: string
): T =>
  Object.keys(object).includes(currentName)
    ? Object.entries(object).reduce(
        (result, [key, value]) =>
          key === currentName
            ? { ...result, [newName]: value }
            : { ...result, [key]: value },
        {} as T
      )
    : object;

export const updateValue = <H, T extends Record<string, H>>(
  object: T,
  name: string,
  mutator: (value: H) => H
): T =>
  Object.keys(object).includes(name)
    ? Object.entries(object).reduce(
        (result, [key, value]) =>
          key === name
            ? { ...result, [key]: mutator(value) }
            : { ...result, [key]: value },
        {} as T
      )
    : object;

export const omitKeys = <T extends Record<string, unknown>>(
  object: T,
  keys: string[]
): T =>
  Object.keys(object).some((k) => keys.includes(k))
    ? Object.entries(object).reduce(
        (result, [key, value]) =>
          keys.includes(key) ? result : { ...result, [key]: value },
        {} as T
      )
    : object;

export const newDefinition = (): ImageDefinition => ({
  animations: [],
  controlValues: {},
  controls: [],
  defaultFrame: {},
  shapes: [],
  version: "1.0",
});

export const getLayerNames = (layers: ShapeDefinition[]): string[] =>
  layers.reduce(
    (result, layer) =>
      layer.type === "folder"
        ? result.concat(layer.name, ...getLayerNames(layer.items))
        : result.concat(layer.name),
    [] as string[]
  );

export const vectorNamesFromShape = (shape: ShapeDefinition): string[] =>
  shape.mutationVectors.map((e) => e.name);

export const getVectorNames = (layers: ShapeDefinition[]): string[] =>
  layers.reduce(
    (result, layer) =>
      layer.type === "folder"
        ? result.concat(
            vectorNamesFromShape(layer),
            ...getVectorNames(layer.items)
          )
        : result.concat(vectorNamesFromShape(layer)),
    [] as string[]
  );

const makeItemName = (
  existingNames: string[],
  intendedName: string,
  previousName: string | null = null
) => {
  let counter = 0;
  const makeName = () =>
    counter === 0 ? intendedName : `${intendedName} (${counter})`;
  const names = existingNames.filter(
    (name) => !previousName || name !== previousName
  );
  while (names.includes(makeName())) {
    counter++;
  }
  return makeName();
};

export const makeAnimationName = (
  image: ImageDefinition,
  intendedName: string,
  previousName: string | null = null
): string =>
  makeItemName(
    image.animations.map((a) => a.name),
    intendedName,
    previousName
  );

export const makeLayerName = (
  image: ImageDefinition,
  intendedName: string,
  previousName: string | null = null
): string =>
  makeItemName(getLayerNames(image.shapes), intendedName, previousName);

export const makeVectorName = (
  image: ImageDefinition,
  intendedName: string,
  previousName: string | null = null
): string =>
  makeItemName(getVectorNames(image.shapes), intendedName, previousName);

export const makeControlName = (
  image: ImageDefinition,
  intendedName: string,
  previousName: string | null = null
): string =>
  makeItemName(
    image.controls.map((c) => c.name),
    intendedName,
    previousName
  );

const addAfter = (
  items: ShapeDefinition[],
  item: ShapeDefinition,
  after: number
): ShapeDefinition[] => [
  ...items.slice(0, after + 1),
  item,
  ...items.slice(after + 1),
];

const addSpriteDefinition = (
  imageDefinition: ImageDefinition,
  newShapeDefinition: ShapeDefinition,
  after: string | null = null
): ImageDefinition => {
  if (after) {
    let placed = false;
    const result = visit(imageDefinition, (item) => {
      if (isShapeDefinition(item) && item.type === "folder") {
        if (item.name === after) {
          placed = true;
          return {
            ...item,
            items: [newShapeDefinition, ...item.items],
          };
        }

        const itemIndex = item.items.findIndex((e) => e.name === after);
        if (itemIndex > -1 && item.items[itemIndex].type === "sprite") {
          placed = true;
          return {
            ...item,
            items: addAfter(item.items, newShapeDefinition, itemIndex),
          };
        }
      }
      return undefined;
    });
    if (placed) return result;
  }
  const itemIndex = imageDefinition.shapes.findIndex((e) => e.name === after);

  return {
    ...imageDefinition,
    shapes:
      itemIndex === -1
        ? ([newShapeDefinition] as ShapeDefinition[]).concat(
            imageDefinition.shapes
          )
        : addAfter(imageDefinition.shapes, newShapeDefinition, itemIndex),
  };
};

export const addLayer = (
  mutator: (
    mutation: (previousImageDefinition: ImageDefinition) => ImageDefinition
  ) => void,
  defaultName: string,
  after: string | null = null,
  data: Partial<SpriteDefinition> = {}
): Promise<SpriteDefinition> =>
  new Promise((resolve) => {
    mutator((image) => {
      const newName = makeLayerName(image, defaultName);
      const newSprite: SpriteDefinition = {
        type: "sprite",
        points: [],
        translate: [0, 0],
        mutationVectors: [],
        ...data,
        name: newName,
      };
      resolve(newSprite);

      return addSpriteDefinition(image, newSprite, after);
    });
  });

export const addFolder = (
  mutator: (
    mutation: (previousImageDefinition: ImageDefinition) => ImageDefinition
  ) => void,
  defaultName: string,
  after: string | null = null
): Promise<FolderDefinition> =>
  new Promise((resolve) => {
    mutator((image) => {
      const newName = makeLayerName(image, defaultName);
      const newFolder: FolderDefinition = {
        name: newName,
        type: "folder",
        items: [],
        mutationVectors: [],
      };

      resolve(newFolder);

      return addSpriteDefinition(image, newFolder, after);
    });
  });

export const addVector = (
  mutator: (
    mutation: (previousImageDefinition: ImageDefinition) => ImageDefinition
  ) => void,
  parent: ShapeDefinition | MutationVector,
  defaultName: string
): Promise<MutationVector> =>
  new Promise((resolve) => {
    mutator((image) => {
      const newName = makeVectorName(image, defaultName);
      const newVector: MutationVector = {
        name: newName,
        type: "translate",
        origin: [0, 0],
        radius: -1,
      };

      resolve(newVector);

      return visit(image, (item) => {
        if (isShapeDefinition(item)) {
          if (isShapeDefinition(parent) && item.name === parent.name) {
            return {
              ...item,
              mutationVectors: ([newVector] as MutationVector[]).concat(
                item.mutationVectors || []
              ),
            };
          }
          if (isMutationVector(parent)) {
            const itemIndex = item.mutationVectors.findIndex(
              (v) => v.name === parent.name
            );
            if (itemIndex !== -1) {
              return {
                ...item,
                mutationVectors: [
                  ...item.mutationVectors.slice(0, itemIndex + 1),
                  newVector,
                  ...item.mutationVectors.slice(itemIndex + 1),
                ],
              };
            }
          }
        }
        return undefined;
      });
    });
  });

export const addControl = (
  mutator: (
    mutation: (previousImageDefinition: ImageDefinition) => ImageDefinition
  ) => void,
  defaultName: string
): Promise<ControlDefinition> =>
  new Promise((resolve) => {
    mutator((image) => {
      const newName = makeControlName(image, defaultName);
      const newControl: ControlDefinition = {
        name: newName,
        type: "slider",
        steps: [{}, {}],
      };

      resolve(newControl);

      return {
        ...image,
        controls: [newControl].concat(image.controls),
      };
    });
  });

export const canMoveUp = (
  selectedItem: ItemSelection | null,
  image: ImageDefinition
): boolean => {
  if (selectedItem === null) {
    return false;
  }
  if (selectedItem.type === "layer") {
    return !(image.shapes[0].name === selectedItem.name);
  }
  if (selectedItem.type === "vector") {
    const topMutationVector = image.shapes[0].mutationVectors[0];
    return !(topMutationVector && topMutationVector.name === selectedItem.name);
  }
  if (selectedItem.type === "control") {
    const index = image.controls.findIndex((e) => e.name === selectedItem.name);
    return index > 0;
  }
  return false;
};

const getBottomShape = (image: ImageDefinition): ShapeDefinition | null => {
  let result: ShapeDefinition | null = null;
  visit(image, (item) => {
    if (isShapeDefinition(item)) {
      result = item;
    }
    return undefined;
  });
  return result;
};

export const canMoveDown = (
  selectedItem: ItemSelection | null,
  image: ImageDefinition
): boolean => {
  if (selectedItem === null) {
    return false;
  }
  if (selectedItem.type === "layer") {
    return !(image.shapes[image.shapes.length - 1].name === selectedItem.name);
  }
  if (selectedItem.type === "vector") {
    const bottomShape = getBottomShape(image);
    const bottomMutationVector = bottomShape
      ? bottomShape.mutationVectors.slice(-1)[0]
      : null;
    return !(
      bottomMutationVector && bottomMutationVector.name === selectedItem.name
    );
  }
  if (selectedItem.type === "control") {
    const index = image.controls.findIndex((e) => e.name === selectedItem.name);
    return index < image.controls.length - 1;
  }

  return false;
};

const addToBottomChild = (
  children: ShapeDefinition[],
  vector: MutationVector
): ShapeDefinition[] =>
  children.map((shape, index, list) =>
    index === list.length - 1
      ? shape.type === "folder" && shape.items.length > 0
        ? { ...shape, items: addToBottomChild(shape.items, vector) }
        : {
            ...shape,
            mutationVectors: shape.mutationVectors.concat(vector),
          }
      : shape
  );

const move = (
  moveDown: boolean,
  item: ItemSelection,
  shapes: ShapeDefinition[]
): ShapeDefinition[] =>
  shapes.reduce((result, shape, index, list) => {
    if (result.find((item) => item.name === shape.name)) {
      return result;
    }
    const lastAdded = result[result.length - 1];
    if (
      lastAdded &&
      lastAdded.type === "folder" &&
      !moveDown &&
      lastAdded.items.length > 0 &&
      lastAdded.items[lastAdded.items.length - 1].name === shape.name &&
      item.type === "layer"
    ) {
      return result;
    }

    if (item.type === "vector") {
      const vectorIndex = shape.mutationVectors.findIndex(
        (e) => e.name === item.name
      );
      const vector =
        vectorIndex !== -1 ? shape.mutationVectors[vectorIndex] : null;
      if (vector) {
        if (moveDown) {
          if (vectorIndex < shape.mutationVectors.length - 1) {
            // move item down in same list
            return result.concat({
              ...shape,
              mutationVectors: shape.mutationVectors.map((item, index, list) =>
                index === vectorIndex
                  ? list[index + 1]
                  : index === vectorIndex + 1
                  ? list[index - 1]
                  : item
              ),
            });
          }
          if (
            vectorIndex === shape.mutationVectors.length - 1 &&
            shape.type === "folder" &&
            shape.items.length > 0
          ) {
            return result.concat({
              ...shape,
              mutationVectors: shape.mutationVectors.slice(0, -1),
              items: shape.items.map((child, index) =>
                index === 0
                  ? {
                      ...child,
                      mutationVectors: [vector].concat(child.mutationVectors),
                    }
                  : child
              ),
            });
          }
          if (
            vectorIndex === shape.mutationVectors.length - 1 &&
            list[index + 1]
          ) {
            // move item down to next in list
            const next = list[index + 1];

            return result.concat(
              {
                ...shape,
                mutationVectors: shape.mutationVectors.slice(0, -1),
              },
              {
                ...next,
                mutationVectors: [vector].concat(next.mutationVectors),
              }
            );
          }
        } else {
          if (vectorIndex > 0) {
            // move item up in same list
            return result.concat({
              ...shape,
              mutationVectors: shape.mutationVectors.map((item, vIndex, list) =>
                vIndex === vectorIndex - 1
                  ? list[vIndex + 1]
                  : vIndex === vectorIndex
                  ? list[vIndex - 1]
                  : item
              ),
            });
          }
          if (vectorIndex === 0 && lastAdded) {
            const updatedResult = addToBottomChild(result, vector);
            return updatedResult.concat({
              ...shape,
              mutationVectors: shape.mutationVectors.slice(1),
            });
          }
        }
      } else {
        if (moveDown) {
          const next = list[index + 1];
          if (shape.type === "folder" && next) {
            const lastChild = shape.items[shape.items.length - 1];
            const lastVector =
              lastChild.mutationVectors[lastChild.mutationVectors.length - 1];
            if (lastVector && lastVector.name === item.name) {
              return result.concat(
                {
                  ...shape,
                  items: shape.items.map((child, index, list) =>
                    index === list.length - 1
                      ? {
                          ...child,
                          mutationVectors: child.mutationVectors.slice(0, -1),
                        }
                      : child
                  ),
                },
                {
                  ...next,
                  mutationVectors: [lastVector].concat(next.mutationVectors),
                }
              );
            }
          }
        } else {
          if (shape.type === "folder") {
            const firstChild = shape.items[0];
            const firstVector = firstChild.mutationVectors[0];
            if (firstVector && firstVector.name === item.name) {
              return result.concat({
                ...shape,
                mutationVectors: shape.mutationVectors.concat(firstVector),
                items: shape.items.map((child, index) =>
                  index === 0
                    ? {
                        ...child,
                        mutationVectors: child.mutationVectors.slice(1),
                      }
                    : child
                ),
              });
            }
          }
        }
      }
    }

    const next = list[index + 1];
    if (shape.name === item.name && item.type === "layer" && moveDown) {
      if (next) {
        if (next.type === "sprite") {
          return result.concat(next, shape);
        } else {
          return result.concat({
            ...next,
            items: [shape].concat(next.items),
          });
        }
      }
    }
    if (next && next.name === item.name && item.type === "layer" && !moveDown) {
      if (shape.type === "sprite") {
        return result.concat(next, shape);
      } else {
        return result.concat({
          ...shape,
          items: shape.items.concat(next),
        });
      }
    }
    if (shape.type === "folder") {
      if (moveDown) {
        const lastItem = shape.items[shape.items.length - 1];
        if (lastItem && lastItem.name === item.name && item.type === "layer") {
          // last item in the folder
          return result.concat(
            { ...shape, items: shape.items.slice(0, -1) },
            lastItem
          );
        }
      }
      if (!moveDown) {
        const firstItem = shape.items[0];
        if (
          firstItem &&
          firstItem.name === item.name &&
          item.type === "layer"
        ) {
          // last item in the folder
          return result.concat(firstItem, {
            ...shape,
            items: shape.items.slice(1),
          });
        }
      }
      return result.concat({
        ...shape,
        items: move(moveDown, item, shape.items),
      });
    }
    return result.concat(shape);
  }, [] as ShapeDefinition[]);

const moveControl = (
  moveUp: boolean,
  item: ItemSelection,
  controls: ControlDefinition[]
): ControlDefinition[] => {
  const index = controls.findIndex((c) => c.name === item.name);
  if (index === -1) {
    return controls;
  }
  return controls.map((c, i, l) =>
    i === index && moveUp
      ? l[i + 1]
      : i === index + 1 && moveUp
      ? l[index]
      : i === index && !moveUp
      ? l[i - 1]
      : i === index - 1 && !moveUp
      ? l[index]
      : c
  );
};

export const moveDown = (
  image: ImageDefinition,
  selectedItem: ItemSelection
): ImageDefinition =>
  selectedItem.type === "control"
    ? { ...image, controls: moveControl(true, selectedItem, image.controls) }
    : { ...image, shapes: move(true, selectedItem, image.shapes) };

export const moveUp = (
  image: ImageDefinition,
  selectedItem: ItemSelection
): ImageDefinition =>
  selectedItem.type === "control"
    ? { ...image, controls: moveControl(false, selectedItem, image.controls) }
    : { ...image, shapes: move(false, selectedItem, image.shapes) };

export const renameLayer = (
  image: ImageDefinition,
  currentName: string,
  newName: string
): ImageDefinition =>
  visit(image, (item) =>
    isShapeDefinition(item) && item.name === currentName
      ? { ...item, name: newName }
      : undefined
  );

export const renameVector = (
  image: ImageDefinition,
  currentName: string,
  newName: string
): ImageDefinition =>
  visit(
    {
      ...image,
      defaultFrame: renameKey(image.defaultFrame, currentName, newName),
    },
    (item) => {
      if (isMutationVector(item) && item.name === currentName) {
        return { ...item, name: newName };
      }
      if (isControlDefinition(item)) {
        return {
          ...item,
          steps: (item.steps || []).map((frame) =>
            renameKey(frame, currentName, newName)
          ),
        };
      }
      return undefined;
    }
  );

export const renameControl = (
  image: ImageDefinition,
  currentName: string,
  newName: string
): ImageDefinition => ({
  ...visit(image, (item) =>
    isControlDefinition(item) && item.name === currentName
      ? { ...item, name: newName }
      : undefined
  ),
  controlValues: renameKey(image.controlValues, currentName, newName),
  animations: image.animations.map((anim) => ({
    ...anim,
    keyframes: anim.keyframes.map((frame) => ({
      ...frame,
      controlValues: renameKey(frame.controlValues, currentName, newName),
    })),
  })),
});

const addRemovePointToShape = (
  shapes: ShapeDefinition[],
  layerName: string,
  point: Vec2,
  updateType: "add" | "remove"
): ShapeDefinition[] =>
  shapes.map((shape) =>
    shape.type === "folder"
      ? {
          ...shape,
          items: addRemovePointToShape(
            shape.items,
            layerName,
            point,
            updateType
          ),
        }
      : shape.name === layerName
      ? {
          ...shape,
          points:
            updateType === "add"
              ? shape.points.concat([point])
              : shape.points.filter(
                  (p) => p[0] !== point[0] || p[1] !== point[1]
                ),
        }
      : shape
  );

export const addPoint = (
  image: ImageDefinition,
  layer: string,
  point: Vec2
): ImageDefinition => ({
  ...image,
  shapes: addRemovePointToShape(image.shapes, layer, point, "add"),
});

export const updatePoint = (
  image: ImageDefinition,
  layer: string,
  point: Vec2,
  newPoint: Vec2
): ImageDefinition => ({
  ...image,
  shapes: addRemovePointToShape(
    addRemovePointToShape(image.shapes, layer, point, "remove"),
    layer,
    newPoint,
    "add"
  ),
});

export const removePoint = (
  image: ImageDefinition,
  layer: string,
  point: Vec2
): ImageDefinition => ({
  ...image,
  shapes: addRemovePointToShape(image.shapes, layer, point, "remove"),
});

export const getShape = (
  image: ImageDefinition,
  name: string
): ShapeDefinition | null => {
  let result = null;
  visit(image, (item) => {
    if (isShapeDefinition(item) && item.name === name) {
      result = item;
    }
    return undefined;
  });
  return result;
};

export const getVector = (
  image: ImageDefinition,
  name: string
): MutationVector | null => {
  let result = null;
  visit(image, (item) => {
    if (isMutationVector(item) && item.name === name) {
      result = item;
    }
    return undefined;
  });
  return result;
};

export const updateSpriteData = (
  imageDefinition: ImageDefinition,
  shapeName: string,
  mutation: (sprite: SpriteDefinition) => SpriteDefinition
): ImageDefinition =>
  visit(imageDefinition, (item) =>
    item.type === "sprite" && item.name === shapeName
      ? mutation(item)
      : undefined
  );

export const defaultNamesForMutations: Record<MutationVectorTypes, string> = {
  translate: "Translation",
  deform: "Deformation",
  rotate: "Rotation",
  opacity: "Opacity",
  stretch: "Stretch",
  lightness: "Lightness",
  colorize: "Colorize",
};

const defaultNames = [
  "New Mutator",
  ...Object.values(defaultNamesForMutations),
];

const hasNameWithOptionalCounter = (
  name: string,
  nameMatches: string[]
): boolean =>
  nameMatches.some(
    (test) => name === test || name.match(RegExp(`^${test} \\(\\d+\\)$`))
  );

const isWrongDefaultName = (mutation: MutationVector): boolean =>
  hasNameWithOptionalCounter(
    mutation.name,
    defaultNames.filter((e) => e !== defaultNamesForMutations[mutation.type])
  );

export const updateVectorData = (
  imageDefinition: ImageDefinition,
  vectorName: string,
  mutation: (vector: MutationVector) => MutationVector,
  onRename: (newName: string) => void
): ImageDefinition => {
  const afterEffects: ((imageDef: ImageDefinition) => ImageDefinition)[] = [];

  const result = visit(imageDefinition, (item) => {
    if (isMutationVector(item) && item.name === vectorName) {
      const updatedMutation = mutation(item);

      if (updatedMutation && isWrongDefaultName(updatedMutation)) {
        afterEffects.push((img) => {
          const newName = makeVectorName(
            img,
            defaultNamesForMutations[updatedMutation.type],
            updatedMutation.name
          );
          onRename(newName);
          return renameVector(img, updatedMutation.name, newName);
        });
      }

      return updatedMutation;
    }
  });

  return afterEffects.reduce((result, mutator) => mutator(result), result);
};

export const canDelete = (
  selectedItem: ItemSelection | null,
  image: ImageDefinition
): boolean => {
  if (selectedItem === null) {
    return false;
  }
  if (selectedItem.type === "layer") {
    const item = getShape(image, selectedItem.name);
    if (item?.type === "folder") {
      return item.items.length === 0;
    }
  }
  return true;
};

export const removeItem = (
  image: ImageDefinition,
  selectedItem: ItemSelection
): ImageDefinition => {
  const vectorsBefore = getVectorNames(image.shapes);
  const controlRemoved =
    selectedItem.type === "control" ? selectedItem.name : null;

  const result = visit(image, (item) =>
    ((selectedItem.type === "layer" && isShapeDefinition(item)) ||
      (selectedItem.type === "control" && isControlDefinition(item)) ||
      (selectedItem.type === "vector" && isMutationVector(item))) &&
    item.name === selectedItem.name
      ? false
      : undefined
  );

  const vectorsKept = getVectorNames(result.shapes);
  const vectorsRemoved = vectorsBefore.filter((e) => !vectorsKept.includes(e));
  if (vectorsRemoved.length === 0) {
    return result;
  }

  const tree: ImageDefinition = {
    ...result,
    defaultFrame: omitKeys(result.defaultFrame || {}, vectorsRemoved),
    ...(controlRemoved
      ? {
          controlValues: omitKeys(result.controlValues || {}, [controlRemoved]),
          animations: result.animations.map((animation) => ({
            ...animation,
            keyframes: animation.keyframes.map((frame) => ({
              ...frame,
              controlValues: omitKeys(frame.controlValues, [controlRemoved]),
            })),
          })),
        }
      : undefined),
  };
  return visit(tree, (item) => {
    if (isControlDefinition(item)) {
      return {
        ...item,
        steps: (item.steps || []).map((frame) =>
          omitKeys(frame, vectorsRemoved)
        ),
      };
    }
    return undefined;
  });
};

export const countResources = (
  imageDefinition: ImageDefinition
): { base: number; mutators: number; controls: number; total: number } => {
  /**
   * Fixed uniforms:
   * uniform vec2 viewport;
   * uniform vec3 basePosition;
   * uniform vec3 translate;
   * uniform float mutation;
   * uniform vec4 scale;
   * uniform mediump vec2 uTextureDimensions;
   */
  const BASE_COST = 6;

  /**
   * Each mutator costs:
   *  - 1 vec4 for storage
   *  - 1 float for parent referencce
   *  - 1 vec2 for base value
   */
  const MUTATOR_COST = 3;

  /**
   * uniform vec2 uControlMutationValues[${MAX_MUTATION_CONTROL_VECTORS}]; // values of all steps
   * uniform vec3 uMutationValueIndices[${MAX_MUTATION_CONTROL_VECTORS}]; // for each control points to value, and steps
   * uniform vec2 uControlMutationIndices[${MAX_MUTATION_VECTORS}]; // mutationIndex points to 'controls using this mutation'
   * uniform float uControlValues[${MAX_CONTROLS}];
   */

  let mutatorCount = 0;
  let controlCount = 0;
  let controlCost = 0;
  visit(imageDefinition, (item) => {
    if (isMutationVector(item)) {
      mutatorCount++;
    }
    if (isControlDefinition(item)) {
      controlCount++; // cost of uControlValues
      const stepCount = item.steps.length; // cost of uControlMutationValues (when multiplied by mutatorCount)
      const mutatorCount = Object.keys(item.steps[0]).length; // cost of uControlMutationIndices and uMutationValueIndices
      controlCost += stepCount * mutatorCount + mutatorCount * 2;
    }
    return undefined;
  });

  return {
    base: BASE_COST,
    mutators: MUTATOR_COST * mutatorCount,
    controls: controlCost + controlCount,
    total: BASE_COST + MUTATOR_COST * mutatorCount + controlCount + controlCost,
  };
};

export const setControlValue = (
  imageDefinition: ImageDefinition,
  controlName: string,
  value: number
): ImageDefinition => ({
  ...imageDefinition,
  controlValues: {
    ...imageDefinition.controlValues,
    [controlName]: value,
  },
});

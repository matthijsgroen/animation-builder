import { Dispatch, SetStateAction } from "react";

export type State<T> = [T, Dispatch<SetStateAction<T>>];

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

export type TranslationVector = {
  name: string;
  type: "translate";
  origin: Vec2;
  radius: number;
};

export type DeformationVector = {
  name: string;
  type: "deform";
  origin: Vec2;
  radius: number;
};

export type StretchVector = {
  name: string;
  type: "stretch";
  origin: Vec2;
};

export type RotationVector = {
  name: string;
  type: "rotate";
  origin: Vec2;
};

export type OpacityVector = {
  name: string;
  type: "opacity";
  origin: Vec2;
};

export type Lightness = {
  name: string;
  type: "lightness";
  origin: Vec2;
};

export type Colorize = {
  name: string;
  type: "colorize";
  origin: Vec2;
};

export type MutationVector = ShapeMutationVector | ColorMutationVector;
export type MutationVectorTypes = MutationVector["type"];

export type ShapeMutationVector =
  | TranslationVector
  | DeformationVector
  | StretchVector
  | RotationVector
  | OpacityVector;

export type ColorMutationVector = Lightness | Colorize;

export type SpriteDefinition = {
  name: string;
  type: "sprite";
  points: Vec2[];
  mutationVectors: MutationVector[];
  translate: Vec2;
};

export type FolderDefinition = {
  name: string;
  type: "folder";
  mutationVectors: MutationVector[];
  items: ShapeDefinition[];
};

export type ShapeDefinition = FolderDefinition | SpriteDefinition;

export type ItemSelection = {
  name: string;
  type: "layer" | "vector" | "control";
};

export type Keyframe = Record<string, Vec2>;

export type ControlDefinition = {
  name: string;
  type: "slider";
  steps: Keyframe[];
};

export type PlayStatus = Record<
  string,
  {
    startAt: number;
    startedAt: number;
  }
>;

export type ControlValues = {
  [key: string]: number;
};

export type AnimationFrame = {
  controlValues: ControlValues;
  event?: string;
  time: number;
};

export type Animation = {
  name: string;
  looping: boolean;
  keyframes: AnimationFrame[];
};

export type ImageDefinition = {
  shapes: ShapeDefinition[];
  defaultFrame: Keyframe;
  controls: ControlDefinition[];
  controlValues: ControlValues;
  animations: Animation[];
  version: string;
};

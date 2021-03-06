import React, { Dispatch, SetStateAction } from "react";
import Button, { ButtonType } from "src/components/Button";
import { Control } from "src/components/Control";
import Menu from "src/components/Menu";
import NumberInputControl from "src/components/NumberInputControl";
import SelectControl from "src/components/SelectControl";
import SliderControl from "src/components/SliderControl";
import ToggleInputControl from "src/components/ToggleControl";
import Vect2InputControl from "src/components/Vec2InputControl";
import { omitKeys, updateVectorData } from "src/lib/definitionHelpers";
import { ImageDefinition, MutationVector, Vec2 } from "src/lib/types";
import { defaultValueForVector } from "src/lib/vertices";
import { isControlDefinition, visit } from "src/lib/visit";

interface VectorInfoPanelProps {
  vectorSelected: MutationVector;
  updateImageDefinition: Dispatch<SetStateAction<ImageDefinition>>;
  image: ImageDefinition;
  vectorValue: Vec2;
  updateVectorValue(newValue: Vec2): void;
  activeControl?: string;
  controlPosition?: number;
  onRename(newName: string): void;
}

type VectorTypes = MutationVector["type"];

const createVector = (
  name: string,
  origin: Vec2,
  newType: VectorTypes
): MutationVector => {
  switch (newType) {
    case "deform":
      return { type: "deform", origin, name, radius: 10 };
    case "rotate":
      return { type: "rotate", origin, name };
    case "stretch":
      return { type: "stretch", origin, name };
    case "translate":
      return { type: "translate", origin, name, radius: -1 };
    case "opacity":
      return { type: "opacity", origin, name };
  }
};

const iconForType = (type: VectorTypes): string =>
  (({
    deform: "🟠",
    rotate: "🔴",
    stretch: "🟣",
    translate: "🟢",
    opacity: "⚪️",
  } as Record<VectorTypes, string>)[type]);

export const setMutationUnderControl = (
  state: ImageDefinition,
  activeControl: string,
  vectorSelected: MutationVector,
  controlPosition: number | undefined,
  activeValue: Vec2
): ImageDefinition =>
  visit(state, (item) => {
    if (isControlDefinition(item) && item.name === activeControl) {
      return {
        ...item,
        steps: item.steps.map((step, index) =>
          index === controlPosition
            ? {
                ...step,
                [vectorSelected.name]: activeValue,
              }
            : step[vectorSelected.name] === undefined
            ? {
                ...step,
                [vectorSelected.name]: defaultValueForVector(
                  vectorSelected.type
                ),
              }
            : step
        ),
      };
    }
  });

const releaseMutationFromControl = (
  state: ImageDefinition,
  activeControl: string,
  vectorSelected: MutationVector
) =>
  visit(state, (item) => {
    if (isControlDefinition(item) && item.name === activeControl) {
      const updatedControl = {
        ...item,
        steps: item.steps.map((step) => omitKeys(step, [vectorSelected.name])),
      };
      return updatedControl;
    }
    return undefined;
  });

const VectorInfoPanel: React.VFC<VectorInfoPanelProps> = ({
  vectorSelected,
  updateImageDefinition,
  image,
  vectorValue,
  updateVectorValue,
  activeControl,
  controlPosition,
  onRename,
}) => {
  const control = activeControl
    ? image.controls.find((c) => c.name === activeControl) || null
    : null;

  const controlValue =
    activeControl && control && controlPosition !== undefined
      ? control.steps[controlPosition][vectorSelected.name]
      : undefined;

  const activeValue = controlValue || vectorValue;

  return (
    <Menu
      title={`${iconForType(vectorSelected.type)} ${vectorSelected.name}`}
      collapsable={true}
      size="minimal"
      items={[
        ...(!activeControl
          ? [
              <SelectControl
                key={"type"}
                title={"Type"}
                value={vectorSelected.type}
                options={[
                  {
                    name: "Deformation",
                    id: "deform",
                    value: "deform" as VectorTypes,
                  },
                  {
                    name: "Translation",
                    id: "translate",
                    value: "translate" as VectorTypes,
                  },
                  {
                    name: "Rotation",
                    id: "rotate",
                    value: "rotate" as VectorTypes,
                  },
                  {
                    name: "Stretch",
                    id: "stretch",
                    value: "stretch" as VectorTypes,
                  },
                  {
                    name: "Opacity",
                    id: "opacity",
                    value: "opacity" as VectorTypes,
                  },
                ]}
                onChange={(newValue) => {
                  updateVectorValue(defaultValueForVector(newValue.value));
                  updateImageDefinition((state) =>
                    updateVectorData(
                      state,
                      vectorSelected.name,
                      (vector) =>
                        createVector(
                          vector.name,
                          vector.origin,
                          newValue.value
                        ),
                      onRename
                    )
                  );
                }}
              />,
              <Vect2InputControl
                key={"origin"}
                title={"origin"}
                value={vectorSelected.origin}
                onChange={(newValue) => {
                  updateImageDefinition((state) =>
                    updateVectorData(
                      state,
                      vectorSelected.name,
                      (vector) => ({
                        ...vector,
                        origin: newValue,
                      }),
                      onRename
                    )
                  );
                }}
              />,
            ]
          : []),
        ...(vectorSelected.type === "deform" && !activeControl
          ? [
              <NumberInputControl
                key={"radius"}
                title={"radius"}
                value={vectorSelected.radius}
                onChange={(newValue) => {
                  updateImageDefinition((state) =>
                    updateVectorData(
                      state,
                      vectorSelected.name,
                      (vector) => ({
                        ...vector,
                        radius: newValue,
                      }),
                      onRename
                    )
                  );
                }}
              />,
            ]
          : []),
        ...(vectorSelected.type === "deform"
          ? [
              <Vect2InputControl
                key={"value"}
                title={"value"}
                value={activeValue}
                onChange={(newValue) => {
                  updateVectorValue(newValue);
                }}
              />,
            ]
          : []),
        ...(vectorSelected.type === "stretch"
          ? [
              <Vect2InputControl
                key={"value"}
                title={"value"}
                value={activeValue}
                step={0.05}
                onChange={(newValue) => {
                  updateVectorValue(newValue);
                }}
              />,
            ]
          : []),
        ...(vectorSelected.type === "translate" && !activeControl
          ? [
              <ToggleInputControl
                key={"radiusToggle"}
                title={"use radius"}
                value={vectorSelected.radius !== -1}
                onChange={(newValue) => {
                  updateImageDefinition((state) =>
                    updateVectorData(
                      state,
                      vectorSelected.name,
                      (vector) => ({
                        ...vector,
                        radius: newValue ? 1 : -1,
                      }),
                      onRename
                    )
                  );
                }}
              />,
            ]
          : []),
        ...(vectorSelected.type === "translate" && vectorSelected.radius !== -1
          ? [
              <NumberInputControl
                key={"radius"}
                title={"radius"}
                value={vectorSelected.radius}
                onChange={(newValue) => {
                  updateImageDefinition((state) =>
                    updateVectorData(
                      state,
                      vectorSelected.name,
                      (vector) => ({
                        ...vector,
                        radius: newValue,
                      }),
                      onRename
                    )
                  );
                }}
              />,
            ]
          : []),
        ...(vectorSelected.type === "translate"
          ? [
              <Vect2InputControl
                key={"value"}
                title={"value"}
                value={activeValue}
                onChange={(newValue) => {
                  updateVectorValue(newValue);
                }}
              />,
            ]
          : []),
        ...(vectorSelected.type === "rotate"
          ? [
              <SliderControl
                key={"value"}
                title={"value"}
                value={activeValue[0]}
                showValue={true}
                min={-360}
                max={360}
                step={0}
                onChange={(newValue) => {
                  updateVectorValue([newValue, 0]);
                }}
              />,
            ]
          : []),
        ...(vectorSelected.type === "opacity"
          ? [
              <SliderControl
                key={"value"}
                title={"value"}
                value={activeValue[0]}
                showValue={true}
                min={0}
                max={1}
                step={0.05}
                onChange={(newValue) => {
                  updateVectorValue([newValue, 0]);
                }}
              />,
            ]
          : []),
        ...(activeControl
          ? [
              <Control key="controlSet">
                {!controlValue && (
                  <Button
                    onClick={() => {
                      updateImageDefinition((state) =>
                        setMutationUnderControl(
                          state,
                          activeControl,
                          vectorSelected,
                          controlPosition,
                          activeValue
                        )
                      );
                    }}
                  >
                    Add mutation to control
                  </Button>
                )}
                {controlValue && (
                  <Button
                    buttonType={ButtonType.Destructive}
                    onClick={() => {
                      updateImageDefinition((state) =>
                        releaseMutationFromControl(
                          state,
                          activeControl,
                          vectorSelected
                        )
                      );
                    }}
                  >
                    Remove mutation from control
                  </Button>
                )}
              </Control>,
            ]
          : []),
      ]}
    />
  );
};

export default VectorInfoPanel;

import React, { Dispatch, SetStateAction } from "react";
import Button, { ButtonType } from "src/components/Button";
import { Control } from "src/components/Control";
import Menu from "src/components/Menu";
import NumberInputControl from "src/components/NumberInputControl";
import SelectControl from "src/components/SelectControl";
import SliderControl from "src/components/SliderControl";
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
      return { type: "translate", origin, name };
  }
};

const iconForType = (type: VectorTypes): string =>
  (({
    deform: "🟠",
    rotate: "🔴",
    stretch: "🟣",
    translate: "🟢",
  } as Record<VectorTypes, string>)[type]);

const VectorInfoPanel: React.VFC<VectorInfoPanelProps> = ({
  vectorSelected,
  updateImageDefinition,
  image,
  vectorValue,
  updateVectorValue,
  activeControl,
  controlPosition,
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
                ]}
                onChange={(newValue) => {
                  updateImageDefinition((state) =>
                    updateVectorData(state, vectorSelected.name, (vector) =>
                      createVector(vector.name, vector.origin, newValue.value)
                    )
                  );
                  updateVectorValue(defaultValueForVector(newValue.value));
                }}
              />,
              <Vect2InputControl
                key={"origin"}
                title={"origin"}
                value={vectorSelected.origin}
                onChange={(newValue) => {
                  updateImageDefinition((state) =>
                    updateVectorData(state, vectorSelected.name, (vector) => ({
                      ...vector,
                      origin: newValue,
                    }))
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
                    updateVectorData(state, vectorSelected.name, (vector) => ({
                      ...vector,
                      radius: newValue,
                    }))
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
        ...(activeControl
          ? [
              <Control key="controlSet">
                {!controlValue && (
                  <Button
                    onClick={() => {
                      updateImageDefinition((state) =>
                        visit(state, (item) => {
                          if (
                            isControlDefinition(item) &&
                            item.name === activeControl
                          ) {
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
                        })
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
                        visit(state, (item) => {
                          if (
                            isControlDefinition(item) &&
                            item.name === activeControl
                          ) {
                            const updatedControl = {
                              ...item,
                              steps: item.steps.map((step) =>
                                omitKeys(step, [vectorSelected.name])
                              ),
                            };
                            return updatedControl;
                          }
                          return undefined;
                        })
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

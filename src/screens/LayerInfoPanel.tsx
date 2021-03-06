import React, { Dispatch, SetStateAction } from "react";
import Menu from "src/components/Menu";
import Vect2InputControl from "src/components/Vec2InputControl";
import { updateSpriteData } from "src/lib/definitionHelpers";
import { ImageDefinition, ShapeDefinition } from "src/lib/types";

interface LayerInfoPanelProps {
  shapeSelected: ShapeDefinition;
  updateImageDefinition: Dispatch<SetStateAction<ImageDefinition>>;
}

const LayerInfoPanel: React.VFC<LayerInfoPanelProps> = ({
  shapeSelected,
  updateImageDefinition,
}) => (
  <Menu
    title={
      shapeSelected.type === "sprite"
        ? `📄 ${shapeSelected.name}`
        : `📁 ${shapeSelected.name}`
    }
    collapsable={true}
    size="minimal"
    items={[
      <Vect2InputControl
        key={"offset"}
        title={"offset"}
        disabled={shapeSelected === null || shapeSelected.type === "folder"}
        value={
          (shapeSelected &&
            shapeSelected.type === "sprite" &&
            shapeSelected.translate) || [0, 0]
        }
        onChange={(newValue) => {
          if (!shapeSelected) return;
          updateImageDefinition((state) =>
            updateSpriteData(state, shapeSelected.name, (sprite) => ({
              ...sprite,
              translate: newValue,
            }))
          );
        }}
      />,
    ]}
  />
);

export default LayerInfoPanel;

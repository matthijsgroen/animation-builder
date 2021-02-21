import React, { useCallback, useEffect, useState } from "react";
import MenuItem from "src/components/MenuItem";
import { defaultValueForVector } from "src/lib/vertices";
import { isMutationVector, visit } from "src/lib/visit";
import CompositionCanvas from "../animation/CompositionCanvas";
import Menu from "../components/Menu";
import MouseControl, { MouseMode } from "../components/MouseControl";
import ShapeList from "../components/ShapeList";
import ToolbarButton from "../components/ToolbarButton";
import {
  addControl,
  addFolder,
  addVector,
  canDelete,
  canMoveDown,
  canMoveUp,
  getLayerNames,
  getShape,
  getVector,
  makeControlName,
  makeLayerName,
  makeVectorName,
  moveDown,
  moveUp,
  removeItem,
  renameControl,
  renameLayer,
  renameVector,
} from "../lib/definitionHelpers";
import {
  ControlDefinition,
  ImageDefinition,
  ItemSelection,
  Keyframe,
  MutationVector,
  ShapeDefinition,
} from "../lib/types";
import ScreenLayout from "../templates/ScreenLayout";
import ControlInfoPanel from "./ControlInfoPanel";
import LayerInfoPanel from "./LayerInfoPanel";
import VectorInfoPanel from "./VectorInfoPanel";

interface CompositionProps {
  imageDefinition: ImageDefinition;
  texture: HTMLImageElement | null;
  updateImageDefinition(
    mutator: (previousImageDefinition: ImageDefinition) => ImageDefinition
  ): void;
}

// const mergeElement = (
//   a: ElementData,
//   b: ElementData | undefined,
//   mix: number
// ): ElementData =>
//   b === undefined
//     ? a
//     : {
//         deformations: Object.entries(a.deformations || {}).reduce(
//           (result, [key, value]) => ({
//             ...result,
//             [key]: mergeVec2(value, result[key], mix),
//           }),
//           b.deformations || {}
//         ),
//         translate: mergeVec2(a.translate, b.translate, mix),
//       };

// const mergeKeyframes = (a: Keyframe, b: Keyframe, mix: number): Keyframe =>
//   Object.entries(a).reduce(
//     (result, [key, value]) => ({
//       ...result,
//       [key]: mergeElement(value, b[key], mix),
//     }),
//     {} as Keyframe
//   );

// const createKeyframe = (
//   controlValues: ControlValues,
//   imageDefinition: ImageDefinition
// ) =>
//   imageDefinition.controls.reduce(
//     (result, control) => ({
//       ...result,
//       ...mergeKeyframes(
//         mergeKeyframes(
//           control.min,
//           control.max,
//           controlValues[control.name] || 0
//         ),
//         result,
//         0.5
//       ),
//     }),
//     {} as Keyframe
//   );

const Composition: React.FC<CompositionProps> = ({
  texture,
  imageDefinition,
  updateImageDefinition,
}) => {
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0.0);
  const [panY, setPanY] = useState(0.0);
  const [isMouseDown, setIsMouseDown] = useState<false | [number, number]>(
    false
  );
  const [layerSelected, setLayerSelected] = useState<null | ItemSelection>(
    null
  );
  const [vectorValues, setVectorValues] = useState<Keyframe>({});

  const setItemSelected = useCallback(
    (item: ShapeDefinition | MutationVector | ControlDefinition | null) => {
      setLayerSelected(
        item === null
          ? null
          : {
              name: item.name,
              type:
                item.type === "folder" || item.type === "sprite"
                  ? "layer"
                  : item.type === "slider"
                  ? "control"
                  : "vector",
            }
      );
    },
    [setLayerSelected]
  );

  const mouseMode = MouseMode.Grab;
  const shapeSelected =
    layerSelected === null || layerSelected.type !== "layer"
      ? null
      : getShape(imageDefinition, layerSelected.name);
  const vectorSelected =
    layerSelected === null || layerSelected.type !== "vector"
      ? null
      : getVector(imageDefinition, layerSelected.name);

  const controlSelected =
    layerSelected === null || layerSelected.type !== "control"
      ? null
      : imageDefinition.controls.find((c) => c.name === layerSelected.name) ||
        null;

  useEffect(() => {
    let updatedValues = false;
    const newVectorValues = {
      ...vectorValues,
    };
    visit(imageDefinition, (item) => {
      if (isMutationVector(item) && newVectorValues[item.name] === undefined) {
        updatedValues = true;
        newVectorValues[item.name] = defaultValueForVector(item.type);
      }
      return undefined;
    });
    if (updatedValues) {
      setVectorValues(newVectorValues);
    }

    if (!layerSelected) {
      return;
    }
    if (layerSelected.type === "layer") {
      const names = getLayerNames(imageDefinition.shapes);
      if (!names.includes(layerSelected.name)) {
        setItemSelected(null);
      }
    }

    // TODO: Add same path for vector
  }, [imageDefinition]);

  const mouseDown = (event: React.MouseEvent) => {
    const canvasPos = event.currentTarget.getBoundingClientRect();
    const elementX = event.pageX - canvasPos.left;
    const elementY = event.pageY - canvasPos.top;
    setIsMouseDown([elementX, elementY]);
  };

  const mouseMove = (event: React.MouseEvent) => {
    if (isMouseDown) {
      const canvasPos = event.currentTarget.getBoundingClientRect();
      const elementX = event.pageX - canvasPos.left;
      const elementY = event.pageY - canvasPos.top;
      setIsMouseDown([elementX, elementY]);
      const deltaX = elementX - isMouseDown[0];
      const deltaY = elementY - isMouseDown[1];

      const newPanX = Math.min(
        1.0,
        Math.max(
          panX + ((deltaX / canvasPos.width) * window.devicePixelRatio) / zoom,
          -1.0
        )
      );
      setPanX(newPanX);

      const newPanY = Math.min(
        1.0,
        Math.max(
          panY +
            ((deltaY / canvasPos.height) * window.devicePixelRatio * -1.0) /
              zoom,
          -1.0
        )
      );
      setPanY(newPanY);
    }
  };

  const mouseUp = () => {
    setIsMouseDown(false);
  };

  const mouseWheel = (delta: number) => {
    const z = Math.min(4.0, Math.max(0.1, zoom - delta / 100));
    setZoom(z);
  };

  return (
    <ScreenLayout
      tools={[
        <ToolbarButton
          key="move"
          hint="Move mode"
          icon="✋"
          active={true}
          label=""
          onClick={() => {
            // setMouseMode(MouseMode.Grab);
          }}
        />,
        <ToolbarButton
          key="setupStart"
          icon="️⇤"
          disabled={true}
          // active={mouseMode === MouseMode.Aim}
          label=""
          onClick={() => {
            // setMouseMode(MouseMode.Aim);
          }}
        />,
        <ToolbarButton
          key="setupEnd"
          icon="️⇥"
          disabled={true}
          // active={mouseMode === MouseMode.Aim}
          label=""
          onClick={() => {
            // setMouseMode(MouseMode.Aim);
          }}
        />,
      ]}
      menus={[
        <Menu
          title="Composition"
          key="layers"
          collapsable={true}
          size={"large"}
          toolbarItems={[
            <ToolbarButton
              key="1"
              hint="Add mutator"
              icon="⚪️"
              label="+"
              size="small"
              disabled={shapeSelected === null}
              onClick={async () => {
                if (shapeSelected === null) {
                  return;
                }
                const newVector = await addVector(
                  updateImageDefinition,
                  shapeSelected,
                  "New Mutator"
                );
                setItemSelected(newVector);
              }}
            />,
            <ToolbarButton
              key="2"
              hint="Add folder"
              icon="📁"
              label="+"
              size="small"
              onClick={async () => {
                const newFolder = await addFolder(
                  updateImageDefinition,
                  "New Folder"
                );
                setItemSelected(newFolder);
              }}
            />,
            <ToolbarButton
              key="remove"
              hint="Remove item"
              icon="🗑"
              size="small"
              disabled={
                !!(shapeSelected && shapeSelected.type === "sprite") ||
                !!(layerSelected && layerSelected.type === "control") ||
                !canDelete(layerSelected, imageDefinition)
              }
              label=""
              onClick={() => {
                if (layerSelected === null) {
                  return;
                }
                setItemSelected(null);
                updateImageDefinition((state) =>
                  removeItem(state, layerSelected)
                );
              }}
            />,
            <ToolbarButton
              key="3"
              hint="Move item up"
              icon="⬆"
              disabled={
                !!(layerSelected && layerSelected.type === "control") ||
                !canMoveUp(layerSelected, imageDefinition)
              }
              label=""
              size="small"
              onClick={() => {
                if (layerSelected === null) {
                  return;
                }
                updateImageDefinition((state) => moveUp(state, layerSelected));
              }}
            />,
            <ToolbarButton
              key="4"
              hint="Move item down"
              icon="⬇"
              disabled={
                !!(layerSelected && layerSelected.type === "control") ||
                !canMoveDown(layerSelected, imageDefinition)
              }
              label=""
              size="small"
              onClick={() => {
                if (layerSelected === null) {
                  return;
                }
                updateImageDefinition((state) =>
                  moveDown(state, layerSelected)
                );
              }}
            />,
          ]}
          items={
            <ShapeList
              shapes={imageDefinition.shapes}
              layerSelected={layerSelected}
              setItemSelected={setItemSelected}
              showMutationVectors={true}
              onRename={(oldName, newName, item) => {
                if (item.type === "folder" || item.type === "sprite") {
                  const layerName = makeLayerName(
                    imageDefinition,
                    newName,
                    layerSelected ? layerSelected.name : null
                  );
                  updateImageDefinition((state) =>
                    renameLayer(state, oldName, layerName)
                  );
                  setLayerSelected({
                    name: layerName,
                    type: "layer",
                  });
                } else {
                  const vectorName = makeVectorName(
                    imageDefinition,
                    newName,
                    layerSelected ? layerSelected.name : null
                  );
                  updateImageDefinition((state) =>
                    renameVector(state, oldName, vectorName)
                  );
                  setLayerSelected({
                    name: vectorName,
                    type: "vector",
                  });
                }
              }}
            />
          }
        />,
        <Menu
          title="Controls"
          key="controls"
          collapsable={true}
          size="minimal"
          toolbarItems={[
            <ToolbarButton
              key="1"
              icon="️⚙️"
              label="+"
              size="small"
              onClick={async () => {
                const newControl = await addControl(
                  updateImageDefinition,
                  "New Control"
                );
                setItemSelected(newControl);
              }}
            />,
            <ToolbarButton
              key="remove"
              hint="Remove item"
              icon="🗑"
              size="small"
              disabled={!(layerSelected && layerSelected.type === "control")}
              label=""
              onClick={() => {
                if (layerSelected === null) {
                  return;
                }
                setItemSelected(null);
                updateImageDefinition((state) =>
                  removeItem(state, layerSelected)
                );
              }}
            />,
            <ToolbarButton
              key="3"
              hint="Move item up"
              icon="⬆"
              disabled={
                !!(layerSelected && layerSelected.type !== "control") ||
                !canMoveUp(layerSelected, imageDefinition)
              }
              label=""
              size="small"
              onClick={() => {
                if (layerSelected === null) {
                  return;
                }
                updateImageDefinition((state) => moveUp(state, layerSelected));
              }}
            />,
            <ToolbarButton
              key="4"
              hint="Move item down"
              icon="⬇"
              disabled={
                !!(layerSelected && layerSelected.type !== "control") ||
                !canMoveDown(layerSelected, imageDefinition)
              }
              label=""
              size="small"
              onClick={() => {
                if (layerSelected === null) {
                  return;
                }
                updateImageDefinition((state) =>
                  moveDown(state, layerSelected)
                );
              }}
            />,
          ]}
          items={imageDefinition.controls.map((e) => (
            <MenuItem
              key={e.name}
              icon="⚙️"
              label={e.name}
              selected={
                !!(
                  layerSelected &&
                  layerSelected.type === "control" &&
                  layerSelected.name === e.name
                )
              }
              onClick={() => {
                setItemSelected(e);
              }}
              allowRename={true}
              onRename={(newName) => {
                const controlName = makeControlName(
                  imageDefinition,
                  newName,
                  layerSelected ? layerSelected.name : null
                );
                updateImageDefinition((state) =>
                  renameControl(state, e.name, controlName)
                );
                setLayerSelected({
                  name: controlName,
                  type: "control",
                });
              }}
            />
          ))}
        />,
        shapeSelected ? (
          <LayerInfoPanel
            key="info"
            shapeSelected={shapeSelected}
            updateImageDefinition={updateImageDefinition}
          />
        ) : vectorSelected ? (
          <VectorInfoPanel
            key="info"
            vectorSelected={vectorSelected}
            updateImageDefinition={updateImageDefinition}
            vectorValue={
              vectorValues[vectorSelected.name] ||
              defaultValueForVector(vectorSelected.type)
            }
            updateVectorValue={(newValue) => {
              setVectorValues((data) => ({
                ...data,
                [vectorSelected.name]: newValue,
              }));
            }}
          />
        ) : controlSelected ? (
          <ControlInfoPanel
            key="info"
            controlSelected={controlSelected}
            updateImageDefinition={updateImageDefinition}
          />
        ) : (
          <Menu
            title={"Info"}
            key="info"
            collapsable={true}
            size="minimal"
            items={[]}
          />
        ),
      ]}
      main={
        <MouseControl
          mode={mouseMode}
          onMouseDown={mouseDown}
          onMouseMove={mouseMove}
          onMouseUp={mouseUp}
          onWheel={mouseWheel}
        >
          <CompositionCanvas
            image={texture}
            shapes={imageDefinition.shapes}
            vectorValues={vectorValues}
            zoom={zoom}
            panX={panX}
            panY={panY}
            activeLayer={layerSelected}
          />
        </MouseControl>
      }
    />
  );
};

export default Composition;

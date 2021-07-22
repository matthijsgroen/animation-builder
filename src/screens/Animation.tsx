import React, { Dispatch, SetStateAction, useCallback, useState } from "react";
import AnimationCanvas from "src/animation/AnimationCanvas";
import { ControlStyle } from "src/components/Control";
import LayerMouseControl from "src/components/LayerMouseControl";
import Menu from "src/components/Menu";
import NumberInputControl from "src/components/NumberInputControl";
import SliderControl from "src/components/SliderControl";
import TextInputControl from "src/components/TextInputControl";
import { TimeContainer } from "src/components/TimeContainer";
import ToolbarButton from "src/components/ToolbarButton";
import { omitKeys } from "src/lib/definitionHelpers";
import { MouseMode } from "../components/MouseControl";
import {
  AnimationFrame,
  ControlValues,
  ImageDefinition,
  PlayStatus,
  State,
} from "../lib/types";
import ScreenLayout from "../templates/ScreenLayout";

interface AnimationProps {
  imageDefinition: ImageDefinition;
  texture: HTMLImageElement | null;
  updateImageDefinition: Dispatch<SetStateAction<ImageDefinition>>;
  showFPS?: boolean;
  zoomState: State<number>;
  panXState: State<number>;
  panYState: State<number>;
}

const Animation: React.VFC<AnimationProps> = ({
  texture,
  imageDefinition,
  updateImageDefinition,
  showFPS,
  zoomState,
  panXState,
  panYState,
}) => {
  const [zoom] = zoomState;
  const [panX] = panXState;
  const [panY] = panYState;

  const controlValues = imageDefinition.controlValues;
  const setControlValues = (
    mutation: (current: ControlValues) => ControlValues
  ) => {
    updateImageDefinition((image) => ({
      ...image,
      controlValues: mutation(image.controlValues),
    }));
  };

  const [selectedAnimation, setSelectedAnimation] = useState<string | null>(
    null
  );
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);

  const [playStatus, setPlayStatus] = useState<PlayStatus>({});

  const activeAnimation = selectedAnimation
    ? imageDefinition.animations.find((e) => e.name === selectedAnimation)
    : null;

  const activeFrame =
    activeAnimation && selectedFrame !== null
      ? activeAnimation.keyframes.find((f) => f.time === selectedFrame) || null
      : null;

  const animationFrameTimes = activeAnimation
    ? activeAnimation.keyframes.map((f) => f.time).sort((a, b) => a - b)
    : [];

  const frameControlKeys = Object.keys(activeFrame?.controlValues || {});
  const trackControlKeys = selectedAnimation
    ? imageDefinition.animations
        .find((e) => e.name === selectedAnimation)
        ?.keyframes.reduce<string[]>(
          (result, frame) => result.concat(Object.keys(frame.controlValues)),
          []
        )
        .filter((e, i, l) => l.indexOf(e) === i) || null
    : null;

  const updateFrame = useCallback(
    (mutation: (current: AnimationFrame) => AnimationFrame) => {
      updateImageDefinition((image) => ({
        ...image,
        animations: image.animations.map((a) =>
          a.name === selectedAnimation
            ? {
                ...a,
                keyframes: a.keyframes
                  .map((f) => (f === activeFrame ? mutation(f) : f))
                  .sort((a, b) => a.time - b.time),
              }
            : a
        ),
      }));
    },
    [selectedAnimation, activeFrame]
  );

  const setFrameControlValues = (
    mutation: (current: ControlValues) => ControlValues
  ) => updateFrame((f) => ({ ...f, controlValues: mutation(f.controlValues) }));

  const mouseMode = MouseMode.Grab;

  const onTrackStopped = useCallback((trackName: string) => {
    setPlayStatus((status) => omitKeys(status, [trackName]));
  }, []);

  return (
    <ScreenLayout
      main={
        <LayerMouseControl
          mode={mouseMode}
          texture={texture}
          zoomState={zoomState}
          panXState={panXState}
          panYState={panYState}
        >
          <AnimationCanvas
            image={texture}
            imageDefinition={imageDefinition}
            controlValues={{ ...controlValues, ...activeFrame?.controlValues }}
            playStatus={playStatus}
            zoom={zoom}
            panX={panX}
            panY={panY}
            showFPS={showFPS}
            onTrackStopped={onTrackStopped}
          />
        </LayerMouseControl>
      }
      menus={[
        <Menu
          title="Animation"
          key="layers"
          collapsable={true}
          size={"large"}
          items={imageDefinition.controls.map((control, i) => (
            <SliderControl
              key={`control${i}`}
              title={control.name}
              showValue={true}
              value={
                activeFrame && frameControlKeys.includes(control.name)
                  ? activeFrame.controlValues[control.name]
                  : controlValues[control.name] || 0
              }
              min={0}
              controlStyle={
                frameControlKeys.includes(control.name)
                  ? ControlStyle.Selected
                  : trackControlKeys?.includes(control.name)
                  ? ControlStyle.Highlighted
                  : ControlStyle.Default
              }
              max={control.steps.length - 1}
              step={0.01 * (control.steps.length - 1)}
              onSelect={() => {
                if (frameControlKeys.includes(control.name)) {
                  setFrameControlValues((f) => omitKeys(f, [control.name]));
                } else {
                  setFrameControlValues((f) => ({
                    ...f,
                    [control.name]: controlValues[control.name],
                  }));
                }
              }}
              onChange={(newValue) => {
                if (frameControlKeys.includes(control.name)) {
                  setFrameControlValues((f) => ({
                    ...f,
                    [control.name]: newValue,
                  }));
                } else {
                  setControlValues((state) => ({
                    ...state,
                    [control.name]: newValue,
                  }));
                }
              }}
            />
          ))}
        />,
        <Menu
          title="Frame Info"
          key="info"
          collapsable={true}
          size="minimal"
          toolbarItems={[
            <ToolbarButton
              key="previousFrame"
              hint="Go to previous frame"
              icon="◀️"
              label=""
              size="small"
              disabled={
                !activeFrame || activeFrame.time === animationFrameTimes[0]
              }
              onClick={async () => {
                if (activeFrame) {
                  const index = animationFrameTimes.indexOf(activeFrame.time);
                  setSelectedFrame(animationFrameTimes[index - 1]);
                }
              }}
            />,
            <ToolbarButton
              key="nextFrame"
              hint="Go to next frame"
              icon="▶️"
              label=""
              size="small"
              disabled={
                !activeFrame ||
                activeFrame.time ===
                  animationFrameTimes[animationFrameTimes.length - 1]
              }
              onClick={async () => {
                if (activeFrame) {
                  const index = animationFrameTimes.indexOf(activeFrame.time);
                  setSelectedFrame(animationFrameTimes[index + 1]);
                }
              }}
            />,
          ]}
          items={
            activeFrame
              ? [
                  <NumberInputControl
                    key="time"
                    title="time"
                    value={activeFrame.time}
                    onChange={(newValue) => {
                      updateFrame((f) => ({
                        ...f,
                        time: Math.max(newValue, 0),
                      }));
                      setSelectedFrame(newValue);
                    }}
                  />,
                  <TextInputControl
                    key="event"
                    title="event"
                    value={activeFrame.event || ""}
                    onChange={(newValue) => {
                      updateFrame((f) =>
                        newValue.length === 0
                          ? omitKeys(f, ["event"])
                          : {
                              ...f,
                              event: newValue,
                            }
                      );
                    }}
                  />,
                ]
              : []
          }
        />,
      ]}
      bottom={
        <TimeContainer
          selectedAnimation={selectedAnimation}
          updateSelectedAnimation={setSelectedAnimation}
          selectedFrame={selectedFrame}
          updateSelectedFrame={setSelectedFrame}
          imageDefinition={imageDefinition}
          updateImageDefinition={updateImageDefinition}
          playStatus={playStatus}
          updatePlayStatus={setPlayStatus}
        />
      }
    />
  );
};

export default Animation;

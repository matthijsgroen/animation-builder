import React, { useEffect, useMemo, useState } from "react";
import { WebGLRenderer } from "src/lib/webgl";
import { ControlValues, ImageDefinition, PlayStatus } from "../lib/types";
import WebGLCanvas from "./WebGLCanvas";
import {
  AnimationControls,
  createPlayer,
  GeppettoPlayer,
  prepareAnimation,
  ImageDefinition as PlayerImageDefinition,
} from "geppetto-player";

export interface AnimationCanvasProps {
  image: HTMLImageElement | null;
  imageDefinition: ImageDefinition;
  controlValues: ControlValues;
  playStatus?: PlayStatus;
  zoom: number;
  panX: number;
  panY: number;
  showFPS?: boolean;
  onTrackStopped?: (trackName: string, controlValues: ControlValues) => void;
}

const playerIntegration = () => {
  let animation: AnimationControls | null = null;
  let player: GeppettoPlayer;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let internalControlValues: ControlValues = {};
  let internalPlayStatus: PlayStatus = {};
  let controlNames: string[] = [];

  const renderer: WebGLRenderer = (gl) => {
    const canvas = gl.canvas as HTMLCanvasElement;
    player = createPlayer(canvas);

    return {
      render() {
        player.render();
        if (animation) {
          animation.render();
        }
      },
      cleanup() {
        player.destroy();
      },
    };
  };

  return {
    renderer,
    setAnimation(image: HTMLImageElement, imageDefinition: ImageDefinition) {
      if (!player) return;
      controlNames = imageDefinition.controls.map((c) => c.name);
      if (animation !== null) {
        animation.destroy();
      }
      animation = player.addAnimation(
        prepareAnimation(imageDefinition as PlayerImageDefinition), // Temporary, until compatible again
        image,
        1,
        {
          zoom,
          panX,
          panY,
        }
      );
      internalControlValues = imageDefinition.controlValues;
    },
    setZoom(newZoom: number) {
      zoom = newZoom;
      animation && animation.setZoom(zoom);
    },
    setPan(x: number, y: number) {
      panX = x;
      panY = y;
      animation && animation.setPanning(x, y);
    },
    setControlValues(values: ControlValues) {
      if (animation) {
        for (const key in values) {
          if (
            controlNames.includes(key) &&
            internalControlValues[key] !== values[key]
          ) {
            animation.setControlValue(key, values[key]);
          }
        }
      }
      internalControlValues = { ...values };
    },
    setPlayStatus(status: PlayStatus) {
      if (animation) {
        const playing = Object.keys(status);
        const currentlyPlaying = Object.keys(internalPlayStatus);

        const started = playing.filter((e) => !currentlyPlaying.includes(e));
        const stopped = currentlyPlaying.filter((e) => !playing.includes(e));

        for (const startAnim of started) {
          animation.startTrack(startAnim);
        }

        for (const stopAnim of stopped) {
          animation.stopTrack(stopAnim);
        }
      }
      internalPlayStatus = status;
    },
    setTrackStopCallback(
      callback: (trackName: string, newControls: ControlValues) => void
    ) {
      if (!animation) return;

      const trackCallback = (track: string) => {
        const controlValues = controlNames.reduce<ControlValues>(
          (result, key) => ({
            ...result,
            [key]: animation ? animation.getControlValue(key) : 0,
          }),
          {}
        );

        callback(track, controlValues);
      };

      const unsub = animation.onTrackStopped(trackCallback);

      return () => {
        unsub();
      };
    },
  };
};

const AnimationCanvas: React.FC<AnimationCanvasProps> = ({
  image,
  imageDefinition,
  controlValues,
  playStatus = {},
  zoom,
  panX,
  panY,
  showFPS,
  onTrackStopped,
}) => {
  const animation = useMemo(playerIntegration, []);

  const [cleanImageDefinition, setCleanImageDefintion] = useState(
    imageDefinition
  );

  useEffect(() => {
    const updatedDef: ImageDefinition = {
      ...imageDefinition,
      controlValues: cleanImageDefinition.controlValues,
    };
    if (JSON.stringify(updatedDef) !== JSON.stringify(cleanImageDefinition)) {
      const debounce = setTimeout(() => {
        setCleanImageDefintion(imageDefinition);
      }, 100);
      return () => clearTimeout(debounce);
    }
  }, [imageDefinition, controlValues, setCleanImageDefintion]);

  useEffect(() => {
    if (image && imageDefinition) {
      animation.setAnimation(image, imageDefinition);
      animation.setControlValues(controlValues);
    }
  }, [image, cleanImageDefinition]);

  useEffect(() => {
    animation.setControlValues(controlValues);
  }, [controlValues]);

  useEffect(() => {
    animation.setPlayStatus(playStatus);
  }, [playStatus]);

  useEffect(
    () => onTrackStopped && animation.setTrackStopCallback(onTrackStopped),
    [onTrackStopped]
  );

  animation.setZoom(zoom);
  animation.setPan(panX, panY);

  return <WebGLCanvas renderers={[animation.renderer]} showFPS={showFPS} />;
};

export default AnimationCanvas;

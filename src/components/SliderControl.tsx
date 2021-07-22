import React from "react";
import styled from "styled-components";
import { Control, ControlLabel, ControlStyle } from "./Control";

const Slider = styled.input.attrs({ type: "range" })`
  width: 100px;
`;

const Value = styled.p`
  font-size: 0.7rem;
  text-align: right;
  padding-right: 1em;
  margin: 0;
`;

interface SliderControlProps {
  title?: string;
  showValue?: boolean | ((value: number) => string);
  value: number;
  min: number;
  max: number;
  step: number;
  controlStyle?: ControlStyle;
  onChange(newValue: number): void;
  onSelect?(): void;
}

const SliderControl: React.VFC<SliderControlProps> = ({
  title,
  min,
  max,
  step,
  value,
  controlStyle = ControlStyle.Default,
  showValue = false,
  onChange,
  onSelect,
}) => (
  <Control controlStyle={controlStyle} onClick={onSelect}>
    {title && (
      <ControlLabel controlStyle={controlStyle} title={title}>
        {title}
      </ControlLabel>
    )}
    <div>
      {showValue === true && <Value>{Math.round(value * 10e3) / 10e3}</Value>}
      {showValue && showValue !== true && <Value>{showValue(value)}</Value>}
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.currentTarget.valueAsNumber);
        }}
      />
    </div>
  </Control>
);

export default SliderControl;

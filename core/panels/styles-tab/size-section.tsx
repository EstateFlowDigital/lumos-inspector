"use client"

import * as React from "react"
import { Maximize2 } from "lucide-react"
import { Section, PropertyRow, type ComputedValuesMap } from "../shared"
import { DraggableInput } from "../../draggable-input"

interface SizeSectionProps {
  width: string
  setWidth: (value: string) => void
  height: string
  setHeight: (value: string) => void
  minWidth: string
  setMinWidth: (value: string) => void
  maxWidth: string
  setMaxWidth: (value: string) => void
  minHeight: string
  setMinHeight: (value: string) => void
  maxHeight: string
  setMaxHeight: (value: string) => void
  applyStyle: (property: string, value: string, cssProperty?: string) => void
  computedValues: ComputedValuesMap
}

export function SizeSection({
  width,
  setWidth,
  height,
  setHeight,
  minWidth,
  setMinWidth,
  maxWidth,
  setMaxWidth,
  minHeight,
  setMinHeight,
  maxHeight,
  setMaxHeight,
  applyStyle,
  computedValues,
}: SizeSectionProps) {
  return (
    <Section title="Size" icon={Maximize2} defaultOpen>
      <div className="grid grid-cols-2 gap-2">
        <PropertyRow label="Width" labelWidth="w-14">
          <DraggableInput
            value={width}
            onChange={setWidth}
            onBlur={() => applyStyle("width", width)}
            placeholder={computedValues.width || "auto"}
            unit="px"
          />
        </PropertyRow>
        <PropertyRow label="Height" labelWidth="w-14">
          <DraggableInput
            value={height}
            onChange={setHeight}
            onBlur={() => applyStyle("height", height)}
            placeholder={computedValues.height || "auto"}
            unit="px"
          />
        </PropertyRow>
        <PropertyRow label="Min W" labelWidth="w-14">
          <DraggableInput
            value={minWidth}
            onChange={setMinWidth}
            onBlur={() => applyStyle("minWidth", minWidth, "min-width")}
            placeholder="0"
            unit="px"
            min={0}
          />
        </PropertyRow>
        <PropertyRow label="Min H" labelWidth="w-14">
          <DraggableInput
            value={minHeight}
            onChange={setMinHeight}
            onBlur={() => applyStyle("minHeight", minHeight, "min-height")}
            placeholder="0"
            unit="px"
            min={0}
          />
        </PropertyRow>
        <PropertyRow label="Max W" labelWidth="w-14">
          <DraggableInput
            value={maxWidth}
            onChange={setMaxWidth}
            onBlur={() => applyStyle("maxWidth", maxWidth, "max-width")}
            placeholder="none"
            unit="px"
          />
        </PropertyRow>
        <PropertyRow label="Max H" labelWidth="w-14">
          <DraggableInput
            value={maxHeight}
            onChange={setMaxHeight}
            onBlur={() => applyStyle("maxHeight", maxHeight, "max-height")}
            placeholder="none"
            unit="px"
          />
        </PropertyRow>
      </div>
    </Section>
  )
}

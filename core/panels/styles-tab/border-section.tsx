"use client"

import * as React from "react"
import { Square } from "lucide-react"
import { Input } from "../../../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select"
import { Section, PropertyRow, type ComputedValuesMap } from "../shared"
import { borderStyleOptions } from "../shared/constants"
import { DraggableInput } from "../../draggable-input"
import { TokenSelector, radiusTokens } from "../../../tools/token-selector"

interface BorderSectionProps {
  borderWidth: string
  setBorderWidth: (value: string) => void
  borderStyle: string
  setBorderStyle: (value: string) => void
  borderColor: string
  setBorderColor: (value: string) => void
  borderRadius: string
  setBorderRadius: (value: string) => void
  applyStyle: (property: string, value: string, cssProperty?: string) => void
  computedValues: ComputedValuesMap
}

export function BorderSection({
  borderWidth,
  setBorderWidth,
  borderStyle,
  setBorderStyle,
  borderColor,
  setBorderColor,
  borderRadius,
  setBorderRadius,
  applyStyle,
  computedValues,
}: BorderSectionProps) {
  return (
    <Section title="Border" icon={Square} defaultOpen={false}>
      <div className="space-y-3">
        <PropertyRow label="Width">
          <DraggableInput
            value={borderWidth}
            onChange={setBorderWidth}
            onBlur={() => applyStyle("borderWidth", borderWidth, "border-width")}
            placeholder={computedValues.borderWidth || "0"}
            unit="px"
            min={0}
            max={50}
          />
        </PropertyRow>

        <PropertyRow label="Style">
          <Select
            value={borderStyle}
            onValueChange={(val) => {
              setBorderStyle(val)
              applyStyle("borderStyle", val, "border-style")
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {borderStyleOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow label="Color">
          <div className="flex gap-2">
            <Input
              type="color"
              className="w-10 h-8 p-0.5 cursor-pointer"
              value={borderColor || "#000000"}
              onChange={(e) => {
                setBorderColor(e.target.value)
                applyStyle("borderColor", e.target.value, "border-color")
              }}
            />
            <Input
              className="h-8 text-xs flex-1"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              onBlur={() => applyStyle("borderColor", borderColor, "border-color")}
              placeholder={computedValues.borderColor || "none"}
            />
          </div>
        </PropertyRow>

        <PropertyRow label="Radius">
          <DraggableInput
            value={borderRadius}
            onChange={setBorderRadius}
            onBlur={() => applyStyle("borderRadius", borderRadius, "border-radius")}
            placeholder={computedValues.borderRadius || "0"}
            unit="px"
            min={0}
            max={500}
          />
        </PropertyRow>

        <TokenSelector
          tokens={radiusTokens}
          value={borderRadius}
          onChange={(value) => {
            setBorderRadius(value)
            applyStyle("borderRadius", value, "border-radius")
          }}
          type="size"
          placeholder="Select border radius"
        />
      </div>
    </Section>
  )
}

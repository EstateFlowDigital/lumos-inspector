"use client"

import * as React from "react"
import { Type } from "lucide-react"
import { Input } from "../../../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select"
import { Section, PropertyRow, IconButtonGroup, type ComputedValuesMap } from "../shared"
import { textAlignOptions, fontWeightOptions } from "../shared/constants"
import { DraggableInput } from "../../draggable-input"
import { TokenSelector, colorTokens } from "../../../tools/token-selector"

interface TypographySectionProps {
  fontSize: string
  setFontSize: (value: string) => void
  fontWeight: string
  setFontWeight: (value: string) => void
  lineHeight: string
  setLineHeight: (value: string) => void
  letterSpacing: string
  setLetterSpacing: (value: string) => void
  textAlign: string
  setTextAlign: (value: string) => void
  textColor: string
  setTextColor: (value: string) => void
  applyStyle: (property: string, value: string, cssProperty?: string) => void
  computedValues: ComputedValuesMap
}

export function TypographySection({
  fontSize,
  setFontSize,
  fontWeight,
  setFontWeight,
  lineHeight,
  setLineHeight,
  letterSpacing,
  setLetterSpacing,
  textAlign,
  setTextAlign,
  textColor,
  setTextColor,
  applyStyle,
  computedValues,
}: TypographySectionProps) {
  return (
    <Section title="Typography" icon={Type} defaultOpen={false}>
      <div className="space-y-3">
        <PropertyRow label="Size">
          <DraggableInput
            value={fontSize}
            onChange={setFontSize}
            onBlur={() => applyStyle("fontSize", fontSize, "font-size")}
            placeholder={computedValues.fontSize || "16px"}
            unit="px"
            min={1}
            max={200}
          />
        </PropertyRow>

        <PropertyRow label="Weight">
          <Select
            value={fontWeight}
            onValueChange={(val) => {
              setFontWeight(val)
              applyStyle("fontWeight", val, "font-weight")
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontWeightOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label} ({opt.value})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow label="Line Height">
          <DraggableInput
            value={lineHeight}
            onChange={setLineHeight}
            onBlur={() => applyStyle("lineHeight", lineHeight, "line-height")}
            placeholder={computedValues.lineHeight || "normal"}
            min={0}
            max={5}
            step={0.1}
          />
        </PropertyRow>

        <PropertyRow label="Letter">
          <DraggableInput
            value={letterSpacing}
            onChange={setLetterSpacing}
            onBlur={() => applyStyle("letterSpacing", letterSpacing, "letter-spacing")}
            placeholder="normal"
            unit="px"
            min={-10}
            max={50}
          />
        </PropertyRow>

        <PropertyRow label="Align">
          <IconButtonGroup
            options={textAlignOptions.map(a => ({ ...a, icon: a.icon }))}
            value={textAlign}
            onChange={(val) => {
              setTextAlign(val)
              applyStyle("textAlign", val, "text-align")
            }}
          />
        </PropertyRow>

        <PropertyRow label="Color">
          <div className="flex gap-2">
            <Input
              type="color"
              className="w-10 h-8 p-0.5 cursor-pointer"
              value={textColor || "#000000"}
              onChange={(e) => {
                setTextColor(e.target.value)
                applyStyle("color", e.target.value)
              }}
            />
            <Input
              className="h-8 text-xs flex-1"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              onBlur={() => applyStyle("color", textColor)}
              placeholder={computedValues.color || "inherit"}
            />
          </div>
        </PropertyRow>

        <TokenSelector
          tokens={colorTokens}
          value={textColor}
          onChange={(value) => {
            setTextColor(value)
            applyStyle("color", value)
          }}
          type="color"
          placeholder="Select text color"
        />
      </div>
    </Section>
  )
}

"use client"

import * as React from "react"
import { Droplet } from "lucide-react"
import { Input } from "../../../ui/input"
import { Section, PropertyRow, type ComputedValuesMap } from "../shared"
import { TokenSelector, colorTokens } from "../../../tools/token-selector"

interface BackgroundSectionProps {
  backgroundColor: string
  setBackgroundColor: (value: string) => void
  applyStyle: (property: string, value: string, cssProperty?: string) => void
  computedValues: ComputedValuesMap
}

export function BackgroundSection({
  backgroundColor,
  setBackgroundColor,
  applyStyle,
  computedValues,
}: BackgroundSectionProps) {
  return (
    <Section title="Background" icon={Droplet} defaultOpen={false}>
      <div className="space-y-3">
        <PropertyRow label="Color">
          <div className="flex gap-2">
            <Input
              type="color"
              className="w-10 h-8 p-0.5 cursor-pointer"
              value={backgroundColor || "#ffffff"}
              onChange={(e) => {
                setBackgroundColor(e.target.value)
                applyStyle("backgroundColor", e.target.value, "background-color")
              }}
            />
            <Input
              className="h-8 text-xs flex-1"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              onBlur={() => applyStyle("backgroundColor", backgroundColor, "background-color")}
              placeholder={computedValues.backgroundColor || "transparent"}
            />
          </div>
        </PropertyRow>

        <TokenSelector
          tokens={colorTokens}
          value={backgroundColor}
          onChange={(value) => {
            setBackgroundColor(value)
            applyStyle("backgroundColor", value, "background-color")
          }}
          type="color"
          placeholder="Select background color"
        />
      </div>
    </Section>
  )
}

"use client"

import * as React from "react"
import { Layers } from "lucide-react"
import { Input } from "../../../ui/input"
import { Slider } from "../../../ui/slider"
import { Section, PropertyRow } from "../shared"
import { BoxShadowBuilder } from "../../../tools/box-shadow-builder"

interface EffectsSectionProps {
  opacity: string
  setOpacity: (value: string) => void
  boxShadow: string
  setBoxShadow: (value: string) => void
  applyStyle: (property: string, value: string, cssProperty?: string) => void
}

export function EffectsSection({
  opacity,
  setOpacity,
  boxShadow,
  setBoxShadow,
  applyStyle,
}: EffectsSectionProps) {
  return (
    <Section title="Effects" icon={Layers} defaultOpen={false}>
      <div className="space-y-3">
        <PropertyRow label="Opacity">
          <div className="flex items-center gap-2">
            <Slider
              value={[parseFloat(opacity) * 100 || 100]}
              min={0}
              max={100}
              step={1}
              className="flex-1"
              onValueChange={([val]) => {
                const opacityVal = (val / 100).toString()
                setOpacity(opacityVal)
                applyStyle("opacity", opacityVal)
              }}
            />
            <Input
              className="h-8 w-14 text-xs text-center"
              placeholder="100"
              value={Math.round(parseFloat(opacity) * 100) || ""}
              onChange={(e) => {
                const val = (parseFloat(e.target.value) / 100).toString()
                setOpacity(val)
              }}
              onBlur={() => applyStyle("opacity", opacity)}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </PropertyRow>

        {/* Box Shadow Builder */}
        <BoxShadowBuilder
          value={boxShadow}
          onChange={(value) => {
            setBoxShadow(value)
            applyStyle("boxShadow", value, "box-shadow")
          }}
        />
      </div>
    </Section>
  )
}

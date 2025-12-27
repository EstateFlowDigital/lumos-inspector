"use client"

import * as React from "react"
import { Move } from "lucide-react"
import { Section } from "../shared"
import { SpacingBox, type SpacingValues } from "../shared/spacing-box"

interface SpacingSectionProps {
  margin: SpacingValues
  setMargin: React.Dispatch<React.SetStateAction<SpacingValues>>
  padding: SpacingValues
  setPadding: React.Dispatch<React.SetStateAction<SpacingValues>>
  applyStyle: (property: string, value: string, cssProperty?: string) => void
}

export function SpacingSection({
  margin,
  setMargin,
  padding,
  setPadding,
  applyStyle,
}: SpacingSectionProps) {
  const handleMarginChange = (side: keyof SpacingValues, value: string) => {
    setMargin((prev) => ({ ...prev, [side]: value }))
  }

  const handleMarginApply = (side: keyof SpacingValues, value: string) => {
    const propMap: Record<keyof SpacingValues, string> = {
      top: 'margin-top',
      right: 'margin-right',
      bottom: 'margin-bottom',
      left: 'margin-left',
    }
    applyStyle(`margin${side.charAt(0).toUpperCase() + side.slice(1)}`, value, propMap[side])
  }

  const handlePaddingChange = (side: keyof SpacingValues, value: string) => {
    setPadding((prev) => ({ ...prev, [side]: value }))
  }

  const handlePaddingApply = (side: keyof SpacingValues, value: string) => {
    const propMap: Record<keyof SpacingValues, string> = {
      top: 'padding-top',
      right: 'padding-right',
      bottom: 'padding-bottom',
      left: 'padding-left',
    }
    applyStyle(`padding${side.charAt(0).toUpperCase() + side.slice(1)}`, value, propMap[side])
  }

  return (
    <Section title="Spacing" icon={Move} defaultOpen>
      <div className="space-y-2">
        <SpacingBox
          type="margin"
          values={margin}
          onChange={handleMarginChange}
          onApply={handleMarginApply}
        />
        <SpacingBox
          type="padding"
          values={padding}
          onChange={handlePaddingChange}
          onApply={handlePaddingApply}
        />
      </div>
    </Section>
  )
}

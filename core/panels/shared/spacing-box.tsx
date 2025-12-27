"use client"

import * as React from "react"
import { Input } from "../../../ui/input"

export interface SpacingValues {
  top: string
  right: string
  bottom: string
  left: string
}

export interface SpacingBoxProps {
  type: 'margin' | 'padding'
  values: SpacingValues
  onChange: (side: keyof SpacingValues, value: string) => void
  onApply?: (side: keyof SpacingValues, value: string) => void
}

export function SpacingBox({ type, values, onChange, onApply }: SpacingBoxProps) {
  const handleBlur = (side: keyof SpacingValues, value: string) => {
    if (onApply) {
      onApply(side, value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, side: keyof SpacingValues, value: string) => {
    if (e.key === 'Enter' && onApply) {
      onApply(side, value)
    }
  }

  return (
    <div className="relative border rounded-lg p-1 bg-muted/30">
      {/* Label */}
      <div className="absolute top-1 left-2 text-[10px] text-muted-foreground uppercase">
        {type}
      </div>

      {/* Top */}
      <div className="flex justify-center mb-1 mt-4">
        <Input
          className="w-12 h-6 text-center text-xs p-0"
          value={values.top}
          onChange={(e) => onChange('top', e.target.value)}
          onBlur={(e) => handleBlur('top', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'top', values.top)}
          placeholder="0"
        />
      </div>

      {/* Left, Center, Right */}
      <div className="flex items-center justify-between gap-2">
        <Input
          className="w-12 h-6 text-center text-xs p-0"
          value={values.left}
          onChange={(e) => onChange('left', e.target.value)}
          onBlur={(e) => handleBlur('left', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'left', values.left)}
          placeholder="0"
        />

        {/* Inner box for padding */}
        {type === 'margin' && (
          <div className="flex-1 h-12 bg-primary/10 rounded border border-dashed border-primary/30" />
        )}
        {type === 'padding' && (
          <div className="flex-1 h-12 bg-chart-1/10 rounded border border-dashed border-chart-1/30 flex items-center justify-center text-[10px] text-muted-foreground">
            Content
          </div>
        )}

        <Input
          className="w-12 h-6 text-center text-xs p-0"
          value={values.right}
          onChange={(e) => onChange('right', e.target.value)}
          onBlur={(e) => handleBlur('right', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'right', values.right)}
          placeholder="0"
        />
      </div>

      {/* Bottom */}
      <div className="flex justify-center mt-1">
        <Input
          className="w-12 h-6 text-center text-xs p-0"
          value={values.bottom}
          onChange={(e) => onChange('bottom', e.target.value)}
          onBlur={(e) => handleBlur('bottom', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'bottom', values.bottom)}
          placeholder="0"
        />
      </div>
    </div>
  )
}

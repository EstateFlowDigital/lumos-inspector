"use client"

import * as React from "react"
import { useState } from "react"
import {
  ChevronDown, Grid, Eye, EyeOff
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

// Grid presets
const gridPresets = {
  "12-col": { columns: 12, gutter: 24, margin: 16 },
  "16-col": { columns: 16, gutter: 16, margin: 16 },
  bootstrap: { columns: 12, gutter: 30, margin: 15 },
  tailwind: { columns: 12, gutter: 32, margin: 16 },
  material: { columns: 12, gutter: 24, margin: 24 },
  custom: { columns: 12, gutter: 20, margin: 20 },
}

export function GridSystemOverlay() {
  const { isOpen } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [showGrid, setShowGrid] = useState(false)
  const [preset, setPreset] = useState<keyof typeof gridPresets>("12-col")
  const [columns, setColumns] = useState(12)
  const [gutter, setGutter] = useState(24)
  const [margin, setMargin] = useState(16)
  const [maxWidth, setMaxWidth] = useState(1280)
  const [opacity, setOpacity] = useState(30)
  const [color, setColor] = useState("#3b82f6")

  // Apply preset
  const applyPreset = (presetKey: keyof typeof gridPresets) => {
    const p = gridPresets[presetKey]
    setPreset(presetKey)
    setColumns(p.columns)
    setGutter(p.gutter)
    setMargin(p.margin)
  }

  if (!isOpen) return null

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
          <div className="flex items-center gap-2">
            <Grid className="h-4 w-4 text-indigo-500" />
            <span>Grid Overlay</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pt-2">
          {/* Toggle */}
          <Button
            variant={showGrid ? "default" : "outline"}
            size="sm"
            className="w-full h-7"
            onClick={() => setShowGrid(!showGrid)}
          >
            {showGrid ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Hide Grid
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Show Grid
              </>
            )}
          </Button>

          {/* Preset */}
          <div className="space-y-1">
            <Label className="text-[10px]">Preset</Label>
            <Select value={preset} onValueChange={(v) => applyPreset(v as keyof typeof gridPresets)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12-col" className="text-xs">12 Column</SelectItem>
                <SelectItem value="16-col" className="text-xs">16 Column</SelectItem>
                <SelectItem value="bootstrap" className="text-xs">Bootstrap</SelectItem>
                <SelectItem value="tailwind" className="text-xs">Tailwind</SelectItem>
                <SelectItem value="material" className="text-xs">Material</SelectItem>
                <SelectItem value="custom" className="text-xs">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Columns */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Columns</Label>
              <span className="text-[10px] font-mono">{columns}</span>
            </div>
            <Slider
              value={[columns]}
              onValueChange={([v]) => {
                setColumns(v)
                setPreset("custom")
              }}
              min={1}
              max={24}
              step={1}
            />
          </div>

          {/* Gutter */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Gutter</Label>
              <span className="text-[10px] font-mono">{gutter}px</span>
            </div>
            <Slider
              value={[gutter]}
              onValueChange={([v]) => {
                setGutter(v)
                setPreset("custom")
              }}
              min={0}
              max={64}
              step={4}
            />
          </div>

          {/* Margin */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Margin</Label>
              <span className="text-[10px] font-mono">{margin}px</span>
            </div>
            <Slider
              value={[margin]}
              onValueChange={([v]) => {
                setMargin(v)
                setPreset("custom")
              }}
              min={0}
              max={64}
              step={4}
            />
          </div>

          {/* Max width */}
          <div className="space-y-1">
            <Label className="text-[10px]">Max Width</Label>
            <Input
              type="number"
              value={maxWidth}
              onChange={(e) => setMaxWidth(parseInt(e.target.value) || 1280)}
              className="h-7 text-xs"
            />
          </div>

          {/* Opacity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Opacity</Label>
              <span className="text-[10px] font-mono">{opacity}%</span>
            </div>
            <Slider
              value={[opacity]}
              onValueChange={([v]) => setOpacity(v)}
              min={5}
              max={100}
              step={5}
            />
          </div>

          {/* Color */}
          <div className="space-y-1">
            <Label className="text-[10px]">Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-7 rounded cursor-pointer"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 h-7 text-xs font-mono"
              />
            </div>
          </div>

          {/* Column width info */}
          <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
            <div>Container: {maxWidth}px</div>
            <div>
              Column width: ~{Math.round((maxWidth - margin * 2 - gutter * (columns - 1)) / columns)}px
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Grid Overlay */}
      {showGrid && (
        <div
          className="fixed inset-0 pointer-events-none z-9989 flex justify-center"
          data-devtools
        >
          <div
            className="relative h-full"
            style={{
              width: maxWidth,
              maxWidth: "100%",
              paddingLeft: margin,
              paddingRight: margin,
            }}
          >
            <div
              className="h-full flex"
              style={{ gap: gutter }}
            >
              {Array.from({ length: columns }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-full"
                  style={{
                    backgroundColor: color,
                    opacity: opacity / 100,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

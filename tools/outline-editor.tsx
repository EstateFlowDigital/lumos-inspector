"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Square, RotateCcw, Copy
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface OutlineValues {
  width: number
  style: string
  color: string
  offset: number
}

const defaultValues: OutlineValues = {
  width: 2,
  style: "solid",
  color: "#3b82f6",
  offset: 0,
}

const outlineStyles = [
  "none", "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"
]

// Presets
const presets = [
  { name: "None", values: { width: 0, style: "none", color: "#000000", offset: 0 } },
  { name: "Focus Ring", values: { width: 2, style: "solid", color: "#3b82f6", offset: 2 } },
  { name: "Thick", values: { width: 4, style: "solid", color: "#000000", offset: 0 } },
  { name: "Dashed", values: { width: 2, style: "dashed", color: "#6b7280", offset: 4 } },
  { name: "Dotted", values: { width: 2, style: "dotted", color: "#ef4444", offset: 2 } },
  { name: "Double", values: { width: 4, style: "double", color: "#10b981", offset: 0 } },
  { name: "Offset Ring", values: { width: 2, style: "solid", color: "#8b5cf6", offset: 4 } },
  { name: "Inset", values: { width: 3, style: "inset", color: "#6b7280", offset: 0 } },
]

export function OutlineEditor() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [values, setValues] = useState<OutlineValues>(defaultValues)

  // Load from selected element
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)

    setValues({
      width: parseFloat(computed.outlineWidth) || 0,
      style: computed.outlineStyle || "none",
      color: computed.outlineColor || "#000000",
      offset: parseFloat(computed.outlineOffset) || 0,
    })
  }, [selectedElement])

  // Build CSS
  const outlineCSS = useMemo(() => {
    if (values.style === "none" || values.width === 0) {
      return "outline: none;"
    }

    const lines = [
      `outline: ${values.width}px ${values.style} ${values.color};`,
    ]

    if (values.offset !== 0) {
      lines.push(`outline-offset: ${values.offset}px;`)
    }

    return lines.join("\n")
  }, [values])

  // Apply to element
  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element
    el.style.outline = `${values.width}px ${values.style} ${values.color}`
    el.style.outlineOffset = `${values.offset}px`

    notifyStyleChange()
    toast.success("Outline applied")
  }, [selectedElement, values, notifyStyleChange])

  // Reset
  const reset = useCallback(() => {
    setValues({ width: 0, style: "none", color: "#000000", offset: 0 })

    if (selectedElement?.element) {
      selectedElement.element.style.outline = "none"
      selectedElement.element.style.outlineOffset = "0"
      notifyStyleChange()
    }

    toast.success("Outline reset")
  }, [selectedElement, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(outlineCSS)
    toast.success("CSS copied to clipboard")
  }, [outlineCSS])

  // Apply preset
  const applyPreset = useCallback((preset: { values: OutlineValues }) => {
    setValues(preset.values)
    toast.success("Preset applied")
  }, [])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Square className="h-4 w-4 text-emerald-500" />
          <span>Outline Editor</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Preview */}
        <div className="flex items-center justify-center p-6 bg-muted/50 rounded-md">
          <div
            className="w-20 h-20 bg-card rounded-md flex items-center justify-center text-xs text-muted-foreground"
            style={{
              outline: `${values.width}px ${values.style} ${values.color}`,
              outlineOffset: `${values.offset}px`,
            }}
          >
            Preview
          </div>
        </div>

        {/* Presets */}
        <div>
          <Label className="text-[10px] text-muted-foreground mb-2 block">Presets</Label>
          <div className="flex flex-wrap gap-1">
            {presets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Width */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Width</Label>
            <span className="text-[10px] font-mono">{values.width}px</span>
          </div>
          <Slider
            value={[values.width]}
            onValueChange={([v]) => setValues(prev => ({ ...prev, width: v }))}
            min={0}
            max={10}
            step={1}
          />
        </div>

        {/* Style */}
        <div className="space-y-1">
          <Label className="text-[10px]">Style</Label>
          <Select
            value={values.style}
            onValueChange={(v) => setValues(prev => ({ ...prev, style: v }))}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {outlineStyles.map((style) => (
                <SelectItem key={style} value={style} className="text-xs capitalize">
                  {style}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Color */}
        <div className="space-y-1">
          <Label className="text-[10px]">Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={values.color.startsWith("#") ? values.color : "#000000"}
              onChange={(e) => setValues(prev => ({ ...prev, color: e.target.value }))}
              className="w-8 h-7 rounded cursor-pointer"
            />
            <Input
              value={values.color}
              onChange={(e) => setValues(prev => ({ ...prev, color: e.target.value }))}
              className="flex-1 h-7 text-xs font-mono"
            />
          </div>
        </div>

        {/* Offset */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Offset</Label>
            <span className="text-[10px] font-mono">{values.offset}px</span>
          </div>
          <Slider
            value={[values.offset]}
            onValueChange={([v]) => setValues(prev => ({ ...prev, offset: v }))}
            min={-10}
            max={20}
            step={1}
          />
        </div>

        {/* Current CSS */}
        <div className="p-2 bg-muted/50 rounded text-[10px] font-mono whitespace-pre-wrap">
          {outlineCSS}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7" onClick={reset}>
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-7" onClick={copyCSS}>
            <Copy className="h-3 w-3 mr-1" />
            Copy CSS
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 h-7"
            onClick={applyToElement}
            disabled={!selectedElement}
          >
            Apply
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

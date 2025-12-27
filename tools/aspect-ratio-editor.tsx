"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, RectangleHorizontal, RotateCcw, Copy
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface AspectRatioPreset {
  label: string
  ratio: string
  description: string
}

const presets: AspectRatioPreset[] = [
  { label: "Auto", ratio: "auto", description: "Natural size" },
  { label: "1:1", ratio: "1 / 1", description: "Square" },
  { label: "4:3", ratio: "4 / 3", description: "Standard" },
  { label: "3:2", ratio: "3 / 2", description: "Classic photo" },
  { label: "16:9", ratio: "16 / 9", description: "Widescreen" },
  { label: "21:9", ratio: "21 / 9", description: "Ultra-wide" },
  { label: "9:16", ratio: "9 / 16", description: "Vertical video" },
  { label: "2:3", ratio: "2 / 3", description: "Portrait" },
  { label: "3:4", ratio: "3 / 4", description: "Portrait standard" },
  { label: "1:2", ratio: "1 / 2", description: "Tall" },
  { label: "2:1", ratio: "2 / 1", description: "Wide" },
  { label: "Golden", ratio: "1.618 / 1", description: "Golden ratio" },
]

export function AspectRatioEditor() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [aspectRatio, setAspectRatio] = useState("auto")
  const [customWidth, setCustomWidth] = useState(16)
  const [customHeight, setCustomHeight] = useState(9)
  const [useCustom, setUseCustom] = useState(false)

  // Load from selected element
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)
    const ratio = computed.aspectRatio || "auto"
    setAspectRatio(ratio)

    // Parse custom ratio
    if (ratio !== "auto" && ratio.includes("/")) {
      const parts = ratio.split("/").map(p => parseFloat(p.trim()))
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setCustomWidth(parts[0])
        setCustomHeight(parts[1])
      }
    }
  }, [selectedElement])

  // Current ratio value
  const currentRatio = useMemo(() => {
    if (useCustom) {
      return `${customWidth} / ${customHeight}`
    }
    return aspectRatio
  }, [useCustom, customWidth, customHeight, aspectRatio])

  // Calculate preview dimensions
  const previewDimensions = useMemo(() => {
    if (currentRatio === "auto") {
      return { width: 80, height: 60 }
    }

    const parts = currentRatio.split("/").map(p => parseFloat(p.trim()))
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const ratio = parts[0] / parts[1]
      if (ratio > 1) {
        return { width: 100, height: 100 / ratio }
      } else {
        return { width: 80 * ratio, height: 80 }
      }
    }
    return { width: 80, height: 60 }
  }, [currentRatio])

  // Apply to element
  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    selectedElement.element.style.aspectRatio = currentRatio
    notifyStyleChange()
    toast.success("Aspect ratio applied")
  }, [selectedElement, currentRatio, notifyStyleChange])

  // Reset
  const reset = useCallback(() => {
    setAspectRatio("auto")
    setUseCustom(false)
    setCustomWidth(16)
    setCustomHeight(9)

    if (selectedElement?.element) {
      selectedElement.element.style.aspectRatio = "auto"
      notifyStyleChange()
    }

    toast.success("Aspect ratio reset")
  }, [selectedElement, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(`aspect-ratio: ${currentRatio};`)
    toast.success("CSS copied to clipboard")
  }, [currentRatio])

  // Select preset
  const selectPreset = useCallback((preset: AspectRatioPreset) => {
    setAspectRatio(preset.ratio)
    setUseCustom(false)
  }, [])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <RectangleHorizontal className="h-4 w-4 text-orange-500" />
          <span>Aspect Ratio</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Preview */}
        <div className="flex items-center justify-center p-4 bg-muted/50 rounded-md h-28">
          <div
            className="bg-primary/20 border-2 border-primary/50 rounded flex items-center justify-center text-[10px] text-primary font-mono"
            style={{
              width: previewDimensions.width,
              height: previewDimensions.height,
            }}
          >
            {currentRatio === "auto" ? "auto" : currentRatio.replace(" / ", ":")}
          </div>
        </div>

        {/* Presets */}
        <div>
          <Label className="text-[10px] text-muted-foreground mb-2 block">Presets</Label>
          <div className="grid grid-cols-4 gap-1">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant={aspectRatio === preset.ratio && !useCustom ? "default" : "outline"}
                size="sm"
                className="h-8 text-[9px] px-1 flex flex-col"
                onClick={() => selectPreset(preset)}
                title={preset.description}
              >
                <span>{preset.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Custom ratio */}
        <div className="p-2 bg-muted/30 rounded space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-[10px]">Custom:</Label>
            <Input
              type="number"
              value={customWidth}
              onChange={(e) => {
                setCustomWidth(parseFloat(e.target.value) || 1)
                setUseCustom(true)
              }}
              className="h-7 w-16 text-xs text-center"
              min={1}
            />
            <span className="text-muted-foreground">/</span>
            <Input
              type="number"
              value={customHeight}
              onChange={(e) => {
                setCustomHeight(parseFloat(e.target.value) || 1)
                setUseCustom(true)
              }}
              className="h-7 w-16 text-xs text-center"
              min={1}
            />
          </div>

          {/* Quick custom buttons */}
          <div className="flex gap-1 flex-wrap">
            {[
              { w: 1, h: 1 },
              { w: 4, h: 3 },
              { w: 16, h: 9 },
              { w: 9, h: 16 },
            ].map(({ w, h }) => (
              <Button
                key={`${w}:${h}`}
                variant="outline"
                size="sm"
                className="h-5 text-[9px] px-1"
                onClick={() => {
                  setCustomWidth(w)
                  setCustomHeight(h)
                  setUseCustom(true)
                }}
              >
                {w}:{h}
              </Button>
            ))}
          </div>
        </div>

        {/* Current CSS */}
        <div className="p-2 bg-muted/50 rounded text-[10px] font-mono">
          aspect-ratio: {currentRatio};
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

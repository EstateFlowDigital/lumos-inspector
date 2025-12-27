"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  ChevronDown, Image, RotateCcw, Copy
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

const objectFitOptions = [
  { value: "fill", label: "Fill", description: "Stretch to fill container" },
  { value: "contain", label: "Contain", description: "Fit within container" },
  { value: "cover", label: "Cover", description: "Cover entire container" },
  { value: "none", label: "None", description: "Natural size" },
  { value: "scale-down", label: "Scale Down", description: "Smaller of none or contain" },
]

const positionPresets = [
  { x: 0, y: 0, label: "TL" },
  { x: 50, y: 0, label: "T" },
  { x: 100, y: 0, label: "TR" },
  { x: 0, y: 50, label: "L" },
  { x: 50, y: 50, label: "C" },
  { x: 100, y: 50, label: "R" },
  { x: 0, y: 100, label: "BL" },
  { x: 50, y: 100, label: "B" },
  { x: 100, y: 100, label: "BR" },
]

export function ObjectFitEditor() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [objectFit, setObjectFit] = useState("cover")
  const [positionX, setPositionX] = useState(50)
  const [positionY, setPositionY] = useState(50)

  // Check if element is image or video
  const isMediaElement = selectedElement?.element?.tagName === "IMG" ||
    selectedElement?.element?.tagName === "VIDEO"

  // Load from selected element
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)
    setObjectFit(computed.objectFit || "fill")

    // Parse object-position
    const position = computed.objectPosition || "50% 50%"
    const parts = position.split(" ")
    if (parts.length >= 2) {
      setPositionX(parseFloat(parts[0]) || 50)
      setPositionY(parseFloat(parts[1]) || 50)
    }
  }, [selectedElement])

  // Apply to element
  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    selectedElement.element.style.objectFit = objectFit
    selectedElement.element.style.objectPosition = `${positionX}% ${positionY}%`

    notifyStyleChange()
    toast.success("Object fit applied")
  }, [selectedElement, objectFit, positionX, positionY, notifyStyleChange])

  // Reset
  const reset = useCallback(() => {
    setObjectFit("fill")
    setPositionX(50)
    setPositionY(50)

    if (selectedElement?.element) {
      selectedElement.element.style.objectFit = "fill"
      selectedElement.element.style.objectPosition = "50% 50%"
      notifyStyleChange()
    }

    toast.success("Object fit reset")
  }, [selectedElement, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    const css = `object-fit: ${objectFit};\nobject-position: ${positionX}% ${positionY}%;`
    navigator.clipboard.writeText(css)
    toast.success("CSS copied to clipboard")
  }, [objectFit, positionX, positionY])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-lime-500" />
          <span>Object Fit</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Info for non-media elements */}
        {!isMediaElement && selectedElement && (
          <div className="text-[10px] text-yellow-600 dark:text-yellow-400 p-2 bg-yellow-500/10 rounded">
            Note: object-fit works best on img and video elements
          </div>
        )}

        {/* Preview */}
        <div className="relative h-24 bg-muted/50 rounded-md overflow-hidden">
          <div className="absolute inset-2 border-2 border-dashed border-muted-foreground/30 rounded" />
          <div
            className="absolute inset-2 bg-gradient-to-br from-primary/60 to-primary/30 rounded"
            style={{
              objectFit: objectFit as React.CSSProperties["objectFit"],
              objectPosition: `${positionX}% ${positionY}%`,
            }}
          />
          <div
            className="absolute w-2 h-2 bg-primary rounded-full transform -translate-x-1 -translate-y-1 border border-white"
            style={{
              left: `calc(8px + (100% - 16px) * ${positionX / 100})`,
              top: `calc(8px + (100% - 16px) * ${positionY / 100})`,
            }}
          />
        </div>

        {/* Object Fit options */}
        <div>
          <Label className="text-[10px] text-muted-foreground mb-2 block">Object Fit</Label>
          <div className="grid grid-cols-5 gap-1">
            {objectFitOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={objectFit === opt.value ? "default" : "outline"}
                size="sm"
                className="h-8 text-[9px] px-1"
                onClick={() => setObjectFit(opt.value)}
                title={opt.description}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Position grid */}
        <div>
          <Label className="text-[10px] text-muted-foreground mb-2 block">Object Position</Label>
          <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
            {positionPresets.map((pos) => (
              <Button
                key={pos.label}
                variant={positionX === pos.x && positionY === pos.y ? "default" : "outline"}
                size="sm"
                className="h-7 w-7 p-0 text-[9px]"
                onClick={() => {
                  setPositionX(pos.x)
                  setPositionY(pos.y)
                }}
              >
                {pos.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Fine-tune sliders */}
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">X Position</Label>
              <span className="text-[10px] font-mono">{positionX}%</span>
            </div>
            <Slider
              value={[positionX]}
              onValueChange={([v]) => setPositionX(v)}
              min={0}
              max={100}
              step={5}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Y Position</Label>
              <span className="text-[10px] font-mono">{positionY}%</span>
            </div>
            <Slider
              value={[positionY]}
              onValueChange={([v]) => setPositionY(v)}
              min={0}
              max={100}
              step={5}
            />
          </div>
        </div>

        {/* Current CSS */}
        <div className="p-2 bg-muted/50 rounded text-[10px] font-mono">
          <div>object-fit: {objectFit};</div>
          <div>object-position: {positionX}% {positionY}%;</div>
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

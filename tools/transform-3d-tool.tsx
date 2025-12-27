"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Box, RotateCcw, Copy, Move3d
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Switch } from "../ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface Transform3DValues {
  perspective: number
  rotateX: number
  rotateY: number
  rotateZ: number
  translateX: number
  translateY: number
  translateZ: number
  scaleX: number
  scaleY: number
  scaleZ: number
  originX: number
  originY: number
}

const defaultValues: Transform3DValues = {
  perspective: 1000,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
  translateX: 0,
  translateY: 0,
  translateZ: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  originX: 50,
  originY: 50,
}

// Presets
const presets = [
  { name: "Reset", values: defaultValues },
  { name: "Flip X", values: { ...defaultValues, rotateX: 180 } },
  { name: "Flip Y", values: { ...defaultValues, rotateY: 180 } },
  { name: "Tilt Left", values: { ...defaultValues, rotateY: -15, rotateX: 5 } },
  { name: "Tilt Right", values: { ...defaultValues, rotateY: 15, rotateX: 5 } },
  { name: "Pop", values: { ...defaultValues, translateZ: 50, scaleX: 1.1, scaleY: 1.1 } },
  { name: "Card Flip", values: { ...defaultValues, rotateY: 180, perspective: 800 } },
  { name: "Hover Effect", values: { ...defaultValues, rotateX: -10, translateY: -10, translateZ: 20 } },
]

export function Transform3DTool() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [values, setValues] = useState<Transform3DValues>(defaultValues)
  const [preserveChildren, setPreserveChildren] = useState(true)

  // Build transform string
  const transformCSS = useMemo(() => {
    const transforms: string[] = []

    if (values.translateX !== 0 || values.translateY !== 0 || values.translateZ !== 0) {
      transforms.push(`translate3d(${values.translateX}px, ${values.translateY}px, ${values.translateZ}px)`)
    }
    if (values.rotateX !== 0) transforms.push(`rotateX(${values.rotateX}deg)`)
    if (values.rotateY !== 0) transforms.push(`rotateY(${values.rotateY}deg)`)
    if (values.rotateZ !== 0) transforms.push(`rotateZ(${values.rotateZ}deg)`)
    if (values.scaleX !== 1 || values.scaleY !== 1 || values.scaleZ !== 1) {
      transforms.push(`scale3d(${values.scaleX}, ${values.scaleY}, ${values.scaleZ})`)
    }

    return transforms.length > 0 ? transforms.join(" ") : "none"
  }, [values])

  const fullCSS = useMemo(() => {
    const lines = [
      `perspective: ${values.perspective}px;`,
      `transform: ${transformCSS};`,
      `transform-origin: ${values.originX}% ${values.originY}%;`,
    ]
    if (preserveChildren) {
      lines.push(`transform-style: preserve-3d;`)
    }
    return lines.join("\n")
  }, [values, transformCSS, preserveChildren])

  // Apply to element
  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element
    const parent = el.parentElement

    if (parent) {
      parent.style.perspective = `${values.perspective}px`
    }

    el.style.transform = transformCSS
    el.style.transformOrigin = `${values.originX}% ${values.originY}%`
    el.style.transformStyle = preserveChildren ? "preserve-3d" : "flat"

    notifyStyleChange()
    toast.success("3D transform applied")
  }, [selectedElement, values, transformCSS, preserveChildren, notifyStyleChange])

  // Reset
  const reset = useCallback(() => {
    setValues(defaultValues)
    if (selectedElement?.element) {
      selectedElement.element.style.transform = "none"
      selectedElement.element.style.transformOrigin = "50% 50%"
      selectedElement.element.style.transformStyle = "flat"
      notifyStyleChange()
    }
    toast.success("Transform reset")
  }, [selectedElement, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(fullCSS)
    toast.success("CSS copied to clipboard")
  }, [fullCSS])

  // Apply preset
  const applyPreset = useCallback((preset: { values: Transform3DValues }) => {
    setValues(preset.values)
    toast.success("Preset applied")
  }, [])

  // Update single value
  const updateValue = useCallback((key: keyof Transform3DValues, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }, [])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Move3d className="h-4 w-4 text-violet-500" />
          <span>3D Transform</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* 3D Preview */}
        <div
          className="h-32 bg-muted/50 rounded-md flex items-center justify-center overflow-hidden"
          style={{ perspective: `${values.perspective}px` }}
        >
          <div
            className="w-20 h-20 bg-gradient-to-br from-primary to-primary/50 rounded-lg flex items-center justify-center text-white font-bold shadow-lg"
            style={{
              transform: transformCSS,
              transformOrigin: `${values.originX}% ${values.originY}%`,
              transformStyle: preserveChildren ? "preserve-3d" : "flat",
            }}
          >
            3D
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

        {/* Perspective */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Perspective</Label>
            <span className="text-[10px] font-mono">{values.perspective}px</span>
          </div>
          <Slider
            value={[values.perspective]}
            onValueChange={([v]) => updateValue("perspective", v)}
            min={100}
            max={2000}
            step={50}
          />
        </div>

        {/* Rotation */}
        <div className="space-y-2">
          <Label className="text-[10px] text-muted-foreground">Rotation</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["rotateX", "rotateY", "rotateZ"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px]">{key.replace("rotate", "")}</span>
                  <span className="text-[9px] font-mono">{values[key]}°</span>
                </div>
                <Slider
                  value={[values[key]]}
                  onValueChange={([v]) => updateValue(key, v)}
                  min={-180}
                  max={180}
                  step={5}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Translation */}
        <div className="space-y-2">
          <Label className="text-[10px] text-muted-foreground">Translation</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["translateX", "translateY", "translateZ"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px]">{key.replace("translate", "")}</span>
                  <span className="text-[9px] font-mono">{values[key]}px</span>
                </div>
                <Slider
                  value={[values[key]]}
                  onValueChange={([v]) => updateValue(key, v)}
                  min={-200}
                  max={200}
                  step={5}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div className="space-y-2">
          <Label className="text-[10px] text-muted-foreground">Scale</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["scaleX", "scaleY", "scaleZ"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px]">{key.replace("scale", "")}</span>
                  <span className="text-[9px] font-mono">{values[key].toFixed(1)}</span>
                </div>
                <Slider
                  value={[values[key] * 100]}
                  onValueChange={([v]) => updateValue(key, v / 100)}
                  min={0}
                  max={200}
                  step={5}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Transform Origin */}
        <div className="space-y-2">
          <Label className="text-[10px] text-muted-foreground">Origin</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px]">X</span>
                <span className="text-[9px] font-mono">{values.originX}%</span>
              </div>
              <Slider
                value={[values.originX]}
                onValueChange={([v]) => updateValue("originX", v)}
                min={0}
                max={100}
                step={5}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px]">Y</span>
                <span className="text-[9px] font-mono">{values.originY}%</span>
              </div>
              <Slider
                value={[values.originY]}
                onValueChange={([v]) => updateValue("originY", v)}
                min={0}
                max={100}
                step={5}
              />
            </div>
          </div>
        </div>

        {/* Preserve 3D */}
        <div className="flex items-center justify-between">
          <Label htmlFor="preserve-3d" className="text-xs">Preserve 3D for children</Label>
          <Switch
            id="preserve-3d"
            checked={preserveChildren}
            onCheckedChange={setPreserveChildren}
          />
        </div>

        {/* Current CSS */}
        <div className="p-2 bg-muted/50 rounded text-[10px] font-mono whitespace-pre-wrap">
          {fullCSS}
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

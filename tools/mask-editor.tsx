"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import {
  ChevronDown, Layers, RotateCcw, Copy
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

type MaskType = "gradient" | "image" | "none"

interface GradientMask {
  type: "linear" | "radial"
  angle: number
  stops: { position: number; opacity: number }[]
}

const defaultGradient: GradientMask = {
  type: "linear",
  angle: 180,
  stops: [
    { position: 0, opacity: 100 },
    { position: 100, opacity: 0 },
  ],
}

// Presets
const presets = [
  { name: "None", type: "none" as MaskType, gradient: defaultGradient },
  {
    name: "Fade Bottom",
    type: "gradient" as MaskType,
    gradient: { type: "linear" as const, angle: 180, stops: [{ position: 0, opacity: 100 }, { position: 100, opacity: 0 }] },
  },
  {
    name: "Fade Top",
    type: "gradient" as MaskType,
    gradient: { type: "linear" as const, angle: 0, stops: [{ position: 0, opacity: 100 }, { position: 100, opacity: 0 }] },
  },
  {
    name: "Fade Right",
    type: "gradient" as MaskType,
    gradient: { type: "linear" as const, angle: 90, stops: [{ position: 0, opacity: 100 }, { position: 100, opacity: 0 }] },
  },
  {
    name: "Fade Left",
    type: "gradient" as MaskType,
    gradient: { type: "linear" as const, angle: 270, stops: [{ position: 0, opacity: 100 }, { position: 100, opacity: 0 }] },
  },
  {
    name: "Radial Center",
    type: "gradient" as MaskType,
    gradient: { type: "radial" as const, angle: 0, stops: [{ position: 0, opacity: 100 }, { position: 100, opacity: 0 }] },
  },
  {
    name: "Radial Edge",
    type: "gradient" as MaskType,
    gradient: { type: "radial" as const, angle: 0, stops: [{ position: 0, opacity: 0 }, { position: 100, opacity: 100 }] },
  },
  {
    name: "Fade Edges",
    type: "gradient" as MaskType,
    gradient: { type: "linear" as const, angle: 180, stops: [{ position: 0, opacity: 0 }, { position: 20, opacity: 100 }, { position: 80, opacity: 100 }, { position: 100, opacity: 0 }] },
  },
]

export function MaskEditor() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [maskType, setMaskType] = useState<MaskType>("gradient")
  const [gradient, setGradient] = useState<GradientMask>(defaultGradient)
  const [imageUrl, setImageUrl] = useState("")

  // Build mask CSS
  const maskCSS = useMemo(() => {
    if (maskType === "none") return "none"

    if (maskType === "image" && imageUrl) {
      return `url(${imageUrl})`
    }

    if (maskType === "gradient") {
      const stops = gradient.stops
        .map(s => `rgba(0,0,0,${s.opacity / 100}) ${s.position}%`)
        .join(", ")

      if (gradient.type === "linear") {
        return `linear-gradient(${gradient.angle}deg, ${stops})`
      } else {
        return `radial-gradient(circle, ${stops})`
      }
    }

    return "none"
  }, [maskType, gradient, imageUrl])

  const fullCSS = useMemo(() => {
    return `-webkit-mask-image: ${maskCSS};\nmask-image: ${maskCSS};`
  }, [maskCSS])

  // Apply to element
  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element
    el.style.setProperty("-webkit-mask-image", maskCSS)
    el.style.maskImage = maskCSS

    toast.success("Mask applied")
  }, [selectedElement, maskCSS])

  // Reset
  const reset = useCallback(() => {
    setMaskType("none")
    setGradient(defaultGradient)
    setImageUrl("")

    if (selectedElement?.element) {
      const el = selectedElement.element
      el.style.setProperty("-webkit-mask-image", "none")
      el.style.maskImage = "none"
    }

    toast.success("Mask reset")
  }, [selectedElement])

  // Copy CSS
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(fullCSS)
    toast.success("CSS copied to clipboard")
  }, [fullCSS])

  // Apply preset
  const applyPreset = useCallback((preset: { type: MaskType; gradient: GradientMask }) => {
    setMaskType(preset.type)
    setGradient(preset.gradient)
    toast.success("Preset applied")
  }, [])

  // Update gradient stop
  const updateStop = useCallback((index: number, updates: Partial<{ position: number; opacity: number }>) => {
    setGradient(prev => ({
      ...prev,
      stops: prev.stops.map((s, i) => i === index ? { ...s, ...updates } : s),
    }))
  }, [])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-500" />
          <span>Mask Editor</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Preview */}
        <div className="relative h-24 bg-muted/50 rounded-md overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
          <div
            className="absolute inset-0 bg-gradient-to-br from-green-400 to-cyan-500"
            style={{
              WebkitMaskImage: maskCSS,
              maskImage: maskCSS,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-white/80 font-bold text-sm">
            Mask Preview
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

        {/* Mask Type */}
        <Tabs value={maskType} onValueChange={(v) => setMaskType(v as MaskType)}>
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="gradient" className="text-[10px]">Gradient</TabsTrigger>
            <TabsTrigger value="image" className="text-[10px]">Image</TabsTrigger>
            <TabsTrigger value="none" className="text-[10px]">None</TabsTrigger>
          </TabsList>

          {/* Gradient controls */}
          <TabsContent value="gradient" className="space-y-3 mt-3">
            {/* Gradient type */}
            <div className="flex gap-2">
              <Select
                value={gradient.type}
                onValueChange={(v) => setGradient(prev => ({ ...prev, type: v as "linear" | "radial" }))}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear" className="text-xs">Linear</SelectItem>
                  <SelectItem value="radial" className="text-xs">Radial</SelectItem>
                </SelectContent>
              </Select>

              {gradient.type === "linear" && (
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px]">Angle</span>
                    <span className="text-[9px] font-mono">{gradient.angle}°</span>
                  </div>
                  <Slider
                    value={[gradient.angle]}
                    onValueChange={([v]) => setGradient(prev => ({ ...prev, angle: v }))}
                    min={0}
                    max={360}
                    step={15}
                  />
                </div>
              )}
            </div>

            {/* Gradient stops */}
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground">Stops</Label>
              {gradient.stops.map((stop, index) => (
                <div key={index} className="p-2 bg-muted/30 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium">Stop {index + 1}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px]">Position</span>
                        <span className="text-[9px] font-mono">{stop.position}%</span>
                      </div>
                      <Slider
                        value={[stop.position]}
                        onValueChange={([v]) => updateStop(index, { position: v })}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px]">Opacity</span>
                        <span className="text-[9px] font-mono">{stop.opacity}%</span>
                      </div>
                      <Slider
                        value={[stop.opacity]}
                        onValueChange={([v]) => updateStop(index, { opacity: v })}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Image controls */}
          <TabsContent value="image" className="space-y-3 mt-3">
            <div className="space-y-1">
              <Label className="text-[10px]">Image URL</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="h-7 text-xs"
                placeholder="https://example.com/mask.png"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Use a black and white image. Black areas will be transparent.
            </p>
          </TabsContent>

          <TabsContent value="none" className="mt-3">
            <p className="text-xs text-muted-foreground text-center py-4">
              No mask applied
            </p>
          </TabsContent>
        </Tabs>

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

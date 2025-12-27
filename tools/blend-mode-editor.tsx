"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  ChevronDown, Blend, RotateCcw, Copy
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

const blendModes = [
  { value: "normal", label: "Normal", category: "normal" },
  { value: "multiply", label: "Multiply", category: "darken" },
  { value: "screen", label: "Screen", category: "lighten" },
  { value: "overlay", label: "Overlay", category: "contrast" },
  { value: "darken", label: "Darken", category: "darken" },
  { value: "lighten", label: "Lighten", category: "lighten" },
  { value: "color-dodge", label: "Color Dodge", category: "lighten" },
  { value: "color-burn", label: "Color Burn", category: "darken" },
  { value: "hard-light", label: "Hard Light", category: "contrast" },
  { value: "soft-light", label: "Soft Light", category: "contrast" },
  { value: "difference", label: "Difference", category: "inversion" },
  { value: "exclusion", label: "Exclusion", category: "inversion" },
  { value: "hue", label: "Hue", category: "component" },
  { value: "saturation", label: "Saturation", category: "component" },
  { value: "color", label: "Color", category: "component" },
  { value: "luminosity", label: "Luminosity", category: "component" },
]

const categories = [
  { id: "all", label: "All" },
  { id: "darken", label: "Darken" },
  { id: "lighten", label: "Lighten" },
  { id: "contrast", label: "Contrast" },
  { id: "inversion", label: "Inversion" },
  { id: "component", label: "Component" },
]

export function BlendModeEditor() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [mixBlendMode, setMixBlendMode] = useState("normal")
  const [bgBlendMode, setBgBlendMode] = useState("normal")
  const [isolation, setIsolation] = useState("auto")
  const [opacity, setOpacity] = useState(100)
  const [category, setCategory] = useState("all")
  const [mode, setMode] = useState<"mix" | "background">("mix")

  // Load from selected element
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)
    setMixBlendMode(computed.mixBlendMode || "normal")
    setBgBlendMode(computed.backgroundBlendMode || "normal")
    setIsolation(computed.isolation || "auto")
    setOpacity(Math.round(parseFloat(computed.opacity) * 100))
  }, [selectedElement])

  // Apply to element
  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element
    el.style.mixBlendMode = mixBlendMode
    el.style.backgroundBlendMode = bgBlendMode
    el.style.isolation = isolation
    el.style.opacity = String(opacity / 100)

    notifyStyleChange()
    toast.success("Blend mode applied")
  }, [selectedElement, mixBlendMode, bgBlendMode, isolation, opacity, notifyStyleChange])

  // Reset
  const reset = useCallback(() => {
    setMixBlendMode("normal")
    setBgBlendMode("normal")
    setIsolation("auto")
    setOpacity(100)

    if (selectedElement?.element) {
      selectedElement.element.style.mixBlendMode = "normal"
      selectedElement.element.style.backgroundBlendMode = "normal"
      selectedElement.element.style.isolation = "auto"
      selectedElement.element.style.opacity = "1"
      notifyStyleChange()
    }

    toast.success("Blend mode reset")
  }, [selectedElement, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    const css = [
      `mix-blend-mode: ${mixBlendMode};`,
      `background-blend-mode: ${bgBlendMode};`,
      isolation !== "auto" ? `isolation: ${isolation};` : null,
      opacity !== 100 ? `opacity: ${opacity / 100};` : null,
    ].filter(Boolean).join("\n")

    navigator.clipboard.writeText(css)
    toast.success("CSS copied to clipboard")
  }, [mixBlendMode, bgBlendMode, isolation, opacity])

  // Filter blend modes by category
  const filteredModes = category === "all"
    ? blendModes
    : blendModes.filter(m => m.category === category)

  // Current blend mode
  const currentMode = mode === "mix" ? mixBlendMode : bgBlendMode
  const setCurrentMode = mode === "mix" ? setMixBlendMode : setBgBlendMode

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Blend className="h-4 w-4 text-pink-500" />
          <span>Blend Mode</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Preview */}
        <div className="relative h-24 rounded-md overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500" />
          <div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-black to-white"
            style={{
              mixBlendMode: mixBlendMode as React.CSSProperties["mixBlendMode"],
              opacity: opacity / 100,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-shadow">
            {currentMode}
          </div>
        </div>

        {/* Mode tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as "mix" | "background")}>
          <TabsList className="grid w-full grid-cols-2 h-7">
            <TabsTrigger value="mix" className="text-[10px]">Mix Blend</TabsTrigger>
            <TabsTrigger value="background" className="text-[10px]">Background Blend</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={category === cat.id ? "default" : "outline"}
              size="sm"
              className="h-6 text-[9px] px-2"
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Blend mode grid */}
        <div className="grid grid-cols-4 gap-1">
          {filteredModes.map(bm => (
            <Button
              key={bm.value}
              variant={currentMode === bm.value ? "default" : "outline"}
              size="sm"
              className="h-8 text-[9px] px-1"
              onClick={() => setCurrentMode(bm.value)}
            >
              {bm.label}
            </Button>
          ))}
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
            min={0}
            max={100}
            step={5}
          />
        </div>

        {/* Isolation */}
        <div className="flex items-center gap-2">
          <Label className="text-[10px]">Isolation:</Label>
          <div className="flex gap-1">
            {["auto", "isolate"].map(value => (
              <Button
                key={value}
                variant={isolation === value ? "default" : "outline"}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setIsolation(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>

        {/* Current CSS */}
        <div className="p-2 bg-muted/50 rounded text-[10px] font-mono">
          <div>mix-blend-mode: {mixBlendMode};</div>
          <div>background-blend-mode: {bgBlendMode};</div>
          {isolation !== "auto" && <div>isolation: {isolation};</div>}
          {opacity !== 100 && <div>opacity: {opacity / 100};</div>}
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

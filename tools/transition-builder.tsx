"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import {
  ChevronDown, Timer, Plus, Trash2, Copy, Play, RotateCcw
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Slider } from "../ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface TransitionItem {
  id: string
  property: string
  duration: number
  timing: string
  delay: number
}

// Common properties to transition
const transitionProperties = [
  "all",
  "opacity",
  "transform",
  "background-color",
  "color",
  "border-color",
  "box-shadow",
  "width",
  "height",
  "padding",
  "margin",
  "left",
  "top",
  "right",
  "bottom",
  "filter",
  "backdrop-filter",
]

// Timing functions
const timingFunctions = [
  { value: "ease", label: "Ease" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In Out" },
  { value: "linear", label: "Linear" },
  { value: "cubic-bezier(0.4, 0, 0.2, 1)", label: "Smooth" },
  { value: "cubic-bezier(0.4, 0, 1, 1)", label: "Accelerate" },
  { value: "cubic-bezier(0, 0, 0.2, 1)", label: "Decelerate" },
  { value: "cubic-bezier(0.68, -0.55, 0.265, 1.55)", label: "Bounce" },
  { value: "steps(4, end)", label: "Steps" },
]

// Presets
const presets = [
  { name: "Fade", transitions: [{ property: "opacity", duration: 200, timing: "ease-out", delay: 0 }] },
  { name: "Scale", transitions: [{ property: "transform", duration: 200, timing: "ease-out", delay: 0 }] },
  { name: "Slide", transitions: [{ property: "transform", duration: 300, timing: "cubic-bezier(0.4, 0, 0.2, 1)", delay: 0 }] },
  { name: "Button", transitions: [
    { property: "background-color", duration: 150, timing: "ease", delay: 0 },
    { property: "transform", duration: 150, timing: "ease", delay: 0 },
  ]},
  { name: "Card Hover", transitions: [
    { property: "transform", duration: 200, timing: "ease-out", delay: 0 },
    { property: "box-shadow", duration: 200, timing: "ease-out", delay: 0 },
  ]},
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function TransitionBuilder() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [transitions, setTransitions] = useState<TransitionItem[]>([
    { id: generateId(), property: "all", duration: 200, timing: "ease", delay: 0 }
  ])

  // Build transition string
  const transitionCSS = useMemo(() => {
    return transitions
      .map(t => `${t.property} ${t.duration}ms ${t.timing} ${t.delay}ms`)
      .join(", ")
  }, [transitions])

  // Add transition
  const addTransition = useCallback(() => {
    setTransitions(prev => [
      ...prev,
      { id: generateId(), property: "opacity", duration: 200, timing: "ease", delay: 0 }
    ])
  }, [])

  // Remove transition
  const removeTransition = useCallback((id: string) => {
    setTransitions(prev => prev.filter(t => t.id !== id))
  }, [])

  // Update transition
  const updateTransition = useCallback((id: string, updates: Partial<TransitionItem>) => {
    setTransitions(prev =>
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
    )
  }, [])

  // Apply preset
  const applyPreset = useCallback((preset: typeof presets[0]) => {
    setTransitions(
      preset.transitions.map(t => ({ ...t, id: generateId() }))
    )
  }, [])

  // Apply to element
  const apply = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    selectedElement.element.style.transition = transitionCSS
    notifyStyleChange()
    toast.success("Transition applied!")
  }, [selectedElement, transitionCSS, notifyStyleChange])

  // Test transition
  const testTransition = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element
    el.style.transition = transitionCSS

    // Create a test animation based on properties
    const hasOpacity = transitions.some(t => t.property === "all" || t.property === "opacity")
    const hasTransform = transitions.some(t => t.property === "all" || t.property === "transform")

    if (hasOpacity) {
      el.style.opacity = "0.5"
      setTimeout(() => { el.style.opacity = "" }, 100)
    }

    if (hasTransform) {
      el.style.transform = "scale(1.05)"
      setTimeout(() => { el.style.transform = "" }, 100)
    }

    if (!hasOpacity && !hasTransform) {
      el.style.filter = "brightness(1.2)"
      setTimeout(() => { el.style.filter = "" }, 100)
    }

    toast.success("Testing transition...")
  }, [selectedElement, transitionCSS, transitions])

  // Reset
  const reset = useCallback(() => {
    if (!selectedElement?.element) return
    selectedElement.element.style.transition = ""
    notifyStyleChange()
    toast.success("Transition reset")
  }, [selectedElement, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(`transition: ${transitionCSS};`)
    toast.success("CSS copied to clipboard")
  }, [transitionCSS])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-cyan-500" />
          <span>Transition Builder</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Presets */}
        <div className="flex flex-wrap gap-1">
          {presets.map((preset, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-[9px] h-5 px-2 cursor-pointer hover:bg-muted"
              onClick={() => applyPreset(preset)}
            >
              {preset.name}
            </Badge>
          ))}
        </div>

        {/* Transitions list */}
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-3">
            {transitions.map((t, i) => (
              <div key={t.id} className="p-2 bg-muted/30 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[9px] h-4">
                    Transition {i + 1}
                  </Badge>
                  {transitions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-destructive"
                      onClick={() => removeTransition(t.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Property */}
                <div className="space-y-1">
                  <Label className="text-[10px]">Property</Label>
                  <Select
                    value={t.property}
                    onValueChange={(v) => updateTransition(t.id, { property: v })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transitionProperties.map(prop => (
                        <SelectItem key={prop} value={prop} className="text-xs">
                          {prop}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-[10px]">Duration</Label>
                    <span className="text-[10px] font-mono">{t.duration}ms</span>
                  </div>
                  <Slider
                    value={[t.duration]}
                    onValueChange={([v]) => updateTransition(t.id, { duration: v })}
                    min={0}
                    max={1000}
                    step={50}
                  />
                </div>

                {/* Timing */}
                <div className="space-y-1">
                  <Label className="text-[10px]">Timing</Label>
                  <Select
                    value={t.timing}
                    onValueChange={(v) => updateTransition(t.id, { timing: v })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timingFunctions.map(tf => (
                        <SelectItem key={tf.value} value={tf.value} className="text-xs">
                          {tf.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Delay */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-[10px]">Delay</Label>
                    <span className="text-[10px] font-mono">{t.delay}ms</span>
                  </div>
                  <Slider
                    value={[t.delay]}
                    onValueChange={([v]) => updateTransition(t.id, { delay: v })}
                    min={0}
                    max={500}
                    step={50}
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Add button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7"
          onClick={addTransition}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Transition
        </Button>

        {/* Preview */}
        <div className="p-2 bg-muted/50 rounded">
          <code className="text-[10px] break-all">{transitionCSS}</code>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-7"
            onClick={apply}
            disabled={!selectedElement}
          >
            Apply
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={testTransition}
            disabled={!selectedElement}
          >
            <Play className="h-3 w-3 mr-1" />
            Test
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={copyCSS}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={reset}
            disabled={!selectedElement}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

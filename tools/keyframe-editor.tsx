"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import {
  ChevronDown, Film, Plus, Trash2, Copy, Play, RotateCcw, X
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

interface Keyframe {
  id: string
  offset: number
  properties: Record<string, string>
}

// Common properties to animate
const animatableProperties = [
  "opacity",
  "transform",
  "background-color",
  "color",
  "width",
  "height",
  "padding",
  "margin",
  "border-radius",
  "box-shadow",
  "filter",
]

// Animation presets
const presets = [
  {
    name: "Fade In",
    keyframes: [
      { offset: 0, properties: { opacity: "0" } },
      { offset: 100, properties: { opacity: "1" } },
    ],
  },
  {
    name: "Slide Up",
    keyframes: [
      { offset: 0, properties: { transform: "translateY(20px)", opacity: "0" } },
      { offset: 100, properties: { transform: "translateY(0)", opacity: "1" } },
    ],
  },
  {
    name: "Scale",
    keyframes: [
      { offset: 0, properties: { transform: "scale(0)" } },
      { offset: 100, properties: { transform: "scale(1)" } },
    ],
  },
  {
    name: "Bounce",
    keyframes: [
      { offset: 0, properties: { transform: "translateY(0)" } },
      { offset: 50, properties: { transform: "translateY(-20px)" } },
      { offset: 100, properties: { transform: "translateY(0)" } },
    ],
  },
  {
    name: "Shake",
    keyframes: [
      { offset: 0, properties: { transform: "translateX(0)" } },
      { offset: 25, properties: { transform: "translateX(-10px)" } },
      { offset: 50, properties: { transform: "translateX(10px)" } },
      { offset: 75, properties: { transform: "translateX(-10px)" } },
      { offset: 100, properties: { transform: "translateX(0)" } },
    ],
  },
  {
    name: "Pulse",
    keyframes: [
      { offset: 0, properties: { transform: "scale(1)" } },
      { offset: 50, properties: { transform: "scale(1.1)" } },
      { offset: 100, properties: { transform: "scale(1)" } },
    ],
  },
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function KeyframeEditor() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [animationName, setAnimationName] = useState("custom-animation")
  const [duration, setDuration] = useState(1000)
  const [iterationCount, setIterationCount] = useState("1")
  const [direction, setDirection] = useState("normal")
  const [keyframes, setKeyframes] = useState<Keyframe[]>([
    { id: generateId(), offset: 0, properties: { opacity: "0" } },
    { id: generateId(), offset: 100, properties: { opacity: "1" } },
  ])
  const [selectedKeyframe, setSelectedKeyframe] = useState<string | null>(null)
  const [newProp, setNewProp] = useState("opacity")
  const [newValue, setNewValue] = useState("")

  // Build keyframes CSS
  const keyframesCSS = useMemo(() => {
    const sorted = [...keyframes].sort((a, b) => a.offset - b.offset)

    let css = `@keyframes ${animationName} {\n`
    sorted.forEach(kf => {
      const props = Object.entries(kf.properties)
        .map(([k, v]) => `    ${k}: ${v};`)
        .join("\n")
      css += `  ${kf.offset}% {\n${props}\n  }\n`
    })
    css += `}`

    return css
  }, [animationName, keyframes])

  // Build animation CSS
  const animationCSS = useMemo(() => {
    return `animation: ${animationName} ${duration}ms ${direction} ${iterationCount === "infinite" ? "infinite" : iterationCount};`
  }, [animationName, duration, direction, iterationCount])

  // Add keyframe
  const addKeyframe = useCallback(() => {
    const newOffset = keyframes.length > 0
      ? Math.min(100, Math.max(...keyframes.map(k => k.offset)) + 25)
      : 50

    setKeyframes(prev => [
      ...prev,
      { id: generateId(), offset: newOffset, properties: {} }
    ])
  }, [keyframes])

  // Remove keyframe
  const removeKeyframe = useCallback((id: string) => {
    setKeyframes(prev => prev.filter(k => k.id !== id))
  }, [])

  // Update keyframe offset
  const updateOffset = useCallback((id: string, offset: number) => {
    setKeyframes(prev =>
      prev.map(k => k.id === id ? { ...k, offset } : k)
    )
  }, [])

  // Add property to keyframe
  const addProperty = useCallback((keyframeId: string) => {
    if (!newValue) return

    setKeyframes(prev =>
      prev.map(k =>
        k.id === keyframeId
          ? { ...k, properties: { ...k.properties, [newProp]: newValue } }
          : k
      )
    )
    setNewValue("")
  }, [newProp, newValue])

  // Remove property
  const removeProperty = useCallback((keyframeId: string, prop: string) => {
    setKeyframes(prev =>
      prev.map(k => {
        if (k.id !== keyframeId) return k
        const { [prop]: _, ...rest } = k.properties
        return { ...k, properties: rest }
      })
    )
  }, [])

  // Apply preset
  const applyPreset = useCallback((preset: typeof presets[0]) => {
    setKeyframes(
      preset.keyframes.map(kf => ({
        id: generateId(),
        offset: kf.offset,
        properties: kf.properties,
      }))
    )
  }, [])

  // Apply to element
  const apply = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    // Inject keyframes
    const style = document.createElement("style")
    style.id = `devtools-keyframes-${animationName}`
    style.textContent = keyframesCSS
    document.head.appendChild(style)

    // Apply animation
    selectedElement.element.style.animation = `${animationName} ${duration}ms ${direction} ${iterationCount === "infinite" ? "infinite" : iterationCount}`

    notifyStyleChange()
    toast.success("Animation applied!")
  }, [selectedElement, animationName, keyframesCSS, duration, direction, iterationCount, notifyStyleChange])

  // Preview animation
  const preview = useCallback(() => {
    if (!selectedElement?.element) return

    apply()

    // Remove after playing once
    if (iterationCount !== "infinite") {
      setTimeout(() => {
        if (selectedElement?.element) {
          selectedElement.element.style.animation = ""
        }
      }, duration * parseInt(iterationCount))
    }
  }, [selectedElement, apply, duration, iterationCount])

  // Reset
  const reset = useCallback(() => {
    if (!selectedElement?.element) return

    selectedElement.element.style.animation = ""
    document.getElementById(`devtools-keyframes-${animationName}`)?.remove()

    notifyStyleChange()
    toast.success("Animation reset")
  }, [selectedElement, animationName, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(`${keyframesCSS}\n\n.element {\n  ${animationCSS}\n}`)
    toast.success("CSS copied to clipboard")
  }, [keyframesCSS, animationCSS])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-purple-500" />
          <span>Keyframe Editor</span>
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

        {/* Animation name */}
        <div className="space-y-1">
          <Label className="text-[10px]">Animation Name</Label>
          <Input
            value={animationName}
            onChange={(e) => setAnimationName(e.target.value)}
            className="h-7 text-xs font-mono"
          />
        </div>

        {/* Duration & iteration */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Duration (ms)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 1000)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Iterations</Label>
            <Select value={iterationCount} onValueChange={setIterationCount}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="infinite">Infinite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Direction */}
        <div className="space-y-1">
          <Label className="text-[10px]">Direction</Label>
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="reverse">Reverse</SelectItem>
              <SelectItem value="alternate">Alternate</SelectItem>
              <SelectItem value="alternate-reverse">Alternate Reverse</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Keyframes timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Keyframes</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1"
              onClick={addKeyframe}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Timeline visualization */}
          <div className="relative h-8 bg-muted/50 rounded">
            {keyframes.map(kf => (
              <div
                key={kf.id}
                className={cn(
                  "absolute top-1 w-3 h-6 rounded cursor-pointer",
                  selectedKeyframe === kf.id ? "bg-primary" : "bg-primary/50"
                )}
                style={{ left: `calc(${kf.offset}% - 6px)` }}
                onClick={() => setSelectedKeyframe(kf.id)}
              />
            ))}
          </div>
        </div>

        {/* Selected keyframe editor */}
        {selectedKeyframe && (
          <div className="p-2 bg-muted/30 rounded space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                Keyframe @ {keyframes.find(k => k.id === selectedKeyframe)?.offset}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-destructive"
                onClick={() => {
                  removeKeyframe(selectedKeyframe)
                  setSelectedKeyframe(null)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {/* Offset slider */}
            <div className="space-y-1">
              <Label className="text-[9px]">Offset</Label>
              <Slider
                value={[keyframes.find(k => k.id === selectedKeyframe)?.offset || 0]}
                onValueChange={([v]) => updateOffset(selectedKeyframe, v)}
                min={0}
                max={100}
                step={1}
              />
            </div>

            {/* Properties */}
            <div className="space-y-1">
              {Object.entries(keyframes.find(k => k.id === selectedKeyframe)?.properties || {}).map(([prop, val]) => (
                <div key={prop} className="flex items-center gap-1 text-[10px]">
                  <span className="font-mono text-muted-foreground">{prop}:</span>
                  <span className="font-mono flex-1">{val}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => removeProperty(selectedKeyframe, prop)}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add property */}
            <div className="flex gap-1">
              <Select value={newProp} onValueChange={setNewProp}>
                <SelectTrigger className="h-6 text-[10px] w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {animatableProperties.map(p => (
                    <SelectItem key={p} value={p} className="text-[10px]">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="h-6 text-[10px] font-mono flex-1"
                placeholder="value"
              />
              <Button
                size="sm"
                className="h-6 px-2"
                onClick={() => addProperty(selectedKeyframe)}
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={preview}
            disabled={!selectedElement}
          >
            <Play className="h-3 w-3 mr-1" />
            Preview
          </Button>
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
            onClick={reset}
            disabled={!selectedElement}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-7"
          onClick={copyCSS}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy CSS
        </Button>
      </CollapsibleContent>
    </Collapsible>
  )
}

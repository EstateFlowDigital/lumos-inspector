"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  ChevronDown, ScrollText, Copy, RotateCcw, Play, Pause
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Slider } from "../ui/slider"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

// Timeline types
const timelineTypes = [
  { value: "scroll", label: "Scroll Progress", description: "Animate based on scroll position" },
  { value: "view", label: "View Progress", description: "Animate as element enters/exits viewport" },
]

// Scroll axis options
const scrollAxes = [
  { value: "block", label: "Block (Vertical)" },
  { value: "inline", label: "Inline (Horizontal)" },
  { value: "y", label: "Y Axis" },
  { value: "x", label: "X Axis" },
]

// Animation presets
const animationPresets = [
  { name: "Fade In", keyframes: "fade-in", from: "opacity: 0", to: "opacity: 1" },
  { name: "Slide Up", keyframes: "slide-up", from: "transform: translateY(50px)", to: "transform: translateY(0)" },
  { name: "Scale Up", keyframes: "scale-up", from: "transform: scale(0.8)", to: "transform: scale(1)" },
  { name: "Rotate", keyframes: "rotate-in", from: "transform: rotate(-10deg)", to: "transform: rotate(0)" },
  { name: "Blur In", keyframes: "blur-in", from: "filter: blur(10px)", to: "filter: blur(0)" },
]

export function ScrollAnimationsTool() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [timelineType, setTimelineType] = useState("scroll")
  const [scrollAxis, setScrollAxis] = useState("block")
  const [animationName, setAnimationName] = useState("fade-in")
  const [rangeStart, setRangeStart] = useState(0)
  const [rangeEnd, setRangeEnd] = useState(100)
  const [isSupported, setIsSupported] = useState(true)

  // Check browser support
  useEffect(() => {
    setIsSupported(CSS.supports("animation-timeline", "scroll()"))
  }, [])

  // Build CSS
  const buildCSS = useCallback(() => {
    let css = ""

    // Keyframes
    const preset = animationPresets.find(p => p.keyframes === animationName)
    if (preset) {
      css += `@keyframes ${animationName} {\n`
      css += `  from { ${preset.from}; }\n`
      css += `  to { ${preset.to}; }\n`
      css += `}\n\n`
    }

    // Animation properties
    css += `.element {\n`
    css += `  animation: ${animationName} linear both;\n`

    if (timelineType === "scroll") {
      css += `  animation-timeline: scroll(${scrollAxis});\n`
    } else {
      css += `  animation-timeline: view();\n`
    }

    if (rangeStart !== 0 || rangeEnd !== 100) {
      css += `  animation-range: ${rangeStart}% ${rangeEnd}%;\n`
    }

    css += `}\n`

    return css
  }, [timelineType, scrollAxis, animationName, rangeStart, rangeEnd])

  // Apply to element
  const apply = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element
    const preset = animationPresets.find(p => p.keyframes === animationName)

    if (!preset) return

    // Create keyframes
    const keyframeName = `devtools-${animationName}-${Date.now()}`
    const style = document.createElement("style")
    style.textContent = `
      @keyframes ${keyframeName} {
        from { ${preset.from}; }
        to { ${preset.to}; }
      }
    `
    document.head.appendChild(style)

    // Apply animation
    el.style.animation = `${keyframeName} linear both`

    if (timelineType === "scroll") {
      el.style.setProperty("animation-timeline", `scroll(${scrollAxis})`)
    } else {
      el.style.setProperty("animation-timeline", "view()")
    }

    if (rangeStart !== 0 || rangeEnd !== 100) {
      el.style.setProperty("animation-range", `${rangeStart}% ${rangeEnd}%`)
    }

    toast.success("Scroll animation applied!")
  }, [selectedElement, timelineType, scrollAxis, animationName, rangeStart, rangeEnd])

  // Reset
  const reset = useCallback(() => {
    if (!selectedElement?.element) return

    const el = selectedElement.element
    el.style.animation = ""
    el.style.setProperty("animation-timeline", "")
    el.style.setProperty("animation-range", "")

    toast.success("Animation reset")
  }, [selectedElement])

  // Copy CSS
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(buildCSS())
    toast.success("CSS copied to clipboard")
  }, [buildCSS])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-cyan-500" />
          <span>Scroll Animations</span>
          <Badge variant="outline" className="text-[9px] h-4 px-1">New</Badge>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Browser support warning */}
        {!isSupported && (
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-600">
            Scroll-driven animations may not be supported in this browser.
          </div>
        )}

        {/* Timeline Type */}
        <div className="space-y-1">
          <Label className="text-[10px]">Timeline Type</Label>
          <Select value={timelineType} onValueChange={setTimelineType}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timelineTypes.map(tt => (
                <SelectItem key={tt.value} value={tt.value} className="text-xs">
                  {tt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] text-muted-foreground">
            {timelineTypes.find(tt => tt.value === timelineType)?.description}
          </p>
        </div>

        {/* Scroll Axis (for scroll timeline) */}
        {timelineType === "scroll" && (
          <div className="space-y-1">
            <Label className="text-[10px]">Scroll Axis</Label>
            <Select value={scrollAxis} onValueChange={setScrollAxis}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scrollAxes.map(sa => (
                  <SelectItem key={sa.value} value={sa.value} className="text-xs">
                    {sa.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Animation Preset */}
        <div className="space-y-1">
          <Label className="text-[10px]">Animation</Label>
          <div className="flex flex-wrap gap-1">
            {animationPresets.map(preset => (
              <Badge
                key={preset.keyframes}
                variant={animationName === preset.keyframes ? "default" : "outline"}
                className="text-[9px] h-5 px-2 cursor-pointer"
                onClick={() => setAnimationName(preset.keyframes)}
              >
                {preset.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Animation Range */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-[10px]">Animation Range</Label>
            <span className="text-[10px] font-mono">{rangeStart}% - {rangeEnd}%</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] w-8">Start</span>
              <Slider
                value={[rangeStart]}
                onValueChange={([v]) => setRangeStart(v)}
                min={0}
                max={100}
                step={5}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] w-8">End</span>
              <Slider
                value={[rangeEnd]}
                onValueChange={([v]) => setRangeEnd(v)}
                min={0}
                max={100}
                step={5}
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="p-2 bg-muted/50 rounded">
          <code className="text-[9px] whitespace-pre-wrap break-all">{buildCSS()}</code>
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
            onClick={reset}
            disabled={!selectedElement}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
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

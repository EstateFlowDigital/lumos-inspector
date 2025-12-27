"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import {
  Play, Pause, RotateCcw, Plus, Minus, Timer, Zap, ChevronDown
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"

// Easing presets
const EASING_PRESETS = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  easeInSine: "cubic-bezier(0.12, 0, 0.39, 0)",
  easeOutSine: "cubic-bezier(0.61, 1, 0.88, 1)",
  easeInOutSine: "cubic-bezier(0.37, 0, 0.63, 1)",
  easeInQuad: "cubic-bezier(0.11, 0, 0.5, 0)",
  easeOutQuad: "cubic-bezier(0.5, 1, 0.89, 1)",
  easeInOutQuad: "cubic-bezier(0.45, 0, 0.55, 1)",
  easeInCubic: "cubic-bezier(0.32, 0, 0.67, 0)",
  easeOutCubic: "cubic-bezier(0.33, 1, 0.68, 1)",
  easeInOutCubic: "cubic-bezier(0.65, 0, 0.35, 1)",
  easeInBack: "cubic-bezier(0.36, 0, 0.66, -0.56)",
  easeOutBack: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  easeInOutBack: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
  spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
} as const

// Animation presets
const ANIMATION_PRESETS = [
  {
    name: "Fade In",
    keyframes: "@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }",
    animation: "fadeIn 0.3s ease-out forwards",
  },
  {
    name: "Fade Out",
    keyframes: "@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }",
    animation: "fadeOut 0.3s ease-out forwards",
  },
  {
    name: "Slide In Up",
    keyframes: "@keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }",
    animation: "slideInUp 0.4s ease-out forwards",
  },
  {
    name: "Slide In Down",
    keyframes: "@keyframes slideInDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }",
    animation: "slideInDown 0.4s ease-out forwards",
  },
  {
    name: "Slide In Left",
    keyframes: "@keyframes slideInLeft { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }",
    animation: "slideInLeft 0.4s ease-out forwards",
  },
  {
    name: "Slide In Right",
    keyframes: "@keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }",
    animation: "slideInRight 0.4s ease-out forwards",
  },
  {
    name: "Scale In",
    keyframes: "@keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }",
    animation: "scaleIn 0.3s ease-out forwards",
  },
  {
    name: "Scale Out",
    keyframes: "@keyframes scaleOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0.9); opacity: 0; } }",
    animation: "scaleOut 0.3s ease-out forwards",
  },
  {
    name: "Bounce",
    keyframes: "@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }",
    animation: "bounce 0.5s ease-in-out infinite",
  },
  {
    name: "Pulse",
    keyframes: "@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }",
    animation: "pulse 1s ease-in-out infinite",
  },
  {
    name: "Shake",
    keyframes: "@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }",
    animation: "shake 0.4s ease-in-out",
  },
  {
    name: "Spin",
    keyframes: "@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }",
    animation: "spin 1s linear infinite",
  },
  {
    name: "Flip",
    keyframes: "@keyframes flip { from { transform: perspective(400px) rotateY(0); } to { transform: perspective(400px) rotateY(360deg); } }",
    animation: "flip 0.6s ease-in-out",
  },
]

interface AnimationBuilderProps {
  value: string
  onChange: (value: string) => void
  element?: HTMLElement | null
}

export function AnimationBuilder({ value, onChange, element }: AnimationBuilderProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)

  // Transition properties
  const [transitionProperty, setTransitionProperty] = useState("all")
  const [transitionDuration, setTransitionDuration] = useState("300")
  const [transitionEasing, setTransitionEasing] = useState("ease")
  const [transitionDelay, setTransitionDelay] = useState("0")

  // Animation properties
  const [animationName, setAnimationName] = useState("")
  const [animationDuration, setAnimationDuration] = useState("300")
  const [animationEasing, setAnimationEasing] = useState("ease")
  const [animationDelay, setAnimationDelay] = useState("0")
  const [animationIterations, setAnimationIterations] = useState("1")
  const [animationDirection, setAnimationDirection] = useState("normal")
  const [animationFillMode, setAnimationFillMode] = useState("forwards")

  // Build transition value
  const transitionValue = useMemo(() => {
    const easing = EASING_PRESETS[transitionEasing as keyof typeof EASING_PRESETS] || transitionEasing
    return `${transitionProperty} ${transitionDuration}ms ${easing} ${transitionDelay}ms`
  }, [transitionProperty, transitionDuration, transitionEasing, transitionDelay])

  // Apply transition
  const applyTransition = useCallback(() => {
    onChange(transitionValue)
    toast.success("Transition applied")
  }, [transitionValue, onChange])

  // Apply animation preset
  const applyAnimationPreset = useCallback((preset: typeof ANIMATION_PRESETS[0]) => {
    if (!element) {
      toast.error("No element selected")
      return
    }

    // Inject keyframes
    const styleEl = document.getElementById("devtools-animations") || (() => {
      const el = document.createElement("style")
      el.id = "devtools-animations"
      el.setAttribute("data-devtools", "true")
      document.head.appendChild(el)
      return el
    })()

    if (!styleEl.textContent?.includes(preset.keyframes)) {
      styleEl.textContent += preset.keyframes + "\n"
    }

    // Apply animation
    element.style.animation = preset.animation
    setAnimationName(preset.name.toLowerCase().replace(/\s+/g, ""))
    toast.success(`${preset.name} applied`)
  }, [element])

  // Play/pause animation
  const togglePlayback = useCallback(() => {
    if (!element) return

    if (isPlaying) {
      element.style.animationPlayState = "paused"
    } else {
      element.style.animationPlayState = "running"
    }
    setIsPlaying(!isPlaying)
  }, [element, isPlaying])

  // Reset animation
  const resetAnimation = useCallback(() => {
    if (!element) return

    element.style.animation = "none"
    // Force reflow
    element.offsetHeight
    element.style.animation = ""
    setIsPlaying(false)
    toast.success("Animation reset")
  }, [element])

  // Build custom animation value
  const buildCustomAnimation = useCallback(() => {
    if (!animationName) {
      toast.error("Enter animation name")
      return
    }

    const easing = EASING_PRESETS[animationEasing as keyof typeof EASING_PRESETS] || animationEasing
    const iterations = animationIterations === "infinite" ? "infinite" : animationIterations
    const animation = `${animationName} ${animationDuration}ms ${easing} ${animationDelay}ms ${iterations} ${animationDirection} ${animationFillMode}`

    if (element) {
      element.style.animation = animation
      toast.success("Animation applied")
    }
  }, [element, animationName, animationDuration, animationEasing, animationDelay, animationIterations, animationDirection, animationFillMode])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-chart-3" />
          <span>Animation & Transitions</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 pt-2">
        {/* Transition Builder */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
          <Label className="text-xs font-medium">Transition</Label>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Property</Label>
              <Select value={transitionProperty} onValueChange={setTransitionProperty}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="opacity">Opacity</SelectItem>
                  <SelectItem value="transform">Transform</SelectItem>
                  <SelectItem value="background-color">Background</SelectItem>
                  <SelectItem value="color">Color</SelectItem>
                  <SelectItem value="border">Border</SelectItem>
                  <SelectItem value="box-shadow">Shadow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground">Duration (ms)</Label>
              <Input
                type="number"
                value={transitionDuration}
                onChange={(e) => setTransitionDuration(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Easing</Label>
              <Select value={transitionEasing} onValueChange={setTransitionEasing}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(EASING_PRESETS).map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground">Delay (ms)</Label>
              <Input
                type="number"
                value={transitionDelay}
                onChange={(e) => setTransitionDelay(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={transitionValue}
              readOnly
              className="h-8 text-xs font-mono bg-muted"
            />
            <Button size="sm" className="h-8" onClick={applyTransition}>
              Apply
            </Button>
          </div>
        </div>

        {/* Animation Presets */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
          <Label className="text-xs font-medium">Animation Presets</Label>

          <div className="grid grid-cols-3 gap-1">
            {ANIMATION_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                className="h-7 text-[10px] px-2"
                onClick={() => applyAnimationPreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>

          {element?.style.animation && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={togglePlayback}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={resetAnimation}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <code className="flex-1 text-[10px] font-mono bg-muted px-2 py-1 rounded truncate">
                {element.style.animation}
              </code>
            </div>
          )}
        </div>

        {/* Custom Animation Builder */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
          <Label className="text-xs font-medium">Custom Animation</Label>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Name</Label>
              <Input
                value={animationName}
                onChange={(e) => setAnimationName(e.target.value)}
                placeholder="animation-name"
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground">Duration (ms)</Label>
              <Input
                type="number"
                value={animationDuration}
                onChange={(e) => setAnimationDuration(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Easing</Label>
              <Select value={animationEasing} onValueChange={setAnimationEasing}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(EASING_PRESETS).map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground">Iterations</Label>
              <Select value={animationIterations} onValueChange={setAnimationIterations}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="infinite">Infinite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Direction</Label>
              <Select value={animationDirection} onValueChange={setAnimationDirection}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="reverse">Reverse</SelectItem>
                  <SelectItem value="alternate">Alternate</SelectItem>
                  <SelectItem value="alternate-reverse">Alt. Reverse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground">Fill Mode</Label>
              <Select value={animationFillMode} onValueChange={setAnimationFillMode}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="forwards">Forwards</SelectItem>
                  <SelectItem value="backwards">Backwards</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button size="sm" className="w-full h-8" onClick={buildCustomAnimation}>
            Apply Custom Animation
          </Button>
        </div>

        {/* Easing Curve Visualizer */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <Label className="text-xs font-medium mb-2 block">Easing Preview</Label>
          <div className="relative h-20 bg-muted rounded overflow-hidden">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <path
                d={getEasingPath(transitionEasing)}
                fill="none"
                stroke="hsl(var(--chart-1))"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div
              className="absolute bottom-2 w-3 h-3 rounded-full bg-chart-1"
              style={{
                animation: `easingPreview 2s ${EASING_PRESETS[transitionEasing as keyof typeof EASING_PRESETS] || "ease"} infinite`,
              }}
            />
            <style>{`
              @keyframes easingPreview {
                0%, 100% { left: 8px; }
                50% { left: calc(100% - 20px); }
              }
            `}</style>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// Helper to generate SVG path for easing curve
function getEasingPath(easing: string): string {
  const presets: Record<string, string> = {
    linear: "M 0 100 L 100 0",
    ease: "M 0 100 C 25 100 25 0 100 0",
    easeIn: "M 0 100 C 42 100 100 0 100 0",
    easeOut: "M 0 100 C 0 100 58 0 100 0",
    easeInOut: "M 0 100 C 42 100 58 0 100 0",
    easeInSine: "M 0 100 C 47 100 100 0 100 0",
    easeOutSine: "M 0 100 C 0 100 53 0 100 0",
    easeInOutSine: "M 0 100 C 37 100 63 0 100 0",
    easeInQuad: "M 0 100 C 55 100 100 0 100 0",
    easeOutQuad: "M 0 100 C 0 100 45 0 100 0",
    easeInOutQuad: "M 0 100 C 45 100 55 0 100 0",
    easeInCubic: "M 0 100 C 67 100 100 0 100 0",
    easeOutCubic: "M 0 100 C 0 100 33 0 100 0",
    easeInOutCubic: "M 0 100 C 65 100 35 0 100 0",
    easeInBack: "M 0 100 C 36 100 66 -56 100 0",
    easeOutBack: "M 0 100 C 34 156 64 100 100 0",
    easeInOutBack: "M 0 100 C 68 -60 32 160 100 0",
    spring: "M 0 100 C 17 88 32 127 100 0",
  }

  return presets[easing] || presets.ease
}

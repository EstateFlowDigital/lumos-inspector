"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Gauge, AlertTriangle, AlertCircle, CheckCircle,
  Info, RefreshCw, Zap, Clock, Layers, Image as ImageIcon
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Progress } from "../ui/progress"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

type HintSeverity = "error" | "warning" | "info"

interface PerformanceHint {
  id: string
  element?: HTMLElement
  severity: HintSeverity
  category: string
  message: string
  impact: string
  suggestion: string
}

// Expensive CSS properties that may cause performance issues
const expensiveProperties = {
  "box-shadow": {
    check: (value: string) => {
      const shadows = value.split(/,(?![^(]*\))/g)
      return shadows.length > 2 || value.includes("inset")
    },
    message: "Multiple or inset box shadows",
    impact: "Can cause expensive repaints",
    suggestion: "Reduce shadow complexity or use pseudo-elements",
  },
  filter: {
    check: (value: string) => value !== "none",
    message: "CSS filter applied",
    impact: "Triggers layer creation and GPU usage",
    suggestion: "Consider using opacity or backdrop-filter sparingly",
  },
  "backdrop-filter": {
    check: (value: string) => value !== "none",
    message: "Backdrop filter applied",
    impact: "Very expensive, affects all content behind element",
    suggestion: "Limit backdrop-filter to small areas",
  },
  "mix-blend-mode": {
    check: (value: string) => value !== "normal",
    message: "Mix blend mode applied",
    impact: "Forces compositing and can affect render performance",
    suggestion: "Avoid on large or frequently updated elements",
  },
  "clip-path": {
    check: (value: string) => value !== "none" && !value.startsWith("inset"),
    message: "Complex clip-path",
    impact: "Complex paths require recalculation on changes",
    suggestion: "Use simpler paths or SVG masks for complex shapes",
  },
  transform: {
    check: (value: string) => value.includes("3d") || value.includes("perspective"),
    message: "3D transform detected",
    impact: "Creates compositing layer, uses GPU memory",
    suggestion: "Ensure will-change is set for animated elements",
  },
}

// Check for layout thrashing patterns
function checkLayoutThrashing(): PerformanceHint[] {
  const hints: PerformanceHint[] = []

  // Check for fixed/sticky elements in scroll containers
  const fixedElements = document.querySelectorAll("[style*='position: fixed'], [style*='position: sticky']")
  if (fixedElements.length > 10) {
    hints.push({
      id: "many-fixed",
      severity: "warning",
      category: "Layout",
      message: `${fixedElements.length} fixed/sticky elements detected`,
      impact: "Many fixed elements can slow scroll performance",
      suggestion: "Reduce fixed elements or use virtualization",
    })
  }

  return hints
}

// Check for animation issues
function checkAnimations(): PerformanceHint[] {
  const hints: PerformanceHint[] = []

  // Check for animations on expensive properties
  const animatedElements = document.querySelectorAll("[style*='animation'], [style*='transition']")
  animatedElements.forEach((el, index) => {
    const style = getComputedStyle(el)
    const transition = style.transition
    const animation = style.animation

    // Check if animating layout properties
    const layoutProps = ["width", "height", "top", "left", "margin", "padding"]
    if (layoutProps.some((prop) => transition.includes(prop) || animation.includes(prop))) {
      hints.push({
        id: `anim-layout-${index}`,
        element: el as HTMLElement,
        severity: "warning",
        category: "Animation",
        message: "Animating layout property",
        impact: "Layout animations cause reflows",
        suggestion: "Animate transform/opacity instead of layout properties",
      })
    }
  })

  return hints
}

// Check for image optimization issues
function checkImages(): PerformanceHint[] {
  const hints: PerformanceHint[] = []

  const images = document.querySelectorAll("img")
  images.forEach((img, index) => {
    // Check for missing dimensions
    if (!img.width && !img.height && !img.style.width && !img.style.height) {
      hints.push({
        id: `img-nodim-${index}`,
        element: img as HTMLElement,
        severity: "warning",
        category: "Images",
        message: "Image without explicit dimensions",
        impact: "Causes layout shift when image loads",
        suggestion: "Set width and height attributes on images",
      })
    }

    // Check for lazy loading
    if (!img.loading && !img.hasAttribute("loading")) {
      const rect = img.getBoundingClientRect()
      if (rect.top > window.innerHeight) {
        hints.push({
          id: `img-nolazy-${index}`,
          element: img as HTMLElement,
          severity: "info",
          category: "Images",
          message: "Below-fold image without lazy loading",
          impact: "Delays initial page load",
          suggestion: "Add loading='lazy' for below-fold images",
        })
      }
    }
  })

  return hints
}

// Check for expensive CSS
function checkExpensiveCSS(): PerformanceHint[] {
  const hints: PerformanceHint[] = []
  const elements = document.querySelectorAll("*:not([data-devtools] *)")

  elements.forEach((el, index) => {
    if (el.hasAttribute("data-devtools")) return

    const style = getComputedStyle(el)

    Object.entries(expensiveProperties).forEach(([prop, config]) => {
      const value = style.getPropertyValue(prop)
      if (value && config.check(value)) {
        hints.push({
          id: `css-${prop}-${index}`,
          element: el as HTMLElement,
          severity: "info",
          category: "CSS",
          message: config.message,
          impact: config.impact,
          suggestion: config.suggestion,
        })
      }
    })
  })

  return hints.slice(0, 20) // Limit to prevent overwhelming
}

// Check DOM size
function checkDOMSize(): PerformanceHint[] {
  const hints: PerformanceHint[] = []

  const allElements = document.querySelectorAll("*")
  const elementCount = allElements.length

  if (elementCount > 1500) {
    hints.push({
      id: "dom-size",
      severity: elementCount > 3000 ? "error" : "warning",
      category: "DOM",
      message: `Large DOM tree: ${elementCount} elements`,
      impact: "Large DOM increases memory and slows operations",
      suggestion: "Consider virtualization or lazy loading",
    })
  }

  // Check DOM depth
  let maxDepth = 0
  allElements.forEach((el) => {
    let depth = 0
    let parent = el.parentElement
    while (parent) {
      depth++
      parent = parent.parentElement
    }
    maxDepth = Math.max(maxDepth, depth)
  })

  if (maxDepth > 20) {
    hints.push({
      id: "dom-depth",
      severity: "warning",
      category: "DOM",
      message: `Deep DOM nesting: ${maxDepth} levels`,
      impact: "Deep nesting increases selector complexity",
      suggestion: "Flatten component hierarchy where possible",
    })
  }

  return hints
}

export function PerformanceHints() {
  const { isOpen, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [hints, setHints] = useState<PerformanceHint[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [lastScan, setLastScan] = useState<Date | null>(null)

  // Run performance scan
  const runScan = useCallback(() => {
    setIsScanning(true)

    setTimeout(() => {
      const allHints = [
        ...checkDOMSize(),
        ...checkExpensiveCSS(),
        ...checkLayoutThrashing(),
        ...checkAnimations(),
        ...checkImages(),
      ]

      setHints(allHints)
      setIsScanning(false)
      setLastScan(new Date())

      if (allHints.length === 0) {
        toast.success("No performance issues detected!")
      } else {
        const errors = allHints.filter((h) => h.severity === "error").length
        const warnings = allHints.filter((h) => h.severity === "warning").length
        toast.info(`Found ${errors} errors, ${warnings} warnings`)
      }
    }, 100)
  }, [])

  // Calculate score
  const score = useMemo(() => {
    if (hints.length === 0) return 100

    const errorWeight = 15
    const warningWeight = 5
    const infoWeight = 1

    const errors = hints.filter((h) => h.severity === "error").length
    const warnings = hints.filter((h) => h.severity === "warning").length
    const infos = hints.filter((h) => h.severity === "info").length

    const deduction = errors * errorWeight + warnings * warningWeight + infos * infoWeight
    return Math.max(0, Math.min(100, 100 - deduction))
  }, [hints])

  // Select hint element
  const selectHint = useCallback((hint: PerformanceHint) => {
    if (!hint.element) return

    hint.element.scrollIntoView({ behavior: "smooth", block: "center" })

    const computed = getComputedStyle(hint.element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: hint.element,
      tagName: hint.element.tagName.toLowerCase(),
      id: hint.element.id,
      classList: Array.from(hint.element.classList),
      rect: hint.element.getBoundingClientRect(),
      computedStyles,
    })
  }, [setSelectedElement])

  // Get severity icon
  const getSeverityIcon = (severity: HintSeverity) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-3 w-3 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />
      case "info":
        return <Info className="h-3 w-3 text-blue-500" />
    }
  }

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-chart-4" />
          <span>Performance</span>
          {hints.length > 0 && (
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] px-1 h-4",
                hints.some((h) => h.severity === "error") && "bg-red-500/10 text-red-500"
              )}
            >
              {hints.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Score and scan button */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Score</span>
              <span
                className={cn(
                  "font-medium",
                  score >= 80 && "text-green-500",
                  score >= 50 && score < 80 && "text-yellow-500",
                  score < 50 && "text-red-500"
                )}
              >
                {score}/100
              </span>
            </div>
            <Progress
              value={score}
              className={cn(
                "h-2",
                score >= 80 && "[&>div]:bg-green-500",
                score >= 50 && score < 80 && "[&>div]:bg-yellow-500",
                score < 50 && "[&>div]:bg-red-500"
              )}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={runScan}
            disabled={isScanning}
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", isScanning && "animate-spin")} />
            {isScanning ? "Scanning..." : "Scan"}
          </Button>
        </div>

        {lastScan && (
          <div className="text-[10px] text-muted-foreground">
            Last scan: {lastScan.toLocaleTimeString()}
          </div>
        )}

        {/* Hints list */}
        {hints.length > 0 && (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {hints.map((hint) => (
                <div
                  key={hint.id}
                  className={cn(
                    "p-2 rounded-md border-l-2 cursor-pointer hover:bg-muted/50",
                    hint.severity === "error" && "border-l-red-500 bg-red-500/5",
                    hint.severity === "warning" && "border-l-yellow-500 bg-yellow-500/5",
                    hint.severity === "info" && "border-l-blue-500 bg-blue-500/5"
                  )}
                  onClick={() => selectHint(hint)}
                >
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(hint.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium">{hint.message}</span>
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          {hint.category}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {hint.impact}
                      </div>
                      <div className="text-[10px] text-primary mt-1">
                        {hint.suggestion}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {hints.length === 0 && lastScan && (
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Great performance!</p>
            <p className="text-xs text-muted-foreground">No issues detected</p>
          </div>
        )}

        {!lastScan && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Click &quot;Scan&quot; to analyze page performance
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

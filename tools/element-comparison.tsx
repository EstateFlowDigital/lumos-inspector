"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, GitCompare, Plus, X, ArrowLeftRight, Copy, Check
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { useInspector } from "../core/inspector-context"

interface ComparisonElement {
  element: HTMLElement
  label: string
  styles: Record<string, string>
  rect: DOMRect
}

interface StyleDiff {
  property: string
  valueA: string | null
  valueB: string | null
  isDifferent: boolean
}

// Important CSS properties to compare
const importantProperties = [
  // Layout
  "display", "position", "width", "height", "min-width", "min-height",
  "max-width", "max-height", "margin", "padding", "box-sizing",
  // Flexbox
  "flex-direction", "flex-wrap", "justify-content", "align-items",
  "align-content", "gap", "flex", "flex-grow", "flex-shrink",
  // Grid
  "grid-template-columns", "grid-template-rows", "grid-gap",
  // Typography
  "font-family", "font-size", "font-weight", "line-height",
  "letter-spacing", "text-align", "color",
  // Background
  "background-color", "background-image", "background-size",
  // Border
  "border", "border-radius", "border-color", "border-width",
  // Effects
  "box-shadow", "opacity", "transform", "transition",
  // Positioning
  "top", "right", "bottom", "left", "z-index",
]

// Get element label
function getElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ""
  const classes = Array.from(el.classList).slice(0, 2).map(c => `.${c}`).join("")
  return `${tag}${id}${classes}`.substring(0, 30)
}

// Get computed styles for comparison
function getComparisonStyles(el: HTMLElement): Record<string, string> {
  const computed = getComputedStyle(el)
  const styles: Record<string, string> = {}

  importantProperties.forEach(prop => {
    styles[prop] = computed.getPropertyValue(prop)
  })

  return styles
}

export function ElementComparison() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [elementA, setElementA] = useState<ComparisonElement | null>(null)
  const [elementB, setElementB] = useState<ComparisonElement | null>(null)
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(true)
  const [showOverlay, setShowOverlay] = useState(false)

  // Set element A or B from selection
  const setFromSelection = useCallback((slot: "A" | "B") => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const compEl: ComparisonElement = {
      element: selectedElement.element,
      label: getElementLabel(selectedElement.element),
      styles: getComparisonStyles(selectedElement.element),
      rect: selectedElement.element.getBoundingClientRect(),
    }

    if (slot === "A") {
      setElementA(compEl)
      toast.success("Element A set")
    } else {
      setElementB(compEl)
      toast.success("Element B set")
    }
  }, [selectedElement])

  // Compute differences
  const differences = useMemo((): StyleDiff[] => {
    if (!elementA || !elementB) return []

    const diffs: StyleDiff[] = []
    const allProps = new Set([
      ...Object.keys(elementA.styles),
      ...Object.keys(elementB.styles),
    ])

    allProps.forEach(prop => {
      const valueA = elementA.styles[prop] || null
      const valueB = elementB.styles[prop] || null
      const isDifferent = valueA !== valueB

      diffs.push({ property: prop, valueA, valueB, isDifferent })
    })

    return diffs.sort((a, b) => {
      // Sort differences first
      if (a.isDifferent && !b.isDifferent) return -1
      if (!a.isDifferent && b.isDifferent) return 1
      return a.property.localeCompare(b.property)
    })
  }, [elementA, elementB])

  // Filtered differences
  const filteredDiffs = useMemo(() => {
    if (showOnlyDifferences) {
      return differences.filter(d => d.isDifferent)
    }
    return differences
  }, [differences, showOnlyDifferences])

  // Stats
  const stats = useMemo(() => {
    const total = differences.length
    const different = differences.filter(d => d.isDifferent).length
    const same = total - different
    return { total, different, same }
  }, [differences])

  // Copy differences
  const copyDifferences = useCallback(() => {
    const diffText = filteredDiffs
      .map(d => `${d.property}: ${d.valueA || "none"} → ${d.valueB || "none"}`)
      .join("\n")

    navigator.clipboard.writeText(diffText)
    toast.success("Differences copied to clipboard")
  }, [filteredDiffs])

  // Swap elements
  const swapElements = useCallback(() => {
    const temp = elementA
    setElementA(elementB)
    setElementB(temp)
    toast.success("Elements swapped")
  }, [elementA, elementB])

  if (!isOpen) return null

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-chart-1" />
            <span>Element Comparison</span>
            {stats.different > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1 h-4">
                {stats.different} diff
              </Badge>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pt-2">
          {/* Element slots */}
          <div className="grid grid-cols-2 gap-2">
            {/* Element A */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Element A</Label>
              <div className="flex gap-1">
                {elementA ? (
                  <div className="flex-1 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs truncate">
                    {elementA.label}
                  </div>
                ) : (
                  <div className="flex-1 p-2 bg-muted/50 rounded text-xs text-muted-foreground text-center">
                    Not set
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setFromSelection("A")}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                {elementA && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setElementA(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Element B */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Element B</Label>
              <div className="flex gap-1">
                {elementB ? (
                  <div className="flex-1 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs truncate">
                    {elementB.label}
                  </div>
                ) : (
                  <div className="flex-1 p-2 bg-muted/50 rounded text-xs text-muted-foreground text-center">
                    Not set
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setFromSelection("B")}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                {elementB && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setElementB(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {elementA && elementB && (
            <>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7"
                  onClick={swapElements}
                >
                  <ArrowLeftRight className="h-3 w-3 mr-1" />
                  Swap
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7"
                  onClick={copyDifferences}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showOnlyDifferences}
                    onCheckedChange={setShowOnlyDifferences}
                    id="only-diff"
                  />
                  <Label htmlFor="only-diff" className="text-xs">Only differences</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showOverlay}
                    onCheckedChange={setShowOverlay}
                    id="compare-overlay"
                  />
                  <Label htmlFor="compare-overlay" className="text-[10px]">Overlay</Label>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-2 text-[10px]">
                <Badge variant="secondary" className="px-1">
                  {stats.total} properties
                </Badge>
                <Badge variant="destructive" className="px-1">
                  {stats.different} different
                </Badge>
                <Badge className="px-1 bg-green-500">
                  {stats.same} same
                </Badge>
              </div>

              {/* Size comparison */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 bg-blue-500/10 rounded">
                  <div className="text-muted-foreground mb-1">Element A Size</div>
                  <div className="font-mono">
                    {Math.round(elementA.rect.width)} × {Math.round(elementA.rect.height)}
                  </div>
                </div>
                <div className="p-2 bg-green-500/10 rounded">
                  <div className="text-muted-foreground mb-1">Element B Size</div>
                  <div className="font-mono">
                    {Math.round(elementB.rect.width)} × {Math.round(elementB.rect.height)}
                  </div>
                </div>
              </div>

              {/* Differences list */}
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {filteredDiffs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      {showOnlyDifferences ? "No differences found!" : "No properties to compare"}
                    </div>
                  ) : (
                    filteredDiffs.map((diff) => (
                      <div
                        key={diff.property}
                        className={cn(
                          "p-2 rounded-md text-[10px]",
                          diff.isDifferent ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-muted/30"
                        )}
                      >
                        <div className="font-medium text-xs mb-1">{diff.property}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="font-mono truncate text-blue-600 dark:text-blue-400" title={diff.valueA || ""}>
                            A: {diff.valueA || "—"}
                          </div>
                          <div className="font-mono truncate text-green-600 dark:text-green-400" title={diff.valueB || ""}>
                            B: {diff.valueB || "—"}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Instructions */}
          {(!elementA || !elementB) && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              Select an element, then click + to set Element A or B
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Overlay */}
      {showOverlay && elementA && elementB && (
        <div className="fixed inset-0 pointer-events-none z-9990" data-devtools>
          {/* Element A outline */}
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/10"
            style={{
              left: elementA.rect.left,
              top: elementA.rect.top,
              width: elementA.rect.width,
              height: elementA.rect.height,
            }}
          >
            <span className="absolute -top-5 left-0 text-[10px] font-mono px-1 bg-blue-500 text-white rounded">
              A
            </span>
          </div>
          {/* Element B outline */}
          <div
            className="absolute border-2 border-green-500 bg-green-500/10"
            style={{
              left: elementB.rect.left,
              top: elementB.rect.top,
              width: elementB.rect.width,
              height: elementB.rect.height,
            }}
          >
            <span className="absolute -top-5 left-0 text-[10px] font-mono px-1 bg-green-500 text-white rounded">
              B
            </span>
          </div>
        </div>
      )}
    </>
  )
}

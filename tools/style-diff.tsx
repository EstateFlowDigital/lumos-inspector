"use client"

import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import {
  ChevronDown, Diff, Plus, Minus, Equal, RotateCcw, Copy, Download,
  Check, Filter
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { useInspector } from "../core/inspector-context"

// Type for style change
interface StyleChange {
  property: string
  originalValue: string
  currentValue: string
  type: "added" | "removed" | "modified" | "unchanged"
}

// Common CSS properties to track
const trackedProperties = [
  // Layout
  "display", "position", "top", "right", "bottom", "left", "z-index",
  "flex", "flex-direction", "flex-wrap", "justify-content", "align-items", "align-content",
  "grid-template-columns", "grid-template-rows", "gap", "grid-gap",
  // Box Model
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border", "border-width", "border-style", "border-color", "border-radius",
  // Typography
  "font-family", "font-size", "font-weight", "font-style", "line-height",
  "letter-spacing", "text-align", "text-decoration", "text-transform", "color",
  // Visual
  "background", "background-color", "background-image", "background-size", "background-position",
  "box-shadow", "opacity", "visibility", "overflow", "cursor",
  // Transform & Animation
  "transform", "transition", "animation",
]

// Get browser default value for a property
function getDefaultValue(element: HTMLElement, property: string): string {
  // Create a temporary element of the same type
  const temp = document.createElement(element.tagName)
  temp.style.cssText = ""
  document.body.appendChild(temp)
  const defaultValue = getComputedStyle(temp).getPropertyValue(property)
  document.body.removeChild(temp)
  return defaultValue
}

export function StyleDiff() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [originalStyles, setOriginalStyles] = useState<Record<string, string>>({})
  const [showFilter, setShowFilter] = useState<"all" | "modified" | "added">("modified")
  const [capturedAt, setCapturedAt] = useState<Date | null>(null)

  // Capture original styles when element is selected
  useEffect(() => {
    if (selectedElement?.element) {
      const computed = getComputedStyle(selectedElement.element)
      const styles: Record<string, string> = {}

      trackedProperties.forEach((prop) => {
        styles[prop] = computed.getPropertyValue(prop)
      })

      setOriginalStyles(styles)
      setCapturedAt(new Date())
    }
  }, [selectedElement?.element])

  // Compute style changes
  const changes = useMemo((): StyleChange[] => {
    if (!selectedElement?.element) return []

    const computed = getComputedStyle(selectedElement.element)
    const result: StyleChange[] = []

    trackedProperties.forEach((prop) => {
      const originalValue = originalStyles[prop] || ""
      const currentValue = computed.getPropertyValue(prop)
      const defaultValue = getDefaultValue(selectedElement.element, prop)

      let type: StyleChange["type"] = "unchanged"

      if (originalValue !== currentValue) {
        type = "modified"
      } else if (currentValue !== defaultValue) {
        type = "added" // Custom style that differs from default
      }

      result.push({
        property: prop,
        originalValue,
        currentValue,
        type,
      })
    })

    return result
  }, [selectedElement, originalStyles])

  // Filtered changes
  const filteredChanges = useMemo(() => {
    switch (showFilter) {
      case "all":
        return changes
      case "modified":
        return changes.filter((c) => c.type === "modified")
      case "added":
        return changes.filter((c) => c.type === "added" || c.type === "modified")
      default:
        return changes
    }
  }, [changes, showFilter])

  // Statistics
  const stats = useMemo(() => {
    return {
      modified: changes.filter((c) => c.type === "modified").length,
      added: changes.filter((c) => c.type === "added").length,
      unchanged: changes.filter((c) => c.type === "unchanged").length,
    }
  }, [changes])

  // Reset to original styles
  const resetStyles = useCallback(() => {
    if (!selectedElement?.element) return

    Object.entries(originalStyles).forEach(([prop, value]) => {
      selectedElement.element.style.setProperty(prop, value)
    })

    notifyStyleChange()
    toast.success("Styles reset to original")
  }, [selectedElement, originalStyles, notifyStyleChange])

  // Copy diff as CSS
  const copyDiff = useCallback(() => {
    const modifiedChanges = changes.filter((c) => c.type === "modified" || c.type === "added")

    if (modifiedChanges.length === 0) {
      toast.info("No changes to copy")
      return
    }

    const css = modifiedChanges
      .map((c) => `${c.property}: ${c.currentValue};`)
      .join("\n")

    navigator.clipboard.writeText(css)
    toast.success("Copied CSS changes to clipboard")
  }, [changes])

  // Export diff as JSON
  const exportDiff = useCallback(() => {
    const modifiedChanges = changes.filter((c) => c.type === "modified" || c.type === "added")

    const exportData = {
      element: selectedElement?.tagName,
      capturedAt: capturedAt?.toISOString(),
      changes: modifiedChanges.map((c) => ({
        property: c.property,
        from: c.originalValue,
        to: c.currentValue,
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `style-diff-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast.success("Diff exported")
  }, [changes, selectedElement, capturedAt])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Diff className="h-4 w-4 text-chart-2" />
          <span>Style Diff</span>
          {stats.modified > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4 bg-yellow-500/10 text-yellow-500">
              {stats.modified} changed
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {!selectedElement ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Select an element to view style changes
          </div>
        ) : (
          <>
            {/* Info and Actions */}
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-muted-foreground">
                {capturedAt && `Captured at ${capturedAt.toLocaleTimeString()}`}
              </div>
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={resetStyles}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset to original</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={copyDiff}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy CSS</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={exportDiff}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export JSON</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              <div
                className={cn(
                  "flex items-center gap-1 p-2 rounded cursor-pointer",
                  showFilter === "modified" ? "bg-yellow-500/20" : "bg-yellow-500/10",
                  "hover:bg-yellow-500/20"
                )}
                onClick={() => setShowFilter("modified")}
              >
                <Minus className="h-3 w-3 text-yellow-500" />
                <span className="text-xs font-medium">{stats.modified}</span>
                <span className="text-[10px] text-muted-foreground">Modified</span>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 p-2 rounded cursor-pointer",
                  showFilter === "added" ? "bg-green-500/20" : "bg-green-500/10",
                  "hover:bg-green-500/20"
                )}
                onClick={() => setShowFilter("added")}
              >
                <Plus className="h-3 w-3 text-green-500" />
                <span className="text-xs font-medium">{stats.added}</span>
                <span className="text-[10px] text-muted-foreground">Custom</span>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 p-2 rounded cursor-pointer",
                  showFilter === "all" ? "bg-muted" : "bg-muted/50",
                  "hover:bg-muted"
                )}
                onClick={() => setShowFilter("all")}
              >
                <Equal className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">{stats.unchanged}</span>
                <span className="text-[10px] text-muted-foreground">Same</span>
              </div>
            </div>

            {/* Changes list */}
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {filteredChanges.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    {showFilter === "modified"
                      ? "No style modifications detected"
                      : "No changes to display"}
                  </div>
                ) : (
                  filteredChanges.map((change) => (
                    <div
                      key={change.property}
                      className={cn(
                        "p-2 rounded-md border-l-2",
                        change.type === "modified" && "border-l-yellow-500 bg-yellow-500/5",
                        change.type === "added" && "border-l-green-500 bg-green-500/5",
                        change.type === "unchanged" && "border-l-transparent"
                      )}
                    >
                      <div className="text-xs font-mono font-medium">{change.property}</div>
                      <div className="flex items-start gap-2 mt-1">
                        {change.type === "modified" && (
                          <>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-red-400 font-mono truncate line-through">
                                {change.originalValue || "(none)"}
                              </div>
                              <div className="text-[10px] text-green-400 font-mono truncate">
                                {change.currentValue || "(none)"}
                              </div>
                            </div>
                          </>
                        )}
                        {change.type === "added" && (
                          <div className="text-[10px] text-muted-foreground font-mono truncate">
                            {change.currentValue}
                          </div>
                        )}
                        {change.type === "unchanged" && (
                          <div className="text-[10px] text-muted-foreground font-mono truncate">
                            {change.currentValue}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  ChevronDown, Eye, Copy, RotateCcw, Zap, AlertTriangle
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

// Content visibility options
const contentVisibilityOptions = [
  { value: "visible", label: "Visible", description: "Default - content always rendered" },
  { value: "auto", label: "Auto", description: "Browser optimizes rendering" },
  { value: "hidden", label: "Hidden", description: "Content not rendered, skips layout" },
]

// Contain options
const containOptions = [
  { value: "none", label: "None", description: "No containment" },
  { value: "layout", label: "Layout", description: "Internal layout independent" },
  { value: "paint", label: "Paint", description: "No painting outside box" },
  { value: "size", label: "Size", description: "Size independent of children" },
  { value: "style", label: "Style", description: "Styles don't escape" },
  { value: "content", label: "Content", description: "layout + paint" },
  { value: "strict", label: "Strict", description: "size + layout + paint" },
]

export function ContentVisibilityTool() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [contentVisibility, setContentVisibility] = useState("visible")
  const [containIntrinsicWidth, setContainIntrinsicWidth] = useState("")
  const [containIntrinsicHeight, setContainIntrinsicHeight] = useState("")
  const [contain, setContain] = useState("none")

  // Load current values
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)
    setContentVisibility(computed.contentVisibility || "visible")
    setContain(computed.contain || "none")

    // Parse intrinsic size
    const intrinsicBlock = computed.getPropertyValue("contain-intrinsic-block-size")
    const intrinsicInline = computed.getPropertyValue("contain-intrinsic-inline-size")
    if (intrinsicBlock && intrinsicBlock !== "none") {
      setContainIntrinsicHeight(intrinsicBlock)
    }
    if (intrinsicInline && intrinsicInline !== "none") {
      setContainIntrinsicWidth(intrinsicInline)
    }
  }, [selectedElement])

  // Apply to element
  const apply = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element
    el.style.contentVisibility = contentVisibility

    if (containIntrinsicWidth) {
      el.style.setProperty("contain-intrinsic-width", containIntrinsicWidth)
    }
    if (containIntrinsicHeight) {
      el.style.setProperty("contain-intrinsic-height", containIntrinsicHeight)
    }

    el.style.contain = contain

    toast.success("Content visibility applied!")
  }, [selectedElement, contentVisibility, containIntrinsicWidth, containIntrinsicHeight, contain])

  // Reset
  const reset = useCallback(() => {
    if (!selectedElement?.element) return

    const el = selectedElement.element
    el.style.contentVisibility = ""
    el.style.setProperty("contain-intrinsic-width", "")
    el.style.setProperty("contain-intrinsic-height", "")
    el.style.contain = ""

    setContentVisibility("visible")
    setContainIntrinsicWidth("")
    setContainIntrinsicHeight("")
    setContain("none")

    toast.success("Content visibility reset")
  }, [selectedElement])

  // Copy CSS
  const copyCSS = useCallback(() => {
    let css = ""

    if (contentVisibility !== "visible") {
      css += `content-visibility: ${contentVisibility};\n`
    }
    if (containIntrinsicWidth || containIntrinsicHeight) {
      css += `contain-intrinsic-size: ${containIntrinsicWidth || "auto"} ${containIntrinsicHeight || "auto"};\n`
    }
    if (contain !== "none") {
      css += `contain: ${contain};\n`
    }

    if (!css) css = "/* Default values */"

    navigator.clipboard.writeText(css)
    toast.success("CSS copied to clipboard")
  }, [contentVisibility, containIntrinsicWidth, containIntrinsicHeight, contain])

  // Preset for lazy loading
  const applyLazyPreset = useCallback(() => {
    setContentVisibility("auto")
    setContainIntrinsicHeight("500px")
    setContainIntrinsicWidth("100%")
  }, [])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-green-500" />
          <span>Content Visibility</span>
          <Badge variant="outline" className="text-[9px] h-4 px-1">
            <Zap className="h-2 w-2 mr-0.5" />
            Perf
          </Badge>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Info */}
        <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-[10px]">
          <div className="flex items-center gap-1 font-medium mb-1">
            <Zap className="h-3 w-3" />
            Performance Optimization
          </div>
          <p className="text-muted-foreground">
            Use content-visibility: auto to skip rendering off-screen content.
          </p>
        </div>

        {/* Lazy loading preset */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7"
          onClick={applyLazyPreset}
        >
          Apply Lazy Loading Preset
        </Button>

        {/* Content Visibility */}
        <div className="space-y-1">
          <Label className="text-[10px]">Content Visibility</Label>
          <Select value={contentVisibility} onValueChange={setContentVisibility}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {contentVisibilityOptions.map(cv => (
                <SelectItem key={cv.value} value={cv.value} className="text-xs">
                  {cv.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] text-muted-foreground">
            {contentVisibilityOptions.find(cv => cv.value === contentVisibility)?.description}
          </p>
        </div>

        {/* Contain Intrinsic Size */}
        {contentVisibility === "auto" && (
          <div className="space-y-2">
            <Label className="text-[10px]">Contain Intrinsic Size</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  value={containIntrinsicWidth}
                  onChange={(e) => setContainIntrinsicWidth(e.target.value)}
                  className="h-7 text-xs font-mono"
                  placeholder="Width (e.g. 100%)"
                />
              </div>
              <div>
                <Input
                  value={containIntrinsicHeight}
                  onChange={(e) => setContainIntrinsicHeight(e.target.value)}
                  className="h-7 text-xs font-mono"
                  placeholder="Height (e.g. 500px)"
                />
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Set estimated size to prevent layout shifts
            </p>
          </div>
        )}

        {/* Contain */}
        <div className="space-y-1">
          <Label className="text-[10px]">Contain</Label>
          <Select value={contain} onValueChange={setContain}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {containOptions.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-xs">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] text-muted-foreground">
            {containOptions.find(c => c.value === contain)?.description}
          </p>
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

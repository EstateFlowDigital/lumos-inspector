"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  ChevronDown, Move, Copy, RotateCcw, Crosshair, Target
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

type PositionType = "static" | "relative" | "absolute" | "fixed" | "sticky"

interface PositionValues {
  position: PositionType
  top: string
  right: string
  bottom: string
  left: string
  inset: string
  zIndex: string
}

// Position type descriptions
const positionDescriptions: Record<PositionType, string> = {
  static: "Default flow position",
  relative: "Offset from normal position",
  absolute: "Positioned relative to nearest positioned ancestor",
  fixed: "Positioned relative to viewport",
  sticky: "Toggles between relative and fixed based on scroll",
}

export function PositionHelper() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [values, setValues] = useState<PositionValues>({
    position: "static",
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto",
    inset: "",
    zIndex: "auto",
  })
  const [useInset, setUseInset] = useState(false)
  const [showGuides, setShowGuides] = useState(false)

  // Load current values from element
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)
    setValues({
      position: computed.position as PositionType,
      top: computed.top,
      right: computed.right,
      bottom: computed.bottom,
      left: computed.left,
      inset: "",
      zIndex: computed.zIndex,
    })
  }, [selectedElement])

  // Update value
  const updateValue = useCallback((key: keyof PositionValues, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }, [])

  // Apply to element
  const apply = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element

    el.style.position = values.position

    if (useInset && values.inset) {
      el.style.inset = values.inset
    } else {
      el.style.inset = ""
      el.style.top = values.top !== "auto" ? values.top : ""
      el.style.right = values.right !== "auto" ? values.right : ""
      el.style.bottom = values.bottom !== "auto" ? values.bottom : ""
      el.style.left = values.left !== "auto" ? values.left : ""
    }

    if (values.zIndex !== "auto") {
      el.style.zIndex = values.zIndex
    }

    notifyStyleChange()
    toast.success("Position applied!")
  }, [selectedElement, values, useInset, notifyStyleChange])

  // Reset
  const reset = useCallback(() => {
    if (!selectedElement?.element) return

    const el = selectedElement.element
    el.style.position = ""
    el.style.top = ""
    el.style.right = ""
    el.style.bottom = ""
    el.style.left = ""
    el.style.inset = ""
    el.style.zIndex = ""

    setValues({
      position: "static",
      top: "auto",
      right: "auto",
      bottom: "auto",
      left: "auto",
      inset: "",
      zIndex: "auto",
    })

    notifyStyleChange()
    toast.success("Position reset")
  }, [selectedElement, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    let css = `position: ${values.position};\n`

    if (useInset && values.inset) {
      css += `inset: ${values.inset};\n`
    } else {
      if (values.top !== "auto") css += `top: ${values.top};\n`
      if (values.right !== "auto") css += `right: ${values.right};\n`
      if (values.bottom !== "auto") css += `bottom: ${values.bottom};\n`
      if (values.left !== "auto") css += `left: ${values.left};\n`
    }

    if (values.zIndex !== "auto") css += `z-index: ${values.zIndex};\n`

    navigator.clipboard.writeText(css)
    toast.success("CSS copied to clipboard")
  }, [values, useInset])

  // Quick position presets
  const applyPreset = useCallback((preset: string) => {
    switch (preset) {
      case "center":
        setValues(prev => ({
          ...prev,
          position: "absolute",
          top: "50%",
          left: "50%",
        }))
        if (selectedElement?.element) {
          selectedElement.element.style.transform = "translate(-50%, -50%)"
          notifyStyleChange()
        }
        break
      case "fill":
        setValues(prev => ({
          ...prev,
          position: "absolute",
        }))
        setUseInset(true)
        updateValue("inset", "0")
        break
      case "top-right":
        setValues(prev => ({
          ...prev,
          position: "absolute",
          top: "0",
          right: "0",
          bottom: "auto",
          left: "auto",
        }))
        break
      case "bottom-left":
        setValues(prev => ({
          ...prev,
          position: "absolute",
          top: "auto",
          right: "auto",
          bottom: "0",
          left: "0",
        }))
        break
      case "sticky-top":
        setValues(prev => ({
          ...prev,
          position: "sticky",
          top: "0",
        }))
        break
    }
  }, [selectedElement, updateValue])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Move className="h-4 w-4 text-orange-500" />
          <span>Position Helper</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Position type */}
        <div className="space-y-1">
          <Label className="text-[10px]">Position Type</Label>
          <Select
            value={values.position}
            onValueChange={(v) => updateValue("position", v)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["static", "relative", "absolute", "fixed", "sticky"] as PositionType[]).map(pos => (
                <SelectItem key={pos} value={pos} className="text-xs">
                  {pos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] text-muted-foreground">
            {positionDescriptions[values.position]}
          </p>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-1">
          <Badge
            variant="outline"
            className="text-[9px] h-5 px-2 cursor-pointer hover:bg-muted"
            onClick={() => applyPreset("center")}
          >
            <Crosshair className="h-3 w-3 mr-1" />
            Center
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] h-5 px-2 cursor-pointer hover:bg-muted"
            onClick={() => applyPreset("fill")}
          >
            Fill
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] h-5 px-2 cursor-pointer hover:bg-muted"
            onClick={() => applyPreset("top-right")}
          >
            Top Right
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] h-5 px-2 cursor-pointer hover:bg-muted"
            onClick={() => applyPreset("sticky-top")}
          >
            Sticky Top
          </Badge>
        </div>

        {/* Use inset toggle */}
        {values.position !== "static" && (
          <div className="flex items-center justify-between">
            <Label className="text-xs">Use inset shorthand</Label>
            <Switch checked={useInset} onCheckedChange={setUseInset} />
          </div>
        )}

        {/* Position values */}
        {values.position !== "static" && (
          <>
            {useInset ? (
              <div className="space-y-1">
                <Label className="text-[10px]">Inset</Label>
                <Input
                  value={values.inset}
                  onChange={(e) => updateValue("inset", e.target.value)}
                  className="h-7 text-xs font-mono"
                  placeholder="0 or 10px 20px"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Top</Label>
                  <Input
                    value={values.top}
                    onChange={(e) => updateValue("top", e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="auto"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Right</Label>
                  <Input
                    value={values.right}
                    onChange={(e) => updateValue("right", e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="auto"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Bottom</Label>
                  <Input
                    value={values.bottom}
                    onChange={(e) => updateValue("bottom", e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="auto"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Left</Label>
                  <Input
                    value={values.left}
                    onChange={(e) => updateValue("left", e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="auto"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Z-index */}
        <div className="space-y-1">
          <Label className="text-[10px]">Z-Index</Label>
          <Input
            value={values.zIndex}
            onChange={(e) => updateValue("zIndex", e.target.value)}
            className="h-7 text-xs font-mono"
            placeholder="auto"
          />
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

        {/* Reference */}
        <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
          <div className="font-medium mb-1">Units:</div>
          <div className="grid grid-cols-2 gap-1">
            <span>px, rem, em</span>
            <span>%, vh, vw</span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

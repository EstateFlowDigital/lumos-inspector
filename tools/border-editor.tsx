"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Square, Link2, Unlink, Copy, RotateCcw
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Switch } from "../ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

type Side = "top" | "right" | "bottom" | "left"
type Corner = "topLeft" | "topRight" | "bottomRight" | "bottomLeft"

interface BorderSide {
  width: number
  style: string
  color: string
}

interface BorderRadius {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

const borderStyles = [
  "none", "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"
]

export function BorderEditor() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [linkedSides, setLinkedSides] = useState(true)
  const [linkedCorners, setLinkedCorners] = useState(true)

  const [borders, setBorders] = useState<Record<Side, BorderSide>>({
    top: { width: 1, style: "solid", color: "#000000" },
    right: { width: 1, style: "solid", color: "#000000" },
    bottom: { width: 1, style: "solid", color: "#000000" },
    left: { width: 1, style: "solid", color: "#000000" },
  })

  const [radius, setRadius] = useState<BorderRadius>({
    topLeft: 0,
    topRight: 0,
    bottomRight: 0,
    bottomLeft: 0,
  })

  // Load from selected element
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)

    setBorders({
      top: {
        width: parseFloat(computed.borderTopWidth) || 0,
        style: computed.borderTopStyle || "none",
        color: computed.borderTopColor || "#000000",
      },
      right: {
        width: parseFloat(computed.borderRightWidth) || 0,
        style: computed.borderRightStyle || "none",
        color: computed.borderRightColor || "#000000",
      },
      bottom: {
        width: parseFloat(computed.borderBottomWidth) || 0,
        style: computed.borderBottomStyle || "none",
        color: computed.borderBottomColor || "#000000",
      },
      left: {
        width: parseFloat(computed.borderLeftWidth) || 0,
        style: computed.borderLeftStyle || "none",
        color: computed.borderLeftColor || "#000000",
      },
    })

    setRadius({
      topLeft: parseFloat(computed.borderTopLeftRadius) || 0,
      topRight: parseFloat(computed.borderTopRightRadius) || 0,
      bottomRight: parseFloat(computed.borderBottomRightRadius) || 0,
      bottomLeft: parseFloat(computed.borderBottomLeftRadius) || 0,
    })
  }, [selectedElement])

  // Update border side
  const updateBorderSide = useCallback((side: Side, updates: Partial<BorderSide>) => {
    setBorders(prev => {
      if (linkedSides) {
        const newBorder = { ...prev[side], ...updates }
        return {
          top: newBorder,
          right: newBorder,
          bottom: newBorder,
          left: newBorder,
        }
      }
      return {
        ...prev,
        [side]: { ...prev[side], ...updates },
      }
    })
  }, [linkedSides])

  // Update radius corner
  const updateRadiusCorner = useCallback((corner: Corner, value: number) => {
    setRadius(prev => {
      if (linkedCorners) {
        return {
          topLeft: value,
          topRight: value,
          bottomRight: value,
          bottomLeft: value,
        }
      }
      return { ...prev, [corner]: value }
    })
  }, [linkedCorners])

  // Build CSS
  const borderCSS = useMemo(() => {
    const lines: string[] = []

    // Check if all sides are the same
    const allSame = linkedSides ||
      (borders.top.width === borders.right.width &&
        borders.top.width === borders.bottom.width &&
        borders.top.width === borders.left.width &&
        borders.top.style === borders.right.style &&
        borders.top.style === borders.bottom.style &&
        borders.top.style === borders.left.style &&
        borders.top.color === borders.right.color &&
        borders.top.color === borders.bottom.color &&
        borders.top.color === borders.left.color)

    if (allSame) {
      lines.push(`border: ${borders.top.width}px ${borders.top.style} ${borders.top.color};`)
    } else {
      lines.push(`border-top: ${borders.top.width}px ${borders.top.style} ${borders.top.color};`)
      lines.push(`border-right: ${borders.right.width}px ${borders.right.style} ${borders.right.color};`)
      lines.push(`border-bottom: ${borders.bottom.width}px ${borders.bottom.style} ${borders.bottom.color};`)
      lines.push(`border-left: ${borders.left.width}px ${borders.left.style} ${borders.left.color};`)
    }

    // Border radius
    const allCornersEqual =
      radius.topLeft === radius.topRight &&
      radius.topLeft === radius.bottomRight &&
      radius.topLeft === radius.bottomLeft

    if (allCornersEqual && radius.topLeft > 0) {
      lines.push(`border-radius: ${radius.topLeft}px;`)
    } else if (radius.topLeft > 0 || radius.topRight > 0 || radius.bottomRight > 0 || radius.bottomLeft > 0) {
      lines.push(`border-radius: ${radius.topLeft}px ${radius.topRight}px ${radius.bottomRight}px ${radius.bottomLeft}px;`)
    }

    return lines.join("\n")
  }, [borders, radius, linkedSides])

  // Apply to element
  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element

    el.style.borderTop = `${borders.top.width}px ${borders.top.style} ${borders.top.color}`
    el.style.borderRight = `${borders.right.width}px ${borders.right.style} ${borders.right.color}`
    el.style.borderBottom = `${borders.bottom.width}px ${borders.bottom.style} ${borders.bottom.color}`
    el.style.borderLeft = `${borders.left.width}px ${borders.left.style} ${borders.left.color}`
    el.style.borderRadius = `${radius.topLeft}px ${radius.topRight}px ${radius.bottomRight}px ${radius.bottomLeft}px`

    notifyStyleChange()
    toast.success("Border applied")
  }, [selectedElement, borders, radius, notifyStyleChange])

  // Reset
  const reset = useCallback(() => {
    const defaultBorder = { width: 0, style: "none", color: "#000000" }
    setBorders({
      top: defaultBorder,
      right: defaultBorder,
      bottom: defaultBorder,
      left: defaultBorder,
    })
    setRadius({ topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 })

    if (selectedElement?.element) {
      selectedElement.element.style.border = "none"
      selectedElement.element.style.borderRadius = "0"
      notifyStyleChange()
    }
    toast.success("Border reset")
  }, [selectedElement, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(borderCSS)
    toast.success("CSS copied to clipboard")
  }, [borderCSS])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Square className="h-4 w-4 text-chart-5" />
          <span>Border Editor</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Preview */}
        <div className="flex items-center justify-center p-4 bg-muted/50 rounded-md">
          <div
            className="w-20 h-20 bg-card flex items-center justify-center text-[10px] text-muted-foreground"
            style={{
              borderTop: `${borders.top.width}px ${borders.top.style} ${borders.top.color}`,
              borderRight: `${borders.right.width}px ${borders.right.style} ${borders.right.color}`,
              borderBottom: `${borders.bottom.width}px ${borders.bottom.style} ${borders.bottom.color}`,
              borderLeft: `${borders.left.width}px ${borders.left.style} ${borders.left.color}`,
              borderRadius: `${radius.topLeft}px ${radius.topRight}px ${radius.bottomRight}px ${radius.bottomLeft}px`,
            }}
          >
            Preview
          </div>
        </div>

        <Tabs defaultValue="border" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="border" className="text-[10px]">Border</TabsTrigger>
            <TabsTrigger value="radius" className="text-[10px]">Radius</TabsTrigger>
          </TabsList>

          {/* Border controls */}
          <TabsContent value="border" className="space-y-3 mt-3">
            {/* Link toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Link all sides</Label>
              <Button
                variant={linkedSides ? "default" : "outline"}
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setLinkedSides(!linkedSides)}
              >
                {linkedSides ? <Link2 className="h-3 w-3" /> : <Unlink className="h-3 w-3" />}
              </Button>
            </div>

            {/* Border controls for each side */}
            {(linkedSides ? ["top" as Side] : (["top", "right", "bottom", "left"] as Side[])).map((side) => (
              <div key={side} className="space-y-2 p-2 bg-muted/30 rounded">
                {!linkedSides && (
                  <Label className="text-[10px] capitalize font-medium">{side}</Label>
                )}

                {/* Width */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">Width</span>
                    <span className="text-[9px] font-mono">{borders[side].width}px</span>
                  </div>
                  <Slider
                    value={[borders[side].width]}
                    onValueChange={([v]) => updateBorderSide(side, { width: v })}
                    min={0}
                    max={20}
                    step={1}
                  />
                </div>

                {/* Style */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-muted-foreground w-10">Style</span>
                  <Select
                    value={borders[side].style}
                    onValueChange={(v) => updateBorderSide(side, { style: v })}
                  >
                    <SelectTrigger className="h-6 text-[10px] flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {borderStyles.map((style) => (
                        <SelectItem key={style} value={style} className="text-[10px]">
                          {style}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Color */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-muted-foreground w-10">Color</span>
                  <input
                    type="color"
                    value={borders[side].color.startsWith("#") ? borders[side].color : "#000000"}
                    onChange={(e) => updateBorderSide(side, { color: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer"
                  />
                  <Input
                    value={borders[side].color}
                    onChange={(e) => updateBorderSide(side, { color: e.target.value })}
                    className="flex-1 h-6 text-[10px] font-mono"
                  />
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Radius controls */}
          <TabsContent value="radius" className="space-y-3 mt-3">
            {/* Link toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Link all corners</Label>
              <Button
                variant={linkedCorners ? "default" : "outline"}
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setLinkedCorners(!linkedCorners)}
              >
                {linkedCorners ? <Link2 className="h-3 w-3" /> : <Unlink className="h-3 w-3" />}
              </Button>
            </div>

            {/* Corner controls */}
            {(linkedCorners
              ? [{ key: "topLeft" as Corner, label: "All Corners" }]
              : [
                  { key: "topLeft" as Corner, label: "Top Left" },
                  { key: "topRight" as Corner, label: "Top Right" },
                  { key: "bottomRight" as Corner, label: "Bottom Right" },
                  { key: "bottomLeft" as Corner, label: "Bottom Left" },
                ]
            ).map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px]">{label}</span>
                  <span className="text-[10px] font-mono">{radius[key]}px</span>
                </div>
                <Slider
                  value={[radius[key]]}
                  onValueChange={([v]) => updateRadiusCorner(key, v)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            ))}

            {/* Quick presets */}
            <div className="flex gap-1 flex-wrap">
              {[0, 4, 8, 12, 16, 24, 9999].map((val) => (
                <Button
                  key={val}
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => {
                    setRadius({
                      topLeft: val,
                      topRight: val,
                      bottomRight: val,
                      bottomLeft: val,
                    })
                  }}
                >
                  {val === 9999 ? "Full" : `${val}px`}
                </Button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Current CSS */}
        <div className="p-2 bg-muted/50 rounded text-[10px] font-mono whitespace-pre-wrap">
          {borderCSS}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={reset}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7"
            onClick={copyCSS}
          >
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

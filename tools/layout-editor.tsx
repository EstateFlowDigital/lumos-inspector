"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, LayoutGrid, Rows, Grid3X3, Plus, Minus,
  AlignLeft, AlignCenter, AlignRight, ArrowUp, ArrowDown,
  ArrowLeft, ArrowRight, StretchHorizontal, StretchVertical,
  Move, Maximize2, GripVertical
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Slider } from "../ui/slider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { Separator } from "../ui/separator"
import { useInspector } from "../core/inspector-context"

type LayoutType = "flex" | "grid" | "none"

interface LayoutInfo {
  type: LayoutType
  // Flex properties
  flexDirection?: string
  flexWrap?: string
  justifyContent?: string
  alignItems?: string
  alignContent?: string
  gap?: string
  // Grid properties
  gridTemplateColumns?: string
  gridTemplateRows?: string
  gridAutoFlow?: string
}

// Flex alignment options
const justifyContentOptions = [
  { value: "flex-start", label: "Start", icon: AlignLeft },
  { value: "center", label: "Center", icon: AlignCenter },
  { value: "flex-end", label: "End", icon: AlignRight },
  { value: "space-between", label: "Between", icon: StretchHorizontal },
  { value: "space-around", label: "Around", icon: StretchHorizontal },
  { value: "space-evenly", label: "Evenly", icon: StretchHorizontal },
]

const alignItemsOptions = [
  { value: "flex-start", label: "Start", icon: ArrowUp },
  { value: "center", label: "Center", icon: Move },
  { value: "flex-end", label: "End", icon: ArrowDown },
  { value: "stretch", label: "Stretch", icon: StretchVertical },
  { value: "baseline", label: "Baseline", icon: GripVertical },
]

const flexDirectionOptions = [
  { value: "row", label: "Row", icon: ArrowRight },
  { value: "row-reverse", label: "Row Reverse", icon: ArrowLeft },
  { value: "column", label: "Column", icon: ArrowDown },
  { value: "column-reverse", label: "Column Reverse", icon: ArrowUp },
]

export function LayoutEditor() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [layoutInfo, setLayoutInfo] = useState<LayoutInfo>({ type: "none" })

  // Get current layout info from selected element
  useEffect(() => {
    if (!selectedElement?.element) {
      setLayoutInfo({ type: "none" })
      return
    }

    const computed = getComputedStyle(selectedElement.element)
    const display = computed.display

    if (display === "flex" || display === "inline-flex") {
      setLayoutInfo({
        type: "flex",
        flexDirection: computed.flexDirection,
        flexWrap: computed.flexWrap,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        alignContent: computed.alignContent,
        gap: computed.gap,
      })
    } else if (display === "grid" || display === "inline-grid") {
      setLayoutInfo({
        type: "grid",
        gridTemplateColumns: computed.gridTemplateColumns,
        gridTemplateRows: computed.gridTemplateRows,
        gridAutoFlow: computed.gridAutoFlow,
        gap: computed.gap,
      })
    } else {
      setLayoutInfo({ type: "none" })
    }
  }, [selectedElement])

  // Apply style to element
  const applyStyle = useCallback((property: string, value: string) => {
    if (!selectedElement?.element) return
    selectedElement.element.style.setProperty(property, value)
    notifyStyleChange()

    // Update local state
    setLayoutInfo((prev) => ({ ...prev, [property.replace(/-([a-z])/g, (g) => g[1].toUpperCase())]: value }))
    toast.success(`Set ${property}: ${value}`)
  }, [selectedElement, notifyStyleChange])

  // Convert to flex
  const convertToFlex = useCallback(() => {
    if (!selectedElement?.element) return
    selectedElement.element.style.setProperty("display", "flex")
    notifyStyleChange()
    setLayoutInfo({
      type: "flex",
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "stretch",
      gap: "0px",
    })
    toast.success("Converted to Flexbox")
  }, [selectedElement, notifyStyleChange])

  // Convert to grid
  const convertToGrid = useCallback(() => {
    if (!selectedElement?.element) return
    selectedElement.element.style.setProperty("display", "grid")
    selectedElement.element.style.setProperty("grid-template-columns", "repeat(3, 1fr)")
    notifyStyleChange()
    setLayoutInfo({
      type: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gridTemplateRows: "auto",
      gap: "0px",
    })
    toast.success("Converted to Grid")
  }, [selectedElement, notifyStyleChange])

  // Parse gap value
  const parseGap = (gap?: string): number => {
    if (!gap) return 0
    const match = gap.match(/^(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  // Grid column count
  const gridColumnCount = useMemo(() => {
    if (!layoutInfo.gridTemplateColumns) return 3
    const match = layoutInfo.gridTemplateColumns.match(/repeat\((\d+)/)
    if (match) return parseInt(match[1])
    return layoutInfo.gridTemplateColumns.split(" ").length
  }, [layoutInfo.gridTemplateColumns])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-chart-2" />
          <span>Layout Editor</span>
          {layoutInfo.type !== "none" && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4 capitalize">
              {layoutInfo.type}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {!selectedElement ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Select an element to edit its layout
          </div>
        ) : layoutInfo.type === "none" ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              This element is not a flex or grid container.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={convertToFlex}>
                <Rows className="h-3 w-3 mr-1" />
                Make Flex
              </Button>
              <Button variant="outline" size="sm" onClick={convertToGrid}>
                <Grid3X3 className="h-3 w-3 mr-1" />
                Make Grid
              </Button>
            </div>
          </div>
        ) : layoutInfo.type === "flex" ? (
          /* Flex Editor */
          <div className="space-y-4">
            {/* Direction */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-2 block">Direction</Label>
              <div className="grid grid-cols-4 gap-1">
                {flexDirectionOptions.map((opt) => {
                  const Icon = opt.icon
                  return (
                    <Tooltip key={opt.value}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={layoutInfo.flexDirection === opt.value ? "default" : "outline"}
                          size="sm"
                          className="h-8"
                          onClick={() => applyStyle("flex-direction", opt.value)}
                        >
                          <Icon className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{opt.label}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>

            {/* Justify Content */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-2 block">Justify Content</Label>
              <div className="grid grid-cols-6 gap-1">
                {justifyContentOptions.map((opt) => {
                  const Icon = opt.icon
                  return (
                    <Tooltip key={opt.value}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={layoutInfo.justifyContent === opt.value ? "default" : "outline"}
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => applyStyle("justify-content", opt.value)}
                        >
                          <Icon className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{opt.label}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>

            {/* Align Items */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-2 block">Align Items</Label>
              <div className="grid grid-cols-5 gap-1">
                {alignItemsOptions.map((opt) => {
                  const Icon = opt.icon
                  return (
                    <Tooltip key={opt.value}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={layoutInfo.alignItems === opt.value ? "default" : "outline"}
                          size="sm"
                          className="h-8"
                          onClick={() => applyStyle("align-items", opt.value)}
                        >
                          <Icon className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{opt.label}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>

            {/* Wrap */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-2 block">Wrap</Label>
              <div className="grid grid-cols-3 gap-1">
                {["nowrap", "wrap", "wrap-reverse"].map((value) => (
                  <Button
                    key={value}
                    variant={layoutInfo.flexWrap === value ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => applyStyle("flex-wrap", value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>

            {/* Gap */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-2 block">
                Gap: {parseGap(layoutInfo.gap)}px
              </Label>
              <Slider
                value={[parseGap(layoutInfo.gap)]}
                onValueChange={([v]) => applyStyle("gap", `${v}px`)}
                min={0}
                max={64}
                step={4}
                className="w-full"
              />
            </div>
          </div>
        ) : (
          /* Grid Editor */
          <div className="space-y-4">
            {/* Columns */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-2 block">
                Columns: {gridColumnCount}
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    const newCount = Math.max(1, gridColumnCount - 1)
                    applyStyle("grid-template-columns", `repeat(${newCount}, 1fr)`)
                  }}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Slider
                  value={[gridColumnCount]}
                  onValueChange={([v]) => applyStyle("grid-template-columns", `repeat(${v}, 1fr)`)}
                  min={1}
                  max={12}
                  step={1}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    const newCount = Math.min(12, gridColumnCount + 1)
                    applyStyle("grid-template-columns", `repeat(${newCount}, 1fr)`)
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Auto Flow */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-2 block">Auto Flow</Label>
              <div className="grid grid-cols-3 gap-1">
                {["row", "column", "dense"].map((value) => (
                  <Button
                    key={value}
                    variant={layoutInfo.gridAutoFlow?.includes(value) ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-[10px] capitalize"
                    onClick={() => applyStyle("grid-auto-flow", value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>

            {/* Gap */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-2 block">
                Gap: {parseGap(layoutInfo.gap)}px
              </Label>
              <Slider
                value={[parseGap(layoutInfo.gap)]}
                onValueChange={([v]) => applyStyle("gap", `${v}px`)}
                min={0}
                max={64}
                step={4}
                className="w-full"
              />
            </div>

            {/* Justify/Align Items */}
            <Separator />
            <div>
              <Label className="text-[10px] text-muted-foreground mb-2 block">Place Items</Label>
              <div className="grid grid-cols-3 gap-1">
                {["start", "center", "end"].map((value) => (
                  <Button
                    key={value}
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] capitalize"
                    onClick={() => applyStyle("place-items", value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Visual Preview */}
        {layoutInfo.type !== "none" && (
          <div className="pt-2 border-t">
            <Label className="text-[10px] text-muted-foreground mb-2 block">Preview</Label>
            <div
              className={cn(
                "p-2 bg-muted/50 rounded-md h-20",
                layoutInfo.type === "flex" && "flex",
                layoutInfo.type === "grid" && "grid"
              )}
              style={{
                flexDirection: layoutInfo.flexDirection as React.CSSProperties["flexDirection"],
                flexWrap: layoutInfo.flexWrap as React.CSSProperties["flexWrap"],
                justifyContent: layoutInfo.justifyContent,
                alignItems: layoutInfo.alignItems,
                gridTemplateColumns: layoutInfo.gridTemplateColumns,
                gap: layoutInfo.gap,
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-6 h-6 bg-primary/20 rounded border border-primary/40 flex items-center justify-center text-[9px] text-primary"
                >
                  {i}
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

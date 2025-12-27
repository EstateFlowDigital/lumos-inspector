"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Columns, RotateCcw, Copy
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

const columnRuleStyles = [
  "none", "solid", "dashed", "dotted", "double", "groove", "ridge"
]

export function ColumnsEditor() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [columnCount, setColumnCount] = useState<number | "auto">("auto")
  const [columnWidth, setColumnWidth] = useState<number | "auto">("auto")
  const [columnGap, setColumnGap] = useState(16)
  const [columnRuleWidth, setColumnRuleWidth] = useState(0)
  const [columnRuleStyle, setColumnRuleStyle] = useState("none")
  const [columnRuleColor, setColumnRuleColor] = useState("#e5e7eb")
  const [columnSpan, setColumnSpan] = useState("none")

  // Load from selected element
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)

    const count = computed.columnCount
    setColumnCount(count === "auto" ? "auto" : parseInt(count) || "auto")

    const width = computed.columnWidth
    setColumnWidth(width === "auto" ? "auto" : parseFloat(width) || "auto")

    setColumnGap(parseFloat(computed.columnGap) || 0)
    setColumnRuleWidth(parseFloat(computed.columnRuleWidth) || 0)
    setColumnRuleStyle(computed.columnRuleStyle || "none")
    setColumnRuleColor(computed.columnRuleColor || "#e5e7eb")
    setColumnSpan(computed.columnSpan || "none")
  }, [selectedElement])

  // Build CSS
  const cssOutput = useMemo(() => {
    const lines: string[] = []

    if (columnCount !== "auto") {
      lines.push(`column-count: ${columnCount};`)
    }
    if (columnWidth !== "auto") {
      lines.push(`column-width: ${columnWidth}px;`)
    }
    if (columnGap !== 0) {
      lines.push(`column-gap: ${columnGap}px;`)
    }
    if (columnRuleWidth > 0) {
      lines.push(`column-rule: ${columnRuleWidth}px ${columnRuleStyle} ${columnRuleColor};`)
    }
    if (columnSpan !== "none") {
      lines.push(`column-span: ${columnSpan};`)
    }

    return lines.length > 0 ? lines.join("\n") : "/* No column styles */"
  }, [columnCount, columnWidth, columnGap, columnRuleWidth, columnRuleStyle, columnRuleColor, columnSpan])

  // Apply to element
  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element
    el.style.columnCount = columnCount === "auto" ? "auto" : String(columnCount)
    el.style.columnWidth = columnWidth === "auto" ? "auto" : `${columnWidth}px`
    el.style.columnGap = `${columnGap}px`
    el.style.columnRuleWidth = `${columnRuleWidth}px`
    el.style.columnRuleStyle = columnRuleStyle
    el.style.columnRuleColor = columnRuleColor
    el.style.columnSpan = columnSpan

    toast.success("Column layout applied")
  }, [selectedElement, columnCount, columnWidth, columnGap, columnRuleWidth, columnRuleStyle, columnRuleColor, columnSpan])

  // Reset
  const reset = useCallback(() => {
    setColumnCount("auto")
    setColumnWidth("auto")
    setColumnGap(16)
    setColumnRuleWidth(0)
    setColumnRuleStyle("none")
    setColumnRuleColor("#e5e7eb")
    setColumnSpan("none")

    if (selectedElement?.element) {
      const el = selectedElement.element
      el.style.columnCount = ""
      el.style.columnWidth = ""
      el.style.columnGap = ""
      el.style.columnRule = ""
      el.style.columnSpan = ""
    }

    toast.success("Columns reset")
  }, [selectedElement])

  // Copy CSS
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput)
    toast.success("CSS copied to clipboard")
  }, [cssOutput])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Columns className="h-4 w-4 text-teal-500" />
          <span>Multi-Column</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Preview */}
        <div
          className="p-3 bg-muted/50 rounded-md text-[8px] leading-tight h-20 overflow-hidden"
          style={{
            columnCount: columnCount === "auto" ? undefined : columnCount,
            columnWidth: columnWidth === "auto" ? undefined : `${columnWidth}px`,
            columnGap: `${columnGap}px`,
            columnRuleWidth: `${columnRuleWidth}px`,
            columnRuleStyle: columnRuleStyle,
            columnRuleColor: columnRuleColor,
          }}
        >
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </div>

        {/* Column count */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Column Count</Label>
            <span className="text-[10px] font-mono">
              {columnCount === "auto" ? "auto" : columnCount}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={columnCount === "auto" ? "default" : "outline"}
              size="sm"
              className="h-6 text-[9px]"
              onClick={() => setColumnCount("auto")}
            >
              Auto
            </Button>
            <Slider
              value={[columnCount === "auto" ? 1 : columnCount]}
              onValueChange={([v]) => setColumnCount(v)}
              min={1}
              max={6}
              step={1}
              className="flex-1"
            />
          </div>
        </div>

        {/* Column width */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Column Width (min)</Label>
            <span className="text-[10px] font-mono">
              {columnWidth === "auto" ? "auto" : `${columnWidth}px`}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={columnWidth === "auto" ? "default" : "outline"}
              size="sm"
              className="h-6 text-[9px]"
              onClick={() => setColumnWidth("auto")}
            >
              Auto
            </Button>
            <Slider
              value={[columnWidth === "auto" ? 150 : columnWidth]}
              onValueChange={([v]) => setColumnWidth(v)}
              min={50}
              max={400}
              step={10}
              className="flex-1"
            />
          </div>
        </div>

        {/* Column gap */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Column Gap</Label>
            <span className="text-[10px] font-mono">{columnGap}px</span>
          </div>
          <Slider
            value={[columnGap]}
            onValueChange={([v]) => setColumnGap(v)}
            min={0}
            max={64}
            step={4}
          />
        </div>

        {/* Column rule */}
        <div className="p-2 bg-muted/30 rounded space-y-2">
          <Label className="text-[10px] text-muted-foreground">Column Rule</Label>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px]">Width</Label>
              <Slider
                value={[columnRuleWidth]}
                onValueChange={([v]) => setColumnRuleWidth(v)}
                min={0}
                max={10}
                step={1}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px]">Style</Label>
              <Select value={columnRuleStyle} onValueChange={setColumnRuleStyle}>
                <SelectTrigger className="h-6 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columnRuleStyles.map(style => (
                    <SelectItem key={style} value={style} className="text-[10px]">
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-[9px]">Color</Label>
            <input
              type="color"
              value={columnRuleColor}
              onChange={(e) => setColumnRuleColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer"
            />
            <Input
              value={columnRuleColor}
              onChange={(e) => setColumnRuleColor(e.target.value)}
              className="flex-1 h-6 text-[10px] font-mono"
            />
          </div>
        </div>

        {/* Column span (for child elements) */}
        <div className="flex items-center gap-2">
          <Label className="text-[10px]">Column Span:</Label>
          <div className="flex gap-1">
            {["none", "all"].map(value => (
              <Button
                key={value}
                variant={columnSpan === value ? "default" : "outline"}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setColumnSpan(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>

        {/* Current CSS */}
        <div className="p-2 bg-muted/50 rounded text-[10px] font-mono whitespace-pre-wrap">
          {cssOutput}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7" onClick={reset}>
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-7" onClick={copyCSS}>
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

"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { ChevronDown, ArrowRightLeft, Copy, RefreshCw } from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

type Unit = "px" | "rem" | "em" | "%" | "vw" | "vh" | "pt" | "ch"

interface ConversionContext {
  rootFontSize: number
  parentFontSize: number
  viewportWidth: number
  viewportHeight: number
  parentWidth: number
  parentHeight: number
  chWidth: number
}

// Get conversion context from DOM
function getConversionContext(element?: HTMLElement | null): ConversionContext {
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  let parentFontSize = rootFontSize
  let parentWidth = window.innerWidth
  let parentHeight = window.innerHeight
  let chWidth = rootFontSize * 0.5 // Approximate

  if (element) {
    const parent = element.parentElement
    if (parent) {
      parentFontSize = parseFloat(getComputedStyle(parent).fontSize) || rootFontSize
      const parentRect = parent.getBoundingClientRect()
      parentWidth = parentRect.width
      parentHeight = parentRect.height
    }

    // Measure ch width
    const span = document.createElement("span")
    span.style.cssText = "position:absolute;visibility:hidden;font:inherit;"
    span.textContent = "0"
    element.appendChild(span)
    chWidth = span.offsetWidth || rootFontSize * 0.5
    element.removeChild(span)
  }

  return {
    rootFontSize,
    parentFontSize,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    parentWidth,
    parentHeight,
    chWidth,
  }
}

// Convert value to pixels
function toPx(value: number, unit: Unit, ctx: ConversionContext): number {
  switch (unit) {
    case "px":
      return value
    case "rem":
      return value * ctx.rootFontSize
    case "em":
      return value * ctx.parentFontSize
    case "%":
      return (value / 100) * ctx.parentWidth
    case "vw":
      return (value / 100) * ctx.viewportWidth
    case "vh":
      return (value / 100) * ctx.viewportHeight
    case "pt":
      return value * (96 / 72) // 1pt = 1/72 inch, 96dpi
    case "ch":
      return value * ctx.chWidth
    default:
      return value
  }
}

// Convert pixels to target unit
function fromPx(px: number, unit: Unit, ctx: ConversionContext): number {
  switch (unit) {
    case "px":
      return px
    case "rem":
      return px / ctx.rootFontSize
    case "em":
      return px / ctx.parentFontSize
    case "%":
      return (px / ctx.parentWidth) * 100
    case "vw":
      return (px / ctx.viewportWidth) * 100
    case "vh":
      return (px / ctx.viewportHeight) * 100
    case "pt":
      return px / (96 / 72)
    case "ch":
      return px / ctx.chWidth
    default:
      return px
  }
}

// Format number for display
function formatNumber(num: number): string {
  if (Number.isInteger(num)) return num.toString()
  return num.toFixed(4).replace(/\.?0+$/, "")
}

export function UnitsConverter() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [inputValue, setInputValue] = useState("16")
  const [inputUnit, setInputUnit] = useState<Unit>("px")
  const [context, setContext] = useState<ConversionContext>(getConversionContext())

  const units: { value: Unit; label: string }[] = [
    { value: "px", label: "px" },
    { value: "rem", label: "rem" },
    { value: "em", label: "em" },
    { value: "%", label: "%" },
    { value: "vw", label: "vw" },
    { value: "vh", label: "vh" },
    { value: "pt", label: "pt" },
    { value: "ch", label: "ch" },
  ]

  // Update context when element changes
  useEffect(() => {
    setContext(getConversionContext(selectedElement?.element))
  }, [selectedElement])

  // Refresh context
  const refreshContext = useCallback(() => {
    setContext(getConversionContext(selectedElement?.element))
    toast.success("Context refreshed")
  }, [selectedElement])

  // Calculate all conversions
  const conversions = useMemo(() => {
    const numValue = parseFloat(inputValue) || 0
    const pxValue = toPx(numValue, inputUnit, context)

    return units.map((u) => ({
      unit: u.value,
      label: u.label,
      value: formatNumber(fromPx(pxValue, u.value, context)),
      isSource: u.value === inputUnit,
    }))
  }, [inputValue, inputUnit, context, units])

  // Copy value
  const copyValue = useCallback((value: string, unit: string) => {
    navigator.clipboard.writeText(`${value}${unit}`)
    toast.success(`Copied ${value}${unit}`)
  }, [])

  // Swap units (flip the conversion)
  const swapUnits = useCallback((targetUnit: Unit) => {
    const numValue = parseFloat(inputValue) || 0
    const pxValue = toPx(numValue, inputUnit, context)
    const newValue = fromPx(pxValue, targetUnit, context)
    setInputValue(formatNumber(newValue))
    setInputUnit(targetUnit)
  }, [inputValue, inputUnit, context])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-chart-2" />
          <span>Units Converter</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Input */}
        <div className="flex gap-2">
          <Input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 h-9 text-sm font-mono"
            step="any"
          />
          <Select value={inputUnit} onValueChange={(v) => setInputUnit(v as Unit)}>
            <SelectTrigger className="w-20 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Context info */}
        <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground p-2 bg-muted/50 rounded-md">
          <div>Root: {context.rootFontSize}px</div>
          <div>Parent: {context.parentFontSize}px</div>
          <div>Viewport: {context.viewportWidth}x{context.viewportHeight}</div>
          <div>Parent: {Math.round(context.parentWidth)}x{Math.round(context.parentHeight)}</div>
        </div>

        {/* Conversions */}
        <div className="space-y-1">
          {conversions.map((c) => (
            <div
              key={c.unit}
              className={cn(
                "flex items-center justify-between p-2 rounded-md transition-colors",
                c.isSource ? "bg-primary/10" : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono w-10 text-muted-foreground">{c.label}</span>
                <span className="text-sm font-mono">{c.value}</span>
              </div>
              <div className="flex gap-1">
                {!c.isSource && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => swapUnits(c.unit)}
                  >
                    <ArrowRightLeft className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyValue(c.value, c.unit)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7"
          onClick={refreshContext}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh Context
        </Button>

        {selectedElement && (
          <p className="text-[10px] text-muted-foreground">
            Context based on selected element&apos;s parent
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

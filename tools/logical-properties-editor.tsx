"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  ChevronDown, ArrowLeftRight, Copy, RotateCcw
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface LogicalValues {
  marginBlock: string
  marginBlockStart: string
  marginBlockEnd: string
  marginInline: string
  marginInlineStart: string
  marginInlineEnd: string
  paddingBlock: string
  paddingBlockStart: string
  paddingBlockEnd: string
  paddingInline: string
  paddingInlineStart: string
  paddingInlineEnd: string
  insetBlock: string
  insetBlockStart: string
  insetBlockEnd: string
  insetInline: string
  insetInlineStart: string
  insetInlineEnd: string
  blockSize: string
  inlineSize: string
  minBlockSize: string
  minInlineSize: string
  maxBlockSize: string
  maxInlineSize: string
  borderBlockWidth: string
  borderInlineWidth: string
}

// Mapping from physical to logical
const physicalToLogical: Record<string, string> = {
  "margin-top": "margin-block-start",
  "margin-bottom": "margin-block-end",
  "margin-left": "margin-inline-start",
  "margin-right": "margin-inline-end",
  "padding-top": "padding-block-start",
  "padding-bottom": "padding-block-end",
  "padding-left": "padding-inline-start",
  "padding-right": "padding-inline-end",
  "top": "inset-block-start",
  "bottom": "inset-block-end",
  "left": "inset-inline-start",
  "right": "inset-inline-end",
  "width": "inline-size",
  "height": "block-size",
  "min-width": "min-inline-size",
  "min-height": "min-block-size",
  "max-width": "max-inline-size",
  "max-height": "max-block-size",
}

export function LogicalPropertiesEditor() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [values, setValues] = useState<Partial<LogicalValues>>({})

  // Load current values
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)

    setValues({
      marginBlockStart: computed.marginBlockStart || computed.marginTop,
      marginBlockEnd: computed.marginBlockEnd || computed.marginBottom,
      marginInlineStart: computed.marginInlineStart || computed.marginLeft,
      marginInlineEnd: computed.marginInlineEnd || computed.marginRight,
      paddingBlockStart: computed.paddingBlockStart || computed.paddingTop,
      paddingBlockEnd: computed.paddingBlockEnd || computed.paddingBottom,
      paddingInlineStart: computed.paddingInlineStart || computed.paddingLeft,
      paddingInlineEnd: computed.paddingInlineEnd || computed.paddingRight,
      blockSize: computed.blockSize || computed.height,
      inlineSize: computed.inlineSize || computed.width,
    })
  }, [selectedElement])

  // Update value
  const updateValue = useCallback((key: keyof LogicalValues, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }, [])

  // Apply to element
  const apply = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element

    Object.entries(values).forEach(([key, value]) => {
      if (value) {
        // Convert camelCase to kebab-case
        const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase()
        el.style.setProperty(cssKey, value)
      }
    })

    toast.success("Logical properties applied!")
  }, [selectedElement, values])

  // Reset
  const reset = useCallback(() => {
    if (!selectedElement?.element) return

    const el = selectedElement.element

    Object.keys(values).forEach(key => {
      const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase()
      el.style.removeProperty(cssKey)
    })

    toast.success("Properties reset")
  }, [selectedElement, values])

  // Copy CSS
  const copyCSS = useCallback(() => {
    const css = Object.entries(values)
      .filter(([_, v]) => v)
      .map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase()
        return `${cssKey}: ${value};`
      })
      .join("\n")

    navigator.clipboard.writeText(css)
    toast.success("CSS copied to clipboard")
  }, [values])

  // Convert physical to logical
  const convertToLogical = useCallback(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)
    let css = ""

    Object.entries(physicalToLogical).forEach(([physical, logical]) => {
      const value = computed.getPropertyValue(physical)
      if (value && value !== "auto" && value !== "0px") {
        css += `${logical}: ${value};\n`
      }
    })

    navigator.clipboard.writeText(css)
    toast.success("Converted CSS copied to clipboard")
  }, [selectedElement])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-[--accent-blue]" />
          <span>Logical Properties</span>
          <Badge variant="outline" className="text-[9px] h-4 px-1">RTL/LTR</Badge>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Info */}
        <div className="p-2 bg-[--accent-blue]/10 border border-[--accent-blue]/20 rounded text-[10px]">
          Logical properties work with any writing direction (LTR, RTL, vertical).
        </div>

        {/* Convert button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7"
          onClick={convertToLogical}
          disabled={!selectedElement}
        >
          Convert Physical to Logical
        </Button>

        {/* Block sizing */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Block (Vertical)</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px]">block-size</Label>
              <Input
                value={values.blockSize || ""}
                onChange={(e) => updateValue("blockSize", e.target.value)}
                className="h-6 text-[10px] font-mono"
                placeholder="auto"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px]">inline-size</Label>
              <Input
                value={values.inlineSize || ""}
                onChange={(e) => updateValue("inlineSize", e.target.value)}
                className="h-6 text-[10px] font-mono"
                placeholder="auto"
              />
            </div>
          </div>
        </div>

        {/* Margin block */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Margin Block</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px]">block-start (top)</Label>
              <Input
                value={values.marginBlockStart || ""}
                onChange={(e) => updateValue("marginBlockStart", e.target.value)}
                className="h-6 text-[10px] font-mono"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px]">block-end (bottom)</Label>
              <Input
                value={values.marginBlockEnd || ""}
                onChange={(e) => updateValue("marginBlockEnd", e.target.value)}
                className="h-6 text-[10px] font-mono"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Margin inline */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Margin Inline</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px]">inline-start (left)</Label>
              <Input
                value={values.marginInlineStart || ""}
                onChange={(e) => updateValue("marginInlineStart", e.target.value)}
                className="h-6 text-[10px] font-mono"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px]">inline-end (right)</Label>
              <Input
                value={values.marginInlineEnd || ""}
                onChange={(e) => updateValue("marginInlineEnd", e.target.value)}
                className="h-6 text-[10px] font-mono"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Padding block */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Padding Block</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px]">block-start</Label>
              <Input
                value={values.paddingBlockStart || ""}
                onChange={(e) => updateValue("paddingBlockStart", e.target.value)}
                className="h-6 text-[10px] font-mono"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px]">block-end</Label>
              <Input
                value={values.paddingBlockEnd || ""}
                onChange={(e) => updateValue("paddingBlockEnd", e.target.value)}
                className="h-6 text-[10px] font-mono"
                placeholder="0"
              />
            </div>
          </div>
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
          <div className="font-medium mb-1">Property Mapping:</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono">
            <span>top/bottom</span><span>→ block-start/end</span>
            <span>left/right</span><span>→ inline-start/end</span>
            <span>width/height</span><span>→ inline/block-size</span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

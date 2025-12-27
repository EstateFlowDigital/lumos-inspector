"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Wand2, Copy, RefreshCw
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

// CSS to Tailwind mappings
const cssToTailwind: Record<string, (value: string) => string | null> = {
  // Display
  display: (v) => {
    const map: Record<string, string> = {
      block: "block", inline: "inline", "inline-block": "inline-block",
      flex: "flex", "inline-flex": "inline-flex", grid: "grid",
      "inline-grid": "inline-grid", none: "hidden", contents: "contents",
    }
    return map[v] || null
  },

  // Position
  position: (v) => {
    const map: Record<string, string> = {
      static: "static", fixed: "fixed", absolute: "absolute",
      relative: "relative", sticky: "sticky",
    }
    return map[v] || null
  },

  // Flex direction
  "flex-direction": (v) => {
    const map: Record<string, string> = {
      row: "flex-row", "row-reverse": "flex-row-reverse",
      column: "flex-col", "column-reverse": "flex-col-reverse",
    }
    return map[v] || null
  },

  // Flex wrap
  "flex-wrap": (v) => {
    const map: Record<string, string> = {
      wrap: "flex-wrap", nowrap: "flex-nowrap", "wrap-reverse": "flex-wrap-reverse",
    }
    return map[v] || null
  },

  // Justify content
  "justify-content": (v) => {
    const map: Record<string, string> = {
      "flex-start": "justify-start", "flex-end": "justify-end",
      center: "justify-center", "space-between": "justify-between",
      "space-around": "justify-around", "space-evenly": "justify-evenly",
    }
    return map[v] || null
  },

  // Align items
  "align-items": (v) => {
    const map: Record<string, string> = {
      "flex-start": "items-start", "flex-end": "items-end",
      center: "items-center", baseline: "items-baseline", stretch: "items-stretch",
    }
    return map[v] || null
  },

  // Text align
  "text-align": (v) => {
    const map: Record<string, string> = {
      left: "text-left", center: "text-center",
      right: "text-right", justify: "text-justify",
    }
    return map[v] || null
  },

  // Font weight
  "font-weight": (v) => {
    const map: Record<string, string> = {
      "100": "font-thin", "200": "font-extralight", "300": "font-light",
      "400": "font-normal", "500": "font-medium", "600": "font-semibold",
      "700": "font-bold", "800": "font-extrabold", "900": "font-black",
    }
    return map[v] || null
  },

  // Font size
  "font-size": (v) => {
    const sizes: Record<string, string> = {
      "12px": "text-xs", "14px": "text-sm", "16px": "text-base",
      "18px": "text-lg", "20px": "text-xl", "24px": "text-2xl",
      "30px": "text-3xl", "36px": "text-4xl", "48px": "text-5xl",
      "60px": "text-6xl", "72px": "text-7xl", "96px": "text-8xl", "128px": "text-9xl",
    }
    return sizes[v] || null
  },

  // Border radius
  "border-radius": (v) => {
    const map: Record<string, string> = {
      "0px": "rounded-none", "2px": "rounded-sm", "4px": "rounded",
      "6px": "rounded-md", "8px": "rounded-lg", "12px": "rounded-xl",
      "16px": "rounded-2xl", "24px": "rounded-3xl", "9999px": "rounded-full",
    }
    return map[v] || null
  },

  // Overflow
  overflow: (v) => {
    const map: Record<string, string> = {
      auto: "overflow-auto", hidden: "overflow-hidden",
      visible: "overflow-visible", scroll: "overflow-scroll",
    }
    return map[v] || null
  },

  // Opacity
  opacity: (v) => {
    const val = parseFloat(v)
    if (val === 0) return "opacity-0"
    if (val === 0.05) return "opacity-5"
    if (val === 0.1) return "opacity-10"
    if (val === 0.2) return "opacity-20"
    if (val === 0.25) return "opacity-25"
    if (val === 0.3) return "opacity-30"
    if (val === 0.4) return "opacity-40"
    if (val === 0.5) return "opacity-50"
    if (val === 0.6) return "opacity-60"
    if (val === 0.7) return "opacity-70"
    if (val === 0.75) return "opacity-75"
    if (val === 0.8) return "opacity-80"
    if (val === 0.9) return "opacity-90"
    if (val === 0.95) return "opacity-95"
    if (val === 1) return "opacity-100"
    return null
  },

  // Cursor
  cursor: (v) => {
    const map: Record<string, string> = {
      auto: "cursor-auto", default: "cursor-default", pointer: "cursor-pointer",
      wait: "cursor-wait", text: "cursor-text", move: "cursor-move",
      help: "cursor-help", "not-allowed": "cursor-not-allowed",
      none: "cursor-none", "context-menu": "cursor-context-menu",
      progress: "cursor-progress", cell: "cursor-cell", crosshair: "cursor-crosshair",
      "vertical-text": "cursor-vertical-text", alias: "cursor-alias",
      copy: "cursor-copy", "no-drop": "cursor-no-drop", grab: "cursor-grab",
      grabbing: "cursor-grabbing", "all-scroll": "cursor-all-scroll",
      "col-resize": "cursor-col-resize", "row-resize": "cursor-row-resize",
      "zoom-in": "cursor-zoom-in", "zoom-out": "cursor-zoom-out",
    }
    return map[v] || null
  },

  // Z-index
  "z-index": (v) => {
    const map: Record<string, string> = {
      "0": "z-0", "10": "z-10", "20": "z-20", "30": "z-30",
      "40": "z-40", "50": "z-50", "auto": "z-auto",
    }
    return map[v] || null
  },
}

// Parse spacing values
function parseSpacing(value: string, prefix: string): string | null {
  const px = parseFloat(value)
  if (isNaN(px)) return null

  const spacingMap: Record<number, string> = {
    0: "0", 1: "px", 2: "0.5", 4: "1", 6: "1.5", 8: "2",
    10: "2.5", 12: "3", 14: "3.5", 16: "4", 20: "5",
    24: "6", 28: "7", 32: "8", 36: "9", 40: "10",
    44: "11", 48: "12", 56: "14", 64: "16", 80: "20",
    96: "24", 112: "28", 128: "32", 144: "36", 160: "40",
    176: "44", 192: "48", 208: "52", 224: "56", 240: "60",
    256: "64", 288: "72", 320: "80", 384: "96",
  }

  const tailwindValue = spacingMap[px]
  return tailwindValue ? `${prefix}-${tailwindValue}` : null
}

export function TailwindGenerator() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [classes, setClasses] = useState<{ property: string; tailwind: string }[]>([])
  const [includeLayout, setIncludeLayout] = useState(true)
  const [includeTypography, setIncludeTypography] = useState(true)
  const [includeSpacing, setIncludeSpacing] = useState(true)

  // Generate Tailwind classes
  const generate = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const computed = getComputedStyle(selectedElement.element)
    const generated: { property: string; tailwind: string }[] = []

    // Process CSS properties
    Object.entries(cssToTailwind).forEach(([prop, converter]) => {
      const value = computed.getPropertyValue(prop)
      if (value) {
        const tailwind = converter(value)
        if (tailwind) {
          generated.push({ property: prop, tailwind })
        }
      }
    })

    // Process spacing if enabled
    if (includeSpacing) {
      const spacingProps = [
        { css: "padding-top", prefix: "pt" },
        { css: "padding-right", prefix: "pr" },
        { css: "padding-bottom", prefix: "pb" },
        { css: "padding-left", prefix: "pl" },
        { css: "margin-top", prefix: "mt" },
        { css: "margin-right", prefix: "mr" },
        { css: "margin-bottom", prefix: "mb" },
        { css: "margin-left", prefix: "ml" },
        { css: "gap", prefix: "gap" },
        { css: "width", prefix: "w" },
        { css: "height", prefix: "h" },
      ]

      spacingProps.forEach(({ css, prefix }) => {
        const value = computed.getPropertyValue(css)
        if (value) {
          const tailwind = parseSpacing(value, prefix)
          if (tailwind) {
            generated.push({ property: css, tailwind })
          }
        }
      })
    }

    setClasses(generated)
    toast.success(`Generated ${generated.length} Tailwind classes`)
  }, [selectedElement, includeSpacing])

  // Copy all classes
  const copyClasses = useCallback(() => {
    const classString = classes.map(c => c.tailwind).join(" ")
    navigator.clipboard.writeText(classString)
    toast.success("Tailwind classes copied")
  }, [classes])

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (!includeLayout && ["display", "position", "flex-direction", "justify-content", "align-items"].includes(c.property)) {
        return false
      }
      if (!includeTypography && ["font-size", "font-weight", "text-align"].includes(c.property)) {
        return false
      }
      if (!includeSpacing && c.property.match(/^(padding|margin|gap|width|height)/)) {
        return false
      }
      return true
    })
  }, [classes, includeLayout, includeTypography, includeSpacing])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-sky-500" />
          <span>Tailwind Generator</span>
          {filteredClasses.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4">
              {filteredClasses.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Generate button */}
        <Button
          variant="default"
          size="sm"
          className="w-full h-8"
          onClick={generate}
          disabled={!selectedElement}
        >
          <RefreshCw className="h-3 w-3 mr-2" />
          Generate from Selected Element
        </Button>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="layout"
              checked={includeLayout}
              onCheckedChange={setIncludeLayout}
            />
            <Label htmlFor="layout" className="text-[10px]">Layout</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="typography"
              checked={includeTypography}
              onCheckedChange={setIncludeTypography}
            />
            <Label htmlFor="typography" className="text-[10px]">Typography</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="spacing"
              checked={includeSpacing}
              onCheckedChange={setIncludeSpacing}
            />
            <Label htmlFor="spacing" className="text-[10px]">Spacing</Label>
          </div>
        </div>

        {/* Generated classes */}
        <ScrollArea className="h-[180px]">
          <div className="space-y-1">
            {filteredClasses.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Click Generate to create Tailwind classes
              </div>
            ) : (
              filteredClasses.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
                >
                  <span className="text-muted-foreground">{c.property}</span>
                  <code className="font-mono text-primary">{c.tailwind}</code>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Output */}
        {filteredClasses.length > 0 && (
          <>
            <div className="p-2 bg-muted/50 rounded text-[10px] font-mono break-all">
              {filteredClasses.map(c => c.tailwind).join(" ")}
            </div>

            <Button variant="outline" size="sm" className="w-full h-7" onClick={copyClasses}>
              <Copy className="h-3 w-3 mr-1" />
              Copy Classes
            </Button>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

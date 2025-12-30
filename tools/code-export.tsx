"use client"

import * as React from "react"
import { useState, useMemo, useCallback } from "react"
import {
  ChevronDown, Code, Copy, Check, Download, FileCode, FileText,
  Braces, Hash
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { useInspector } from "../core/inspector-context"

// Export format types
type ExportFormat = "css" | "tailwind" | "react-inline" | "html" | "jsx"

// CSS property to Tailwind class mapping
const cssToTailwind: Record<string, (value: string) => string> = {
  display: (v) => {
    const map: Record<string, string> = {
      block: "block",
      inline: "inline",
      "inline-block": "inline-block",
      flex: "flex",
      "inline-flex": "inline-flex",
      grid: "grid",
      none: "hidden",
    }
    return map[v] || ""
  },
  position: (v) => v,
  "flex-direction": (v) => {
    const map: Record<string, string> = {
      row: "flex-row",
      "row-reverse": "flex-row-reverse",
      column: "flex-col",
      "column-reverse": "flex-col-reverse",
    }
    return map[v] || ""
  },
  "justify-content": (v) => {
    const map: Record<string, string> = {
      "flex-start": "justify-start",
      "flex-end": "justify-end",
      center: "justify-center",
      "space-between": "justify-between",
      "space-around": "justify-around",
      "space-evenly": "justify-evenly",
    }
    return map[v] || ""
  },
  "align-items": (v) => {
    const map: Record<string, string> = {
      "flex-start": "items-start",
      "flex-end": "items-end",
      center: "items-center",
      baseline: "items-baseline",
      stretch: "items-stretch",
    }
    return map[v] || ""
  },
  "text-align": (v) => `text-${v}`,
  "font-weight": (v) => {
    const map: Record<string, string> = {
      "100": "font-thin",
      "200": "font-extralight",
      "300": "font-light",
      "400": "font-normal",
      "500": "font-medium",
      "600": "font-semibold",
      "700": "font-bold",
      "800": "font-extrabold",
      "900": "font-black",
    }
    return map[v] || ""
  },
  overflow: (v) => `overflow-${v}`,
  "overflow-x": (v) => `overflow-x-${v}`,
  "overflow-y": (v) => `overflow-y-${v}`,
  cursor: (v) => `cursor-${v}`,
  opacity: (v) => `opacity-${Math.round(parseFloat(v) * 100)}`,
}

// Convert px value to Tailwind spacing
function pxToTailwindSpacing(px: string): string {
  const value = parseFloat(px)
  if (isNaN(value)) return ""

  // Common Tailwind spacing values
  const spacingMap: Record<number, string> = {
    0: "0",
    1: "px",
    2: "0.5",
    4: "1",
    6: "1.5",
    8: "2",
    10: "2.5",
    12: "3",
    14: "3.5",
    16: "4",
    20: "5",
    24: "6",
    28: "7",
    32: "8",
    36: "9",
    40: "10",
    44: "11",
    48: "12",
    56: "14",
    64: "16",
    80: "20",
    96: "24",
    112: "28",
    128: "32",
    144: "36",
    160: "40",
    176: "44",
    192: "48",
    208: "52",
    224: "56",
    240: "60",
    256: "64",
    288: "72",
    320: "80",
    384: "96",
  }

  return spacingMap[value] || `[${px}]`
}

// Extract inline styles from element
function getInlineStyles(element: HTMLElement): Record<string, string> {
  const styles: Record<string, string> = {}
  const inlineStyle = element.getAttribute("style")

  if (inlineStyle) {
    inlineStyle.split(";").forEach((declaration) => {
      const [prop, value] = declaration.split(":").map((s) => s.trim())
      if (prop && value) {
        styles[prop] = value
      }
    })
  }

  return styles
}

// Get all applied styles (differs from browser defaults)
function getAppliedStyles(element: HTMLElement): Record<string, string> {
  const computed = getComputedStyle(element)
  const temp = document.createElement(element.tagName)
  document.body.appendChild(temp)
  const defaults = getComputedStyle(temp)

  const styles: Record<string, string> = {}
  const importantProps = [
    "display", "position", "top", "right", "bottom", "left", "z-index",
    "width", "height", "min-width", "min-height", "max-width", "max-height",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "flex", "flex-direction", "flex-wrap", "justify-content", "align-items", "gap",
    "grid-template-columns", "grid-template-rows",
    "font-family", "font-size", "font-weight", "line-height", "letter-spacing",
    "text-align", "text-decoration", "text-transform", "color",
    "background", "background-color", "background-image",
    "border", "border-radius", "border-width", "border-style", "border-color",
    "box-shadow", "opacity", "overflow", "cursor", "transform", "transition",
  ]

  importantProps.forEach((prop) => {
    const value = computed.getPropertyValue(prop)
    const defaultValue = defaults.getPropertyValue(prop)

    if (value && value !== defaultValue && value !== "none" && value !== "auto" && value !== "0px") {
      styles[prop] = value
    }
  })

  document.body.removeChild(temp)
  return styles
}

// Convert CSS to camelCase for React
function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
}

export function CodeExport() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeFormat, setActiveFormat] = useState<ExportFormat>("css")
  const [copied, setCopied] = useState(false)
  const [includeDefaults, setIncludeDefaults] = useState(false)

  // Get styles based on mode
  const styles = useMemo(() => {
    if (!selectedElement?.element) return {}
    return includeDefaults
      ? selectedElement.computedStyles
      : getAppliedStyles(selectedElement.element)
  }, [selectedElement, includeDefaults])

  // Generate CSS output
  const cssOutput = useMemo(() => {
    const selector = selectedElement?.id
      ? `#${selectedElement.id}`
      : selectedElement?.classList && selectedElement.classList.length > 0
      ? `.${selectedElement.classList[0]}`
      : selectedElement?.tagName || "element"

    const declarations = Object.entries(styles)
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join("\n")

    return `${selector} {\n${declarations}\n}`
  }, [styles, selectedElement])

  // Generate Tailwind classes
  const tailwindOutput = useMemo(() => {
    const classes: string[] = []

    Object.entries(styles).forEach(([prop, value]) => {
      // Check for direct mapping
      if (cssToTailwind[prop]) {
        const twClass = cssToTailwind[prop](value)
        if (twClass) classes.push(twClass)
        return
      }

      // Handle spacing properties
      if (prop.startsWith("padding")) {
        const side = prop === "padding" ? "" : prop.replace("padding-", "")[0]
        const spacing = pxToTailwindSpacing(value)
        if (spacing) classes.push(`p${side}-${spacing}`)
      } else if (prop.startsWith("margin")) {
        const side = prop === "margin" ? "" : prop.replace("margin-", "")[0]
        const spacing = pxToTailwindSpacing(value)
        if (spacing) classes.push(`m${side}-${spacing}`)
      } else if (prop === "gap") {
        const spacing = pxToTailwindSpacing(value)
        if (spacing) classes.push(`gap-${spacing}`)
      } else if (prop === "width") {
        const spacing = pxToTailwindSpacing(value)
        if (spacing) classes.push(`w-${spacing}`)
      } else if (prop === "height") {
        const spacing = pxToTailwindSpacing(value)
        if (spacing) classes.push(`h-${spacing}`)
      } else if (prop === "font-size") {
        classes.push(`text-[${value}]`)
      } else if (prop === "line-height") {
        classes.push(`leading-[${value}]`)
      } else if (prop === "border-radius") {
        const spacing = pxToTailwindSpacing(value)
        if (spacing) classes.push(`rounded-${spacing}`)
      } else if (prop === "color") {
        classes.push(`text-[${value}]`)
      } else if (prop === "background-color") {
        classes.push(`bg-[${value}]`)
      }
    })

    return `className="${classes.join(" ")}"`
  }, [styles])

  // Generate React inline styles
  const reactInlineOutput = useMemo(() => {
    const styleObj = Object.entries(styles)
      .map(([prop, value]) => {
        const camelProp = toCamelCase(prop)
        return `  ${camelProp}: "${value}"`
      })
      .join(",\n")

    return `style={{\n${styleObj}\n}}`
  }, [styles])

  // Generate HTML output
  const htmlOutput = useMemo(() => {
    if (!selectedElement?.element) return ""

    const element = selectedElement.element.cloneNode(true) as HTMLElement
    // Clean up data attributes from dev tools
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name.startsWith("data-")) {
        element.removeAttribute(attr.name)
      }
    })

    return element.outerHTML
  }, [selectedElement])

  // Generate JSX output
  const jsxOutput = useMemo(() => {
    if (!selectedElement?.element) return ""

    const element = selectedElement.element.cloneNode(true) as HTMLElement
    let html = element.outerHTML

    // Convert to JSX
    html = html
      .replace(/class=/g, "className=")
      .replace(/for=/g, "htmlFor=")
      .replace(/tabindex=/g, "tabIndex=")
      .replace(/colspan=/g, "colSpan=")
      .replace(/rowspan=/g, "rowSpan=")
      .replace(/<!--[\s\S]*?-->/g, "") // Remove comments
      .replace(/style="([^"]+)"/g, (_, styleStr) => {
        const styleObj = styleStr
          .split(";")
          .filter(Boolean)
          .map((decl: string) => {
            const [prop, value] = decl.split(":").map((s: string) => s.trim())
            return `${toCamelCase(prop)}: "${value}"`
          })
          .join(", ")
        return `style={{ ${styleObj} }}`
      })

    return html
  }, [selectedElement])

  // Get current output based on format
  const currentOutput = useMemo(() => {
    switch (activeFormat) {
      case "css":
        return cssOutput
      case "tailwind":
        return tailwindOutput
      case "react-inline":
        return reactInlineOutput
      case "html":
        return htmlOutput
      case "jsx":
        return jsxOutput
      default:
        return ""
    }
  }, [activeFormat, cssOutput, tailwindOutput, reactInlineOutput, htmlOutput, jsxOutput])

  // Copy to clipboard
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(currentOutput)
    setCopied(true)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [currentOutput])

  // Download as file
  const downloadFile = useCallback(() => {
    const extensions: Record<ExportFormat, string> = {
      css: "css",
      tailwind: "txt",
      "react-inline": "tsx",
      html: "html",
      jsx: "jsx",
    }

    const blob = new Blob([currentOutput], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `export-${Date.now()}.${extensions[activeFormat]}`
    a.click()
    URL.revokeObjectURL(url)

    toast.success("File downloaded")
  }, [currentOutput, activeFormat])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-chart-1" />
          <span>Code Export</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {!selectedElement ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Select an element to export its code
          </div>
        ) : (
          <>
            {/* Format tabs */}
            <Tabs value={activeFormat} onValueChange={(v) => setActiveFormat(v as ExportFormat)}>
              <TabsList className="w-full grid grid-cols-5 h-8">
                <TabsTrigger value="css" className="text-[10px] h-6 px-1">
                  <Hash className="h-3 w-3 mr-1" />
                  CSS
                </TabsTrigger>
                <TabsTrigger value="tailwind" className="text-[10px] h-6 px-1">
                  TW
                </TabsTrigger>
                <TabsTrigger value="react-inline" className="text-[10px] h-6 px-1">
                  React
                </TabsTrigger>
                <TabsTrigger value="html" className="text-[10px] h-6 px-1">
                  HTML
                </TabsTrigger>
                <TabsTrigger value="jsx" className="text-[10px] h-6 px-1">
                  JSX
                </TabsTrigger>
              </TabsList>

              <div className="pt-2">
                {/* Options */}
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={includeDefaults}
                      onChange={(e) => setIncludeDefaults(e.target.checked)}
                      className="h-3 w-3"
                    />
                    Include all computed styles
                  </label>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-[--accent-green]" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={downloadFile}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Code output */}
                <ScrollArea className="h-[180px]">
                  <pre className="text-[10px] font-mono bg-muted/50 p-2 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
                    {currentOutput}
                  </pre>
                </ScrollArea>

                {/* Stats */}
                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                  <Badge variant="outline" className="h-4 px-1 text-[9px]">
                    {Object.keys(styles).length} properties
                  </Badge>
                  <Badge variant="outline" className="h-4 px-1 text-[9px]">
                    {currentOutput.length} chars
                  </Badge>
                </div>
              </div>
            </Tabs>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

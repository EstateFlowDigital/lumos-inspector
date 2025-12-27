"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import {
  Palette,
  Type,
  Maximize2,
  Box,
  Circle,
  Layers,
  Download,
  Copy,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"

// Token types
export type TokenCategory = "colors" | "typography" | "spacing" | "sizing" | "radii" | "shadows"

// Design token
export interface DesignToken {
  name: string
  value: string
  category: TokenCategory
  usageCount: number
  elements: string[]
  cssProperty: string
}

// Extracted token set
export interface TokenSet {
  name: string
  timestamp: number
  tokens: DesignToken[]
  statistics: {
    totalTokens: number
    uniqueColors: number
    uniqueFonts: number
    uniqueSpacing: number
  }
}

// Export format
export type ExportFormat = "css" | "scss" | "json" | "tailwind" | "figma"

// Color normalization
function normalizeColor(color: string): string {
  // Convert rgb/rgba to hex
  if (color.startsWith("rgb")) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/)
    if (match) {
      const [, r, g, b] = match
      const hex = [r, g, b].map((c) => parseInt(c).toString(16).padStart(2, "0")).join("")
      return `#${hex}`
    }
  }
  return color
}

// Generate token name
function generateTokenName(value: string, category: TokenCategory, index: number): string {
  const prefix = {
    colors: "color",
    typography: "font",
    spacing: "space",
    sizing: "size",
    radii: "radius",
    shadows: "shadow",
  }[category]

  // Try to create semantic names
  if (category === "colors") {
    const normalized = normalizeColor(value).toLowerCase()
    if (normalized === "#ffffff" || normalized === "white") return `${prefix}-white`
    if (normalized === "#000000" || normalized === "black") return `${prefix}-black`
    if (normalized.includes("transparent")) return `${prefix}-transparent`
  }

  if (category === "spacing" || category === "sizing") {
    const px = parseInt(value)
    if (px === 0) return `${prefix}-0`
    if (px === 4) return `${prefix}-1`
    if (px === 8) return `${prefix}-2`
    if (px === 12) return `${prefix}-3`
    if (px === 16) return `${prefix}-4`
    if (px === 20) return `${prefix}-5`
    if (px === 24) return `${prefix}-6`
    if (px === 32) return `${prefix}-8`
    if (px === 40) return `${prefix}-10`
    if (px === 48) return `${prefix}-12`
    if (px === 64) return `${prefix}-16`
  }

  return `${prefix}-${index + 1}`
}

// Get element selector for display
function getElementSelector(element: Element): string {
  if (element.id) return `#${element.id}`
  const classes = Array.from(element.classList).slice(0, 2)
  if (classes.length > 0) return `${element.tagName.toLowerCase()}.${classes.join(".")}`
  return element.tagName.toLowerCase()
}

// Extract tokens from page
export function extractTokens(root: HTMLElement = document.body): TokenSet {
  const tokens: Map<string, DesignToken> = new Map()

  const addToken = (
    value: string,
    category: TokenCategory,
    cssProperty: string,
    element: Element
  ) => {
    const normalizedValue = category === "colors" ? normalizeColor(value) : value
    const key = `${category}:${normalizedValue}`
    const selector = getElementSelector(element)

    if (tokens.has(key)) {
      const token = tokens.get(key)!
      token.usageCount++
      if (!token.elements.includes(selector)) {
        token.elements.push(selector)
      }
    } else {
      tokens.set(key, {
        name: "", // Will be generated later
        value: normalizedValue,
        category,
        usageCount: 1,
        elements: [selector],
        cssProperty,
      })
    }
  }

  // Traverse all elements
  const elements = root.querySelectorAll("*")
  elements.forEach((element) => {
    const computed = window.getComputedStyle(element)

    // Extract colors
    const colorProperties = ["color", "background-color", "border-color"]
    colorProperties.forEach((prop) => {
      const value = computed.getPropertyValue(prop)
      if (value && value !== "rgba(0, 0, 0, 0)" && value !== "transparent") {
        addToken(value, "colors", prop, element)
      }
    })

    // Extract typography
    const fontSize = computed.getPropertyValue("font-size")
    if (fontSize) addToken(fontSize, "typography", "font-size", element)

    const fontFamily = computed.getPropertyValue("font-family")
    if (fontFamily) addToken(fontFamily, "typography", "font-family", element)

    const fontWeight = computed.getPropertyValue("font-weight")
    if (fontWeight && fontWeight !== "400") addToken(fontWeight, "typography", "font-weight", element)

    const lineHeight = computed.getPropertyValue("line-height")
    if (lineHeight && lineHeight !== "normal") addToken(lineHeight, "typography", "line-height", element)

    // Extract spacing
    const spacingProperties = ["padding", "margin", "gap"]
    spacingProperties.forEach((prop) => {
      const value = computed.getPropertyValue(prop)
      if (value && value !== "0px" && !value.includes("auto")) {
        addToken(value, "spacing", prop, element)
      }
    })

    // Extract sizing
    const sizingProperties = ["width", "height", "max-width", "max-height"]
    sizingProperties.forEach((prop) => {
      const value = computed.getPropertyValue(prop)
      if (value && value !== "auto" && value !== "none" && !value.includes("%")) {
        addToken(value, "sizing", prop, element)
      }
    })

    // Extract border radius
    const borderRadius = computed.getPropertyValue("border-radius")
    if (borderRadius && borderRadius !== "0px") {
      addToken(borderRadius, "radii", "border-radius", element)
    }

    // Extract shadows
    const boxShadow = computed.getPropertyValue("box-shadow")
    if (boxShadow && boxShadow !== "none") {
      addToken(boxShadow, "shadows", "box-shadow", element)
    }
  })

  // Convert to array and sort by usage
  const tokenArray = Array.from(tokens.values())
    .sort((a, b) => b.usageCount - a.usageCount)

  // Generate names
  const categoryCounts: Record<TokenCategory, number> = {
    colors: 0,
    typography: 0,
    spacing: 0,
    sizing: 0,
    radii: 0,
    shadows: 0,
  }

  tokenArray.forEach((token) => {
    token.name = generateTokenName(token.value, token.category, categoryCounts[token.category])
    categoryCounts[token.category]++
  })

  // Calculate statistics
  const statistics = {
    totalTokens: tokenArray.length,
    uniqueColors: tokenArray.filter((t) => t.category === "colors").length,
    uniqueFonts: tokenArray.filter((t) => t.category === "typography").length,
    uniqueSpacing: tokenArray.filter((t) => t.category === "spacing").length,
  }

  return {
    name: "Extracted Tokens",
    timestamp: Date.now(),
    tokens: tokenArray,
    statistics,
  }
}

// Export tokens to different formats
export function exportTokens(tokenSet: TokenSet, format: ExportFormat): string {
  const { tokens } = tokenSet

  switch (format) {
    case "css":
      return `:root {\n${tokens
        .map((t) => `  --${t.name}: ${t.value};`)
        .join("\n")}\n}`

    case "scss":
      return tokens.map((t) => `$${t.name}: ${t.value};`).join("\n")

    case "json":
      const jsonTokens: Record<string, Record<string, { value: string; type: string }>> = {}
      tokens.forEach((t) => {
        if (!jsonTokens[t.category]) jsonTokens[t.category] = {}
        jsonTokens[t.category][t.name] = {
          value: t.value,
          type: t.category,
        }
      })
      return JSON.stringify(jsonTokens, null, 2)

    case "tailwind":
      const tailwindConfig: Record<string, Record<string, string>> = {
        colors: {},
        spacing: {},
        fontSize: {},
        borderRadius: {},
        boxShadow: {},
      }

      tokens.forEach((t) => {
        if (t.category === "colors") {
          tailwindConfig.colors[t.name.replace("color-", "")] = t.value
        } else if (t.category === "spacing") {
          tailwindConfig.spacing[t.name.replace("space-", "")] = t.value
        } else if (t.category === "typography" && t.cssProperty === "font-size") {
          tailwindConfig.fontSize[t.name.replace("font-", "")] = t.value
        } else if (t.category === "radii") {
          tailwindConfig.borderRadius[t.name.replace("radius-", "")] = t.value
        } else if (t.category === "shadows") {
          tailwindConfig.boxShadow[t.name.replace("shadow-", "")] = t.value
        }
      })

      return `module.exports = {
  theme: {
    extend: ${JSON.stringify(tailwindConfig, null, 6).replace(/"/g, "'")}
  }
}`

    case "figma":
      // Figma-style tokens
      const figmaTokens = tokens.map((t) => ({
        name: t.name,
        value: t.value,
        type: t.category,
        description: `Used ${t.usageCount} times`,
      }))
      return JSON.stringify(figmaTokens, null, 2)

    default:
      return ""
  }
}

// Token category icons
const categoryIcons: Record<TokenCategory, React.ReactNode> = {
  colors: <Palette className="h-4 w-4" />,
  typography: <Type className="h-4 w-4" />,
  spacing: <Box className="h-4 w-4" />,
  sizing: <Maximize2 className="h-4 w-4" />,
  radii: <Circle className="h-4 w-4" />,
  shadows: <Layers className="h-4 w-4" />,
}

// Token card component
interface TokenCardProps {
  token: DesignToken
  onCopy: () => void
}

function TokenCard({ token, onCopy }: TokenCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(token.value)
    setCopied(true)
    onCopy()
    setTimeout(() => setCopied(false), 2000)
  }, [token.value, onCopy])

  return (
    <div className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Color preview for color tokens */}
      {token.category === "colors" && (
        <div
          className="w-8 h-8 rounded border flex-shrink-0"
          style={{ backgroundColor: token.value }}
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-sm font-medium">{token.name}</code>
          <Badge variant="secondary" className="text-xs">
            {token.usageCount}×
          </Badge>
        </div>
        <code className="text-xs text-muted-foreground truncate block">
          {token.value}
        </code>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}

// Category section component
interface CategorySectionProps {
  category: TokenCategory
  tokens: DesignToken[]
  onCopy: () => void
}

function CategorySection({ category, tokens, onCopy }: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  const categoryNames: Record<TokenCategory, string> = {
    colors: "Colors",
    typography: "Typography",
    spacing: "Spacing",
    sizing: "Sizing",
    radii: "Border Radius",
    shadows: "Shadows",
  }

  if (tokens.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {categoryIcons[category]}
          <span className="font-medium">{categoryNames[category]}</span>
        </div>
        <Badge variant="outline">{tokens.length}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 px-2 pb-2">
        {tokens.map((token) => (
          <TokenCard key={token.name} token={token} onCopy={onCopy} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

// Main extractor panel
interface DesignTokenExtractorProps {
  className?: string
}

export function DesignTokenExtractor({ className }: DesignTokenExtractorProps) {
  const [tokenSet, setTokenSet] = useState<TokenSet | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>("css")
  const [copyCount, setCopyCount] = useState(0)

  const runExtraction = useCallback(() => {
    setIsExtracting(true)
    setTimeout(() => {
      const result = extractTokens()
      setTokenSet(result)
      setIsExtracting(false)
    }, 100)
  }, [])

  const handleExport = useCallback(() => {
    if (!tokenSet) return

    const output = exportTokens(tokenSet, exportFormat)
    const extensions: Record<ExportFormat, string> = {
      css: "css",
      scss: "scss",
      json: "json",
      tailwind: "js",
      figma: "json",
    }

    const blob = new Blob([output], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `design-tokens.${extensions[exportFormat]}`
    a.click()
    URL.revokeObjectURL(url)
  }, [tokenSet, exportFormat])

  const handleCopyAll = useCallback(() => {
    if (!tokenSet) return
    const output = exportTokens(tokenSet, exportFormat)
    navigator.clipboard.writeText(output)
  }, [tokenSet, exportFormat])

  const groupedTokens = useMemo(() => {
    if (!tokenSet) return null

    const groups: Record<TokenCategory, DesignToken[]> = {
      colors: [],
      typography: [],
      spacing: [],
      sizing: [],
      radii: [],
      shadows: [],
    }

    tokenSet.tokens.forEach((token) => {
      groups[token.category].push(token)
    })

    return groups
  }, [tokenSet])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          <h2 className="font-semibold">Design Tokens</h2>
        </div>
        <Button size="sm" onClick={runExtraction} disabled={isExtracting}>
          <RefreshCw className={cn("h-4 w-4 mr-1", isExtracting && "animate-spin")} />
          {isExtracting ? "Extracting..." : "Extract"}
        </Button>
      </div>

      {tokenSet ? (
        <>
          {/* Statistics */}
          <div className="p-4 border-b">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-lg font-bold">{tokenSet.statistics.totalTokens}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-lg font-bold">{tokenSet.statistics.uniqueColors}</div>
                <div className="text-xs text-muted-foreground">Colors</div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-lg font-bold">{tokenSet.statistics.uniqueFonts}</div>
                <div className="text-xs text-muted-foreground">Fonts</div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-lg font-bold">{tokenSet.statistics.uniqueSpacing}</div>
                <div className="text-xs text-muted-foreground">Spacing</div>
              </div>
            </div>
          </div>

          {/* Token list */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {groupedTokens && (
                <>
                  <CategorySection
                    category="colors"
                    tokens={groupedTokens.colors}
                    onCopy={() => setCopyCount((c) => c + 1)}
                  />
                  <CategorySection
                    category="typography"
                    tokens={groupedTokens.typography}
                    onCopy={() => setCopyCount((c) => c + 1)}
                  />
                  <CategorySection
                    category="spacing"
                    tokens={groupedTokens.spacing}
                    onCopy={() => setCopyCount((c) => c + 1)}
                  />
                  <CategorySection
                    category="sizing"
                    tokens={groupedTokens.sizing}
                    onCopy={() => setCopyCount((c) => c + 1)}
                  />
                  <CategorySection
                    category="radii"
                    tokens={groupedTokens.radii}
                    onCopy={() => setCopyCount((c) => c + 1)}
                  />
                  <CategorySection
                    category="shadows"
                    tokens={groupedTokens.shadows}
                    onCopy={() => setCopyCount((c) => c + 1)}
                  />
                </>
              )}
            </div>
          </ScrollArea>

          {/* Export options */}
          <div className="p-4 border-t space-y-3">
            <div className="flex gap-2">
              <Select
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as ExportFormat)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="css">CSS Variables</SelectItem>
                  <SelectItem value="scss">SCSS Variables</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="tailwind">Tailwind Config</SelectItem>
                  <SelectItem value="figma">Figma Tokens</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleCopyAll}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
          <Palette className="h-12 w-12 mb-4 opacity-50" />
          <h3 className="font-medium mb-2">Extract Design Tokens</h3>
          <p className="text-sm text-center mb-4">
            Analyze your page to discover colors, typography, spacing, and more
          </p>
          <Button onClick={runExtraction}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Start Extraction
          </Button>
        </div>
      )}
    </div>
  )
}

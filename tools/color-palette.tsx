"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Palette, RefreshCw, Copy, Download, Pipette,
  Plus, Trash2, Shuffle
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Input } from "../ui/input"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { useInspector } from "../core/inspector-context"

interface ColorInfo {
  hex: string
  rgb: string
  hsl: string
  count: number
  source: string
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

// Parse color to RGB
function parseColor(color: string): [number, number, number] | null {
  // Handle hex
  if (color.startsWith("#")) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ]
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ]
    }
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])]
  }

  return null
}

// Convert RGB to Hex
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")
}

// Extract colors from page
function extractColors(): ColorInfo[] {
  const colorMap = new Map<string, { count: number; source: string }>()

  const processElement = (element: Element) => {
    if (element.hasAttribute("data-devtools")) return

    const computed = getComputedStyle(element)
    const properties = [
      { prop: "color", source: "text" },
      { prop: "backgroundColor", source: "background" },
      { prop: "borderColor", source: "border" },
      { prop: "outlineColor", source: "outline" },
    ]

    properties.forEach(({ prop, source }) => {
      const value = computed[prop as keyof CSSStyleDeclaration] as string
      if (!value || value === "rgba(0, 0, 0, 0)" || value === "transparent") return

      const rgb = parseColor(value)
      if (!rgb) return

      const hex = rgbToHex(...rgb).toLowerCase()

      if (colorMap.has(hex)) {
        const existing = colorMap.get(hex)!
        existing.count++
      } else {
        colorMap.set(hex, { count: 1, source })
      }
    })
  }

  document.querySelectorAll("*").forEach(processElement)

  return Array.from(colorMap.entries())
    .map(([hex, { count, source }]) => {
      const rgb = parseColor(hex)!
      const hsl = rgbToHsl(...rgb)
      return {
        hex,
        rgb: `rgb(${rgb.join(", ")})`,
        hsl: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`,
        count,
        source,
      }
    })
    .sort((a, b) => b.count - a.count)
}

// Generate complementary colors
function generateComplementary(hex: string): string[] {
  const rgb = parseColor(hex)
  if (!rgb) return []

  const hsl = rgbToHsl(...rgb)

  // Complementary (opposite on color wheel)
  const complementary = (hsl[0] + 180) % 360

  // Analogous (30 degrees apart)
  const analogous1 = (hsl[0] + 30) % 360
  const analogous2 = (hsl[0] - 30 + 360) % 360

  // Triadic (120 degrees apart)
  const triadic1 = (hsl[0] + 120) % 360
  const triadic2 = (hsl[0] + 240) % 360

  const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100
    l /= 100

    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2

    let r = 0, g = 0, b = 0

    if (h < 60) { r = c; g = x; b = 0 }
    else if (h < 120) { r = x; g = c; b = 0 }
    else if (h < 180) { r = 0; g = c; b = x }
    else if (h < 240) { r = 0; g = x; b = c }
    else if (h < 300) { r = x; g = 0; b = c }
    else { r = c; g = 0; b = x }

    return rgbToHex(
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    )
  }

  return [
    hslToHex(complementary, hsl[1], hsl[2]),
    hslToHex(analogous1, hsl[1], hsl[2]),
    hslToHex(analogous2, hsl[1], hsl[2]),
    hslToHex(triadic1, hsl[1], hsl[2]),
    hslToHex(triadic2, hsl[1], hsl[2]),
  ]
}

// Generate shade variations
function generateShades(hex: string): string[] {
  const rgb = parseColor(hex)
  if (!rgb) return []

  const hsl = rgbToHsl(...rgb)
  const shades: string[] = []

  // Generate 5 lighter and 5 darker shades
  for (let i = 10; i <= 90; i += 10) {
    const newL = i
    const c = (1 - Math.abs(2 * (newL / 100) - 1)) * (hsl[1] / 100)
    const x = c * (1 - Math.abs(((hsl[0] / 60) % 2) - 1))
    const m = newL / 100 - c / 2

    let r = 0, g = 0, b = 0
    const h = hsl[0]

    if (h < 60) { r = c; g = x; b = 0 }
    else if (h < 120) { r = x; g = c; b = 0 }
    else if (h < 180) { r = 0; g = c; b = x }
    else if (h < 240) { r = 0; g = x; b = c }
    else if (h < 300) { r = x; g = 0; b = c }
    else { r = c; g = 0; b = x }

    shades.push(rgbToHex(
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ))
  }

  return shades
}

export function ColorPalette() {
  const { isOpen } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [colors, setColors] = useState<ColorInfo[]>([])
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [customColors, setCustomColors] = useState<string[]>([])
  const [newColor, setNewColor] = useState("#3b82f6")

  // Extract colors on mount
  useEffect(() => {
    setColors(extractColors())
  }, [])

  // Refresh colors
  const refresh = useCallback(() => {
    setColors(extractColors())
    toast.success("Colors refreshed")
  }, [])

  // Copy color
  const copyColor = useCallback((color: string, format: "hex" | "rgb" | "hsl" = "hex") => {
    const colorInfo = colors.find((c) => c.hex === color)
    let value = color

    if (colorInfo) {
      if (format === "rgb") value = colorInfo.rgb
      else if (format === "hsl") value = colorInfo.hsl
    }

    navigator.clipboard.writeText(value)
    toast.success(`Copied ${value}`)
  }, [colors])

  // Add custom color
  const addCustomColor = useCallback(() => {
    if (!newColor) return
    if (customColors.includes(newColor.toLowerCase())) {
      toast.error("Color already added")
      return
    }
    setCustomColors((prev) => [...prev, newColor.toLowerCase()])
    toast.success("Color added")
  }, [newColor, customColors])

  // Remove custom color
  const removeCustomColor = useCallback((color: string) => {
    setCustomColors((prev) => prev.filter((c) => c !== color))
  }, [])

  // Export palette
  const exportPalette = useCallback(() => {
    const allColors = [...colors.map((c) => c.hex), ...customColors]
    const css = `:root {\n${allColors.map((c, i) => `  --color-${i + 1}: ${c};`).join("\n")}\n}`
    navigator.clipboard.writeText(css)
    toast.success("Exported as CSS variables")
  }, [colors, customColors])

  // Generated colors for selected
  const generatedColors = useMemo(() => {
    if (!selectedColor) return { complementary: [], shades: [] }
    return {
      complementary: generateComplementary(selectedColor),
      shades: generateShades(selectedColor),
    }
  }, [selectedColor])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-chart-1" />
          <span>Color Palette</span>
          <Badge variant="secondary" className="text-[10px] px-1 h-4">
            {colors.length}
          </Badge>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 flex-1" onClick={refresh}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-7 flex-1" onClick={exportPalette}>
            <Download className="h-3 w-3 mr-1" />
            Export CSS
          </Button>
        </div>

        {/* Extracted colors */}
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">
            Extracted Colors ({colors.length})
          </Label>
          <ScrollArea className="h-[80px]">
            <div className="flex flex-wrap gap-1">
              {colors.slice(0, 20).map((color) => (
                <Tooltip key={color.hex}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "w-6 h-6 rounded border-2 transition-all",
                        selectedColor === color.hex
                          ? "border-primary scale-110"
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => setSelectedColor(color.hex)}
                      onDoubleClick={() => copyColor(color.hex)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div className="font-mono">{color.hex}</div>
                      <div className="text-muted-foreground">Used {color.count}x ({color.source})</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Selected color details */}
        {selectedColor && (
          <div className="p-2 rounded-md bg-muted/50 space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: selectedColor }}
              />
              <div className="flex-1">
                <div className="font-mono text-xs">{selectedColor}</div>
                <div className="text-[10px] text-muted-foreground">
                  {colors.find((c) => c.hex === selectedColor)?.rgb}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyColor(selectedColor, "hex")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Complementary colors */}
            <div>
              <Label className="text-[10px] text-muted-foreground">Complementary</Label>
              <div className="flex gap-1 mt-1">
                {generatedColors.complementary.map((c, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <button
                        className="w-5 h-5 rounded border hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        onClick={() => copyColor(c)}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="font-mono text-xs">{c}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Shades */}
            <div>
              <Label className="text-[10px] text-muted-foreground">Shades</Label>
              <div className="flex gap-0.5 mt-1">
                {generatedColors.shades.map((c, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <button
                        className="flex-1 h-4 first:rounded-l last:rounded-r hover:scale-y-125 transition-transform"
                        style={{ backgroundColor: c }}
                        onClick={() => copyColor(c)}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="font-mono text-xs">{c}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Custom colors */}
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">Custom Colors</Label>
          <div className="flex gap-1 mb-2">
            <Input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-7 p-0.5"
            />
            <Input
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="flex-1 h-7 text-xs font-mono"
            />
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={addCustomColor}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {customColors.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {customColors.map((color) => (
                <div key={color} className="relative group">
                  <button
                    className="w-6 h-6 rounded border hover:scale-105 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => copyColor(color)}
                  />
                  <button
                    className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    onClick={() => removeCustomColor(color)}
                  >
                    <Trash2 className="h-2 w-2 text-destructive-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

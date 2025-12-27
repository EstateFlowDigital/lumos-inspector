"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Type, RefreshCw, Copy, ExternalLink
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Separator } from "../ui/separator"
import { useInspector } from "../core/inspector-context"

interface FontInfo {
  family: string
  weight: string
  size: string
  lineHeight: string
  letterSpacing: string
  color: string
  style: string
  variant: string
  stretch: string
}

interface FontUsage {
  family: string
  weights: Set<string>
  sizes: Set<string>
  count: number
}

// Extract font info from element
function getFontInfo(element: HTMLElement): FontInfo {
  const computed = getComputedStyle(element)
  return {
    family: computed.fontFamily,
    weight: computed.fontWeight,
    size: computed.fontSize,
    lineHeight: computed.lineHeight,
    letterSpacing: computed.letterSpacing,
    color: computed.color,
    style: computed.fontStyle,
    variant: computed.fontVariant,
    stretch: computed.fontStretch,
  }
}

// Scan all fonts in document
function scanFonts(): FontUsage[] {
  const fontMap = new Map<string, FontUsage>()

  document.querySelectorAll("*").forEach((el) => {
    if ((el as HTMLElement).hasAttribute?.("data-devtools")) return

    const computed = getComputedStyle(el)
    const family = computed.fontFamily.split(",")[0].trim().replace(/['"]/g, "")
    const weight = computed.fontWeight
    const size = computed.fontSize

    if (!fontMap.has(family)) {
      fontMap.set(family, {
        family,
        weights: new Set(),
        sizes: new Set(),
        count: 0,
      })
    }

    const usage = fontMap.get(family)!
    usage.weights.add(weight)
    usage.sizes.add(size)
    usage.count++
  })

  return Array.from(fontMap.values()).sort((a, b) => b.count - a.count)
}

// Get weight name
function getWeightName(weight: string): string {
  const names: Record<string, string> = {
    "100": "Thin",
    "200": "Extra Light",
    "300": "Light",
    "400": "Regular",
    "500": "Medium",
    "600": "Semi Bold",
    "700": "Bold",
    "800": "Extra Bold",
    "900": "Black",
  }
  return names[weight] || weight
}

export function FontInspector() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [fontInfo, setFontInfo] = useState<FontInfo | null>(null)
  const [allFonts, setAllFonts] = useState<FontUsage[]>([])
  const [selectedFont, setSelectedFont] = useState<string | null>(null)

  // Get font info from selected element
  useEffect(() => {
    if (selectedElement?.element) {
      setFontInfo(getFontInfo(selectedElement.element))
    } else {
      setFontInfo(null)
    }
  }, [selectedElement])

  // Scan all fonts
  const scanAllFonts = useCallback(() => {
    const fonts = scanFonts()
    setAllFonts(fonts)
    toast.success(`Found ${fonts.length} font families`)
  }, [])

  // Copy font CSS
  const copyFontCSS = useCallback(() => {
    if (!fontInfo) return

    const css = `font-family: ${fontInfo.family};
font-size: ${fontInfo.size};
font-weight: ${fontInfo.weight};
line-height: ${fontInfo.lineHeight};
letter-spacing: ${fontInfo.letterSpacing};`

    navigator.clipboard.writeText(css)
    toast.success("Font CSS copied")
  }, [fontInfo])

  // Primary font family (first in stack)
  const primaryFamily = useMemo(() => {
    if (!fontInfo) return ""
    return fontInfo.family.split(",")[0].trim().replace(/['"]/g, "")
  }, [fontInfo])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-chart-5" />
          <span>Font Inspector</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Selected element font */}
        {selectedElement && fontInfo ? (
          <div className="space-y-3">
            {/* Font preview */}
            <div
              className="p-3 bg-muted/50 rounded-md text-center"
              style={{
                fontFamily: fontInfo.family,
                fontWeight: fontInfo.weight,
                fontSize: "24px",
                lineHeight: fontInfo.lineHeight,
                letterSpacing: fontInfo.letterSpacing,
                fontStyle: fontInfo.style,
              }}
            >
              Aa Bb Cc 123
            </div>

            {/* Font details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-[10px] text-muted-foreground mb-1">Family</div>
                <div className="font-medium truncate" title={fontInfo.family}>
                  {primaryFamily}
                </div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-[10px] text-muted-foreground mb-1">Weight</div>
                <div className="font-medium">
                  {fontInfo.weight} ({getWeightName(fontInfo.weight)})
                </div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-[10px] text-muted-foreground mb-1">Size</div>
                <div className="font-medium">{fontInfo.size}</div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-[10px] text-muted-foreground mb-1">Line Height</div>
                <div className="font-medium">{fontInfo.lineHeight}</div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-[10px] text-muted-foreground mb-1">Letter Spacing</div>
                <div className="font-medium">{fontInfo.letterSpacing}</div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-[10px] text-muted-foreground mb-1">Style</div>
                <div className="font-medium capitalize">{fontInfo.style}</div>
              </div>
            </div>

            {/* Color swatch */}
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
              <div
                className="w-6 h-6 rounded border"
                style={{ backgroundColor: fontInfo.color }}
              />
              <div className="text-xs">
                <div className="text-[10px] text-muted-foreground">Color</div>
                <div className="font-mono">{fontInfo.color}</div>
              </div>
            </div>

            {/* Actions */}
            <Button variant="outline" size="sm" className="w-full h-7" onClick={copyFontCSS}>
              <Copy className="h-3 w-3 mr-1" />
              Copy Font CSS
            </Button>
          </div>
        ) : (
          <div className="text-center py-2 text-xs text-muted-foreground">
            Select an element to inspect its font
          </div>
        )}

        <Separator />

        {/* All fonts in document */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">All Fonts</span>
            <Button variant="ghost" size="sm" className="h-6" onClick={scanAllFonts}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Scan
            </Button>
          </div>

          <ScrollArea className="h-[150px]">
            <div className="space-y-1">
              {allFonts.length === 0 ? (
                <div className="text-center py-4 text-[10px] text-muted-foreground">
                  Click Scan to find all fonts
                </div>
              ) : (
                allFonts.map((font) => (
                  <div
                    key={font.family}
                    className={cn(
                      "p-2 rounded-md cursor-pointer hover:bg-muted/50",
                      selectedFont === font.family && "bg-muted"
                    )}
                    onClick={() => setSelectedFont(selectedFont === font.family ? null : font.family)}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-sm font-medium truncate"
                        style={{ fontFamily: font.family }}
                      >
                        {font.family}
                      </span>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">
                        {font.count}x
                      </Badge>
                    </div>

                    {selectedFont === font.family && (
                      <div className="mt-2 pt-2 border-t space-y-1">
                        <div className="text-[10px] text-muted-foreground">
                          Weights: {Array.from(font.weights).sort().map(getWeightName).join(", ")}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Sizes: {Array.from(font.sizes).slice(0, 5).join(", ")}
                          {font.sizes.size > 5 && ` +${font.sizes.size - 5} more`}
                        </div>
                        <div
                          className="text-lg py-2"
                          style={{ fontFamily: font.family }}
                        >
                          The quick brown fox jumps over the lazy dog
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

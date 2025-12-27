"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import {
  ChevronDown, Type, RefreshCw, AlertTriangle
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface TypographyUsage {
  size: string
  weight: string
  family: string
  count: number
  elements: HTMLElement[]
}

interface TypeScale {
  name: string
  size: number
  ratio?: number
}

// Common type scales
const typeScales: TypeScale[] = [
  { name: "xs", size: 12 },
  { name: "sm", size: 14 },
  { name: "base", size: 16 },
  { name: "lg", size: 18 },
  { name: "xl", size: 20 },
  { name: "2xl", size: 24 },
  { name: "3xl", size: 30 },
  { name: "4xl", size: 36 },
  { name: "5xl", size: 48 },
  { name: "6xl", size: 60 },
  { name: "7xl", size: 72 },
  { name: "8xl", size: 96 },
  { name: "9xl", size: 128 },
]

export function TypographyScaleAnalyzer() {
  const { isOpen, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [usage, setUsage] = useState<TypographyUsage[]>([])
  const [issues, setIssues] = useState<string[]>([])

  // Scan typography
  const scan = useCallback(() => {
    const usageMap = new Map<string, TypographyUsage>()
    const foundIssues: string[] = []

    document.querySelectorAll("*").forEach(el => {
      if ((el as HTMLElement).hasAttribute?.("data-devtools")) return

      const computed = getComputedStyle(el)
      const size = computed.fontSize
      const weight = computed.fontWeight
      const family = computed.fontFamily.split(",")[0].replace(/['"]/g, "").trim()

      // Skip if no text content
      if (!(el as HTMLElement).innerText?.trim()) return

      const key = `${size}|${weight}|${family}`

      if (!usageMap.has(key)) {
        usageMap.set(key, {
          size,
          weight,
          family,
          count: 0,
          elements: [],
        })
      }

      const entry = usageMap.get(key)!
      entry.count++
      if (entry.elements.length < 5) {
        entry.elements.push(el as HTMLElement)
      }
    })

    // Sort by count
    const sorted = Array.from(usageMap.values()).sort((a, b) => b.count - a.count)
    setUsage(sorted)

    // Check for issues
    const sizes = new Set(sorted.map(u => parseFloat(u.size)))
    const weights = new Set(sorted.map(u => u.weight))
    const families = new Set(sorted.map(u => u.family))

    if (sizes.size > 10) {
      foundIssues.push(`${sizes.size} different font sizes (consider consolidating)`)
    }

    if (weights.size > 4) {
      foundIssues.push(`${weights.size} different font weights (consider limiting to 3-4)`)
    }

    if (families.size > 3) {
      foundIssues.push(`${families.size} different font families (consider using fewer)`)
    }

    // Check for off-scale sizes
    const offScale = sorted.filter(u => {
      const px = parseFloat(u.size)
      return !typeScales.some(s => Math.abs(s.size - px) < 1)
    })

    if (offScale.length > 0) {
      foundIssues.push(`${offScale.length} sizes don't match standard type scale`)
    }

    setIssues(foundIssues)
    toast.success(`Found ${sorted.length} typography combinations`)
  }, [])

  // Select element
  const selectElement = useCallback((el: HTMLElement) => {
    const computed = getComputedStyle(el)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: el,
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      classList: Array.from(el.classList),
      rect: el.getBoundingClientRect(),
      computedStyles,
    })

    el.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [setSelectedElement])

  // Get weight name
  const getWeightName = (weight: string): string => {
    const names: Record<string, string> = {
      "100": "Thin", "200": "ExtraLight", "300": "Light",
      "400": "Regular", "500": "Medium", "600": "SemiBold",
      "700": "Bold", "800": "ExtraBold", "900": "Black",
    }
    return names[weight] || weight
  }

  // Check if size matches scale
  const matchesScale = (size: string): boolean => {
    const px = parseFloat(size)
    return typeScales.some(s => Math.abs(s.size - px) < 1)
  }

  // Stats
  const stats = useMemo(() => ({
    sizes: new Set(usage.map(u => u.size)).size,
    weights: new Set(usage.map(u => u.weight)).size,
    families: new Set(usage.map(u => u.family)).size,
  }), [usage])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-purple-500" />
          <span>Typography Scale</span>
          {issues.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1 h-4">
              {issues.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Scan button */}
        <Button variant="default" size="sm" className="w-full h-7" onClick={scan}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Analyze Typography
        </Button>

        {/* Stats */}
        {usage.length > 0 && (
          <div className="flex gap-2 text-[10px]">
            <Badge variant="secondary" className="px-1">
              {stats.sizes} sizes
            </Badge>
            <Badge variant="secondary" className="px-1">
              {stats.weights} weights
            </Badge>
            <Badge variant="secondary" className="px-1">
              {stats.families} fonts
            </Badge>
          </div>
        )}

        {/* Issues */}
        {issues.length > 0 && (
          <div className="space-y-1">
            {issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded text-[10px]">
                <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        )}

        {/* Type scale reference */}
        <div className="p-2 bg-muted/30 rounded">
          <div className="text-[10px] font-medium mb-2">Standard Type Scale</div>
          <div className="flex flex-wrap gap-1">
            {typeScales.slice(0, 8).map(s => (
              <Badge key={s.name} variant="outline" className="text-[9px] h-4 px-1">
                {s.name}: {s.size}px
              </Badge>
            ))}
          </div>
        </div>

        {/* Usage list */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {usage.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Click Analyze to scan typography usage
              </div>
            ) : (
              usage.map((u, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-2 rounded cursor-pointer hover:bg-muted/50",
                    !matchesScale(u.size) && "bg-yellow-500/10 border border-yellow-500/20"
                  )}
                  onClick={() => u.elements[0] && selectElement(u.elements[0])}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-bold"
                        style={{
                          fontSize: Math.min(parseFloat(u.size), 24),
                          fontWeight: u.weight,
                        }}
                      >
                        Aa
                      </span>
                      <span className="text-xs font-mono">{u.size}</span>
                    </div>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1">
                      {u.count}x
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{getWeightName(u.weight)}</span>
                    <span>•</span>
                    <span className="truncate">{u.family}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  )
}

"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import {
  ChevronDown, Contrast, RefreshCw, Check, X, AlertTriangle, Pipette
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface ContrastResult {
  foreground: string
  background: string
  ratio: number
  aa: boolean
  aaLarge: boolean
  aaa: boolean
  aaaLarge: boolean
}

interface ContrastIssue {
  element: HTMLElement
  label: string
  foreground: string
  background: string
  ratio: number
  level: "fail" | "aa-large" | "aa" | "aaa"
}

// Parse color to RGB
function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    }
  }

  // Handle hex
  const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
    }
  }

  // Short hex
  const shortHexMatch = color.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i)
  if (shortHexMatch) {
    return {
      r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
      g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
      b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16),
    }
  }

  return null
}

// Calculate relative luminance
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

// Calculate contrast ratio
function getContrastRatio(fg: string, bg: string): number {
  const fgColor = parseColor(fg)
  const bgColor = parseColor(bg)

  if (!fgColor || !bgColor) return 0

  const fgLum = getLuminance(fgColor.r, fgColor.g, fgColor.b)
  const bgLum = getLuminance(bgColor.r, bgColor.g, bgColor.b)

  const lighter = Math.max(fgLum, bgLum)
  const darker = Math.min(fgLum, bgLum)

  return (lighter + 0.05) / (darker + 0.05)
}

// Check WCAG levels
function checkWCAG(ratio: number): ContrastResult["aa" | "aaLarge" | "aaa" | "aaaLarge"] {
  return {
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  } as any
}

// Get element label
function getElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ""
  const cls = el.classList.length > 0 ? `.${Array.from(el.classList)[0]}` : ""
  return `${tag}${id}${cls}`.substring(0, 25)
}

// Get effective background color (walk up tree)
function getEffectiveBackground(el: HTMLElement): string {
  let current: HTMLElement | null = el

  while (current) {
    const bg = getComputedStyle(current).backgroundColor
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      return bg
    }
    current = current.parentElement
  }

  return "rgb(255, 255, 255)" // Default white
}

export function ColorContrastChecker() {
  const { isOpen, selectedElement, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [foreground, setForeground] = useState("#000000")
  const [background, setBackground] = useState("#ffffff")
  const [issues, setIssues] = useState<ContrastIssue[]>([])

  // Calculate contrast for manual colors
  const manualResult = useMemo((): ContrastResult => {
    const ratio = getContrastRatio(foreground, background)
    return {
      foreground,
      background,
      ratio,
      aa: ratio >= 4.5,
      aaLarge: ratio >= 3,
      aaa: ratio >= 7,
      aaaLarge: ratio >= 4.5,
    }
  }, [foreground, background])

  // Load colors from selected element
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)
    const fg = computed.color
    const bg = getEffectiveBackground(selectedElement.element)

    setForeground(fg)
    setBackground(bg)
  }, [selectedElement])

  // Scan for issues
  const scan = useCallback(() => {
    const found: ContrastIssue[] = []

    document.querySelectorAll("*").forEach(el => {
      const htmlEl = el as HTMLElement
      if (htmlEl.hasAttribute("data-devtools")) return

      // Only check elements with text
      const hasDirectText = Array.from(htmlEl.childNodes).some(
        node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      )

      if (!hasDirectText) return

      const computed = getComputedStyle(htmlEl)
      const fg = computed.color
      const bg = getEffectiveBackground(htmlEl)

      const ratio = getContrastRatio(fg, bg)

      if (ratio < 4.5) {
        let level: ContrastIssue["level"] = "fail"
        if (ratio >= 3) level = "aa-large"
        else if (ratio >= 4.5) level = "aa"

        found.push({
          element: htmlEl,
          label: getElementLabel(htmlEl),
          foreground: fg,
          background: bg,
          ratio,
          level,
        })
      }
    })

    setIssues(found.slice(0, 50))

    if (found.length === 0) {
      toast.success("No contrast issues found!")
    } else {
      toast.warning(`Found ${found.length} contrast issue(s)`)
    }
  }, [])

  // Select issue
  const selectIssue = useCallback((issue: ContrastIssue) => {
    const computed = getComputedStyle(issue.element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: issue.element,
      tagName: issue.element.tagName.toLowerCase(),
      id: issue.element.id,
      classList: Array.from(issue.element.classList),
      rect: issue.element.getBoundingClientRect(),
      computedStyles,
    })

    setForeground(issue.foreground)
    setBackground(issue.background)

    issue.element.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [setSelectedElement])

  // Swap colors
  const swapColors = useCallback(() => {
    setForeground(background)
    setBackground(foreground)
  }, [foreground, background])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Contrast className="h-4 w-4 text-yellow-500" />
          <span>Contrast Checker</span>
          {issues.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1 h-4">
              {issues.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Manual color inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Foreground</Label>
            <div className="flex gap-1">
              <input
                type="color"
                value={foreground.startsWith("#") ? foreground : "#000000"}
                onChange={(e) => setForeground(e.target.value)}
                className="w-8 h-7 rounded cursor-pointer"
              />
              <Input
                value={foreground}
                onChange={(e) => setForeground(e.target.value)}
                className="h-7 text-[10px] font-mono flex-1"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Background</Label>
            <div className="flex gap-1">
              <input
                type="color"
                value={background.startsWith("#") ? background : "#ffffff"}
                onChange={(e) => setBackground(e.target.value)}
                className="w-8 h-7 rounded cursor-pointer"
              />
              <Input
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="h-7 text-[10px] font-mono flex-1"
              />
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-6 text-[10px]"
          onClick={swapColors}
        >
          Swap Colors
        </Button>

        {/* Preview */}
        <div
          className="p-4 rounded text-center"
          style={{ backgroundColor: background, color: foreground }}
        >
          <div className="text-lg font-bold">Sample Text</div>
          <div className="text-sm">Regular body text</div>
        </div>

        {/* Ratio display */}
        <div className="text-center">
          <div className="text-2xl font-bold">{manualResult.ratio.toFixed(2)}:1</div>
          <div className="text-xs text-muted-foreground">Contrast Ratio</div>
        </div>

        {/* WCAG results */}
        <div className="grid grid-cols-2 gap-2">
          <div className={cn(
            "p-2 rounded text-center",
            manualResult.aa ? "bg-green-500/10" : "bg-destructive/10"
          )}>
            <div className="flex items-center justify-center gap-1 text-xs font-medium">
              {manualResult.aa ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-destructive" />}
              AA Normal
            </div>
            <div className="text-[10px] text-muted-foreground">≥4.5:1</div>
          </div>
          <div className={cn(
            "p-2 rounded text-center",
            manualResult.aaLarge ? "bg-green-500/10" : "bg-destructive/10"
          )}>
            <div className="flex items-center justify-center gap-1 text-xs font-medium">
              {manualResult.aaLarge ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-destructive" />}
              AA Large
            </div>
            <div className="text-[10px] text-muted-foreground">≥3:1</div>
          </div>
          <div className={cn(
            "p-2 rounded text-center",
            manualResult.aaa ? "bg-green-500/10" : "bg-destructive/10"
          )}>
            <div className="flex items-center justify-center gap-1 text-xs font-medium">
              {manualResult.aaa ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-destructive" />}
              AAA Normal
            </div>
            <div className="text-[10px] text-muted-foreground">≥7:1</div>
          </div>
          <div className={cn(
            "p-2 rounded text-center",
            manualResult.aaaLarge ? "bg-green-500/10" : "bg-destructive/10"
          )}>
            <div className="flex items-center justify-center gap-1 text-xs font-medium">
              {manualResult.aaaLarge ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-destructive" />}
              AAA Large
            </div>
            <div className="text-[10px] text-muted-foreground">≥4.5:1</div>
          </div>
        </div>

        {/* Scan button */}
        <Button variant="default" size="sm" className="w-full h-7" onClick={scan}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Scan Page for Issues
        </Button>

        {/* Issues list */}
        {issues.length > 0 && (
          <ScrollArea className="h-[150px]">
            <div className="space-y-1">
              {issues.map((issue, i) => (
                <div
                  key={i}
                  className="p-2 bg-destructive/10 border border-destructive/20 rounded cursor-pointer hover:bg-destructive/20"
                  onClick={() => selectIssue(issue)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono truncate">{issue.label}</span>
                    <Badge variant="destructive" className="text-[9px] h-4 px-1">
                      {issue.ratio.toFixed(2)}:1
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: issue.foreground }}
                    />
                    <span className="text-[10px]">on</span>
                    <span
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: issue.background }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

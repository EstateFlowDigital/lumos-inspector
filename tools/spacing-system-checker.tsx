"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import {
  ChevronDown, Ruler, RefreshCw, AlertTriangle, CheckCircle
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface SpacingIssue {
  element: HTMLElement
  property: string
  value: string
  expected: string[]
  label: string
}

// Common spacing scales
const spacingScales = {
  "4px": [0, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96],
  "8px": [0, 8, 16, 24, 32, 40, 48, 64, 80, 96, 128],
  tailwind: [0, 1, 2, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96],
  "bootstrap": [0, 4, 8, 16, 24, 48],
}

// Get element label
function getElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ""
  const cls = el.classList.length > 0 ? `.${Array.from(el.classList)[0]}` : ""
  return `${tag}${id}${cls}`.substring(0, 25)
}

// Check if value matches scale
function matchesScale(value: number, scale: number[]): boolean {
  return scale.includes(value)
}

// Find nearest values
function findNearest(value: number, scale: number[]): string[] {
  const sorted = [...scale].sort((a, b) => Math.abs(a - value) - Math.abs(b - value))
  return sorted.slice(0, 2).map(v => `${v}px`)
}

export function SpacingSystemChecker() {
  const { isOpen, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [scale, setScale] = useState<keyof typeof spacingScales>("4px")
  const [issues, setIssues] = useState<SpacingIssue[]>([])
  const [stats, setStats] = useState({ total: 0, valid: 0, invalid: 0 })

  // Scan for spacing issues
  const scan = useCallback(() => {
    const currentScale = spacingScales[scale]
    const foundIssues: SpacingIssue[] = []
    let total = 0
    let valid = 0
    let invalid = 0

    const spacingProps = [
      "margin-top", "margin-right", "margin-bottom", "margin-left",
      "padding-top", "padding-right", "padding-bottom", "padding-left",
      "gap", "row-gap", "column-gap",
    ]

    document.querySelectorAll("*").forEach(el => {
      if ((el as HTMLElement).hasAttribute?.("data-devtools")) return

      const computed = getComputedStyle(el)

      spacingProps.forEach(prop => {
        const value = computed.getPropertyValue(prop)
        const numValue = parseFloat(value)

        if (!isNaN(numValue) && numValue !== 0) {
          total++

          if (matchesScale(numValue, currentScale)) {
            valid++
          } else {
            invalid++
            foundIssues.push({
              element: el as HTMLElement,
              property: prop,
              value: `${numValue}px`,
              expected: findNearest(numValue, currentScale),
              label: getElementLabel(el as HTMLElement),
            })
          }
        }
      })
    })

    setIssues(foundIssues.slice(0, 50)) // Limit to 50
    setStats({ total, valid, invalid })

    if (invalid === 0) {
      toast.success("All spacing follows the scale!")
    } else {
      toast.warning(`Found ${invalid} spacing inconsistencies`)
    }
  }, [scale])

  // Select issue element
  const selectIssue = useCallback((issue: SpacingIssue) => {
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

    issue.element.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [setSelectedElement])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-blue-500" />
          <span>Spacing Checker</span>
          {issues.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1 h-4">
              {issues.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Scale selector */}
        <div className="flex gap-2">
          <Select value={scale} onValueChange={(v) => setScale(v as keyof typeof spacingScales)}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4px" className="text-xs">4px Grid</SelectItem>
              <SelectItem value="8px" className="text-xs">8px Grid</SelectItem>
              <SelectItem value="tailwind" className="text-xs">Tailwind</SelectItem>
              <SelectItem value="bootstrap" className="text-xs">Bootstrap</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="default" size="sm" className="h-7" onClick={scan}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Scan
          </Button>
        </div>

        {/* Scale reference */}
        <div className="p-2 bg-muted/30 rounded">
          <div className="text-[10px] font-medium mb-1">Scale Values</div>
          <div className="flex flex-wrap gap-1 text-[9px] font-mono">
            {spacingScales[scale].slice(0, 12).map(v => (
              <Badge key={v} variant="outline" className="h-4 px-1">
                {v}
              </Badge>
            ))}
            {spacingScales[scale].length > 12 && <span>...</span>}
          </div>
        </div>

        {/* Stats */}
        {stats.total > 0 && (
          <div className="flex gap-2 text-[10px]">
            <Badge variant="secondary" className="px-1">
              Total: {stats.total}
            </Badge>
            <Badge className="px-1 bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Valid: {stats.valid}
            </Badge>
            <Badge variant="destructive" className="px-1">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Issues: {stats.invalid}
            </Badge>
          </div>
        )}

        {/* Issues list */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {issues.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Click Scan to check spacing consistency
              </div>
            ) : (
              issues.map((issue, i) => (
                <div
                  key={i}
                  className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded cursor-pointer hover:bg-yellow-500/20"
                  onClick={() => selectIssue(issue)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono">{issue.label}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {issue.property}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-red-500">
                      Current: {issue.value}
                    </span>
                    <span className="text-green-500">
                      Suggested: {issue.expected.join(" or ")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Compliance score */}
        {stats.total > 0 && (
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-2xl font-bold">
              {Math.round((stats.valid / stats.total) * 100)}%
            </div>
            <div className="text-[10px] text-muted-foreground">
              Spacing Compliance
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

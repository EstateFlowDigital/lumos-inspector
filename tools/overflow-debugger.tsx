"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  ChevronDown, Maximize2, RefreshCw, AlertTriangle, Eye, EyeOff, ArrowRight
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface OverflowIssue {
  element: HTMLElement
  label: string
  type: "horizontal" | "vertical" | "both"
  scrollWidth: number
  scrollHeight: number
  clientWidth: number
  clientHeight: number
  overflowX: string
  overflowY: string
}

// Get element label
function getElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ""
  const cls = el.classList.length > 0 ? `.${Array.from(el.classList)[0]}` : ""
  return `${tag}${id}${cls}`.substring(0, 30)
}

export function OverflowDebugger() {
  const { isOpen, setSelectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [issues, setIssues] = useState<OverflowIssue[]>([])
  const [showOutlines, setShowOutlines] = useState(false)
  const [includeHidden, setIncludeHidden] = useState(false)

  // Scan for overflow issues
  const scan = useCallback(() => {
    const found: OverflowIssue[] = []

    document.querySelectorAll("*").forEach(el => {
      const htmlEl = el as HTMLElement
      if (htmlEl.hasAttribute("data-devtools")) return

      const computed = getComputedStyle(htmlEl)
      const overflowX = computed.overflowX
      const overflowY = computed.overflowY

      // Skip if overflow is explicitly set to scroll/auto (intentional scrolling)
      if (!includeHidden) {
        if (overflowX === "scroll" || overflowX === "auto" ||
            overflowY === "scroll" || overflowY === "auto") {
          return
        }
      }

      const scrollWidth = htmlEl.scrollWidth
      const scrollHeight = htmlEl.scrollHeight
      const clientWidth = htmlEl.clientWidth
      const clientHeight = htmlEl.clientHeight

      const hasHorizontalOverflow = scrollWidth > clientWidth + 1
      const hasVerticalOverflow = scrollHeight > clientHeight + 1

      if (hasHorizontalOverflow || hasVerticalOverflow) {
        found.push({
          element: htmlEl,
          label: getElementLabel(htmlEl),
          type: hasHorizontalOverflow && hasVerticalOverflow
            ? "both"
            : hasHorizontalOverflow
              ? "horizontal"
              : "vertical",
          scrollWidth,
          scrollHeight,
          clientWidth,
          clientHeight,
          overflowX,
          overflowY,
        })
      }
    })

    setIssues(found)

    if (found.length === 0) {
      toast.success("No overflow issues found!")
    } else {
      toast.warning(`Found ${found.length} overflow issue(s)`)
    }
  }, [includeHidden])

  // Toggle outlines
  useEffect(() => {
    if (showOutlines && issues.length > 0) {
      issues.forEach(issue => {
        issue.element.style.outline = "2px dashed red"
        issue.element.style.outlineOffset = "-2px"
      })
    } else {
      issues.forEach(issue => {
        issue.element.style.outline = ""
        issue.element.style.outlineOffset = ""
      })
    }

    return () => {
      issues.forEach(issue => {
        issue.element.style.outline = ""
        issue.element.style.outlineOffset = ""
      })
    }
  }, [showOutlines, issues])

  // Select element
  const selectIssue = useCallback((issue: OverflowIssue) => {
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

  // Fix overflow
  const fixOverflow = useCallback((issue: OverflowIssue, solution: "hidden" | "scroll" | "auto") => {
    if (issue.type === "horizontal" || issue.type === "both") {
      issue.element.style.overflowX = solution
    }
    if (issue.type === "vertical" || issue.type === "both") {
      issue.element.style.overflowY = solution
    }
    notifyStyleChange()
    toast.success(`Applied overflow: ${solution}`)
    scan()
  }, [scan, notifyStyleChange])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Maximize2 className="h-4 w-4 text-red-500" />
          <span>Overflow Debugger</span>
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
          Scan for Overflow
        </Button>

        {/* Options */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Show outlines</Label>
            <Switch checked={showOutlines} onCheckedChange={setShowOutlines} />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Include scrollable</Label>
            <Switch checked={includeHidden} onCheckedChange={setIncludeHidden} />
          </div>
        </div>

        {/* Issues list */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {issues.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Click Scan to find overflow issues
              </div>
            ) : (
              issues.map((issue, i) => (
                <div
                  key={i}
                  className="p-2 bg-destructive/10 border border-destructive/30 rounded cursor-pointer"
                  onClick={() => selectIssue(issue)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono truncate">{issue.label}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {issue.type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                    <div className="text-muted-foreground">
                      Scroll: {issue.scrollWidth}×{issue.scrollHeight}
                    </div>
                    <div className="text-muted-foreground">
                      Client: {issue.clientWidth}×{issue.clientHeight}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px]">
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                    <span className="text-muted-foreground">
                      Overflow by{" "}
                      {issue.type === "horizontal" || issue.type === "both"
                        ? `${issue.scrollWidth - issue.clientWidth}px`
                        : ""}
                      {issue.type === "both" ? " × " : ""}
                      {issue.type === "vertical" || issue.type === "both"
                        ? `${issue.scrollHeight - issue.clientHeight}px`
                        : ""}
                    </span>
                  </div>

                  {/* Quick fixes */}
                  <div className="flex gap-1 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-5 text-[9px] px-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        fixOverflow(issue, "hidden")
                      }}
                    >
                      Hide
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-5 text-[9px] px-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        fixOverflow(issue, "scroll")
                      }}
                    >
                      Scroll
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-5 text-[9px] px-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        fixOverflow(issue, "auto")
                      }}
                    >
                      Auto
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Tips */}
        <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
          <div className="font-medium mb-1">Common fixes:</div>
          <ul className="list-disc list-inside space-y-0.5">
            <li>overflow: hidden - clips content</li>
            <li>overflow: auto - shows scrollbar when needed</li>
            <li>word-break: break-word - for text overflow</li>
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

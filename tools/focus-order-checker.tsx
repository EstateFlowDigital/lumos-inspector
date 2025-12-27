"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  ChevronDown, Focus, Play, Square, SkipForward, AlertTriangle, CheckCircle
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

interface FocusableElement {
  element: HTMLElement
  index: number
  tabIndex: number
  label: string
  tagName: string
  hasIssue: boolean
  issueType?: "skip" | "negative" | "hidden" | "no-indicator"
}

// Get element label
function getElementLabel(el: HTMLElement): string {
  // Try aria-label first
  const ariaLabel = el.getAttribute("aria-label")
  if (ariaLabel) return ariaLabel.substring(0, 30)

  // Try innerText for buttons/links
  if (el.tagName === "BUTTON" || el.tagName === "A") {
    const text = el.textContent?.trim()
    if (text) return text.substring(0, 30)
  }

  // Try placeholder for inputs
  if (el.tagName === "INPUT") {
    const placeholder = (el as HTMLInputElement).placeholder
    if (placeholder) return placeholder.substring(0, 30)
  }

  // Try name attribute
  const name = el.getAttribute("name")
  if (name) return name

  // Fallback to tag + id/class
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ""
  const cls = el.classList.length > 0 ? `.${Array.from(el.classList)[0]}` : ""
  return `${tag}${id}${cls}`.substring(0, 30)
}

// Check if element is visible
function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el)
  return style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    el.offsetWidth > 0 &&
    el.offsetHeight > 0
}

// Check if element has focus indicator
function hasFocusIndicator(el: HTMLElement): boolean {
  const style = getComputedStyle(el)
  const focusStyle = getComputedStyle(el, ":focus")

  // Check for outline
  if (focusStyle.outline !== "none" && focusStyle.outlineWidth !== "0px") {
    return true
  }

  // Check for box-shadow (common focus indicator)
  if (focusStyle.boxShadow !== "none") {
    return true
  }

  // Check for border change
  if (focusStyle.borderColor !== style.borderColor) {
    return true
  }

  return true // Can't reliably detect all focus styles
}

export function FocusOrderChecker() {
  const { isOpen, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [focusables, setFocusables] = useState<FocusableElement[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [showOverlay, setShowOverlay] = useState(true)
  const [issues, setIssues] = useState<FocusableElement[]>([])

  // Scan for focusable elements
  const scan = useCallback(() => {
    const selector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]",
      "[contenteditable]",
    ].join(", ")

    const elements = document.querySelectorAll(selector)
    const found: FocusableElement[] = []
    const foundIssues: FocusableElement[] = []

    elements.forEach((el, i) => {
      const htmlEl = el as HTMLElement
      if (htmlEl.hasAttribute("data-devtools")) return

      const tabIndex = htmlEl.tabIndex
      const visible = isVisible(htmlEl)

      const focusable: FocusableElement = {
        element: htmlEl,
        index: i,
        tabIndex,
        label: getElementLabel(htmlEl),
        tagName: htmlEl.tagName.toLowerCase(),
        hasIssue: false,
      }

      // Check for issues
      if (tabIndex < 0) {
        focusable.hasIssue = true
        focusable.issueType = "negative"
        foundIssues.push(focusable)
      } else if (!visible) {
        focusable.hasIssue = true
        focusable.issueType = "hidden"
        foundIssues.push(focusable)
      }

      if (tabIndex >= 0 && visible) {
        found.push(focusable)
      }
    })

    // Sort by tabindex (0s maintain DOM order, positive numbers first)
    found.sort((a, b) => {
      if (a.tabIndex === 0 && b.tabIndex === 0) return a.index - b.index
      if (a.tabIndex === 0) return 1
      if (b.tabIndex === 0) return -1
      return a.tabIndex - b.tabIndex
    })

    // Re-index after sorting
    found.forEach((f, i) => f.index = i)

    setFocusables(found)
    setIssues(foundIssues)
    setCurrentIndex(-1)

    toast.success(`Found ${found.length} focusable elements`)
  }, [])

  // Play through focus order
  const play = useCallback(() => {
    setIsPlaying(true)
    setCurrentIndex(0)
  }, [])

  // Stop playing
  const stop = useCallback(() => {
    setIsPlaying(false)
    setCurrentIndex(-1)
  }, [])

  // Step to next element
  const stepNext = useCallback(() => {
    if (currentIndex < focusables.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setIsPlaying(false)
    }
  }, [currentIndex, focusables.length])

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying || currentIndex < 0) return

    const element = focusables[currentIndex]?.element
    if (element) {
      element.focus()
      element.scrollIntoView({ behavior: "smooth", block: "center" })
    }

    const timer = setTimeout(() => {
      if (currentIndex < focusables.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        setIsPlaying(false)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [isPlaying, currentIndex, focusables])

  // Select element
  const selectElement = useCallback((item: FocusableElement) => {
    const computed = getComputedStyle(item.element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: item.element,
      tagName: item.tagName,
      id: item.element.id,
      classList: Array.from(item.element.classList),
      rect: item.element.getBoundingClientRect(),
      computedStyles,
    })

    item.element.focus()
    item.element.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [setSelectedElement])

  if (!isOpen) return null

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
          <div className="flex items-center gap-2">
            <Focus className="h-4 w-4 text-sky-500" />
            <span>Focus Order</span>
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
            <Focus className="h-3 w-3 mr-1" />
            Scan Focus Order
          </Button>

          {/* Playback controls */}
          {focusables.length > 0 && (
            <div className="flex gap-2">
              {!isPlaying ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7"
                  onClick={play}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Play
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7"
                  onClick={stop}
                >
                  <Square className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={stepNext}
                disabled={currentIndex >= focusables.length - 1}
              >
                <SkipForward className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Show overlay toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Show order numbers</Label>
            <Switch checked={showOverlay} onCheckedChange={setShowOverlay} />
          </div>

          {/* Progress */}
          {focusables.length > 0 && (
            <div className="text-[10px] text-muted-foreground text-center">
              {currentIndex >= 0 ? `${currentIndex + 1} / ${focusables.length}` : `${focusables.length} elements`}
            </div>
          )}

          {/* Issues */}
          {issues.length > 0 && (
            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded">
              <div className="flex items-center gap-1 text-xs font-medium text-destructive mb-1">
                <AlertTriangle className="h-3 w-3" />
                {issues.length} Issues Found
              </div>
              <div className="space-y-1">
                {issues.slice(0, 5).map((issue, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground">
                    {issue.label}: {issue.issueType === "negative" ? "negative tabindex" : "hidden"}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Focus order list */}
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {focusables.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Click Scan to analyze focus order
                </div>
              ) : (
                focusables.map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-2 rounded cursor-pointer",
                      currentIndex === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/30 hover:bg-muted/50"
                    )}
                    onClick={() => selectElement(item)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                        currentIndex === i ? "bg-primary-foreground text-primary" : "bg-muted"
                      )}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono truncate">{item.label}</div>
                        <div className="flex items-center gap-1 text-[10px] opacity-70">
                          <Badge variant="outline" className="h-4 px-1 text-[9px]">
                            {item.tagName}
                          </Badge>
                          {item.tabIndex > 0 && (
                            <span>tabindex={item.tabIndex}</span>
                          )}
                        </div>
                      </div>
                      {item.hasIssue ? (
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      ) : (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Tips */}
          <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
            <div className="font-medium mb-1">Accessibility Tips:</div>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Focus order should be logical</li>
              <li>All interactive elements should be focusable</li>
              <li>Avoid positive tabindex values</li>
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Focus order overlay */}
      {showOverlay && focusables.length > 0 && (
        <>
          {focusables.map((item, i) => {
            const rect = item.element.getBoundingClientRect()
            return (
              <div
                key={i}
                className="fixed pointer-events-none z-9988"
                data-devtools
                style={{
                  left: rect.left - 2,
                  top: rect.top - 2,
                }}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                  currentIndex === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-sky-500 text-white"
                )}>
                  {i + 1}
                </div>
              </div>
            )
          })}
        </>
      )}
    </>
  )
}

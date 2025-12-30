"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, AlertTriangle, AlertCircle, CheckCircle, Info,
  Eye, Type, Link, Image, FormInput, Heading, Contrast, Focus,
  RefreshCw, FileText
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Progress } from "../ui/progress"
import { useInspector } from "../core/inspector-context"

// Issue severity levels
type Severity = "error" | "warning" | "info" | "pass"

interface A11yIssue {
  id: string
  element: HTMLElement
  type: string
  severity: Severity
  message: string
  recommendation: string
  wcag?: string
}

// Check color contrast ratio
function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    // Parse color to RGB
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return 0.5

    ctx.fillStyle = color
    const computedColor = ctx.fillStyle

    let r: number, g: number, b: number

    if (computedColor.startsWith("#")) {
      const hex = computedColor.slice(1)
      r = parseInt(hex.slice(0, 2), 16) / 255
      g = parseInt(hex.slice(2, 4), 16) / 255
      b = parseInt(hex.slice(4, 6), 16) / 255
    } else if (computedColor.startsWith("rgb")) {
      const match = computedColor.match(/\d+/g)
      if (!match) return 0.5
      r = parseInt(match[0]) / 255
      g = parseInt(match[1]) / 255
      b = parseInt(match[2]) / 255
    } else {
      return 0.5
    }

    const [lr, lg, lb] = [r, g, b].map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    )

    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
  }

  const l1 = getLuminance(color1)
  const l2 = getLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

// Check if element is visible
function isElementVisible(element: HTMLElement): boolean {
  const style = getComputedStyle(element)
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  )
}

// Run accessibility checks
function runA11yChecks(root: HTMLElement = document.body): A11yIssue[] {
  const issues: A11yIssue[] = []
  let issueCounter = 0

  // Check images for alt text
  const images = root.querySelectorAll("img")
  images.forEach((img) => {
    if (!isElementVisible(img as HTMLElement)) return

    const alt = img.getAttribute("alt")
    if (!alt) {
      issues.push({
        id: `img-${issueCounter++}`,
        element: img as HTMLElement,
        type: "image",
        severity: "error",
        message: "Image missing alt text",
        recommendation: "Add an alt attribute describing the image content",
        wcag: "1.1.1",
      })
    } else if (alt.length < 5 && !img.hasAttribute("role")) {
      issues.push({
        id: `img-${issueCounter++}`,
        element: img as HTMLElement,
        type: "image",
        severity: "warning",
        message: "Image alt text may be too short",
        recommendation: "Consider adding more descriptive alt text",
        wcag: "1.1.1",
      })
    }
  })

  // Check form inputs for labels
  const formInputs = root.querySelectorAll("input, select, textarea")
  formInputs.forEach((input) => {
    if (!isElementVisible(input as HTMLElement)) return
    if ((input as HTMLInputElement).type === "hidden") return

    const id = input.id
    const ariaLabel = input.getAttribute("aria-label")
    const ariaLabelledBy = input.getAttribute("aria-labelledby")
    const hasLabel = id && root.querySelector(`label[for="${id}"]`)
    const parentLabel = input.closest("label")

    if (!ariaLabel && !ariaLabelledBy && !hasLabel && !parentLabel) {
      issues.push({
        id: `input-${issueCounter++}`,
        element: input as HTMLElement,
        type: "form",
        severity: "error",
        message: "Form input missing label",
        recommendation: "Add a label element, aria-label, or aria-labelledby",
        wcag: "1.3.1",
      })
    }
  })

  // Check buttons for accessible names
  const buttons = root.querySelectorAll("button, [role='button']")
  buttons.forEach((button) => {
    if (!isElementVisible(button as HTMLElement)) return

    const text = button.textContent?.trim()
    const ariaLabel = button.getAttribute("aria-label")
    const title = button.getAttribute("title")

    if (!text && !ariaLabel && !title) {
      issues.push({
        id: `button-${issueCounter++}`,
        element: button as HTMLElement,
        type: "button",
        severity: "error",
        message: "Button missing accessible name",
        recommendation: "Add text content, aria-label, or title attribute",
        wcag: "4.1.2",
      })
    }
  })

  // Check links for accessible names
  const links = root.querySelectorAll("a[href]")
  links.forEach((link) => {
    if (!isElementVisible(link as HTMLElement)) return

    const text = link.textContent?.trim()
    const ariaLabel = link.getAttribute("aria-label")
    const title = link.getAttribute("title")

    if (!text && !ariaLabel && !title) {
      issues.push({
        id: `link-${issueCounter++}`,
        element: link as HTMLElement,
        type: "link",
        severity: "error",
        message: "Link missing accessible name",
        recommendation: "Add text content or aria-label",
        wcag: "2.4.4",
      })
    }

    const href = link.getAttribute("href")
    if (href === "#" || href === "javascript:void(0)") {
      issues.push({
        id: `link-${issueCounter++}`,
        element: link as HTMLElement,
        type: "link",
        severity: "warning",
        message: "Link has non-functional href",
        recommendation: "Use a button for actions or provide a meaningful href",
        wcag: "2.4.4",
      })
    }
  })

  // Check heading hierarchy
  const headings = root.querySelectorAll("h1, h2, h3, h4, h5, h6")
  let lastLevel = 0
  let hasH1 = false

  headings.forEach((heading) => {
    if (!isElementVisible(heading as HTMLElement)) return

    const level = parseInt(heading.tagName[1])

    if (level === 1) hasH1 = true

    if (level > lastLevel + 1 && lastLevel !== 0) {
      issues.push({
        id: `heading-${issueCounter++}`,
        element: heading as HTMLElement,
        type: "heading",
        severity: "warning",
        message: `Heading level skipped (h${lastLevel} to h${level})`,
        recommendation: "Use sequential heading levels for proper document structure",
        wcag: "1.3.1",
      })
    }

    lastLevel = level
  })

  if (headings.length > 0 && !hasH1) {
    const firstHeading = headings[0] as HTMLElement
    issues.push({
      id: `heading-${issueCounter++}`,
      element: firstHeading,
      type: "heading",
      severity: "warning",
      message: "Page missing h1 heading",
      recommendation: "Add an h1 heading for the main page title",
      wcag: "1.3.1",
    })
  }

  // Check color contrast on text elements
  const textElements = root.querySelectorAll("p, span, div, a, button, label, h1, h2, h3, h4, h5, h6, li, td, th")
  textElements.forEach((el) => {
    if (!isElementVisible(el as HTMLElement)) return
    if (el.children.length > 0) return // Skip parent elements

    const style = getComputedStyle(el)
    const text = el.textContent?.trim()

    if (!text) return

    const fontSize = parseFloat(style.fontSize)
    const fontWeight = parseInt(style.fontWeight) || 400
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700)

    const color = style.color
    const bgColor = style.backgroundColor

    // Only check if we can determine both colors
    if (bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent") {
      const ratio = getContrastRatio(color, bgColor)
      const minRatio = isLargeText ? 3 : 4.5

      if (ratio < minRatio) {
        issues.push({
          id: `contrast-${issueCounter++}`,
          element: el as HTMLElement,
          type: "contrast",
          severity: ratio < 2 ? "error" : "warning",
          message: `Low color contrast ratio (${ratio.toFixed(2)}:1)`,
          recommendation: `Minimum ratio should be ${minRatio}:1 for ${isLargeText ? "large" : "normal"} text`,
          wcag: "1.4.3",
        })
      }
    }
  })

  // Check for focusable elements without visible focus indicators
  const focusableElements = root.querySelectorAll(
    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  focusableElements.forEach((el) => {
    if (!isElementVisible(el as HTMLElement)) return

    const style = getComputedStyle(el)
    const outlineStyle = style.outlineStyle
    const outlineWidth = parseFloat(style.outlineWidth)

    // This is a simplified check - actual focus styles require more complex detection
    if (outlineStyle === "none" && outlineWidth === 0) {
      // Check if there's a focus-visible or focus class that might add styles
      const hasFocusClass = el.className.includes("focus")

      if (!hasFocusClass) {
        issues.push({
          id: `focus-${issueCounter++}`,
          element: el as HTMLElement,
          type: "focus",
          severity: "info",
          message: "Element may lack visible focus indicator",
          recommendation: "Ensure focus is visible when using keyboard navigation",
          wcag: "2.4.7",
        })
      }
    }
  })

  // Check for ARIA attributes
  const ariaElements = root.querySelectorAll("[role]")
  ariaElements.forEach((el) => {
    const role = el.getAttribute("role")

    // Check for valid roles
    const validRoles = [
      "alert", "alertdialog", "application", "article", "banner", "button",
      "cell", "checkbox", "columnheader", "combobox", "complementary", "contentinfo",
      "definition", "dialog", "directory", "document", "feed", "figure", "form",
      "grid", "gridcell", "group", "heading", "img", "link", "list", "listbox",
      "listitem", "log", "main", "marquee", "math", "menu", "menubar", "menuitem",
      "menuitemcheckbox", "menuitemradio", "navigation", "none", "note", "option",
      "presentation", "progressbar", "radio", "radiogroup", "region", "row",
      "rowgroup", "rowheader", "scrollbar", "search", "searchbox", "separator",
      "slider", "spinbutton", "status", "switch", "tab", "table", "tablist",
      "tabpanel", "term", "textbox", "timer", "toolbar", "tooltip", "tree",
      "treegrid", "treeitem"
    ]

    if (role && !validRoles.includes(role)) {
      issues.push({
        id: `aria-${issueCounter++}`,
        element: el as HTMLElement,
        type: "aria",
        severity: "warning",
        message: `Invalid ARIA role: "${role}"`,
        recommendation: "Use a valid ARIA role",
        wcag: "4.1.2",
      })
    }
  })

  return issues
}

// Get icon for issue type
function getIssueTypeIcon(type: string) {
  switch (type) {
    case "image":
      return Image
    case "form":
      return FormInput
    case "button":
      return Focus
    case "link":
      return Link
    case "heading":
      return Heading
    case "contrast":
      return Contrast
    case "focus":
      return Focus
    case "aria":
      return FileText
    default:
      return AlertCircle
  }
}

// Get severity color and icon
function getSeverityInfo(severity: Severity) {
  switch (severity) {
    case "error":
      return { color: "text-[--destructive]", bgColor: "bg-[--destructive]/10", icon: AlertCircle }
    case "warning":
      return { color: "text-[--accent-amber]", bgColor: "bg-[--accent-amber]/10", icon: AlertTriangle }
    case "info":
      return { color: "text-[--accent-blue]", bgColor: "bg-[--accent-blue]/10", icon: Info }
    case "pass":
      return { color: "text-[--accent-green]", bgColor: "bg-[--accent-green]/10", icon: CheckCircle }
  }
}

export function AccessibilityChecker() {
  const { isOpen, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [issues, setIssues] = useState<A11yIssue[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  // Run accessibility check
  const runCheck = useCallback(() => {
    setIsChecking(true)

    // Exclude dev tools from check
    const devToolElements = document.querySelectorAll("[data-devtools]")
    devToolElements.forEach((el) => el.setAttribute("data-a11y-skip", "true"))

    setTimeout(() => {
      const foundIssues = runA11yChecks()
      setIssues(foundIssues)
      setIsChecking(false)
      setLastChecked(new Date())

      devToolElements.forEach((el) => el.removeAttribute("data-a11y-skip"))

      if (foundIssues.length === 0) {
        toast.success("No accessibility issues found!")
      } else {
        const errors = foundIssues.filter((i) => i.severity === "error").length
        const warnings = foundIssues.filter((i) => i.severity === "warning").length
        toast.info(`Found ${errors} errors and ${warnings} warnings`)
      }
    }, 100)
  }, [])

  // Group issues by type
  const groupedIssues = useMemo(() => {
    const groups: Record<string, A11yIssue[]> = {}
    issues.forEach((issue) => {
      if (!groups[issue.type]) {
        groups[issue.type] = []
      }
      groups[issue.type].push(issue)
    })
    return groups
  }, [issues])

  // Calculate score
  const score = useMemo(() => {
    if (issues.length === 0) return 100

    const errors = issues.filter((i) => i.severity === "error").length
    const warnings = issues.filter((i) => i.severity === "warning").length

    // Simple scoring: -10 for errors, -3 for warnings
    const deductions = errors * 10 + warnings * 3
    return Math.max(0, Math.min(100, 100 - deductions))
  }, [issues])

  // Select issue element
  const selectIssue = useCallback((issue: A11yIssue) => {
    issue.element.scrollIntoView({ behavior: "smooth", block: "center" })

    const tagName = issue.element.tagName.toLowerCase()
    const id = issue.element.id
    const classList = Array.from(issue.element.classList)
    const rect = issue.element.getBoundingClientRect()

    // Convert CSSStyleDeclaration to Record<string, string>
    const computed = getComputedStyle(issue.element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: issue.element,
      tagName,
      id,
      classList,
      rect,
      computedStyles,
    })
  }, [setSelectedElement])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-chart-4" />
          <span>Accessibility</span>
          {issues.length > 0 && (
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] px-1 h-4",
                issues.some((i) => i.severity === "error") && "bg-[--destructive]/10 text-[--destructive]"
              )}
            >
              {issues.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Score and Run Check */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Score</span>
              <span
                className={cn(
                  "font-medium",
                  score >= 80 && "text-[--accent-green]",
                  score >= 50 && score < 80 && "text-[--accent-amber]",
                  score < 50 && "text-[--destructive]"
                )}
              >
                {score}/100
              </span>
            </div>
            <Progress
              value={score}
              className={cn(
                "h-2",
                score >= 80 && "[&>div]:bg-[--accent-green]",
                score >= 50 && score < 80 && "[&>div]:bg-[--accent-amber]",
                score < 50 && "[&>div]:bg-[--destructive]"
              )}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={runCheck}
            disabled={isChecking}
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", isChecking && "animate-spin")} />
            {isChecking ? "Checking..." : "Run Check"}
          </Button>
        </div>

        {lastChecked && (
          <div className="text-[10px] text-muted-foreground">
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
        )}

        {/* Summary */}
        {issues.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {(["error", "warning", "info"] as Severity[]).map((severity) => {
              const count = issues.filter((i) => i.severity === severity).length
              const info = getSeverityInfo(severity)
              const Icon = info.icon
              return (
                <div
                  key={severity}
                  className={cn("flex items-center gap-1 p-2 rounded", info.bgColor)}
                >
                  <Icon className={cn("h-3 w-3", info.color)} />
                  <span className="text-xs font-medium">{count}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{severity}s</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Issues list */}
        {issues.length > 0 && (
          <ScrollArea className="h-[200px]">
            <div className="space-y-3">
              {Object.entries(groupedIssues).map(([type, typeIssues]) => {
                const TypeIcon = getIssueTypeIcon(type)
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      <TypeIcon className="h-3 w-3" />
                      {type} ({typeIssues.length})
                    </div>
                    <div className="space-y-1">
                      {typeIssues.map((issue) => {
                        const info = getSeverityInfo(issue.severity)
                        const SeverityIcon = info.icon
                        return (
                          <div
                            key={issue.id}
                            className={cn(
                              "p-2 rounded-md cursor-pointer hover:bg-muted/50 border-l-2",
                              issue.severity === "error" && "border-l-red-500",
                              issue.severity === "warning" && "border-l-yellow-500",
                              issue.severity === "info" && "border-l-blue-500"
                            )}
                            onClick={() => selectIssue(issue)}
                          >
                            <div className="flex items-start gap-2">
                              <SeverityIcon className={cn("h-3 w-3 mt-0.5 flex-shrink-0", info.color)} />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium">{issue.message}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  {issue.recommendation}
                                </div>
                                {issue.wcag && (
                                  <Badge variant="outline" className="mt-1 text-[9px] h-4 px-1">
                                    WCAG {issue.wcag}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        {issues.length === 0 && lastChecked && (
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 text-[--accent-green] mx-auto mb-2" />
            <p className="text-sm font-medium">All checks passed!</p>
            <p className="text-xs text-muted-foreground">No accessibility issues detected</p>
          </div>
        )}

        {!lastChecked && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Click "Run Check" to scan for accessibility issues
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

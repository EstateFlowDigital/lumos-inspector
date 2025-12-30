"use client"

import * as React from "react"
import { useState, useCallback, useMemo, useEffect } from "react"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  X,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Eye,
  Contrast,
  Type,
  Navigation,
  Image,
  FormInput,
  Link2,
  Heading,
  FileText,
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Progress } from "../ui/progress"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible"

// WCAG conformance levels
export type WCAGLevel = "A" | "AA" | "AAA"

// Issue severity
export type IssueSeverity = "error" | "warning" | "notice"

// Issue categories
export type IssueCategory =
  | "color-contrast"
  | "images"
  | "forms"
  | "links"
  | "headings"
  | "landmarks"
  | "keyboard"
  | "focus"
  | "aria"
  | "structure"

// Accessibility issue
export interface AccessibilityIssue {
  id: string
  category: IssueCategory
  severity: IssueSeverity
  wcagCriteria: string
  wcagLevel: WCAGLevel
  title: string
  description: string
  element: HTMLElement
  selector: string
  recommendation: string
  helpUrl?: string
}

// Audit result
export interface AuditResult {
  timestamp: number
  url: string
  issues: AccessibilityIssue[]
  score: number
  summary: {
    errors: number
    warnings: number
    notices: number
    passed: number
  }
  categories: Record<IssueCategory, {
    issues: number
    passed: number
  }>
}

// Category info
const categoryInfo: Record<IssueCategory, { name: string; icon: React.ReactNode }> = {
  "color-contrast": { name: "Color Contrast", icon: <Contrast className="h-4 w-4" /> },
  images: { name: "Images", icon: <Image className="h-4 w-4" /> },
  forms: { name: "Forms", icon: <FormInput className="h-4 w-4" /> },
  links: { name: "Links", icon: <Link2 className="h-4 w-4" /> },
  headings: { name: "Headings", icon: <Heading className="h-4 w-4" /> },
  landmarks: { name: "Landmarks", icon: <Navigation className="h-4 w-4" /> },
  keyboard: { name: "Keyboard", icon: <Type className="h-4 w-4" /> },
  focus: { name: "Focus", icon: <Eye className="h-4 w-4" /> },
  aria: { name: "ARIA", icon: <FileText className="h-4 w-4" /> },
  structure: { name: "Structure", icon: <FileText className="h-4 w-4" /> },
}

// Severity icons
const severityIcons: Record<IssueSeverity, React.ReactNode> = {
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
  warning: <AlertTriangle className="h-4 w-4 text-[--accent-orange]" />,
  notice: <Info className="h-4 w-4 text-[--accent-blue]" />,
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Get contrast ratio between two colors
function getContrastRatio(fg: string, bg: string): number {
  const getLuminance = (color: string): number => {
    const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0]
    const [r, g, b] = rgb.map((c) => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const l1 = getLuminance(fg)
  const l2 = getLuminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

// Get element selector
function getSelector(element: HTMLElement): string {
  if (element.id) return `#${element.id}`
  const classes = Array.from(element.classList).slice(0, 2).join(".")
  if (classes) return `${element.tagName.toLowerCase()}.${classes}`
  return element.tagName.toLowerCase()
}

// Run accessibility audit
export function runAccessibilityAudit(root: HTMLElement = document.body): AuditResult {
  const issues: AccessibilityIssue[] = []
  const passed: Set<string> = new Set()

  // Helper to add issue
  const addIssue = (
    category: IssueCategory,
    severity: IssueSeverity,
    wcagCriteria: string,
    wcagLevel: WCAGLevel,
    title: string,
    description: string,
    element: HTMLElement,
    recommendation: string,
    helpUrl?: string
  ) => {
    issues.push({
      id: generateId(),
      category,
      severity,
      wcagCriteria,
      wcagLevel,
      title,
      description,
      element,
      selector: getSelector(element),
      recommendation,
      helpUrl,
    })
  }

  // Check: Images without alt text
  const images = root.querySelectorAll("img")
  images.forEach((img) => {
    const altText = img.getAttribute("alt")
    if (altText === null) {
      addIssue(
        "images",
        "error",
        "1.1.1",
        "A",
        "Image missing alt attribute",
        "Images must have an alt attribute to provide text alternatives for screen readers.",
        img as HTMLElement,
        'Add an alt attribute describing the image content, or alt="" if decorative.',
        "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html"
      )
    } else if (altText === "" && !img.getAttribute("role")) {
      passed.add("images-alt")
    } else if (altText) {
      passed.add("images-alt")
    }
  })

  // Check: Form inputs without labels
  const inputs = root.querySelectorAll("input, select, textarea")
  inputs.forEach((input) => {
    const id = input.getAttribute("id")
    const ariaLabel = input.getAttribute("aria-label")
    const ariaLabelledby = input.getAttribute("aria-labelledby")
    const hasLabel = id && root.querySelector(`label[for="${id}"]`)

    if (!hasLabel && !ariaLabel && !ariaLabelledby) {
      const inputType = (input as HTMLInputElement).type
      if (inputType !== "hidden" && inputType !== "submit" && inputType !== "button") {
        addIssue(
          "forms",
          "error",
          "1.3.1",
          "A",
          "Form input missing label",
          "Form inputs must have associated labels for screen reader users.",
          input as HTMLElement,
          "Add a <label> element with a for attribute matching the input's id, or use aria-label.",
          "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html"
        )
      }
    } else {
      passed.add("forms-labels")
    }
  })

  // Check: Links without accessible text
  const links = root.querySelectorAll("a")
  links.forEach((link) => {
    const text = link.textContent?.trim()
    const ariaLabel = link.getAttribute("aria-label")
    const title = link.getAttribute("title")
    const img = link.querySelector("img[alt]")

    if (!text && !ariaLabel && !title && !img) {
      addIssue(
        "links",
        "error",
        "2.4.4",
        "A",
        "Link has no accessible name",
        "Links must have text or an aria-label to describe their purpose.",
        link as HTMLElement,
        "Add text content, aria-label, or an image with alt text inside the link.",
        "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html"
      )
    } else if (text === "click here" || text === "read more" || text === "learn more") {
      addIssue(
        "links",
        "warning",
        "2.4.4",
        "A",
        "Vague link text",
        `Link text "${text}" doesn't describe the link destination.`,
        link as HTMLElement,
        "Use descriptive link text that explains where the link goes.",
        "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html"
      )
    } else {
      passed.add("links-text")
    }
  })

  // Check: Heading structure
  const headings = root.querySelectorAll("h1, h2, h3, h4, h5, h6")
  let lastLevel = 0
  let hasH1 = false

  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1))

    if (level === 1) hasH1 = true

    if (level - lastLevel > 1 && lastLevel !== 0) {
      addIssue(
        "headings",
        "warning",
        "1.3.1",
        "A",
        "Heading level skipped",
        `Heading jumps from h${lastLevel} to h${level}. Heading levels should increase by one.`,
        heading as HTMLElement,
        `Use h${lastLevel + 1} instead of h${level}.`,
        "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html"
      )
    }

    lastLevel = level
  })

  if (!hasH1 && headings.length > 0) {
    addIssue(
      "headings",
      "warning",
      "1.3.1",
      "A",
      "Page missing h1",
      "The page should have a main h1 heading.",
      root,
      "Add an h1 element as the main page heading.",
      "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html"
    )
  } else if (hasH1) {
    passed.add("headings-h1")
  }

  // Check: Color contrast
  const textElements = root.querySelectorAll("p, span, a, li, td, th, label, button")
  textElements.forEach((el) => {
    const computed = window.getComputedStyle(el)
    const color = computed.color
    const bgColor = computed.backgroundColor

    if (bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent") {
      const ratio = getContrastRatio(color, bgColor)
      const fontSize = parseFloat(computed.fontSize)
      const fontWeight = parseInt(computed.fontWeight)
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700)

      const minRatio = isLargeText ? 3 : 4.5

      if (ratio < minRatio) {
        addIssue(
          "color-contrast",
          "error",
          "1.4.3",
          "AA",
          "Insufficient color contrast",
          `Text has contrast ratio of ${ratio.toFixed(2)}:1, needs ${minRatio}:1.`,
          el as HTMLElement,
          "Increase the contrast between text and background colors.",
          "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html"
        )
      } else {
        passed.add("color-contrast")
      }
    }
  })

  // Check: Buttons without accessible names
  const buttons = root.querySelectorAll("button, [role='button']")
  buttons.forEach((button) => {
    const text = button.textContent?.trim()
    const ariaLabel = button.getAttribute("aria-label")
    const title = button.getAttribute("title")

    if (!text && !ariaLabel && !title) {
      addIssue(
        "forms",
        "error",
        "4.1.2",
        "A",
        "Button has no accessible name",
        "Buttons must have text or an aria-label.",
        button as HTMLElement,
        "Add text content or aria-label to the button.",
        "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html"
      )
    } else {
      passed.add("buttons-text")
    }
  })

  // Check: Focus indicators
  const focusableElements = root.querySelectorAll(
    "a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
  )
  focusableElements.forEach((el) => {
    const computed = window.getComputedStyle(el)
    const outlineStyle = computed.outlineStyle

    if (outlineStyle === "none") {
      // Check for alternative focus indicators
      const hasFocusStyles = el.matches(":focus-visible") ||
        el.classList.contains("focus-visible")

      if (!hasFocusStyles) {
        addIssue(
          "focus",
          "warning",
          "2.4.7",
          "AA",
          "Possible missing focus indicator",
          "Element may not have visible focus indicator (outline: none detected).",
          el as HTMLElement,
          "Ensure the element has a visible focus state using :focus or :focus-visible.",
          "https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html"
        )
      }
    } else {
      passed.add("focus-visible")
    }
  })

  // Check: ARIA roles and attributes
  const ariaElements = root.querySelectorAll("[role]")
  ariaElements.forEach((el) => {
    const role = el.getAttribute("role")
    const validRoles = [
      "alert", "alertdialog", "application", "article", "banner", "button",
      "cell", "checkbox", "columnheader", "combobox", "complementary",
      "contentinfo", "definition", "dialog", "directory", "document", "feed",
      "figure", "form", "grid", "gridcell", "group", "heading", "img",
      "link", "list", "listbox", "listitem", "log", "main", "marquee",
      "math", "menu", "menubar", "menuitem", "menuitemcheckbox", "menuitemradio",
      "navigation", "none", "note", "option", "presentation", "progressbar",
      "radio", "radiogroup", "region", "row", "rowgroup", "rowheader",
      "scrollbar", "search", "searchbox", "separator", "slider", "spinbutton",
      "status", "switch", "tab", "table", "tablist", "tabpanel", "term",
      "textbox", "timer", "toolbar", "tooltip", "tree", "treegrid", "treeitem",
    ]

    if (role && !validRoles.includes(role)) {
      addIssue(
        "aria",
        "error",
        "4.1.2",
        "A",
        "Invalid ARIA role",
        `"${role}" is not a valid ARIA role.`,
        el as HTMLElement,
        "Use a valid ARIA role from the specification.",
        "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html"
      )
    } else {
      passed.add("aria-roles")
    }
  })

  // Check: Landmark regions
  const hasMain = root.querySelector("main, [role='main']")
  const hasNav = root.querySelector("nav, [role='navigation']")
  const hasBanner = root.querySelector("header, [role='banner']")

  if (!hasMain) {
    addIssue(
      "landmarks",
      "warning",
      "1.3.1",
      "A",
      "No main landmark",
      "Page should have a <main> element or role='main' to identify main content.",
      root,
      "Wrap main content in a <main> element.",
      "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html"
    )
  } else {
    passed.add("landmarks-main")
  }

  // Calculate score and summary
  const totalChecks = issues.length + passed.size
  const score = totalChecks > 0 ? Math.round((passed.size / totalChecks) * 100) : 100

  const summary = {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    notices: issues.filter((i) => i.severity === "notice").length,
    passed: passed.size,
  }

  // Category breakdown
  const categories: AuditResult["categories"] = {} as AuditResult["categories"]
  const allCategories: IssueCategory[] = [
    "color-contrast", "images", "forms", "links", "headings",
    "landmarks", "keyboard", "focus", "aria", "structure",
  ]

  allCategories.forEach((cat) => {
    const categoryIssues = issues.filter((i) => i.category === cat).length
    const categoryPassed = Array.from(passed).filter((p) => p.startsWith(cat)).length
    categories[cat] = { issues: categoryIssues, passed: categoryPassed }
  })

  return {
    timestamp: Date.now(),
    url: window.location.href,
    issues,
    score,
    summary,
    categories,
  }
}

// Generate HTML report
export function generateHTMLReport(result: AuditResult): string {
  const date = new Date(result.timestamp).toLocaleString()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Audit Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 2rem; }
    h1 { margin-bottom: 0.5rem; }
    .meta { color: #666; margin-bottom: 2rem; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat { padding: 1rem; border-radius: 8px; text-align: center; }
    .stat.score { background: ${result.score >= 80 ? "#d4edda" : result.score >= 50 ? "#fff3cd" : "#f8d7da"}; }
    .stat.errors { background: #f8d7da; }
    .stat.warnings { background: #fff3cd; }
    .stat.passed { background: #d4edda; }
    .stat-value { font-size: 2rem; font-weight: bold; }
    .stat-label { font-size: 0.875rem; color: #666; }
    .section { margin-bottom: 2rem; }
    .section-title { font-size: 1.25rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #eee; }
    .issue { padding: 1rem; margin-bottom: 1rem; border-radius: 8px; border-left: 4px solid; }
    .issue.error { border-color: #dc3545; background: #fff5f5; }
    .issue.warning { border-color: #ffc107; background: #fffdf5; }
    .issue.notice { border-color: #17a2b8; background: #f5fcff; }
    .issue-title { font-weight: 600; margin-bottom: 0.5rem; }
    .issue-meta { font-size: 0.875rem; color: #666; margin-bottom: 0.5rem; }
    .issue-description { margin-bottom: 0.5rem; }
    .issue-selector { font-family: monospace; font-size: 0.875rem; background: #f5f5f5; padding: 0.25rem 0.5rem; border-radius: 4px; }
    .issue-recommendation { font-size: 0.875rem; color: #28a745; }
    .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
    .badge.level-a { background: #e3f2fd; color: #1565c0; }
    .badge.level-aa { background: #fff3e0; color: #ef6c00; }
    .badge.level-aaa { background: #fce4ec; color: #c2185b; }
  </style>
</head>
<body>
  <h1>Accessibility Audit Report</h1>
  <p class="meta">Generated on ${date} for ${result.url}</p>

  <div class="summary">
    <div class="stat score">
      <div class="stat-value">${result.score}%</div>
      <div class="stat-label">Accessibility Score</div>
    </div>
    <div class="stat errors">
      <div class="stat-value">${result.summary.errors}</div>
      <div class="stat-label">Errors</div>
    </div>
    <div class="stat warnings">
      <div class="stat-value">${result.summary.warnings}</div>
      <div class="stat-label">Warnings</div>
    </div>
    <div class="stat passed">
      <div class="stat-value">${result.summary.passed}</div>
      <div class="stat-label">Passed</div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Issues (${result.issues.length})</h2>
    ${result.issues.map((issue) => `
      <div class="issue ${issue.severity}">
        <div class="issue-title">${issue.title}</div>
        <div class="issue-meta">
          <span class="badge level-${issue.wcagLevel.toLowerCase()}">WCAG ${issue.wcagCriteria} (Level ${issue.wcagLevel})</span>
        </div>
        <p class="issue-description">${issue.description}</p>
        <p><code class="issue-selector">${issue.selector}</code></p>
        <p class="issue-recommendation">💡 ${issue.recommendation}</p>
      </div>
    `).join("")}
  </div>
</body>
</html>`
}

// Issue card component
interface IssueCardProps {
  issue: AccessibilityIssue
  onHighlight: () => void
}

function IssueCard({ issue, onHighlight }: IssueCardProps) {
  return (
    <div
      className={cn(
        "p-3 border-l-4 rounded-r-lg bg-card",
        issue.severity === "error" && "border-l-destructive bg-destructive/5",
        issue.severity === "warning" && "border-l-[--accent-orange] bg-[--accent-orange]/5",
        issue.severity === "notice" && "border-l-[--accent-blue] bg-[--accent-blue]/5"
      )}
    >
      <div className="flex items-start gap-2">
        {severityIcons[issue.severity]}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{issue.title}</div>
          <div className="text-xs text-muted-foreground mt-1">
            <Badge variant="outline" className="mr-2">
              WCAG {issue.wcagCriteria}
            </Badge>
            <Badge variant="secondary">Level {issue.wcagLevel}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{issue.description}</p>
          <code className="text-xs bg-muted px-1 py-0.5 rounded mt-2 block truncate">
            {issue.selector}
          </code>
          <p className="text-xs text-[--accent-green] mt-2 flex items-start gap-1">
            <Check className="h-3 w-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span className="sr-only">Recommendation: </span>
            {issue.recommendation}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={onHighlight}
          aria-label={`Highlight ${issue.selector} element on page`}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

// Category section
interface CategorySectionProps {
  category: IssueCategory
  issues: AccessibilityIssue[]
  onHighlight: (element: HTMLElement) => void
}

function CategorySection({ category, issues, onHighlight }: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(issues.length > 0)
  const info = categoryInfo[category]

  const errorCount = issues.filter((i) => i.severity === "error").length
  const warningCount = issues.filter((i) => i.severity === "warning").length

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`${info.name} category: ${issues.length} issues. ${isOpen ? "Click to collapse" : "Click to expand"}`}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
          <span aria-hidden="true">{info.icon}</span>
          <span className="font-medium">{info.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <Badge variant="destructive">{errorCount}</Badge>
          )}
          {warningCount > 0 && (
            <Badge className="bg-[--accent-orange] hover:bg-[--accent-orange]/90">{warningCount}</Badge>
          )}
          {issues.length === 0 && (
            <Check className="h-4 w-4 text-[--accent-green]" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pr-2 pb-2 space-y-2">
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No issues found</p>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onHighlight={() => onHighlight(issue.element)}
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

// Main audit panel
interface AccessibilityAuditPanelProps {
  className?: string
  onHighlight?: (element: HTMLElement) => void
}

export function AccessibilityAuditPanel({
  className,
  onHighlight,
}: AccessibilityAuditPanelProps) {
  const [result, setResult] = useState<AuditResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const runAudit = useCallback(() => {
    setIsRunning(true)
    // Small delay for UI feedback
    setTimeout(() => {
      const auditResult = runAccessibilityAudit()
      setResult(auditResult)
      setIsRunning(false)
    }, 100)
  }, [])

  const handleExport = useCallback(() => {
    if (!result) return

    const html = generateHTMLReport(result)
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `accessibility-audit-${new Date().toISOString().split("T")[0]}.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [result])

  const handleHighlight = useCallback((element: HTMLElement) => {
    if (onHighlight) {
      onHighlight(element)
    } else {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
      element.style.outline = "3px solid #f00"
      setTimeout(() => {
        element.style.outline = ""
      }, 2000)
    }
  }, [onHighlight])

  const groupedIssues = useMemo((): Record<IssueCategory, AccessibilityIssue[]> => {
    const groups: Record<IssueCategory, AccessibilityIssue[]> = {
      "color-contrast": [],
      images: [],
      forms: [],
      links: [],
      headings: [],
      landmarks: [],
      keyboard: [],
      focus: [],
      aria: [],
      structure: [],
    }

    if (result) {
      result.issues.forEach((issue) => {
        groups[issue.category].push(issue)
      })
    }

    return groups
  }, [result])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="font-semibold">Accessibility Audit</h2>
        </div>
        <div className="flex items-center gap-2" role="group" aria-label="Audit actions">
          {result && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              aria-label="Export accessibility audit report as HTML"
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Download className="h-4 w-4 mr-1" aria-hidden="true" />
              Export
            </Button>
          )}
          <Button
            size="sm"
            onClick={runAudit}
            disabled={isRunning}
            aria-label={isRunning ? "Audit in progress" : "Run accessibility audit"}
            className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isRunning && "animate-spin")} aria-hidden="true" />
            {isRunning ? "Running..." : "Run Audit"}
          </Button>
        </div>
      </div>

      {/* Results */}
      {result ? (
        <>
          {/* Score summary */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-4 mb-3">
              <div
                className={cn(
                  "text-3xl font-bold",
                  result.score >= 80 && "text-[--accent-green]",
                  result.score >= 50 && result.score < 80 && "text-[--accent-orange]",
                  result.score < 50 && "text-destructive"
                )}
              >
                {result.score}%
              </div>
              <div className="flex-1">
                <Progress
                  value={result.score}
                  className={cn(
                    "h-2",
                    result.score >= 80 && "[&>div]:bg-[--accent-green]",
                    result.score >= 50 && result.score < 80 && "[&>div]:bg-[--accent-orange]",
                    result.score < 50 && "[&>div]:bg-destructive"
                  )}
                />
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-destructive" />
                {result.summary.errors} errors
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-[--accent-orange]" />
                {result.summary.warnings} warnings
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4 text-[--accent-green]" />
                {result.summary.passed} passed
              </span>
            </div>
          </div>

          {/* Issues by category */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {(Object.keys(groupedIssues) as IssueCategory[]).map((category) => (
                <CategorySection
                  key={category}
                  category={category}
                  issues={groupedIssues[category]}
                  onHighlight={handleHighlight}
                />
              ))}
            </div>
          </ScrollArea>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mb-4 opacity-50" aria-hidden="true" />
          <h3 className="font-medium mb-2">Run Accessibility Audit</h3>
          <p className="text-sm text-center mb-4">
            Scan your page for WCAG 2.1 accessibility issues
          </p>
          <Button
            onClick={runAudit}
            aria-label="Start accessibility audit"
            className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Start Audit
          </Button>
        </div>
      )}
    </div>
  )
}

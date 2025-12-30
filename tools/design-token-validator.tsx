"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import {
  ChevronDown, Palette, RefreshCw, AlertTriangle, CheckCircle
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface TokenIssue {
  element: HTMLElement
  property: string
  value: string
  type: "color" | "spacing" | "typography" | "radius"
  suggestion?: string
  label: string
}

// Extract CSS custom properties from stylesheets
function getDesignTokens(): Map<string, string> {
  const tokens = new Map<string, string>()

  // Get from :root
  const rootStyles = getComputedStyle(document.documentElement)

  // Common token patterns
  const tokenPatterns = [
    /^--color/,
    /^--bg/,
    /^--text/,
    /^--border/,
    /^--radius/,
    /^--spacing/,
    /^--font/,
    /^--shadow/,
  ]

  for (let i = 0; i < rootStyles.length; i++) {
    const prop = rootStyles[i]
    if (prop.startsWith("--")) {
      const value = rootStyles.getPropertyValue(prop).trim()
      if (value) {
        tokens.set(prop, value)
      }
    }
  }

  return tokens
}

// Check if a color is a hardcoded value
function isHardcodedColor(value: string): boolean {
  // Check for hex, rgb, hsl that aren't using var()
  return /^(#[0-9a-f]{3,8}|rgb|hsl|hwb|lab|lch|oklch)/i.test(value) &&
    !value.includes("var(")
}

// Check if spacing matches common scales
function isStandardSpacing(value: string): boolean {
  const px = parseFloat(value)
  if (isNaN(px)) return true

  const standardValues = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 96]
  return standardValues.some(v => Math.abs(v - px) < 0.5)
}

// Get element label
function getElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ""
  const cls = el.classList.length > 0 ? `.${Array.from(el.classList)[0]}` : ""
  return `${tag}${id}${cls}`.substring(0, 25)
}

export function DesignTokenValidator() {
  const { isOpen, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [issues, setIssues] = useState<TokenIssue[]>([])
  const [tokens, setTokens] = useState<Map<string, string>>(new Map())
  const [activeTab, setActiveTab] = useState("color")

  // Scan for issues
  const scan = useCallback(() => {
    const foundTokens = getDesignTokens()
    setTokens(foundTokens)

    const foundIssues: TokenIssue[] = []

    document.querySelectorAll("*").forEach(el => {
      if ((el as HTMLElement).hasAttribute?.("data-devtools")) return

      const computed = getComputedStyle(el)

      // Check colors
      const colorProps = ["color", "background-color", "border-color"]
      colorProps.forEach(prop => {
        const value = computed.getPropertyValue(prop)
        if (value && isHardcodedColor(value) && value !== "rgba(0, 0, 0, 0)") {
          foundIssues.push({
            element: el as HTMLElement,
            property: prop,
            value,
            type: "color",
            label: getElementLabel(el as HTMLElement),
          })
        }
      })

      // Check spacing
      const spacingProps = ["padding", "margin", "gap"]
      spacingProps.forEach(prop => {
        const value = computed.getPropertyValue(prop)
        if (value && !value.includes("var(")) {
          const parts = value.split(" ")
          parts.forEach(part => {
            if (!isStandardSpacing(part)) {
              foundIssues.push({
                element: el as HTMLElement,
                property: prop,
                value: part,
                type: "spacing",
                label: getElementLabel(el as HTMLElement),
              })
            }
          })
        }
      })
    })

    setIssues(foundIssues.slice(0, 100))

    if (foundIssues.length === 0) {
      toast.success("No token issues found!")
    } else {
      toast.warning(`Found ${foundIssues.length} potential token issues`)
    }
  }, [])

  // Select element
  const selectIssue = useCallback((issue: TokenIssue) => {
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

  // Filter issues by type
  const filteredIssues = useMemo(() => {
    return issues.filter(i => i.type === activeTab)
  }, [issues, activeTab])

  // Stats
  const stats = useMemo(() => ({
    color: issues.filter(i => i.type === "color").length,
    spacing: issues.filter(i => i.type === "spacing").length,
    typography: issues.filter(i => i.type === "typography").length,
    radius: issues.filter(i => i.type === "radius").length,
    tokens: tokens.size,
  }), [issues, tokens])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-fuchsia-500" />
          <span>Token Validator</span>
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
          Validate Design Tokens
        </Button>

        {/* Token count */}
        <div className="p-2 bg-muted/30 rounded text-[10px]">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-[--accent-green]" />
            Found {stats.tokens} CSS custom properties
          </div>
        </div>

        {/* Issue tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-7">
            <TabsTrigger value="color" className="text-[9px] relative">
              Color
              {stats.color > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-[8px] flex items-center justify-center text-white">
                  {stats.color}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="spacing" className="text-[9px] relative">
              Spacing
              {stats.spacing > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-[8px] flex items-center justify-center text-white">
                  {stats.spacing}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="typography" className="text-[9px]">Type</TabsTrigger>
            <TabsTrigger value="radius" className="text-[9px]">Radius</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Issues list */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                {issues.length === 0
                  ? "Click Validate to check for token issues"
                  : `No ${activeTab} issues found`}
              </div>
            ) : (
              filteredIssues.map((issue, i) => (
                <div
                  key={i}
                  className="p-2 bg-[--accent-amber]/10 border border-[--accent-amber]/20 rounded cursor-pointer hover:bg-[--accent-amber]/20"
                  onClick={() => selectIssue(issue)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono truncate">{issue.label}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {issue.property}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    {issue.type === "color" && (
                      <span
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: issue.value }}
                      />
                    )}
                    <code className="text-muted-foreground">{issue.value}</code>
                  </div>
                  <div className="text-[9px] text-[--accent-amber] mt-1">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Consider using a design token
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Tips */}
        <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
          <div className="font-medium mb-1">Best Practices:</div>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Use CSS custom properties for colors</li>
            <li>Stick to standard spacing scales</li>
            <li>Define reusable typography tokens</li>
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

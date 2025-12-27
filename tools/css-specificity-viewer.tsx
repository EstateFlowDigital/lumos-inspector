"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import {
  ChevronDown, Scale, RefreshCw, AlertTriangle, Info
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Input } from "../ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface SpecificityScore {
  inline: number
  ids: number
  classes: number
  elements: number
  total: string
}

interface StyleRule {
  selector: string
  specificity: SpecificityScore
  properties: string[]
  source: string
}

// Calculate specificity for a selector
function calculateSpecificity(selector: string): SpecificityScore {
  let ids = 0
  let classes = 0
  let elements = 0

  // Remove pseudo-elements first (they count as elements)
  const withoutPseudoElements = selector.replace(/::(before|after|first-line|first-letter|placeholder|selection|marker|backdrop)/gi, "")

  // Count IDs
  const idMatches = withoutPseudoElements.match(/#[a-z_-][\w-]*/gi)
  if (idMatches) ids = idMatches.length

  // Count classes, attributes, and pseudo-classes
  const classMatches = withoutPseudoElements.match(/\.[a-z_-][\w-]*/gi)
  if (classMatches) classes += classMatches.length

  const attrMatches = withoutPseudoElements.match(/\[[^\]]+\]/g)
  if (attrMatches) classes += attrMatches.length

  const pseudoClassMatches = withoutPseudoElements.match(/:(?!:)[a-z-]+(\([^)]*\))?/gi)
  if (pseudoClassMatches) {
    pseudoClassMatches.forEach(match => {
      // :not, :is, :where, :has are special
      if (match.startsWith(":not") || match.startsWith(":is") || match.startsWith(":has")) {
        // Their contents count, not the pseudo-class itself
      } else if (match.startsWith(":where")) {
        // :where has 0 specificity
      } else {
        classes++
      }
    })
  }

  // Count element selectors
  const elementMatches = withoutPseudoElements.match(/(?:^|[\s+>~])([a-z][\w-]*)/gi)
  if (elementMatches) elements = elementMatches.length

  // Count ::pseudo-elements from original
  const pseudoElementMatches = selector.match(/::[a-z-]+/gi)
  if (pseudoElementMatches) elements += pseudoElementMatches.length

  return {
    inline: 0,
    ids,
    classes,
    elements,
    total: `(${ids},${classes},${elements})`
  }
}

// Get specificity value for sorting
function getSpecificityValue(spec: SpecificityScore): number {
  return spec.inline * 1000000 + spec.ids * 10000 + spec.classes * 100 + spec.elements
}

// Format specificity for display
function formatSpecificity(spec: SpecificityScore): string {
  return `${spec.ids}-${spec.classes}-${spec.elements}`
}

export function CSSSpecificityViewer() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [rules, setRules] = useState<StyleRule[]>([])
  const [testSelector, setTestSelector] = useState("")
  const [testResult, setTestResult] = useState<SpecificityScore | null>(null)

  // Analyze rules for selected element
  const analyze = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const element = selectedElement.element
    const matchedRules: StyleRule[] = []

    // Check inline styles
    if (element.style.length > 0) {
      const inlineProps: string[] = []
      for (let i = 0; i < element.style.length; i++) {
        inlineProps.push(element.style[i])
      }
      matchedRules.push({
        selector: "inline styles",
        specificity: { inline: 1, ids: 0, classes: 0, elements: 0, total: "(1,0,0,0)" },
        properties: inlineProps,
        source: "element.style"
      })
    }

    // Check stylesheets
    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i]
        try {
          const rules = sheet.cssRules || sheet.rules
          if (!rules) continue

          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j]
            if (rule instanceof CSSStyleRule) {
              try {
                if (element.matches(rule.selectorText)) {
                  const props: string[] = []
                  for (let k = 0; k < rule.style.length; k++) {
                    props.push(rule.style[k])
                  }

                  matchedRules.push({
                    selector: rule.selectorText,
                    specificity: calculateSpecificity(rule.selectorText),
                    properties: props.slice(0, 10),
                    source: sheet.href?.split("/").pop() || "inline stylesheet"
                  })
                }
              } catch (e) {
                // Element.matches might throw for some selectors
              }
            }
          }
        } catch (e) {
          // CORS might block access to stylesheet rules
        }
      }
    } catch (e) {
      console.error("Error analyzing stylesheets", e)
    }

    // Sort by specificity (highest first)
    matchedRules.sort((a, b) => getSpecificityValue(b.specificity) - getSpecificityValue(a.specificity))

    setRules(matchedRules)
    toast.success(`Found ${matchedRules.length} matching rules`)
  }, [selectedElement])

  // Test a selector
  const testSpecificity = useCallback(() => {
    if (!testSelector.trim()) {
      toast.error("Enter a selector to test")
      return
    }

    try {
      const spec = calculateSpecificity(testSelector)
      setTestResult(spec)
    } catch (e) {
      toast.error("Invalid selector")
    }
  }, [testSelector])

  // Specificity stats
  const stats = useMemo(() => {
    if (rules.length === 0) return null

    const values = rules.map(r => getSpecificityValue(r.specificity))
    return {
      highest: Math.max(...values),
      lowest: Math.min(...values),
      count: rules.length,
      hasInline: rules.some(r => r.specificity.inline > 0),
      hasIds: rules.some(r => r.specificity.ids > 0),
    }
  }, [rules])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-lime-500" />
          <span>Specificity Viewer</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Analyze button */}
        <Button
          variant="default"
          size="sm"
          className="w-full h-7"
          onClick={analyze}
          disabled={!selectedElement}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Analyze Specificity
        </Button>

        {/* Stats */}
        {stats && (
          <div className="p-2 bg-muted/30 rounded space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Matching rules:</span>
              <span>{stats.count}</span>
            </div>
            {stats.hasInline && (
              <div className="flex items-center gap-1 text-amber-500">
                <AlertTriangle className="h-3 w-3" />
                Has inline styles (highest priority)
              </div>
            )}
            {stats.hasIds && (
              <div className="flex items-center gap-1 text-amber-500">
                <Info className="h-3 w-3" />
                Uses ID selectors
              </div>
            )}
          </div>
        )}

        {/* Test selector */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={testSelector}
              onChange={(e) => setTestSelector(e.target.value)}
              className="h-7 text-xs font-mono"
              placeholder=".class #id element"
              onKeyDown={(e) => {
                if (e.key === "Enter") testSpecificity()
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={testSpecificity}
            >
              Test
            </Button>
          </div>
          {testResult && (
            <div className="p-2 bg-primary/10 rounded text-xs font-mono flex justify-between">
              <span>{testSelector}</span>
              <span className="font-bold">{formatSpecificity(testResult)}</span>
            </div>
          )}
        </div>

        {/* Rules list */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {rules.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Select an element and analyze specificity
              </div>
            ) : (
              rules.map((rule, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-2 rounded border",
                    rule.specificity.inline > 0
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-muted/30 border-transparent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <code className="text-[10px] text-primary break-all flex-1">
                      {rule.selector}
                    </code>
                    <Badge
                      variant={rule.specificity.inline > 0 ? "default" : "outline"}
                      className="text-[9px] h-4 px-1 font-mono shrink-0"
                    >
                      {formatSpecificity(rule.specificity)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>{rule.source}</span>
                    <span>{rule.properties.length} props</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
          <div className="font-medium mb-1">Specificity Format: A-B-C</div>
          <div className="grid grid-cols-3 gap-1 text-center">
            <div>
              <div className="font-bold">A</div>
              <div>IDs</div>
            </div>
            <div>
              <div className="font-bold">B</div>
              <div>Classes</div>
            </div>
            <div>
              <div className="font-bold">C</div>
              <div>Elements</div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

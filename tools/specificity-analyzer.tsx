"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { ChevronDown, Scale, AlertTriangle, Info, Copy } from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { useInspector } from "../core/inspector-context"

interface CSSRule {
  selector: string
  specificity: [number, number, number]
  specificityScore: number
  source: string
  properties: string[]
}

// Calculate specificity from selector
function calculateSpecificity(selector: string): [number, number, number] {
  let ids = 0
  let classes = 0
  let elements = 0

  // Remove :not() content but count its innards
  const notRegex = /:not\(([^)]+)\)/g
  let match
  while ((match = notRegex.exec(selector)) !== null) {
    const inner = calculateSpecificity(match[1])
    ids += inner[0]
    classes += inner[1]
    elements += inner[2]
  }
  const cleanSelector = selector.replace(notRegex, "")

  // Count IDs (#)
  ids += (cleanSelector.match(/#[a-zA-Z_-][a-zA-Z0-9_-]*/g) || []).length

  // Count classes (.), attributes ([]), and pseudo-classes (:)
  classes += (cleanSelector.match(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g) || []).length
  classes += (cleanSelector.match(/\[[^\]]+\]/g) || []).length
  classes += (cleanSelector.match(/:[a-zA-Z-]+(?!\()/g) || []).length

  // Count elements and pseudo-elements (::)
  elements += (cleanSelector.match(/(?:^|[\s>+~])([a-zA-Z][a-zA-Z0-9]*)/g) || []).length
  elements += (cleanSelector.match(/::[a-zA-Z-]+/g) || []).length

  return [ids, classes, elements]
}

// Convert specificity to comparable score
function specificityToScore(spec: [number, number, number]): number {
  return spec[0] * 10000 + spec[1] * 100 + spec[2]
}

// Get all CSS rules that apply to an element
function getMatchingRules(element: HTMLElement): CSSRule[] {
  const rules: CSSRule[] = []

  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      const cssRules = sheet.cssRules || sheet.rules
      if (!cssRules) return

      Array.from(cssRules).forEach((rule) => {
        if (rule instanceof CSSStyleRule) {
          try {
            if (element.matches(rule.selectorText)) {
              const specificity = calculateSpecificity(rule.selectorText)
              const properties = Array.from(rule.style).filter(
                (prop) => rule.style.getPropertyValue(prop)
              )

              rules.push({
                selector: rule.selectorText,
                specificity,
                specificityScore: specificityToScore(specificity),
                source: sheet.href
                  ? new URL(sheet.href).pathname.split("/").pop() || "stylesheet"
                  : "inline",
                properties,
              })
            }
          } catch {
            // Invalid selector
          }
        }
      })
    } catch {
      // CORS restriction
    }
  })

  // Sort by specificity (highest first)
  return rules.sort((a, b) => b.specificityScore - a.specificityScore)
}

// Format specificity for display
function formatSpecificity(spec: [number, number, number]): string {
  return `(${spec[0]}, ${spec[1]}, ${spec[2]})`
}

export function SpecificityAnalyzer() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [rules, setRules] = useState<CSSRule[]>([])
  const [expandedRule, setExpandedRule] = useState<string | null>(null)

  // Get matching rules when element changes
  useEffect(() => {
    if (selectedElement?.element) {
      setRules(getMatchingRules(selectedElement.element))
    } else {
      setRules([])
    }
  }, [selectedElement])

  // Find conflicts (same property with different values)
  const conflicts = useMemo(() => {
    const propertyMap = new Map<string, { value: string; rule: CSSRule }[]>()

    rules.forEach((rule) => {
      rule.properties.forEach((prop) => {
        const value = selectedElement?.element
          ? getComputedStyle(selectedElement.element).getPropertyValue(prop)
          : ""

        if (!propertyMap.has(prop)) {
          propertyMap.set(prop, [])
        }
        propertyMap.get(prop)!.push({ value, rule })
      })
    })

    return Array.from(propertyMap.entries())
      .filter(([, values]) => values.length > 1)
      .map(([prop, values]) => ({
        property: prop,
        rules: values,
      }))
  }, [rules, selectedElement])

  // Copy selector
  const copySelector = (selector: string) => {
    navigator.clipboard.writeText(selector)
    toast.success("Copied selector")
  }

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-chart-5" />
          <span>Specificity</span>
          {rules.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4">
              {rules.length} rules
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {!selectedElement ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Select an element to analyze CSS specificity
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No matching CSS rules found
          </div>
        ) : (
          <>
            {/* Conflicts warning */}
            {conflicts.length > 0 && (
              <div className="p-2 bg-[--accent-amber]/10 rounded-md border border-[--accent-amber]/20">
                <div className="flex items-center gap-2 text-xs text-[--accent-amber]">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{conflicts.length} properties with multiple rules</span>
                </div>
              </div>
            )}

            {/* Rules list */}
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {rules.map((rule, index) => {
                  const isConflicting = conflicts.some((c) =>
                    c.rules.some((r) => r.rule.selector === rule.selector)
                  )

                  return (
                    <div
                      key={`${rule.selector}-${index}`}
                      className={cn(
                        "rounded-md border transition-colors",
                        isConflicting && "border-[--accent-amber]/50",
                        expandedRule === rule.selector ? "bg-muted/50" : "hover:bg-muted/30"
                      )}
                    >
                      <div
                        className="flex items-center justify-between p-2 cursor-pointer"
                        onClick={() =>
                          setExpandedRule(expandedRule === rule.selector ? null : rule.selector)
                        }
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-[10px] font-mono truncate">{rule.selector}</code>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] h-4 px-1 font-mono",
                                    rule.specificity[0] > 0 && "bg-[--destructive]/10 text-[--destructive]",
                                    rule.specificity[0] === 0 &&
                                      rule.specificity[1] > 3 &&
                                      "bg-[--accent-amber]/10 text-[--accent-amber]"
                                  )}
                                >
                                  {formatSpecificity(rule.specificity)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                <div>IDs: {rule.specificity[0]}</div>
                                <div>Classes: {rule.specificity[1]}</div>
                                <div>Elements: {rule.specificity[2]}</div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">
                            {rule.source} • {rule.properties.length} properties
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              copySelector(rule.selector)
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 transition-transform",
                              expandedRule === rule.selector && "rotate-180"
                            )}
                          />
                        </div>
                      </div>

                      {/* Expanded properties */}
                      {expandedRule === rule.selector && (
                        <div className="px-2 pb-2 pt-1 border-t">
                          <div className="grid grid-cols-2 gap-1">
                            {rule.properties.slice(0, 10).map((prop) => (
                              <div
                                key={prop}
                                className="text-[9px] font-mono text-muted-foreground truncate"
                              >
                                {prop}
                              </div>
                            ))}
                            {rule.properties.length > 10 && (
                              <div className="text-[9px] text-muted-foreground">
                                +{rule.properties.length - 10} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-2 border-t">
              <div className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                <span>Specificity: (IDs, Classes, Elements)</span>
              </div>
            </div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

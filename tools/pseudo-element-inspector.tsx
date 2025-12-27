"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Sparkles, Copy, RefreshCw
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface PseudoStyles {
  content: string
  display: string
  position: string
  width: string
  height: string
  backgroundColor: string
  color: string
  fontSize: string
  top: string
  left: string
  right: string
  bottom: string
  transform: string
  opacity: string
  zIndex: string
}

// Important properties to show for pseudo elements
const importantProps = [
  "content",
  "display",
  "position",
  "width",
  "height",
  "background-color",
  "background",
  "color",
  "font-size",
  "top",
  "left",
  "right",
  "bottom",
  "transform",
  "opacity",
  "z-index",
  "border",
  "border-radius",
]

export function PseudoElementInspector() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<"before" | "after">("before")
  const [beforeStyles, setBeforeStyles] = useState<Record<string, string>>({})
  const [afterStyles, setAfterStyles] = useState<Record<string, string>>({})
  const [hasBefore, setHasBefore] = useState(false)
  const [hasAfter, setHasAfter] = useState(false)

  // Scan pseudo elements
  const scan = useCallback(() => {
    if (!selectedElement?.element) return

    // Get ::before styles
    const beforeComputed = getComputedStyle(selectedElement.element, "::before")
    const beforeContent = beforeComputed.content

    if (beforeContent && beforeContent !== "none" && beforeContent !== "\"\"" && beforeContent !== "''") {
      setHasBefore(true)
      const styles: Record<string, string> = {}
      importantProps.forEach(prop => {
        const value = beforeComputed.getPropertyValue(prop)
        if (value && value !== "none" && value !== "auto" && value !== "normal") {
          styles[prop] = value
        }
      })
      styles["content"] = beforeContent
      setBeforeStyles(styles)
    } else {
      setHasBefore(false)
      setBeforeStyles({})
    }

    // Get ::after styles
    const afterComputed = getComputedStyle(selectedElement.element, "::after")
    const afterContent = afterComputed.content

    if (afterContent && afterContent !== "none" && afterContent !== "\"\"" && afterContent !== "''") {
      setHasAfter(true)
      const styles: Record<string, string> = {}
      importantProps.forEach(prop => {
        const value = afterComputed.getPropertyValue(prop)
        if (value && value !== "none" && value !== "auto" && value !== "normal") {
          styles[prop] = value
        }
      })
      styles["content"] = afterContent
      setAfterStyles(styles)
    } else {
      setHasAfter(false)
      setAfterStyles({})
    }

    toast.success(`Found ${(hasBefore ? 1 : 0) + (hasAfter ? 1 : 0)} pseudo element(s)`)
  }, [selectedElement, hasBefore, hasAfter])

  // Re-scan when element changes
  useEffect(() => {
    if (selectedElement?.element) {
      scan()
    } else {
      setBeforeStyles({})
      setAfterStyles({})
      setHasBefore(false)
      setHasAfter(false)
    }
  }, [selectedElement, scan])

  // Copy CSS
  const copyCSS = useCallback((pseudo: "before" | "after") => {
    const styles = pseudo === "before" ? beforeStyles : afterStyles

    const css = Object.entries(styles)
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join("\n")

    const fullCSS = `.selector::${pseudo} {\n${css}\n}`

    navigator.clipboard.writeText(fullCSS)
    toast.success("CSS copied to clipboard")
  }, [beforeStyles, afterStyles])

  // Current styles
  const currentStyles = activeTab === "before" ? beforeStyles : afterStyles
  const hasCurrentPseudo = activeTab === "before" ? hasBefore : hasAfter

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span>Pseudo Elements</span>
          {(hasBefore || hasAfter) && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4">
              {(hasBefore ? 1 : 0) + (hasAfter ? 1 : 0)}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Scan button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7"
          onClick={scan}
          disabled={!selectedElement}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Scan Pseudo Elements
        </Button>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "before" | "after")}>
          <TabsList className="grid w-full grid-cols-2 h-7">
            <TabsTrigger value="before" className="text-[10px] relative">
              ::before
              {hasBefore && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="after" className="text-[10px] relative">
              ::after
              {hasAfter && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content */}
        <ScrollArea className="h-[200px]">
          {!selectedElement ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Select an element to inspect pseudo elements
            </div>
          ) : !hasCurrentPseudo ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No ::{activeTab} pseudo element found
            </div>
          ) : (
            <div className="space-y-1">
              {Object.entries(currentStyles).map(([prop, value]) => (
                <div
                  key={prop}
                  className="flex items-start justify-between p-2 bg-muted/30 rounded text-[10px]"
                >
                  <span className="text-muted-foreground font-mono">{prop}</span>
                  <span className="font-mono text-right max-w-[60%] break-all">
                    {prop === "background-color" || prop === "color" ? (
                      <span className="flex items-center gap-1">
                        <span
                          className="w-3 h-3 rounded border inline-block"
                          style={{ backgroundColor: value }}
                        />
                        {value}
                      </span>
                    ) : (
                      value
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        {hasCurrentPseudo && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7"
            onClick={() => copyCSS(activeTab)}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy ::{activeTab} CSS
          </Button>
        )}

        {/* Info */}
        <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
          Pseudo elements are created via CSS ::before and ::after selectors with content property.
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

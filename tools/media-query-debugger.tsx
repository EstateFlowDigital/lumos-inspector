"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import {
  ChevronDown, Monitor, Smartphone, Tablet, RefreshCw, Check, X
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface MediaQueryInfo {
  query: string
  matches: boolean
  type: "width" | "height" | "orientation" | "color" | "preference" | "other"
  source: string
}

// Common breakpoints
const commonBreakpoints = [
  { name: "sm", query: "(min-width: 640px)", icon: Smartphone },
  { name: "md", query: "(min-width: 768px)", icon: Tablet },
  { name: "lg", query: "(min-width: 1024px)", icon: Monitor },
  { name: "xl", query: "(min-width: 1280px)", icon: Monitor },
  { name: "2xl", query: "(min-width: 1536px)", icon: Monitor },
]

// User preference queries
const preferenceQueries = [
  { name: "Dark mode", query: "(prefers-color-scheme: dark)" },
  { name: "Light mode", query: "(prefers-color-scheme: light)" },
  { name: "Reduced motion", query: "(prefers-reduced-motion: reduce)" },
  { name: "High contrast", query: "(prefers-contrast: more)" },
  { name: "Forced colors", query: "(forced-colors: active)" },
]

// Get media query type
function getQueryType(query: string): MediaQueryInfo["type"] {
  if (query.includes("width")) return "width"
  if (query.includes("height")) return "height"
  if (query.includes("orientation")) return "orientation"
  if (query.includes("color")) return "color"
  if (query.includes("prefers")) return "preference"
  return "other"
}

export function MediaQueryDebugger() {
  const { isOpen } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [queries, setQueries] = useState<MediaQueryInfo[]>([])
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [activeTab, setActiveTab] = useState<"breakpoints" | "all" | "preferences">("breakpoints")

  // Update viewport dimensions
  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateViewport()
    window.addEventListener("resize", updateViewport)
    return () => window.removeEventListener("resize", updateViewport)
  }, [])

  // Scan for media queries
  const scan = useCallback(() => {
    const found: MediaQueryInfo[] = []
    const seenQueries = new Set<string>()

    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i]
        try {
          const rules = sheet.cssRules || sheet.rules
          if (!rules) continue

          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j]
            if (rule instanceof CSSMediaRule) {
              const query = rule.conditionText || rule.media.mediaText
              if (!seenQueries.has(query)) {
                seenQueries.add(query)
                found.push({
                  query,
                  matches: window.matchMedia(query).matches,
                  type: getQueryType(query),
                  source: sheet.href?.split("/").pop() || "inline"
                })
              }
            }
          }
        } catch (e) {
          // CORS might block access
        }
      }
    } catch (e) {
      console.error("Error scanning media queries", e)
    }

    // Sort: matching first, then by type
    found.sort((a, b) => {
      if (a.matches !== b.matches) return a.matches ? -1 : 1
      return a.type.localeCompare(b.type)
    })

    setQueries(found)
    toast.success(`Found ${found.length} media queries`)
  }, [])

  // Check breakpoint status
  const breakpointStatus = useMemo(() => {
    return commonBreakpoints.map(bp => ({
      ...bp,
      matches: typeof window !== "undefined" ? window.matchMedia(bp.query).matches : false
    }))
  }, [viewport])

  // Check preference status
  const preferenceStatus = useMemo(() => {
    return preferenceQueries.map(pq => ({
      ...pq,
      matches: typeof window !== "undefined" ? window.matchMedia(pq.query).matches : false
    }))
  }, [])

  // Filter queries by tab
  const filteredQueries = useMemo(() => {
    if (activeTab === "breakpoints") {
      return queries.filter(q => q.type === "width" || q.type === "height")
    }
    if (activeTab === "preferences") {
      return queries.filter(q => q.type === "preference")
    }
    return queries
  }, [queries, activeTab])

  // Get current breakpoint name
  const currentBreakpoint = useMemo(() => {
    for (let i = breakpointStatus.length - 1; i >= 0; i--) {
      if (breakpointStatus[i].matches) return breakpointStatus[i].name
    }
    return "xs"
  }, [breakpointStatus])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-rose-500" />
          <span>Media Queries</span>
          <Badge variant="secondary" className="text-[10px] px-1 h-4">
            {currentBreakpoint}
          </Badge>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Viewport info */}
        <div className="p-2 bg-muted/30 rounded text-xs font-mono text-center">
          <span className="text-muted-foreground">Viewport: </span>
          <span className="font-bold">{viewport.width}</span>
          <span className="text-muted-foreground"> × </span>
          <span className="font-bold">{viewport.height}</span>
        </div>

        {/* Breakpoint indicators */}
        <div className="flex justify-between px-1">
          {breakpointStatus.map((bp) => {
            const Icon = bp.icon
            return (
              <div
                key={bp.name}
                className={cn(
                  "flex flex-col items-center gap-1",
                  bp.matches ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", bp.matches && "text-green-500")} />
                <span className="text-[10px] font-mono">{bp.name}</span>
                {bp.matches ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <X className="h-3 w-3 text-muted-foreground/50" />
                )}
              </div>
            )
          })}
        </div>

        {/* Scan button */}
        <Button variant="outline" size="sm" className="w-full h-7" onClick={scan}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Scan Stylesheet Queries
        </Button>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3 h-7">
            <TabsTrigger value="breakpoints" className="text-[10px]">
              Breakpoints
            </TabsTrigger>
            <TabsTrigger value="preferences" className="text-[10px]">
              Preferences
            </TabsTrigger>
            <TabsTrigger value="all" className="text-[10px]">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Preferences quick view */}
        {activeTab === "preferences" && (
          <div className="space-y-1">
            {preferenceStatus.map((pq, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between p-2 rounded text-xs",
                  pq.matches ? "bg-green-500/10" : "bg-muted/30"
                )}
              >
                <span>{pq.name}</span>
                {pq.matches ? (
                  <Badge variant="default" className="text-[9px] h-4 px-1">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] h-4 px-1">Inactive</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Queries list */}
        {(activeTab === "all" || activeTab === "breakpoints") && (
          <ScrollArea className="h-[180px]">
            <div className="space-y-1">
              {filteredQueries.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  {queries.length === 0 ? "Click Scan to find media queries" : "No queries of this type"}
                </div>
              ) : (
                filteredQueries.map((mq, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-2 rounded border",
                      mq.matches
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-muted/30 border-transparent"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-[10px] break-all flex-1">{mq.query}</code>
                      {mq.matches ? (
                        <Check className="h-3 w-3 text-green-500 shrink-0 ml-2" />
                      ) : (
                        <X className="h-3 w-3 text-muted-foreground shrink-0 ml-2" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                      <Badge variant="outline" className="h-4 px-1 text-[8px]">
                        {mq.type}
                      </Badge>
                      <span>{mq.source}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}

        {/* Device presets */}
        <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
          <div className="font-medium mb-1">Common Breakpoints:</div>
          <div className="grid grid-cols-2 gap-1">
            <div>sm: 640px</div>
            <div>md: 768px</div>
            <div>lg: 1024px</div>
            <div>xl: 1280px</div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

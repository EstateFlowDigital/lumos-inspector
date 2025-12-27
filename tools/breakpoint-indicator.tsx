"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  ChevronDown, Monitor, Laptop, Tablet, Smartphone, Maximize2
} from "lucide-react"
import { cn } from "../lib/utils"
import { Badge } from "../ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface Breakpoint {
  name: string
  minWidth: number
  maxWidth: number | null
  icon: React.ElementType
  color: string
}

// Common Tailwind breakpoints
const breakpoints: Breakpoint[] = [
  { name: "xs", minWidth: 0, maxWidth: 639, icon: Smartphone, color: "bg-purple-500" },
  { name: "sm", minWidth: 640, maxWidth: 767, icon: Smartphone, color: "bg-pink-500" },
  { name: "md", minWidth: 768, maxWidth: 1023, icon: Tablet, color: "bg-blue-500" },
  { name: "lg", minWidth: 1024, maxWidth: 1279, icon: Laptop, color: "bg-green-500" },
  { name: "xl", minWidth: 1280, maxWidth: 1535, icon: Monitor, color: "bg-yellow-500" },
  { name: "2xl", minWidth: 1536, maxWidth: null, icon: Maximize2, color: "bg-orange-500" },
]

export function BreakpointIndicator() {
  const { isOpen } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint | null>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  // Update viewport size and breakpoint
  const updateViewport = useCallback(() => {
    const width = window.innerWidth
    const height = window.innerHeight

    setViewportWidth(width)
    setViewportHeight(height)

    // Find current breakpoint
    const bp = breakpoints.find((b) => {
      if (b.maxWidth === null) {
        return width >= b.minWidth
      }
      return width >= b.minWidth && width <= b.maxWidth
    })

    setCurrentBreakpoint(bp || null)
  }, [])

  useEffect(() => {
    updateViewport()

    window.addEventListener("resize", updateViewport)
    return () => window.removeEventListener("resize", updateViewport)
  }, [updateViewport])

  if (!isOpen) return null

  const CurrentIcon = currentBreakpoint?.icon || Monitor

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <CurrentIcon className="h-4 w-4 text-chart-1" />
          <span>Viewport</span>
          {currentBreakpoint && (
            <Badge className={cn("text-[10px] h-4 text-white", currentBreakpoint.color)}>
              {currentBreakpoint.name}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Current viewport */}
        <div className="text-center p-3 bg-muted/50 rounded-md">
          <div className="text-2xl font-mono font-bold">
            {viewportWidth} × {viewportHeight}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Current viewport size
          </div>
        </div>

        {/* Breakpoint visualization */}
        <div className="space-y-1">
          {breakpoints.map((bp) => {
            const Icon = bp.icon
            const isActive = currentBreakpoint?.name === bp.name
            const progress = bp.maxWidth
              ? Math.min(100, ((viewportWidth - bp.minWidth) / (bp.maxWidth - bp.minWidth)) * 100)
              : 100

            return (
              <div
                key={bp.name}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md transition-colors",
                  isActive ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn("font-medium", isActive && "text-primary")}>
                      {bp.name}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {bp.minWidth}px{bp.maxWidth ? ` - ${bp.maxWidth}px` : "+"}
                    </span>
                  </div>
                  {/* Progress bar showing position within breakpoint */}
                  <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isActive ? bp.color : "bg-muted-foreground/30"
                      )}
                      style={{ width: isActive ? `${progress}%` : "0%" }}
                    />
                  </div>
                </div>
                {isActive && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                    active
                  </Badge>
                )}
              </div>
            )
          })}
        </div>

        {/* Quick reference */}
        <div className="text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
          <div className="font-medium mb-1">Tailwind Breakpoints</div>
          <div className="grid grid-cols-2 gap-1 font-mono">
            <span>sm: 640px</span>
            <span>md: 768px</span>
            <span>lg: 1024px</span>
            <span>xl: 1280px</span>
            <span>2xl: 1536px</span>
          </div>
        </div>

        {/* Device pixel ratio */}
        <div className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
          <span className="text-muted-foreground">Device Pixel Ratio</span>
          <span className="font-mono">{window.devicePixelRatio}x</span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, LayoutGrid, Rows, Grid3X3, Eye, EyeOff, Layers
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Switch } from "../ui/switch"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface LayoutContainer {
  element: HTMLElement
  type: "flex" | "grid"
  rect: DOMRect
  styles: {
    display: string
    flexDirection?: string
    justifyContent?: string
    alignItems?: string
    gap?: string
    gridTemplateColumns?: string
    gridTemplateRows?: string
  }
  children: {
    element: HTMLElement
    rect: DOMRect
  }[]
}

// Find all flex and grid containers
function findLayoutContainers(): LayoutContainer[] {
  const containers: LayoutContainer[] = []
  const allElements = document.querySelectorAll("*:not([data-devtools] *)")

  allElements.forEach((el) => {
    if (el.hasAttribute("data-devtools")) return

    const computed = getComputedStyle(el)
    const display = computed.display

    if (display === "flex" || display === "inline-flex") {
      const children = Array.from(el.children).map((child) => ({
        element: child as HTMLElement,
        rect: child.getBoundingClientRect(),
      }))

      containers.push({
        element: el as HTMLElement,
        type: "flex",
        rect: el.getBoundingClientRect(),
        styles: {
          display,
          flexDirection: computed.flexDirection,
          justifyContent: computed.justifyContent,
          alignItems: computed.alignItems,
          gap: computed.gap,
        },
        children,
      })
    } else if (display === "grid" || display === "inline-grid") {
      const children = Array.from(el.children).map((child) => ({
        element: child as HTMLElement,
        rect: child.getBoundingClientRect(),
      }))

      containers.push({
        element: el as HTMLElement,
        type: "grid",
        rect: el.getBoundingClientRect(),
        styles: {
          display,
          gridTemplateColumns: computed.gridTemplateColumns,
          gridTemplateRows: computed.gridTemplateRows,
          gap: computed.gap,
        },
        children,
      })
    }
  })

  return containers
}

export function LayoutDebugger() {
  const { isOpen, selectedElement, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isEnabled, setIsEnabled] = useState(false)
  const [containers, setContainers] = useState<LayoutContainer[]>([])
  const [showFlex, setShowFlex] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [highlightedContainer, setHighlightedContainer] = useState<HTMLElement | null>(null)

  // Scan for containers when enabled
  useEffect(() => {
    if (!isEnabled) {
      setContainers([])
      return
    }

    const scan = () => {
      setContainers(findLayoutContainers())
    }

    scan()

    // Re-scan on DOM changes
    const observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })

    // Re-scan on resize
    window.addEventListener("resize", scan)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", scan)
    }
  }, [isEnabled])

  // Filter containers
  const filteredContainers = useMemo(() => {
    return containers.filter((c) => {
      if (c.type === "flex" && !showFlex) return false
      if (c.type === "grid" && !showGrid) return false
      return true
    })
  }, [containers, showFlex, showGrid])

  // Stats
  const stats = useMemo(() => ({
    flex: containers.filter((c) => c.type === "flex").length,
    grid: containers.filter((c) => c.type === "grid").length,
  }), [containers])

  // Select container
  const selectContainer = useCallback((container: LayoutContainer) => {
    const computed = getComputedStyle(container.element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: container.element,
      tagName: container.element.tagName.toLowerCase(),
      id: container.element.id,
      classList: Array.from(container.element.classList),
      rect: container.rect,
      computedStyles,
    })
  }, [setSelectedElement])

  if (!isOpen) return null

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-chart-3" />
            <span>Layout Debugger</span>
            {isEnabled && (
              <Badge variant="secondary" className="text-[10px] px-1 h-4">
                {filteredContainers.length}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pt-2">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Enable overlay</Label>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          {isEnabled && (
            <>
              {/* Filter toggles */}
              <div className="flex gap-2">
                <Button
                  variant={showFlex ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => setShowFlex(!showFlex)}
                >
                  <Rows className="h-3 w-3 mr-1" />
                  Flex ({stats.flex})
                </Button>
                <Button
                  variant={showGrid ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => setShowGrid(!showGrid)}
                >
                  <Grid3X3 className="h-3 w-3 mr-1" />
                  Grid ({stats.grid})
                </Button>
              </div>

              {/* Container list */}
              <ScrollArea className="h-[150px]">
                <div className="space-y-1">
                  {filteredContainers.map((container, index) => {
                    const tag = container.element.tagName.toLowerCase()
                    const id = container.element.id
                    const classList = Array.from(container.element.classList).slice(0, 2)

                    return (
                      <div
                        key={index}
                        className={cn(
                          "p-2 rounded-md cursor-pointer border-l-2",
                          container.type === "flex" && "border-l-blue-500 bg-blue-500/5",
                          container.type === "grid" && "border-l-purple-500 bg-purple-500/5",
                          highlightedContainer === container.element && "ring-1 ring-primary"
                        )}
                        onClick={() => selectContainer(container)}
                        onMouseEnter={() => setHighlightedContainer(container.element)}
                        onMouseLeave={() => setHighlightedContainer(null)}
                      >
                        <div className="flex items-center gap-2">
                          {container.type === "flex" ? (
                            <Rows className="h-3 w-3 text-blue-500" />
                          ) : (
                            <Grid3X3 className="h-3 w-3 text-purple-500" />
                          )}
                          <span className="text-xs font-mono">
                            {tag}
                            {id && `#${id}`}
                            {classList.length > 0 && `.${classList.join(".")}`}
                          </span>
                          <Badge variant="outline" className="text-[9px] h-4 px-1 ml-auto">
                            {container.children.length} items
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                          {container.type === "flex" && (
                            <>
                              {container.styles.flexDirection} | {container.styles.justifyContent} | {container.styles.alignItems}
                            </>
                          )}
                          {container.type === "grid" && (
                            <>
                              cols: {container.styles.gridTemplateColumns?.split(" ").length || 0} |
                              rows: {container.styles.gridTemplateRows?.split(" ").length || 0}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {filteredContainers.length === 0 && (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                      No layout containers found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Overlay */}
      {isEnabled && (
        <LayoutOverlay
          containers={filteredContainers}
          highlightedContainer={highlightedContainer}
        />
      )}
    </>
  )
}

// Overlay component
function LayoutOverlay({
  containers,
  highlightedContainer,
}: {
  containers: LayoutContainer[]
  highlightedContainer: HTMLElement | null
}) {
  return (
    <div className="fixed inset-0 pointer-events-none z-9990" data-devtools>
      <svg className="w-full h-full">
        {containers.map((container, index) => {
          const isHighlighted = highlightedContainer === container.element
          const color = container.type === "flex" ? "59, 130, 246" : "168, 85, 247" // blue-500 or purple-500

          return (
            <g key={index}>
              {/* Container outline */}
              <rect
                x={container.rect.left}
                y={container.rect.top}
                width={container.rect.width}
                height={container.rect.height}
                fill={`rgba(${color}, ${isHighlighted ? 0.1 : 0.05})`}
                stroke={`rgba(${color}, ${isHighlighted ? 0.8 : 0.4})`}
                strokeWidth={isHighlighted ? 2 : 1}
                strokeDasharray={isHighlighted ? "none" : "4 2"}
              />

              {/* Child outlines */}
              {container.children.map((child, childIndex) => (
                <rect
                  key={childIndex}
                  x={child.rect.left}
                  y={child.rect.top}
                  width={child.rect.width}
                  height={child.rect.height}
                  fill="none"
                  stroke={`rgba(${color}, 0.3)`}
                  strokeWidth="1"
                />
              ))}

              {/* Gap indicators for flex */}
              {container.type === "flex" && container.children.length > 1 && (
                <>
                  {container.children.slice(0, -1).map((child, i) => {
                    const next = container.children[i + 1]
                    const isRow = container.styles.flexDirection === "row" ||
                                 container.styles.flexDirection === "row-reverse"

                    if (isRow) {
                      const gapStart = child.rect.right
                      const gapEnd = next.rect.left
                      const gapWidth = gapEnd - gapStart

                      if (gapWidth > 2) {
                        return (
                          <g key={`gap-${i}`}>
                            <line
                              x1={gapStart}
                              y1={child.rect.top + child.rect.height / 2}
                              x2={gapEnd}
                              y2={child.rect.top + child.rect.height / 2}
                              stroke={`rgba(${color}, 0.6)`}
                              strokeWidth="1"
                              strokeDasharray="2 2"
                            />
                            <text
                              x={(gapStart + gapEnd) / 2}
                              y={child.rect.top + child.rect.height / 2 - 4}
                              textAnchor="middle"
                              fill={`rgb(${color})`}
                              fontSize="9"
                              fontFamily="monospace"
                            >
                              {Math.round(gapWidth)}
                            </text>
                          </g>
                        )
                      }
                    } else {
                      const gapStart = child.rect.bottom
                      const gapEnd = next.rect.top
                      const gapHeight = gapEnd - gapStart

                      if (gapHeight > 2) {
                        return (
                          <g key={`gap-${i}`}>
                            <line
                              x1={child.rect.left + child.rect.width / 2}
                              y1={gapStart}
                              x2={child.rect.left + child.rect.width / 2}
                              y2={gapEnd}
                              stroke={`rgba(${color}, 0.6)`}
                              strokeWidth="1"
                              strokeDasharray="2 2"
                            />
                            <text
                              x={child.rect.left + child.rect.width / 2 + 8}
                              y={(gapStart + gapEnd) / 2 + 3}
                              textAnchor="start"
                              fill={`rgb(${color})`}
                              fontSize="9"
                              fontFamily="monospace"
                            >
                              {Math.round(gapHeight)}
                            </text>
                          </g>
                        )
                      }
                    }
                    return null
                  })}
                </>
              )}

              {/* Container label */}
              <g>
                <rect
                  x={container.rect.left}
                  y={container.rect.top - 16}
                  width={container.type === "flex" ? 32 : 32}
                  height={14}
                  fill={`rgb(${color})`}
                  rx="2"
                />
                <text
                  x={container.rect.left + 16}
                  y={container.rect.top - 6}
                  textAnchor="middle"
                  fill="white"
                  fontSize="9"
                  fontWeight="600"
                >
                  {container.type.toUpperCase()}
                </text>
              </g>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

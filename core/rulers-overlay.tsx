"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import { X, Ruler, Plus, Trash2 } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { useInspector } from "./inspector-context"

interface Guide {
  id: string
  position: number
  orientation: "horizontal" | "vertical"
}

export function RulersOverlay() {
  const { isOpen, previewWidth } = useInspector()
  const [showRulers, setShowRulers] = useState(false)
  const [guides, setGuides] = useState<Guide[]>([])
  const [draggingGuide, setDraggingGuide] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Viewport dimensions
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

  // Update viewport size
  useEffect(() => {
    const updateSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  // Add guide from ruler
  const addGuideFromRuler = useCallback((orientation: "horizontal" | "vertical", e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const position = orientation === "horizontal"
      ? e.clientY - rect.top
      : e.clientX - rect.left

    const newGuide: Guide = {
      id: `guide-${Date.now()}`,
      position,
      orientation,
    }
    setGuides((prev) => [...prev, newGuide])
  }, [])

  // Move guide
  const moveGuide = useCallback((id: string, position: number) => {
    setGuides((prev) =>
      prev.map((g) => (g.id === id ? { ...g, position } : g))
    )
  }, [])

  // Remove guide
  const removeGuide = useCallback((id: string) => {
    setGuides((prev) => prev.filter((g) => g.id !== id))
  }, [])

  // Handle mouse move for dragging guides
  useEffect(() => {
    if (!draggingGuide) return

    const handleMouseMove = (e: MouseEvent) => {
      const guide = guides.find((g) => g.id === draggingGuide)
      if (!guide) return

      const position = guide.orientation === "horizontal"
        ? e.clientY
        : e.clientX

      moveGuide(draggingGuide, position)
    }

    const handleMouseUp = () => {
      setDraggingGuide(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [draggingGuide, guides, moveGuide])

  // Generate ruler ticks
  const generateTicks = (length: number, majorInterval: number = 100) => {
    const ticks: Array<{ position: number; isMajor: boolean; label?: string }> = []
    for (let i = 0; i <= length; i += 10) {
      const isMajor = i % majorInterval === 0
      ticks.push({
        position: i,
        isMajor,
        label: isMajor ? i.toString() : undefined,
      })
    }
    return ticks
  }

  if (!isOpen) return null

  const horizontalTicks = generateTicks(viewportSize.width)
  const verticalTicks = generateTicks(viewportSize.height)

  return (
    <>
      {/* Rulers Toggle Button */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-9999 flex items-center gap-2"
        data-devtools
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showRulers ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-8 px-3 gap-2 shadow-lg",
                showRulers && "bg-chart-3 text-chart-3-foreground hover:bg-chart-3/90"
              )}
              onClick={() => setShowRulers(!showRulers)}
            >
              <Ruler className="h-4 w-4" />
              <span className="text-xs">Rulers</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showRulers ? "Hide Rulers" : "Show Rulers"}</TooltipContent>
        </Tooltip>

        {showRulers && guides.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-2 shadow-lg"
            onClick={() => setGuides([])}
          >
            <Trash2 className="h-3 w-3" />
            <span className="text-xs">Clear Guides</span>
          </Button>
        )}
      </div>

      {showRulers && (
        <div ref={containerRef} className="fixed inset-0 pointer-events-none z-9990" data-devtools>
          {/* Horizontal Ruler (Top) */}
          <div
            className="absolute top-0 left-8 right-0 h-6 bg-card/95 border-b pointer-events-auto cursor-crosshair"
            onClick={(e) => addGuideFromRuler("vertical", e)}
          >
            <svg
              width="100%"
              height="100%"
              className="text-muted-foreground"
            >
              {horizontalTicks.map(({ position, isMajor, label }) => (
                <g key={position}>
                  <line
                    x1={position}
                    y1={isMajor ? 0 : 16}
                    x2={position}
                    y2={24}
                    stroke="currentColor"
                    strokeWidth={isMajor ? 1 : 0.5}
                    opacity={isMajor ? 0.6 : 0.3}
                  />
                  {label && (
                    <text
                      x={position + 2}
                      y={12}
                      fontSize="9"
                      fill="currentColor"
                      opacity={0.7}
                    >
                      {label}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>

          {/* Vertical Ruler (Left) */}
          <div
            className="absolute top-6 left-0 bottom-0 w-6 bg-card/95 border-r pointer-events-auto cursor-crosshair"
            onClick={(e) => addGuideFromRuler("horizontal", e)}
          >
            <svg
              width="100%"
              height="100%"
              className="text-muted-foreground"
            >
              {verticalTicks.map(({ position, isMajor, label }) => (
                <g key={position}>
                  <line
                    x1={isMajor ? 0 : 16}
                    y1={position}
                    x2={24}
                    y2={position}
                    stroke="currentColor"
                    strokeWidth={isMajor ? 1 : 0.5}
                    opacity={isMajor ? 0.6 : 0.3}
                  />
                  {label && (
                    <text
                      x={2}
                      y={position + 10}
                      fontSize="9"
                      fill="currentColor"
                      opacity={0.7}
                      style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                    >
                      {label}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>

          {/* Corner */}
          <div className="absolute top-0 left-0 w-6 h-6 bg-card/95 border-r border-b" />

          {/* Guides */}
          {guides.map((guide) => (
            <div
              key={guide.id}
              className={cn(
                "absolute pointer-events-auto cursor-move group",
                guide.orientation === "horizontal"
                  ? "left-0 right-0 h-px"
                  : "top-0 bottom-0 w-px"
              )}
              style={{
                [guide.orientation === "horizontal" ? "top" : "left"]: guide.position,
                backgroundColor: "#3b82f6",
              }}
              onMouseDown={() => setDraggingGuide(guide.id)}
            >
              {/* Guide label */}
              <div
                className={cn(
                  "absolute bg-blue-500 text-white text-[9px] px-1 rounded",
                  guide.orientation === "horizontal"
                    ? "left-8 top-0 -translate-y-1/2"
                    : "top-8 left-0 -translate-x-1/2"
                )}
              >
                {Math.round(guide.position)}px
              </div>

              {/* Remove button */}
              <button
                className={cn(
                  "absolute bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                  guide.orientation === "horizontal"
                    ? "right-2 top-0 -translate-y-1/2"
                    : "bottom-2 left-0 -translate-x-1/2"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  removeGuide(guide.id)
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

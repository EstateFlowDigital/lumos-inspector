"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  ChevronDown, AlignHorizontalDistributeCenter, Eye, EyeOff
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface AlignmentLine {
  type: "horizontal" | "vertical"
  position: number
  elements: DOMRect[]
}

export function AlignmentGuideOverlay() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [showGuides, setShowGuides] = useState(false)
  const [showCenter, setShowCenter] = useState(true)
  const [showEdges, setShowEdges] = useState(true)
  const [tolerance, setTolerance] = useState(3)
  const [alignments, setAlignments] = useState<AlignmentLine[]>([])

  // Find alignments
  const findAlignments = useCallback(() => {
    if (!selectedElement?.element) return

    const selectedRect = selectedElement.element.getBoundingClientRect()
    const found: AlignmentLine[] = []

    // Get all visible elements
    const elements = document.querySelectorAll("*:not([data-devtools] *)")
    const rects: { el: HTMLElement; rect: DOMRect }[] = []

    elements.forEach(el => {
      if (el === selectedElement.element) return
      if ((el as HTMLElement).hasAttribute?.("data-devtools")) return

      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        rects.push({ el: el as HTMLElement, rect })
      }
    })

    // Check for horizontal alignments
    const hPositions = new Map<number, DOMRect[]>()

    // Selected element positions
    const selectedPositions = {
      top: selectedRect.top,
      bottom: selectedRect.bottom,
      centerY: selectedRect.top + selectedRect.height / 2,
      left: selectedRect.left,
      right: selectedRect.right,
      centerX: selectedRect.left + selectedRect.width / 2,
    }

    rects.forEach(({ rect }) => {
      const positions = [
        { pos: rect.top, type: "edge" },
        { pos: rect.bottom, type: "edge" },
        { pos: rect.top + rect.height / 2, type: "center" },
      ]

      positions.forEach(({ pos, type }) => {
        if (type === "center" && !showCenter) return
        if (type === "edge" && !showEdges) return

        // Check against selected element positions
        if (Math.abs(pos - selectedPositions.top) <= tolerance) {
          if (!hPositions.has(selectedPositions.top)) hPositions.set(selectedPositions.top, [])
          hPositions.get(selectedPositions.top)!.push(rect)
        }
        if (Math.abs(pos - selectedPositions.bottom) <= tolerance) {
          if (!hPositions.has(selectedPositions.bottom)) hPositions.set(selectedPositions.bottom, [])
          hPositions.get(selectedPositions.bottom)!.push(rect)
        }
        if (Math.abs(pos - selectedPositions.centerY) <= tolerance) {
          if (!hPositions.has(selectedPositions.centerY)) hPositions.set(selectedPositions.centerY, [])
          hPositions.get(selectedPositions.centerY)!.push(rect)
        }
      })
    })

    // Check for vertical alignments
    const vPositions = new Map<number, DOMRect[]>()

    rects.forEach(({ rect }) => {
      const positions = [
        { pos: rect.left, type: "edge" },
        { pos: rect.right, type: "edge" },
        { pos: rect.left + rect.width / 2, type: "center" },
      ]

      positions.forEach(({ pos, type }) => {
        if (type === "center" && !showCenter) return
        if (type === "edge" && !showEdges) return

        if (Math.abs(pos - selectedPositions.left) <= tolerance) {
          if (!vPositions.has(selectedPositions.left)) vPositions.set(selectedPositions.left, [])
          vPositions.get(selectedPositions.left)!.push(rect)
        }
        if (Math.abs(pos - selectedPositions.right) <= tolerance) {
          if (!vPositions.has(selectedPositions.right)) vPositions.set(selectedPositions.right, [])
          vPositions.get(selectedPositions.right)!.push(rect)
        }
        if (Math.abs(pos - selectedPositions.centerX) <= tolerance) {
          if (!vPositions.has(selectedPositions.centerX)) vPositions.set(selectedPositions.centerX, [])
          vPositions.get(selectedPositions.centerX)!.push(rect)
        }
      })
    })

    // Convert to alignment lines
    hPositions.forEach((elements, position) => {
      found.push({ type: "horizontal", position, elements })
    })

    vPositions.forEach((elements, position) => {
      found.push({ type: "vertical", position, elements })
    })

    setAlignments(found)
  }, [selectedElement, showCenter, showEdges, tolerance])

  // Update alignments when selected element changes
  useEffect(() => {
    if (showGuides && selectedElement) {
      findAlignments()
    } else {
      setAlignments([])
    }
  }, [showGuides, selectedElement, findAlignments])

  // Toggle guides
  const toggleGuides = useCallback(() => {
    setShowGuides(prev => {
      if (!prev && !selectedElement) {
        toast.error("Select an element first")
        return prev
      }
      return !prev
    })
  }, [selectedElement])

  if (!isOpen) return null

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
          <div className="flex items-center gap-2">
            <AlignHorizontalDistributeCenter className="h-4 w-4 text-pink-500" />
            <span>Alignment Guides</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pt-2">
          {/* Toggle */}
          <Button
            variant={showGuides ? "default" : "outline"}
            size="sm"
            className="w-full h-7"
            onClick={toggleGuides}
          >
            {showGuides ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Hide Guides
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Show Guides
              </>
            )}
          </Button>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="center-guides"
                  checked={showCenter}
                  onCheckedChange={setShowCenter}
                />
                <Label htmlFor="center-guides" className="text-xs">Center alignments</Label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="edge-guides"
                  checked={showEdges}
                  onCheckedChange={setShowEdges}
                />
                <Label htmlFor="edge-guides" className="text-xs">Edge alignments</Label>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Tolerance</Label>
                <span className="text-[10px] font-mono">{tolerance}px</span>
              </div>
              <Slider
                value={[tolerance]}
                onValueChange={([v]) => setTolerance(v)}
                min={1}
                max={10}
                step={1}
              />
            </div>
          </div>

          {/* Info */}
          <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
            {showGuides ? (
              alignments.length > 0 ? (
                `Found ${alignments.length} alignment(s) with other elements`
              ) : (
                "No alignments found with current settings"
              )
            ) : (
              "Select an element and enable guides to see alignments"
            )}
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 bg-pink-500" />
              Horizontal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-0.5 h-4 bg-cyan-500" />
              Vertical
            </span>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Overlay */}
      {showGuides && alignments.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-9990" data-devtools>
          {alignments.map((line, i) => (
            <div
              key={i}
              className={cn(
                "absolute",
                line.type === "horizontal"
                  ? "left-0 right-0 h-px bg-pink-500"
                  : "top-0 bottom-0 w-px bg-cyan-500"
              )}
              style={
                line.type === "horizontal"
                  ? { top: line.position }
                  : { left: line.position }
              }
            />
          ))}
        </div>
      )}
    </>
  )
}

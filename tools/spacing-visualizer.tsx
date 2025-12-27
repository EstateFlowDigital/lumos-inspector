"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import {
  ChevronDown, Box
} from "lucide-react"
import { cn, isElementInDOM, safeGetBoundingRect, safeGetComputedStyle, throttle } from "../lib/utils"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface SpacingInfo {
  margin: { top: number; right: number; bottom: number; left: number }
  padding: { top: number; right: number; bottom: number; left: number }
  border: { top: number; right: number; bottom: number; left: number }
  width: number
  height: number
}

export function SpacingVisualizer() {
  const { isOpen, selectedElement, styleChangeCounter } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [showOverlay, setShowOverlay] = useState(false)
  const [spacing, setSpacing] = useState<SpacingInfo | null>(null)

  // Get spacing from selected element
  useEffect(() => {
    if (!selectedElement?.element) {
      setSpacing(null)
      return
    }

    const el = selectedElement.element
    if (!isElementInDOM(el)) {
      setSpacing(null)
      return
    }

    const computed = safeGetComputedStyle(el)
    if (!computed) {
      setSpacing(null)
      return
    }

    const rect = safeGetBoundingRect(el)

    setSpacing({
      margin: {
        top: parseFloat(computed.marginTop) || 0,
        right: parseFloat(computed.marginRight) || 0,
        bottom: parseFloat(computed.marginBottom) || 0,
        left: parseFloat(computed.marginLeft) || 0,
      },
      padding: {
        top: parseFloat(computed.paddingTop) || 0,
        right: parseFloat(computed.paddingRight) || 0,
        bottom: parseFloat(computed.paddingBottom) || 0,
        left: parseFloat(computed.paddingLeft) || 0,
      },
      border: {
        top: parseFloat(computed.borderTopWidth) || 0,
        right: parseFloat(computed.borderRightWidth) || 0,
        bottom: parseFloat(computed.borderBottomWidth) || 0,
        left: parseFloat(computed.borderLeftWidth) || 0,
      },
      width: rect ? Math.round(rect.width) : 0,
      height: rect ? Math.round(rect.height) : 0,
    })
  }, [selectedElement, styleChangeCounter])

  // Format value - show dash for 0, otherwise show number
  const formatValue = (value: number): string => {
    return value === 0 ? "–" : String(Math.round(value))
  }

  if (!isOpen) return null

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-chart-4" />
            <span>Spacing</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent className="px-2 pt-2 pb-1 overflow-hidden">
          {/* Toggle overlay */}
          <div className="flex items-center gap-2 mb-3">
            <Switch
              checked={showOverlay}
              onCheckedChange={setShowOverlay}
              id="spacing-overlay"
            />
            <Label htmlFor="spacing-overlay" className="text-xs">Show on page</Label>
          </div>

          {!selectedElement ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              Select an element to view spacing
            </div>
          ) : spacing && (
            /* Webflow-style box model visualization */
            <div className="select-none">
              {/* Margin layer (orange) */}
              <div className="bg-[#f6b26b]/20 rounded-sm border border-[#f6b26b]/30">
                {/* Margin top */}
                <div className="flex items-center justify-center h-6 text-[10px] text-[#e69138]">
                  <span className="font-mono">{formatValue(spacing.margin.top)}</span>
                </div>

                <div className="flex">
                  {/* Left margin */}
                  <div className="w-8 flex items-center justify-center text-[10px] font-mono text-[#e69138]">
                    {formatValue(spacing.margin.left)}
                  </div>

                  {/* Padding layer (green) */}
                  <div className="flex-1 bg-[#93c47d]/20 border border-[#6aa84f]/30 rounded-sm my-0.5">
                    {/* Padding top */}
                    <div className="flex items-center justify-center h-5 text-[10px] text-[#6aa84f]">
                      <span className="font-mono">{formatValue(spacing.padding.top)}</span>
                    </div>

                    <div className="flex">
                      {/* Left padding */}
                      <div className="w-7 flex items-center justify-center text-[10px] font-mono text-[#6aa84f]">
                        {formatValue(spacing.padding.left)}
                      </div>

                      {/* Content box (blue) */}
                      <div className="flex-1 bg-[#6fa8dc]/30 border border-[#3d85c6]/40 rounded-sm flex items-center justify-center py-2 mx-0.5">
                        <span className="text-[10px] font-mono text-[#3d85c6]">
                          {spacing.width}×{spacing.height}
                        </span>
                      </div>

                      {/* Right padding */}
                      <div className="w-7 flex items-center justify-center text-[10px] font-mono text-[#6aa84f]">
                        {formatValue(spacing.padding.right)}
                      </div>
                    </div>

                    {/* Padding bottom */}
                    <div className="flex items-center justify-center h-5 text-[10px] font-mono text-[#6aa84f]">
                      {formatValue(spacing.padding.bottom)}
                    </div>
                  </div>

                  {/* Right margin */}
                  <div className="w-8 flex items-center justify-center text-[10px] font-mono text-[#e69138]">
                    {formatValue(spacing.margin.right)}
                  </div>
                </div>

                {/* Margin bottom */}
                <div className="flex items-center justify-center h-6 text-[10px] font-mono text-[#e69138]">
                  {formatValue(spacing.margin.bottom)}
                </div>
              </div>

              {/* Border info (if any) */}
              {(spacing.border.top > 0 || spacing.border.right > 0 || spacing.border.bottom > 0 || spacing.border.left > 0) && (
                <div className="mt-1.5 py-1 bg-[#ffe599]/20 rounded-sm text-center">
                  <span className="text-[9px] text-[#bf9000]">
                    border: {spacing.border.top}/{spacing.border.right}/{spacing.border.bottom}/{spacing.border.left}
                  </span>
                </div>
              )}

              {/* Legend */}
              <div className="flex justify-center gap-2 mt-1.5 pt-1.5 border-t border-border/30 text-[8px]">
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-sm bg-[#f6b26b]" />
                  <span className="text-muted-foreground">margin</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-sm bg-[#93c47d]" />
                  <span className="text-muted-foreground">padding</span>
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-sm bg-[#6fa8dc]" />
                  <span className="text-muted-foreground">content</span>
                </span>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Overlay for selected element */}
      {showOverlay && selectedElement?.element && spacing && (
        <SpacingOverlay element={selectedElement.element} />
      )}
    </>
  )
}

// Overlay component that shows spacing on the actual page
function SpacingOverlay({ element }: { element: HTMLElement }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [spacing, setSpacing] = useState<{
    margin: { top: number; right: number; bottom: number; left: number }
    padding: { top: number; right: number; bottom: number; left: number }
  } | null>(null)

  // Update with throttling
  const updateOverlay = useMemo(() => throttle(() => {
    if (!isElementInDOM(element)) {
      setRect(null)
      setSpacing(null)
      return
    }

    const newRect = safeGetBoundingRect(element)
    const computed = safeGetComputedStyle(element)

    if (newRect && computed) {
      setRect(newRect)
      setSpacing({
        margin: {
          top: parseFloat(computed.marginTop) || 0,
          right: parseFloat(computed.marginRight) || 0,
          bottom: parseFloat(computed.marginBottom) || 0,
          left: parseFloat(computed.marginLeft) || 0,
        },
        padding: {
          top: parseFloat(computed.paddingTop) || 0,
          right: parseFloat(computed.paddingRight) || 0,
          bottom: parseFloat(computed.paddingBottom) || 0,
          left: parseFloat(computed.paddingLeft) || 0,
        },
      })
    }
  }, 50), [element])

  useEffect(() => {
    updateOverlay()

    window.addEventListener("scroll", updateOverlay, true)
    window.addEventListener("resize", updateOverlay)

    return () => {
      window.removeEventListener("scroll", updateOverlay, true)
      window.removeEventListener("resize", updateOverlay)
    }
  }, [updateOverlay])

  if (!rect || !spacing) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9990]" data-devtools>
      {/* Margin - top */}
      {spacing.margin.top > 0 && (
        <div
          className="absolute bg-[#f6b26b]/30"
          style={{
            left: rect.left - spacing.margin.left,
            top: rect.top - spacing.margin.top,
            width: rect.width + spacing.margin.left + spacing.margin.right,
            height: spacing.margin.top,
          }}
        />
      )}
      {/* Margin - bottom */}
      {spacing.margin.bottom > 0 && (
        <div
          className="absolute bg-[#f6b26b]/30"
          style={{
            left: rect.left - spacing.margin.left,
            top: rect.bottom,
            width: rect.width + spacing.margin.left + spacing.margin.right,
            height: spacing.margin.bottom,
          }}
        />
      )}
      {/* Margin - left */}
      {spacing.margin.left > 0 && (
        <div
          className="absolute bg-[#f6b26b]/30"
          style={{
            left: rect.left - spacing.margin.left,
            top: rect.top,
            width: spacing.margin.left,
            height: rect.height,
          }}
        />
      )}
      {/* Margin - right */}
      {spacing.margin.right > 0 && (
        <div
          className="absolute bg-[#f6b26b]/30"
          style={{
            left: rect.right,
            top: rect.top,
            width: spacing.margin.right,
            height: rect.height,
          }}
        />
      )}

      {/* Padding - top */}
      {spacing.padding.top > 0 && (
        <div
          className="absolute bg-[#93c47d]/30"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: spacing.padding.top,
          }}
        />
      )}
      {/* Padding - bottom */}
      {spacing.padding.bottom > 0 && (
        <div
          className="absolute bg-[#93c47d]/30"
          style={{
            left: rect.left,
            top: rect.bottom - spacing.padding.bottom,
            width: rect.width,
            height: spacing.padding.bottom,
          }}
        />
      )}
      {/* Padding - left */}
      {spacing.padding.left > 0 && (
        <div
          className="absolute bg-[#93c47d]/30"
          style={{
            left: rect.left,
            top: rect.top + spacing.padding.top,
            width: spacing.padding.left,
            height: rect.height - spacing.padding.top - spacing.padding.bottom,
          }}
        />
      )}
      {/* Padding - right */}
      {spacing.padding.right > 0 && (
        <div
          className="absolute bg-[#93c47d]/30"
          style={{
            left: rect.right - spacing.padding.right,
            top: rect.top + spacing.padding.top,
            width: spacing.padding.right,
            height: rect.height - spacing.padding.top - spacing.padding.bottom,
          }}
        />
      )}

      {/* Element border outline */}
      <div
        className="absolute border-2 border-[#3d85c6]"
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        }}
      />
    </div>
  )
}

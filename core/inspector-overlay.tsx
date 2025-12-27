"use client"

import * as React from "react"
import { useEffect, useState, useCallback, useMemo } from "react"
import { useInspector, ElementInfo } from "./inspector-context"
import { throttle, isElementInDOM, safeGetBoundingRect } from "../lib/utils"

// Get computed styles for an element
function getComputedStylesForElement(element: HTMLElement): Record<string, string> {
  const computed = window.getComputedStyle(element)
  const styles: Record<string, string> = {}

  const importantProps = [
    'display', 'position', 'width', 'height', 'margin', 'padding',
    'flexDirection', 'justifyContent', 'alignItems', 'gap',
    'backgroundColor', 'color', 'fontSize', 'fontWeight',
    'border', 'borderRadius', 'boxShadow', 'opacity', 'overflow'
  ]

  importantProps.forEach(prop => {
    styles[prop] = computed.getPropertyValue(
      prop.replace(/([A-Z])/g, '-$1').toLowerCase()
    )
  })

  return styles
}

// Get element path for breadcrumb
function getElementPath(element: HTMLElement): string[] {
  const path: string[] = []
  let current: HTMLElement | null = element

  while (current && current !== document.body && path.length < 5) {
    let label = current.tagName.toLowerCase()
    if (current.id) {
      label += `#${current.id}`
    } else if (current.classList.length > 0) {
      label += `.${current.classList[0]}`
    }
    path.unshift(label)
    current = current.parentElement
  }

  return path
}

// Parse spacing values
function getSpacingValues(element: HTMLElement): {
  margin: { top: number; right: number; bottom: number; left: number }
  padding: { top: number; right: number; bottom: number; left: number }
} {
  const computed = window.getComputedStyle(element)
  return {
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
  }
}

export function InspectorOverlay() {
  const {
    isOpen,
    isInspecting,
    setIsInspecting,
    selectedElement,
    setSelectedElement,
    hoveredElement,
    setHoveredElement,
    refreshDOMTree,
    expandNode,
  } = useInspector()

  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null)
  const [selectRect, setSelectRect] = useState<DOMRect | null>(null)
  const [hoverSpacing, setHoverSpacing] = useState<ReturnType<typeof getSpacingValues> | null>(null)
  const [selectSpacing, setSelectSpacing] = useState<ReturnType<typeof getSpacingValues> | null>(null)

  // Update hover rect with element validation
  useEffect(() => {
    if (hoveredElement && isOpen && isElementInDOM(hoveredElement)) {
      const rect = safeGetBoundingRect(hoveredElement)
      if (rect) {
        setHoverRect(rect)
        setHoverSpacing(getSpacingValues(hoveredElement))
      } else {
        setHoverRect(null)
        setHoverSpacing(null)
      }
    } else {
      setHoverRect(null)
      setHoverSpacing(null)
    }
  }, [hoveredElement, isOpen])

  // Update select rect with element validation
  useEffect(() => {
    if (selectedElement?.element && isOpen && isElementInDOM(selectedElement.element)) {
      const rect = safeGetBoundingRect(selectedElement.element)
      if (rect) {
        setSelectRect(rect)
        setSelectSpacing(getSpacingValues(selectedElement.element))
      } else {
        setSelectRect(null)
        setSelectSpacing(null)
      }
    } else {
      setSelectRect(null)
      setSelectSpacing(null)
    }
  }, [selectedElement, isOpen])

  // Handle click during inspection
  const handleClick = useCallback((e: MouseEvent) => {
    if (!isInspecting) return

    const target = e.target as HTMLElement

    // Don't select DevTools elements
    if (target.closest('[data-devtools]')) return

    e.preventDefault()
    e.stopPropagation()

    const rect = target.getBoundingClientRect()
    const computed = getComputedStylesForElement(target)

    const info: ElementInfo = {
      tagName: target.tagName.toLowerCase(),
      id: target.id,
      classList: Array.from(target.classList),
      computedStyles: computed,
      rect,
      element: target,
      path: getElementPath(target).join(' > '),
    }

    setSelectedElement(info)
    setIsInspecting(false)
    refreshDOMTree()
  }, [isInspecting, setSelectedElement, setIsInspecting, refreshDOMTree])

  // Handle mouseover during inspection
  const handleMouseOver = useCallback((e: MouseEvent) => {
    if (!isInspecting) return

    const target = e.target as HTMLElement

    // Don't highlight DevTools elements
    if (target.closest('[data-devtools]')) {
      setHoveredElement(null)
      return
    }

    setHoveredElement(target)
  }, [isInspecting, setHoveredElement])

  // Handle mouseout
  const handleMouseOut = useCallback(() => {
    if (isInspecting) {
      setHoveredElement(null)
    }
  }, [isInspecting, setHoveredElement])

  // Handle escape to cancel inspection
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && isInspecting) {
      setIsInspecting(false)
      setHoveredElement(null)
    }
  }, [isInspecting, setIsInspecting, setHoveredElement])

  // Add event listeners
  useEffect(() => {
    if (isInspecting) {
      document.addEventListener("click", handleClick, true)
      document.addEventListener("mouseover", handleMouseOver, true)
      document.addEventListener("mouseout", handleMouseOut, true)
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.cursor = "crosshair"
    }

    return () => {
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("mouseover", handleMouseOver, true)
      document.removeEventListener("mouseout", handleMouseOut, true)
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.cursor = ""
    }
  }, [isInspecting, handleClick, handleMouseOver, handleMouseOut, handleKeyDown])

  // Throttled rect updater to prevent performance issues
  const updateRects = useMemo(() => throttle(() => {
    if (hoveredElement && isElementInDOM(hoveredElement)) {
      const rect = safeGetBoundingRect(hoveredElement)
      if (rect) {
        setHoverRect(rect)
        setHoverSpacing(getSpacingValues(hoveredElement))
      }
    } else if (hoveredElement) {
      setHoverRect(null)
      setHoverSpacing(null)
    }

    if (selectedElement?.element && isElementInDOM(selectedElement.element)) {
      const rect = safeGetBoundingRect(selectedElement.element)
      if (rect) {
        setSelectRect(rect)
        setSelectSpacing(getSpacingValues(selectedElement.element))
      }
    } else if (selectedElement) {
      setSelectRect(null)
      setSelectSpacing(null)
    }
  }, 16), [hoveredElement, selectedElement]) // ~60fps

  // Update rects on scroll/resize with throttling
  useEffect(() => {
    window.addEventListener("scroll", updateRects, true)
    window.addEventListener("resize", updateRects)

    return () => {
      window.removeEventListener("scroll", updateRects, true)
      window.removeEventListener("resize", updateRects)
    }
  }, [updateRects])

  if (!isOpen) return null

  // Get computed styles for hover element
  const hoverComputed = hoveredElement ? window.getComputedStyle(hoveredElement) : null

  return (
    <>
      {/* Hover highlight */}
      {hoverRect && !selectRect && (
        <div
          className="fixed pointer-events-none z-[9997]"
          style={{
            top: hoverRect.top - (hoverSpacing?.margin.top || 0),
            left: hoverRect.left - (hoverSpacing?.margin.left || 0),
            width: hoverRect.width + (hoverSpacing?.margin.left || 0) + (hoverSpacing?.margin.right || 0),
            height: hoverRect.height + (hoverSpacing?.margin.top || 0) + (hoverSpacing?.margin.bottom || 0),
          }}
          data-devtools
        >
          {/* Margin overlay */}
          <div
            className="absolute inset-0 border border-dashed"
            style={{
              borderColor: 'rgba(251, 146, 60, 0.5)',
              backgroundColor: 'rgba(251, 146, 60, 0.1)',
            }}
          />

          {/* Padding + Content box */}
          <div
            className="absolute"
            style={{
              top: hoverSpacing?.margin.top || 0,
              left: hoverSpacing?.margin.left || 0,
              right: hoverSpacing?.margin.right || 0,
              bottom: hoverSpacing?.margin.bottom || 0,
              border: '2px solid var(--chart-1)',
              backgroundColor: 'rgba(var(--chart-1-rgb, 59, 130, 246), 0.1)',
            }}
          >
            {/* Padding overlay */}
            {hoverSpacing && (hoverSpacing.padding.top > 0 || hoverSpacing.padding.right > 0 || hoverSpacing.padding.bottom > 0 || hoverSpacing.padding.left > 0) && (
              <div
                className="absolute inset-0 border border-dashed"
                style={{
                  borderColor: 'rgba(74, 222, 128, 0.5)',
                  backgroundColor: 'rgba(74, 222, 128, 0.1)',
                }}
              />
            )}
          </div>

          {/* Enhanced Label with more info */}
          <div
            className="absolute px-2 py-1 text-xs font-mono rounded shadow-lg flex items-center gap-2"
            style={{
              top: -28,
              left: hoverSpacing?.margin.left || 0,
              backgroundColor: 'var(--chart-1)',
              color: 'white',
            }}
          >
            <span className="font-semibold">
              {hoveredElement?.tagName.toLowerCase()}
            </span>
            {hoveredElement?.id && (
              <span className="opacity-80">#{hoveredElement.id}</span>
            )}
            {hoveredElement?.classList[0] && !hoveredElement?.id && (
              <span className="opacity-80">.{hoveredElement.classList[0]}</span>
            )}
            <span className="opacity-70 text-[10px]">
              {Math.round(hoverRect.width)} × {Math.round(hoverRect.height)}
            </span>
          </div>

          {/* Dimension guides */}
          {/* Width label */}
          <div
            className="absolute left-1/2 -translate-x-1/2 px-1 py-0.5 text-[10px] font-mono rounded"
            style={{
              bottom: -16,
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
            }}
          >
            {Math.round(hoverRect.width)}px
          </div>

          {/* Height label */}
          <div
            className="absolute top-1/2 -translate-y-1/2 px-1 py-0.5 text-[10px] font-mono rounded"
            style={{
              right: -40,
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
            }}
          >
            {Math.round(hoverRect.height)}px
          </div>
        </div>
      )}

      {/* Selected highlight */}
      {selectRect && selectSpacing && (
        <div
          className="fixed pointer-events-none z-[9996]"
          style={{
            top: selectRect.top - selectSpacing.margin.top,
            left: selectRect.left - selectSpacing.margin.left,
            width: selectRect.width + selectSpacing.margin.left + selectSpacing.margin.right,
            height: selectRect.height + selectSpacing.margin.top + selectSpacing.margin.bottom,
          }}
          data-devtools
        >
          {/* Margin box (orange) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: 'rgba(251, 146, 60, 0.15)',
            }}
          />

          {/* Border box */}
          <div
            className="absolute"
            style={{
              top: selectSpacing.margin.top,
              left: selectSpacing.margin.left,
              right: selectSpacing.margin.right,
              bottom: selectSpacing.margin.bottom,
              backgroundColor: 'rgba(251, 191, 36, 0.15)',
            }}
          >
            {/* Padding box (green) */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: 'rgba(74, 222, 128, 0.15)',
              }}
            />

            {/* Content box (blue) */}
            <div
              className="absolute border-2 border-primary"
              style={{
                top: selectSpacing.padding.top,
                left: selectSpacing.padding.left,
                right: selectSpacing.padding.right,
                bottom: selectSpacing.padding.bottom,
                backgroundColor: 'rgba(var(--primary-rgb, 59, 130, 246), 0.1)',
              }}
            />
          </div>

          {/* Label with path breadcrumb */}
          <div
            className="absolute px-2 py-1 text-xs font-mono rounded-t shadow-lg"
            style={{
              top: -28,
              left: selectSpacing.margin.left,
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">{selectedElement?.tagName}</span>
              {selectedElement?.id && (
                <span className="opacity-80">#{selectedElement.id}</span>
              )}
              {selectedElement?.classList[0] && !selectedElement?.id && (
                <span className="opacity-80">.{selectedElement.classList[0]}</span>
              )}
              <span className="ml-2 opacity-70">
                {Math.round(selectRect.width)} × {Math.round(selectRect.height)}
              </span>
            </div>
          </div>

          {/* Margin labels */}
          {selectSpacing.margin.top > 0 && (
            <div
              className="absolute left-1/2 -translate-x-1/2 px-1 text-[9px] font-mono"
              style={{
                top: selectSpacing.margin.top / 2 - 6,
                color: 'rgb(251, 146, 60)',
              }}
            >
              {Math.round(selectSpacing.margin.top)}
            </div>
          )}
          {selectSpacing.margin.bottom > 0 && (
            <div
              className="absolute left-1/2 -translate-x-1/2 px-1 text-[9px] font-mono"
              style={{
                bottom: selectSpacing.margin.bottom / 2 - 6,
                color: 'rgb(251, 146, 60)',
              }}
            >
              {Math.round(selectSpacing.margin.bottom)}
            </div>
          )}
          {selectSpacing.margin.left > 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 px-1 text-[9px] font-mono"
              style={{
                left: selectSpacing.margin.left / 2 - 8,
                color: 'rgb(251, 146, 60)',
              }}
            >
              {Math.round(selectSpacing.margin.left)}
            </div>
          )}
          {selectSpacing.margin.right > 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 px-1 text-[9px] font-mono"
              style={{
                right: selectSpacing.margin.right / 2 - 8,
                color: 'rgb(251, 146, 60)',
              }}
            >
              {Math.round(selectSpacing.margin.right)}
            </div>
          )}

          {/* Padding labels */}
          {selectSpacing.padding.top > 4 && (
            <div
              className="absolute left-1/2 -translate-x-1/2 text-[9px] font-mono"
              style={{
                top: selectSpacing.margin.top + selectSpacing.padding.top / 2 - 6,
                color: 'rgb(74, 222, 128)',
              }}
            >
              {Math.round(selectSpacing.padding.top)}
            </div>
          )}
          {selectSpacing.padding.bottom > 4 && (
            <div
              className="absolute left-1/2 -translate-x-1/2 text-[9px] font-mono"
              style={{
                bottom: selectSpacing.margin.bottom + selectSpacing.padding.bottom / 2 - 6,
                color: 'rgb(74, 222, 128)',
              }}
            >
              {Math.round(selectSpacing.padding.bottom)}
            </div>
          )}
        </div>
      )}

      {/* Hover highlight when there's also a selection */}
      {hoverRect && selectRect && hoveredElement !== selectedElement?.element && (
        <div
          className="fixed pointer-events-none z-[9997] border-2 bg-chart-1/5"
          style={{
            top: hoverRect.top,
            left: hoverRect.left,
            width: hoverRect.width,
            height: hoverRect.height,
            borderColor: 'var(--chart-1)',
            borderStyle: 'dashed',
          }}
          data-devtools
        >
          <div
            className="absolute px-1 py-0.5 text-[10px] font-mono rounded"
            style={{
              top: -20,
              left: 0,
              backgroundColor: 'var(--chart-1)',
              color: 'white',
            }}
          >
            {hoveredElement?.tagName.toLowerCase()}
          </div>
        </div>
      )}

      {/* Inspection mode indicator */}
      {isInspecting && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-lg z-[9999] flex items-center gap-2"
          style={{
            backgroundColor: 'var(--chart-1)',
            color: 'white',
          }}
          data-devtools
        >
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-sm font-medium">Click to select element</span>
          <span className="text-xs opacity-70">(ESC to cancel)</span>
        </div>
      )}
    </>
  )
}

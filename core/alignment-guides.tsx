"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "../lib/utils"
import { useInspector } from "./inspector-context"

interface Guide {
  type: 'horizontal' | 'vertical'
  position: number
  start: number
  end: number
  label?: string
  color?: string
}

interface AlignmentPoint {
  element: HTMLElement
  rect: DOMRect
  centerX: number
  centerY: number
}

// Snap threshold in pixels
const SNAP_THRESHOLD = 5

// Colors for guides
const GUIDE_COLORS = {
  edge: 'hsl(var(--chart-1))',
  center: 'hsl(var(--chart-2))',
  spacing: 'hsl(var(--chart-3))',
}

export function AlignmentGuides() {
  const { selectedElement, isOpen, hoveredElement } = useInspector()
  const [guides, setGuides] = useState<Guide[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [measurements, setMeasurements] = useState<{ x: number; y: number; width: number; height: number; label: string }[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Get all sibling elements for alignment
  const getSiblingElements = useCallback((element: HTMLElement): AlignmentPoint[] => {
    const parent = element.parentElement
    if (!parent) return []

    const siblings: AlignmentPoint[] = []
    const children = Array.from(parent.children)

    children.forEach(child => {
      if (child instanceof HTMLElement && child !== element && !child.hasAttribute('data-devtools')) {
        const rect = child.getBoundingClientRect()
        siblings.push({
          element: child,
          rect,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
        })
      }
    })

    return siblings
  }, [])

  // Calculate alignment guides
  const calculateGuides = useCallback((targetRect: DOMRect, siblings: AlignmentPoint[]): Guide[] => {
    const newGuides: Guide[] = []
    const targetCenterX = targetRect.left + targetRect.width / 2
    const targetCenterY = targetRect.top + targetRect.height / 2

    siblings.forEach(sibling => {
      const sibRect = sibling.rect

      // Vertical guides (for horizontal alignment)
      // Left edge alignment
      if (Math.abs(targetRect.left - sibRect.left) < SNAP_THRESHOLD) {
        newGuides.push({
          type: 'vertical',
          position: sibRect.left,
          start: Math.min(targetRect.top, sibRect.top),
          end: Math.max(targetRect.bottom, sibRect.bottom),
          color: GUIDE_COLORS.edge,
        })
      }

      // Right edge alignment
      if (Math.abs(targetRect.right - sibRect.right) < SNAP_THRESHOLD) {
        newGuides.push({
          type: 'vertical',
          position: sibRect.right,
          start: Math.min(targetRect.top, sibRect.top),
          end: Math.max(targetRect.bottom, sibRect.bottom),
          color: GUIDE_COLORS.edge,
        })
      }

      // Center X alignment
      if (Math.abs(targetCenterX - sibling.centerX) < SNAP_THRESHOLD) {
        newGuides.push({
          type: 'vertical',
          position: sibling.centerX,
          start: Math.min(targetRect.top, sibRect.top),
          end: Math.max(targetRect.bottom, sibRect.bottom),
          color: GUIDE_COLORS.center,
          label: 'center',
        })
      }

      // Horizontal guides (for vertical alignment)
      // Top edge alignment
      if (Math.abs(targetRect.top - sibRect.top) < SNAP_THRESHOLD) {
        newGuides.push({
          type: 'horizontal',
          position: sibRect.top,
          start: Math.min(targetRect.left, sibRect.left),
          end: Math.max(targetRect.right, sibRect.right),
          color: GUIDE_COLORS.edge,
        })
      }

      // Bottom edge alignment
      if (Math.abs(targetRect.bottom - sibRect.bottom) < SNAP_THRESHOLD) {
        newGuides.push({
          type: 'horizontal',
          position: sibRect.bottom,
          start: Math.min(targetRect.left, sibRect.left),
          end: Math.max(targetRect.right, sibRect.right),
          color: GUIDE_COLORS.edge,
        })
      }

      // Center Y alignment
      if (Math.abs(targetCenterY - sibling.centerY) < SNAP_THRESHOLD) {
        newGuides.push({
          type: 'horizontal',
          position: sibling.centerY,
          start: Math.min(targetRect.left, sibRect.left),
          end: Math.max(targetRect.right, sibRect.right),
          color: GUIDE_COLORS.center,
          label: 'center',
        })
      }
    })

    return newGuides
  }, [])

  // Calculate spacing measurements
  const calculateMeasurements = useCallback((targetRect: DOMRect, siblings: AlignmentPoint[]): typeof measurements => {
    const newMeasurements: typeof measurements = []

    siblings.forEach(sibling => {
      const sibRect = sibling.rect

      // Horizontal spacing (elements side by side)
      if (targetRect.right < sibRect.left) {
        const gap = sibRect.left - targetRect.right
        newMeasurements.push({
          x: targetRect.right,
          y: Math.max(targetRect.top, sibRect.top) + Math.min(targetRect.height, sibRect.height) / 2,
          width: gap,
          height: 0,
          label: `${Math.round(gap)}px`,
        })
      } else if (sibRect.right < targetRect.left) {
        const gap = targetRect.left - sibRect.right
        newMeasurements.push({
          x: sibRect.right,
          y: Math.max(targetRect.top, sibRect.top) + Math.min(targetRect.height, sibRect.height) / 2,
          width: gap,
          height: 0,
          label: `${Math.round(gap)}px`,
        })
      }

      // Vertical spacing (elements stacked)
      if (targetRect.bottom < sibRect.top) {
        const gap = sibRect.top - targetRect.bottom
        newMeasurements.push({
          x: Math.max(targetRect.left, sibRect.left) + Math.min(targetRect.width, sibRect.width) / 2,
          y: targetRect.bottom,
          width: 0,
          height: gap,
          label: `${Math.round(gap)}px`,
        })
      } else if (sibRect.bottom < targetRect.top) {
        const gap = targetRect.top - sibRect.bottom
        newMeasurements.push({
          x: Math.max(targetRect.left, sibRect.left) + Math.min(targetRect.width, sibRect.width) / 2,
          y: sibRect.bottom,
          width: 0,
          height: gap,
          label: `${Math.round(gap)}px`,
        })
      }
    })

    return newMeasurements
  }, [])

  // Update guides when selected element changes or moves
  useEffect(() => {
    if (!isOpen || !selectedElement?.element) {
      setGuides([])
      setMeasurements([])
      return
    }

    const element = selectedElement.element

    // Check if element is still in DOM
    if (!document.body.contains(element)) {
      setGuides([])
      setMeasurements([])
      return
    }

    const siblings = getSiblingElements(element)

    // Debounce the update function for performance
    let rafId: number | null = null
    const updateGuides = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        // Check element is still in DOM before updating
        if (!document.body.contains(element)) {
          setGuides([])
          setMeasurements([])
          return
        }
        const rect = element.getBoundingClientRect()
        setGuides(calculateGuides(rect, siblings))
        setMeasurements(calculateMeasurements(rect, siblings))
      })
    }

    // Initial calculation
    updateGuides()

    // Watch for style changes
    const observer = new MutationObserver(updateGuides)
    observer.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    // Watch for resize
    const resizeObserver = new ResizeObserver(updateGuides)
    resizeObserver.observe(element)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      observer.disconnect()
      resizeObserver.disconnect()
    }
  }, [isOpen, selectedElement, getSiblingElements, calculateGuides, calculateMeasurements])

  // Show guides on hover too
  useEffect(() => {
    if (!isOpen || !hoveredElement || hoveredElement === selectedElement?.element) {
      return
    }

    const siblings = getSiblingElements(hoveredElement)
    const rect = hoveredElement.getBoundingClientRect()
    setGuides(calculateGuides(rect, siblings))
    setMeasurements(calculateMeasurements(rect, siblings))
  }, [isOpen, hoveredElement, selectedElement, getSiblingElements, calculateGuides, calculateMeasurements])

  if (!isOpen || (guides.length === 0 && measurements.length === 0)) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-9990"
      data-devtools
    >
      {/* Render guides */}
      {guides.map((guide, index) => (
        <div
          key={`guide-${index}`}
          className="absolute"
          style={{
            ...(guide.type === 'vertical' ? {
              left: guide.position,
              top: guide.start,
              width: 1,
              height: guide.end - guide.start,
            } : {
              left: guide.start,
              top: guide.position,
              width: guide.end - guide.start,
              height: 1,
            }),
            backgroundColor: guide.color || GUIDE_COLORS.edge,
          }}
        >
          {guide.label && (
            <div
              className="absolute text-[9px] font-medium px-1 rounded"
              style={{
                backgroundColor: guide.color || GUIDE_COLORS.edge,
                color: 'white',
                ...(guide.type === 'vertical' ? {
                  left: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                } : {
                  top: 4,
                  left: '50%',
                  transform: 'translateX(-50%)',
                }),
              }}
            >
              {guide.label}
            </div>
          )}
        </div>
      ))}

      {/* Render spacing measurements */}
      {measurements.map((measurement, index) => (
        <div
          key={`measurement-${index}`}
          className="absolute flex items-center justify-center"
          style={{
            left: measurement.x,
            top: measurement.y,
            width: measurement.width || 1,
            height: measurement.height || 1,
          }}
        >
          {/* Measurement line */}
          <div
            className="absolute"
            style={{
              backgroundColor: GUIDE_COLORS.spacing,
              ...(measurement.width > 0 ? {
                width: '100%',
                height: 1,
              } : {
                width: 1,
                height: '100%',
              }),
            }}
          />

          {/* End caps */}
          {measurement.width > 0 && (
            <>
              <div
                className="absolute left-0 w-px h-2"
                style={{ backgroundColor: GUIDE_COLORS.spacing }}
              />
              <div
                className="absolute right-0 w-px h-2"
                style={{ backgroundColor: GUIDE_COLORS.spacing }}
              />
            </>
          )}
          {measurement.height > 0 && (
            <>
              <div
                className="absolute top-0 h-px w-2"
                style={{ backgroundColor: GUIDE_COLORS.spacing }}
              />
              <div
                className="absolute bottom-0 h-px w-2"
                style={{ backgroundColor: GUIDE_COLORS.spacing }}
              />
            </>
          )}

          {/* Label */}
          <div
            className="absolute text-[9px] font-mono font-medium px-1 rounded whitespace-nowrap"
            style={{
              backgroundColor: GUIDE_COLORS.spacing,
              color: 'white',
              ...(measurement.width > 0 ? {
                top: -14,
              } : {
                left: 4,
              }),
            }}
          >
            {measurement.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// Container alignment indicator
export function ContainerAlignmentIndicator() {
  const { selectedElement, isOpen } = useInspector()
  const [alignment, setAlignment] = useState<{
    horizontalCenter: boolean
    verticalCenter: boolean
    leftEdge: boolean
    rightEdge: boolean
    topEdge: boolean
    bottomEdge: boolean
  }>({
    horizontalCenter: false,
    verticalCenter: false,
    leftEdge: false,
    rightEdge: false,
    topEdge: false,
    bottomEdge: false,
  })

  useEffect(() => {
    const resetAlignment = () => setAlignment({
      horizontalCenter: false,
      verticalCenter: false,
      leftEdge: false,
      rightEdge: false,
      topEdge: false,
      bottomEdge: false,
    })

    if (!isOpen || !selectedElement?.element) {
      resetAlignment()
      return
    }

    const element = selectedElement.element
    const parent = element.parentElement

    // Check if elements are still in DOM
    if (!parent || !document.body.contains(element)) {
      resetAlignment()
      return
    }

    // Debounce with requestAnimationFrame
    let rafId: number | null = null
    const updateAlignment = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        // Check elements are still in DOM
        if (!document.body.contains(element) || !document.body.contains(parent)) {
          resetAlignment()
          return
        }

        const elemRect = element.getBoundingClientRect()
        const parentRect = parent.getBoundingClientRect()

        const elemCenterX = elemRect.left + elemRect.width / 2
        const elemCenterY = elemRect.top + elemRect.height / 2
        const parentCenterX = parentRect.left + parentRect.width / 2
        const parentCenterY = parentRect.top + parentRect.height / 2

        setAlignment({
          horizontalCenter: Math.abs(elemCenterX - parentCenterX) < SNAP_THRESHOLD,
          verticalCenter: Math.abs(elemCenterY - parentCenterY) < SNAP_THRESHOLD,
          leftEdge: Math.abs(elemRect.left - parentRect.left) < SNAP_THRESHOLD,
          rightEdge: Math.abs(elemRect.right - parentRect.right) < SNAP_THRESHOLD,
          topEdge: Math.abs(elemRect.top - parentRect.top) < SNAP_THRESHOLD,
          bottomEdge: Math.abs(elemRect.bottom - parentRect.bottom) < SNAP_THRESHOLD,
        })
      })
    }

    updateAlignment()

    const observer = new MutationObserver(updateAlignment)
    observer.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    const resizeObserver = new ResizeObserver(updateAlignment)
    resizeObserver.observe(element)
    resizeObserver.observe(parent)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      observer.disconnect()
      resizeObserver.disconnect()
    }
  }, [isOpen, selectedElement])

  if (!isOpen || !selectedElement?.element) return null

  const parentRect = selectedElement.element.parentElement?.getBoundingClientRect()
  if (!parentRect) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-9990" data-devtools>
      {/* Horizontal center guide */}
      {alignment.horizontalCenter && (
        <div
          className="absolute w-px"
          style={{
            left: parentRect.left + parentRect.width / 2,
            top: parentRect.top,
            height: parentRect.height,
            backgroundColor: GUIDE_COLORS.center,
            opacity: 0.5,
          }}
        />
      )}

      {/* Vertical center guide */}
      {alignment.verticalCenter && (
        <div
          className="absolute h-px"
          style={{
            left: parentRect.left,
            top: parentRect.top + parentRect.height / 2,
            width: parentRect.width,
            backgroundColor: GUIDE_COLORS.center,
            opacity: 0.5,
          }}
        />
      )}
    </div>
  )
}

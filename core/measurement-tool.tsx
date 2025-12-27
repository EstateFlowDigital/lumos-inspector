"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "../lib/utils"
import { useInspector } from "./inspector-context"

interface MeasurementLine {
  startX: number
  startY: number
  endX: number
  endY: number
  distance: number
}

export function MeasurementTool() {
  const { isOpen, isMeasuring, setIsMeasuring } = useInspector()
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentLine, setCurrentLine] = useState<MeasurementLine | null>(null)
  const [savedLines, setSavedLines] = useState<MeasurementLine[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate distance between two points
  const calculateDistance = useCallback((x1: number, y1: number, x2: number, y2: number): number => {
    return Math.round(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)))
  }, [])

  // Handle mouse down to start measuring
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isMeasuring) return

    setIsDrawing(true)
    setCurrentLine({
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY,
      distance: 0,
    })
  }, [isMeasuring])

  // Handle mouse move while measuring
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentLine) return

    const distance = calculateDistance(
      currentLine.startX,
      currentLine.startY,
      e.clientX,
      e.clientY
    )

    setCurrentLine({
      ...currentLine,
      endX: e.clientX,
      endY: e.clientY,
      distance,
    })
  }, [isDrawing, currentLine, calculateDistance])

  // Handle mouse up to finish measuring
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentLine) return

    if (currentLine.distance > 5) {
      setSavedLines((prev) => [...prev, currentLine])
    }

    setIsDrawing(false)
    setCurrentLine(null)
  }, [isDrawing, currentLine])

  // Clear all measurements
  const clearMeasurements = useCallback(() => {
    setSavedLines([])
    setCurrentLine(null)
  }, [])

  // Handle escape to exit measurement mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMeasuring) {
        setIsMeasuring(false)
        setIsDrawing(false)
        setCurrentLine(null)
      }
      if (e.key === "c" && e.metaKey && isMeasuring) {
        clearMeasurements()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isMeasuring, setIsMeasuring, clearMeasurements])

  // Clear when exiting measurement mode
  useEffect(() => {
    if (!isMeasuring) {
      setIsDrawing(false)
      setCurrentLine(null)
    }
  }, [isMeasuring])

  if (!isOpen || !isMeasuring) return null

  // Render a single measurement line
  const renderLine = (line: MeasurementLine, key: string | number) => {
    const midX = (line.startX + line.endX) / 2
    const midY = (line.startY + line.endY) / 2
    const angle = Math.atan2(line.endY - line.startY, line.endX - line.startX) * (180 / Math.PI)

    // Calculate perpendicular offset for label
    const labelOffset = 15
    const perpAngle = angle + 90
    const labelX = midX + Math.cos(perpAngle * Math.PI / 180) * labelOffset
    const labelY = midY + Math.sin(perpAngle * Math.PI / 180) * labelOffset

    return (
      <g key={key}>
        {/* Main line */}
        <line
          x1={line.startX}
          y1={line.startY}
          x2={line.endX}
          y2={line.endY}
          stroke="hsl(var(--chart-1))"
          strokeWidth="2"
          strokeDasharray="4 2"
        />

        {/* Start point */}
        <circle
          cx={line.startX}
          cy={line.startY}
          r="4"
          fill="hsl(var(--chart-1))"
        />

        {/* End point */}
        <circle
          cx={line.endX}
          cy={line.endY}
          r="4"
          fill="hsl(var(--chart-1))"
        />

        {/* End caps */}
        <line
          x1={line.startX - 6}
          y1={line.startY - 6}
          x2={line.startX + 6}
          y2={line.startY + 6}
          stroke="hsl(var(--chart-1))"
          strokeWidth="2"
          transform={`rotate(${angle}, ${line.startX}, ${line.startY})`}
        />
        <line
          x1={line.endX - 6}
          y1={line.endY - 6}
          x2={line.endX + 6}
          y2={line.endY + 6}
          stroke="hsl(var(--chart-1))"
          strokeWidth="2"
          transform={`rotate(${angle}, ${line.endX}, ${line.endY})`}
        />

        {/* Distance label */}
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x="-24"
            y="-10"
            width="48"
            height="20"
            rx="4"
            fill="hsl(var(--chart-1))"
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="11"
            fontFamily="monospace"
            fontWeight="600"
          >
            {line.distance}px
          </text>
        </g>
      </g>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-9995",
        isMeasuring && "cursor-crosshair"
      )}
      data-devtools
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg className="w-full h-full pointer-events-none">
        {/* Saved lines */}
        {savedLines.map((line, index) => renderLine(line, index))}

        {/* Current line being drawn */}
        {currentLine && renderLine(currentLine, "current")}
      </svg>

      {/* Instructions */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm border rounded-full px-4 py-2 shadow-lg text-xs">
        <span className="text-muted-foreground">
          Click and drag to measure • <kbd className="px-1 bg-muted rounded">⌘C</kbd> clear • <kbd className="px-1 bg-muted rounded">Esc</kbd> exit
        </span>
      </div>
    </div>
  )
}

// Element spacing measurement overlay
export function SpacingMeasurement() {
  const { isOpen, selectedElement, hoveredElement } = useInspector()
  const [spacing, setSpacing] = useState<{
    top: number
    right: number
    bottom: number
    left: number
  } | null>(null)

  useEffect(() => {
    if (!isOpen || !selectedElement?.element || !hoveredElement) return
    if (selectedElement.element === hoveredElement) return

    const selectedRect = selectedElement.element.getBoundingClientRect()
    const hoveredRect = hoveredElement.getBoundingClientRect()

    // Calculate spacing between elements
    setSpacing({
      top: Math.abs(selectedRect.top - hoveredRect.bottom),
      right: Math.abs(hoveredRect.left - selectedRect.right),
      bottom: Math.abs(hoveredRect.top - selectedRect.bottom),
      left: Math.abs(selectedRect.left - hoveredRect.right),
    })
  }, [isOpen, selectedElement, hoveredElement])

  useEffect(() => {
    if (!hoveredElement) {
      setSpacing(null)
    }
  }, [hoveredElement])

  if (!isOpen || !selectedElement?.element || !hoveredElement || !spacing) return null
  if (selectedElement.element === hoveredElement) return null

  const selectedRect = selectedElement.element.getBoundingClientRect()
  const hoveredRect = hoveredElement.getBoundingClientRect()

  // Determine which spacing lines to show based on relative positions
  const showTop = hoveredRect.bottom <= selectedRect.top
  const showBottom = hoveredRect.top >= selectedRect.bottom
  const showLeft = hoveredRect.right <= selectedRect.left
  const showRight = hoveredRect.left >= selectedRect.right

  return (
    <svg className="fixed inset-0 pointer-events-none z-9994" data-devtools>
      {/* Horizontal spacing (left/right) */}
      {showLeft && (
        <g>
          <line
            x1={hoveredRect.right}
            y1={(selectedRect.top + selectedRect.bottom) / 2}
            x2={selectedRect.left}
            y2={(selectedRect.top + selectedRect.bottom) / 2}
            stroke="hsl(var(--chart-2))"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          <text
            x={(hoveredRect.right + selectedRect.left) / 2}
            y={(selectedRect.top + selectedRect.bottom) / 2 - 8}
            textAnchor="middle"
            fill="hsl(var(--chart-2))"
            fontSize="10"
            fontFamily="monospace"
          >
            {Math.round(spacing.left)}px
          </text>
        </g>
      )}

      {showRight && (
        <g>
          <line
            x1={selectedRect.right}
            y1={(selectedRect.top + selectedRect.bottom) / 2}
            x2={hoveredRect.left}
            y2={(selectedRect.top + selectedRect.bottom) / 2}
            stroke="hsl(var(--chart-2))"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          <text
            x={(selectedRect.right + hoveredRect.left) / 2}
            y={(selectedRect.top + selectedRect.bottom) / 2 - 8}
            textAnchor="middle"
            fill="hsl(var(--chart-2))"
            fontSize="10"
            fontFamily="monospace"
          >
            {Math.round(spacing.right)}px
          </text>
        </g>
      )}

      {/* Vertical spacing (top/bottom) */}
      {showTop && (
        <g>
          <line
            x1={(selectedRect.left + selectedRect.right) / 2}
            y1={hoveredRect.bottom}
            x2={(selectedRect.left + selectedRect.right) / 2}
            y2={selectedRect.top}
            stroke="hsl(var(--chart-2))"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          <text
            x={(selectedRect.left + selectedRect.right) / 2 + 8}
            y={(hoveredRect.bottom + selectedRect.top) / 2}
            textAnchor="start"
            fill="hsl(var(--chart-2))"
            fontSize="10"
            fontFamily="monospace"
          >
            {Math.round(spacing.top)}px
          </text>
        </g>
      )}

      {showBottom && (
        <g>
          <line
            x1={(selectedRect.left + selectedRect.right) / 2}
            y1={selectedRect.bottom}
            x2={(selectedRect.left + selectedRect.right) / 2}
            y2={hoveredRect.top}
            stroke="hsl(var(--chart-2))"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          <text
            x={(selectedRect.left + selectedRect.right) / 2 + 8}
            y={(selectedRect.bottom + hoveredRect.top) / 2}
            textAnchor="start"
            fill="hsl(var(--chart-2))"
            fontSize="10"
            fontFamily="monospace"
          >
            {Math.round(spacing.bottom)}px
          </text>
        </g>
      )}
    </svg>
  )
}

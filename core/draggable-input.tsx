"use client"

import * as React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "../lib/utils"
import { Input } from "../ui/input"

interface DraggableInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string
  onChange: (value: string) => void
  unit?: string
  step?: number
  min?: number
  max?: number
}

export function DraggableInput({
  value,
  onChange,
  unit = "px",
  step = 1,
  min,
  max,
  className,
  ...props
}: DraggableInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startValue, setStartValue] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Parse numeric value from string
  const parseValue = useCallback((val: string): number => {
    const match = val.match(/^(-?\d*\.?\d+)/)
    return match ? parseFloat(match[1]) : 0
  }, [])

  // Format value with unit
  const formatValue = useCallback((num: number): string => {
    let val = num
    if (min !== undefined) val = Math.max(min, val)
    if (max !== undefined) val = Math.min(max, val)
    return unit ? `${val}${unit}` : `${val}`
  }, [unit, min, max])

  // Handle mouse down to start drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag on left click and not when focused
    if (e.button !== 0 || document.activeElement === inputRef.current) return

    e.preventDefault()
    setIsDragging(true)
    setStartX(e.clientX)
    setStartValue(parseValue(value))

    // Change cursor globally
    document.body.style.cursor = "ew-resize"
    document.body.style.userSelect = "none"
  }, [value, parseValue])

  // Reset cursor helper
  const resetCursor = useCallback(() => {
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }, [])

  // Cleanup cursor on unmount
  useEffect(() => {
    return () => {
      resetCursor()
    }
  }, [resetCursor])

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      const sensitivity = e.shiftKey ? 0.1 : 1 // Fine control with Shift key
      const newValue = startValue + Math.round(delta * sensitivity / 2) * step
      onChange(formatValue(newValue))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      resetCursor()
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      // Also reset cursor when effect cleans up (e.g., component unmounts during drag)
      resetCursor()
    }
  }, [isDragging, startX, startValue, step, formatValue, onChange, resetCursor])

  // Handle direct input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  // Handle blur to format value
  const handleBlur = () => {
    const num = parseValue(value)
    onChange(formatValue(num))
  }

  // Handle keyboard arrows
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault()
      const currentVal = parseValue(value)
      const multiplier = e.shiftKey ? 10 : 1
      const delta = e.key === "ArrowUp" ? step * multiplier : -step * multiplier
      onChange(formatValue(currentVal + delta))
    }
  }

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      className={cn(
        "cursor-ew-resize select-none",
        isDragging && "bg-primary/10",
        className
      )}
      {...props}
    />
  )
}

"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import { Plus, Trash2, GripVertical, RotateCw } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

// Color stop interface
interface ColorStop {
  id: string
  color: string
  position: number // 0-100
}

// Gradient state interface
interface GradientState {
  type: 'linear' | 'radial' | 'conic'
  angle: number // for linear
  shape: 'circle' | 'ellipse' // for radial
  position: { x: number; y: number } // for radial/conic center
  stops: ColorStop[]
}

// Generate unique ID
const generateId = () => Math.random().toString(36).slice(2, 9)

// Default gradient
const defaultGradient: GradientState = {
  type: 'linear',
  angle: 180,
  shape: 'circle',
  position: { x: 50, y: 50 },
  stops: [
    { id: generateId(), color: '#3b82f6', position: 0 },
    { id: generateId(), color: '#8b5cf6', position: 100 },
  ],
}

// Gradient presets
const gradientPresets = [
  { name: 'None', value: 'none' },
  { name: 'Blue Purple', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Warm Flame', value: 'linear-gradient(45deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)' },
  { name: 'Ocean', value: 'linear-gradient(to right, #2193b0, #6dd5ed)' },
  { name: 'Sunset', value: 'linear-gradient(to right, #f12711, #f5af19)' },
  { name: 'Forest', value: 'linear-gradient(to right, #134e5e, #71b280)' },
  { name: 'Midnight', value: 'linear-gradient(to right, #232526, #414345)' },
  { name: 'Radial Light', value: 'radial-gradient(circle, #ffffff 0%, #e0e0e0 100%)' },
]

// Parse gradient string to state
function parseGradientValue(value: string): GradientState | null {
  if (!value || value === 'none') return null

  const state: GradientState = { ...defaultGradient, stops: [] }

  // Detect gradient type
  if (value.startsWith('radial-gradient')) {
    state.type = 'radial'
  } else if (value.startsWith('conic-gradient')) {
    state.type = 'conic'
  } else {
    state.type = 'linear'
  }

  // Parse angle for linear gradients
  const angleMatch = value.match(/(\d+)deg/)
  if (angleMatch) {
    state.angle = parseInt(angleMatch[1])
  } else if (value.includes('to right')) {
    state.angle = 90
  } else if (value.includes('to left')) {
    state.angle = 270
  } else if (value.includes('to bottom')) {
    state.angle = 180
  } else if (value.includes('to top')) {
    state.angle = 0
  }

  // Parse color stops
  const colorStopRegex = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)\s*(\d+)?%?/g
  let match
  while ((match = colorStopRegex.exec(value)) !== null) {
    const color = match[1]
    const position = match[2] ? parseInt(match[2]) : state.stops.length === 0 ? 0 : 100

    // Skip 'circle', 'ellipse', direction keywords
    if (['circle', 'ellipse', 'to', 'at', 'from'].includes(color.toLowerCase())) continue

    state.stops.push({
      id: generateId(),
      color: color.startsWith('#') ? color : colorNameToHex(color) || '#000000',
      position,
    })
  }

  // Ensure at least 2 stops
  if (state.stops.length < 2) {
    state.stops = defaultGradient.stops.map(s => ({ ...s, id: generateId() }))
  }

  return state
}

// Convert color name to hex (basic colors)
function colorNameToHex(name: string): string | null {
  const colors: Record<string, string> = {
    white: '#ffffff',
    black: '#000000',
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff',
    yellow: '#ffff00',
    cyan: '#00ffff',
    magenta: '#ff00ff',
    transparent: 'transparent',
  }
  return colors[name.toLowerCase()] || null
}

// Build gradient string from state
function buildGradientValue(state: GradientState): string {
  if (state.stops.length < 2) return 'none'

  const sortedStops = [...state.stops].sort((a, b) => a.position - b.position)
  const stopsStr = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ')

  switch (state.type) {
    case 'linear':
      return `linear-gradient(${state.angle}deg, ${stopsStr})`
    case 'radial':
      return `radial-gradient(${state.shape} at ${state.position.x}% ${state.position.y}%, ${stopsStr})`
    case 'conic':
      return `conic-gradient(from ${state.angle}deg at ${state.position.x}% ${state.position.y}%, ${stopsStr})`
    default:
      return 'none'
  }
}

interface GradientBuilderProps {
  value: string
  onChange: (value: string) => void
}

export function GradientBuilder({ value, onChange }: GradientBuilderProps) {
  const [state, setState] = useState<GradientState>(() =>
    parseGradientValue(value) || { ...defaultGradient, stops: defaultGradient.stops.map(s => ({ ...s, id: generateId() })) }
  )
  const [selectedStop, setSelectedStop] = useState<string | null>(null)
  const gradientBarRef = useRef<HTMLDivElement>(null)

  // Sync with external value
  useEffect(() => {
    const parsed = parseGradientValue(value)
    if (parsed) {
      setState(parsed)
    }
  }, [value])

  // Emit changes
  const emitChange = useCallback((newState: GradientState) => {
    setState(newState)
    onChange(buildGradientValue(newState))
  }, [onChange])

  // Add color stop
  const addStop = useCallback(() => {
    const newStop: ColorStop = {
      id: generateId(),
      color: '#888888',
      position: 50,
    }
    emitChange({ ...state, stops: [...state.stops, newStop] })
    setSelectedStop(newStop.id)
  }, [state, emitChange])

  // Remove color stop
  const removeStop = useCallback((id: string) => {
    if (state.stops.length <= 2) return // Keep at least 2 stops
    emitChange({ ...state, stops: state.stops.filter(s => s.id !== id) })
    if (selectedStop === id) setSelectedStop(null)
  }, [state, emitChange, selectedStop])

  // Update color stop
  const updateStop = useCallback((id: string, updates: Partial<ColorStop>) => {
    emitChange({
      ...state,
      stops: state.stops.map(s => s.id === id ? { ...s, ...updates } : s),
    })
  }, [state, emitChange])

  // Handle gradient bar click to add/select stop
  const handleGradientBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!gradientBarRef.current) return

    const rect = gradientBarRef.current.getBoundingClientRect()
    const position = Math.round(((e.clientX - rect.left) / rect.width) * 100)

    // Check if clicking near an existing stop
    const nearStop = state.stops.find(s => Math.abs(s.position - position) < 5)
    if (nearStop) {
      setSelectedStop(nearStop.id)
    } else {
      // Add new stop at click position
      const newStop: ColorStop = {
        id: generateId(),
        color: '#888888',
        position,
      }
      emitChange({ ...state, stops: [...state.stops, newStop] })
      setSelectedStop(newStop.id)
    }
  }, [state, emitChange])

  // Apply preset
  const applyPreset = useCallback((presetValue: string) => {
    onChange(presetValue)
    const parsed = parseGradientValue(presetValue)
    if (parsed) {
      setState(parsed)
    }
  }, [onChange])

  const selectedStopData = state.stops.find(s => s.id === selectedStop)

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Presets</Label>
        <div className="flex flex-wrap gap-1">
          {gradientPresets.map(preset => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => applyPreset(preset.value)}
            >
              {preset.name !== 'None' && (
                <div
                  className="w-3 h-3 rounded-sm mr-1"
                  style={{ background: preset.value }}
                />
              )}
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Gradient type */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Type</Label>
        <Select
          value={state.type}
          onValueChange={(v) => emitChange({ ...state, type: v as GradientState['type'] })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="linear" className="text-xs">Linear</SelectItem>
            <SelectItem value="radial" className="text-xs">Radial</SelectItem>
            <SelectItem value="conic" className="text-xs">Conic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Angle/Direction for linear gradients */}
      {state.type === 'linear' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Angle</Label>
            <span className="text-xs text-muted-foreground">{state.angle}°</span>
          </div>
          <div className="flex gap-2">
            <Slider
              value={[state.angle]}
              onValueChange={([v]) => emitChange({ ...state, angle: v })}
              min={0}
              max={360}
              step={1}
              className="flex-1"
            />
            <div className="relative w-10 h-10 border rounded-lg bg-muted/30">
              <div
                className="absolute inset-2 rounded-full bg-gradient-to-r from-primary to-transparent"
                style={{ transform: `rotate(${state.angle}deg)` }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute inset-0 w-full h-full p-0 hover:bg-transparent"
                onClick={() => emitChange({ ...state, angle: (state.angle + 45) % 360 })}
              >
                <RotateCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Shape for radial gradients */}
      {state.type === 'radial' && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Shape</Label>
          <Select
            value={state.shape}
            onValueChange={(v) => emitChange({ ...state, shape: v as 'circle' | 'ellipse' })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="circle" className="text-xs">Circle</SelectItem>
              <SelectItem value="ellipse" className="text-xs">Ellipse</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Position for radial/conic */}
      {(state.type === 'radial' || state.type === 'conic') && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Center Position</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">X (%)</Label>
              <Slider
                value={[state.position.x]}
                onValueChange={([v]) => emitChange({ ...state, position: { ...state.position, x: v } })}
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Y (%)</Label>
              <Slider
                value={[state.position.y]}
                onValueChange={([v]) => emitChange({ ...state, position: { ...state.position, y: v } })}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview with color stops */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Gradient Preview</Label>
        <div
          className="h-20 rounded-lg border"
          style={{ background: buildGradientValue(state) }}
        />

        {/* Color stop bar */}
        <div
          ref={gradientBarRef}
          className="relative h-6 rounded border cursor-crosshair"
          style={{
            background: `linear-gradient(to right, ${state.stops
              .sort((a, b) => a.position - b.position)
              .map(s => `${s.color} ${s.position}%`)
              .join(', ')})`,
          }}
          onClick={handleGradientBarClick}
        >
          {state.stops.map(stop => (
            <div
              key={stop.id}
              className={cn(
                "absolute top-0 w-3 h-full -translate-x-1/2 cursor-grab",
                "flex items-end justify-center",
                selectedStop === stop.id && "z-10"
              )}
              style={{ left: `${stop.position}%` }}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedStop(stop.id)
              }}
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full border-2 border-white shadow-md",
                  selectedStop === stop.id && "ring-2 ring-primary"
                )}
                style={{ backgroundColor: stop.color }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Selected stop controls */}
      {selectedStopData && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Color Stop</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={() => removeStop(selectedStopData.id)}
              disabled={state.stops.length <= 2}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {/* Color */}
          <div className="flex gap-2">
            <div
              className="w-10 h-10 rounded border cursor-pointer shrink-0"
              style={{ backgroundColor: selectedStopData.color }}
            >
              <input
                type="color"
                value={selectedStopData.color}
                onChange={(e) => updateStop(selectedStopData.id, { color: e.target.value })}
                className="w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <Input
              value={selectedStopData.color}
              onChange={(e) => updateStop(selectedStopData.id, { color: e.target.value })}
              className="h-10 text-xs font-mono flex-1"
            />
          </div>

          {/* Position */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Position</Label>
              <span className="text-xs text-muted-foreground">{selectedStopData.position}%</span>
            </div>
            <Slider
              value={[selectedStopData.position]}
              onValueChange={([v]) => updateStop(selectedStopData.id, { position: v })}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </div>
      )}

      {/* Add stop button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-7 text-xs"
        onClick={addStop}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Color Stop
      </Button>

      {/* Output */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Output</Label>
        <pre className="p-2 bg-muted rounded text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all">
          {buildGradientValue(state)}
        </pre>
      </div>
    </div>
  )
}

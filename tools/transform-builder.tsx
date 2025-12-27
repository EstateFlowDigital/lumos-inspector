"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import { RotateCw, Move, Maximize, Minimize2, FlipHorizontal, FlipVertical, RotateCcw } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"

// Transform state interface
interface TransformState {
  translateX: number
  translateY: number
  translateZ: number
  rotate: number
  rotateX: number
  rotateY: number
  rotateZ: number
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
  perspective: number
  originX: number
  originY: number
}

const defaultTransform: TransformState = {
  translateX: 0,
  translateY: 0,
  translateZ: 0,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
  perspective: 0,
  originX: 50,
  originY: 50,
}

// Parse transform string to state
function parseTransformValue(value: string): TransformState {
  const state = { ...defaultTransform }

  if (!value || value === 'none') return state

  // Parse individual transform functions
  const translateXMatch = value.match(/translateX\((-?[\d.]+)(px|%)?\)/)
  const translateYMatch = value.match(/translateY\((-?[\d.]+)(px|%)?\)/)
  const translateZMatch = value.match(/translateZ\((-?[\d.]+)(px)?\)/)
  const rotateMatch = value.match(/rotate\((-?[\d.]+)deg\)/)
  const rotateXMatch = value.match(/rotateX\((-?[\d.]+)deg\)/)
  const rotateYMatch = value.match(/rotateY\((-?[\d.]+)deg\)/)
  const rotateZMatch = value.match(/rotateZ\((-?[\d.]+)deg\)/)
  const scaleXMatch = value.match(/scaleX\((-?[\d.]+)\)/)
  const scaleYMatch = value.match(/scaleY\((-?[\d.]+)\)/)
  const scaleMatch = value.match(/scale\((-?[\d.]+)\)/)
  const skewXMatch = value.match(/skewX\((-?[\d.]+)deg\)/)
  const skewYMatch = value.match(/skewY\((-?[\d.]+)deg\)/)
  const perspectiveMatch = value.match(/perspective\((-?[\d.]+)(px)?\)/)

  if (translateXMatch) state.translateX = parseFloat(translateXMatch[1])
  if (translateYMatch) state.translateY = parseFloat(translateYMatch[1])
  if (translateZMatch) state.translateZ = parseFloat(translateZMatch[1])
  if (rotateMatch) state.rotate = parseFloat(rotateMatch[1])
  if (rotateXMatch) state.rotateX = parseFloat(rotateXMatch[1])
  if (rotateYMatch) state.rotateY = parseFloat(rotateYMatch[1])
  if (rotateZMatch) state.rotateZ = parseFloat(rotateZMatch[1])
  if (scaleXMatch) state.scaleX = parseFloat(scaleXMatch[1])
  if (scaleYMatch) state.scaleY = parseFloat(scaleYMatch[1])
  if (scaleMatch) {
    state.scaleX = parseFloat(scaleMatch[1])
    state.scaleY = parseFloat(scaleMatch[1])
  }
  if (skewXMatch) state.skewX = parseFloat(skewXMatch[1])
  if (skewYMatch) state.skewY = parseFloat(skewYMatch[1])
  if (perspectiveMatch) state.perspective = parseFloat(perspectiveMatch[1])

  return state
}

// Build transform string from state
function buildTransformValue(state: TransformState): string {
  const transforms: string[] = []

  if (state.perspective !== 0) {
    transforms.push(`perspective(${state.perspective}px)`)
  }
  if (state.translateX !== 0) {
    transforms.push(`translateX(${state.translateX}px)`)
  }
  if (state.translateY !== 0) {
    transforms.push(`translateY(${state.translateY}px)`)
  }
  if (state.translateZ !== 0) {
    transforms.push(`translateZ(${state.translateZ}px)`)
  }
  if (state.rotate !== 0) {
    transforms.push(`rotate(${state.rotate}deg)`)
  }
  if (state.rotateX !== 0) {
    transforms.push(`rotateX(${state.rotateX}deg)`)
  }
  if (state.rotateY !== 0) {
    transforms.push(`rotateY(${state.rotateY}deg)`)
  }
  if (state.rotateZ !== 0) {
    transforms.push(`rotateZ(${state.rotateZ}deg)`)
  }
  if (state.scaleX !== 1 || state.scaleY !== 1) {
    if (state.scaleX === state.scaleY) {
      transforms.push(`scale(${state.scaleX})`)
    } else {
      if (state.scaleX !== 1) transforms.push(`scaleX(${state.scaleX})`)
      if (state.scaleY !== 1) transforms.push(`scaleY(${state.scaleY})`)
    }
  }
  if (state.skewX !== 0) {
    transforms.push(`skewX(${state.skewX}deg)`)
  }
  if (state.skewY !== 0) {
    transforms.push(`skewY(${state.skewY}deg)`)
  }

  return transforms.length > 0 ? transforms.join(' ') : 'none'
}

// Build transform-origin string
function buildOriginValue(state: TransformState): string {
  return `${state.originX}% ${state.originY}%`
}

// Transform presets
const transformPresets = [
  { name: 'None', value: 'none' },
  { name: 'Lift', value: 'translateY(-4px)' },
  { name: 'Push', value: 'translateY(2px)' },
  { name: 'Grow', value: 'scale(1.05)' },
  { name: 'Shrink', value: 'scale(0.95)' },
  { name: 'Tilt Left', value: 'rotate(-3deg)' },
  { name: 'Tilt Right', value: 'rotate(3deg)' },
  { name: 'Float', value: 'translateY(-8px) scale(1.02)' },
]

interface TransformBuilderProps {
  value: string
  originValue?: string
  onChange: (transform: string, origin: string) => void
}

export function TransformBuilder({ value, originValue, onChange }: TransformBuilderProps) {
  const [state, setState] = useState<TransformState>(() => parseTransformValue(value))
  const [activeTab, setActiveTab] = useState('2d')

  // Sync with external value
  useEffect(() => {
    const parsed = parseTransformValue(value)
    setState(prev => {
      // Only update if values changed (avoid infinite loop)
      if (JSON.stringify(parsed) !== JSON.stringify(prev)) {
        return parsed
      }
      return prev
    })
  }, [value])

  // Emit changes
  const emitChange = useCallback((newState: TransformState) => {
    setState(newState)
    onChange(buildTransformValue(newState), buildOriginValue(newState))
  }, [onChange])

  // Update a single property
  const updateProperty = useCallback((key: keyof TransformState, value: number) => {
    emitChange({ ...state, [key]: value })
  }, [state, emitChange])

  // Reset all transforms
  const resetAll = useCallback(() => {
    emitChange({ ...defaultTransform })
  }, [emitChange])

  // Apply preset
  const applyPreset = useCallback((presetValue: string) => {
    const parsed = parseTransformValue(presetValue)
    emitChange(parsed)
  }, [emitChange])

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Presets</Label>
        <div className="flex flex-wrap gap-1">
          {transformPresets.map(preset => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              className={cn(
                "h-6 px-2 text-[10px]",
                value === preset.value && "bg-primary text-primary-foreground"
              )}
              onClick={() => applyPreset(preset.value)}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="border rounded-lg p-6 bg-background flex items-center justify-center">
        <div
          className="w-16 h-16 rounded-lg bg-gradient-to-br from-chart-1 to-chart-2 shadow-md"
          style={{
            transform: buildTransformValue(state),
            transformOrigin: buildOriginValue(state),
          }}
        />
      </div>

      {/* Controls */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="2d" className="flex-1 text-xs">2D</TabsTrigger>
          <TabsTrigger value="3d" className="flex-1 text-xs">3D</TabsTrigger>
          <TabsTrigger value="origin" className="flex-1 text-xs">Origin</TabsTrigger>
        </TabsList>

        {/* 2D Transforms */}
        <TabsContent value="2d" className="space-y-4 mt-4">
          {/* Move */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Move className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium">Move</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">X</Label>
                <div className="flex gap-1">
                  <Slider
                    value={[state.translateX]}
                    onValueChange={([v]) => updateProperty('translateX', v)}
                    min={-200}
                    max={200}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={state.translateX}
                    onChange={(e) => updateProperty('translateX', parseFloat(e.target.value) || 0)}
                    className="h-7 w-16 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Y</Label>
                <div className="flex gap-1">
                  <Slider
                    value={[state.translateY]}
                    onValueChange={([v]) => updateProperty('translateY', v)}
                    min={-200}
                    max={200}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={state.translateY}
                    onChange={(e) => updateProperty('translateY', parseFloat(e.target.value) || 0)}
                    className="h-7 w-16 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rotate */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium">Rotate</Label>
            </div>
            <div className="flex gap-1">
              <Slider
                value={[state.rotate]}
                onValueChange={([v]) => updateProperty('rotate', v)}
                min={-180}
                max={180}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={state.rotate}
                onChange={(e) => updateProperty('rotate', parseFloat(e.target.value) || 0)}
                className="h-7 w-16 text-xs"
              />
              <span className="text-xs text-muted-foreground self-center">deg</span>
            </div>
          </div>

          {/* Scale */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Maximize className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium">Scale</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">X</Label>
                <div className="flex gap-1">
                  <Slider
                    value={[state.scaleX * 100]}
                    onValueChange={([v]) => updateProperty('scaleX', v / 100)}
                    min={0}
                    max={200}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={state.scaleX}
                    onChange={(e) => updateProperty('scaleX', parseFloat(e.target.value) || 1)}
                    step={0.1}
                    className="h-7 w-16 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Y</Label>
                <div className="flex gap-1">
                  <Slider
                    value={[state.scaleY * 100]}
                    onValueChange={([v]) => updateProperty('scaleY', v / 100)}
                    min={0}
                    max={200}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={state.scaleY}
                    onChange={(e) => updateProperty('scaleY', parseFloat(e.target.value) || 1)}
                    step={0.1}
                    className="h-7 w-16 text-xs"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => {
                  emitChange({ ...state, scaleX: -state.scaleX })
                }}
              >
                <FlipHorizontal className="h-3 w-3 mr-1" />
                Flip H
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => {
                  emitChange({ ...state, scaleY: -state.scaleY })
                }}
              >
                <FlipVertical className="h-3 w-3 mr-1" />
                Flip V
              </Button>
            </div>
          </div>

          {/* Skew */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Minimize2 className="h-3.5 w-3.5 text-muted-foreground rotate-45" />
              <Label className="text-xs font-medium">Skew</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">X</Label>
                <div className="flex gap-1">
                  <Slider
                    value={[state.skewX]}
                    onValueChange={([v]) => updateProperty('skewX', v)}
                    min={-45}
                    max={45}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={state.skewX}
                    onChange={(e) => updateProperty('skewX', parseFloat(e.target.value) || 0)}
                    className="h-7 w-16 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Y</Label>
                <div className="flex gap-1">
                  <Slider
                    value={[state.skewY]}
                    onValueChange={([v]) => updateProperty('skewY', v)}
                    min={-45}
                    max={45}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={state.skewY}
                    onChange={(e) => updateProperty('skewY', parseFloat(e.target.value) || 0)}
                    className="h-7 w-16 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 3D Transforms */}
        <TabsContent value="3d" className="space-y-4 mt-4">
          {/* Perspective */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Perspective</Label>
            <div className="flex gap-1">
              <Slider
                value={[state.perspective]}
                onValueChange={([v]) => updateProperty('perspective', v)}
                min={0}
                max={2000}
                step={10}
                className="flex-1"
              />
              <Input
                type="number"
                value={state.perspective}
                onChange={(e) => updateProperty('perspective', parseFloat(e.target.value) || 0)}
                className="h-7 w-16 text-xs"
              />
              <span className="text-xs text-muted-foreground self-center">px</span>
            </div>
          </div>

          {/* Translate Z */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Move Z</Label>
            <div className="flex gap-1">
              <Slider
                value={[state.translateZ]}
                onValueChange={([v]) => updateProperty('translateZ', v)}
                min={-500}
                max={500}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={state.translateZ}
                onChange={(e) => updateProperty('translateZ', parseFloat(e.target.value) || 0)}
                className="h-7 w-16 text-xs"
              />
            </div>
          </div>

          {/* Rotate 3D */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Rotate 3D</Label>
            <div className="space-y-2">
              <div className="flex gap-1 items-center">
                <Label className="w-8 text-[10px] text-muted-foreground">X</Label>
                <Slider
                  value={[state.rotateX]}
                  onValueChange={([v]) => updateProperty('rotateX', v)}
                  min={-180}
                  max={180}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={state.rotateX}
                  onChange={(e) => updateProperty('rotateX', parseFloat(e.target.value) || 0)}
                  className="h-7 w-16 text-xs"
                />
              </div>
              <div className="flex gap-1 items-center">
                <Label className="w-8 text-[10px] text-muted-foreground">Y</Label>
                <Slider
                  value={[state.rotateY]}
                  onValueChange={([v]) => updateProperty('rotateY', v)}
                  min={-180}
                  max={180}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={state.rotateY}
                  onChange={(e) => updateProperty('rotateY', parseFloat(e.target.value) || 0)}
                  className="h-7 w-16 text-xs"
                />
              </div>
              <div className="flex gap-1 items-center">
                <Label className="w-8 text-[10px] text-muted-foreground">Z</Label>
                <Slider
                  value={[state.rotateZ]}
                  onValueChange={([v]) => updateProperty('rotateZ', v)}
                  min={-180}
                  max={180}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={state.rotateZ}
                  onChange={(e) => updateProperty('rotateZ', parseFloat(e.target.value) || 0)}
                  className="h-7 w-16 text-xs"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Transform Origin */}
        <TabsContent value="origin" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Transform Origin</Label>

            {/* Visual origin picker */}
            <div className="relative w-full aspect-square max-w-[120px] mx-auto border rounded-lg bg-muted/30">
              {/* Grid markers */}
              {[0, 50, 100].map(x => (
                [0, 50, 100].map(y => (
                  <button
                    key={`${x}-${y}`}
                    className={cn(
                      "absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 transition-colors",
                      state.originX === x && state.originY === y
                        ? "bg-primary"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    onClick={() => emitChange({ ...state, originX: x, originY: y })}
                  />
                ))
              ))}
            </div>

            {/* Numeric inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">X (%)</Label>
                <Input
                  type="number"
                  value={state.originX}
                  onChange={(e) => updateProperty('originX', parseFloat(e.target.value) || 50)}
                  min={0}
                  max={100}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Y (%)</Label>
                <Input
                  type="number"
                  value={state.originY}
                  onChange={(e) => updateProperty('originY', parseFloat(e.target.value) || 50)}
                  min={0}
                  max={100}
                  className="h-7 text-xs"
                />
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'TL', x: 0, y: 0 },
                { label: 'T', x: 50, y: 0 },
                { label: 'TR', x: 100, y: 0 },
                { label: 'L', x: 0, y: 50 },
                { label: 'C', x: 50, y: 50 },
                { label: 'R', x: 100, y: 50 },
                { label: 'BL', x: 0, y: 100 },
                { label: 'B', x: 50, y: 100 },
                { label: 'BR', x: 100, y: 100 },
              ].map(preset => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-6 w-8 text-[10px] p-0",
                    state.originX === preset.x && state.originY === preset.y &&
                    "bg-primary text-primary-foreground"
                  )}
                  onClick={() => emitChange({ ...state, originX: preset.x, originY: preset.y })}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reset button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-7 text-xs"
        onClick={resetAll}
      >
        <RotateCcw className="h-3 w-3 mr-1" />
        Reset All Transforms
      </Button>

      {/* Output */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Output</Label>
        <pre className="p-2 bg-muted rounded text-[10px] font-mono overflow-x-auto whitespace-pre-wrap">
          transform: {buildTransformValue(state)};{'\n'}
          transform-origin: {buildOriginValue(state)};
        </pre>
      </div>
    </div>
  )
}

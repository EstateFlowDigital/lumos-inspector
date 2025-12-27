"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import { Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Switch } from "../ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"

// Shadow layer type
export interface ShadowLayer {
  id: string
  enabled: boolean
  inset: boolean
  offsetX: number
  offsetY: number
  blur: number
  spread: number
  color: string
  opacity: number
}

// Generate unique ID
const generateId = () => Math.random().toString(36).slice(2, 9)

// Default shadow layer
const defaultShadowLayer: Omit<ShadowLayer, 'id'> = {
  enabled: true,
  inset: false,
  offsetX: 0,
  offsetY: 4,
  blur: 6,
  spread: -1,
  color: '#000000',
  opacity: 0.1,
}

// Preset shadows
export const shadowPresets = [
  { name: 'None', value: 'none' },
  { name: 'SM', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
  { name: 'Default', value: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' },
  { name: 'MD', value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' },
  { name: 'LG', value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
  { name: 'XL', value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' },
  { name: '2XL', value: '0 25px 50px -12px rgb(0 0 0 / 0.25)' },
  { name: 'Inner', value: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)' },
]

// Parse box-shadow string into layers
function parseShadowValue(value: string): ShadowLayer[] {
  if (!value || value === 'none') return []

  // Split by comma, but handle rgba/rgb values
  const shadowStrings = value.split(/,(?![^(]*\))/g).map(s => s.trim())

  return shadowStrings.map(shadow => {
    const isInset = shadow.startsWith('inset')
    const shadowWithoutInset = isInset ? shadow.replace('inset', '').trim() : shadow

    // Parse values
    const matches = shadowWithoutInset.match(/(-?\d+(?:\.\d+)?)(px)?\s+(-?\d+(?:\.\d+)?)(px)?\s+(-?\d+(?:\.\d+)?)(px)?(?:\s+(-?\d+(?:\.\d+)?)(px)?)?\s+(.+)/)

    if (matches) {
      const offsetX = parseFloat(matches[1]) || 0
      const offsetY = parseFloat(matches[3]) || 0
      const blur = parseFloat(matches[5]) || 0
      const spread = parseFloat(matches[7]) || 0
      const colorString = matches[9] || '#000000'

      // Parse color and opacity
      let color = '#000000'
      let opacity = 1

      const rgbMatch = colorString.match(/rgba?\((\d+),?\s*(\d+),?\s*(\d+)(?:,?\s*([\d.]+))?\)/)
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1])
        const g = parseInt(rgbMatch[2])
        const b = parseInt(rgbMatch[3])
        opacity = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
        color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      } else if (colorString.startsWith('#')) {
        color = colorString.slice(0, 7)
        // Handle 8-character hex with alpha
        if (colorString.length === 9) {
          opacity = parseInt(colorString.slice(7), 16) / 255
        }
      }

      return {
        id: generateId(),
        enabled: true,
        inset: isInset,
        offsetX,
        offsetY,
        blur,
        spread,
        color,
        opacity: Math.round(opacity * 100) / 100,
      }
    }

    return { ...defaultShadowLayer, id: generateId() }
  })
}

// Build shadow value from layers
function buildShadowValue(layers: ShadowLayer[]): string {
  const enabledLayers = layers.filter(l => l.enabled)
  if (enabledLayers.length === 0) return 'none'

  return enabledLayers.map(layer => {
    const { inset, offsetX, offsetY, blur, spread, color, opacity } = layer

    // Convert hex to rgba
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)

    const colorValue = `rgba(${r}, ${g}, ${b}, ${opacity})`
    const insetStr = inset ? 'inset ' : ''

    return `${insetStr}${offsetX}px ${offsetY}px ${blur}px ${spread}px ${colorValue}`
  }).join(', ')
}

interface BoxShadowBuilderProps {
  value: string
  onChange: (value: string) => void
}

export function BoxShadowBuilder({ value, onChange }: BoxShadowBuilderProps) {
  const [layers, setLayers] = useState<ShadowLayer[]>(() => parseShadowValue(value))
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set())

  // Sync with external value
  useEffect(() => {
    const parsed = parseShadowValue(value)
    if (JSON.stringify(parsed.map(l => ({ ...l, id: '' }))) !== JSON.stringify(layers.map(l => ({ ...l, id: '' })))) {
      setLayers(parsed)
    }
  }, [value])

  // Emit changes
  const emitChange = useCallback((newLayers: ShadowLayer[]) => {
    setLayers(newLayers)
    onChange(buildShadowValue(newLayers))
  }, [onChange])

  // Add layer
  const addLayer = useCallback(() => {
    const newLayer: ShadowLayer = {
      ...defaultShadowLayer,
      id: generateId(),
    }
    const newLayers = [...layers, newLayer]
    setExpandedLayers(prev => new Set([...prev, newLayer.id]))
    emitChange(newLayers)
  }, [layers, emitChange])

  // Remove layer
  const removeLayer = useCallback((id: string) => {
    emitChange(layers.filter(l => l.id !== id))
  }, [layers, emitChange])

  // Update layer
  const updateLayer = useCallback((id: string, updates: Partial<ShadowLayer>) => {
    emitChange(layers.map(l => l.id === id ? { ...l, ...updates } : l))
  }, [layers, emitChange])

  // Toggle layer expansion
  const toggleExpanded = useCallback((id: string) => {
    setExpandedLayers(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Apply preset
  const applyPreset = useCallback((presetValue: string) => {
    onChange(presetValue)
    setLayers(parseShadowValue(presetValue))
  }, [onChange])

  return (
    <div className="space-y-3">
      {/* Presets */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Presets</Label>
        <div className="flex flex-wrap gap-1">
          {shadowPresets.map(preset => (
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
      <div className="border rounded-lg p-4 bg-background">
        <div
          className="w-16 h-16 rounded-lg bg-card mx-auto"
          style={{ boxShadow: buildShadowValue(layers) }}
        />
      </div>

      {/* Layers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Layers</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={addLayer}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Layer
          </Button>
        </div>

        {layers.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4 border rounded-lg border-dashed">
            No shadow layers. Click "Add Layer" to create one.
          </div>
        )}

        {layers.map((layer, index) => (
          <Collapsible
            key={layer.id}
            open={expandedLayers.has(layer.id)}
            onOpenChange={() => toggleExpanded(layer.id)}
          >
            <div className={cn(
              "border rounded-lg overflow-hidden",
              !layer.enabled && "opacity-50"
            )}>
              {/* Layer header */}
              <CollapsibleTrigger className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors">
                <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                <span className="text-xs font-medium flex-1 text-left">
                  Layer {index + 1}
                  {layer.inset && <span className="ml-1 text-muted-foreground">(inset)</span>}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    updateLayer(layer.id, { enabled: !layer.enabled })
                  }}
                >
                  {layer.enabled ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeLayer(layer.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CollapsibleTrigger>

              {/* Layer controls */}
              <CollapsibleContent>
                <div className="px-3 pb-3 space-y-3 border-t">
                  {/* Inset toggle */}
                  <div className="flex items-center justify-between pt-3">
                    <Label className="text-xs">Inset</Label>
                    <Switch
                      checked={layer.inset}
                      onCheckedChange={(checked) => updateLayer(layer.id, { inset: checked })}
                    />
                  </div>

                  {/* X Offset */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">X Offset</Label>
                      <span className="text-xs text-muted-foreground">{layer.offsetX}px</span>
                    </div>
                    <Slider
                      value={[layer.offsetX]}
                      onValueChange={([v]) => updateLayer(layer.id, { offsetX: v })}
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>

                  {/* Y Offset */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Y Offset</Label>
                      <span className="text-xs text-muted-foreground">{layer.offsetY}px</span>
                    </div>
                    <Slider
                      value={[layer.offsetY]}
                      onValueChange={([v]) => updateLayer(layer.id, { offsetY: v })}
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>

                  {/* Blur */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Blur</Label>
                      <span className="text-xs text-muted-foreground">{layer.blur}px</span>
                    </div>
                    <Slider
                      value={[layer.blur]}
                      onValueChange={([v]) => updateLayer(layer.id, { blur: v })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>

                  {/* Spread */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Spread</Label>
                      <span className="text-xs text-muted-foreground">{layer.spread}px</span>
                    </div>
                    <Slider
                      value={[layer.spread]}
                      onValueChange={([v]) => updateLayer(layer.id, { spread: v })}
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>

                  {/* Color and Opacity */}
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Color</Label>
                      <div className="flex gap-1">
                        <div
                          className="w-8 h-8 rounded border cursor-pointer"
                          style={{ backgroundColor: layer.color }}
                        >
                          <input
                            type="color"
                            value={layer.color}
                            onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
                            className="w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                        <Input
                          value={layer.color}
                          onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
                          className="h-8 text-xs font-mono flex-1"
                        />
                      </div>
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-xs">Opacity</Label>
                      <Input
                        type="number"
                        value={layer.opacity}
                        onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) || 0 })}
                        min={0}
                        max={1}
                        step={0.05}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      {/* Output */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Output</Label>
        <pre className="p-2 bg-muted rounded text-[10px] font-mono overflow-x-auto whitespace-pre-wrap">
          {buildShadowValue(layers)}
        </pre>
      </div>
    </div>
  )
}

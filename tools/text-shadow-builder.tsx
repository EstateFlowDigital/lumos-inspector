"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Type, Plus, Trash2, Copy, Eye, EyeOff, GripVertical
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface TextShadowLayer {
  id: string
  offsetX: number
  offsetY: number
  blur: number
  color: string
  enabled: boolean
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Parse text-shadow string
function parseTextShadow(shadow: string): TextShadowLayer[] {
  if (!shadow || shadow === "none") return []

  const layers: TextShadowLayer[] = []
  // Split by comma but not within rgb/rgba/hsl
  const parts = shadow.split(/,(?![^(]*\))/g)

  parts.forEach(part => {
    const trimmed = part.trim()
    if (!trimmed) return

    // Extract color and numeric values
    const colorMatch = trimmed.match(/(rgb[a]?\([^)]+\)|#[0-9a-fA-F]{3,8}|\w+)/g)
    const numbers = trimmed.match(/-?[\d.]+px/g)

    if (numbers && numbers.length >= 2) {
      layers.push({
        id: generateId(),
        offsetX: parseFloat(numbers[0]) || 0,
        offsetY: parseFloat(numbers[1]) || 0,
        blur: parseFloat(numbers[2]) || 0,
        color: colorMatch?.[0] || "#000000",
        enabled: true,
      })
    }
  })

  return layers
}

// Build text-shadow string
function buildTextShadow(layers: TextShadowLayer[]): string {
  const enabledLayers = layers.filter(l => l.enabled)
  if (enabledLayers.length === 0) return "none"

  return enabledLayers
    .map(l => `${l.offsetX}px ${l.offsetY}px ${l.blur}px ${l.color}`)
    .join(", ")
}

// Preset shadows
const presets = [
  { name: "None", shadow: "none" },
  { name: "Subtle", shadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  { name: "Outline", shadow: "0 0 2px #000, 0 0 2px #000" },
  { name: "Glow", shadow: "0 0 10px #fff, 0 0 20px #fff" },
  { name: "Neon", shadow: "0 0 5px #fff, 0 0 10px #fff, 0 0 20px #0ff, 0 0 40px #0ff" },
  { name: "3D", shadow: "2px 2px 0 #ccc, 4px 4px 0 #999" },
  { name: "Long Shadow", shadow: "1px 1px 0 #888, 2px 2px 0 #888, 3px 3px 0 #888, 4px 4px 0 #888" },
  { name: "Emboss", shadow: "-1px -1px 0 #fff, 1px 1px 0 #333" },
]

export function TextShadowBuilder() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [layers, setLayers] = useState<TextShadowLayer[]>([])
  const [previewText, setPreviewText] = useState("Sample Text")

  // Load shadow from selected element
  useEffect(() => {
    if (selectedElement?.element) {
      const computed = getComputedStyle(selectedElement.element)
      const shadow = computed.textShadow
      setLayers(parseTextShadow(shadow))
    }
  }, [selectedElement])

  // Apply shadow to element
  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const shadow = buildTextShadow(layers)
    selectedElement.element.style.textShadow = shadow
    notifyStyleChange()
    toast.success("Text shadow applied")
  }, [selectedElement, layers, notifyStyleChange])

  // Add layer
  const addLayer = useCallback(() => {
    setLayers(prev => [
      ...prev,
      {
        id: generateId(),
        offsetX: 2,
        offsetY: 2,
        blur: 4,
        color: "#000000",
        enabled: true,
      },
    ])
  }, [])

  // Remove layer
  const removeLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id))
  }, [])

  // Update layer
  const updateLayer = useCallback((id: string, updates: Partial<TextShadowLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }, [])

  // Toggle layer
  const toggleLayer = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l))
  }, [])

  // Apply preset
  const applyPreset = useCallback((shadow: string) => {
    setLayers(parseTextShadow(shadow))
    toast.success("Preset applied")
  }, [])

  // Copy CSS
  const copyCSS = useCallback(() => {
    const shadow = buildTextShadow(layers)
    navigator.clipboard.writeText(`text-shadow: ${shadow};`)
    toast.success("CSS copied to clipboard")
  }, [layers])

  // Current shadow string
  const currentShadow = useMemo(() => buildTextShadow(layers), [layers])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-chart-2" />
          <span>Text Shadow</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Preview */}
        <div className="p-4 bg-muted/50 rounded-md text-center">
          <div
            className="text-2xl font-bold"
            style={{ textShadow: currentShadow }}
          >
            {previewText}
          </div>
          <Input
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            className="mt-2 h-7 text-xs text-center"
            placeholder="Preview text..."
          />
        </div>

        {/* Presets */}
        <div>
          <Label className="text-[10px] text-muted-foreground mb-2 block">Presets</Label>
          <div className="flex flex-wrap gap-1">
            {presets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => applyPreset(preset.shadow)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Layers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-[10px] text-muted-foreground">Layers ({layers.length})</Label>
            <Button variant="ghost" size="sm" className="h-6" onClick={addLayer}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>

          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {layers.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No shadow layers. Click Add to create one.
                </div>
              ) : (
                layers.map((layer, index) => (
                  <div
                    key={layer.id}
                    className={cn(
                      "p-2 rounded-md border",
                      layer.enabled ? "bg-card" : "bg-muted/50 opacity-60"
                    )}
                  >
                    {/* Layer header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                        <span className="text-xs font-medium">Layer {index + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleLayer(layer.id)}
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
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={() => removeLayer(layer.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Color */}
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="color"
                        value={layer.color.startsWith("#") ? layer.color : "#000000"}
                        onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
                        className="w-8 h-6 rounded cursor-pointer"
                      />
                      <Input
                        value={layer.color}
                        onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
                        className="flex-1 h-6 text-[10px] font-mono"
                        placeholder="Color..."
                      />
                    </div>

                    {/* Offset X */}
                    <div className="space-y-1 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground">Offset X</span>
                        <span className="text-[9px] font-mono">{layer.offsetX}px</span>
                      </div>
                      <Slider
                        value={[layer.offsetX]}
                        onValueChange={([v]) => updateLayer(layer.id, { offsetX: v })}
                        min={-50}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Offset Y */}
                    <div className="space-y-1 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground">Offset Y</span>
                        <span className="text-[9px] font-mono">{layer.offsetY}px</span>
                      </div>
                      <Slider
                        value={[layer.offsetY]}
                        onValueChange={([v]) => updateLayer(layer.id, { offsetY: v })}
                        min={-50}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Blur */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground">Blur</span>
                        <span className="text-[9px] font-mono">{layer.blur}px</span>
                      </div>
                      <Slider
                        value={[layer.blur]}
                        onValueChange={([v]) => updateLayer(layer.id, { blur: v })}
                        min={0}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Current value */}
        <div className="p-2 bg-muted/50 rounded text-[10px] font-mono break-all">
          text-shadow: {currentShadow};
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7"
            onClick={copyCSS}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy CSS
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 h-7"
            onClick={applyToElement}
            disabled={!selectedElement}
          >
            Apply
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

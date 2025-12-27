"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Sparkles, RotateCcw, Copy, Plus, Trash2, GripVertical
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { ScrollArea } from "../ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface FilterDef {
  name: string
  unit: string
  min: number
  max: number
  default: number
  step: number
}

interface FilterValue {
  id: string
  type: string
  value: number
}

// Available backdrop filters
const filterDefs: Record<string, FilterDef> = {
  blur: { name: "Blur", unit: "px", min: 0, max: 50, default: 0, step: 1 },
  brightness: { name: "Brightness", unit: "%", min: 0, max: 200, default: 100, step: 5 },
  contrast: { name: "Contrast", unit: "%", min: 0, max: 200, default: 100, step: 5 },
  grayscale: { name: "Grayscale", unit: "%", min: 0, max: 100, default: 0, step: 5 },
  "hue-rotate": { name: "Hue Rotate", unit: "deg", min: 0, max: 360, default: 0, step: 5 },
  invert: { name: "Invert", unit: "%", min: 0, max: 100, default: 0, step: 5 },
  opacity: { name: "Opacity", unit: "%", min: 0, max: 100, default: 100, step: 5 },
  saturate: { name: "Saturate", unit: "%", min: 0, max: 200, default: 100, step: 5 },
  sepia: { name: "Sepia", unit: "%", min: 0, max: 100, default: 0, step: 5 },
}

// Presets for frosted glass effects
const presets = [
  { name: "None", filters: [] },
  { name: "Frosted Glass", filters: [{ type: "blur", value: 10 }, { type: "brightness", value: 105 }] },
  { name: "Light Blur", filters: [{ type: "blur", value: 4 }] },
  { name: "Heavy Blur", filters: [{ type: "blur", value: 20 }] },
  { name: "Frosted Dark", filters: [{ type: "blur", value: 12 }, { type: "brightness", value: 80 }] },
  { name: "Frosted Warm", filters: [{ type: "blur", value: 10 }, { type: "sepia", value: 20 }] },
  { name: "Frosted Cool", filters: [{ type: "blur", value: 10 }, { type: "hue-rotate", value: 180 }] },
  { name: "Matte", filters: [{ type: "blur", value: 8 }, { type: "saturate", value: 80 }] },
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function parseBackdropFilter(filter: string): FilterValue[] {
  if (!filter || filter === "none") return []

  const values: FilterValue[] = []
  const regex = /(\w+-?\w*)\(([^)]+)\)/g
  let match

  while ((match = regex.exec(filter)) !== null) {
    const type = match[1]
    const valueStr = match[2]

    if (filterDefs[type]) {
      const value = parseFloat(valueStr)
      values.push({ id: generateId(), type, value })
    }
  }

  return values
}

function buildBackdropFilter(filters: FilterValue[]): string {
  if (filters.length === 0) return "none"

  return filters
    .map(f => {
      const def = filterDefs[f.type]
      if (!def) return ""
      return `${f.type}(${f.value}${def.unit})`
    })
    .filter(Boolean)
    .join(" ")
}

export function BackdropFilterEditor() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [filters, setFilters] = useState<FilterValue[]>([])

  useEffect(() => {
    if (selectedElement?.element) {
      const computed = getComputedStyle(selectedElement.element)
      const filter = computed.backdropFilter || computed.getPropertyValue("-webkit-backdrop-filter")
      setFilters(parseBackdropFilter(filter))
    }
  }, [selectedElement])

  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const filter = buildBackdropFilter(filters)
    selectedElement.element.style.backdropFilter = filter
    selectedElement.element.style.setProperty("-webkit-backdrop-filter", filter)
    notifyStyleChange()
    toast.success("Backdrop filter applied")
  }, [selectedElement, filters, notifyStyleChange])

  const addFilter = useCallback((type: string) => {
    const def = filterDefs[type]
    if (!def) return

    setFilters(prev => [
      ...prev,
      { id: generateId(), type, value: def.default },
    ])
  }, [])

  const removeFilter = useCallback((id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id))
  }, [])

  const updateFilter = useCallback((id: string, value: number) => {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, value } : f))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters([])
    if (selectedElement?.element) {
      selectedElement.element.style.backdropFilter = "none"
      selectedElement.element.style.setProperty("-webkit-backdrop-filter", "none")
      notifyStyleChange()
    }
    toast.success("Backdrop filter reset")
  }, [selectedElement, notifyStyleChange])

  const applyPreset = useCallback((preset: { filters: { type: string; value: number }[] }) => {
    setFilters(preset.filters.map(f => ({ ...f, id: generateId() })))
    toast.success("Preset applied")
  }, [])

  const copyCSS = useCallback(() => {
    const filter = buildBackdropFilter(filters)
    navigator.clipboard.writeText(`backdrop-filter: ${filter};\n-webkit-backdrop-filter: ${filter};`)
    toast.success("CSS copied to clipboard")
  }, [filters])

  const currentFilter = useMemo(() => buildBackdropFilter(filters), [filters])

  const availableFilters = useMemo(() => {
    const usedTypes = new Set(filters.map(f => f.type))
    return Object.entries(filterDefs)
      .filter(([type]) => !usedTypes.has(type))
      .map(([type, def]) => ({ type, ...def }))
  }, [filters])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-500" />
          <span>Backdrop Filter</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Preview */}
        <div className="relative overflow-hidden rounded-md h-24">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <div className="grid grid-cols-4 gap-1 w-full h-full">
              {[...Array(16)].map((_, i) => (
                <div key={i} className={cn("rounded", i % 2 === 0 ? "bg-white/80" : "bg-black/40")} />
              ))}
            </div>
          </div>
          <div
            className="absolute inset-4 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold border border-white/30"
            style={{
              backdropFilter: currentFilter,
              WebkitBackdropFilter: currentFilter,
            }}
          >
            Preview
          </div>
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
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Add filter */}
        {availableFilters.length > 0 && (
          <div className="flex gap-2">
            <Select onValueChange={addFilter}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Add filter..." />
              </SelectTrigger>
              <SelectContent>
                {availableFilters.map((f) => (
                  <SelectItem key={f.type} value={f.type} className="text-xs">
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-7" onClick={resetFilters}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Active filters */}
        <ScrollArea className="h-[180px]">
          <div className="space-y-2">
            {filters.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No filters applied. Add a blur for frosted glass effect.
              </div>
            ) : (
              filters.map((filter) => {
                const def = filterDefs[filter.type]
                if (!def) return null

                return (
                  <div key={filter.id} className="p-2 bg-card border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                        <span className="text-xs font-medium">{def.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {filter.value}{def.unit}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={() => removeFilter(filter.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Slider
                      value={[filter.value]}
                      onValueChange={([v]) => updateFilter(filter.id, v)}
                      min={def.min}
                      max={def.max}
                      step={def.step}
                      className="w-full"
                    />
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>

        {/* Current value */}
        <div className="p-2 bg-muted/50 rounded text-[10px] font-mono break-all">
          backdrop-filter: {currentFilter};
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-7" onClick={copyCSS}>
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

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

// Note: This component receives style changes via props from the parent
// and notifies via the onChange callback, so no direct notifyStyleChange needed

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

// Available filters
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
  "drop-shadow": { name: "Drop Shadow", unit: "px", min: 0, max: 50, default: 0, step: 1 },
}

// Presets
const presets = [
  { name: "None", filters: [] },
  { name: "Grayscale", filters: [{ type: "grayscale", value: 100 }] },
  { name: "Sepia", filters: [{ type: "sepia", value: 100 }] },
  { name: "Blur", filters: [{ type: "blur", value: 5 }] },
  { name: "Vintage", filters: [{ type: "sepia", value: 50 }, { type: "contrast", value: 120 }] },
  { name: "High Contrast", filters: [{ type: "contrast", value: 150 }, { type: "saturate", value: 130 }] },
  { name: "Muted", filters: [{ type: "saturate", value: 50 }, { type: "brightness", value: 110 }] },
  { name: "Invert", filters: [{ type: "invert", value: 100 }] },
]

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Parse filter string
function parseFilter(filter: string): FilterValue[] {
  if (!filter || filter === "none") return []

  const values: FilterValue[] = []
  const regex = /(\w+-?\w*)\(([^)]+)\)/g
  let match

  while ((match = regex.exec(filter)) !== null) {
    const type = match[1]
    const valueStr = match[2]

    if (filterDefs[type]) {
      let value = parseFloat(valueStr)
      // Convert percentage to number
      if (valueStr.includes("%")) {
        value = parseFloat(valueStr)
      }
      values.push({ id: generateId(), type, value })
    }
  }

  return values
}

// Build filter string
function buildFilter(filters: FilterValue[]): string {
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

export function FilterEditor() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [filters, setFilters] = useState<FilterValue[]>([])

  // Load filter from selected element
  useEffect(() => {
    if (selectedElement?.element) {
      const computed = getComputedStyle(selectedElement.element)
      const filter = computed.filter
      setFilters(parseFilter(filter))
    }
  }, [selectedElement])

  // Apply filter to element
  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const filter = buildFilter(filters)
    selectedElement.element.style.filter = filter
    toast.success("Filter applied")
  }, [selectedElement, filters])

  // Add filter
  const addFilter = useCallback((type: string) => {
    const def = filterDefs[type]
    if (!def) return

    setFilters(prev => [
      ...prev,
      { id: generateId(), type, value: def.default },
    ])
  }, [])

  // Remove filter
  const removeFilter = useCallback((id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id))
  }, [])

  // Update filter value
  const updateFilter = useCallback((id: string, value: number) => {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, value } : f))
  }, [])

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters([])
    if (selectedElement?.element) {
      selectedElement.element.style.filter = "none"
    }
    toast.success("Filters reset")
  }, [selectedElement])

  // Apply preset
  const applyPreset = useCallback((preset: { filters: { type: string; value: number }[] }) => {
    setFilters(preset.filters.map(f => ({ ...f, id: generateId() })))
    toast.success("Preset applied")
  }, [])

  // Copy CSS
  const copyCSS = useCallback(() => {
    const filter = buildFilter(filters)
    navigator.clipboard.writeText(`filter: ${filter};`)
    toast.success("CSS copied to clipboard")
  }, [filters])

  // Current filter string
  const currentFilter = useMemo(() => buildFilter(filters), [filters])

  // Available filters to add
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
          <Sparkles className="h-4 w-4 text-chart-3" />
          <span>Filter Editor</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Preview */}
        <div className="relative overflow-hidden rounded-md">
          <div
            className="w-full h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"
            style={{ filter: currentFilter }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg" style={{ filter: currentFilter }}>
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
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {filters.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No filters applied. Select a preset or add filters.
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
          filter: {currentFilter};
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

"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import {
  Layers,
  Check,
  X,
  Copy,
  Trash2,
  Paintbrush,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Grid3X3,
  Columns,
  Type,
  Palette,
  Box,
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Separator } from "../ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"

// Style preset for batch application
export interface StylePreset {
  id: string
  name: string
  category: string
  styles: Record<string, string>
}

// Quick style presets
export const quickStylePresets: StylePreset[] = [
  // Layout presets
  {
    id: "flex-center",
    name: "Flex Center",
    category: "layout",
    styles: {
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
    },
  },
  {
    id: "flex-between",
    name: "Flex Space Between",
    category: "layout",
    styles: {
      display: "flex",
      "align-items": "center",
      "justify-content": "space-between",
    },
  },
  {
    id: "flex-column",
    name: "Flex Column",
    category: "layout",
    styles: {
      display: "flex",
      "flex-direction": "column",
    },
  },
  {
    id: "grid-2col",
    name: "Grid 2 Columns",
    category: "layout",
    styles: {
      display: "grid",
      "grid-template-columns": "repeat(2, 1fr)",
      gap: "1rem",
    },
  },
  {
    id: "grid-3col",
    name: "Grid 3 Columns",
    category: "layout",
    styles: {
      display: "grid",
      "grid-template-columns": "repeat(3, 1fr)",
      gap: "1rem",
    },
  },
  {
    id: "absolute-fill",
    name: "Absolute Fill",
    category: "layout",
    styles: {
      position: "absolute",
      top: "0",
      right: "0",
      bottom: "0",
      left: "0",
    },
  },
  // Spacing presets
  {
    id: "padding-sm",
    name: "Small Padding",
    category: "spacing",
    styles: { padding: "0.5rem" },
  },
  {
    id: "padding-md",
    name: "Medium Padding",
    category: "spacing",
    styles: { padding: "1rem" },
  },
  {
    id: "padding-lg",
    name: "Large Padding",
    category: "spacing",
    styles: { padding: "2rem" },
  },
  {
    id: "margin-auto",
    name: "Center with Margin",
    category: "spacing",
    styles: { margin: "0 auto" },
  },
  {
    id: "gap-sm",
    name: "Small Gap",
    category: "spacing",
    styles: { gap: "0.5rem" },
  },
  {
    id: "gap-md",
    name: "Medium Gap",
    category: "spacing",
    styles: { gap: "1rem" },
  },
  // Visual presets
  {
    id: "rounded-sm",
    name: "Small Radius",
    category: "visual",
    styles: { "border-radius": "0.25rem" },
  },
  {
    id: "rounded-md",
    name: "Medium Radius",
    category: "visual",
    styles: { "border-radius": "0.5rem" },
  },
  {
    id: "rounded-lg",
    name: "Large Radius",
    category: "visual",
    styles: { "border-radius": "1rem" },
  },
  {
    id: "rounded-full",
    name: "Full Radius",
    category: "visual",
    styles: { "border-radius": "9999px" },
  },
  {
    id: "shadow-sm",
    name: "Small Shadow",
    category: "visual",
    styles: { "box-shadow": "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
  },
  {
    id: "shadow-md",
    name: "Medium Shadow",
    category: "visual",
    styles: {
      "box-shadow": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    },
  },
  {
    id: "shadow-lg",
    name: "Large Shadow",
    category: "visual",
    styles: {
      "box-shadow": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    },
  },
  // Typography presets
  {
    id: "text-sm",
    name: "Small Text",
    category: "typography",
    styles: { "font-size": "0.875rem", "line-height": "1.25rem" },
  },
  {
    id: "text-base",
    name: "Base Text",
    category: "typography",
    styles: { "font-size": "1rem", "line-height": "1.5rem" },
  },
  {
    id: "text-lg",
    name: "Large Text",
    category: "typography",
    styles: { "font-size": "1.125rem", "line-height": "1.75rem" },
  },
  {
    id: "text-xl",
    name: "XL Text",
    category: "typography",
    styles: { "font-size": "1.25rem", "line-height": "1.75rem" },
  },
  {
    id: "text-bold",
    name: "Bold",
    category: "typography",
    styles: { "font-weight": "700" },
  },
  {
    id: "text-center",
    name: "Center Text",
    category: "typography",
    styles: { "text-align": "center" },
  },
  {
    id: "truncate",
    name: "Truncate",
    category: "typography",
    styles: {
      overflow: "hidden",
      "text-overflow": "ellipsis",
      "white-space": "nowrap",
    },
  },
]

// Category icons
const categoryIcons: Record<string, React.ReactNode> = {
  layout: <Grid3X3 className="h-4 w-4" />,
  spacing: <Box className="h-4 w-4" />,
  visual: <Palette className="h-4 w-4" />,
  typography: <Type className="h-4 w-4" />,
}

// Batch operations context
interface BatchOperationsContextType {
  selectedElements: HTMLElement[]
  setSelectedElements: (elements: HTMLElement[]) => void
  addElement: (element: HTMLElement) => void
  removeElement: (element: HTMLElement) => void
  clearSelection: () => void
  applyStyles: (styles: Record<string, string>) => void
  removeStyles: (properties: string[]) => void
  copyStyles: () => Record<string, string> | null
  pasteStyles: (styles: Record<string, string>) => void
}

const BatchOperationsContext = React.createContext<BatchOperationsContextType | null>(null)

export function useBatchOperations() {
  const context = React.useContext(BatchOperationsContext)
  if (!context) {
    throw new Error("useBatchOperations must be used within BatchOperationsProvider")
  }
  return context
}

// Provider component
interface BatchOperationsProviderProps {
  children: React.ReactNode
  onStyleChange?: (elements: HTMLElement[], property: string, value: string) => void
}

export function BatchOperationsProvider({
  children,
  onStyleChange,
}: BatchOperationsProviderProps) {
  const [selectedElements, setSelectedElements] = useState<HTMLElement[]>([])

  const addElement = useCallback((element: HTMLElement) => {
    setSelectedElements((prev) => {
      if (prev.includes(element)) return prev
      return [...prev, element]
    })
  }, [])

  const removeElement = useCallback((element: HTMLElement) => {
    setSelectedElements((prev) => prev.filter((el) => el !== element))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedElements([])
  }, [])

  const applyStyles = useCallback((styles: Record<string, string>) => {
    selectedElements.forEach((element) => {
      Object.entries(styles).forEach(([property, value]) => {
        element.style.setProperty(property, value)
        if (onStyleChange) {
          onStyleChange(selectedElements, property, value)
        }
      })
    })
  }, [selectedElements, onStyleChange])

  const removeStyles = useCallback((properties: string[]) => {
    selectedElements.forEach((element) => {
      properties.forEach((property) => {
        element.style.removeProperty(property)
      })
    })
  }, [selectedElements])

  const copyStyles = useCallback(() => {
    if (selectedElements.length === 0) return null

    const element = selectedElements[0]
    const computed = window.getComputedStyle(element)
    const styles: Record<string, string> = {}

    // Copy common properties
    const properties = [
      "display", "position", "width", "height", "padding", "margin",
      "border", "border-radius", "background", "color", "font-size",
      "font-weight", "text-align", "flex", "gap", "box-shadow",
    ]

    properties.forEach((prop) => {
      styles[prop] = computed.getPropertyValue(prop)
    })

    return styles
  }, [selectedElements])

  const pasteStyles = useCallback((styles: Record<string, string>) => {
    applyStyles(styles)
  }, [applyStyles])

  return (
    <BatchOperationsContext.Provider
      value={{
        selectedElements,
        setSelectedElements,
        addElement,
        removeElement,
        clearSelection,
        applyStyles,
        removeStyles,
        copyStyles,
        pasteStyles,
      }}
    >
      {children}
    </BatchOperationsContext.Provider>
  )
}

// Selected elements list
function SelectedElementsList() {
  const { selectedElements, removeElement, clearSelection } = useBatchOperations()

  if (selectedElements.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No elements selected</p>
        <p className="text-xs">Hold Shift and click to multi-select</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          {selectedElements.length} selected
        </Badge>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>

      <ScrollArea className="h-32">
        <div className="space-y-1">
          {selectedElements.map((element, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 text-xs bg-muted/30 rounded"
            >
              <code className="truncate flex-1">
                {element.tagName.toLowerCase()}
                {element.className && `.${element.className.split(" ")[0]}`}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => removeElement(element)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

// Custom style input
function CustomStyleInput() {
  const { applyStyles, selectedElements } = useBatchOperations()
  const [property, setProperty] = useState("")
  const [value, setValue] = useState("")

  const handleApply = useCallback(() => {
    if (property && value) {
      applyStyles({ [property]: value })
      setValue("")
    }
  }, [property, value, applyStyles])

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="property"
          value={property}
          onChange={(e) => setProperty(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
        />
      </div>
      <Button
        className="w-full"
        size="sm"
        disabled={!property || !value || selectedElements.length === 0}
        onClick={handleApply}
      >
        <Paintbrush className="h-4 w-4 mr-2" />
        Apply to {selectedElements.length} elements
      </Button>
    </div>
  )
}

// Preset buttons
function PresetButtons() {
  const { applyStyles, selectedElements } = useBatchOperations()
  const [category, setCategory] = useState("all")

  const filteredPresets = useMemo(() => {
    if (category === "all") return quickStylePresets
    return quickStylePresets.filter((p) => p.category === category)
  }, [category])

  const categories = ["all", "layout", "spacing", "visual", "typography"]

  return (
    <div className="space-y-3">
      {/* Category filter */}
      <div className="flex gap-1">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={category === cat ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs capitalize"
            onClick={() => setCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Presets grid */}
      <div className="grid grid-cols-2 gap-2">
        {filteredPresets.map((preset) => (
          <Button
            key={preset.id}
            variant="outline"
            size="sm"
            className="h-auto py-2 px-3 justify-start text-left"
            disabled={selectedElements.length === 0}
            onClick={() => applyStyles(preset.styles)}
          >
            <span className="mr-2">{categoryIcons[preset.category]}</span>
            <span className="text-xs truncate">{preset.name}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

// Quick alignment buttons
function AlignmentButtons() {
  const { applyStyles, selectedElements } = useBatchOperations()

  const alignments = [
    { icon: <AlignLeft className="h-4 w-4" />, style: { "text-align": "left" } },
    { icon: <AlignCenter className="h-4 w-4" />, style: { "text-align": "center" } },
    { icon: <AlignRight className="h-4 w-4" />, style: { "text-align": "right" } },
  ]

  const flexAlignments = [
    { icon: <AlignStartVertical className="h-4 w-4" />, style: { "align-items": "flex-start" } },
    { icon: <AlignCenterVertical className="h-4 w-4" />, style: { "align-items": "center" } },
    { icon: <AlignEndVertical className="h-4 w-4" />, style: { "align-items": "flex-end" } },
  ]

  return (
    <div className="flex gap-2">
      <div className="flex border rounded overflow-hidden">
        {alignments.map((align, i) => (
          <Button
            key={i}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-none border-r last:border-r-0"
            disabled={selectedElements.length === 0}
            onClick={() => applyStyles(align.style)}
          >
            {align.icon}
          </Button>
        ))}
      </div>
      <div className="flex border rounded overflow-hidden">
        {flexAlignments.map((align, i) => (
          <Button
            key={i}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-none border-r last:border-r-0"
            disabled={selectedElements.length === 0}
            onClick={() => applyStyles(align.style)}
          >
            {align.icon}
          </Button>
        ))}
      </div>
    </div>
  )
}

// Main batch operations panel
interface BatchOperationsPanelProps {
  className?: string
}

export function BatchOperationsPanel({ className }: BatchOperationsPanelProps) {
  const { selectedElements, copyStyles, applyStyles } = useBatchOperations()
  const [copiedStyles, setCopiedStyles] = useState<Record<string, string> | null>(null)

  const handleCopy = useCallback(() => {
    const styles = copyStyles()
    if (styles) {
      setCopiedStyles(styles)
    }
  }, [copyStyles])

  const handlePaste = useCallback(() => {
    if (copiedStyles) {
      applyStyles(copiedStyles)
    }
  }, [copiedStyles, applyStyles])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          <h2 className="font-semibold">Batch Operations</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={selectedElements.length === 0}
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={!copiedStyles || selectedElements.length === 0}
            onClick={handlePaste}
          >
            <Paintbrush className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Selected elements */}
          <div>
            <h3 className="text-sm font-medium mb-3">Selected Elements</h3>
            <SelectedElementsList />
          </div>

          <Separator />

          {/* Quick alignment */}
          <div>
            <h3 className="text-sm font-medium mb-3">Alignment</h3>
            <AlignmentButtons />
          </div>

          <Separator />

          {/* Style presets */}
          <div>
            <h3 className="text-sm font-medium mb-3">Style Presets</h3>
            <PresetButtons />
          </div>

          <Separator />

          {/* Custom style */}
          <div>
            <h3 className="text-sm font-medium mb-3">Custom Style</h3>
            <CustomStyleInput />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// Multi-select overlay indicator
export function MultiSelectOverlay({ elements }: { elements: HTMLElement[] }) {
  if (elements.length === 0) return null

  return (
    <>
      {elements.map((element, index) => {
        const rect = element.getBoundingClientRect()
        return (
          <div
            key={index}
            className="fixed pointer-events-none border-2 border-primary/50 bg-primary/10"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          >
            <div className="absolute -top-5 left-0 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
              {index + 1}
            </div>
          </div>
        )
      })}
    </>
  )
}

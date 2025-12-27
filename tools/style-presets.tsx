"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  Star, StarOff, Plus, Trash2, ChevronDown, Copy, Paintbrush, Download, Upload
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import { useInspector } from "../core/inspector-context"

// Preset categories
const CATEGORIES = [
  "Layout",
  "Typography",
  "Colors",
  "Buttons",
  "Cards",
  "Forms",
  "Effects",
  "Custom",
] as const

type Category = typeof CATEGORIES[number]

// Style preset type
interface StylePreset {
  id: string
  name: string
  category: Category
  styles: Record<string, string>
  isFavorite: boolean
  createdAt: number
}

// Built-in presets
const BUILT_IN_PRESETS: Omit<StylePreset, "id" | "createdAt">[] = [
  // Layout
  {
    name: "Flex Center",
    category: "Layout",
    styles: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    isFavorite: false,
  },
  {
    name: "Flex Column",
    category: "Layout",
    styles: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    isFavorite: false,
  },
  {
    name: "Grid 2 Cols",
    category: "Layout",
    styles: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "16px",
    },
    isFavorite: false,
  },
  {
    name: "Grid 3 Cols",
    category: "Layout",
    styles: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "16px",
    },
    isFavorite: false,
  },
  {
    name: "Absolute Fill",
    category: "Layout",
    styles: {
      position: "absolute",
      inset: "0",
    },
    isFavorite: false,
  },

  // Typography
  {
    name: "Heading Large",
    category: "Typography",
    styles: {
      fontSize: "2.25rem",
      fontWeight: "700",
      lineHeight: "1.2",
      letterSpacing: "-0.02em",
    },
    isFavorite: false,
  },
  {
    name: "Heading Medium",
    category: "Typography",
    styles: {
      fontSize: "1.5rem",
      fontWeight: "600",
      lineHeight: "1.3",
    },
    isFavorite: false,
  },
  {
    name: "Body Text",
    category: "Typography",
    styles: {
      fontSize: "1rem",
      fontWeight: "400",
      lineHeight: "1.6",
    },
    isFavorite: false,
  },
  {
    name: "Small Text",
    category: "Typography",
    styles: {
      fontSize: "0.875rem",
      fontWeight: "400",
      lineHeight: "1.5",
      color: "var(--muted-foreground)",
    },
    isFavorite: false,
  },
  {
    name: "Text Truncate",
    category: "Typography",
    styles: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    isFavorite: false,
  },

  // Colors
  {
    name: "Primary BG",
    category: "Colors",
    styles: {
      backgroundColor: "hsl(var(--primary))",
      color: "hsl(var(--primary-foreground))",
    },
    isFavorite: false,
  },
  {
    name: "Muted BG",
    category: "Colors",
    styles: {
      backgroundColor: "hsl(var(--muted))",
      color: "hsl(var(--muted-foreground))",
    },
    isFavorite: false,
  },
  {
    name: "Gradient BG",
    category: "Colors",
    styles: {
      backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--chart-2)) 100%)",
    },
    isFavorite: false,
  },

  // Buttons
  {
    name: "Button Primary",
    category: "Buttons",
    styles: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0.5rem 1rem",
      backgroundColor: "hsl(var(--primary))",
      color: "hsl(var(--primary-foreground))",
      borderRadius: "var(--radius)",
      fontWeight: "500",
      cursor: "pointer",
    },
    isFavorite: false,
  },
  {
    name: "Button Outline",
    category: "Buttons",
    styles: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0.5rem 1rem",
      backgroundColor: "transparent",
      border: "1px solid hsl(var(--border))",
      borderRadius: "var(--radius)",
      fontWeight: "500",
      cursor: "pointer",
    },
    isFavorite: false,
  },

  // Cards
  {
    name: "Card Basic",
    category: "Cards",
    styles: {
      backgroundColor: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "var(--radius)",
      padding: "1.5rem",
    },
    isFavorite: false,
  },
  {
    name: "Card Elevated",
    category: "Cards",
    styles: {
      backgroundColor: "hsl(var(--card))",
      borderRadius: "var(--radius)",
      padding: "1.5rem",
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    },
    isFavorite: false,
  },

  // Effects
  {
    name: "Shadow Soft",
    category: "Effects",
    styles: {
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    },
    isFavorite: false,
  },
  {
    name: "Shadow Medium",
    category: "Effects",
    styles: {
      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    },
    isFavorite: false,
  },
  {
    name: "Shadow Large",
    category: "Effects",
    styles: {
      boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    },
    isFavorite: false,
  },
  {
    name: "Glass Effect",
    category: "Effects",
    styles: {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    },
    isFavorite: false,
  },
  {
    name: "Hover Scale",
    category: "Effects",
    styles: {
      transition: "transform 0.2s ease",
      cursor: "pointer",
    },
    isFavorite: false,
  },
]

// Storage key
const STORAGE_KEY = "devtools-style-presets"

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

interface StylePresetsProps {
  onApply: (styles: Record<string, string>) => void
}

export function StylePresets({ onApply }: StylePresetsProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [presets, setPresets] = useState<StylePreset[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | "All" | "Favorites">("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newPresetName, setNewPresetName] = useState("")
  const [newPresetCategory, setNewPresetCategory] = useState<Category>("Custom")
  const { selectedElement } = useInspector()

  // Load presets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setPresets(parsed)
      } else {
        // Initialize with built-in presets
        const initialPresets: StylePreset[] = BUILT_IN_PRESETS.map((preset) => ({
          ...preset,
          id: generateId(),
          createdAt: Date.now(),
        }))
        setPresets(initialPresets)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPresets))
      }
    } catch (e) {
      console.warn("Failed to load presets:", e)
    }
  }, [])

  // Save presets to localStorage
  const savePresets = useCallback((newPresets: StylePreset[]) => {
    setPresets(newPresets)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets))
    } catch (e) {
      toast.error("Failed to save presets")
    }
  }, [])

  // Filter presets
  const filteredPresets = presets.filter((preset) => {
    const matchesCategory =
      selectedCategory === "All" ||
      (selectedCategory === "Favorites" && preset.isFavorite) ||
      preset.category === selectedCategory

    const matchesSearch =
      !searchQuery ||
      preset.name.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesCategory && matchesSearch
  })

  // Toggle favorite
  const toggleFavorite = useCallback((id: string) => {
    const newPresets = presets.map((p) =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    )
    savePresets(newPresets)
  }, [presets, savePresets])

  // Delete preset
  const deletePreset = useCallback((id: string) => {
    const newPresets = presets.filter((p) => p.id !== id)
    savePresets(newPresets)
    toast.success("Preset deleted")
  }, [presets, savePresets])

  // Create preset from current element
  const createFromElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    if (!newPresetName.trim()) {
      toast.error("Enter a preset name")
      return
    }

    const computed = window.getComputedStyle(selectedElement.element)
    const stylesToSave = [
      "display", "position", "width", "height", "margin", "padding",
      "backgroundColor", "color", "fontSize", "fontWeight", "fontFamily",
      "border", "borderRadius", "boxShadow", "opacity", "transform",
      "flexDirection", "justifyContent", "alignItems", "gap",
      "textAlign", "lineHeight", "letterSpacing",
    ]

    const styles: Record<string, string> = {}
    stylesToSave.forEach((prop) => {
      const value = computed.getPropertyValue(prop.replace(/([A-Z])/g, "-$1").toLowerCase())
      if (value && value !== "none" && value !== "normal" && value !== "auto" && value !== "0px") {
        styles[prop] = value
      }
    })

    const newPreset: StylePreset = {
      id: generateId(),
      name: newPresetName.trim(),
      category: newPresetCategory,
      styles,
      isFavorite: false,
      createdAt: Date.now(),
    }

    savePresets([newPreset, ...presets])
    setNewPresetName("")
    setShowCreateDialog(false)
    toast.success("Preset created")
  }, [selectedElement, newPresetName, newPresetCategory, presets, savePresets])

  // Export presets
  const exportPresets = useCallback(() => {
    const data = JSON.stringify(presets, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "style-presets.json"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Presets exported")
  }, [presets])

  // Import presets
  const importPresets = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string)
          if (Array.isArray(imported)) {
            savePresets([...imported, ...presets])
            toast.success(`Imported ${imported.length} presets`)
          }
        } catch {
          toast.error("Invalid preset file")
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [presets, savePresets])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Paintbrush className="h-4 w-4 text-chart-4" />
          <span>Style Presets</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Search & Actions */}
        <div className="flex gap-2">
          <Input
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs"
          />
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Style Preset</DialogTitle>
                <DialogDescription>
                  Save the current element's styles as a reusable preset.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Preset Name</Label>
                  <Input
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="My Custom Preset"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md text-sm"
                    value={newPresetCategory}
                    onChange={(e) => setNewPresetCategory(e.target.value as Category)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <Button className="w-full" onClick={createFromElement}>
                  Create Preset
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1">
          {(["All", "Favorites", ...CATEGORIES] as const).map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setSelectedCategory(category)}
            >
              {category === "Favorites" && <Star className="h-3 w-3 mr-1" />}
              {category}
            </Button>
          ))}
        </div>

        {/* Presets List */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group"
              >
                <button
                  className="text-muted-foreground hover:text-yellow-500"
                  onClick={() => toggleFavorite(preset.id)}
                >
                  {preset.isFavorite ? (
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                  ) : (
                    <StarOff className="h-3.5 w-3.5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{preset.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {Object.keys(preset.styles).length} properties
                  </div>
                </div>

                <Badge variant="outline" className="text-[9px] px-1 h-4">
                  {preset.category}
                </Badge>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onApply(preset.styles)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => deletePreset(preset.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {filteredPresets.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No presets found
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Import/Export */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={exportPresets}
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={importPresets}
          >
            <Upload className="h-3 w-3 mr-1" />
            Import
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

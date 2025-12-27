"use client"

import * as React from "react"
import { useState, useCallback, useMemo, useEffect } from "react"
import { Search, X, Star, StarOff, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "../lib/utils"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"

// Tool category definitions
export interface ToolDefinition {
  id: string
  name: string
  description: string
  category: ToolCategory
  keywords: string[]
}

export type ToolCategory =
  | "layout"
  | "visual"
  | "typography"
  | "animation"
  | "debug"
  | "accessibility"
  | "performance"
  | "developer"
  | "design"

// Category metadata
export const categoryMeta: Record<ToolCategory, { label: string; color: string }> = {
  layout: { label: "Layout", color: "bg-blue-500" },
  visual: { label: "Visual", color: "bg-purple-500" },
  typography: { label: "Typography", color: "bg-green-500" },
  animation: { label: "Animation", color: "bg-orange-500" },
  debug: { label: "Debug", color: "bg-red-500" },
  accessibility: { label: "Accessibility", color: "bg-yellow-500" },
  performance: { label: "Performance", color: "bg-cyan-500" },
  developer: { label: "Developer", color: "bg-gray-500" },
  design: { label: "Design", color: "bg-pink-500" },
}

// All tool definitions
export const toolDefinitions: ToolDefinition[] = [
  // Layout Tools
  { id: "layout-editor", name: "Layout Editor", description: "Flex and grid controls", category: "layout", keywords: ["flex", "grid", "display"] },
  { id: "spacing-visualizer", name: "Spacing Visualizer", description: "View margins and padding", category: "layout", keywords: ["margin", "padding", "box"] },
  { id: "position-helper", name: "Position Helper", description: "Positioning controls", category: "layout", keywords: ["position", "absolute", "fixed", "sticky"] },
  { id: "css-grid-inspector", name: "Grid Inspector", description: "CSS Grid visualization", category: "layout", keywords: ["grid", "columns", "rows"] },
  { id: "subgrid-inspector", name: "Subgrid Inspector", description: "CSS Subgrid tools", category: "layout", keywords: ["subgrid", "nested"] },
  { id: "columns-editor", name: "Columns Editor", description: "Multi-column layout", category: "layout", keywords: ["columns", "column-count"] },
  { id: "overflow-debugger", name: "Overflow Debugger", description: "Find overflow issues", category: "layout", keywords: ["overflow", "scroll", "clip"] },
  { id: "logical-properties", name: "Logical Properties", description: "RTL/LTR properties", category: "layout", keywords: ["logical", "inline", "block", "rtl"] },
  { id: "aspect-ratio", name: "Aspect Ratio", description: "Aspect ratio controls", category: "layout", keywords: ["aspect", "ratio", "16:9"] },
  { id: "object-fit", name: "Object Fit", description: "Object fit controls", category: "layout", keywords: ["object-fit", "cover", "contain"] },

  // Visual Tools
  { id: "box-shadow", name: "Box Shadow", description: "Shadow builder", category: "visual", keywords: ["shadow", "elevation", "depth"] },
  { id: "text-shadow", name: "Text Shadow", description: "Text shadow builder", category: "visual", keywords: ["text-shadow", "glow"] },
  { id: "gradient-builder", name: "Gradient Builder", description: "CSS gradients", category: "visual", keywords: ["gradient", "linear", "radial"] },
  { id: "filter-editor", name: "Filter Editor", description: "CSS filters", category: "visual", keywords: ["filter", "blur", "brightness", "contrast"] },
  { id: "backdrop-filter", name: "Backdrop Filter", description: "Backdrop effects", category: "visual", keywords: ["backdrop", "frosted", "glass"] },
  { id: "clip-path", name: "Clip Path", description: "Clip path shapes", category: "visual", keywords: ["clip-path", "polygon", "circle"] },
  { id: "css-shapes", name: "CSS Shapes", description: "Shape outside/clip", category: "visual", keywords: ["shape", "polygon", "ellipse"] },
  { id: "mask-editor", name: "Mask Editor", description: "CSS masks", category: "visual", keywords: ["mask", "gradient-mask"] },
  { id: "border-editor", name: "Border Editor", description: "Border controls", category: "visual", keywords: ["border", "radius", "width"] },
  { id: "outline-editor", name: "Outline Editor", description: "Outline controls", category: "visual", keywords: ["outline", "offset"] },
  { id: "blend-mode", name: "Blend Mode", description: "Blend mode controls", category: "visual", keywords: ["blend", "mix-blend-mode", "multiply"] },
  { id: "color-palette", name: "Color Palette", description: "Extract page colors", category: "visual", keywords: ["color", "palette", "extract"] },

  // Typography Tools
  { id: "font-inspector", name: "Font Inspector", description: "Font analysis", category: "typography", keywords: ["font", "family", "weight"] },
  { id: "font-features", name: "Font Features", description: "OpenType features", category: "typography", keywords: ["ligature", "small-caps", "opentype"] },
  { id: "typography-scale", name: "Typography Scale", description: "Type scale analysis", category: "typography", keywords: ["scale", "modular", "ratio"] },
  { id: "writing-mode", name: "Writing Mode", description: "Text direction", category: "typography", keywords: ["writing-mode", "vertical", "rtl"] },
  { id: "list-style", name: "List Style", description: "List markers", category: "typography", keywords: ["list", "marker", "bullet"] },

  // Animation Tools
  { id: "animation-builder", name: "Animation Builder", description: "CSS animations", category: "animation", keywords: ["animation", "keyframe"] },
  { id: "keyframe-editor", name: "Keyframe Editor", description: "Visual keyframes", category: "animation", keywords: ["keyframe", "timeline", "frame"] },
  { id: "transition-builder", name: "Transition Builder", description: "CSS transitions", category: "animation", keywords: ["transition", "ease", "duration"] },
  { id: "animation-timeline", name: "Animation Timeline", description: "Play/pause control", category: "animation", keywords: ["play", "pause", "timeline"] },
  { id: "scroll-animations", name: "Scroll Animations", description: "Scroll-driven animations", category: "animation", keywords: ["scroll", "view", "timeline"] },
  { id: "transform-builder", name: "Transform Builder", description: "2D transforms", category: "animation", keywords: ["transform", "rotate", "scale"] },
  { id: "transform-3d", name: "3D Transform", description: "3D transforms", category: "animation", keywords: ["3d", "perspective", "rotateX"] },

  // Debug Tools
  { id: "layout-debugger", name: "Layout Debugger", description: "Outline all elements", category: "debug", keywords: ["debug", "outline", "borders"] },
  { id: "z-index-map", name: "Z-Index Map", description: "Stacking order", category: "debug", keywords: ["z-index", "stacking", "layer"] },
  { id: "stacking-context", name: "Stacking Context", description: "Context tree", category: "debug", keywords: ["stacking", "context", "z-index"] },
  { id: "specificity-analyzer", name: "Specificity Analyzer", description: "CSS specificity", category: "debug", keywords: ["specificity", "selector", "cascade"] },
  { id: "specificity-viewer", name: "Specificity Viewer", description: "Rule specificity", category: "debug", keywords: ["specificity", "rules", "weight"] },
  { id: "media-query", name: "Media Queries", description: "Breakpoint debug", category: "debug", keywords: ["media", "breakpoint", "responsive"] },
  { id: "mutation-observer", name: "Mutation Observer", description: "DOM changes", category: "debug", keywords: ["mutation", "dom", "changes"] },
  { id: "event-listeners", name: "Event Listeners", description: "Attached events", category: "debug", keywords: ["event", "listener", "handler"] },
  { id: "dom-tree", name: "DOM Tree", description: "Tree visualizer", category: "debug", keywords: ["dom", "tree", "structure"] },
  { id: "console-panel", name: "Console Panel", description: "Log messages", category: "debug", keywords: ["console", "log", "error"] },

  // Accessibility Tools
  { id: "accessibility-checker", name: "Accessibility Checker", description: "A11y issues", category: "accessibility", keywords: ["a11y", "accessibility", "aria"] },
  { id: "color-contrast", name: "Color Contrast", description: "WCAG contrast", category: "accessibility", keywords: ["contrast", "wcag", "aa", "aaa"] },
  { id: "focus-order", name: "Focus Order", description: "Tab order check", category: "accessibility", keywords: ["focus", "tab", "keyboard"] },
  { id: "element-states", name: "Element States", description: "Hover/focus states", category: "accessibility", keywords: ["hover", "focus", "active"] },

  // Performance Tools
  { id: "performance-hints", name: "Performance Hints", description: "Optimization tips", category: "performance", keywords: ["performance", "optimize", "speed"] },
  { id: "content-visibility", name: "Content Visibility", description: "Render optimization", category: "performance", keywords: ["content-visibility", "contain", "lazy"] },

  // Developer Tools
  { id: "code-export", name: "Code Export", description: "Export CSS/HTML", category: "developer", keywords: ["export", "css", "html", "code"] },
  { id: "tailwind-generator", name: "Tailwind Generator", description: "Generate classes", category: "developer", keywords: ["tailwind", "utility", "classes"] },
  { id: "css-variables", name: "CSS Variables", description: "Custom properties", category: "developer", keywords: ["variables", "custom", "properties"] },
  { id: "units-converter", name: "Units Converter", description: "Convert units", category: "developer", keywords: ["units", "px", "rem", "convert"] },
  { id: "storage-inspector", name: "Storage Inspector", description: "localStorage", category: "developer", keywords: ["storage", "local", "session"] },
  { id: "form-inspector", name: "Form Inspector", description: "Form state", category: "developer", keywords: ["form", "input", "validation"] },
  { id: "pseudo-inspector", name: "Pseudo Elements", description: "::before/::after", category: "developer", keywords: ["pseudo", "before", "after"] },
  { id: "container-queries", name: "Container Queries", description: "Container size queries", category: "developer", keywords: ["container", "query", "@container"] },
  { id: "print-styles", name: "Print Styles", description: "Print preview", category: "developer", keywords: ["print", "media", "paper"] },

  // Design Tools
  { id: "style-presets", name: "Style Presets", description: "Quick styles", category: "design", keywords: ["preset", "quick", "template"] },
  { id: "style-bookmarks", name: "Style Bookmarks", description: "Save styles", category: "design", keywords: ["bookmark", "save", "restore"] },
  { id: "style-diff", name: "Style Diff", description: "Compare styles", category: "design", keywords: ["diff", "compare", "changes"] },
  { id: "style-search", name: "Style Search", description: "Find by style", category: "design", keywords: ["search", "find", "query"] },
  { id: "element-comparison", name: "Element Comparison", description: "Compare elements", category: "design", keywords: ["compare", "diff", "elements"] },
  { id: "element-pinning", name: "Element Pinning", description: "Pin elements", category: "design", keywords: ["pin", "bookmark", "quick"] },
  { id: "design-tokens", name: "Design Tokens", description: "Token validation", category: "design", keywords: ["tokens", "design-system", "validate"] },
  { id: "spacing-checker", name: "Spacing Checker", description: "Spacing consistency", category: "design", keywords: ["spacing", "grid", "consistent"] },
  { id: "alignment-guides", name: "Alignment Guides", description: "Visual guides", category: "design", keywords: ["align", "guide", "ruler"] },
  { id: "grid-overlay", name: "Grid Overlay", description: "Column overlay", category: "design", keywords: ["grid", "columns", "overlay"] },
  { id: "dark-mode", name: "Dark Mode", description: "Theme preview", category: "design", keywords: ["dark", "theme", "mode"] },
  { id: "screenshot", name: "Screenshot", description: "Capture element", category: "design", keywords: ["screenshot", "capture", "image"] },
  { id: "responsive-preview", name: "Responsive Preview", description: "Device sizes", category: "design", keywords: ["responsive", "mobile", "tablet"] },
  { id: "breakpoint-indicator", name: "Breakpoint Indicator", description: "Current breakpoint", category: "design", keywords: ["breakpoint", "size", "responsive"] },
  { id: "cursor-editor", name: "Cursor Editor", description: "Cursor styles", category: "design", keywords: ["cursor", "pointer", "custom"] },
  { id: "scroll-snap", name: "Scroll Snap", description: "Snap points", category: "design", keywords: ["scroll", "snap", "carousel"] },
  { id: "pointer-events", name: "Pointer Events", description: "Click behavior", category: "design", keywords: ["pointer", "events", "touch"] },
]

const FAVORITES_KEY = "devtools-favorite-tools"

interface ToolSearchProps {
  onToolSelect?: (toolId: string) => void
  collapsedTools?: Set<string>
  onToggleTool?: (toolId: string) => void
}

export function ToolSearch({ onToolSelect, collapsedTools = new Set(), onToggleTool }: ToolSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | "all" | "favorites">("all")
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<ToolCategory>>(new Set())

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_KEY)
    if (saved) {
      try {
        setFavorites(new Set(JSON.parse(saved)))
      } catch (e) {
        console.error("Failed to load favorites", e)
      }
    }
  }, [])

  // Save favorites
  const saveFavorites = useCallback((newFavorites: Set<string>) => {
    setFavorites(newFavorites)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...newFavorites]))
  }, [])

  // Toggle favorite
  const toggleFavorite = useCallback((toolId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(toolId)) {
      newFavorites.delete(toolId)
    } else {
      newFavorites.add(toolId)
    }
    saveFavorites(newFavorites)
  }, [favorites, saveFavorites])

  // Toggle category
  const toggleCategory = useCallback((category: ToolCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  // Filter tools
  const filteredTools = useMemo(() => {
    return toolDefinitions.filter(tool => {
      // Search filter
      const matchesSearch = !searchTerm ||
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))

      // Category filter
      const matchesCategory =
        selectedCategory === "all" ||
        (selectedCategory === "favorites" && favorites.has(tool.id)) ||
        tool.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory, favorites])

  // Group by category
  const groupedTools = useMemo(() => {
    const groups: Record<ToolCategory, ToolDefinition[]> = {
      layout: [],
      visual: [],
      typography: [],
      animation: [],
      debug: [],
      accessibility: [],
      performance: [],
      developer: [],
      design: [],
    }

    filteredTools.forEach(tool => {
      groups[tool.category].push(tool)
    })

    return groups
  }, [filteredTools])

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-7 text-xs pl-7 pr-7"
          placeholder="Search tools..."
        />
        {searchTerm && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setSearchTerm("")}
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1">
        <Badge
          variant={selectedCategory === "all" ? "default" : "outline"}
          className="text-[9px] h-5 px-2 cursor-pointer"
          onClick={() => setSelectedCategory("all")}
        >
          All
        </Badge>
        <Badge
          variant={selectedCategory === "favorites" ? "default" : "outline"}
          className="text-[9px] h-5 px-2 cursor-pointer"
          onClick={() => setSelectedCategory("favorites")}
        >
          <Star className="h-2 w-2 mr-1" />
          Favorites
        </Badge>
        {(Object.keys(categoryMeta) as ToolCategory[]).slice(0, 5).map(cat => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            className="text-[9px] h-5 px-2 cursor-pointer"
            onClick={() => setSelectedCategory(cat)}
          >
            {categoryMeta[cat].label}
          </Badge>
        ))}
      </div>

      {/* Results count */}
      <div className="text-[10px] text-muted-foreground">
        {filteredTools.length} tool{filteredTools.length !== 1 ? "s" : ""} found
      </div>

      {/* Tools list */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-1">
          {selectedCategory === "all" || selectedCategory === "favorites" ? (
            // Show grouped by category
            (Object.entries(groupedTools) as [ToolCategory, ToolDefinition[]][])
              .filter(([_, tools]) => tools.length > 0)
              .map(([category, tools]) => (
                <Collapsible
                  key={category}
                  open={expandedCategories.has(category)}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-1 hover:bg-muted/50 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", categoryMeta[category].color)} />
                      <span>{categoryMeta[category].label}</span>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">
                        {tools.length}
                      </Badge>
                    </div>
                    <ChevronRight className={cn(
                      "h-3 w-3 transition-transform",
                      expandedCategories.has(category) && "rotate-90"
                    )} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-4 space-y-0.5">
                      {tools.map(tool => (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between p-1 hover:bg-muted/50 rounded cursor-pointer group"
                          onClick={() => onToolSelect?.(tool.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium truncate">{tool.name}</div>
                            <div className="text-[9px] text-muted-foreground truncate">{tool.description}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(tool.id)
                            }}
                          >
                            {favorites.has(tool.id) ? (
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <StarOff className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
          ) : (
            // Show flat list for specific category
            filteredTools.map(tool => (
              <div
                key={tool.id}
                className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer group"
                onClick={() => onToolSelect?.(tool.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{tool.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{tool.description}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(tool.id)
                  }}
                >
                  {favorites.has(tool.id) ? (
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  ) : (
                    <StarOff className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

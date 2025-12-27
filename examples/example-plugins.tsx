"use client"

/**
 * Example Plugins for Lumos Inspector
 *
 * This file demonstrates how to create custom plugins for the Lumos Inspector.
 * Each plugin can add one or more tools to the inspector panel.
 */

import * as React from "react"
import {
  createPlugin,
  createToolConfig,
  getPluginRegistry,
  type ToolProps,
  type InspectorPlugin,
} from "../index"
import { Sparkles, Wand2, Palette, Grid, Zap } from "lucide-react"

// ============================================================================
// EXAMPLE 1: Simple Tool Plugin
// A basic plugin that adds a single tool
// ============================================================================

function QuickStylesTool({ element, onStyleChange }: ToolProps) {
  if (!element) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Select an element to apply quick styles</p>
      </div>
    )
  }

  const quickStyles: Array<{ label: string; style: Record<string, string> }> = [
    { label: "Shadow", style: { "box-shadow": "0 4px 6px -1px rgb(0 0 0 / 0.1)" } },
    { label: "Rounded", style: { "border-radius": "0.5rem" } },
    { label: "Padding", style: { padding: "1rem" } },
    { label: "Border", style: { border: "1px solid currentColor" } },
  ]

  const applyStyle = (styles: Record<string, string>) => {
    if (onStyleChange) {
      Object.entries(styles).forEach(([prop, value]) => {
        onStyleChange(prop, value)
      })
    }
  }

  return (
    <div className="p-4 space-y-2">
      <h3 className="font-medium text-sm mb-3">Quick Styles</h3>
      <div className="grid grid-cols-2 gap-2">
        {quickStyles.map((item) => (
          <button
            key={item.label}
            onClick={() => applyStyle(item.style)}
            className="px-3 py-2 text-sm border rounded hover:bg-muted transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export const quickStylesPlugin: InspectorPlugin = createPlugin(
  "quick-styles",
  "Quick Styles",
  [
    {
      config: createToolConfig(
        "quick-styles",
        "Quick Styles",
        "Apply common styles with one click",
        Wand2,
        "effects",
        { keywords: ["quick", "fast", "preset", "one-click"], priority: 5 }
      ),
      component: QuickStylesTool,
    },
  ],
  {
    version: "1.0.0",
    author: "Lumos Inspector",
    description: "Quickly apply common CSS styles",
  }
)

// ============================================================================
// EXAMPLE 2: Multi-Tool Plugin
// A plugin that adds multiple related tools
// ============================================================================

function ColorHarmonyTool({ element }: ToolProps) {
  const [baseColor, setBaseColor] = React.useState("#3b82f6")

  const generateHarmony = (hex: string, type: "complementary" | "triadic" | "analogous") => {
    // Simple color harmony generation
    const hsl = hexToHsl(hex)

    switch (type) {
      case "complementary":
        return [hex, hslToHex({ ...hsl, h: (hsl.h + 180) % 360 })]
      case "triadic":
        return [
          hex,
          hslToHex({ ...hsl, h: (hsl.h + 120) % 360 }),
          hslToHex({ ...hsl, h: (hsl.h + 240) % 360 }),
        ]
      case "analogous":
        return [
          hslToHex({ ...hsl, h: (hsl.h - 30 + 360) % 360 }),
          hex,
          hslToHex({ ...hsl, h: (hsl.h + 30) % 360 }),
        ]
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-sm font-medium">Base Color</label>
        <input
          type="color"
          value={baseColor}
          onChange={(e) => setBaseColor(e.target.value)}
          className="w-full h-10 rounded cursor-pointer"
        />
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Complementary</h4>
        <div className="flex gap-1">
          {generateHarmony(baseColor, "complementary").map((color, i) => (
            <div
              key={i}
              className="flex-1 h-8 rounded"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Triadic</h4>
        <div className="flex gap-1">
          {generateHarmony(baseColor, "triadic").map((color, i) => (
            <div
              key={i}
              className="flex-1 h-8 rounded"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Analogous</h4>
        <div className="flex gap-1">
          {generateHarmony(baseColor, "analogous").map((color, i) => (
            <div
              key={i}
              className="flex-1 h-8 rounded"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function GridGeneratorTool({ element, onStyleChange }: ToolProps) {
  const [columns, setColumns] = React.useState(3)
  const [gap, setGap] = React.useState(16)

  const applyGrid = () => {
    if (onStyleChange) {
      onStyleChange("display", "grid")
      onStyleChange("grid-template-columns", `repeat(${columns}, 1fr)`)
      onStyleChange("gap", `${gap}px`)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-sm font-medium">Columns</label>
        <input
          type="range"
          min="1"
          max="12"
          value={columns}
          onChange={(e) => setColumns(parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{columns} columns</span>
      </div>

      <div>
        <label className="text-sm font-medium">Gap</label>
        <input
          type="range"
          min="0"
          max="48"
          value={gap}
          onChange={(e) => setGap(parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-muted-foreground">{gap}px</span>
      </div>

      <button
        onClick={applyGrid}
        disabled={!element}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
      >
        Apply Grid
      </button>

      <div
        className="grid border rounded p-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap / 4}px`,
        }}
      >
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <div key={i} className="h-6 bg-muted rounded" />
        ))}
      </div>
    </div>
  )
}

export const designHelperPlugin: InspectorPlugin = createPlugin(
  "design-helpers",
  "Design Helpers",
  [
    {
      config: createToolConfig(
        "color-harmony",
        "Color Harmony",
        "Generate harmonious color palettes",
        Palette,
        "color",
        { keywords: ["color", "palette", "harmony", "complementary", "triadic"] }
      ),
      component: ColorHarmonyTool,
    },
    {
      config: createToolConfig(
        "grid-generator",
        "Grid Generator",
        "Create CSS grid layouts visually",
        Grid,
        "layout",
        { keywords: ["grid", "layout", "columns", "generator"] }
      ),
      component: GridGeneratorTool,
    },
  ],
  {
    version: "1.0.0",
    author: "Lumos Inspector",
    description: "Design helper tools for colors and layouts",
  }
)

// ============================================================================
// EXAMPLE 3: Async Plugin with Initialization
// A plugin that performs async initialization
// ============================================================================

function AIStyleSuggestionsTool({ element }: ToolProps) {
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)

  const generateSuggestions = () => {
    setLoading(true)
    // Simulated AI suggestions (in real plugin, this could call an API)
    setTimeout(() => {
      setSuggestions([
        "Add subtle shadow for depth",
        "Increase padding for better readability",
        "Use consistent border-radius",
        "Consider higher contrast for accessibility",
      ])
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="p-4 space-y-4">
      <button
        onClick={generateSuggestions}
        disabled={loading}
        className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded flex items-center justify-center gap-2"
      >
        <Sparkles className="h-4 w-4" />
        {loading ? "Analyzing..." : "Get AI Suggestions"}
      </button>

      {suggestions.length > 0 && (
        <ul className="space-y-2">
          {suggestions.map((suggestion, i) => (
            <li
              key={i}
              className="p-2 text-sm bg-muted/50 rounded flex items-start gap-2"
            >
              <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export const aiStylePlugin: InspectorPlugin = createPlugin(
  "ai-styles",
  "AI Style Suggestions",
  [
    {
      config: createToolConfig(
        "ai-suggestions",
        "AI Suggestions",
        "Get AI-powered style recommendations",
        Sparkles,
        "other",
        { keywords: ["ai", "suggestions", "smart", "recommendations"], priority: 10 }
      ),
      component: AIStyleSuggestionsTool,
    },
  ],
  {
    version: "1.0.0",
    author: "Lumos Inspector",
    description: "AI-powered style suggestions",
    initialize: async () => {
      console.log("[AI Styles Plugin] Initializing...")
      // Could initialize AI model or API connection here
    },
    cleanup: () => {
      console.log("[AI Styles Plugin] Cleaning up...")
    },
  }
)

// ============================================================================
// Helper Functions
// ============================================================================

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { h: 0, s: 0, l: 0 }

  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToHex({ h, s, l }: { h: number; s: number; l: number }): string {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0, g = 0, b = 0

  if (0 <= h && h < 60) { r = c; g = x; b = 0 }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0 }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0")

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// ============================================================================
// Plugin Registration Helper
// ============================================================================

/**
 * Register all example plugins
 *
 * Usage in your app:
 *
 * ```tsx
 * import { registerExamplePlugins } from "lumos-inspector/examples/example-plugins"
 *
 * // Register on app initialization
 * registerExamplePlugins()
 * ```
 */
export async function registerExamplePlugins() {
  const registry = getPluginRegistry()

  await registry.registerPlugin(quickStylesPlugin)
  await registry.registerPlugin(designHelperPlugin)
  await registry.registerPlugin(aiStylePlugin)

  console.log("[Lumos Inspector] Example plugins registered")
}

/**
 * Unregister all example plugins
 */
export function unregisterExamplePlugins() {
  const registry = getPluginRegistry()

  registry.unregisterPlugin("quick-styles")
  registry.unregisterPlugin("design-helpers")
  registry.unregisterPlugin("ai-styles")

  console.log("[Lumos Inspector] Example plugins unregistered")
}

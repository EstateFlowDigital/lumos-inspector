"use client"

import * as React from "react"
import { useState, useCallback, useMemo, useEffect } from "react"
import {
  ChevronDown, Type, Copy, RotateCcw
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface FontFeature {
  tag: string
  name: string
  description: string
  enabled: boolean
}

// OpenType feature tags
const openTypeFeatures: Omit<FontFeature, "enabled">[] = [
  { tag: "liga", name: "Standard Ligatures", description: "fi, fl, ff ligatures" },
  { tag: "dlig", name: "Discretionary Ligatures", description: "Optional stylistic ligatures" },
  { tag: "clig", name: "Contextual Ligatures", description: "Context-dependent ligatures" },
  { tag: "calt", name: "Contextual Alternates", description: "Context-dependent alternates" },
  { tag: "kern", name: "Kerning", description: "Adjust spacing between letters" },
  { tag: "smcp", name: "Small Caps", description: "Lowercase to small capitals" },
  { tag: "c2sc", name: "Caps to Small Caps", description: "Uppercase to small capitals" },
  { tag: "onum", name: "Oldstyle Figures", description: "Varying height numbers" },
  { tag: "lnum", name: "Lining Figures", description: "Uniform height numbers" },
  { tag: "tnum", name: "Tabular Figures", description: "Fixed-width numbers" },
  { tag: "pnum", name: "Proportional Figures", description: "Variable-width numbers" },
  { tag: "frac", name: "Fractions", description: "Diagonal fractions" },
  { tag: "afrc", name: "Alt Fractions", description: "Stacked fractions" },
  { tag: "ordn", name: "Ordinals", description: "1st, 2nd, 3rd superscripts" },
  { tag: "sups", name: "Superscript", description: "Superscript characters" },
  { tag: "subs", name: "Subscript", description: "Subscript characters" },
  { tag: "zero", name: "Slashed Zero", description: "Zero with slash" },
  { tag: "ss01", name: "Stylistic Set 1", description: "Alternative character set" },
  { tag: "ss02", name: "Stylistic Set 2", description: "Alternative character set" },
  { tag: "ss03", name: "Stylistic Set 3", description: "Alternative character set" },
  { tag: "swsh", name: "Swashes", description: "Decorative flourishes" },
  { tag: "salt", name: "Stylistic Alternates", description: "Alternative character forms" },
  { tag: "titl", name: "Titling", description: "Titling alternates" },
  { tag: "case", name: "Case-Sensitive", description: "Punctuation for capitals" },
]

export function FontFeatureSettings() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [features, setFeatures] = useState<FontFeature[]>(
    openTypeFeatures.map(f => ({ ...f, enabled: false }))
  )

  // Load current font-feature-settings
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)
    const settings = computed.fontFeatureSettings

    if (settings && settings !== "normal") {
      // Parse current settings
      const enabledTags = new Set<string>()
      const matches = settings.matchAll(/"([a-z0-9]+)"\s*(?:on|1)?/gi)
      for (const match of matches) {
        enabledTags.add(match[1])
      }

      setFeatures(prev =>
        prev.map(f => ({ ...f, enabled: enabledTags.has(f.tag) }))
      )
    }
  }, [selectedElement])

  // Build CSS value
  const cssValue = useMemo(() => {
    const enabled = features.filter(f => f.enabled)
    if (enabled.length === 0) return "normal"
    return enabled.map(f => `"${f.tag}" on`).join(", ")
  }, [features])

  // Toggle feature
  const toggleFeature = useCallback((tag: string) => {
    setFeatures(prev =>
      prev.map(f => f.tag === tag ? { ...f, enabled: !f.enabled } : f)
    )
  }, [])

  // Apply to element
  const apply = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    selectedElement.element.style.fontFeatureSettings = cssValue
    notifyStyleChange()
    toast.success("Font features applied!")
  }, [selectedElement, cssValue, notifyStyleChange])

  // Reset
  const reset = useCallback(() => {
    if (!selectedElement?.element) return

    selectedElement.element.style.fontFeatureSettings = ""
    setFeatures(prev => prev.map(f => ({ ...f, enabled: false })))
    notifyStyleChange()
    toast.success("Font features reset")
  }, [selectedElement, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(`font-feature-settings: ${cssValue};`)
    toast.success("CSS copied to clipboard")
  }, [cssValue])

  // Enable preset
  const applyPreset = useCallback((preset: string) => {
    let tags: string[] = []

    switch (preset) {
      case "ligatures":
        tags = ["liga", "dlig", "calt"]
        break
      case "numbers":
        tags = ["onum", "tnum", "frac"]
        break
      case "small-caps":
        tags = ["smcp", "c2sc"]
        break
      case "all":
        tags = ["liga", "kern", "onum", "frac", "ordn"]
        break
    }

    setFeatures(prev =>
      prev.map(f => ({ ...f, enabled: tags.includes(f.tag) }))
    )
  }, [])

  // Count enabled
  const enabledCount = features.filter(f => f.enabled).length

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-emerald-500" />
          <span>Font Features</span>
          {enabledCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4">
              {enabledCount}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Presets */}
        <div className="flex flex-wrap gap-1">
          <Badge
            variant="outline"
            className="text-[9px] h-5 px-2 cursor-pointer hover:bg-muted"
            onClick={() => applyPreset("ligatures")}
          >
            Ligatures
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] h-5 px-2 cursor-pointer hover:bg-muted"
            onClick={() => applyPreset("numbers")}
          >
            Numbers
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] h-5 px-2 cursor-pointer hover:bg-muted"
            onClick={() => applyPreset("small-caps")}
          >
            Small Caps
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] h-5 px-2 cursor-pointer hover:bg-muted"
            onClick={() => applyPreset("all")}
          >
            Common
          </Badge>
        </div>

        {/* Features list */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {features.map((feature) => (
              <div
                key={feature.tag}
                className={cn(
                  "flex items-center justify-between p-2 rounded",
                  feature.enabled ? "bg-emerald-500/10" : "bg-muted/30"
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] bg-muted px-1 rounded">
                      {feature.tag}
                    </code>
                    <span className="text-xs">{feature.name}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
                <Switch
                  checked={feature.enabled}
                  onCheckedChange={() => toggleFeature(feature.tag)}
                />
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Preview */}
        <div className="p-2 bg-muted/50 rounded">
          <code className="text-[10px] break-all">{cssValue}</code>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-7"
            onClick={apply}
            disabled={!selectedElement}
          >
            Apply
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={reset}
            disabled={!selectedElement}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-7"
          onClick={copyCSS}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy CSS
        </Button>
      </CollapsibleContent>
    </Collapsible>
  )
}

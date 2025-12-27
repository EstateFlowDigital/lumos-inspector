"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import {
  ChevronDown, List, Copy, RotateCcw
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

// List style type options
const listStyleTypes = [
  { value: "none", label: "None" },
  { value: "disc", label: "Disc •" },
  { value: "circle", label: "Circle ○" },
  { value: "square", label: "Square ▪" },
  { value: "decimal", label: "Decimal 1." },
  { value: "decimal-leading-zero", label: "Decimal 01." },
  { value: "lower-alpha", label: "Lower Alpha a." },
  { value: "upper-alpha", label: "Upper Alpha A." },
  { value: "lower-roman", label: "Lower Roman i." },
  { value: "upper-roman", label: "Upper Roman I." },
  { value: "lower-greek", label: "Greek α." },
  { value: "armenian", label: "Armenian" },
  { value: "georgian", label: "Georgian" },
  { value: "cjk-ideographic", label: "CJK 一." },
  { value: "hiragana", label: "Hiragana あ." },
  { value: "katakana", label: "Katakana ア." },
]

// List style position options
const listStylePositions = [
  { value: "outside", label: "Outside", description: "Marker outside content box" },
  { value: "inside", label: "Inside", description: "Marker inside content box" },
]

// Emoji markers
const emojiMarkers = [
  { emoji: "✓", name: "Check" },
  { emoji: "→", name: "Arrow" },
  { emoji: "★", name: "Star" },
  { emoji: "◆", name: "Diamond" },
  { emoji: "❯", name: "Chevron" },
  { emoji: "⚡", name: "Lightning" },
  { emoji: "🔹", name: "Blue Diamond" },
  { emoji: "📌", name: "Pin" },
]

export function ListStyleEditor() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [listStyleType, setListStyleType] = useState("disc")
  const [listStylePosition, setListStylePosition] = useState("outside")
  const [listStyleImage, setListStyleImage] = useState("")
  const [customMarker, setCustomMarker] = useState("")

  // Load current values
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)
    setListStyleType(computed.listStyleType || "disc")
    setListStylePosition(computed.listStylePosition || "outside")
    setListStyleImage(computed.listStyleImage !== "none" ? computed.listStyleImage : "")
  }, [selectedElement])

  // Build CSS
  const cssValue = useMemo(() => {
    let type = listStyleType
    if (customMarker) {
      type = `"${customMarker}"`
    }

    const parts = []
    if (listStyleImage && !customMarker) {
      parts.push(`url(${listStyleImage})`)
    }
    parts.push(type)
    parts.push(listStylePosition)

    return parts.join(" ")
  }, [listStyleType, listStylePosition, listStyleImage, customMarker])

  // Apply to element
  const apply = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element

    if (customMarker) {
      el.style.listStyleType = `"${customMarker}"`
    } else {
      el.style.listStyleType = listStyleType
    }

    el.style.listStylePosition = listStylePosition

    if (listStyleImage && !customMarker) {
      el.style.listStyleImage = `url(${listStyleImage})`
    } else {
      el.style.listStyleImage = ""
    }

    toast.success("List style applied!")
  }, [selectedElement, listStyleType, listStylePosition, listStyleImage, customMarker])

  // Reset
  const reset = useCallback(() => {
    if (!selectedElement?.element) return

    const el = selectedElement.element
    el.style.listStyleType = ""
    el.style.listStylePosition = ""
    el.style.listStyleImage = ""

    setListStyleType("disc")
    setListStylePosition("outside")
    setListStyleImage("")
    setCustomMarker("")

    toast.success("List style reset")
  }, [selectedElement])

  // Copy CSS
  const copyCSS = useCallback(() => {
    let css = `list-style: ${cssValue};`
    navigator.clipboard.writeText(css)
    toast.success("CSS copied to clipboard")
  }, [cssValue])

  // Apply emoji marker
  const applyEmoji = useCallback((emoji: string) => {
    setCustomMarker(emoji + " ")
    setListStyleType("none")
  }, [])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-amber-500" />
          <span>List Style</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* List Style Type */}
        <div className="space-y-1">
          <Label className="text-[10px]">List Style Type</Label>
          <Select value={listStyleType} onValueChange={(v) => {
            setListStyleType(v)
            setCustomMarker("")
          }}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {listStyleTypes.map(lst => (
                <SelectItem key={lst.value} value={lst.value} className="text-xs">
                  {lst.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Emoji markers */}
        <div className="space-y-1">
          <Label className="text-[10px]">Quick Emoji Markers</Label>
          <div className="flex flex-wrap gap-1">
            {emojiMarkers.map(em => (
              <Badge
                key={em.emoji}
                variant={customMarker.includes(em.emoji) ? "default" : "outline"}
                className="text-sm h-6 px-2 cursor-pointer hover:bg-muted"
                onClick={() => applyEmoji(em.emoji)}
                title={em.name}
              >
                {em.emoji}
              </Badge>
            ))}
          </div>
        </div>

        {/* Custom marker */}
        <div className="space-y-1">
          <Label className="text-[10px]">Custom Marker Text</Label>
          <Input
            value={customMarker}
            onChange={(e) => setCustomMarker(e.target.value)}
            className="h-7 text-xs"
            placeholder="e.g. >> or 🔥"
          />
        </div>

        {/* Position */}
        <div className="space-y-1">
          <Label className="text-[10px]">Position</Label>
          <Select value={listStylePosition} onValueChange={setListStylePosition}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {listStylePositions.map(lsp => (
                <SelectItem key={lsp.value} value={lsp.value} className="text-xs">
                  {lsp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Image URL */}
        <div className="space-y-1">
          <Label className="text-[10px]">Image URL</Label>
          <Input
            value={listStyleImage}
            onChange={(e) => setListStyleImage(e.target.value)}
            className="h-7 text-xs font-mono"
            placeholder="https://example.com/bullet.svg"
          />
        </div>

        {/* Preview */}
        <div className="p-2 bg-muted/30 rounded">
          <ul
            className="pl-6 text-xs space-y-1"
            style={{
              listStyleType: customMarker ? `"${customMarker}"` : listStyleType,
              listStylePosition: listStylePosition as React.CSSProperties["listStylePosition"],
              listStyleImage: listStyleImage ? `url(${listStyleImage})` : "none",
            }}
          >
            <li>First item</li>
            <li>Second item</li>
            <li>Third item</li>
          </ul>
        </div>

        {/* CSS preview */}
        <div className="p-2 bg-muted/50 rounded">
          <code className="text-[10px] break-all">list-style: {cssValue};</code>
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

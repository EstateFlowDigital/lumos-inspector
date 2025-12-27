"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, MousePointer2, RotateCcw, Copy
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

// Standard cursors
const standardCursors = [
  { value: "auto", label: "Auto", description: "Browser default" },
  { value: "default", label: "Default", description: "Arrow pointer" },
  { value: "pointer", label: "Pointer", description: "Hand pointer" },
  { value: "text", label: "Text", description: "I-beam for text" },
  { value: "crosshair", label: "Crosshair", description: "Crosshair" },
  { value: "move", label: "Move", description: "Move cursor" },
  { value: "grab", label: "Grab", description: "Open hand" },
  { value: "grabbing", label: "Grabbing", description: "Closed hand" },
  { value: "not-allowed", label: "Not Allowed", description: "Disabled" },
  { value: "wait", label: "Wait", description: "Loading" },
  { value: "progress", label: "Progress", description: "Background loading" },
  { value: "help", label: "Help", description: "Help available" },
  { value: "context-menu", label: "Context Menu", description: "Menu available" },
  { value: "cell", label: "Cell", description: "Table cell" },
  { value: "copy", label: "Copy", description: "Copy action" },
  { value: "alias", label: "Alias", description: "Alias/shortcut" },
  { value: "none", label: "None", description: "Hidden cursor" },
  { value: "zoom-in", label: "Zoom In", description: "Zoom in" },
  { value: "zoom-out", label: "Zoom Out", description: "Zoom out" },
]

// Resize cursors
const resizeCursors = [
  { value: "n-resize", label: "N", description: "Resize north" },
  { value: "e-resize", label: "E", description: "Resize east" },
  { value: "s-resize", label: "S", description: "Resize south" },
  { value: "w-resize", label: "W", description: "Resize west" },
  { value: "ne-resize", label: "NE", description: "Resize NE" },
  { value: "nw-resize", label: "NW", description: "Resize NW" },
  { value: "se-resize", label: "SE", description: "Resize SE" },
  { value: "sw-resize", label: "SW", description: "Resize SW" },
  { value: "ew-resize", label: "EW", description: "Resize E/W" },
  { value: "ns-resize", label: "NS", description: "Resize N/S" },
  { value: "nesw-resize", label: "NESW", description: "Resize NE/SW" },
  { value: "nwse-resize", label: "NWSE", description: "Resize NW/SE" },
  { value: "col-resize", label: "Col", description: "Resize column" },
  { value: "row-resize", label: "Row", description: "Resize row" },
]

export function CursorEditor() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [cursor, setCursor] = useState("auto")
  const [customUrl, setCustomUrl] = useState("")
  const [hotspotX, setHotspotX] = useState(0)
  const [hotspotY, setHotspotY] = useState(0)

  // Load from selected element
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)
    const cursorValue = computed.cursor || "auto"

    // Parse cursor value
    if (cursorValue.startsWith("url")) {
      const match = cursorValue.match(/url\(['"]?([^'"]+)['"]?\)/)
      if (match) {
        setCustomUrl(match[1])
        setCursor("custom")
      }
    } else {
      setCursor(cursorValue)
    }
  }, [selectedElement])

  // Build cursor CSS
  const cursorCSS = useMemo(() => {
    if (cursor === "custom" && customUrl) {
      return `cursor: url(${customUrl}) ${hotspotX} ${hotspotY}, auto;`
    }
    return `cursor: ${cursor};`
  }, [cursor, customUrl, hotspotX, hotspotY])

  // Apply to element
  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    if (cursor === "custom" && customUrl) {
      selectedElement.element.style.cursor = `url(${customUrl}) ${hotspotX} ${hotspotY}, auto`
    } else {
      selectedElement.element.style.cursor = cursor
    }

    notifyStyleChange()
    toast.success("Cursor applied")
  }, [selectedElement, cursor, customUrl, hotspotX, hotspotY, notifyStyleChange])

  // Reset
  const reset = useCallback(() => {
    setCursor("auto")
    setCustomUrl("")
    setHotspotX(0)
    setHotspotY(0)

    if (selectedElement?.element) {
      selectedElement.element.style.cursor = "auto"
      notifyStyleChange()
    }

    toast.success("Cursor reset")
  }, [selectedElement, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cursorCSS)
    toast.success("CSS copied to clipboard")
  }, [cursorCSS])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <MousePointer2 className="h-4 w-4 text-amber-500" />
          <span>Cursor Editor</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Preview area */}
        <div
          className="h-20 bg-muted/50 rounded-md flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed"
          style={{
            cursor: cursor === "custom" && customUrl
              ? `url(${customUrl}) ${hotspotX} ${hotspotY}, auto`
              : cursor,
          }}
        >
          Hover to preview cursor
        </div>

        <Tabs defaultValue="standard">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="standard" className="text-[10px]">Standard</TabsTrigger>
            <TabsTrigger value="resize" className="text-[10px]">Resize</TabsTrigger>
            <TabsTrigger value="custom" className="text-[10px]">Custom</TabsTrigger>
          </TabsList>

          {/* Standard cursors */}
          <TabsContent value="standard" className="mt-3">
            <div className="grid grid-cols-4 gap-1">
              {standardCursors.map((c) => (
                <Button
                  key={c.value}
                  variant={cursor === c.value ? "default" : "outline"}
                  size="sm"
                  className="h-10 text-[9px] flex flex-col items-center justify-center p-1"
                  onClick={() => setCursor(c.value)}
                  style={{ cursor: c.value }}
                  title={c.description}
                >
                  <span className="truncate w-full text-center">{c.label}</span>
                </Button>
              ))}
            </div>
          </TabsContent>

          {/* Resize cursors */}
          <TabsContent value="resize" className="mt-3">
            <div className="grid grid-cols-4 gap-1">
              {resizeCursors.map((c) => (
                <Button
                  key={c.value}
                  variant={cursor === c.value ? "default" : "outline"}
                  size="sm"
                  className="h-10 text-[9px] flex flex-col items-center justify-center p-1"
                  onClick={() => setCursor(c.value)}
                  style={{ cursor: c.value }}
                  title={c.description}
                >
                  <span className="truncate w-full text-center">{c.label}</span>
                </Button>
              ))}
            </div>
          </TabsContent>

          {/* Custom cursor */}
          <TabsContent value="custom" className="space-y-3 mt-3">
            <div className="space-y-1">
              <Label className="text-[10px]">Image URL</Label>
              <Input
                value={customUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value)
                  setCursor("custom")
                }}
                className="h-7 text-xs"
                placeholder="https://example.com/cursor.png"
              />
              <p className="text-[9px] text-muted-foreground">
                Use a 32x32px PNG or SVG. Larger images may not work.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Hotspot X</Label>
                <Input
                  type="number"
                  value={hotspotX}
                  onChange={(e) => setHotspotX(parseInt(e.target.value) || 0)}
                  className="h-7 text-xs"
                  min={0}
                  max={32}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Hotspot Y</Label>
                <Input
                  type="number"
                  value={hotspotY}
                  onChange={(e) => setHotspotY(parseInt(e.target.value) || 0)}
                  className="h-7 text-xs"
                  min={0}
                  max={32}
                />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Hotspot defines the click point position within the cursor image.
            </p>
          </TabsContent>
        </Tabs>

        {/* Current CSS */}
        <div className="p-2 bg-muted/50 rounded text-[10px] font-mono">
          {cursorCSS}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7" onClick={reset}>
            <RotateCcw className="h-3 w-3" />
          </Button>
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

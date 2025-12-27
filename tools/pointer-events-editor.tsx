"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  ChevronDown, MousePointer, Copy, RotateCcw
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

// Pointer events options
const pointerEventsOptions = [
  { value: "auto", label: "Auto", description: "Default pointer events behavior" },
  { value: "none", label: "None", description: "Element never receives pointer events" },
  { value: "visiblePainted", label: "Visible Painted (SVG)", description: "SVG: visible + painted fill/stroke" },
  { value: "visibleFill", label: "Visible Fill (SVG)", description: "SVG: visible + inside fill" },
  { value: "visibleStroke", label: "Visible Stroke (SVG)", description: "SVG: visible + on stroke" },
  { value: "visible", label: "Visible (SVG)", description: "SVG: visible, anywhere" },
  { value: "painted", label: "Painted (SVG)", description: "SVG: painted fill/stroke" },
  { value: "fill", label: "Fill (SVG)", description: "SVG: inside fill" },
  { value: "stroke", label: "Stroke (SVG)", description: "SVG: on stroke" },
  { value: "all", label: "All (SVG)", description: "SVG: anywhere" },
]

// Touch action options
const touchActionOptions = [
  { value: "auto", label: "Auto", description: "Browser handles all panning/zooming" },
  { value: "none", label: "None", description: "Disable all gestures" },
  { value: "pan-x", label: "Pan X", description: "Horizontal panning only" },
  { value: "pan-y", label: "Pan Y", description: "Vertical panning only" },
  { value: "pan-left", label: "Pan Left", description: "Left panning only" },
  { value: "pan-right", label: "Pan Right", description: "Right panning only" },
  { value: "pan-up", label: "Pan Up", description: "Up panning only" },
  { value: "pan-down", label: "Pan Down", description: "Down panning only" },
  { value: "pinch-zoom", label: "Pinch Zoom", description: "Pinch zooming only" },
  { value: "manipulation", label: "Manipulation", description: "Panning and pinch zoom" },
]

// User select options
const userSelectOptions = [
  { value: "auto", label: "Auto", description: "Default selection behavior" },
  { value: "none", label: "None", description: "Cannot select text" },
  { value: "text", label: "Text", description: "Text is selectable" },
  { value: "all", label: "All", description: "Click selects all" },
  { value: "contain", label: "Contain", description: "Selection contained within" },
]

export function PointerEventsEditor() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [pointerEvents, setPointerEvents] = useState("auto")
  const [touchAction, setTouchAction] = useState("auto")
  const [userSelect, setUserSelect] = useState("auto")

  // Load current values
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)
    setPointerEvents(computed.pointerEvents || "auto")
    setTouchAction(computed.touchAction || "auto")
    setUserSelect(computed.userSelect || "auto")
  }, [selectedElement])

  // Apply to element
  const apply = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element
    el.style.pointerEvents = pointerEvents
    el.style.touchAction = touchAction
    el.style.userSelect = userSelect

    toast.success("Pointer settings applied!")
  }, [selectedElement, pointerEvents, touchAction, userSelect])

  // Reset
  const reset = useCallback(() => {
    if (!selectedElement?.element) return

    const el = selectedElement.element
    el.style.pointerEvents = ""
    el.style.touchAction = ""
    el.style.userSelect = ""

    setPointerEvents("auto")
    setTouchAction("auto")
    setUserSelect("auto")

    toast.success("Pointer settings reset")
  }, [selectedElement])

  // Copy CSS
  const copyCSS = useCallback(() => {
    let css = ""
    if (pointerEvents !== "auto") css += `pointer-events: ${pointerEvents};\n`
    if (touchAction !== "auto") css += `touch-action: ${touchAction};\n`
    if (userSelect !== "auto") css += `user-select: ${userSelect};\n`

    if (!css) css = "/* Default values */"

    navigator.clipboard.writeText(css)
    toast.success("CSS copied to clipboard")
  }, [pointerEvents, touchAction, userSelect])

  // Quick presets
  const applyPreset = useCallback((preset: string) => {
    switch (preset) {
      case "clickthrough":
        setPointerEvents("none")
        break
      case "no-select":
        setUserSelect("none")
        break
      case "drag-friendly":
        setTouchAction("none")
        break
      case "scroll-only":
        setTouchAction("pan-y")
        break
    }
  }, [])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <MousePointer className="h-4 w-4 text-pink-500" />
          <span>Pointer Events</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Presets */}
        <div className="flex flex-wrap gap-1">
          <Badge
            variant="outline"
            className="text-[9px] h-5 px-2 cursor-pointer hover:bg-muted"
            onClick={() => applyPreset("clickthrough")}
          >
            Click-through
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] h-5 px-2 cursor-pointer hover:bg-muted"
            onClick={() => applyPreset("no-select")}
          >
            No Select
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] h-5 px-2 cursor-pointer hover:bg-muted"
            onClick={() => applyPreset("drag-friendly")}
          >
            Drag Friendly
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] h-5 px-2 cursor-pointer hover:bg-muted"
            onClick={() => applyPreset("scroll-only")}
          >
            Scroll Only
          </Badge>
        </div>

        {/* Pointer Events */}
        <div className="space-y-1">
          <Label className="text-[10px]">Pointer Events</Label>
          <Select value={pointerEvents} onValueChange={setPointerEvents}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pointerEventsOptions.slice(0, 3).map(pe => (
                <SelectItem key={pe.value} value={pe.value} className="text-xs">
                  {pe.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] text-muted-foreground">
            {pointerEventsOptions.find(pe => pe.value === pointerEvents)?.description}
          </p>
        </div>

        {/* Touch Action */}
        <div className="space-y-1">
          <Label className="text-[10px]">Touch Action</Label>
          <Select value={touchAction} onValueChange={setTouchAction}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {touchActionOptions.map(ta => (
                <SelectItem key={ta.value} value={ta.value} className="text-xs">
                  {ta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] text-muted-foreground">
            {touchActionOptions.find(ta => ta.value === touchAction)?.description}
          </p>
        </div>

        {/* User Select */}
        <div className="space-y-1">
          <Label className="text-[10px]">User Select</Label>
          <Select value={userSelect} onValueChange={setUserSelect}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {userSelectOptions.map(us => (
                <SelectItem key={us.value} value={us.value} className="text-xs">
                  {us.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] text-muted-foreground">
            {userSelectOptions.find(us => us.value === userSelect)?.description}
          </p>
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

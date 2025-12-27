"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, ScrollText, RotateCcw, Copy
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface ContainerValues {
  type: string
  strictness: string
  stop: string
}

interface ItemValues {
  align: string
  stop: string
}

const defaultContainer: ContainerValues = {
  type: "x",
  strictness: "mandatory",
  stop: "normal",
}

const defaultItem: ItemValues = {
  align: "start",
  stop: "normal",
}

export function ScrollSnapEditor() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [mode, setMode] = useState<"container" | "item">("container")
  const [container, setContainer] = useState<ContainerValues>(defaultContainer)
  const [item, setItem] = useState<ItemValues>(defaultItem)

  // Load from selected element
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)
    const snapType = computed.scrollSnapType || ""
    const snapAlign = computed.scrollSnapAlign || ""

    if (snapType && snapType !== "none") {
      setMode("container")
      const parts = snapType.split(" ")
      setContainer({
        type: parts[0] || "x",
        strictness: parts[1] || "mandatory",
        stop: computed.scrollSnapStop || "normal",
      })
    } else if (snapAlign && snapAlign !== "none") {
      setMode("item")
      setItem({
        align: snapAlign,
        stop: computed.scrollSnapStop || "normal",
      })
    }
  }, [selectedElement])

  // Build CSS
  const cssOutput = useMemo(() => {
    if (mode === "container") {
      const lines = [
        `scroll-snap-type: ${container.type} ${container.strictness};`,
        `overflow: auto;`,
      ]
      if (container.stop !== "normal") {
        lines.push(`scroll-snap-stop: ${container.stop};`)
      }
      return lines.join("\n")
    } else {
      const lines = [`scroll-snap-align: ${item.align};`]
      if (item.stop !== "normal") {
        lines.push(`scroll-snap-stop: ${item.stop};`)
      }
      return lines.join("\n")
    }
  }, [mode, container, item])

  // Apply to element
  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element

    if (mode === "container") {
      el.style.scrollSnapType = `${container.type} ${container.strictness}`
      el.style.overflow = "auto"
      el.style.scrollSnapStop = container.stop
    } else {
      el.style.scrollSnapAlign = item.align
      el.style.scrollSnapStop = item.stop
    }

    notifyStyleChange()
    toast.success("Scroll snap applied")
  }, [selectedElement, mode, container, item, notifyStyleChange])

  // Reset
  const reset = useCallback(() => {
    setContainer(defaultContainer)
    setItem(defaultItem)

    if (selectedElement?.element) {
      selectedElement.element.style.scrollSnapType = ""
      selectedElement.element.style.scrollSnapAlign = ""
      selectedElement.element.style.scrollSnapStop = ""
      notifyStyleChange()
    }

    toast.success("Scroll snap reset")
  }, [selectedElement, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(cssOutput)
    toast.success("CSS copied to clipboard")
  }, [cssOutput])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-teal-500" />
          <span>Scroll Snap</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Preview */}
        <div className="relative">
          <div
            className="h-24 flex gap-2 overflow-x-auto rounded-md bg-muted/50 p-2"
            style={{
              scrollSnapType: "x mandatory",
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-16 h-full bg-primary/20 rounded flex items-center justify-center text-xs font-medium"
                style={{ scrollSnapAlign: "start" }}
              >
                {i}
              </div>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1 text-center">
            Scroll to see snap effect
          </p>
        </div>

        {/* Mode tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as "container" | "item")}>
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="container" className="text-[10px]">Container</TabsTrigger>
            <TabsTrigger value="item" className="text-[10px]">Item</TabsTrigger>
          </TabsList>

          {/* Container settings */}
          <TabsContent value="container" className="space-y-3 mt-3">
            <p className="text-[10px] text-muted-foreground">
              Apply to the scrolling container element.
            </p>

            {/* Snap type */}
            <div className="space-y-1">
              <Label className="text-[10px]">Snap Type</Label>
              <Select
                value={container.type}
                onValueChange={(v) => setContainer(prev => ({ ...prev, type: v }))}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="x" className="text-xs">X (Horizontal)</SelectItem>
                  <SelectItem value="y" className="text-xs">Y (Vertical)</SelectItem>
                  <SelectItem value="both" className="text-xs">Both</SelectItem>
                  <SelectItem value="block" className="text-xs">Block</SelectItem>
                  <SelectItem value="inline" className="text-xs">Inline</SelectItem>
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Strictness */}
            <div className="space-y-1">
              <Label className="text-[10px]">Strictness</Label>
              <Select
                value={container.strictness}
                onValueChange={(v) => setContainer(prev => ({ ...prev, strictness: v }))}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mandatory" className="text-xs">Mandatory</SelectItem>
                  <SelectItem value="proximity" className="text-xs">Proximity</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[9px] text-muted-foreground">
                Mandatory: Always snaps. Proximity: Snaps when close.
              </p>
            </div>

            {/* Stop */}
            <div className="space-y-1">
              <Label className="text-[10px]">Scroll Stop</Label>
              <Select
                value={container.stop}
                onValueChange={(v) => setContainer(prev => ({ ...prev, stop: v }))}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                  <SelectItem value="always" className="text-xs">Always</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Item settings */}
          <TabsContent value="item" className="space-y-3 mt-3">
            <p className="text-[10px] text-muted-foreground">
              Apply to child elements inside the scroll container.
            </p>

            {/* Alignment */}
            <div className="space-y-1">
              <Label className="text-[10px]">Snap Align</Label>
              <Select
                value={item.align}
                onValueChange={(v) => setItem(prev => ({ ...prev, align: v }))}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start" className="text-xs">Start</SelectItem>
                  <SelectItem value="end" className="text-xs">End</SelectItem>
                  <SelectItem value="center" className="text-xs">Center</SelectItem>
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stop */}
            <div className="space-y-1">
              <Label className="text-[10px]">Scroll Stop</Label>
              <Select
                value={item.stop}
                onValueChange={(v) => setItem(prev => ({ ...prev, stop: v }))}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                  <SelectItem value="always" className="text-xs">Always</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[9px] text-muted-foreground">
                Always: Must stop at this item before continuing.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Current CSS */}
        <div className="p-2 bg-muted/50 rounded text-[10px] font-mono whitespace-pre-wrap">
          {cssOutput}
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

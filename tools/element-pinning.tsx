"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import {
  ChevronDown, Pin, PinOff, Target, Trash2, Eye
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface PinnedElement {
  id: string
  element: HTMLElement
  label: string
  selector: string
  pinnedAt: number
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function getElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ""
  const cls = el.classList.length > 0 ? `.${Array.from(el.classList)[0]}` : ""
  return `${tag}${id}${cls}`.substring(0, 25)
}

function getElementSelector(el: HTMLElement): string {
  const parts: string[] = []
  let current: HTMLElement | null = el

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()
    if (current.id) {
      selector = `#${current.id}`
      parts.unshift(selector)
      break
    }
    if (current.classList.length > 0) {
      selector += `.${Array.from(current.classList).join(".")}`
    }
    parts.unshift(selector)
    current = current.parentElement
  }

  return parts.join(" > ").substring(0, 100)
}

export function ElementPinning() {
  const { isOpen, selectedElement, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [pinnedElements, setPinnedElements] = useState<PinnedElement[]>([])
  const [showOverlay, setShowOverlay] = useState(true)
  const [hoveredPin, setHoveredPin] = useState<string | null>(null)

  // Pin current selection
  const pinElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    // Check if already pinned
    if (pinnedElements.some(p => p.element === selectedElement.element)) {
      toast.info("Element already pinned")
      return
    }

    const pinned: PinnedElement = {
      id: generateId(),
      element: selectedElement.element,
      label: getElementLabel(selectedElement.element),
      selector: getElementSelector(selectedElement.element),
      pinnedAt: Date.now(),
    }

    setPinnedElements(prev => [...prev, pinned])
    toast.success("Element pinned")
  }, [selectedElement, pinnedElements])

  // Unpin element
  const unpinElement = useCallback((id: string) => {
    setPinnedElements(prev => prev.filter(p => p.id !== id))
    toast.success("Element unpinned")
  }, [])

  // Clear all pins
  const clearPins = useCallback(() => {
    setPinnedElements([])
    toast.success("All pins cleared")
  }, [])

  // Select pinned element
  const selectPinned = useCallback((pinned: PinnedElement) => {
    // Check if element still exists in DOM
    if (!document.body.contains(pinned.element)) {
      toast.error("Element no longer exists in DOM")
      unpinElement(pinned.id)
      return
    }

    const computed = getComputedStyle(pinned.element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: pinned.element,
      tagName: pinned.element.tagName.toLowerCase(),
      id: pinned.element.id,
      classList: Array.from(pinned.element.classList),
      rect: pinned.element.getBoundingClientRect(),
      computedStyles,
    })

    pinned.element.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [setSelectedElement, unpinElement])

  // Check if current selection is pinned
  const isCurrentPinned = selectedElement
    ? pinnedElements.some(p => p.element === selectedElement.element)
    : false

  if (!isOpen) return null

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
          <div className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-red-500" />
            <span>Pinned Elements</span>
            {pinnedElements.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1 h-4">
                {pinnedElements.length}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pt-2">
          {/* Pin button */}
          <div className="flex gap-2">
            <Button
              variant={isCurrentPinned ? "secondary" : "default"}
              size="sm"
              className="flex-1 h-7"
              onClick={pinElement}
              disabled={!selectedElement || isCurrentPinned}
            >
              <Pin className="h-3 w-3 mr-1" />
              {isCurrentPinned ? "Already Pinned" : "Pin Selection"}
            </Button>
            {pinnedElements.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-destructive"
                onClick={clearPins}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Overlay toggle */}
          {pinnedElements.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-pins"
                  checked={showOverlay}
                  onCheckedChange={setShowOverlay}
                />
                <Label htmlFor="show-pins" className="text-xs">Show markers</Label>
              </div>
            </div>
          )}

          {/* Pinned list */}
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {pinnedElements.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Pin elements to quickly access them later
                </div>
              ) : (
                pinnedElements.map((pinned) => {
                  const exists = document.body.contains(pinned.element)

                  return (
                    <div
                      key={pinned.id}
                      className={cn(
                        "p-2 rounded cursor-pointer hover:bg-muted/50 border",
                        !exists && "opacity-50 border-destructive/30",
                        selectedElement?.element === pinned.element && "bg-primary/10 border-primary/30",
                        hoveredPin === pinned.id && "ring-2 ring-red-500/50"
                      )}
                      onClick={() => selectPinned(pinned)}
                      onMouseEnter={() => setHoveredPin(pinned.id)}
                      onMouseLeave={() => setHoveredPin(null)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono">{pinned.label}</span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              selectPinned(pinned)
                            }}
                          >
                            <Target className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              unpinElement(pinned.id)
                            }}
                          >
                            <PinOff className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-[9px] text-muted-foreground font-mono truncate">
                        {pinned.selector}
                      </div>
                      {!exists && (
                        <div className="text-[9px] text-destructive mt-1">
                          Element removed from DOM
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>

          {/* Info */}
          <div className="text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
            Pinned elements persist until cleared or the page is refreshed.
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Overlay markers */}
      {showOverlay && pinnedElements.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-9990" data-devtools>
          {pinnedElements.map((pinned, index) => {
            if (!document.body.contains(pinned.element)) return null

            const rect = pinned.element.getBoundingClientRect()
            const isHovered = hoveredPin === pinned.id
            const isSelected = selectedElement?.element === pinned.element

            return (
              <React.Fragment key={pinned.id}>
                {/* Element outline */}
                <div
                  className={cn(
                    "absolute border-2 transition-opacity",
                    isHovered || isSelected
                      ? "border-red-500 opacity-100"
                      : "border-red-500/50 opacity-50"
                  )}
                  style={{
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                  }}
                />
                {/* Pin marker */}
                <div
                  className={cn(
                    "absolute w-5 h-5 -ml-2.5 -mt-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                    isHovered || isSelected ? "bg-red-500" : "bg-red-500/70"
                  )}
                  style={{
                    left: rect.left + rect.width / 2,
                    top: rect.top,
                  }}
                >
                  {index + 1}
                </div>
              </React.Fragment>
            )
          })}
        </div>
      )}
    </>
  )
}

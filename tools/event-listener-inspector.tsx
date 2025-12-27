"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  ChevronDown, Zap, RefreshCw, Trash2
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface ListenerInfo {
  type: string
  useCapture: boolean
  passive: boolean
  once: boolean
  handler: string
}

// Get event listeners (works with getEventListeners in Chrome DevTools)
function getListeners(element: HTMLElement): ListenerInfo[] {
  const listeners: ListenerInfo[] = []

  // Try Chrome DevTools API
  if (typeof (window as unknown as { getEventListeners?: (el: Element) => Record<string, { type: string; useCapture: boolean; passive: boolean; once: boolean; listener: () => void }[]> }).getEventListeners === "function") {
    const devToolsListeners = (window as unknown as { getEventListeners: (el: Element) => Record<string, { type: string; useCapture: boolean; passive: boolean; once: boolean; listener: () => void }[]> }).getEventListeners(element)
    Object.entries(devToolsListeners).forEach(([type, eventListeners]) => {
      eventListeners.forEach(listener => {
        listeners.push({
          type,
          useCapture: listener.useCapture,
          passive: listener.passive,
          once: listener.once,
          handler: listener.listener.toString().substring(0, 100),
        })
      })
    })
  }

  // Check common event handler properties
  const handlerProps = [
    "onclick", "ondblclick", "onmousedown", "onmouseup", "onmouseover", "onmouseout",
    "onmousemove", "onmouseenter", "onmouseleave", "onkeydown", "onkeyup", "onkeypress",
    "onfocus", "onblur", "onchange", "oninput", "onsubmit", "onreset", "onscroll",
    "onwheel", "ondrag", "ondragstart", "ondragend", "ondragover", "ondragenter",
    "ondragleave", "ondrop", "ontouchstart", "ontouchend", "ontouchmove", "ontouchcancel",
    "onpointerdown", "onpointerup", "onpointermove", "onpointerenter", "onpointerleave",
    "onanimationstart", "onanimationend", "onanimationiteration", "ontransitionend",
    "onload", "onerror", "onresize", "oncontextmenu",
  ]

  handlerProps.forEach(prop => {
    const handler = (element as unknown as Record<string, (() => void) | null>)[prop]
    if (handler && typeof handler === "function") {
      listeners.push({
        type: prop.replace("on", ""),
        useCapture: false,
        passive: false,
        once: false,
        handler: handler.toString().substring(0, 100),
      })
    }
  })

  // Check for React event handlers via __reactProps
  const reactKey = Object.keys(element).find(key => key.startsWith("__reactProps"))
  if (reactKey) {
    const reactProps = (element as unknown as Record<string, Record<string, unknown>>)[reactKey]
    if (reactProps) {
      Object.keys(reactProps).forEach(key => {
        if (key.startsWith("on") && typeof reactProps[key] === "function") {
          listeners.push({
            type: key.replace(/^on/, "").toLowerCase(),
            useCapture: false,
            passive: false,
            once: false,
            handler: "(React handler)",
          })
        }
      })
    }
  }

  return listeners
}

// Common event types for reference
const commonEventTypes = [
  { category: "Mouse", events: ["click", "dblclick", "mousedown", "mouseup", "mousemove", "mouseenter", "mouseleave"] },
  { category: "Keyboard", events: ["keydown", "keyup", "keypress"] },
  { category: "Focus", events: ["focus", "blur", "focusin", "focusout"] },
  { category: "Form", events: ["submit", "reset", "change", "input"] },
  { category: "Touch", events: ["touchstart", "touchend", "touchmove", "touchcancel"] },
  { category: "Pointer", events: ["pointerdown", "pointerup", "pointermove", "pointerenter", "pointerleave"] },
  { category: "Drag", events: ["drag", "dragstart", "dragend", "dragover", "dragenter", "dragleave", "drop"] },
  { category: "Animation", events: ["animationstart", "animationend", "transitionend"] },
]

export function EventListenerInspector() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [listeners, setListeners] = useState<ListenerInfo[]>([])

  // Scan listeners
  const scan = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const found = getListeners(selectedElement.element)
    setListeners(found)

    if (found.length === 0) {
      toast.info("No event listeners found on this element")
    } else {
      toast.success(`Found ${found.length} event listener(s)`)
    }
  }, [selectedElement])

  // Clear on element change
  useEffect(() => {
    setListeners([])
  }, [selectedElement])

  // Get event category color
  const getCategoryColor = (eventType: string): string => {
    for (const cat of commonEventTypes) {
      if (cat.events.includes(eventType)) {
        const colors: Record<string, string> = {
          Mouse: "bg-blue-500",
          Keyboard: "bg-purple-500",
          Focus: "bg-yellow-500",
          Form: "bg-green-500",
          Touch: "bg-pink-500",
          Pointer: "bg-cyan-500",
          Drag: "bg-orange-500",
          Animation: "bg-red-500",
        }
        return colors[cat.category] || "bg-gray-500"
      }
    }
    return "bg-gray-500"
  }

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span>Event Listeners</span>
          {listeners.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4">
              {listeners.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Scan button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7"
          onClick={scan}
          disabled={!selectedElement}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Scan Event Listeners
        </Button>

        {/* Info */}
        <p className="text-[10px] text-muted-foreground">
          Detects inline handlers, React props, and (in Chrome DevTools) addEventListener calls.
        </p>

        {/* Listeners */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {listeners.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                {selectedElement
                  ? "Click Scan to find event listeners"
                  : "Select an element first"}
              </div>
            ) : (
              listeners.map((listener, i) => (
                <div key={i} className="p-2 bg-card border rounded-md">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[10px] h-4 px-1", getCategoryColor(listener.type))}>
                        {listener.type}
                      </Badge>
                      {listener.useCapture && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1">capture</Badge>
                      )}
                      {listener.passive && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1">passive</Badge>
                      )}
                      {listener.once && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1">once</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate">
                    {listener.handler}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Reference */}
        <div className="p-2 bg-muted/30 rounded">
          <div className="text-[10px] font-medium mb-1">Common Event Types</div>
          <div className="flex flex-wrap gap-1">
            {commonEventTypes.map(cat => (
              <Badge
                key={cat.category}
                variant="outline"
                className="text-[9px] h-4 px-1"
              >
                {cat.category}
              </Badge>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

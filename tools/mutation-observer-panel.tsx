"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  ChevronDown, Activity, Play, Pause, Trash2
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

interface MutationRecord {
  id: number
  type: "childList" | "attributes" | "characterData"
  target: string
  timestamp: number
  details: string
  attributeName?: string
  addedNodes?: number
  removedNodes?: number
}

let mutationIdCounter = 0

export function MutationObserverPanel() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isObserving, setIsObserving] = useState(false)
  const [mutations, setMutations] = useState<MutationRecord[]>([])
  const [watchChildList, setWatchChildList] = useState(true)
  const [watchAttributes, setWatchAttributes] = useState(true)
  const [watchCharacterData, setWatchCharacterData] = useState(false)
  const [watchSubtree, setWatchSubtree] = useState(true)
  const observerRef = useRef<MutationObserver | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Get element label
  const getElementLabel = (el: Node): string => {
    if (el instanceof HTMLElement) {
      const tag = el.tagName.toLowerCase()
      const id = el.id ? `#${el.id}` : ""
      const cls = el.classList.length > 0 ? `.${Array.from(el.classList).slice(0, 2).join(".")}` : ""
      return `${tag}${id}${cls}`.substring(0, 30)
    }
    if (el instanceof Text) {
      return `#text: "${el.textContent?.substring(0, 20)}..."`
    }
    return el.nodeName
  }

  // Start observing
  const startObserving = useCallback(() => {
    const target = selectedElement?.element || document.body

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    const observer = new MutationObserver((mutationList) => {
      const newRecords: MutationRecord[] = mutationList.map(mutation => {
        const record: MutationRecord = {
          id: ++mutationIdCounter,
          type: mutation.type as MutationRecord["type"],
          target: getElementLabel(mutation.target),
          timestamp: Date.now(),
          details: "",
        }

        if (mutation.type === "childList") {
          record.addedNodes = mutation.addedNodes.length
          record.removedNodes = mutation.removedNodes.length
          record.details = `+${mutation.addedNodes.length} -${mutation.removedNodes.length} nodes`
        } else if (mutation.type === "attributes") {
          record.attributeName = mutation.attributeName || undefined
          record.details = `${mutation.attributeName} changed`
        } else if (mutation.type === "characterData") {
          record.details = "Text content changed"
        }

        return record
      })

      setMutations(prev => [...prev, ...newRecords].slice(-100)) // Keep last 100
    })

    observer.observe(target, {
      childList: watchChildList,
      attributes: watchAttributes,
      characterData: watchCharacterData,
      subtree: watchSubtree,
      attributeOldValue: true,
      characterDataOldValue: true,
    })

    observerRef.current = observer
    setIsObserving(true)
    toast.success(`Observing ${getElementLabel(target)}`)
  }, [selectedElement, watchChildList, watchAttributes, watchCharacterData, watchSubtree])

  // Stop observing
  const stopObserving = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    setIsObserving(false)
    toast.info("Stopped observing")
  }, [])

  // Clear mutations
  const clearMutations = useCallback(() => {
    setMutations([])
    mutationIdCounter = 0
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mutations])

  // Get type color
  const getTypeColor = (type: string): string => {
    switch (type) {
      case "childList": return "bg-blue-500"
      case "attributes": return "bg-purple-500"
      case "characterData": return "bg-green-500"
      default: return "bg-gray-500"
    }
  }

  // Format timestamp
  const formatTime = (ts: number): string => {
    return new Date(ts).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    })
  }

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Activity className={cn("h-4 w-4", isObserving ? "text-green-500 animate-pulse" : "text-orange-500")} />
          <span>Mutation Observer</span>
          {mutations.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4">
              {mutations.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Controls */}
        <div className="flex gap-2">
          <Button
            variant={isObserving ? "destructive" : "default"}
            size="sm"
            className="flex-1 h-7"
            onClick={isObserving ? stopObserving : startObserving}
          >
            {isObserving ? (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Start
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={clearMutations}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Target info */}
        <div className="text-[10px] text-muted-foreground">
          Target: {selectedElement ? getElementLabel(selectedElement.element) : "document.body"}
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Switch
              id="childList"
              checked={watchChildList}
              onCheckedChange={setWatchChildList}
              disabled={isObserving}
            />
            <Label htmlFor="childList" className="text-[10px]">Child nodes</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="attributes"
              checked={watchAttributes}
              onCheckedChange={setWatchAttributes}
              disabled={isObserving}
            />
            <Label htmlFor="attributes" className="text-[10px]">Attributes</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="characterData"
              checked={watchCharacterData}
              onCheckedChange={setWatchCharacterData}
              disabled={isObserving}
            />
            <Label htmlFor="characterData" className="text-[10px]">Text content</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="subtree"
              checked={watchSubtree}
              onCheckedChange={setWatchSubtree}
              disabled={isObserving}
            />
            <Label htmlFor="subtree" className="text-[10px]">Subtree</Label>
          </div>
        </div>

        {/* Mutations list */}
        <ScrollArea className="h-[200px]" viewportRef={scrollRef}>
          <div className="space-y-1">
            {mutations.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                {isObserving
                  ? "Waiting for DOM mutations..."
                  : "Click Start to begin observing"}
              </div>
            ) : (
              mutations.map((mutation) => (
                <div
                  key={mutation.id}
                  className="p-2 bg-muted/30 rounded text-[10px]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={cn("text-[9px] h-4 px-1", getTypeColor(mutation.type))}>
                      {mutation.type}
                    </Badge>
                    <span className="text-muted-foreground font-mono">
                      {formatTime(mutation.timestamp)}
                    </span>
                  </div>
                  <div className="font-mono truncate">{mutation.target}</div>
                  <div className="text-muted-foreground">{mutation.details}</div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Stats */}
        {mutations.length > 0 && (
          <div className="flex gap-2 text-[10px]">
            <Badge variant="outline" className="px-1">
              childList: {mutations.filter(m => m.type === "childList").length}
            </Badge>
            <Badge variant="outline" className="px-1">
              attributes: {mutations.filter(m => m.type === "attributes").length}
            </Badge>
            <Badge variant="outline" className="px-1">
              text: {mutations.filter(m => m.type === "characterData").length}
            </Badge>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

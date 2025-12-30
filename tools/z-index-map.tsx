"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Layers, RefreshCw, Eye, EyeOff, ArrowUp, ArrowDown
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

interface StackingContext {
  element: HTMLElement
  zIndex: number | "auto"
  isStackingContext: boolean
  reason: string
  rect: DOMRect
  children: StackingContext[]
  depth: number
}

// Check if element creates a stacking context
function createsStackingContext(element: HTMLElement): { creates: boolean; reason: string } {
  const style = getComputedStyle(element)

  // Root element
  if (element === document.documentElement) {
    return { creates: true, reason: "root element" }
  }

  // Position with z-index
  if (
    (style.position === "absolute" || style.position === "relative" || style.position === "fixed" || style.position === "sticky") &&
    style.zIndex !== "auto"
  ) {
    return { creates: true, reason: `position: ${style.position} + z-index` }
  }

  // Flex/grid child with z-index
  const parent = element.parentElement
  if (parent) {
    const parentStyle = getComputedStyle(parent)
    if (
      (parentStyle.display === "flex" || parentStyle.display === "grid") &&
      style.zIndex !== "auto"
    ) {
      return { creates: true, reason: "flex/grid child + z-index" }
    }
  }

  // Opacity less than 1
  if (parseFloat(style.opacity) < 1) {
    return { creates: true, reason: `opacity: ${style.opacity}` }
  }

  // Transform
  if (style.transform !== "none") {
    return { creates: true, reason: "transform" }
  }

  // Filter
  if (style.filter !== "none") {
    return { creates: true, reason: "filter" }
  }

  // Isolation
  if (style.isolation === "isolate") {
    return { creates: true, reason: "isolation: isolate" }
  }

  // Will-change
  if (style.willChange.includes("transform") || style.willChange.includes("opacity")) {
    return { creates: true, reason: `will-change: ${style.willChange}` }
  }

  // Mix blend mode
  if (style.mixBlendMode !== "normal") {
    return { creates: true, reason: `mix-blend-mode: ${style.mixBlendMode}` }
  }

  // Clip path
  if (style.clipPath !== "none") {
    return { creates: true, reason: "clip-path" }
  }

  // Mask
  if (style.mask !== "none" && style.mask !== "") {
    return { creates: true, reason: "mask" }
  }

  // Contain
  if (style.contain === "layout" || style.contain === "paint" || style.contain === "strict" || style.contain === "content") {
    return { creates: true, reason: `contain: ${style.contain}` }
  }

  return { creates: false, reason: "" }
}

// Build stacking context tree
function buildStackingTree(root: HTMLElement, depth = 0): StackingContext[] {
  const contexts: StackingContext[] = []

  const processElement = (element: HTMLElement, currentDepth: number): StackingContext | null => {
    if (element.hasAttribute("data-devtools")) return null

    const style = getComputedStyle(element)
    const zIndex: number | "auto" = style.zIndex === "auto" ? "auto" : parseInt(style.zIndex)
    const { creates, reason } = createsStackingContext(element)

    // Only include elements with z-index or stacking contexts
    if (zIndex !== "auto" || creates) {
      const children: StackingContext[] = []

      Array.from(element.children).forEach((child) => {
        const childContext = processElement(child as HTMLElement, currentDepth + 1)
        if (childContext) {
          children.push(childContext)
        }
      })

      return {
        element,
        zIndex,
        isStackingContext: creates,
        reason,
        rect: element.getBoundingClientRect(),
        children,
        depth: currentDepth,
      }
    }

    // Process children even if this element doesn't create context
    Array.from(element.children).forEach((child) => {
      const childContext = processElement(child as HTMLElement, currentDepth)
      if (childContext) {
        contexts.push(childContext)
      }
    })

    return null
  }

  const rootContext = processElement(root, depth)
  if (rootContext) {
    contexts.push(rootContext)
  }

  return contexts
}

// Flatten tree for display
function flattenTree(contexts: StackingContext[]): StackingContext[] {
  const flat: StackingContext[] = []

  const traverse = (ctx: StackingContext) => {
    flat.push(ctx)
    ctx.children.forEach(traverse)
  }

  contexts.forEach(traverse)

  // Sort by z-index (descending)
  return flat.sort((a, b) => {
    const aZ = a.zIndex === "auto" ? 0 : a.zIndex
    const bZ = b.zIndex === "auto" ? 0 : b.zIndex
    return bZ - aZ
  })
}

export function ZIndexMap() {
  const { isOpen, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [contexts, setContexts] = useState<StackingContext[]>([])
  const [showOverlay, setShowOverlay] = useState(false)
  const [hoveredContext, setHoveredContext] = useState<StackingContext | null>(null)

  // Scan for stacking contexts
  const scan = useCallback(() => {
    const tree = buildStackingTree(document.body)
    setContexts(tree)
    toast.success(`Found ${flattenTree(tree).length} stacking contexts`)
  }, [])

  // Flat list for display
  const flatContexts = useMemo(() => flattenTree(contexts), [contexts])

  // Select context element
  const selectContext = useCallback((ctx: StackingContext) => {
    ctx.element.scrollIntoView({ behavior: "smooth", block: "center" })

    const computed = getComputedStyle(ctx.element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: ctx.element,
      tagName: ctx.element.tagName.toLowerCase(),
      id: ctx.element.id,
      classList: Array.from(ctx.element.classList),
      rect: ctx.rect,
      computedStyles,
    })
  }, [setSelectedElement])

  // Get z-index color
  const getZIndexColor = (zIndex: number | "auto"): string => {
    if (zIndex === "auto") return "bg-muted-foreground"
    if (zIndex < 0) return "bg-[--accent-purple]"
    if (zIndex === 0) return "bg-muted-foreground"
    if (zIndex < 10) return "bg-[--accent-blue]"
    if (zIndex < 100) return "bg-[--accent-green]"
    if (zIndex < 1000) return "bg-[--accent-amber]"
    if (zIndex < 10000) return "bg-[--accent-orange]"
    return "bg-[--destructive]"
  }

  if (!isOpen) return null

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-chart-3" />
            <span>Z-Index Map</span>
            {flatContexts.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1 h-4">
                {flatContexts.length}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pt-2">
          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-7" onClick={scan}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Scan
            </Button>
            <div className="flex items-center gap-2">
              <Switch
                checked={showOverlay}
                onCheckedChange={setShowOverlay}
                id="z-overlay"
              />
              <Label htmlFor="z-overlay" className="text-[10px]">Overlay</Label>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-1 text-[9px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-[--accent-purple]" /> &lt;0
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-muted-foreground" /> 0/auto
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-[--accent-blue]" /> 1-9
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-[--accent-green]" /> 10-99
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-[--accent-amber]" /> 100-999
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-[--accent-orange]" /> 1k-10k
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-[--destructive]" /> &gt;10k
            </span>
          </div>

          {/* Contexts list */}
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {flatContexts.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Click &quot;Scan&quot; to analyze stacking contexts
                </div>
              ) : (
                flatContexts.map((ctx, index) => {
                  const tag = ctx.element.tagName.toLowerCase()
                  const id = ctx.element.id
                  const classList = Array.from(ctx.element.classList).slice(0, 2)

                  return (
                    <div
                      key={index}
                      className={cn(
                        "p-2 rounded-md cursor-pointer hover:bg-muted/50 flex items-center gap-2",
                        hoveredContext === ctx && "ring-1 ring-primary"
                      )}
                      style={{ paddingLeft: `${ctx.depth * 8 + 8}px` }}
                      onClick={() => selectContext(ctx)}
                      onMouseEnter={() => setHoveredContext(ctx)}
                      onMouseLeave={() => setHoveredContext(null)}
                    >
                      <Badge
                        className={cn(
                          "text-[10px] h-5 min-w-[40px] justify-center",
                          getZIndexColor(ctx.zIndex)
                        )}
                      >
                        {ctx.zIndex}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono truncate">
                          {tag}
                          {id && `#${id}`}
                          {classList.length > 0 && `.${classList.join(".")}`}
                        </div>
                        {ctx.isStackingContext && (
                          <div className="text-[9px] text-muted-foreground truncate">
                            {ctx.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      {/* Overlay */}
      {showOverlay && flatContexts.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-9990" data-devtools>
          {flatContexts.map((ctx, index) => (
            <div
              key={index}
              className={cn(
                "absolute border-2 transition-opacity",
                hoveredContext === ctx ? "opacity-100" : "opacity-50",
                ctx.zIndex === "auto" ? "border-muted-foreground" :
                  ctx.zIndex < 0 ? "border-[--accent-purple]" :
                    ctx.zIndex < 10 ? "border-[--accent-blue]" :
                      ctx.zIndex < 100 ? "border-[--accent-green]" :
                        ctx.zIndex < 1000 ? "border-[--accent-amber]" :
                          "border-[--destructive]"
              )}
              style={{
                left: ctx.rect.left,
                top: ctx.rect.top,
                width: ctx.rect.width,
                height: ctx.rect.height,
              }}
            >
              <span
                className={cn(
                  "absolute -top-4 left-0 text-[10px] font-mono px-1 rounded text-white",
                  getZIndexColor(ctx.zIndex)
                )}
              >
                z:{ctx.zIndex}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import {
  ChevronDown, Layers, RefreshCw, ChevronRight, AlertTriangle
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface StackingContext {
  element: HTMLElement
  label: string
  zIndex: string
  reason: string
  children: StackingContext[]
  depth: number
}

// Get element label
function getElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ""
  const cls = el.classList.length > 0 ? `.${Array.from(el.classList)[0]}` : ""
  return `${tag}${id}${cls}`.substring(0, 25)
}

// Check if element creates a stacking context
function createsStackingContext(el: HTMLElement): string | null {
  const computed = getComputedStyle(el)

  // Root element
  if (el === document.documentElement) return "root element"

  // Position with z-index
  if (
    (computed.position === "absolute" || computed.position === "relative" ||
     computed.position === "fixed" || computed.position === "sticky") &&
    computed.zIndex !== "auto"
  ) {
    return `position: ${computed.position} + z-index: ${computed.zIndex}`
  }

  // Flex/Grid item with z-index
  const parent = el.parentElement
  if (parent) {
    const parentDisplay = getComputedStyle(parent).display
    if (
      (parentDisplay === "flex" || parentDisplay === "inline-flex" ||
       parentDisplay === "grid" || parentDisplay === "inline-grid") &&
      computed.zIndex !== "auto"
    ) {
      return `flex/grid child + z-index: ${computed.zIndex}`
    }
  }

  // Opacity less than 1
  if (parseFloat(computed.opacity) < 1) {
    return `opacity: ${computed.opacity}`
  }

  // Transform
  if (computed.transform !== "none") {
    return "transform"
  }

  // Filter
  if (computed.filter !== "none") {
    return "filter"
  }

  // Backdrop filter
  const backdropFilter = computed.backdropFilter || computed.getPropertyValue("-webkit-backdrop-filter")
  if (backdropFilter && backdropFilter !== "none") {
    return "backdrop-filter"
  }

  // Mix blend mode
  if (computed.mixBlendMode !== "normal") {
    return `mix-blend-mode: ${computed.mixBlendMode}`
  }

  // Isolation
  if (computed.isolation === "isolate") {
    return "isolation: isolate"
  }

  // Will-change
  if (
    computed.willChange === "transform" ||
    computed.willChange === "opacity" ||
    computed.willChange === "filter"
  ) {
    return `will-change: ${computed.willChange}`
  }

  // Contain
  if (
    computed.contain === "layout" ||
    computed.contain === "paint" ||
    computed.contain === "strict" ||
    computed.contain === "content"
  ) {
    return `contain: ${computed.contain}`
  }

  // Clip path
  if (computed.clipPath !== "none") {
    return "clip-path"
  }

  // Mask
  const maskImage = computed.maskImage || computed.getPropertyValue("-webkit-mask-image")
  if (maskImage && maskImage !== "none") {
    return "mask"
  }

  return null
}

// Build stacking context tree
function buildStackingTree(root: HTMLElement, depth: number = 0): StackingContext | null {
  const reason = createsStackingContext(root)
  if (!reason && depth > 0) return null

  const context: StackingContext = {
    element: root,
    label: getElementLabel(root),
    zIndex: getComputedStyle(root).zIndex,
    reason: reason || "",
    children: [],
    depth,
  }

  // Check children
  for (const child of Array.from(root.children)) {
    if ((child as HTMLElement).hasAttribute?.("data-devtools")) continue

    const childContext = buildStackingTree(child as HTMLElement, depth + 1)
    if (childContext) {
      context.children.push(childContext)
    } else {
      // Check descendants
      const descendants = findStackingContexts(child as HTMLElement, depth + 1)
      context.children.push(...descendants)
    }
  }

  return context
}

// Find all stacking contexts in subtree
function findStackingContexts(root: HTMLElement, depth: number): StackingContext[] {
  const contexts: StackingContext[] = []

  for (const child of Array.from(root.children)) {
    if ((child as HTMLElement).hasAttribute?.("data-devtools")) continue

    const reason = createsStackingContext(child as HTMLElement)
    if (reason) {
      const context = buildStackingTree(child as HTMLElement, depth)
      if (context) contexts.push(context)
    } else {
      contexts.push(...findStackingContexts(child as HTMLElement, depth))
    }
  }

  return contexts
}

// Flatten tree for display
function flattenTree(context: StackingContext): StackingContext[] {
  const result: StackingContext[] = [context]
  for (const child of context.children) {
    result.push(...flattenTree(child))
  }
  return result
}

export function StackingContextDebugger() {
  const { isOpen, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [tree, setTree] = useState<StackingContext | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<HTMLElement>>(new Set())

  // Scan for stacking contexts
  const scan = useCallback(() => {
    const rootContext = buildStackingTree(document.documentElement)
    setTree(rootContext)

    // Auto-expand first few levels
    if (rootContext) {
      const toExpand = new Set<HTMLElement>([rootContext.element])
      rootContext.children.forEach(c => toExpand.add(c.element))
      setExpandedNodes(toExpand)
    }

    const flat = rootContext ? flattenTree(rootContext) : []
    toast.success(`Found ${flat.length} stacking context(s)`)
  }, [])

  // Toggle node expansion
  const toggleNode = useCallback((el: HTMLElement) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(el)) {
        next.delete(el)
      } else {
        next.add(el)
      }
      return next
    })
  }, [])

  // Select element
  const selectContext = useCallback((context: StackingContext) => {
    const computed = getComputedStyle(context.element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: context.element,
      tagName: context.element.tagName.toLowerCase(),
      id: context.element.id,
      classList: Array.from(context.element.classList),
      rect: context.element.getBoundingClientRect(),
      computedStyles,
    })

    context.element.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [setSelectedElement])

  // Render tree node
  const renderNode = useCallback((context: StackingContext) => {
    const hasChildren = context.children.length > 0
    const isExpanded = expandedNodes.has(context.element)

    return (
      <div key={context.element.outerHTML.substring(0, 50)} className="space-y-1">
        <div
          className="flex items-center gap-1 p-1 rounded hover:bg-muted/50 cursor-pointer"
          style={{ paddingLeft: context.depth * 12 }}
          onClick={() => selectContext(context)}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(context.element)
              }}
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform",
                  isExpanded && "rotate-90"
                )}
              />
            </Button>
          ) : (
            <span className="w-4" />
          )}

          <span className="text-[10px] font-mono flex-1 truncate">
            {context.label}
          </span>

          {context.zIndex !== "auto" && (
            <Badge variant="outline" className="text-[8px] h-4 px-1 font-mono">
              z:{context.zIndex}
            </Badge>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {context.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    )
  }, [expandedNodes, selectContext, toggleNode])

  // Stats
  const stats = useMemo(() => {
    if (!tree) return null
    const flat = flattenTree(tree)
    return {
      total: flat.length,
      withZIndex: flat.filter(c => c.zIndex !== "auto").length,
      maxDepth: Math.max(...flat.map(c => c.depth)),
    }
  }, [tree])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-500" />
          <span>Stacking Context</span>
          {stats && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4">
              {stats.total}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Scan button */}
        <Button variant="default" size="sm" className="w-full h-7" onClick={scan}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Analyze Stacking Contexts
        </Button>

        {/* Stats */}
        {stats && (
          <div className="p-2 bg-muted/30 rounded text-[10px] grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="font-bold">{stats.total}</div>
              <div className="text-muted-foreground">Contexts</div>
            </div>
            <div>
              <div className="font-bold">{stats.withZIndex}</div>
              <div className="text-muted-foreground">With z-index</div>
            </div>
            <div>
              <div className="font-bold">{stats.maxDepth}</div>
              <div className="text-muted-foreground">Max depth</div>
            </div>
          </div>
        )}

        {/* Tree view */}
        <ScrollArea className="h-[200px]">
          {!tree ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Click Analyze to view stacking contexts
            </div>
          ) : (
            <div className="space-y-1">
              {renderNode(tree)}
            </div>
          )}
        </ScrollArea>

        {/* Info */}
        <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
          <div className="font-medium mb-1">Creates stacking context:</div>
          <ul className="list-disc list-inside space-y-0.5">
            <li>position + z-index (not auto)</li>
            <li>opacity &lt; 1</li>
            <li>transform, filter, clip-path</li>
            <li>isolation: isolate</li>
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

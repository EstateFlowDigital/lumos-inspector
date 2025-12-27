"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import {
  ChevronDown, ChevronRight, Search, RefreshCw, Eye, EyeOff,
  Box, Layout, Type, Image, Link, List, Table, Folder, FileCode,
  PanelLeft, X, Layers, Target, Filter, MoreHorizontal
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { useInspector, DOMTreeNode, ElementInfo } from "./inspector-context"

// Virtual scrolling constants
const ITEM_HEIGHT = 28 // Height of each tree node row
const OVERSCAN = 5 // Extra items to render above/below viewport

// Element type icons mapping
const elementIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  div: Box,
  section: Layout,
  main: Layout,
  header: Layout,
  footer: Layout,
  nav: Layout,
  article: FileCode,
  aside: Layout,
  p: Type,
  span: Type,
  h1: Type,
  h2: Type,
  h3: Type,
  h4: Type,
  h5: Type,
  h6: Type,
  a: Link,
  img: Image,
  ul: List,
  ol: List,
  li: List,
  table: Table,
  button: Box,
  input: Box,
  form: Folder,
}

// Get computed styles for an element
function getComputedStylesForElement(element: HTMLElement): Record<string, string> {
  const computed = window.getComputedStyle(element)
  const styles: Record<string, string> = {}

  const importantProps = [
    'display', 'position', 'width', 'height', 'margin', 'padding',
    'flexDirection', 'justifyContent', 'alignItems', 'gap',
    'backgroundColor', 'color', 'fontSize', 'fontWeight',
    'border', 'borderRadius', 'boxShadow', 'opacity', 'overflow'
  ]

  importantProps.forEach(prop => {
    styles[prop] = computed.getPropertyValue(
      prop.replace(/([A-Z])/g, '-$1').toLowerCase()
    )
  })

  return styles
}

// Drag state type
type DragPosition = "before" | "after" | "inside" | null

// Tree node component
interface TreeNodeProps {
  node: DOMTreeNode
  onSelect: (element: HTMLElement) => void
  selectedPath: string | null
  hoveredPath: string | null
  onHover: (element: HTMLElement | null) => void
  searchQuery: string
  onDragStart?: (element: HTMLElement, path: string) => void
  onDragEnd?: () => void
  onDrop?: (targetElement: HTMLElement, targetPath: string, position: DragPosition) => void
  draggedPath?: string | null
}

function TreeNode({
  node,
  onSelect,
  selectedPath,
  hoveredPath,
  onHover,
  searchQuery,
  onDragStart,
  onDragEnd,
  onDrop,
  draggedPath,
}: TreeNodeProps) {
  const { expandedNodes, toggleNode } = useInspector()
  const isExpanded = expandedNodes.has(node.path)
  const [dropPosition, setDropPosition] = useState<DragPosition>(null)
  const isDragging = draggedPath === node.path
  const isSelected = selectedPath === node.path
  const isHovered = hoveredPath === node.path
  const hasChildren = node.children.length > 0

  const Icon = elementIcons[node.tagName] || Box

  // Check if node matches search
  const matchesSearch = useMemo(() => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      node.tagName.includes(query) ||
      node.id.toLowerCase().includes(query) ||
      node.classList.some(c => c.toLowerCase().includes(query))
    )
  }, [node, searchQuery])

  // Check if any child matches search
  const hasMatchingChild = useMemo(() => {
    if (!searchQuery) return true
    const checkChildren = (n: DOMTreeNode): boolean => {
      const query = searchQuery.toLowerCase()
      if (
        n.tagName.includes(query) ||
        n.id.toLowerCase().includes(query) ||
        n.classList.some(c => c.toLowerCase().includes(query))
      ) {
        return true
      }
      return n.children.some(checkChildren)
    }
    return checkChildren(node)
  }, [node, searchQuery])

  if (!matchesSearch && !hasMatchingChild) return null

  // Get display label
  const label = node.id
    ? `#${node.id}`
    : node.classList.length > 0
    ? `.${node.classList[0]}`
    : node.tagName

  // Handle drag events
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", node.path)
    onDragStart?.(node.element, node.path)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedPath === node.path) return

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    if (y < height * 0.25) {
      setDropPosition("before")
    } else if (y > height * 0.75) {
      setDropPosition("after")
    } else {
      setDropPosition("inside")
    }
  }

  const handleDragLeave = () => {
    setDropPosition(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dropPosition && draggedPath !== node.path) {
      onDrop?.(node.element, node.path, dropPosition)
    }
    setDropPosition(null)
  }

  const handleDragEnd = () => {
    setDropPosition(null)
    onDragEnd?.()
  }

  return (
    <div>
      {/* Drop zone indicator - before */}
      {dropPosition === "before" && (
        <div
          className="h-0.5 bg-chart-1 mx-2 rounded-full"
          style={{ marginLeft: `${node.depth * 12 + 8}px` }}
        />
      )}

      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 cursor-grab rounded-sm text-xs group",
          "hover:bg-muted/80 transition-colors",
          isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
          isHovered && !isSelected && "bg-accent",
          isDragging && "opacity-50",
          dropPosition === "inside" && "ring-2 ring-chart-1 ring-inset"
        )}
        style={{ paddingLeft: `${node.depth * 12 + 8}px` }}
        onClick={() => onSelect(node.element)}
        onMouseEnter={() => onHover(node.element)}
        onMouseLeave={() => onHover(null)}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(e) => {
              e.stopPropagation()
              toggleNode(node.path)
            }}
            aria-label={isExpanded ? `Collapse ${node.tagName} element` : `Expand ${node.tagName} element`}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            )}
          </button>
        ) : (
          <span className="w-4" aria-hidden="true" />
        )}

        {/* Element icon */}
        <Icon className={cn("h-3 w-3", isSelected ? "text-primary-foreground" : "text-muted-foreground")} aria-hidden="true" />

        {/* Tag name */}
        <span className="font-mono">{node.tagName}</span>

        {/* ID or class */}
        {node.id && (
          <span className={cn("font-mono", isSelected ? "text-primary-foreground/80" : "text-chart-1")}>
            #{node.id}
          </span>
        )}
        {!node.id && node.classList.length > 0 && (
          <span className={cn("font-mono truncate max-w-[120px]", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
            .{node.classList[0]}
            {node.classList.length > 1 && (
              <span className="opacity-50">+{node.classList.length - 1}</span>
            )}
          </span>
        )}
      </div>

      {/* Drop zone indicator - after */}
      {dropPosition === "after" && !hasChildren && (
        <div
          className="h-0.5 bg-chart-1 mx-2 rounded-full"
          style={{ marginLeft: `${node.depth * 12 + 8}px` }}
        />
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
              hoveredPath={hoveredPath}
              onHover={onHover}
              searchQuery={searchQuery}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
              draggedPath={draggedPath}
            />
          ))}
        </div>
      )}

      {/* Drop zone indicator - after (with children) */}
      {dropPosition === "after" && hasChildren && (
        <div
          className="h-0.5 bg-chart-1 mx-2 rounded-full"
          style={{ marginLeft: `${node.depth * 12 + 8}px` }}
        />
      )}
    </div>
  )
}

// Simplified tree node for virtual scrolling (no recursive children)
interface VirtualTreeNodeProps {
  node: DOMTreeNode
  onSelect: (element: HTMLElement) => void
  selectedPath: string | null
  hoveredPath: string | null
  onHover: (element: HTMLElement | null) => void
  onDragStart?: (element: HTMLElement, path: string) => void
  onDragEnd?: () => void
  onDrop?: (targetElement: HTMLElement, targetPath: string, position: DragPosition) => void
  draggedPath?: string | null
}

function VirtualTreeNode({
  node,
  onSelect,
  selectedPath,
  hoveredPath,
  onHover,
  onDragStart,
  onDragEnd,
  onDrop,
  draggedPath,
}: VirtualTreeNodeProps) {
  const { expandedNodes, toggleNode } = useInspector()
  const isExpanded = expandedNodes.has(node.path)
  const [dropPosition, setDropPosition] = useState<DragPosition>(null)
  const isDragging = draggedPath === node.path
  const isSelected = selectedPath === node.path
  const isHovered = hoveredPath === node.path
  const hasChildren = node.children.length > 0

  const Icon = elementIcons[node.tagName] || Box

  // Handle drag events
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", node.path)
    onDragStart?.(node.element, node.path)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedPath === node.path) return

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    if (y < height * 0.25) {
      setDropPosition("before")
    } else if (y > height * 0.75) {
      setDropPosition("after")
    } else {
      setDropPosition("inside")
    }
  }

  const handleDragLeave = () => {
    setDropPosition(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dropPosition && draggedPath !== node.path) {
      onDrop?.(node.element, node.path, dropPosition)
    }
    setDropPosition(null)
  }

  const handleDragEnd = () => {
    setDropPosition(null)
    onDragEnd?.()
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 h-full cursor-grab rounded-sm text-xs group",
        "hover:bg-muted/80 transition-colors",
        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
        isHovered && !isSelected && "bg-accent",
        isDragging && "opacity-50",
        dropPosition === "inside" && "ring-2 ring-chart-1 ring-inset",
        dropPosition === "before" && "border-t-2 border-chart-1",
        dropPosition === "after" && "border-b-2 border-chart-1"
      )}
      style={{ paddingLeft: `${node.depth * 12 + 8}px` }}
      onClick={() => onSelect(node.element)}
      onMouseEnter={() => onHover(node.element)}
      onMouseLeave={() => onHover(null)}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      {/* Expand/collapse button */}
      {hasChildren ? (
        <button
          className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded focus-visible:ring-2 focus-visible:ring-ring"
          onClick={(e) => {
            e.stopPropagation()
            toggleNode(node.path)
          }}
          aria-label={isExpanded ? `Collapse ${node.tagName} element` : `Expand ${node.tagName} element`}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          )}
        </button>
      ) : (
        <span className="w-4" aria-hidden="true" />
      )}

      {/* Element icon */}
      <Icon className={cn("h-3 w-3", isSelected ? "text-primary-foreground" : "text-muted-foreground")} aria-hidden="true" />

      {/* Tag name */}
      <span className="font-mono">{node.tagName}</span>

      {/* ID or class */}
      {node.id && (
        <span className={cn("font-mono", isSelected ? "text-primary-foreground/80" : "text-chart-1")}>
          #{node.id}
        </span>
      )}
      {!node.id && node.classList.length > 0 && (
        <span className={cn("font-mono truncate max-w-[120px]", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
          .{node.classList[0]}
          {node.classList.length > 1 && (
            <span className="opacity-50">+{node.classList.length - 1}</span>
          )}
        </span>
      )}
    </div>
  )
}

export function NavigatorPanel() {
  const {
    showNavigator,
    setShowNavigator,
    domTree,
    refreshDOMTree,
    selectedElement,
    setSelectedElement,
    hoveredElement,
    setHoveredElement,
    isInspecting,
    setIsInspecting,
    expandNode,
    expandedNodes,
  } = useInspector()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const [draggedPath, setDraggedPath] = useState<string | null>(null)
  const [draggedElement, setDraggedElement] = useState<HTMLElement | null>(null)

  // Virtual scrolling state
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  // Flatten tree for virtual scrolling
  const flatNodes = useMemo(
    () => flattenTree(domTree, expandedNodes, searchQuery),
    [domTree, expandedNodes, searchQuery]
  )

  // Calculate visible range
  const { startIndex, endIndex, visibleNodes } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN)
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT)
    const end = Math.min(flatNodes.length, start + visibleCount + OVERSCAN * 2)
    return {
      startIndex: start,
      endIndex: end,
      visibleNodes: flatNodes.slice(start, end),
    }
  }, [scrollTop, containerHeight, flatNodes])

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // Update container height on resize
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(container)
    setContainerHeight(container.clientHeight)

    return () => resizeObserver.disconnect()
  }, [])

  // Drag and drop handlers
  const handleDragStart = useCallback((element: HTMLElement, path: string) => {
    setDraggedElement(element)
    setDraggedPath(path)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedElement(null)
    setDraggedPath(null)
  }, [])

  const handleDrop = useCallback((targetElement: HTMLElement, targetPath: string, position: DragPosition) => {
    if (!draggedElement || draggedElement === targetElement) return

    try {
      // Check if the move would create a circular reference
      if (targetElement.contains(draggedElement)) {
        toast.error("Cannot move element", {
          description: "An element cannot be moved inside its own descendant.",
        })
        setDraggedElement(null)
        setDraggedPath(null)
        return
      }

      switch (position) {
        case "before":
          targetElement.parentElement?.insertBefore(draggedElement, targetElement)
          break
        case "after":
          targetElement.parentElement?.insertBefore(draggedElement, targetElement.nextSibling)
          break
        case "inside":
          targetElement.appendChild(draggedElement)
          break
      }

      // Refresh the tree to reflect changes
      refreshDOMTree()
      toast.success("Element moved", {
        description: `Moved ${position} target element.`,
      })
    } catch (error) {
      console.error("Failed to move element:", error)
      toast.error("Failed to move element", {
        description: error instanceof Error ? error.message : "An unexpected error occurred while moving the element.",
      })
    }

    setDraggedElement(null)
    setDraggedPath(null)
  }, [draggedElement, refreshDOMTree])

  // Handle element selection
  const handleSelect = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const computed = getComputedStylesForElement(element)

    const info: ElementInfo = {
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      classList: Array.from(element.classList),
      computedStyles: computed,
      rect,
      element,
    }

    setSelectedElement(info)

    // Find the path for this element in the tree
    const findPath = (nodes: DOMTreeNode[], target: HTMLElement): string | null => {
      for (const node of nodes) {
        if (node.element === target) return node.path
        const childPath = findPath(node.children, target)
        if (childPath) return childPath
      }
      return null
    }

    const path = findPath(domTree, element)
    if (path) {
      setSelectedPath(path)
      expandNode(path)
    }
  }, [domTree, setSelectedElement, expandNode])

  // Handle hover
  const handleHover = useCallback((element: HTMLElement | null) => {
    setHoveredElement(element)
    if (element) {
      const findPath = (nodes: DOMTreeNode[], target: HTMLElement): string | null => {
        for (const node of nodes) {
          if (node.element === target) return node.path
          const childPath = findPath(node.children, target)
          if (childPath) return childPath
        }
        return null
      }
      const path = findPath(domTree, element)
      setHoveredPath(path)
    } else {
      setHoveredPath(null)
    }
  }, [domTree, setHoveredElement])

  // Update selected path when element changes externally
  useEffect(() => {
    if (selectedElement) {
      const findPath = (nodes: DOMTreeNode[], target: HTMLElement): string | null => {
        for (const node of nodes) {
          if (node.element === target) return node.path
          const childPath = findPath(node.children, target)
          if (childPath) return childPath
        }
        return null
      }
      const path = findPath(domTree, selectedElement.element)
      if (path) {
        setSelectedPath(path)
      }
    }
  }, [selectedElement, domTree])

  if (!showNavigator) return null

  return (
    <div
      className="fixed left-0 top-0 h-screen bg-card border-r shadow-xl z-9998 flex flex-col overflow-hidden"
      style={{ width: 400 }}
      data-devtools
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-chart-1" />
          <span className="font-semibold text-sm">Navigator</span>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isInspecting ? "default" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => setIsInspecting(!isInspecting)}
                aria-label={isInspecting ? "Stop inspecting elements" : "Start inspecting elements"}
                aria-pressed={isInspecting}
              >
                <Target className={cn("h-4 w-4", isInspecting && "animate-pulse")} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isInspecting ? "Stop Inspecting" : "Inspect Element"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={refreshDOMTree}
                aria-label="Refresh DOM tree"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh Tree</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setShowNavigator(false)}
            aria-label="Close navigator panel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="navigator-search" className="sr-only">Search elements</label>
          <Input
            id="navigator-search"
            placeholder="Search elements..."
            className="h-8 text-xs pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-describedby="navigator-search-hint"
          />
          <span id="navigator-search-hint" className="sr-only">
            Search by tag name, ID, or class name
          </span>
        </div>
      </div>

      {/* Current selection */}
      {selectedElement && (
        <div className="p-2 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {selectedElement.tagName}
            </Badge>
            {selectedElement.id && (
              <Badge variant="secondary" className="font-mono text-xs text-chart-1">
                #{selectedElement.id}
              </Badge>
            )}
          </div>
          {selectedElement.classList.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedElement.classList.slice(0, 5).map((cls) => (
                <Badge key={cls} variant="outline" className="font-mono text-[10px] px-1 py-0">
                  .{cls}
                </Badge>
              ))}
              {selectedElement.classList.length > 5 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  +{selectedElement.classList.length - 5}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Virtualized Tree */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <div
          style={{
            height: flatNodes.length * ITEM_HEIGHT,
            position: "relative",
          }}
        >
          {visibleNodes.map(({ node, index }, i) => (
            <div
              key={node.path}
              style={{
                position: "absolute",
                top: (startIndex + i) * ITEM_HEIGHT,
                left: 0,
                right: 0,
                height: ITEM_HEIGHT,
              }}
            >
              <VirtualTreeNode
                node={node}
                onSelect={handleSelect}
                selectedPath={selectedPath}
                hoveredPath={hoveredPath}
                onHover={handleHover}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                draggedPath={draggedPath}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer with stats */}
      <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Elements: {countNodes(domTree)}</span>
          <span>Depth: {maxDepth(domTree)}</span>
        </div>
      </div>
    </div>
  )
}

// Utility functions
function countNodes(nodes: DOMTreeNode[]): number {
  return nodes.reduce((acc, node) => acc + 1 + countNodes(node.children), 0)
}

function maxDepth(nodes: DOMTreeNode[]): number {
  if (nodes.length === 0) return 0
  return Math.max(...nodes.map(n => Math.max(n.depth + 1, maxDepth(n.children))))
}

// Flattened tree node for virtual scrolling
interface FlatNode {
  node: DOMTreeNode
  isVisible: boolean
  index: number
}

// Flatten tree for virtual scrolling, respecting expanded state and search
function flattenTree(
  nodes: DOMTreeNode[],
  expandedNodes: Set<string>,
  searchQuery: string
): FlatNode[] {
  const result: FlatNode[] = []
  let index = 0

  const checkMatchesSearch = (node: DOMTreeNode): boolean => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      node.tagName.includes(query) ||
      node.id.toLowerCase().includes(query) ||
      node.classList.some(c => c.toLowerCase().includes(query))
    )
  }

  const hasMatchingDescendant = (node: DOMTreeNode): boolean => {
    if (checkMatchesSearch(node)) return true
    return node.children.some(hasMatchingDescendant)
  }

  const traverse = (nodes: DOMTreeNode[]) => {
    for (const node of nodes) {
      const matches = checkMatchesSearch(node)
      const hasMatchingChild = hasMatchingDescendant(node)

      if (!matches && !hasMatchingChild) continue

      result.push({
        node,
        isVisible: true,
        index: index++,
      })

      const hasChildren = node.children.length > 0
      const isExpanded = expandedNodes.has(node.path)

      if (hasChildren && isExpanded) {
        traverse(node.children)
      }
    }
  }

  traverse(nodes)
  return result
}

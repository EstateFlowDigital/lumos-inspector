"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  ChevronDown, ChevronRight, Network, RefreshCw, Target
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Input } from "../ui/input"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface TreeNode {
  element: HTMLElement
  tagName: string
  id: string
  classList: string[]
  children: TreeNode[]
  depth: number
  isExpanded: boolean
}

// Build tree from element
function buildTree(element: HTMLElement, depth = 0, maxDepth = 10): TreeNode | null {
  if (depth > maxDepth) return null
  if (element.hasAttribute?.("data-devtools")) return null

  const children: TreeNode[] = []

  if (depth < maxDepth) {
    Array.from(element.children).forEach(child => {
      const childNode = buildTree(child as HTMLElement, depth + 1, maxDepth)
      if (childNode) {
        children.push(childNode)
      }
    })
  }

  return {
    element,
    tagName: element.tagName?.toLowerCase() || "",
    id: element.id || "",
    classList: Array.from(element.classList || []),
    children,
    depth,
    isExpanded: depth < 2,
  }
}

// Tree node component
function TreeNodeComponent({
  node,
  onSelect,
  onToggle,
  selectedElement,
  searchQuery,
}: {
  node: TreeNode
  onSelect: (el: HTMLElement) => void
  onToggle: (node: TreeNode) => void
  selectedElement: HTMLElement | null
  searchQuery: string
}) {
  const isSelected = node.element === selectedElement
  const hasChildren = node.children.length > 0

  // Check if matches search
  const matchesSearch = searchQuery
    ? node.tagName.includes(searchQuery.toLowerCase()) ||
      node.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.classList.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
    : true

  // Check if any child matches
  const hasMatchingChild = (n: TreeNode): boolean => {
    if (!searchQuery) return true
    if (
      n.tagName.includes(searchQuery.toLowerCase()) ||
      n.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.classList.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
    ) {
      return true
    }
    return n.children.some(hasMatchingChild)
  }

  const shouldShow = matchesSearch || hasMatchingChild(node)

  if (!shouldShow) return null

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer text-xs hover:bg-muted/50",
          isSelected && "bg-primary/20 text-primary",
          matchesSearch && searchQuery && "bg-yellow-500/10"
        )}
        style={{ paddingLeft: `${node.depth * 12 + 4}px` }}
        onClick={() => onSelect(node.element)}
      >
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-muted rounded"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node)
            }}
          >
            {node.isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <span className="text-purple-600 dark:text-purple-400">&lt;{node.tagName}</span>
        {node.id && (
          <span className="text-blue-600 dark:text-blue-400">#{node.id}</span>
        )}
        {node.classList.slice(0, 2).map((c, i) => (
          <span key={i} className="text-green-600 dark:text-green-400">.{c}</span>
        ))}
        {node.classList.length > 2 && (
          <span className="text-muted-foreground">+{node.classList.length - 2}</span>
        )}
        <span className="text-purple-600 dark:text-purple-400">&gt;</span>

        {hasChildren && (
          <Badge variant="secondary" className="text-[8px] h-3 px-1 ml-1">
            {node.children.length}
          </Badge>
        )}
      </div>

      {node.isExpanded && hasChildren && (
        <div>
          {node.children.map((child, index) => (
            <TreeNodeComponent
              key={index}
              node={child}
              onSelect={onSelect}
              onToggle={onToggle}
              selectedElement={selectedElement}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function DOMTreeVisualizer() {
  const { isOpen, selectedElement, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [tree, setTree] = useState<TreeNode | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Build tree
  const buildFullTree = useCallback(() => {
    const root = document.body
    const treeData = buildTree(root)
    setTree(treeData)
    toast.success("DOM tree refreshed")
  }, [])

  // Toggle node expansion
  const toggleNode = useCallback((targetNode: TreeNode) => {
    setTree(prev => {
      if (!prev) return null

      const updateNode = (node: TreeNode): TreeNode => {
        if (node === targetNode) {
          return { ...node, isExpanded: !node.isExpanded }
        }
        return {
          ...node,
          children: node.children.map(updateNode),
        }
      }

      return updateNode(prev)
    })
  }, [])

  // Select element
  const handleSelect = useCallback((element: HTMLElement) => {
    const computed = getComputedStyle(element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element,
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      classList: Array.from(element.classList),
      rect: element.getBoundingClientRect(),
      computedStyles,
    })

    element.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [setSelectedElement])

  // Scroll to selected element
  const scrollToSelected = useCallback(() => {
    if (selectedElement?.element) {
      selectedElement.element.scrollIntoView({ behavior: "smooth", block: "center" })
      toast.success("Scrolled to element")
    }
  }, [selectedElement])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-rose-500" />
          <span>DOM Tree</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-7" onClick={buildFullTree}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Scan DOM
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={scrollToSelected}
            disabled={!selectedElement}
          >
            <Target className="h-3 w-3" />
          </Button>
        </div>

        {/* Search */}
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-7 text-xs"
          placeholder="Search by tag, id, or class..."
        />

        {/* Tree */}
        <ScrollArea className="h-[300px]">
          {!tree ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Click "Scan DOM" to visualize the DOM tree
            </div>
          ) : (
            <TreeNodeComponent
              node={tree}
              onSelect={handleSelect}
              onToggle={toggleNode}
              selectedElement={selectedElement?.element || null}
              searchQuery={searchQuery}
            />
          )}
        </ScrollArea>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-[9px]">
          <span className="flex items-center gap-1">
            <span className="text-purple-600 dark:text-purple-400">&lt;tag&gt;</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-blue-600 dark:text-blue-400">#id</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-green-600 dark:text-green-400">.class</span>
          </span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

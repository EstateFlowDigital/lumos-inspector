"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import {
  Box,
  Code,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  Layers,
  Braces,
  FileCode,
  Eye,
  EyeOff,
  Search,
  ExternalLink,
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Input } from "../ui/input"
import { ScrollArea } from "../ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible"

// React fiber node types
interface FiberNode {
  tag: number
  type: string | Function | null
  key: string | null
  stateNode: any
  return: FiberNode | null
  child: FiberNode | null
  sibling: FiberNode | null
  memoizedProps: Record<string, any>
  memoizedState: any
  _debugSource?: {
    fileName: string
    lineNumber: number
    columnNumber: number
  }
}

// Component information
export interface ComponentInfo {
  name: string
  type: "function" | "class" | "forwardRef" | "memo" | "context" | "host"
  props: Record<string, any>
  state: any
  hooks: HookInfo[]
  context: Record<string, any>
  source?: {
    fileName: string
    lineNumber: number
  }
  children: ComponentInfo[]
  element: HTMLElement | null
}

// Hook information
export interface HookInfo {
  name: string
  value: any
  index: number
}

// Prop value display types
type PropValueType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "undefined"
  | "function"
  | "array"
  | "object"
  | "element"
  | "symbol"

// Get value type
function getValueType(value: any): PropValueType {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "string") return "string"
  if (typeof value === "number") return "number"
  if (typeof value === "boolean") return "boolean"
  if (typeof value === "function") return "function"
  if (typeof value === "symbol") return "symbol"
  if (Array.isArray(value)) return "array"
  if (React.isValidElement(value)) return "element"
  if (typeof value === "object") return "object"
  return "object"
}

// Get React fiber from DOM element
function getFiberFromElement(element: HTMLElement): FiberNode | null {
  // React 18+ uses __reactFiber$
  const fiberKey = Object.keys(element).find(
    (key) => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")
  )

  if (fiberKey) {
    return (element as any)[fiberKey] as FiberNode
  }

  return null
}

// Get component name from fiber
function getComponentName(fiber: FiberNode): string {
  if (!fiber.type) return "Unknown"

  if (typeof fiber.type === "string") {
    return fiber.type // HTML element
  }

  if (typeof fiber.type === "function") {
    const fn = fiber.type as Function & { displayName?: string }
    return fn.displayName || fn.name || "Anonymous"
  }

  if (typeof fiber.type === "object") {
    // Memo, ForwardRef, Context, etc.
    if ((fiber.type as any).$$typeof) {
      const typeOf = (fiber.type as any).$$typeof.toString()
      if (typeOf.includes("memo")) {
        const innerType = (fiber.type as any).type
        return `Memo(${innerType?.displayName || innerType?.name || "Anonymous"})`
      }
      if (typeOf.includes("forward_ref")) {
        const render = (fiber.type as any).render
        return `ForwardRef(${render?.displayName || render?.name || "Anonymous"})`
      }
      if (typeOf.includes("context")) {
        return "Context.Provider"
      }
    }
  }

  return "Unknown"
}

// Get component type
function getComponentType(fiber: FiberNode): ComponentInfo["type"] {
  if (!fiber.type) return "host"

  if (typeof fiber.type === "string") return "host"

  if (typeof fiber.type === "function") {
    // Check if it's a class component
    if (fiber.type.prototype && fiber.type.prototype.isReactComponent) {
      return "class"
    }
    return "function"
  }

  if (typeof fiber.type === "object") {
    const typeOf = (fiber.type as any).$$typeof?.toString() || ""
    if (typeOf.includes("memo")) return "memo"
    if (typeOf.includes("forward_ref")) return "forwardRef"
    if (typeOf.includes("context")) return "context"
  }

  return "function"
}

// Extract hooks from fiber
function extractHooks(fiber: FiberNode): HookInfo[] {
  const hooks: HookInfo[] = []

  try {
    let hookNode = fiber.memoizedState
    let index = 0

    while (hookNode) {
      // Try to identify hook type
      let name = "unknown"
      let value = hookNode.memoizedState

      if (hookNode.queue) {
        name = "useState"
      } else if (hookNode.memoizedState && typeof hookNode.memoizedState === "object") {
        if ("current" in hookNode.memoizedState) {
          name = "useRef"
          value = hookNode.memoizedState.current
        } else if (hookNode.memoizedState.deps !== undefined) {
          name = "useEffect/useMemo/useCallback"
        }
      }

      hooks.push({ name, value, index })
      hookNode = hookNode.next
      index++
    }
  } catch {
    // Hooks extraction can fail in some cases
  }

  return hooks
}

// Build component tree from fiber
function buildComponentTree(
  fiber: FiberNode | null,
  element: HTMLElement | null,
  depth: number = 0,
  maxDepth: number = 10
): ComponentInfo | null {
  if (!fiber || depth > maxDepth) return null

  const name = getComponentName(fiber)
  const type = getComponentType(fiber)

  // Skip host elements that aren't the target
  if (type === "host" && fiber.stateNode !== element && depth > 0) {
    // Continue to child
    if (fiber.child) {
      return buildComponentTree(fiber.child, element, depth, maxDepth)
    }
    return null
  }

  const info: ComponentInfo = {
    name,
    type,
    props: fiber.memoizedProps || {},
    state: fiber.memoizedState,
    hooks: type === "function" ? extractHooks(fiber) : [],
    context: {},
    source: fiber._debugSource
      ? {
          fileName: fiber._debugSource.fileName,
          lineNumber: fiber._debugSource.lineNumber,
        }
      : undefined,
    children: [],
    element: fiber.stateNode instanceof HTMLElement ? fiber.stateNode : null,
  }

  // Get children components (not host elements)
  let childFiber = fiber.child
  while (childFiber) {
    const childInfo = buildComponentTree(childFiber, element, depth + 1, maxDepth)
    if (childInfo && childInfo.type !== "host") {
      info.children.push(childInfo)
    }
    childFiber = childFiber.sibling
  }

  return info
}

// Get component tree for an element
export function getComponentInfo(element: HTMLElement): ComponentInfo | null {
  const fiber = getFiberFromElement(element)
  if (!fiber) return null

  // Walk up to find the nearest component
  let currentFiber: FiberNode | null = fiber

  while (currentFiber) {
    if (typeof currentFiber.type === "function") {
      return buildComponentTree(currentFiber, element)
    }
    currentFiber = currentFiber.return
  }

  // If no component found, return the host element info
  return buildComponentTree(fiber, element)
}

// Find all parent components
export function getComponentAncestors(element: HTMLElement): ComponentInfo[] {
  const ancestors: ComponentInfo[] = []
  const fiber = getFiberFromElement(element)
  if (!fiber) return ancestors

  let currentFiber: FiberNode | null = fiber.return

  while (currentFiber) {
    if (typeof currentFiber.type === "function") {
      const info = buildComponentTree(currentFiber, element, 0, 1)
      if (info) {
        ancestors.push(info)
      }
    }
    currentFiber = currentFiber.return
  }

  return ancestors
}

// Value renderer component
interface ValueRendererProps {
  value: any
  depth?: number
  maxDepth?: number
  expanded?: boolean
}

function ValueRenderer({ value, depth = 0, maxDepth = 3, expanded = false }: ValueRendererProps) {
  const [isExpanded, setIsExpanded] = useState(expanded && depth < 2)
  const type = getValueType(value)

  const typeColors: Record<PropValueType, string> = {
    string: "text-green-500",
    number: "text-blue-500",
    boolean: "text-purple-500",
    null: "text-gray-500",
    undefined: "text-gray-500",
    function: "text-yellow-500",
    array: "text-orange-500",
    object: "text-cyan-500",
    element: "text-pink-500",
    symbol: "text-red-500",
  }

  if (type === "null") return <span className={typeColors.null}>null</span>
  if (type === "undefined") return <span className={typeColors.undefined}>undefined</span>
  if (type === "string") return <span className={typeColors.string}>"{value}"</span>
  if (type === "number") return <span className={typeColors.number}>{value}</span>
  if (type === "boolean") return <span className={typeColors.boolean}>{value.toString()}</span>
  if (type === "function") {
    const fnName = value.name || "anonymous"
    return <span className={typeColors.function}>ƒ {fnName}()</span>
  }
  if (type === "symbol") return <span className={typeColors.symbol}>{value.toString()}</span>
  if (type === "element") return <span className={typeColors.element}>&lt;{(value as React.ReactElement).type?.toString() || "Element"} /&gt;</span>

  if (type === "array") {
    if (depth >= maxDepth) return <span className={typeColors.array}>[...] ({value.length})</span>

    return (
      <div className="inline">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center hover:bg-muted rounded px-0.5"
        >
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className={typeColors.array}>Array({value.length})</span>
        </button>
        {isExpanded && (
          <div className="ml-4 border-l pl-2 mt-1 space-y-1">
            {value.slice(0, 10).map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground text-xs">{i}:</span>
                <ValueRenderer value={item} depth={depth + 1} maxDepth={maxDepth} />
              </div>
            ))}
            {value.length > 10 && (
              <span className="text-muted-foreground text-xs">...{value.length - 10} more</span>
            )}
          </div>
        )}
      </div>
    )
  }

  if (type === "object") {
    const keys = Object.keys(value)
    if (depth >= maxDepth) return <span className={typeColors.object}>{"{...}"} ({keys.length})</span>

    return (
      <div className="inline">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center hover:bg-muted rounded px-0.5"
        >
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className={typeColors.object}>Object({keys.length})</span>
        </button>
        {isExpanded && (
          <div className="ml-4 border-l pl-2 mt-1 space-y-1">
            {keys.slice(0, 10).map((key) => (
              <div key={key} className="flex items-start gap-2">
                <span className="text-muted-foreground text-xs">{key}:</span>
                <ValueRenderer value={value[key]} depth={depth + 1} maxDepth={maxDepth} />
              </div>
            ))}
            {keys.length > 10 && (
              <span className="text-muted-foreground text-xs">...{keys.length - 10} more</span>
            )}
          </div>
        )}
      </div>
    )
  }

  return <span>{String(value)}</span>
}

// Props section component
interface PropsSectionProps {
  props: Record<string, any>
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
}

function PropsSection({ props, title, icon, defaultOpen = true }: PropsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [filter, setFilter] = useState("")

  const entries = Object.entries(props).filter(([key]) => {
    if (!filter) return true
    return key.toLowerCase().includes(filter.toLowerCase())
  })

  // Filter out children prop for cleaner display
  const filteredEntries = entries.filter(([key]) => key !== "children")

  if (filteredEntries.length === 0 && !filter) {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {filteredEntries.length}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pr-2 pb-2">
        {entries.length > 5 && (
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Filter props..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
        )}
        <div className="space-y-1">
          {filteredEntries.map(([key, value]) => (
            <div key={key} className="flex items-start gap-2 py-1 text-xs font-mono">
              <span className="text-primary font-medium min-w-[80px]">{key}:</span>
              <ValueRenderer value={value} />
            </div>
          ))}
          {filteredEntries.length === 0 && filter && (
            <p className="text-xs text-muted-foreground py-2">No props match "{filter}"</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// Component card
interface ComponentCardProps {
  component: ComponentInfo
  isSelected?: boolean
  onSelect?: () => void
  depth?: number
}

function ComponentCard({ component, isSelected, onSelect, depth = 0 }: ComponentCardProps) {
  const [copied, setCopied] = useState(false)

  const typeColors: Record<ComponentInfo["type"], string> = {
    function: "bg-blue-500/10 text-blue-500",
    class: "bg-purple-500/10 text-purple-500",
    forwardRef: "bg-green-500/10 text-green-500",
    memo: "bg-orange-500/10 text-orange-500",
    context: "bg-pink-500/10 text-pink-500",
    host: "bg-gray-500/10 text-gray-500",
  }

  const copyProps = useCallback(() => {
    const propsStr = JSON.stringify(component.props, null, 2)
    navigator.clipboard.writeText(propsStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [component.props])

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden",
        isSelected && "ring-2 ring-primary",
        depth > 0 && "ml-4 mt-2"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50",
          isSelected && "bg-primary/5"
        )}
        onClick={onSelect}
      >
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{component.name}</span>
          <Badge variant="outline" className={cn("text-xs", typeColors[component.type])}>
            {component.type}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation()
              copyProps()
            }}
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Details (when selected) */}
      {isSelected && (
        <div className="border-t p-3 space-y-3">
          {/* Source file */}
          {component.source && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileCode className="h-3 w-3" />
              <span className="truncate">
                {component.source.fileName.split("/").pop()}:{component.source.lineNumber}
              </span>
            </div>
          )}

          {/* Props */}
          <PropsSection
            props={component.props}
            title="Props"
            icon={<Braces className="h-4 w-4" />}
          />

          {/* Hooks */}
          {component.hooks.length > 0 && (
            <PropsSection
              props={Object.fromEntries(
                component.hooks.map((h) => [`${h.name}[${h.index}]`, h.value])
              )}
              title="Hooks"
              icon={<Code className="h-4 w-4" />}
              defaultOpen={false}
            />
          )}
        </div>
      )}
    </div>
  )
}

// Main component prop inspector
interface ComponentPropInspectorProps {
  element?: HTMLElement | null
  className?: string
}

export function ComponentPropInspector({ element, className }: ComponentPropInspectorProps) {
  const [componentInfo, setComponentInfo] = useState<ComponentInfo | null>(null)
  const [ancestors, setAncestors] = useState<ComponentInfo[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAncestors, setShowAncestors] = useState(true)

  // Refresh component info
  const refresh = useCallback(() => {
    if (!element) {
      setComponentInfo(null)
      setAncestors([])
      return
    }

    setIsRefreshing(true)

    setTimeout(() => {
      const info = getComponentInfo(element)
      setComponentInfo(info)

      const ancestorList = getComponentAncestors(element)
      setAncestors(ancestorList)

      setIsRefreshing(false)
    }, 50)
  }, [element])

  // Refresh when element changes
  useEffect(() => {
    refresh()
  }, [refresh])

  // All components to display
  const allComponents = useMemo(() => {
    const list: ComponentInfo[] = []

    if (componentInfo && componentInfo.type !== "host") {
      list.push(componentInfo)
    }

    if (showAncestors) {
      list.push(...ancestors)
    }

    return list
  }, [componentInfo, ancestors, showAncestors])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          <h2 className="font-semibold">React Components</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowAncestors(!showAncestors)}
            title={showAncestors ? "Hide ancestors" : "Show ancestors"}
          >
            {showAncestors ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={refresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {!element ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Select an element to inspect its React components</p>
            </div>
          ) : allComponents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Box className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No React components found</p>
              <p className="text-xs mt-1">
                The selected element may not be rendered by React,
                or React DevTools integration is not available.
              </p>
            </div>
          ) : (
            <>
              {/* Component hierarchy indicator */}
              {ancestors.length > 0 && showAncestors && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>Component Tree</span>
                  <Badge variant="outline">{allComponents.length} components</Badge>
                </div>
              )}

              {/* Component list */}
              {allComponents.map((comp, index) => (
                <ComponentCard
                  key={`${comp.name}-${index}`}
                  component={comp}
                  isSelected={selectedIndex === index}
                  onSelect={() => setSelectedIndex(index)}
                  depth={index > 0 ? 1 : 0}
                />
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer info */}
      {element && allComponents.length > 0 && (
        <div className="p-3 border-t text-xs text-muted-foreground">
          <p>
            React components may not expose all internal state.
            Use React DevTools for full debugging capabilities.
          </p>
        </div>
      )}
    </div>
  )
}

// Quick component info display (for overlay/tooltip)
export function ComponentQuickInfo({ element }: { element: HTMLElement | null }) {
  const [info, setInfo] = useState<ComponentInfo | null>(null)

  useEffect(() => {
    if (!element) {
      setInfo(null)
      return
    }

    const componentInfo = getComponentInfo(element)
    setInfo(componentInfo)
  }, [element])

  if (!info || info.type === "host") return null

  return (
    <div className="flex items-center gap-2 text-xs">
      <Box className="h-3 w-3" />
      <span className="font-medium">{info.name}</span>
      <Badge variant="secondary" className="text-[10px] py-0">
        {Object.keys(info.props).length} props
      </Badge>
    </div>
  )
}

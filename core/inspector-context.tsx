"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"
import { getStyleManager, initializeBaseStyles, type GlobalStyleManager } from "../tools/style-manager"

// Element info interface
export interface ElementInfo {
  tagName: string
  id: string
  classList: string[]
  computedStyles: Record<string, string>
  rect: DOMRect
  element: HTMLElement
  path?: string
}

// DOM tree node interface
export interface DOMTreeNode {
  element: HTMLElement
  tagName: string
  id: string
  classList: string[]
  children: DOMTreeNode[]
  depth: number
  path: string
}

// History entry for undo/redo
export interface HistoryEntry {
  type: 'class' | 'inline'
  target: string
  property: string
  oldValue: string
  newValue: string
  timestamp: number
}

// Inspector context type
interface InspectorContextType {
  // Preview mode (inside iframe)
  isPreviewMode: boolean
  setIsPreviewMode: (mode: boolean) => void

  // Panel visibility
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  showNavigator: boolean
  setShowNavigator: (show: boolean) => void
  showInspector: boolean
  setShowInspector: (show: boolean) => void
  showElementPanel: boolean
  setShowElementPanel: (show: boolean) => void
  showAddElement: boolean
  setShowAddElement: (show: boolean) => void

  // Inspection mode
  isInspecting: boolean
  setIsInspecting: (inspecting: boolean) => void

  // Measurement mode
  isMeasuring: boolean
  setIsMeasuring: (measuring: boolean) => void

  // Selected element
  selectedElement: ElementInfo | null
  setSelectedElement: (element: ElementInfo | null) => void
  hoveredElement: HTMLElement | null
  setHoveredElement: (element: HTMLElement | null) => void

  // DOM tree
  domTree: DOMTreeNode[]
  setDomTree: (tree: DOMTreeNode[]) => void
  expandedNodes: Set<string>
  toggleNode: (path: string) => void
  expandNode: (path: string) => void

  // Class management
  activeClass: string | null
  setActiveClass: (className: string | null) => void
  classStyles: Record<string, Record<string, string>>
  updateClassStyle: (className: string, property: string, value: string) => void

  // History
  history: HistoryEntry[]
  historyIndex: number
  addToHistory: (entry: Omit<HistoryEntry, 'timestamp'>) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean

  // Breakpoints
  activeBreakpoint: string
  setActiveBreakpoint: (breakpoint: string) => void
  previewWidth: number | null
  setPreviewWidth: (width: number | null) => void

  // Refresh
  refreshDOMTree: () => void

  // CSS export
  exportCSS: () => string
  clearGlobalStyles: () => void

  // Style change tracking - increments on every style change to trigger re-renders
  styleChangeCounter: number
  notifyStyleChange: () => void

  // Element validation - check if selected element is still in DOM
  isElementValid: () => boolean
  refreshSelectedElement: () => void
}

const InspectorContext = createContext<InspectorContextType | null>(null)

export function useInspector() {
  const context = useContext(InspectorContext)
  if (!context) {
    throw new Error("useInspector must be used within InspectorProvider")
  }
  return context
}

// Build DOM tree from an element
function buildDOMTree(element: HTMLElement, depth = 0, path = "0"): DOMTreeNode {
  const children: DOMTreeNode[] = []

  Array.from(element.children).forEach((child, index) => {
    if (child instanceof HTMLElement) {
      // Skip DevTools elements
      if (child.closest('[data-devtools]') || child.hasAttribute('data-devtools')) {
        return
      }
      children.push(buildDOMTree(child, depth + 1, `${path}-${index}`))
    }
  })

  return {
    element,
    tagName: element.tagName.toLowerCase(),
    id: element.id,
    classList: Array.from(element.classList),
    children,
    depth,
    path,
  }
}

export function InspectorProvider({ children }: { children: React.ReactNode }) {
  // Detect preview mode (inside iframe with ?_preview=true)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      setIsPreviewMode(urlParams.get('_preview') === 'true')
    }
  }, [])

  // Panel visibility
  const [isOpen, setIsOpen] = useState(false)
  const [showNavigator, setShowNavigator] = useState(true)
  const [showInspector, setShowInspector] = useState(true)
  const [showElementPanel, setShowElementPanel] = useState(false)
  const [showAddElement, setShowAddElement] = useState(false)

  // Inspection mode
  const [isInspecting, setIsInspecting] = useState(false)

  // Measurement mode
  const [isMeasuring, setIsMeasuring] = useState(false)

  // Selected element
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null)
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null)

  // DOM tree
  const [domTree, setDomTree] = useState<DOMTreeNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["0"]))

  // Class management
  const [activeClass, setActiveClass] = useState<string | null>(null)
  const [classStyles, setClassStyles] = useState<Record<string, Record<string, string>>>({})

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Breakpoints
  const [activeBreakpoint, setActiveBreakpoint] = useState("base")
  const [previewWidth, setPreviewWidth] = useState<number | null>(null)

  // Style change tracking - increments to trigger dependent components to re-render
  const [styleChangeCounter, setStyleChangeCounter] = useState(0)

  // Global style manager for CSS rule injection
  const styleManagerRef = useRef<GlobalStyleManager | null>(null)

  // Initialize style manager and base styles
  useEffect(() => {
    if (typeof window !== 'undefined') {
      styleManagerRef.current = getStyleManager()
      // Initialize base Lumos component styles
      initializeBaseStyles()
    }
  }, [])

  // Toggle node expansion
  const toggleNode = useCallback((path: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  // Expand node (for navigation)
  const expandNode = useCallback((path: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      // Expand all parent paths
      const parts = path.split("-")
      let currentPath = ""
      for (let i = 0; i < parts.length; i++) {
        currentPath = i === 0 ? parts[i] : `${currentPath}-${parts[i]}`
        next.add(currentPath)
      }
      return next
    })
  }, [])

  // Update class style - injects CSS rules globally
  const updateClassStyle = useCallback((className: string, property: string, value: string) => {
    // Update local state for tracking
    setClassStyles(prev => ({
      ...prev,
      [className]: {
        ...(prev[className] || {}),
        [property]: value,
      },
    }))

    // Inject CSS rule globally via the style manager
    if (styleManagerRef.current) {
      styleManagerRef.current.updateRule(`.${className}`, property, value)
    }
  }, [])

  // Add to history
  const addToHistory = useCallback((entry: Omit<HistoryEntry, 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      timestamp: Date.now(),
    }
    setHistory(prev => {
      // Remove any entries after current index (for redo)
      const truncated = prev.slice(0, historyIndex + 1)
      return [...truncated, newEntry]
    })
    setHistoryIndex(prev => prev + 1)
  }, [historyIndex])

  // Undo
  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      const entry = history[historyIndex]
      // Apply old value
      if (entry.type === 'class') {
        updateClassStyle(entry.target, entry.property, entry.oldValue)
      }
      setHistoryIndex(prev => prev - 1)
    }
  }, [history, historyIndex, updateClassStyle])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const entry = history[historyIndex + 1]
      // Apply new value
      if (entry.type === 'class') {
        updateClassStyle(entry.target, entry.property, entry.newValue)
      }
      setHistoryIndex(prev => prev + 1)
    }
  }, [history, historyIndex, updateClassStyle])

  // Refresh DOM tree
  const refreshDOMTree = useCallback(() => {
    if (typeof document !== 'undefined') {
      const main = document.querySelector('main') || document.body
      const tree = buildDOMTree(main as HTMLElement)
      setDomTree([tree])
    }
  }, [])

  // Export CSS from global style manager
  const exportCSS = useCallback((): string => {
    if (styleManagerRef.current) {
      return styleManagerRef.current.exportCSS()
    }
    return ""
  }, [])

  // Clear all global styles
  const clearGlobalStyles = useCallback(() => {
    if (styleManagerRef.current) {
      styleManagerRef.current.clear()
    }
    setClassStyles({})
  }, [])

  // Notify that a style change occurred - triggers re-renders in dependent components
  const notifyStyleChange = useCallback(() => {
    setStyleChangeCounter(prev => prev + 1)
  }, [])

  // Check if the selected element is still in the DOM
  const isElementValid = useCallback((): boolean => {
    if (!selectedElement?.element) return false
    return document.body.contains(selectedElement.element)
  }, [selectedElement])

  // Refresh the selected element info (re-compute styles from DOM)
  const refreshSelectedElement = useCallback(() => {
    if (!selectedElement?.element) return
    if (!document.body.contains(selectedElement.element)) {
      // Element is no longer in DOM, deselect it
      setSelectedElement(null)
      return
    }

    // Re-compute the element info
    const el = selectedElement.element
    const computed = window.getComputedStyle(el)
    const rect = el.getBoundingClientRect()

    const importantProps = [
      'display', 'position', 'width', 'height', 'margin', 'padding',
      'flexDirection', 'justifyContent', 'alignItems', 'gap',
      'backgroundColor', 'color', 'fontSize', 'fontWeight',
      'border', 'borderRadius', 'boxShadow', 'opacity', 'overflow'
    ]
    const computedStyles: Record<string, string> = {}
    importantProps.forEach(prop => {
      computedStyles[prop] = computed.getPropertyValue(
        prop.replace(/([A-Z])/g, '-$1').toLowerCase()
      )
    })

    setSelectedElement({
      ...selectedElement,
      computedStyles,
      rect,
    })
  }, [selectedElement, setSelectedElement])

  // Initialize DOM tree when panel opens
  useEffect(() => {
    if (isOpen) {
      refreshDOMTree()
    }
  }, [isOpen, refreshDOMTree])

  // Keyboard shortcut (Ctrl/Cmd + Shift + D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const value: InspectorContextType = {
    isPreviewMode,
    setIsPreviewMode,
    isOpen,
    setIsOpen,
    showNavigator,
    setShowNavigator,
    showInspector,
    setShowInspector,
    showElementPanel,
    setShowElementPanel,
    showAddElement,
    setShowAddElement,
    isInspecting,
    setIsInspecting,
    isMeasuring,
    setIsMeasuring,
    selectedElement,
    setSelectedElement,
    hoveredElement,
    setHoveredElement,
    domTree,
    setDomTree,
    expandedNodes,
    toggleNode,
    expandNode,
    activeClass,
    setActiveClass,
    classStyles,
    updateClassStyle,
    history,
    historyIndex,
    addToHistory,
    undo,
    redo,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
    activeBreakpoint,
    setActiveBreakpoint,
    previewWidth,
    setPreviewWidth,
    refreshDOMTree,
    exportCSS,
    clearGlobalStyles,
    styleChangeCounter,
    notifyStyleChange,
    isElementValid,
    refreshSelectedElement,
  }

  return (
    <InspectorContext.Provider value={value}>
      {children}
    </InspectorContext.Provider>
  )
}

"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  X, Settings, Code, Paintbrush, Layers, Move, ChevronDown, ChevronRight,
  Maximize2, Minimize2, Eye, EyeOff, Monitor, Laptop, Tablet, Smartphone,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, ArrowRight, ArrowDown,
  StretchHorizontal, StretchVertical, Grid3X3, Rows, Copy, RotateCcw,
  Plus, Minus, HelpCircle, Folder, FolderOpen, FileCode, Box,
  Type, Image, Link, List, Table, Layout, PanelLeft, PanelRight, Grip,
  Info, Trash2, Search, Undo2, Redo2
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Separator } from "../ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import { toast } from "sonner"
import { DraggableInput } from "./draggable-input"
import { TokenSelector, colorTokens, radiusTokens } from "../tools/token-selector"

// Throttle utility for performance
function throttle<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  let timeoutId: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(...args)
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now()
        timeoutId = null
        fn(...args)
      }, delay - (now - lastCall))
    }
  }
}

// Debounce utility for input handlers
function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// History entry for undo/redo
interface HistoryEntry {
  type: 'class' | 'inline'
  target: string // class name or element selector
  property: string
  oldValue: string
  newValue: string
  timestamp: number
}

// Validate CSS class name
function isValidClassName(name: string): boolean {
  // CSS class names must start with letter, underscore, or hyphen
  // and contain only letters, numbers, underscores, and hyphens
  return /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(name)
}

// Breakpoint definitions with responsive widths
const breakpoints = [
  { id: "base", label: "Base", width: null, icon: Monitor, description: "All devices (100%)" },
  { id: "1920", label: "1920", width: 1920, icon: Monitor, description: "Large Desktop" },
  { id: "1440", label: "1440", width: 1440, icon: Monitor, description: "Desktop" },
  { id: "1280", label: "1280", width: 1280, icon: Laptop, description: "Laptop" },
  { id: "991", label: "991", width: 991, icon: Tablet, description: "Tablet Landscape" },
  { id: "767", label: "767", width: 767, icon: Tablet, description: "Tablet Portrait" },
  { id: "478", label: "478", width: 478, icon: Smartphone, description: "Mobile" },
]

// Element type icons mapping
const elementIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  div: Box,
  section: Layout,
  main: Layout,
  header: Layout,
  footer: Layout,
  nav: Layout,
  article: FileCode,
  aside: PanelRight,
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

// Interface for DOM tree nodes
interface DOMTreeNode {
  element: HTMLElement
  tagName: string
  id: string
  classList: string[]
  children: DOMTreeNode[]
  depth: number
  isExpanded: boolean
}

interface ElementInfo {
  tagName: string
  id: string
  classList: string[]
  computedStyles: Record<string, string>
  rect: DOMRect
  element: HTMLElement
}

interface ClassStyles {
  [className: string]: Record<string, string>
}

interface DevToolsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function DevToolsPanel({ isOpen, onClose }: DevToolsPanelProps) {
  // Panel state
  const [showNavigator, setShowNavigator] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [panelWidth, setPanelWidth] = useState(720)
  const [navigatorWidth, setNavigatorWidth] = useState(240)

  // Inspection state
  const [isInspecting, setIsInspecting] = useState(false)
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null)
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null)

  // DOM tree state
  const [domTree, setDomTree] = useState<DOMTreeNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // Style state
  const [classStyles, setClassStyles] = useState<ClassStyles>({})
  const [activeTab, setActiveTab] = useState("styles")
  const [activeBreakpoint, setActiveBreakpoint] = useState("base")

  // Layout properties
  const [displayMode, setDisplayMode] = useState("block")
  const [flexDirection, setFlexDirection] = useState("row")
  const [justifyContent, setJustifyContent] = useState("flex-start")
  const [alignItems, setAlignItems] = useState("center")
  const [positionAnchor, setPositionAnchor] = useState("center")

  // Class management
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [activeClass, setActiveClass] = useState<string | null>(null)
  const [newClassName, setNewClassName] = useState("")

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    selector: true,
    layout: true,
    size: true,
    spacing: true,
    position: false,
    typography: true,
    background: true,
    border: true,
    overflow: false,
  })

  // History for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Search state
  const [treeSearchQuery, setTreeSearchQuery] = useState("")
  const [treeSearchResults, setTreeSearchResults] = useState<HTMLElement[]>([])
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)

  // Class name validation
  const [classNameError, setClassNameError] = useState<string | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const styleSheetRef = useRef<HTMLStyleElement | null>(null)

  // Create dynamic stylesheet for class-based styles
  useEffect(() => {
    if (!styleSheetRef.current) {
      const style = document.createElement("style")
      style.id = "devtools-dynamic-styles"
      document.head.appendChild(style)
      styleSheetRef.current = style
    }
    return () => {
      if (styleSheetRef.current) {
        styleSheetRef.current.remove()
        styleSheetRef.current = null
      }
    }
  }, [])

  // Update dynamic stylesheet when class styles change
  useEffect(() => {
    if (!styleSheetRef.current) return
    let css = ""
    Object.entries(classStyles).forEach(([className, styles]) => {
      if (Object.keys(styles).length === 0) return
      // Escape class name for CSS
      const escapedClassName = className.replace(/[^\w-]/g, '\\$&')
      css += `.${escapedClassName} {\n`
      Object.entries(styles).forEach(([prop, val]) => {
        if (val) css += `  ${prop}: ${val} !important;\n`
      })
      css += "}\n"
    })
    styleSheetRef.current.textContent = css
  }, [classStyles])

  // Save classStyles to localStorage with quota error handling
  useEffect(() => {
    if (Object.keys(classStyles).length > 0) {
      try {
        localStorage.setItem('devtools-class-styles', JSON.stringify(classStyles))
      } catch (e) {
        // Check if it's a quota exceeded error
        if (e instanceof DOMException && (
          e.code === 22 || // Chrome/Firefox
          e.code === 1014 || // Firefox
          e.name === 'QuotaExceededError' ||
          e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        )) {
          toast.error("Storage quota exceeded", {
            description: "Your style changes couldn't be saved. Try clearing some old styles.",
            duration: 5000,
          })
        } else {
          console.warn('DevTools: Could not save styles to localStorage', e)
        }
      }
    }
  }, [classStyles])

  // Load classStyles from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('devtools-class-styles')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed === 'object' && parsed !== null) {
          setClassStyles(parsed)
        }
      }
    } catch (e) {
      // Handle corrupted data
      if (e instanceof SyntaxError) {
        toast.error("Failed to load saved styles", {
          description: "Saved style data was corrupted. Starting fresh.",
          duration: 4000,
        })
        // Clear corrupted data
        try {
          localStorage.removeItem('devtools-class-styles')
        } catch {}
      } else {
        console.warn('DevTools: Could not load styles from localStorage', e)
      }
    }
  }, [])

  // Build DOM tree from document
  const buildDOMTree = useCallback((element: HTMLElement, depth = 0): DOMTreeNode | null => {
    // Skip script, style, and devtools elements
    if (
      element.tagName === "SCRIPT" ||
      element.tagName === "STYLE" ||
      element.tagName === "NOSCRIPT" ||
      element.id === "devtools-panel" ||
      element.closest("[data-devtools]")
    ) {
      return null
    }

    const nodeId = element.id || `${element.tagName.toLowerCase()}-${depth}-${Math.random().toString(36).substr(2, 9)}`

    const children: DOMTreeNode[] = []
    Array.from(element.children).forEach((child) => {
      const childNode = buildDOMTree(child as HTMLElement, depth + 1)
      if (childNode) children.push(childNode)
    })

    return {
      element,
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      classList: Array.from(element.classList).filter(c => !c.startsWith("__")),
      children,
      depth,
      isExpanded: expandedNodes.has(nodeId),
    }
  }, [expandedNodes])

  // Refresh DOM tree
  const refreshDOMTree = useCallback(() => {
    const body = document.body
    const tree = buildDOMTree(body, 0)
    if (tree) setDomTree([tree])
  }, [buildDOMTree])

  // Initialize DOM tree and cleanup on close
  useEffect(() => {
    if (isOpen) {
      refreshDOMTree()
      // Auto-expand first few levels
      const initialExpanded = new Set<string>()
      const expandFirst = (node: DOMTreeNode, maxDepth: number) => {
        if (node.depth < maxDepth) {
          const nodeId = node.id || `${node.tagName}-${node.depth}`
          initialExpanded.add(nodeId)
          node.children.forEach(child => expandFirst(child, maxDepth))
        }
      }
      domTree.forEach(node => expandFirst(node, 2))
      setExpandedNodes(initialExpanded)
    } else {
      // Reset state when panel closes to prevent stale event listeners
      setIsInspecting(false)
      setHoveredElement(null)
      setSelectedElement(null)
    }
  }, [isOpen])

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Get computed styles for an element
  const getElementInfo = useCallback((element: HTMLElement): ElementInfo => {
    const computed = window.getComputedStyle(element)
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      classList: Array.from(element.classList),
      computedStyles: {
        display: computed.display,
        position: computed.position,
        flexDirection: computed.flexDirection,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        flexWrap: computed.flexWrap,
        gap: computed.gap,
        width: computed.width,
        height: computed.height,
        minWidth: computed.minWidth,
        maxWidth: computed.maxWidth,
        minHeight: computed.minHeight,
        maxHeight: computed.maxHeight,
        padding: computed.padding,
        paddingTop: computed.paddingTop,
        paddingRight: computed.paddingRight,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
        margin: computed.margin,
        marginTop: computed.marginTop,
        marginRight: computed.marginRight,
        marginBottom: computed.marginBottom,
        marginLeft: computed.marginLeft,
        top: computed.top,
        right: computed.right,
        bottom: computed.bottom,
        left: computed.left,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        textAlign: computed.textAlign,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius,
        borderWidth: computed.borderWidth,
        borderColor: computed.borderColor,
        borderStyle: computed.borderStyle,
        boxShadow: computed.boxShadow,
        opacity: computed.opacity,
        overflow: computed.overflow,
        overflowX: computed.overflowX,
        overflowY: computed.overflowY,
        zIndex: computed.zIndex,
      },
      rect: element.getBoundingClientRect(),
      element,
    }
  }, [])

  // Handle element inspection with throttled mousemove for performance
  useEffect(() => {
    if (!isInspecting) return

    // Throttled mousemove to prevent excessive re-renders
    const handleMouseMove = throttle((e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Skip devtools elements
      if (!target || !(target instanceof HTMLElement)) return
      if (panelRef.current?.contains(target)) return
      if (overlayRef.current?.contains(target)) return
      if (target.closest('[data-devtools="true"]')) return
      setHoveredElement(target)
    }, 16) // ~60fps

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Skip devtools elements
      if (!target || !(target instanceof HTMLElement)) return
      if (panelRef.current?.contains(target)) return
      if (overlayRef.current?.contains(target)) return
      if (target.closest('[data-devtools="true"]')) return

      e.preventDefault()
      e.stopPropagation()
      selectElement(target)
      // Keep inspecting active so user can click multiple elements
      // They can turn it off via the eyeball button or pressing Escape
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsInspecting(false)
        setHoveredElement(null)
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("click", handleClick, true)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isInspecting])

  // Get element path from body to element (for auto-expanding tree)
  const getElementPath = useCallback((element: HTMLElement): HTMLElement[] => {
    const path: HTMLElement[] = []
    let current: HTMLElement | null = element
    while (current && current !== document.body) {
      path.unshift(current)
      current = current.parentElement
    }
    return path
  }, [])

  // Generate stable node ID for an element
  const getNodeId = useCallback((element: HTMLElement, depth: number = 0): string => {
    if (element.id) return element.id
    // Use tag + index among siblings for more stability
    const parent = element.parentElement
    if (parent) {
      const siblings = Array.from(parent.children)
      const index = siblings.indexOf(element)
      return `${element.tagName.toLowerCase()}-${depth}-${index}`
    }
    return `${element.tagName.toLowerCase()}-${depth}-0`
  }, [])

  // Select an element and auto-expand path in tree
  const selectElement = useCallback((element: HTMLElement) => {
    // Check if element is still in DOM
    if (!document.body.contains(element)) {
      console.warn('DevTools: Selected element is no longer in DOM')
      return
    }

    const info = getElementInfo(element)
    setSelectedElement(info)
    setSelectedClasses(info.classList)
    setActiveClass(info.classList[0] || null)
    setDisplayMode(info.computedStyles.display)
    setFlexDirection(info.computedStyles.flexDirection)
    setJustifyContent(info.computedStyles.justifyContent)
    setAlignItems(info.computedStyles.alignItems)

    // Auto-expand path to selected element in tree
    const path = getElementPath(element)
    const nodesToExpand = new Set(expandedNodes)
    path.forEach((el, index) => {
      const nodeId = getNodeId(el, index)
      nodesToExpand.add(nodeId)
    })
    setExpandedNodes(nodesToExpand)

    refreshDOMTree()
  }, [getElementInfo, refreshDOMTree, getElementPath, getNodeId, expandedNodes])

  // Add to history for undo/redo
  const addToHistory = useCallback((entry: Omit<HistoryEntry, 'timestamp'>) => {
    setHistory(prev => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1)
      return [...newHistory, { ...entry, timestamp: Date.now() }]
    })
    setHistoryIndex(prev => prev + 1)
  }, [historyIndex])

  // Undo last style change
  const undo = useCallback(() => {
    if (historyIndex < 0) return
    const entry = history[historyIndex]
    if (!entry) return

    if (entry.type === 'class') {
      setClassStyles(prev => ({
        ...prev,
        [entry.target]: {
          ...prev[entry.target],
          [entry.property]: entry.oldValue,
        },
      }))
    } else if (selectedElement) {
      selectedElement.element.style.setProperty(entry.property, entry.oldValue)
      setSelectedElement(getElementInfo(selectedElement.element))
    }
    setHistoryIndex(prev => prev - 1)
  }, [history, historyIndex, selectedElement, getElementInfo])

  // Redo style change
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const entry = history[historyIndex + 1]
    if (!entry) return

    if (entry.type === 'class') {
      setClassStyles(prev => ({
        ...prev,
        [entry.target]: {
          ...prev[entry.target],
          [entry.property]: entry.newValue,
        },
      }))
    } else if (selectedElement) {
      selectedElement.element.style.setProperty(entry.property, entry.newValue)
      setSelectedElement(getElementInfo(selectedElement.element))
    }
    setHistoryIndex(prev => prev + 1)
  }, [history, historyIndex, selectedElement, getElementInfo])

  // Debounced element info refresh for performance
  const debouncedRefreshElementInfo = useMemo(
    () => debounce(() => {
      if (selectedElement?.element && document.body.contains(selectedElement.element)) {
        setSelectedElement(getElementInfo(selectedElement.element))
      }
    }, 100),
    [selectedElement?.element, getElementInfo]
  )

  // Apply style - supports both element and class-based styling with history
  const applyStyle = useCallback((property: string, value: string) => {
    if (!selectedElement) return

    // Get old value for history
    const oldValue = activeClass
      ? (classStyles[activeClass]?.[property] || '')
      : selectedElement.element.style.getPropertyValue(property)

    // Add to history for undo/redo
    addToHistory({
      type: activeClass ? 'class' : 'inline',
      target: activeClass || selectedElement.tagName,
      property,
      oldValue,
      newValue: value,
    })

    if (activeClass) {
      // Apply to class (affects all elements with this class)
      setClassStyles(prev => ({
        ...prev,
        [activeClass]: {
          ...prev[activeClass],
          [property]: value,
        },
      }))
    } else {
      // Apply directly to element
      selectedElement.element.style.setProperty(property, value)
    }

    // Debounced refresh for performance
    debouncedRefreshElementInfo()
  }, [selectedElement, activeClass, classStyles, addToHistory, debouncedRefreshElementInfo])

  // Apply breakpoint
  const applyBreakpoint = useCallback((bp: typeof breakpoints[0]) => {
    setActiveBreakpoint(bp.id)

    // Find main content area and resize it
    const mainContent = document.querySelector("main#main-content") as HTMLElement
    if (!mainContent) return

    if (bp.width === null) {
      // Base - full width
      mainContent.style.maxWidth = ""
      mainContent.style.margin = ""
    } else {
      mainContent.style.maxWidth = `${bp.width}px`
      mainContent.style.margin = "0 auto"
    }
  }, [])

  // RGB to Hex conversion
  const rgbToHex = (rgb: string): string => {
    if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return "#ffffff"
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (!match) return rgb
    const r = parseInt(match[1]).toString(16).padStart(2, "0")
    const g = parseInt(match[2]).toString(16).padStart(2, "0")
    const b = parseInt(match[3]).toString(16).padStart(2, "0")
    return `#${r}${g}${b}`
  }

  // Format pixel values
  const formatPixels = (val: string): string => {
    if (!val || val === "0px") return "0"
    return val.replace("px", "")
  }

  // Generate CSS output
  const generateCSS = (): string => {
    let css = ""
    Object.entries(classStyles).forEach(([className, styles]) => {
      if (Object.keys(styles).length === 0) return
      css += `.${className} {\n`
      Object.entries(styles).forEach(([prop, val]) => {
        if (val) css += `  ${prop}: ${val};\n`
      })
      css += "}\n\n"
    })
    return css || "/* No custom styles applied */\n\n/* Tip: Select an element and edit its class to see styles here */"
  }

  // Generate JSX usage code
  const generateUsageCode = (): string => {
    if (!selectedElement) return "// Select an element to see usage code"
    const tagName = selectedElement.tagName
    const classes = selectedElement.classList.join(" ")
    return `<${tagName}${classes ? ` className="${classes}"` : ""}>\n  {/* content */}\n</${tagName}>`
  }

  // Handle layout changes
  const handleDisplayChange = (mode: string) => {
    setDisplayMode(mode)
    applyStyle("display", mode)
  }

  const handleFlexDirectionChange = (dir: string) => {
    setFlexDirection(dir)
    applyStyle("flex-direction", dir)
  }

  const handleJustifyChange = (justify: string) => {
    setJustifyContent(justify)
    applyStyle("justify-content", justify)
  }

  const handleAlignChange = (align: string) => {
    setAlignItems(align)
    applyStyle("align-items", align)
  }

  // Class management with validation
  const addClass = () => {
    if (!selectedElement) return

    const trimmedName = newClassName.trim()
    setClassNameError(null)

    // Validation checks
    if (!trimmedName) {
      setClassNameError("Class name is required")
      return
    }

    if (!isValidClassName(trimmedName)) {
      setClassNameError("Invalid class name format")
      return
    }

    if (selectedClasses.includes(trimmedName)) {
      setClassNameError("Class already exists")
      return
    }

    selectedElement.element.classList.add(trimmedName)
    setSelectedClasses([...selectedClasses, trimmedName])
    setActiveClass(trimmedName)
    setNewClassName("")
    refreshDOMTree()
  }

  const removeClass = (className: string) => {
    if (!selectedElement) return
    selectedElement.element.classList.remove(className)
    const remaining = selectedClasses.filter(c => c !== className)
    setSelectedClasses(remaining)
    if (activeClass === className) {
      setActiveClass(remaining[0] || null)
    }
    // Also clear any custom styles for this class
    setClassStyles(prev => {
      const next = { ...prev }
      delete next[className]
      return next
    })
    refreshDOMTree()
  }

  // Search elements in DOM
  const searchElements = useCallback((query: string) => {
    if (!query.trim()) {
      setTreeSearchResults([])
      setCurrentSearchIndex(0)
      return
    }

    const results: HTMLElement[] = []
    const lowerQuery = query.toLowerCase()

    // Search by tag, class, or id
    document.querySelectorAll('*').forEach(el => {
      if (!(el instanceof HTMLElement)) return
      if (el.closest('[data-devtools="true"]')) return

      const tagMatch = el.tagName.toLowerCase().includes(lowerQuery)
      const idMatch = el.id?.toLowerCase().includes(lowerQuery)
      const classMatch = Array.from(el.classList).some(c => c.toLowerCase().includes(lowerQuery))
      const textMatch = el.textContent?.slice(0, 50).toLowerCase().includes(lowerQuery)

      if (tagMatch || idMatch || classMatch || textMatch) {
        results.push(el)
      }
    })

    setTreeSearchResults(results)
    setCurrentSearchIndex(0)

    // Select first result
    if (results[0]) {
      selectElement(results[0])
    }
  }, [selectElement])

  // Navigate search results
  const nextSearchResult = useCallback(() => {
    if (treeSearchResults.length === 0) return
    const nextIndex = (currentSearchIndex + 1) % treeSearchResults.length
    setCurrentSearchIndex(nextIndex)
    selectElement(treeSearchResults[nextIndex])
  }, [treeSearchResults, currentSearchIndex, selectElement])

  const prevSearchResult = useCallback(() => {
    if (treeSearchResults.length === 0) return
    const prevIndex = (currentSearchIndex - 1 + treeSearchResults.length) % treeSearchResults.length
    setCurrentSearchIndex(prevIndex)
    selectElement(treeSearchResults[prevIndex])
  }, [treeSearchResults, currentSearchIndex, selectElement])

  // Reset styles and history
  const resetStyles = () => {
    setClassStyles({})
    setHistory([])
    setHistoryIndex(-1)
    // Clear localStorage
    try {
      localStorage.removeItem('devtools-class-styles')
      toast.success("Styles reset", { duration: 2000 })
    } catch (e) {
      console.warn('DevTools: Could not clear localStorage', e)
    }
    if (selectedElement) {
      selectedElement.element.removeAttribute("style")
      setSelectedElement(getElementInfo(selectedElement.element))
    }
  }

  // Toggle node expansion in tree
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  // Render DOM tree node
  const renderTreeNode = (node: DOMTreeNode, index: number): React.ReactNode => {
    const nodeId = node.id || `${node.tagName}-${node.depth}-${index}`
    const isExpanded = expandedNodes.has(nodeId)
    const hasChildren = node.children.length > 0
    const isSelected = selectedElement?.element === node.element
    const IconComponent = elementIcons[node.tagName] || Box

    return (
      <div key={nodeId}>
        <div
          className={cn(
            "flex items-center gap-1 py-1 px-2 text-xs cursor-pointer rounded-sm transition-colors",
            "hover:bg-accent/50",
            isSelected && "bg-primary/10 text-primary"
          )}
          style={{ paddingLeft: `${node.depth * 12 + 8}px` }}
          onClick={() => selectElement(node.element)}
        >
          {hasChildren ? (
            <button
              className="p-0.5 hover:bg-accent rounded"
              onClick={(e) => {
                e.stopPropagation()
                toggleNodeExpansion(nodeId)
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          <IconComponent className="h-3 w-3 text-muted-foreground shrink-0" />

          <span className="font-mono text-chart-2">{node.tagName}</span>

          {node.id && (
            <span className="text-chart-4 font-mono">#{node.id}</span>
          )}

          {node.classList.length > 0 && (
            <span className="text-muted-foreground font-mono truncate max-w-24">
              .{node.classList[0]}
              {node.classList.length > 1 && <span className="opacity-50">+{node.classList.length - 1}</span>}
            </span>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child, i) => renderTreeNode(child, i))}
          </div>
        )}
      </div>
    )
  }

  // Update selected element rect on scroll/resize for accurate overlay positioning
  useEffect(() => {
    if (!selectedElement?.element) return

    const updateRect = throttle(() => {
      if (selectedElement?.element && document.body.contains(selectedElement.element)) {
        setSelectedElement(prev => prev ? {
          ...prev,
          rect: prev.element.getBoundingClientRect()
        } : null)
      }
    }, 16)

    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)

    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [selectedElement?.element])

  // Global keyboard shortcuts for undo/redo
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, undo, redo])

  if (!isOpen) return null

  // Get fresh rect for selected element overlay
  const selectedRect = selectedElement?.element
    ? selectedElement.element.getBoundingClientRect()
    : selectedElement?.rect

  return (
    <TooltipProvider delayDuration={300}>
      {/* Hover overlay when inspecting */}
      {isInspecting && hoveredElement && (
        <div
          ref={overlayRef}
          className="fixed pointer-events-none z-[9998] border-2 border-blue-500 bg-blue-500/10"
          style={{
            top: hoveredElement.getBoundingClientRect().top,
            left: hoveredElement.getBoundingClientRect().left,
            width: hoveredElement.getBoundingClientRect().width,
            height: hoveredElement.getBoundingClientRect().height,
          }}
        >
          <div className="absolute -top-7 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded-t whitespace-nowrap flex items-center gap-2 shadow-lg">
            <span className="font-semibold">{hoveredElement.tagName.toLowerCase()}</span>
            {hoveredElement.id && <span className="opacity-75">#{hoveredElement.id}</span>}
            {hoveredElement.classList.length > 0 && (
              <span className="opacity-75">.{Array.from(hoveredElement.classList).slice(0, 2).join(".")}</span>
            )}
            <span className="text-[10px] opacity-60 ml-2">
              {Math.round(hoveredElement.getBoundingClientRect().width)} × {Math.round(hoveredElement.getBoundingClientRect().height)}
            </span>
          </div>
        </div>
      )}

      {/* Selected element outline - uses fresh rect for scroll handling */}
      {selectedElement && !isInspecting && selectedRect && (
        <div
          className="fixed pointer-events-none z-[9997]"
          style={{
            top: selectedRect.top,
            left: selectedRect.left,
            width: selectedRect.width,
            height: selectedRect.height,
          }}
        >
          <div className="absolute inset-0 border-2 border-primary" />
          <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-t whitespace-nowrap">
            {selectedElement.tagName}
            {selectedElement.classList[0] && `.${selectedElement.classList[0]}`}
          </div>
        </div>
      )}

      {/* Main DevTools Panel */}
      <div
        ref={panelRef}
        id="devtools-panel"
        data-devtools="true"
        className={cn(
          "fixed z-[9999] bg-card border-l border-border shadow-2xl flex flex-col transition-all duration-200",
          "top-0 right-0 h-full",
          isMinimized && "h-12 overflow-hidden"
        )}
        style={{ width: isMinimized ? 48 : panelWidth }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-chart-1/20 to-chart-2/20 px-2 py-1 rounded">
              <Paintbrush className="h-4 w-4 text-chart-1" />
              <span className="text-sm font-semibold bg-gradient-to-r from-chart-1 to-chart-2 bg-clip-text text-transparent">
                DevTools
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 w-7 p-0", showNavigator && "bg-muted")}
                  onClick={() => setShowNavigator(!showNavigator)}
                >
                  <PanelLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Toggle Navigator</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 w-7 p-0", isInspecting && "bg-primary text-primary-foreground")}
                  onClick={() => setIsInspecting(!isInspecting)}
                  aria-label={isInspecting ? "Stop inspecting" : "Inspect elements"}
                >
                  {isInspecting ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isInspecting ? "Stop Inspecting (Esc)" : "Inspect Elements (click to select)"}
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4 mx-1" />

            {/* Undo/Redo buttons */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={undo}
                  disabled={historyIndex < 0}
                  aria-label="Undo"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Undo (⌘Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  aria-label="Redo"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Redo (⌘⇧Z)</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={resetStyles}
                  aria-label="Reset all styles"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Reset All Styles</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{isMinimized ? "Expand" : "Minimize"}</TooltipContent>
            </Tooltip>

            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Breakpoint Bar */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/20 shrink-0">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide mr-2">Breakpoints</span>
              <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
                {breakpoints.map((bp, idx) => (
                  <React.Fragment key={bp.id}>
                    {idx === 1 && <Separator orientation="vertical" className="h-4 mx-0.5" />}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-6 w-6 p-0 rounded-sm",
                            activeBreakpoint === bp.id && "bg-background shadow-sm"
                          )}
                          onClick={() => applyBreakpoint(bp)}
                        >
                          <bp.icon className={cn(
                            "h-3 w-3",
                            activeBreakpoint === bp.id ? "text-primary" : "text-muted-foreground"
                          )} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="flex flex-col items-center">
                        <span className="font-medium">{bp.description}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {bp.width ? `${bp.width}px` : "Full width"}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  </React.Fragment>
                ))}
              </div>
              <span className="ml-auto text-[10px] text-muted-foreground px-2 py-0.5 bg-muted rounded">
                {breakpoints.find(b => b.id === activeBreakpoint)?.description}
              </span>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
              {/* Navigator Panel */}
              {showNavigator && (
                <div
                  className="border-r border-border flex flex-col bg-muted/10"
                  style={{ width: navigatorWidth }}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Navigator</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={refreshDOMTree}
                          aria-label="Refresh tree"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh Tree</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Search bar */}
                  <div className="px-2 py-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search elements..."
                        className="h-7 text-xs pl-7 pr-16"
                        value={treeSearchQuery}
                        onChange={(e) => {
                          setTreeSearchQuery(e.target.value)
                          searchElements(e.target.value)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.shiftKey ? prevSearchResult() : nextSearchResult()
                          }
                        }}
                        aria-label="Search elements"
                      />
                      {treeSearchResults.length > 0 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            {currentSearchIndex + 1}/{treeSearchResults.length}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={prevSearchResult}
                            aria-label="Previous result"
                          >
                            <ChevronDown className="h-3 w-3 rotate-180" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={nextSearchResult}
                            aria-label="Next result"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="py-1" role="tree" aria-label="DOM tree">
                      {domTree.map((node, i) => renderTreeNode(node, i))}
                    </div>
                  </ScrollArea>

                  {/* Help tip */}
                  <div className="px-3 py-2 border-t border-border bg-muted/20">
                    <p className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                      <Info className="h-3 w-3 mt-0.5 shrink-0" />
                      Click tree nodes to select, or use the <Eye className="h-2.5 w-2.5 inline mx-0.5" /> button to click elements directly on the page.
                    </p>
                  </div>
                </div>
              )}

              {/* Style Panel */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Selected Element Info */}
                {selectedElement && (
                  <div className="px-4 py-3 bg-chart-2/5 border-b border-chart-2/20 shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono px-2 py-1 bg-chart-2/20 text-chart-2 rounded border border-chart-2/30">
                        {selectedElement.tagName}
                      </span>
                      {selectedElement.id && (
                        <span className="text-xs font-mono px-2 py-1 bg-chart-4/20 text-chart-4 rounded border border-chart-4/30">
                          #{selectedElement.id}
                        </span>
                      )}
                      {activeClass && (
                        <span className="text-xs font-mono px-2 py-1 bg-primary/20 text-primary rounded border border-primary/30">
                          .{activeClass}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="ml-1 cursor-help">
                                <HelpCircle className="h-3 w-3 inline" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Editing this class will update all elements using it
                            </TooltipContent>
                          </Tooltip>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-10 px-3 shrink-0">
                    <TabsTrigger value="styles" className="text-xs h-8 data-[state=active]:bg-muted gap-1.5">
                      <Paintbrush className="h-3 w-3" />
                      Style
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="text-xs h-8 data-[state=active]:bg-muted gap-1.5">
                      <Settings className="h-3 w-3" />
                      Settings
                    </TabsTrigger>
                    <TabsTrigger value="code" className="text-xs h-8 data-[state=active]:bg-muted gap-1.5">
                      <Code className="h-3 w-3" />
                      Code
                    </TabsTrigger>
                  </TabsList>

                  <ScrollArea className="flex-1">
                    {/* Styles Tab */}
                    <TabsContent value="styles" className="m-0 p-0">
                      {!selectedElement ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm gap-3 p-6">
                          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-2">
                            <Eye className="h-8 w-8 opacity-40" />
                          </div>
                          <p className="font-medium text-foreground text-base">No Element Selected</p>
                          <p className="text-xs text-center max-w-56">
                            Click the <Eye className="h-3 w-3 inline mx-0.5" /> button to start inspecting, then click elements to select them. Press <kbd className="px-1 py-0.5 bg-muted border rounded text-[9px] font-mono mx-0.5">Esc</kbd> to stop.
                          </p>
                          <div className="flex items-center gap-1 text-[10px] mt-3 bg-muted px-3 py-1.5 rounded-full">
                            <span className="text-muted-foreground">Toggle panel:</span>
                            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[9px] font-mono">⌘</kbd>
                            <span>+</span>
                            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[9px] font-mono">⇧</kbd>
                            <span>+</span>
                            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[9px] font-mono">D</kbd>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 space-y-5">
                          {/* Classes Section */}
                          <Collapsible open={expandedSections.selector} onOpenChange={() => toggleSection("selector")}>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground group">
                              {expandedSections.selector ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <Layers className="h-3.5 w-3.5" />
                              Selector
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-48">
                                  Select a class to edit styles globally. All elements with this class will be updated.
                                </TooltipContent>
                              </Tooltip>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-3 space-y-3">
                              <div className="flex flex-wrap gap-1.5">
                                {selectedClasses.length === 0 ? (
                                  <span className="text-xs text-muted-foreground italic">No classes on this element</span>
                                ) : (
                                  selectedClasses.map(cls => (
                                    <span
                                      key={cls}
                                      className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono cursor-pointer transition-all",
                                        activeClass === cls
                                          ? "bg-primary text-primary-foreground shadow-sm"
                                          : "bg-muted hover:bg-muted/80 border border-border hover:border-ring"
                                      )}
                                      onClick={() => setActiveClass(activeClass === cls ? null : cls)}
                                    >
                                      <span className="opacity-60">.</span>{cls}
                                      <button
                                        className={cn(
                                          "hover:text-destructive transition-colors",
                                          activeClass === cls && "hover:text-destructive-foreground"
                                        )}
                                        onClick={(e) => { e.stopPropagation(); removeClass(cls) }}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))
                                )}
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex gap-2">
                                  <Input
                                    className={cn(
                                      "h-8 text-xs flex-1 font-mono",
                                      classNameError && "border-destructive focus-visible:ring-destructive"
                                    )}
                                    placeholder="Add new class..."
                                    value={newClassName}
                                    onChange={(e) => {
                                      setNewClassName(e.target.value)
                                      setClassNameError(null) // Clear error on input
                                    }}
                                    onKeyDown={(e) => e.key === "Enter" && addClass()}
                                    aria-invalid={!!classNameError}
                                    aria-describedby={classNameError ? "class-error" : undefined}
                                  />
                                  <Button size="sm" className="h-8 px-3" onClick={addClass}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add
                                  </Button>
                                </div>
                                {classNameError && (
                                  <p id="class-error" className="text-[10px] text-destructive flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    {classNameError}
                                  </p>
                                )}
                              </div>
                              {activeClass && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-2 py-1.5 rounded">
                                  <Info className="h-3 w-3" />
                                  Editing <strong>.{activeClass}</strong> — changes apply to all elements with this class
                                </p>
                              )}
                            </CollapsibleContent>
                          </Collapsible>

                          <Separator className="my-4" />

                          {/* Layout Section */}
                          <Collapsible open={expandedSections.layout} onOpenChange={() => toggleSection("layout")}>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
                              {expandedSections.layout ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <Layout className="h-3.5 w-3.5" />
                              Layout
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4 pt-3">
                              {/* Display */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Display</Label>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-48">
                                      Controls how the element is rendered. Flex and Grid enable advanced layouts.
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="flex bg-muted rounded-lg p-1 gap-1">
                                  {["block", "flex", "grid", "inline", "none"].map(mode => (
                                    <button
                                      key={mode}
                                      className={cn(
                                        "flex-1 py-1.5 px-2 text-[10px] font-medium rounded-md transition-all",
                                        displayMode === mode
                                          ? "bg-background text-foreground shadow-sm"
                                          : "text-muted-foreground hover:text-foreground"
                                      )}
                                      onClick={() => handleDisplayChange(mode)}
                                    >
                                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Flex Controls */}
                              {(displayMode === "flex" || displayMode === "inline-flex") && (
                                <>
                                  {/* Direction */}
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Direction</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        className={cn(
                                          "flex items-center justify-center gap-2 py-2 px-3 text-xs border rounded-lg transition-all",
                                          flexDirection === "row"
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                            : "border-border hover:border-ring hover:bg-muted/50"
                                        )}
                                        onClick={() => handleFlexDirectionChange("row")}
                                      >
                                        <ArrowRight className="h-3.5 w-3.5" />
                                        Horizontal
                                      </button>
                                      <button
                                        className={cn(
                                          "flex items-center justify-center gap-2 py-2 px-3 text-xs border rounded-lg transition-all",
                                          flexDirection === "column"
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                            : "border-border hover:border-ring hover:bg-muted/50"
                                        )}
                                        onClick={() => handleFlexDirectionChange("column")}
                                      >
                                        <ArrowDown className="h-3.5 w-3.5" />
                                        Vertical
                                      </button>
                                    </div>
                                  </div>

                                  {/* Justify */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Justify</Label>
                                      <span className="text-[9px] text-muted-foreground">(main axis)</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                      {[
                                        { value: "flex-start", icon: AlignLeft, label: "Start" },
                                        { value: "center", icon: AlignCenter, label: "Center" },
                                        { value: "flex-end", icon: AlignRight, label: "End" },
                                        { value: "space-between", icon: AlignJustify, label: "Between" },
                                        { value: "stretch", icon: StretchHorizontal, label: "Stretch" },
                                      ].map(({ value, icon: Icon, label }) => (
                                        <Tooltip key={value}>
                                          <TooltipTrigger asChild>
                                            <button
                                              className={cn(
                                                "aspect-square flex items-center justify-center border rounded-lg transition-all",
                                                justifyContent === value
                                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                  : "border-border hover:border-ring hover:bg-muted/50"
                                              )}
                                              onClick={() => handleJustifyChange(value)}
                                            >
                                              <Icon className="h-4 w-4" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent>{label}</TooltipContent>
                                        </Tooltip>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Align */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Align</Label>
                                      <span className="text-[9px] text-muted-foreground">(cross axis)</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                      {[
                                        { value: "flex-start", icon: AlignLeft, label: "Start" },
                                        { value: "center", icon: AlignCenter, label: "Center" },
                                        { value: "flex-end", icon: AlignRight, label: "End" },
                                        { value: "stretch", icon: StretchVertical, label: "Stretch" },
                                        { value: "baseline", icon: Rows, label: "Baseline" },
                                      ].map(({ value, icon: Icon, label }) => (
                                        <Tooltip key={value}>
                                          <TooltipTrigger asChild>
                                            <button
                                              className={cn(
                                                "aspect-square flex items-center justify-center border rounded-lg transition-all",
                                                alignItems === value
                                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                  : "border-border hover:border-ring hover:bg-muted/50"
                                              )}
                                              onClick={() => handleAlignChange(value)}
                                            >
                                              <Icon className="h-4 w-4" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent>{label}</TooltipContent>
                                        </Tooltip>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Gap & Wrap */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Gap</Label>
                                      <DraggableInput
                                        className="h-8 text-xs"
                                        value={selectedElement.computedStyles.gap}
                                        onChange={(v) => applyStyle("gap", v)}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Wrap</Label>
                                      <Select
                                        value={selectedElement.computedStyles.flexWrap}
                                        onValueChange={(v) => applyStyle("flex-wrap", v)}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="nowrap">No Wrap</SelectItem>
                                          <SelectItem value="wrap">Wrap</SelectItem>
                                          <SelectItem value="wrap-reverse">Reverse</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Grid Controls */}
                              {(displayMode === "grid" || displayMode === "inline-grid") && (
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Columns</Label>
                                    <Input
                                      className="h-8 text-xs"
                                      placeholder="e.g., 3 or repeat(3, 1fr)"
                                      onChange={(e) => {
                                        const val = e.target.value
                                        const cols = /^\d+$/.test(val) ? `repeat(${val}, 1fr)` : val
                                        applyStyle("grid-template-columns", cols)
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Gap</Label>
                                    <DraggableInput
                                      className="h-8 text-xs"
                                      value={selectedElement.computedStyles.gap}
                                      onChange={(v) => applyStyle("gap", v)}
                                    />
                                  </div>
                                </div>
                              )}
                            </CollapsibleContent>
                          </Collapsible>

                          <Separator className="my-4" />

                          {/* Size Section */}
                          <Collapsible open={expandedSections.size} onOpenChange={() => toggleSection("size")}>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
                              {expandedSections.size ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <Move className="h-3.5 w-3.5" />
                              Size
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-3 pt-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Width</Label>
                                  <div className="flex border rounded-lg overflow-hidden">
                                    <Input
                                      className="h-8 text-xs border-0 flex-1 rounded-none focus-visible:ring-0"
                                      value={formatPixels(selectedElement.computedStyles.width)}
                                      onChange={(e) => applyStyle("width", e.target.value + "px")}
                                    />
                                    <select
                                      className="h-8 text-[10px] bg-muted border-l px-2 focus:outline-none"
                                      onChange={(e) => {
                                        const unit = e.target.value
                                        if (unit === "auto") {
                                          applyStyle("width", "auto")
                                        } else if (unit === "100%") {
                                          applyStyle("width", "100%")
                                        }
                                      }}
                                    >
                                      <option value="px">px</option>
                                      <option value="%">%</option>
                                      <option value="100%">Full</option>
                                      <option value="auto">Auto</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Height</Label>
                                  <div className="flex border rounded-lg overflow-hidden">
                                    <Input
                                      className="h-8 text-xs border-0 flex-1 rounded-none focus-visible:ring-0"
                                      value={formatPixels(selectedElement.computedStyles.height)}
                                      onChange={(e) => applyStyle("height", e.target.value + "px")}
                                    />
                                    <select
                                      className="h-8 text-[10px] bg-muted border-l px-2 focus:outline-none"
                                      onChange={(e) => {
                                        const unit = e.target.value
                                        if (unit === "auto") {
                                          applyStyle("height", "auto")
                                        } else if (unit === "100%") {
                                          applyStyle("height", "100%")
                                        }
                                      }}
                                    >
                                      <option value="px">px</option>
                                      <option value="%">%</option>
                                      <option value="100%">Full</option>
                                      <option value="auto">Auto</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                <div>
                                  <Label className="text-[9px] text-muted-foreground uppercase mb-1.5 block">Min W</Label>
                                  <DraggableInput
                                    className="h-7 text-xs"
                                    value={selectedElement.computedStyles.minWidth}
                                    onChange={(v) => applyStyle("min-width", v)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-[9px] text-muted-foreground uppercase mb-1.5 block">Max W</Label>
                                  <DraggableInput
                                    className="h-7 text-xs"
                                    value={selectedElement.computedStyles.maxWidth}
                                    onChange={(v) => applyStyle("max-width", v)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-[9px] text-muted-foreground uppercase mb-1.5 block">Min H</Label>
                                  <DraggableInput
                                    className="h-7 text-xs"
                                    value={selectedElement.computedStyles.minHeight}
                                    onChange={(v) => applyStyle("min-height", v)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-[9px] text-muted-foreground uppercase mb-1.5 block">Max H</Label>
                                  <DraggableInput
                                    className="h-7 text-xs"
                                    value={selectedElement.computedStyles.maxHeight}
                                    onChange={(v) => applyStyle("max-height", v)}
                                  />
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>

                          <Separator className="my-4" />

                          {/* Spacing Section */}
                          <Collapsible open={expandedSections.spacing} onOpenChange={() => toggleSection("spacing")}>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
                              {expandedSections.spacing ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <Box className="h-3.5 w-3.5" />
                              Spacing
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-3 pt-3">
                              {/* Legend */}
                              <div className="flex justify-center gap-6 text-[10px] uppercase tracking-wide">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-3 h-3 rounded bg-orange-500/20 border border-dashed border-orange-500" />
                                  <span className="text-muted-foreground">Margin</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <span className="w-3 h-3 rounded bg-green-500/20 border border-dashed border-green-500" />
                                  <span className="text-muted-foreground">Padding</span>
                                </span>
                              </div>

                              {/* Visual Spacing Box */}
                              <div className="relative">
                                {/* Margin */}
                                <div className="border-2 border-dashed border-orange-500/50 bg-orange-500/5 p-6 rounded-lg relative">
                                  <span className="absolute top-1 left-2 text-[9px] font-semibold uppercase text-orange-500">Margin</span>
                                  <Input
                                    className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-6 text-[10px] text-center p-0 bg-background border-orange-500/30"
                                    value={formatPixels(selectedElement.computedStyles.marginTop)}
                                    onChange={(e) => applyStyle("margin-top", e.target.value + "px")}
                                  />
                                  <Input
                                    className="absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-6 text-[10px] text-center p-0 bg-background border-orange-500/30"
                                    value={formatPixels(selectedElement.computedStyles.marginBottom)}
                                    onChange={(e) => applyStyle("margin-bottom", e.target.value + "px")}
                                  />
                                  <Input
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-6 text-[10px] text-center p-0 bg-background border-orange-500/30"
                                    value={formatPixels(selectedElement.computedStyles.marginLeft)}
                                    onChange={(e) => applyStyle("margin-left", e.target.value + "px")}
                                  />
                                  <Input
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-6 text-[10px] text-center p-0 bg-background border-orange-500/30"
                                    value={formatPixels(selectedElement.computedStyles.marginRight)}
                                    onChange={(e) => applyStyle("margin-right", e.target.value + "px")}
                                  />

                                  {/* Padding */}
                                  <div className="border-2 border-dashed border-green-500/50 bg-green-500/5 p-6 rounded-lg relative">
                                    <span className="absolute top-1 left-2 text-[9px] font-semibold uppercase text-green-500">Padding</span>
                                    <Input
                                      className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-6 text-[10px] text-center p-0 bg-background border-green-500/30"
                                      value={formatPixels(selectedElement.computedStyles.paddingTop)}
                                      onChange={(e) => applyStyle("padding-top", e.target.value + "px")}
                                    />
                                    <Input
                                      className="absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-6 text-[10px] text-center p-0 bg-background border-green-500/30"
                                      value={formatPixels(selectedElement.computedStyles.paddingBottom)}
                                      onChange={(e) => applyStyle("padding-bottom", e.target.value + "px")}
                                    />
                                    <Input
                                      className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-6 text-[10px] text-center p-0 bg-background border-green-500/30"
                                      value={formatPixels(selectedElement.computedStyles.paddingLeft)}
                                      onChange={(e) => applyStyle("padding-left", e.target.value + "px")}
                                    />
                                    <Input
                                      className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-6 text-[10px] text-center p-0 bg-background border-green-500/30"
                                      value={formatPixels(selectedElement.computedStyles.paddingRight)}
                                      onChange={(e) => applyStyle("padding-right", e.target.value + "px")}
                                    />

                                    {/* Content */}
                                    <div className="bg-muted h-8 rounded flex items-center justify-center">
                                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Content</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Gap */}
                              <div>
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Gap (for flex/grid)</Label>
                                <DraggableInput
                                  className="h-8 text-xs"
                                  value={selectedElement.computedStyles.gap}
                                  onChange={(v) => applyStyle("gap", v)}
                                />
                              </div>
                            </CollapsibleContent>
                          </Collapsible>

                          <Separator className="my-4" />

                          {/* Position Section */}
                          <Collapsible open={expandedSections.position} onOpenChange={() => toggleSection("position")}>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
                              {expandedSections.position ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <Grip className="h-3.5 w-3.5" />
                              Position
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4 pt-3">
                              <Select
                                value={selectedElement.computedStyles.position}
                                onValueChange={(v) => applyStyle("position", v)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="static">Static (default)</SelectItem>
                                  <SelectItem value="relative">Relative</SelectItem>
                                  <SelectItem value="absolute">Absolute</SelectItem>
                                  <SelectItem value="fixed">Fixed</SelectItem>
                                  <SelectItem value="sticky">Sticky</SelectItem>
                                </SelectContent>
                              </Select>

                              {/* 9-point Position Grid */}
                              <div>
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Anchor Point</Label>
                                <div className="grid grid-cols-3 gap-1.5 p-3 bg-muted rounded-lg w-fit mx-auto">
                                  {[
                                    { id: "tl", styles: { top: "0", left: "0" } },
                                    { id: "tc", styles: { top: "0", left: "50%", transform: "translateX(-50%)" } },
                                    { id: "tr", styles: { top: "0", right: "0" } },
                                    { id: "ml", styles: { top: "50%", left: "0", transform: "translateY(-50%)" } },
                                    { id: "mc", styles: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" } },
                                    { id: "mr", styles: { top: "50%", right: "0", transform: "translateY(-50%)" } },
                                    { id: "bl", styles: { bottom: "0", left: "0" } },
                                    { id: "bc", styles: { bottom: "0", left: "50%", transform: "translateX(-50%)" } },
                                    { id: "br", styles: { bottom: "0", right: "0" } },
                                  ].map(({ id }) => (
                                    <button
                                      key={id}
                                      className={cn(
                                        "w-8 h-8 border rounded-md flex items-center justify-center transition-all",
                                        positionAnchor === id
                                          ? "bg-primary border-primary shadow-sm"
                                          : "bg-background border-border hover:border-ring"
                                      )}
                                      onClick={() => setPositionAnchor(id)}
                                    >
                                      <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        positionAnchor === id ? "bg-primary-foreground" : "bg-muted-foreground"
                                      )} />
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Top</Label>
                                  <DraggableInput
                                    className="h-8 text-xs"
                                    value={selectedElement.computedStyles.top}
                                    onChange={(v) => applyStyle("top", v)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Right</Label>
                                  <DraggableInput
                                    className="h-8 text-xs"
                                    value={selectedElement.computedStyles.right}
                                    onChange={(v) => applyStyle("right", v)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Bottom</Label>
                                  <DraggableInput
                                    className="h-8 text-xs"
                                    value={selectedElement.computedStyles.bottom}
                                    onChange={(v) => applyStyle("bottom", v)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Left</Label>
                                  <DraggableInput
                                    className="h-8 text-xs"
                                    value={selectedElement.computedStyles.left}
                                    onChange={(v) => applyStyle("left", v)}
                                  />
                                </div>
                              </div>

                              <div>
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Z-Index</Label>
                                <DraggableInput
                                  className="h-8 text-xs"
                                  value={selectedElement.computedStyles.zIndex}
                                  onChange={(v) => applyStyle("z-index", v)}
                                  unit=""
                                />
                              </div>
                            </CollapsibleContent>
                          </Collapsible>

                          <Separator className="my-4" />

                          {/* Typography Section */}
                          <Collapsible open={expandedSections.typography} onOpenChange={() => toggleSection("typography")}>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
                              {expandedSections.typography ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <Type className="h-3.5 w-3.5" />
                              Typography
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-3 pt-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Font Size</Label>
                                  <DraggableInput
                                    className="h-8 text-xs"
                                    value={selectedElement.computedStyles.fontSize}
                                    onChange={(v) => applyStyle("font-size", v)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Weight</Label>
                                  <Select
                                    value={selectedElement.computedStyles.fontWeight}
                                    onValueChange={(v) => applyStyle("font-weight", v)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="300">Light</SelectItem>
                                      <SelectItem value="400">Regular</SelectItem>
                                      <SelectItem value="500">Medium</SelectItem>
                                      <SelectItem value="600">Semibold</SelectItem>
                                      <SelectItem value="700">Bold</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Line Height</Label>
                                  <DraggableInput
                                    className="h-8 text-xs"
                                    value={selectedElement.computedStyles.lineHeight}
                                    onChange={(v) => applyStyle("line-height", v)}
                                    unit=""
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Letter Spacing</Label>
                                  <DraggableInput
                                    className="h-8 text-xs"
                                    value={selectedElement.computedStyles.letterSpacing}
                                    onChange={(v) => applyStyle("letter-spacing", v)}
                                    step={0.1}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Text Color</Label>
                                <TokenSelector
                                  value={rgbToHex(selectedElement.computedStyles.color)}
                                  onChange={(v) => applyStyle("color", v)}
                                  tokens={colorTokens}
                                  type="color"
                                />
                              </div>
                            </CollapsibleContent>
                          </Collapsible>

                          <Separator className="my-4" />

                          {/* Background Section */}
                          <Collapsible open={expandedSections.background} onOpenChange={() => toggleSection("background")}>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
                              {expandedSections.background ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <Paintbrush className="h-3.5 w-3.5" />
                              Background
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-3 pt-3">
                              <div>
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Color</Label>
                                <TokenSelector
                                  value={rgbToHex(selectedElement.computedStyles.backgroundColor)}
                                  onChange={(v) => applyStyle("background-color", v)}
                                  tokens={colorTokens}
                                  type="color"
                                />
                              </div>
                            </CollapsibleContent>
                          </Collapsible>

                          <Separator className="my-4" />

                          {/* Border Section */}
                          <Collapsible open={expandedSections.border} onOpenChange={() => toggleSection("border")}>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
                              {expandedSections.border ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <Box className="h-3.5 w-3.5" />
                              Border
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-3 pt-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Radius</Label>
                                  <TokenSelector
                                    value={selectedElement.computedStyles.borderRadius}
                                    onChange={(v) => applyStyle("border-radius", v)}
                                    tokens={radiusTokens}
                                    type="size"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Width</Label>
                                  <DraggableInput
                                    className="h-8 text-xs"
                                    value={selectedElement.computedStyles.borderWidth}
                                    onChange={(v) => applyStyle("border-width", v)}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Color</Label>
                                <TokenSelector
                                  value={rgbToHex(selectedElement.computedStyles.borderColor)}
                                  onChange={(v) => applyStyle("border-color", v)}
                                  tokens={colorTokens}
                                  type="color"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 block">Style</Label>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {["none", "solid", "dashed", "dotted"].map(style => (
                                    <button
                                      key={style}
                                      className={cn(
                                        "py-1.5 px-2 text-[10px] border rounded-md capitalize transition-all",
                                        selectedElement.computedStyles.borderStyle === style
                                          ? "bg-primary text-primary-foreground border-primary"
                                          : "border-border hover:border-ring"
                                      )}
                                      onClick={() => applyStyle("border-style", style)}
                                    >
                                      {style}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>

                          <Separator className="my-4" />

                          {/* Overflow Section */}
                          <Collapsible open={expandedSections.overflow} onOpenChange={() => toggleSection("overflow")}>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
                              {expandedSections.overflow ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <Layers className="h-3.5 w-3.5" />
                              Overflow
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-3 pt-3">
                              <div className="grid grid-cols-4 gap-1.5">
                                {["visible", "hidden", "scroll", "auto"].map(overflow => (
                                  <button
                                    key={overflow}
                                    className={cn(
                                      "py-2 px-2 text-[10px] border rounded-md capitalize transition-all",
                                      selectedElement.computedStyles.overflow === overflow
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "border-border hover:border-ring"
                                    )}
                                    onClick={() => applyStyle("overflow", overflow)}
                                  >
                                    {overflow}
                                  </button>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>

                          {/* Extra spacing at bottom */}
                          <div className="h-8" />
                        </div>
                      )}
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="m-0 p-4">
                      {selectedElement ? (
                        <div className="space-y-5">
                          <div>
                            <Label className="text-xs font-semibold mb-3 block">Element Information</Label>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <span className="text-[10px] text-muted-foreground uppercase w-16">Tag</span>
                                <code className="text-xs font-mono bg-background px-2 py-1 rounded">{selectedElement.tagName}</code>
                              </div>
                              {selectedElement.id && (
                                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                  <span className="text-[10px] text-muted-foreground uppercase w-16">ID</span>
                                  <code className="text-xs font-mono bg-background px-2 py-1 rounded">#{selectedElement.id}</code>
                                </div>
                              )}
                              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <span className="text-[10px] text-muted-foreground uppercase w-16">Classes</span>
                                <div className="flex flex-wrap gap-1">
                                  {selectedElement.classList.length > 0 ? (
                                    selectedElement.classList.map(cls => (
                                      <code key={cls} className="text-xs font-mono bg-background px-2 py-1 rounded">.{cls}</code>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">None</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <Label className="text-xs font-semibold mb-3 block">Computed Dimensions</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-muted rounded-lg">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Width</span>
                                <p className="font-mono text-sm">{Math.round(selectedElement.rect.width)}px</p>
                              </div>
                              <div className="p-3 bg-muted rounded-lg">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Height</span>
                                <p className="font-mono text-sm">{Math.round(selectedElement.rect.height)}px</p>
                              </div>
                              <div className="p-3 bg-muted rounded-lg">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Top</span>
                                <p className="font-mono text-sm">{Math.round(selectedElement.rect.top)}px</p>
                              </div>
                              <div className="p-3 bg-muted rounded-lg">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Left</span>
                                <p className="font-mono text-sm">{Math.round(selectedElement.rect.left)}px</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground text-sm py-12">
                          <Settings className="h-8 w-8 mx-auto mb-3 opacity-40" />
                          <p>Select an element to view settings</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Code Tab */}
                    <TabsContent value="code" className="m-0 p-4">
                      <div className="space-y-5">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-xs font-semibold">JSX Usage</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px]"
                              onClick={() => navigator.clipboard.writeText(generateUsageCode())}
                            >
                              <Copy className="h-3 w-3 mr-1.5" />
                              Copy
                            </Button>
                          </div>
                          <pre className="p-4 bg-muted rounded-lg text-[11px] font-mono overflow-auto max-h-32 whitespace-pre-wrap border">
                            {generateUsageCode()}
                          </pre>
                        </div>

                        <Separator />

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-xs font-semibold">Generated CSS</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px]"
                              onClick={() => navigator.clipboard.writeText(generateCSS())}
                            >
                              <Copy className="h-3 w-3 mr-1.5" />
                              Copy
                            </Button>
                          </div>
                          <pre className="p-4 bg-muted rounded-lg text-[11px] font-mono overflow-auto max-h-64 whitespace-pre-wrap border">
                            {generateCSS()}
                          </pre>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 flex-1"
                            onClick={resetStyles}
                          >
                            <RotateCcw className="h-3 w-3 mr-1.5" />
                            Reset All Styles
                          </Button>
                        </div>

                        <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
                          <p className="text-[10px] text-muted-foreground flex items-start gap-2">
                            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            Styles applied to classes affect all elements with that class globally. Copy the generated CSS to use in your stylesheets.
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              </div>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}

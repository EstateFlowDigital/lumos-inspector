"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback, useMemo, useRef } from "react"

// ============================================
// Panel State Context - UI panel visibility
// ============================================
interface PanelStateContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  showNavigator: boolean
  setShowNavigator: (show: boolean) => void
  showInspector: boolean
  setShowInspector: (show: boolean) => void
  showAddElement: boolean
  setShowAddElement: (show: boolean) => void
  activeTab: string
  setActiveTab: (tab: string) => void
}

const PanelStateContext = createContext<PanelStateContextType | null>(null)

export function usePanelState() {
  const context = useContext(PanelStateContext)
  if (!context) {
    throw new Error("usePanelState must be used within PanelStateProvider")
  }
  return context
}

export function PanelStateProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [showNavigator, setShowNavigator] = useState(true)
  const [showInspector, setShowInspector] = useState(true)
  const [showAddElement, setShowAddElement] = useState(false)
  const [activeTab, setActiveTab] = useState("styles")

  const value = useMemo(() => ({
    isOpen,
    setIsOpen,
    showNavigator,
    setShowNavigator,
    showInspector,
    setShowInspector,
    showAddElement,
    setShowAddElement,
    activeTab,
    setActiveTab,
  }), [isOpen, showNavigator, showInspector, showAddElement, activeTab])

  return (
    <PanelStateContext.Provider value={value}>
      {children}
    </PanelStateContext.Provider>
  )
}

// ============================================
// Selection Context - Element selection state
// ============================================
interface ElementInfo {
  tagName: string
  id: string
  classList: string[]
  computedStyles: Record<string, string>
  rect: DOMRect
  element: HTMLElement
  path?: string
}

interface SelectionContextType {
  selectedElement: ElementInfo | null
  setSelectedElement: (element: ElementInfo | null) => void
  hoveredElement: HTMLElement | null
  setHoveredElement: (element: HTMLElement | null) => void
  activeClass: string | null
  setActiveClass: (className: string | null) => void
  isInspecting: boolean
  setIsInspecting: (inspecting: boolean) => void
}

const SelectionContext = createContext<SelectionContextType | null>(null)

export function useSelection() {
  const context = useContext(SelectionContext)
  if (!context) {
    throw new Error("useSelection must be used within SelectionProvider")
  }
  return context
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null)
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null)
  const [activeClass, setActiveClass] = useState<string | null>(null)
  const [isInspecting, setIsInspecting] = useState(false)

  const value = useMemo(() => ({
    selectedElement,
    setSelectedElement,
    hoveredElement,
    setHoveredElement,
    activeClass,
    setActiveClass,
    isInspecting,
    setIsInspecting,
  }), [selectedElement, hoveredElement, activeClass, isInspecting])

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  )
}

// ============================================
// Breakpoint Context - Responsive preview state
// ============================================
interface BreakpointContextType {
  activeBreakpoint: string
  setActiveBreakpoint: (breakpoint: string) => void
  previewWidth: number | null
  setPreviewWidth: (width: number | null) => void
}

const BreakpointContext = createContext<BreakpointContextType | null>(null)

export function useBreakpoint() {
  const context = useContext(BreakpointContext)
  if (!context) {
    throw new Error("useBreakpoint must be used within BreakpointProvider")
  }
  return context
}

export function BreakpointProvider({ children }: { children: React.ReactNode }) {
  const [activeBreakpoint, setActiveBreakpoint] = useState("base")
  const [previewWidth, setPreviewWidth] = useState<number | null>(null)

  const value = useMemo(() => ({
    activeBreakpoint,
    setActiveBreakpoint,
    previewWidth,
    setPreviewWidth,
  }), [activeBreakpoint, previewWidth])

  return (
    <BreakpointContext.Provider value={value}>
      {children}
    </BreakpointContext.Provider>
  )
}

// ============================================
// Style Change Context - Tracks style mutations
// ============================================
interface StyleChangeContextType {
  styleChangeCounter: number
  notifyStyleChange: () => void
  classStyles: Record<string, Record<string, string>>
  updateClassStyle: (className: string, property: string, value: string) => void
}

const StyleChangeContext = createContext<StyleChangeContextType | null>(null)

export function useStyleChange() {
  const context = useContext(StyleChangeContext)
  if (!context) {
    throw new Error("useStyleChange must be used within StyleChangeProvider")
  }
  return context
}

export function StyleChangeProvider({ children }: { children: React.ReactNode }) {
  const [styleChangeCounter, setStyleChangeCounter] = useState(0)
  const [classStyles, setClassStyles] = useState<Record<string, Record<string, string>>>({})

  const notifyStyleChange = useCallback(() => {
    setStyleChangeCounter(prev => prev + 1)
  }, [])

  const updateClassStyle = useCallback((className: string, property: string, value: string) => {
    setClassStyles(prev => ({
      ...prev,
      [className]: {
        ...(prev[className] || {}),
        [property]: value,
      },
    }))
    setStyleChangeCounter(prev => prev + 1)
  }, [])

  const value = useMemo(() => ({
    styleChangeCounter,
    notifyStyleChange,
    classStyles,
    updateClassStyle,
  }), [styleChangeCounter, notifyStyleChange, classStyles, updateClassStyle])

  return (
    <StyleChangeContext.Provider value={value}>
      {children}
    </StyleChangeContext.Provider>
  )
}

// ============================================
// History Context - Undo/Redo state
// ============================================
interface HistoryEntry {
  type: 'class' | 'inline'
  target: string
  property: string
  oldValue: string
  newValue: string
  timestamp: number
}

interface HistoryContextType {
  history: HistoryEntry[]
  historyIndex: number
  addToHistory: (entry: Omit<HistoryEntry, 'timestamp'>) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

const HistoryContext = createContext<HistoryContextType | null>(null)

export function useHistory() {
  const context = useContext(HistoryContext)
  if (!context) {
    throw new Error("useHistory must be used within HistoryProvider")
  }
  return context
}

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const addToHistory = useCallback((entry: Omit<HistoryEntry, 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      timestamp: Date.now(),
    }
    setHistory(prev => {
      const truncated = prev.slice(0, historyIndex + 1)
      return [...truncated, newEntry]
    })
    setHistoryIndex(prev => prev + 1)
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      setHistoryIndex(prev => prev - 1)
    }
  }, [historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1)
    }
  }, [history.length, historyIndex])

  const value = useMemo(() => ({
    history,
    historyIndex,
    addToHistory,
    undo,
    redo,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
  }), [history, historyIndex, addToHistory, undo, redo])

  return (
    <HistoryContext.Provider value={value}>
      {children}
    </HistoryContext.Provider>
  )
}

// ============================================
// Combined Provider - Wraps all contexts
// ============================================
export function InspectorContextProvider({ children }: { children: React.ReactNode }) {
  return (
    <PanelStateProvider>
      <SelectionProvider>
        <BreakpointProvider>
          <StyleChangeProvider>
            <HistoryProvider>
              {children}
            </HistoryProvider>
          </StyleChangeProvider>
        </BreakpointProvider>
      </SelectionProvider>
    </PanelStateProvider>
  )
}

// Re-export all hooks
export {
  type ElementInfo,
  type HistoryEntry,
}

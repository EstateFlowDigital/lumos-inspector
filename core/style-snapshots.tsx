"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import {
  Camera,
  GitCompare,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  Clock,
  Tag,
  ChevronRight,
  Check,
  X,
  Copy,
  ArrowLeftRight,
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"

// Snapshot of an element's styles
export interface ElementSnapshot {
  selector: string
  tagName: string
  className: string
  id: string
  computedStyles: Record<string, string>
  inlineStyles: Record<string, string>
  boundingRect: {
    width: number
    height: number
    top: number
    left: number
  }
}

// Full page snapshot
export interface StyleSnapshot {
  id: string
  name: string
  description?: string
  timestamp: number
  elements: ElementSnapshot[]
  globalCSS: string
  metadata: {
    url: string
    viewportWidth: number
    viewportHeight: number
    userAgent: string
  }
}

// Diff result between two snapshots
export interface SnapshotDiff {
  added: ElementSnapshot[]
  removed: ElementSnapshot[]
  modified: {
    element: ElementSnapshot
    changes: {
      property: string
      before: string
      after: string
    }[]
  }[]
}

// Storage key for snapshots
const STORAGE_KEY = "lumos-style-snapshots"

// Generate unique ID
function generateId(): string {
  return `snap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Get element selector
function getElementSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`
  }

  const classes = Array.from(element.classList).filter(
    (c) => !c.startsWith("lumos-") && !c.includes("__")
  )

  if (classes.length > 0) {
    return `${element.tagName.toLowerCase()}.${classes.slice(0, 2).join(".")}`
  }

  return element.tagName.toLowerCase()
}

// Capture styles from an element
function captureElementStyles(element: HTMLElement): ElementSnapshot {
  const computed = window.getComputedStyle(element)
  const rect = element.getBoundingClientRect()

  // Capture important computed styles
  const styleProperties = [
    "display", "position", "width", "height", "padding", "margin",
    "border", "background", "color", "font-size", "font-weight",
    "flex", "grid", "gap", "opacity", "transform", "box-shadow",
  ]

  const computedStyles: Record<string, string> = {}
  styleProperties.forEach((prop) => {
    computedStyles[prop] = computed.getPropertyValue(prop)
  })

  // Capture inline styles
  const inlineStyles: Record<string, string> = {}
  for (let i = 0; i < element.style.length; i++) {
    const prop = element.style[i]
    inlineStyles[prop] = element.style.getPropertyValue(prop)
  }

  return {
    selector: getElementSelector(element),
    tagName: element.tagName.toLowerCase(),
    className: element.className,
    id: element.id,
    computedStyles,
    inlineStyles,
    boundingRect: {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
    },
  }
}

// Create a full page snapshot
export function createSnapshot(
  name: string,
  elements?: HTMLElement[],
  globalCSS?: string
): StyleSnapshot {
  const targetElements = elements || Array.from(
    document.querySelectorAll("body *:not(script):not(style):not(link)")
  ).slice(0, 100) as HTMLElement[]

  return {
    id: generateId(),
    name,
    timestamp: Date.now(),
    elements: targetElements.map(captureElementStyles),
    globalCSS: globalCSS || "",
    metadata: {
      url: window.location.href,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      userAgent: navigator.userAgent,
    },
  }
}

// Compare two snapshots
export function compareSnapshots(before: StyleSnapshot, after: StyleSnapshot): SnapshotDiff {
  const beforeMap = new Map(before.elements.map((e) => [e.selector, e]))
  const afterMap = new Map(after.elements.map((e) => [e.selector, e]))

  const added: ElementSnapshot[] = []
  const removed: ElementSnapshot[] = []
  const modified: SnapshotDiff["modified"] = []

  // Find removed elements
  beforeMap.forEach((element, selector) => {
    if (!afterMap.has(selector)) {
      removed.push(element)
    }
  })

  // Find added and modified elements
  afterMap.forEach((afterElement, selector) => {
    const beforeElement = beforeMap.get(selector)

    if (!beforeElement) {
      added.push(afterElement)
    } else {
      // Check for changes
      const changes: { property: string; before: string; after: string }[] = []

      Object.entries(afterElement.computedStyles).forEach(([prop, afterValue]) => {
        const beforeValue = beforeElement.computedStyles[prop]
        if (beforeValue !== afterValue) {
          changes.push({ property: prop, before: beforeValue, after: afterValue })
        }
      })

      if (changes.length > 0) {
        modified.push({ element: afterElement, changes })
      }
    }
  })

  return { added, removed, modified }
}

// Context for snapshots
interface SnapshotContextType {
  snapshots: StyleSnapshot[]
  selectedSnapshot: StyleSnapshot | null
  comparisonSnapshot: StyleSnapshot | null
  takeSnapshot: (name: string, elements?: HTMLElement[]) => StyleSnapshot
  deleteSnapshot: (id: string) => void
  selectSnapshot: (snapshot: StyleSnapshot | null) => void
  setComparisonSnapshot: (snapshot: StyleSnapshot | null) => void
  restoreSnapshot: (snapshot: StyleSnapshot) => void
  exportSnapshots: () => string
  importSnapshots: (json: string) => void
  clearAll: () => void
}

const SnapshotContext = React.createContext<SnapshotContextType | null>(null)

export function useSnapshots() {
  const context = React.useContext(SnapshotContext)
  if (!context) {
    throw new Error("useSnapshots must be used within SnapshotProvider")
  }
  return context
}

// Provider component
export function SnapshotProvider({ children }: { children: React.ReactNode }) {
  const [snapshots, setSnapshots] = useState<StyleSnapshot[]>([])
  const [selectedSnapshot, setSelectedSnapshot] = useState<StyleSnapshot | null>(null)
  const [comparisonSnapshot, setComparisonSnapshot] = useState<StyleSnapshot | null>(null)

  // Load from localStorage
  useEffect(() => {
    if (typeof localStorage === "undefined") return

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setSnapshots(JSON.parse(saved))
      }
    } catch {
      // Ignore errors
    }
  }, [])

  // Save to localStorage
  const saveSnapshots = useCallback((newSnapshots: StyleSnapshot[]) => {
    setSnapshots(newSnapshots)
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSnapshots))
    }
  }, [])

  const takeSnapshot = useCallback((name: string, elements?: HTMLElement[]) => {
    const snapshot = createSnapshot(name, elements)
    saveSnapshots([snapshot, ...snapshots])
    return snapshot
  }, [snapshots, saveSnapshots])

  const deleteSnapshot = useCallback((id: string) => {
    saveSnapshots(snapshots.filter((s) => s.id !== id))
    if (selectedSnapshot?.id === id) {
      setSelectedSnapshot(null)
    }
    if (comparisonSnapshot?.id === id) {
      setComparisonSnapshot(null)
    }
  }, [snapshots, selectedSnapshot, comparisonSnapshot, saveSnapshots])

  const restoreSnapshot = useCallback((snapshot: StyleSnapshot) => {
    // Inject stored CSS
    if (snapshot.globalCSS) {
      const styleId = "lumos-restored-styles"
      let styleElement = document.getElementById(styleId) as HTMLStyleElement | null

      if (!styleElement) {
        styleElement = document.createElement("style")
        styleElement.id = styleId
        document.head.appendChild(styleElement)
      }

      styleElement.textContent = snapshot.globalCSS
    }

    // Apply inline styles to matching elements
    snapshot.elements.forEach((elementSnapshot) => {
      try {
        const element = document.querySelector(elementSnapshot.selector) as HTMLElement
        if (element) {
          Object.entries(elementSnapshot.inlineStyles).forEach(([prop, value]) => {
            element.style.setProperty(prop, value)
          })
        }
      } catch {
        // Selector might be invalid
      }
    })
  }, [])

  const exportSnapshots = useCallback(() => {
    return JSON.stringify(snapshots, null, 2)
  }, [snapshots])

  const importSnapshots = useCallback((json: string) => {
    try {
      const imported = JSON.parse(json) as StyleSnapshot[]
      saveSnapshots([...imported, ...snapshots])
    } catch {
      console.error("Failed to import snapshots")
    }
  }, [snapshots, saveSnapshots])

  const clearAll = useCallback(() => {
    saveSnapshots([])
    setSelectedSnapshot(null)
    setComparisonSnapshot(null)
  }, [saveSnapshots])

  return (
    <SnapshotContext.Provider
      value={{
        snapshots,
        selectedSnapshot,
        comparisonSnapshot,
        takeSnapshot,
        deleteSnapshot,
        selectSnapshot: setSelectedSnapshot,
        setComparisonSnapshot,
        restoreSnapshot,
        exportSnapshots,
        importSnapshots,
        clearAll,
      }}
    >
      {children}
    </SnapshotContext.Provider>
  )
}

// Snapshot card component
interface SnapshotCardProps {
  snapshot: StyleSnapshot
  isSelected: boolean
  isComparison: boolean
  onSelect: () => void
  onCompare: () => void
  onRestore: () => void
  onDelete: () => void
}

function SnapshotCard({
  snapshot,
  isSelected,
  isComparison,
  onSelect,
  onCompare,
  onRestore,
  onDelete,
}: SnapshotCardProps) {
  const date = new Date(snapshot.timestamp)

  return (
    <div
      className={cn(
        "p-3 border rounded-lg cursor-pointer transition-all",
        isSelected && "border-primary bg-primary/5",
        isComparison && "border-orange-500 bg-orange-500/5",
        !isSelected && !isComparison && "hover:border-muted-foreground/50"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{snapshot.name}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {snapshot.elements.length} elements
            </Badge>
            {snapshot.metadata.viewportWidth && (
              <Badge variant="outline" className="text-xs">
                {snapshot.metadata.viewportWidth}×{snapshot.metadata.viewportHeight}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {isSelected && <Check className="h-4 w-4 text-primary" />}
          {isComparison && <ArrowLeftRight className="h-4 w-4 text-orange-500" />}
        </div>
      </div>

      <div className="flex items-center gap-1 mt-3 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={(e) => {
            e.stopPropagation()
            onCompare()
          }}
        >
          <GitCompare className="h-3 w-3 mr-1" />
          Compare
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={(e) => {
            e.stopPropagation()
            onRestore()
          }}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Restore
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// Diff viewer component
interface DiffViewerProps {
  diff: SnapshotDiff
  before: StyleSnapshot
  after: StyleSnapshot
}

function DiffViewer({ diff, before, after }: DiffViewerProps) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
        <Badge variant="default" className="bg-green-500">
          +{diff.added.length} added
        </Badge>
        <Badge variant="default" className="bg-red-500">
          -{diff.removed.length} removed
        </Badge>
        <Badge variant="default" className="bg-orange-500">
          ~{diff.modified.length} modified
        </Badge>
      </div>

      <ScrollArea className="h-[400px]">
        {/* Modified elements */}
        {diff.modified.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Modified Elements
            </h4>
            <div className="space-y-2">
              {diff.modified.map(({ element, changes }) => (
                <div key={element.selector} className="p-2 border rounded bg-card">
                  <code className="text-xs text-muted-foreground">{element.selector}</code>
                  <div className="mt-2 space-y-1">
                    {changes.map((change) => (
                      <div
                        key={change.property}
                        className="flex items-center gap-2 text-xs font-mono"
                      >
                        <span className="text-muted-foreground w-24 truncate">
                          {change.property}:
                        </span>
                        <span className="text-red-500 line-through">{change.before}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-green-500">{change.after}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Added elements */}
        {diff.added.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Added Elements
            </h4>
            <div className="space-y-1">
              {diff.added.map((element) => (
                <div key={element.selector} className="p-2 border rounded bg-green-500/5">
                  <code className="text-xs">{element.selector}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Removed elements */}
        {diff.removed.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Removed Elements
            </h4>
            <div className="space-y-1">
              {diff.removed.map((element) => (
                <div key={element.selector} className="p-2 border rounded bg-red-500/5">
                  <code className="text-xs line-through">{element.selector}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No differences found</p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// Main snapshots panel component
interface SnapshotsPanelProps {
  className?: string
  selectedElements?: HTMLElement[]
  globalCSS?: string
}

export function SnapshotsPanel({
  className,
  selectedElements,
  globalCSS,
}: SnapshotsPanelProps) {
  const {
    snapshots,
    selectedSnapshot,
    comparisonSnapshot,
    takeSnapshot,
    deleteSnapshot,
    selectSnapshot,
    setComparisonSnapshot,
    restoreSnapshot,
    exportSnapshots,
    importSnapshots,
    clearAll,
  } = useSnapshots()

  const [snapshotName, setSnapshotName] = useState("")
  const [showDiff, setShowDiff] = useState(false)

  const diff = useMemo(() => {
    if (!selectedSnapshot || !comparisonSnapshot) return null
    return compareSnapshots(selectedSnapshot, comparisonSnapshot)
  }, [selectedSnapshot, comparisonSnapshot])

  const handleTakeSnapshot = useCallback(() => {
    const name = snapshotName.trim() || `Snapshot ${snapshots.length + 1}`
    takeSnapshot(name, selectedElements)
    setSnapshotName("")
  }, [snapshotName, snapshots.length, takeSnapshot, selectedElements])

  const handleExport = useCallback(() => {
    const json = exportSnapshots()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "style-snapshots.json"
    a.click()
    URL.revokeObjectURL(url)
  }, [exportSnapshots])

  const handleImport = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          importSnapshots(reader.result as string)
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }, [importSnapshots])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          <h2 className="font-semibold">Style Snapshots</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleImport}>
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Take snapshot */}
      <div className="p-4 border-b">
        <div className="flex gap-2">
          <Input
            placeholder="Snapshot name..."
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleTakeSnapshot()}
          />
          <Button onClick={handleTakeSnapshot}>
            <Camera className="h-4 w-4 mr-2" />
            Capture
          </Button>
        </div>
        {selectedElements && selectedElements.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {selectedElements.length} elements selected for snapshot
          </p>
        )}
      </div>

      {/* Comparison mode */}
      {selectedSnapshot && comparisonSnapshot && (
        <div className="p-3 border-b bg-orange-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{selectedSnapshot.name}</span>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{comparisonSnapshot.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Dialog open={showDiff} onOpenChange={setShowDiff}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <GitCompare className="h-4 w-4 mr-1" />
                    View Diff
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Style Comparison</DialogTitle>
                  </DialogHeader>
                  {diff && (
                    <DiffViewer
                      diff={diff}
                      before={selectedSnapshot}
                      after={comparisonSnapshot}
                    />
                  )}
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setComparisonSnapshot(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshots list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {snapshots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No snapshots yet</p>
              <p className="text-xs">Take a snapshot to save the current styles</p>
            </div>
          ) : (
            snapshots.map((snapshot) => (
              <SnapshotCard
                key={snapshot.id}
                snapshot={snapshot}
                isSelected={selectedSnapshot?.id === snapshot.id}
                isComparison={comparisonSnapshot?.id === snapshot.id}
                onSelect={() => selectSnapshot(snapshot)}
                onCompare={() => {
                  if (selectedSnapshot && selectedSnapshot.id !== snapshot.id) {
                    setComparisonSnapshot(snapshot)
                  } else {
                    selectSnapshot(snapshot)
                  }
                }}
                onRestore={() => restoreSnapshot(snapshot)}
                onDelete={() => deleteSnapshot(snapshot.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {snapshots.length > 0 && (
        <div className="p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive"
            onClick={() => {
              if (confirm("Clear all snapshots?")) {
                clearAll()
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Snapshots
          </Button>
        </div>
      )}
    </div>
  )
}

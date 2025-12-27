"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import {
  ChevronDown, Grid3X3, RefreshCw, Eye, EyeOff, Copy
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface GridInfo {
  element: HTMLElement
  label: string
  templateColumns: string
  templateRows: string
  gap: string
  columnCount: number
  rowCount: number
  areas: string[]
  items: number
}

// Get element label
function getElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ""
  const cls = el.classList.length > 0 ? `.${Array.from(el.classList)[0]}` : ""
  return `${tag}${id}${cls}`.substring(0, 30)
}

// Parse grid template to get count
function getTrackCount(template: string): number {
  if (!template || template === "none") return 0
  return template.split(/\s+/).filter(v => v && v !== "none").length
}

// Parse grid areas
function getGridAreas(template: string): string[] {
  if (!template || template === "none") return []
  const matches = template.match(/"([^"]+)"/g)
  if (!matches) return []
  return matches.map(m => m.replace(/"/g, ""))
}

export function CSSGridInspector() {
  const { isOpen, selectedElement, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [grids, setGrids] = useState<GridInfo[]>([])
  const [showOverlay, setShowOverlay] = useState(true)
  const [selectedGrid, setSelectedGrid] = useState<GridInfo | null>(null)
  const [overlayOpacity, setOverlayOpacity] = useState(50)
  const [overlayColor, setOverlayColor] = useState("#8b5cf6")

  // Scan for grids
  const scan = useCallback(() => {
    const found: GridInfo[] = []

    document.querySelectorAll("*").forEach(el => {
      const htmlEl = el as HTMLElement
      if (htmlEl.hasAttribute("data-devtools")) return

      const computed = getComputedStyle(htmlEl)
      if (computed.display === "grid" || computed.display === "inline-grid") {
        const areas = getGridAreas(computed.gridTemplateAreas)

        found.push({
          element: htmlEl,
          label: getElementLabel(htmlEl),
          templateColumns: computed.gridTemplateColumns,
          templateRows: computed.gridTemplateRows,
          gap: computed.gap,
          columnCount: getTrackCount(computed.gridTemplateColumns),
          rowCount: getTrackCount(computed.gridTemplateRows),
          areas,
          items: htmlEl.children.length,
        })
      }
    })

    setGrids(found)

    if (found.length === 0) {
      toast.info("No CSS Grid containers found")
    } else {
      toast.success(`Found ${found.length} grid container(s)`)
    }
  }, [])

  // Auto-detect when selected element is a grid
  useEffect(() => {
    if (!selectedElement?.element) {
      setSelectedGrid(null)
      return
    }

    const computed = getComputedStyle(selectedElement.element)
    if (computed.display === "grid" || computed.display === "inline-grid") {
      const areas = getGridAreas(computed.gridTemplateAreas)

      setSelectedGrid({
        element: selectedElement.element,
        label: getElementLabel(selectedElement.element),
        templateColumns: computed.gridTemplateColumns,
        templateRows: computed.gridTemplateRows,
        gap: computed.gap,
        columnCount: getTrackCount(computed.gridTemplateColumns),
        rowCount: getTrackCount(computed.gridTemplateRows),
        areas,
        items: selectedElement.element.children.length,
      })
    } else {
      setSelectedGrid(null)
    }
  }, [selectedElement])

  // Select grid
  const selectGrid = useCallback((grid: GridInfo) => {
    const computed = getComputedStyle(grid.element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: grid.element,
      tagName: grid.element.tagName.toLowerCase(),
      id: grid.element.id,
      classList: Array.from(grid.element.classList),
      rect: grid.element.getBoundingClientRect(),
      computedStyles,
    })

    setSelectedGrid(grid)
    grid.element.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [setSelectedElement])

  // Copy grid CSS
  const copyCSS = useCallback(() => {
    if (!selectedGrid) return

    const css = `display: grid;
grid-template-columns: ${selectedGrid.templateColumns};
grid-template-rows: ${selectedGrid.templateRows};
gap: ${selectedGrid.gap};`

    navigator.clipboard.writeText(css)
    toast.success("Grid CSS copied to clipboard")
  }, [selectedGrid])

  // Grid overlay rect
  const overlayRect = useMemo(() => {
    if (!selectedGrid || !showOverlay) return null
    return selectedGrid.element.getBoundingClientRect()
  }, [selectedGrid, showOverlay])

  if (!isOpen) return null

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-violet-500" />
            <span>Grid Inspector</span>
            {grids.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1 h-4">
                {grids.length}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pt-2">
          {/* Scan button */}
          <Button variant="default" size="sm" className="w-full h-7" onClick={scan}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Find Grid Containers
          </Button>

          {/* Overlay toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Show grid overlay</Label>
              <Switch checked={showOverlay} onCheckedChange={setShowOverlay} />
            </div>
          </div>

          {/* Overlay settings */}
          {showOverlay && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={overlayColor}
                  onChange={(e) => setOverlayColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer"
                />
                <Slider
                  value={[overlayOpacity]}
                  onValueChange={([v]) => setOverlayOpacity(v)}
                  min={10}
                  max={100}
                  step={10}
                  className="flex-1"
                />
                <span className="text-[10px] w-8">{overlayOpacity}%</span>
              </div>
            </div>
          )}

          {/* Selected grid info */}
          {selectedGrid && (
            <div className="p-2 bg-violet-500/10 border border-violet-500/30 rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{selectedGrid.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1"
                  onClick={copyCSS}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-muted-foreground">Columns:</span>{" "}
                  <span className="font-mono">{selectedGrid.columnCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Rows:</span>{" "}
                  <span className="font-mono">{selectedGrid.rowCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Gap:</span>{" "}
                  <span className="font-mono">{selectedGrid.gap}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Items:</span>{" "}
                  <span className="font-mono">{selectedGrid.items}</span>
                </div>
              </div>

              <div className="text-[10px]">
                <div className="text-muted-foreground mb-1">Columns:</div>
                <code className="text-[9px] break-all block bg-muted/50 p-1 rounded">
                  {selectedGrid.templateColumns}
                </code>
              </div>

              {selectedGrid.areas.length > 0 && (
                <div className="text-[10px]">
                  <div className="text-muted-foreground mb-1">Areas:</div>
                  <div className="font-mono text-[9px] bg-muted/50 p-1 rounded">
                    {selectedGrid.areas.map((row, i) => (
                      <div key={i}>"{row}"</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grid list */}
          <ScrollArea className="h-[150px]">
            <div className="space-y-1">
              {grids.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Click Find to scan for CSS Grid containers
                </div>
              ) : (
                grids.map((grid, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-2 rounded cursor-pointer",
                      selectedGrid?.element === grid.element
                        ? "bg-violet-500/20 border border-violet-500/30"
                        : "bg-muted/30 hover:bg-muted/50"
                    )}
                    onClick={() => selectGrid(grid)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono">{grid.label}</span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {grid.columnCount}×{grid.rowCount}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      {/* Grid overlay */}
      {showOverlay && selectedGrid && overlayRect && (
        <div
          className="fixed pointer-events-none z-9988"
          data-devtools
          style={{
            left: overlayRect.left,
            top: overlayRect.top,
            width: overlayRect.width,
            height: overlayRect.height,
          }}
        >
          {/* Column lines */}
          <div
            className="absolute inset-0"
            style={{
              display: "grid",
              gridTemplateColumns: selectedGrid.templateColumns,
              gridTemplateRows: selectedGrid.templateRows,
              gap: selectedGrid.gap,
            }}
          >
            {Array.from({ length: selectedGrid.columnCount * selectedGrid.rowCount }).map((_, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: overlayColor,
                  opacity: overlayOpacity / 100,
                  border: `1px dashed ${overlayColor}`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

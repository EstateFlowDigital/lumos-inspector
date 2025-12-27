"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import {
  ChevronDown, LayoutGrid, RefreshCw, Copy, Eye
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Switch } from "../ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface SubgridInfo {
  element: HTMLElement
  label: string
  subgridType: "rows" | "columns" | "both"
  parentGrid: HTMLElement | null
  inheritedTracks: {
    columns: string
    rows: string
  }
}

// Get element label
function getElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ""
  const cls = el.classList.length > 0 ? `.${Array.from(el.classList)[0]}` : ""
  return `${tag}${id}${cls}`.substring(0, 25)
}

// Find parent grid
function findParentGrid(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement
  while (parent) {
    const display = getComputedStyle(parent).display
    if (display === "grid" || display === "inline-grid") {
      return parent
    }
    parent = parent.parentElement
  }
  return null
}

export function SubgridInspector() {
  const { isOpen, selectedElement, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [subgrids, setSubgrids] = useState<SubgridInfo[]>([])
  const [showOverlay, setShowOverlay] = useState(false)

  // Scan for subgrids
  const scan = useCallback(() => {
    const found: SubgridInfo[] = []

    document.querySelectorAll("*").forEach(el => {
      const htmlEl = el as HTMLElement
      if (htmlEl.hasAttribute("data-devtools")) return

      const computed = getComputedStyle(htmlEl)
      const display = computed.display

      if (display === "grid" || display === "inline-grid") {
        const templateColumns = computed.gridTemplateColumns
        const templateRows = computed.gridTemplateRows

        const hasSubgridColumns = templateColumns === "subgrid"
        const hasSubgridRows = templateRows === "subgrid"

        if (hasSubgridColumns || hasSubgridRows) {
          const parentGrid = findParentGrid(htmlEl)
          const parentComputed = parentGrid ? getComputedStyle(parentGrid) : null

          found.push({
            element: htmlEl,
            label: getElementLabel(htmlEl),
            subgridType: hasSubgridColumns && hasSubgridRows
              ? "both"
              : hasSubgridColumns
                ? "columns"
                : "rows",
            parentGrid,
            inheritedTracks: {
              columns: parentComputed?.gridTemplateColumns || "none",
              rows: parentComputed?.gridTemplateRows || "none",
            },
          })
        }
      }
    })

    setSubgrids(found)

    if (found.length === 0) {
      toast.info("No subgrids found")
    } else {
      toast.success(`Found ${found.length} subgrid(s)`)
    }
  }, [])

  // Check if current element can be subgrid
  const canBeSubgrid = useMemo(() => {
    if (!selectedElement?.element) return false

    const parent = findParentGrid(selectedElement.element)
    return parent !== null
  }, [selectedElement])

  // Make element a subgrid
  const makeSubgrid = useCallback((type: "rows" | "columns" | "both") => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element
    el.style.display = "grid"

    if (type === "columns" || type === "both") {
      el.style.gridTemplateColumns = "subgrid"
    }
    if (type === "rows" || type === "both") {
      el.style.gridTemplateRows = "subgrid"
    }

    toast.success("Subgrid created!")
    scan()
  }, [selectedElement, scan])

  // Remove subgrid
  const removeSubgrid = useCallback(() => {
    if (!selectedElement?.element) return

    const el = selectedElement.element
    el.style.gridTemplateColumns = ""
    el.style.gridTemplateRows = ""

    toast.success("Subgrid removed")
    scan()
  }, [selectedElement, scan])

  // Select subgrid
  const selectSubgrid = useCallback((subgrid: SubgridInfo) => {
    const computed = getComputedStyle(subgrid.element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: subgrid.element,
      tagName: subgrid.element.tagName.toLowerCase(),
      id: subgrid.element.id,
      classList: Array.from(subgrid.element.classList),
      rect: subgrid.element.getBoundingClientRect(),
      computedStyles,
    })

    subgrid.element.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [setSelectedElement])

  // Copy CSS
  const copyCSS = useCallback(() => {
    const css = `.subgrid-item {
  display: grid;
  grid-template-columns: subgrid;
  grid-template-rows: subgrid;
}`

    navigator.clipboard.writeText(css)
    toast.success("CSS copied to clipboard")
  }, [])

  if (!isOpen) return null

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-pink-500" />
            <span>Subgrid Inspector</span>
            {subgrids.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1 h-4">
                {subgrids.length}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pt-2">
          {/* Scan button */}
          <Button variant="default" size="sm" className="w-full h-7" onClick={scan}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Find Subgrids
          </Button>

          {/* Show overlay */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Show subgrid overlay</Label>
            <Switch checked={showOverlay} onCheckedChange={setShowOverlay} />
          </div>

          {/* Create subgrid */}
          {canBeSubgrid && (
            <div className="p-2 bg-pink-500/10 border border-pink-500/20 rounded space-y-2">
              <div className="text-xs font-medium">Create Subgrid</div>
              <p className="text-[10px] text-muted-foreground">
                Selected element is inside a grid. You can make it a subgrid.
              </p>
              <div className="grid grid-cols-3 gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => makeSubgrid("columns")}
                >
                  Columns
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => makeSubgrid("rows")}
                >
                  Rows
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => makeSubgrid("both")}
                >
                  Both
                </Button>
              </div>
            </div>
          )}

          {/* Subgrids list */}
          <ScrollArea className="h-[150px]">
            <div className="space-y-1">
              {subgrids.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No subgrids found. Click Find to scan.
                </div>
              ) : (
                subgrids.map((subgrid, i) => (
                  <div
                    key={i}
                    className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50"
                    onClick={() => selectSubgrid(subgrid)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono">{subgrid.label}</span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {subgrid.subgridType}
                      </Badge>
                    </div>
                    {subgrid.parentGrid && (
                      <div className="text-[10px] text-muted-foreground">
                        Parent: {getElementLabel(subgrid.parentGrid)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <Button
            variant="outline"
            size="sm"
            className="w-full h-7"
            onClick={copyCSS}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy Template CSS
          </Button>

          {/* Info */}
          <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
            <div className="font-medium mb-1">About Subgrid:</div>
            <p>Subgrid allows a nested grid to inherit its parent's track sizing, creating aligned layouts across nested elements.</p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Subgrid overlay */}
      {showOverlay && subgrids.map((subgrid, i) => {
        const rect = subgrid.element.getBoundingClientRect()
        return (
          <div
            key={i}
            className="fixed pointer-events-none z-9988 border-2 border-dashed border-pink-500"
            data-devtools
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          >
            <div className="absolute -top-5 left-0 bg-pink-500 text-white text-[9px] px-1 rounded">
              subgrid ({subgrid.subgridType})
            </div>
          </div>
        )
      })}
    </>
  )
}

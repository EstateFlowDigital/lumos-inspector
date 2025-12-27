"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import {
  ChevronDown, Box, RefreshCw, Copy, Eye, EyeOff
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface ContainerInfo {
  element: HTMLElement
  name: string
  type: string
  width: number
  height: number
  label: string
}

interface ContainerQuery {
  query: string
  matches: boolean
  source: string
}

// Container type options
const containerTypes = [
  { value: "inline-size", label: "Inline Size", description: "Query width only" },
  { value: "size", label: "Size", description: "Query width and height" },
  { value: "normal", label: "Normal", description: "Style containment only" },
]

// Get element label
function getElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ""
  const cls = el.classList.length > 0 ? `.${Array.from(el.classList)[0]}` : ""
  return `${tag}${id}${cls}`.substring(0, 25)
}

export function ContainerQueriesDebugger() {
  const { isOpen, selectedElement, setSelectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [containers, setContainers] = useState<ContainerInfo[]>([])
  const [queries, setQueries] = useState<ContainerQuery[]>([])
  const [showOverlay, setShowOverlay] = useState(false)
  const [containerName, setContainerName] = useState("")
  const [containerType, setContainerType] = useState("inline-size")

  // Scan for containers
  const scan = useCallback(() => {
    const found: ContainerInfo[] = []
    const foundQueries: ContainerQuery[] = []

    // Find container elements
    document.querySelectorAll("*").forEach(el => {
      const htmlEl = el as HTMLElement
      if (htmlEl.hasAttribute("data-devtools")) return

      const computed = getComputedStyle(htmlEl)
      const containerTypeVal = computed.containerType

      if (containerTypeVal && containerTypeVal !== "normal") {
        const rect = htmlEl.getBoundingClientRect()
        found.push({
          element: htmlEl,
          name: computed.containerName || "(unnamed)",
          type: containerTypeVal,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          label: getElementLabel(htmlEl),
        })
      }
    })

    // Find container queries in stylesheets
    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i]
        try {
          const rules = sheet.cssRules || sheet.rules
          if (!rules) continue

          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j]
            if (rule instanceof CSSContainerRule) {
              foundQueries.push({
                query: rule.conditionText,
                matches: true, // Would need more logic to determine this
                source: sheet.href?.split("/").pop() || "inline",
              })
            }
          }
        } catch (e) {
          // CORS might block access
        }
      }
    } catch (e) {
      console.error("Error scanning stylesheets", e)
    }

    setContainers(found)
    setQueries(foundQueries)

    toast.success(`Found ${found.length} container(s), ${foundQueries.length} queries`)
  }, [])

  // Check if selected element is a container
  const selectedContainerInfo = useMemo(() => {
    if (!selectedElement?.element) return null

    const computed = getComputedStyle(selectedElement.element)
    const containerTypeVal = computed.containerType

    if (containerTypeVal && containerTypeVal !== "normal") {
      const rect = selectedElement.element.getBoundingClientRect()
      return {
        name: computed.containerName || "(unnamed)",
        type: containerTypeVal,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }
    }
    return null
  }, [selectedElement])

  // Make element a container
  const makeContainer = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element
    el.style.containerType = containerType

    if (containerName) {
      el.style.containerName = containerName
    }

    notifyStyleChange()
    toast.success("Container created!")
    scan()
  }, [selectedElement, containerType, containerName, scan, notifyStyleChange])

  // Remove container
  const removeContainer = useCallback(() => {
    if (!selectedElement?.element) return

    selectedElement.element.style.containerType = ""
    selectedElement.element.style.containerName = ""

    notifyStyleChange()
    toast.success("Container removed")
    scan()
  }, [selectedElement, scan, notifyStyleChange])

  // Select container
  const selectContainer = useCallback((container: ContainerInfo) => {
    const computed = getComputedStyle(container.element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: container.element,
      tagName: container.element.tagName.toLowerCase(),
      id: container.element.id,
      classList: Array.from(container.element.classList),
      rect: container.element.getBoundingClientRect(),
      computedStyles,
    })

    container.element.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [setSelectedElement])

  // Copy CSS
  const copyCSS = useCallback(() => {
    let css = `.container {\n`
    css += `  container-type: ${containerType};\n`
    if (containerName) {
      css += `  container-name: ${containerName};\n`
    }
    css += `}\n\n`
    css += `@container ${containerName || ""} (min-width: 400px) {\n`
    css += `  .child {\n`
    css += `    /* styles */\n`
    css += `  }\n`
    css += `}\n`

    navigator.clipboard.writeText(css)
    toast.success("CSS copied to clipboard")
  }, [containerType, containerName])

  if (!isOpen) return null

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-violet-500" />
            <span>Container Queries</span>
            {containers.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1 h-4">
                {containers.length}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 pt-2">
          {/* Scan button */}
          <Button variant="default" size="sm" className="w-full h-7" onClick={scan}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Find Containers
          </Button>

          {/* Show overlay */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Show container overlay</Label>
            <Switch checked={showOverlay} onCheckedChange={setShowOverlay} />
          </div>

          {/* Selected element container info */}
          {selectedContainerInfo && (
            <div className="p-2 bg-violet-500/10 border border-violet-500/30 rounded space-y-1">
              <div className="text-xs font-medium">Current Container</div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div>Name: <span className="font-mono">{selectedContainerInfo.name}</span></div>
                <div>Type: <span className="font-mono">{selectedContainerInfo.type}</span></div>
                <div>Width: <span className="font-mono">{selectedContainerInfo.width}px</span></div>
                <div>Height: <span className="font-mono">{selectedContainerInfo.height}px</span></div>
              </div>
            </div>
          )}

          {/* Create container */}
          <div className="space-y-2 p-2 bg-muted/30 rounded">
            <div className="text-xs font-medium">Create Container</div>

            <div className="space-y-1">
              <Label className="text-[10px]">Container Name (optional)</Label>
              <Input
                value={containerName}
                onChange={(e) => setContainerName(e.target.value)}
                className="h-7 text-xs font-mono"
                placeholder="sidebar, card, etc."
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px]">Container Type</Label>
              <Select value={containerType} onValueChange={setContainerType}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {containerTypes.map(ct => (
                    <SelectItem key={ct.value} value={ct.value} className="text-xs">
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="default"
                size="sm"
                className="h-7"
                onClick={makeContainer}
                disabled={!selectedElement}
              >
                Create
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={removeContainer}
                disabled={!selectedElement || !selectedContainerInfo}
              >
                Remove
              </Button>
            </div>
          </div>

          {/* Containers list */}
          <ScrollArea className="h-[150px]">
            <div className="space-y-1">
              {containers.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No containers found. Click Find to scan.
                </div>
              ) : (
                containers.map((container, i) => (
                  <div
                    key={i}
                    className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50"
                    onClick={() => selectContainer(container)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono">{container.label}</span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {container.type}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {container.name !== "(unnamed)" && (
                        <span className="mr-2">name: {container.name}</span>
                      )}
                      <span>{container.width}×{container.height}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Queries found */}
          {queries.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Container Queries Found</div>
              {queries.slice(0, 5).map((q, i) => (
                <div key={i} className="p-1 bg-muted/30 rounded text-[10px] font-mono">
                  @container {q.query}
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full h-7"
            onClick={copyCSS}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy Template CSS
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Container overlay */}
      {showOverlay && containers.map((container, i) => {
        const rect = container.element.getBoundingClientRect()
        return (
          <div
            key={i}
            className="fixed pointer-events-none z-9988 border-2 border-dashed border-violet-500"
            data-devtools
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          >
            <div className="absolute -top-5 left-0 bg-violet-500 text-white text-[9px] px-1 rounded">
              {container.name !== "(unnamed)" ? container.name : container.label} ({container.width}px)
            </div>
          </div>
        )
      })}
    </>
  )
}

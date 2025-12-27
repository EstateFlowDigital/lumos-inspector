"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  X, Paintbrush, Undo2, Redo2, ScanLine,
  Monitor, Laptop, Tablet, Smartphone
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Separator } from "../ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { useInspector } from "./inspector-context"
import { ToolSearch } from "../tools/tool-search"

// Import tab components
import { StylesTab } from "./panels/styles-tab"
import { ComputedTab } from "./panels/computed-tab"
import { ActionsTab } from "./panels/actions-tab"
import { CodeTab } from "./panels/code-tab"

// Breakpoint definitions
const breakpoints = [
  { id: "base", label: "Base", width: null, icon: Monitor, description: "All devices" },
  { id: "1920", label: "1920", width: 1920, icon: Monitor, description: "Large Desktop" },
  { id: "1440", label: "1440", width: 1440, icon: Monitor, description: "Desktop" },
  { id: "1280", label: "1280", width: 1280, icon: Laptop, description: "Laptop" },
  { id: "991", label: "991", width: 991, icon: Tablet, description: "Tablet" },
  { id: "767", label: "767", width: 767, icon: Tablet, description: "Tablet Portrait" },
  { id: "478", label: "478", width: 478, icon: Smartphone, description: "Mobile" },
] as const

export function InspectorPanel() {
  const {
    showInspector,
    setShowInspector,
    activeBreakpoint,
    setActiveBreakpoint,
    setPreviewWidth,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useInspector()

  // Panel state
  const [activeTab, setActiveTab] = useState("styles")
  const [xRayMode, setXRayMode] = useState(false)

  // Panel resize state - load from localStorage
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lumos-inspector-width')
      return saved ? parseInt(saved, 10) : 400
    }
    return 400
  })
  const isResizingRef = React.useRef(false)
  const startXRef = React.useRef(0)
  const startWidthRef = React.useRef(400)

  // Save panel width to localStorage
  useEffect(() => {
    localStorage.setItem('lumos-inspector-width', String(panelWidth))
  }, [panelWidth])

  // Handle panel resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = panelWidth
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }, [panelWidth])

  // Double-click to reset panel width
  const handleResizeDoubleClick = useCallback(() => {
    setPanelWidth(400)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return
      const delta = startXRef.current - e.clientX
      const newWidth = Math.min(Math.max(startWidthRef.current + delta, 320), 800)
      setPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Handle breakpoint change
  const handleBreakpointChange = useCallback((breakpointId: string) => {
    setActiveBreakpoint(breakpointId)
    const bp = breakpoints.find(b => b.id === breakpointId)
    setPreviewWidth(bp?.width ?? null)
  }, [setActiveBreakpoint, setPreviewWidth])

  // Toggle X-Ray mode
  const toggleXRayMode = useCallback(() => {
    const newMode = !xRayMode
    setXRayMode(newMode)

    if (newMode) {
      document.body.classList.add("devtools-xray-mode")
    } else {
      document.body.classList.remove("devtools-xray-mode")
    }
  }, [xRayMode])

  if (!showInspector) return null

  return (
    <div
      className="fixed right-0 top-0 h-screen bg-card border-l shadow-xl z-9998 flex flex-col overflow-hidden"
      style={{ width: panelWidth }}
      data-devtools
    >
      {/* Resize handle */}
      <div
        className="absolute -left-2 top-0 w-4 h-full cursor-ew-resize z-[9999] group"
        onMouseDown={handleResizeStart}
        onDoubleClick={handleResizeDoubleClick}
        title="Drag to resize, double-click to reset"
      >
        <div className="absolute left-2 top-0 w-1 h-full bg-border group-hover:bg-primary group-active:bg-primary transition-colors" />
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-16 rounded-full bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Paintbrush className="h-4 w-4 text-chart-1" />
          <span className="font-semibold text-sm">Inspector</span>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={undo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={redo}
                disabled={!canRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={xRayMode ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 w-7 p-0",
                  xRayMode && "bg-chart-1 text-chart-1-foreground hover:bg-chart-1/90"
                )}
                onClick={toggleXRayMode}
              >
                <ScanLine className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{xRayMode ? "Disable X-Ray Mode" : "Enable X-Ray Mode"}</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowInspector(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Breakpoint selector */}
      <div className="flex items-center gap-1 p-2 border-b overflow-x-auto">
        {breakpoints.map((bp) => (
          <Tooltip key={bp.id}>
            <TooltipTrigger asChild>
              <Button
                variant={activeBreakpoint === bp.id ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs shrink-0",
                  activeBreakpoint === bp.id && "bg-chart-1 text-chart-1-foreground hover:bg-chart-1/90"
                )}
                onClick={() => handleBreakpointChange(bp.id)}
              >
                <bp.icon className="h-3 w-3 mr-1" />
                {bp.label}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{bp.description}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="grid grid-cols-5 mx-3 mt-2 shrink-0">
          <TabsTrigger value="find" className="text-xs">Find</TabsTrigger>
          <TabsTrigger value="styles" className="text-xs">Styles</TabsTrigger>
          <TabsTrigger value="computed" className="text-xs">Computed</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">Actions</TabsTrigger>
          <TabsTrigger value="code" className="text-xs">Code</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Find Tab */}
          <TabsContent value="find" className="mt-0 p-3">
            <ToolSearch />
          </TabsContent>

          {/* Styles Tab */}
          <TabsContent value="styles" className="mt-0 p-0">
            <StylesTab />
          </TabsContent>

          {/* Computed Tab */}
          <TabsContent value="computed" className="mt-0">
            <ComputedTab />
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="settings" className="mt-0">
            <ActionsTab />
          </TabsContent>

          {/* Code Tab */}
          <TabsContent value="code" className="mt-0">
            <CodeTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

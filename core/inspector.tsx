"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { Paintbrush, Layers, PanelLeft, PanelRight, Plus, Ruler, Keyboard } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../ui/tooltip"
import { useInspector } from "./inspector-context"
import { NavigatorPanel } from "./navigator-panel"
import { InspectorPanel } from "./inspector-panel"
import { InspectorOverlay } from "./inspector-overlay"
import { ElementAddPanel } from "./element-add-panel"
import { RulersOverlay } from "./rulers-overlay"
import { AlignmentGuides, ContainerAlignmentIndicator } from "./alignment-guides"
import { KeyboardShortcuts, KeyboardShortcutsHelp } from "./keyboard-shortcuts"
import { ElementBreadcrumb } from "./element-breadcrumb"
import { ContextMenuProvider } from "./context-menu"
import { MeasurementTool, SpacingMeasurement } from "./measurement-tool"

// Skip link component for keyboard navigation
function SkipLinks() {
  const { setIsOpen } = useInspector()

  const skipToMain = useCallback(() => {
    const main = document.querySelector("main") || document.querySelector("[role='main']")
    if (main instanceof HTMLElement) {
      main.tabIndex = -1
      main.focus()
      main.removeAttribute("tabindex")
    }
  }, [])

  const closeAndSkip = useCallback(() => {
    setIsOpen(false)
    skipToMain()
  }, [setIsOpen, skipToMain])

  return (
    <div className="fixed top-0 left-0 z-[99999]" data-devtools>
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          skipToMain()
        }}
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2",
          "bg-background text-foreground px-4 py-2 rounded-md shadow-lg border",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "font-medium text-sm z-[99999]"
        )}
      >
        Skip to main content
      </a>
      <button
        onClick={closeAndSkip}
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-44",
          "bg-background text-foreground px-4 py-2 rounded-md shadow-lg border",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "font-medium text-sm z-[99999]"
        )}
      >
        Close inspector & skip
      </button>
    </div>
  )
}

// Toggle button for the inspector
export function InspectorToggle() {
  const {
    isOpen,
    setIsOpen,
    showNavigator,
    setShowNavigator,
    showInspector,
    setShowInspector,
    showElementPanel,
    setShowElementPanel,
    isMeasuring,
    setIsMeasuring,
  } = useInspector()

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)

  return (
    <TooltipProvider>
      <div
        className="fixed bottom-20 left-4 z-9999 flex items-center gap-2"
        data-devtools
        role="toolbar"
        aria-label="Lumos Inspector controls"
      >
        {/* Main toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close Inspector (Ctrl+Shift+D)" : "Open Inspector (Ctrl+Shift+D)"}
              aria-expanded={isOpen}
              className={cn(
                "h-11 w-11 rounded-full shadow-lg",
                "bg-linear-to-br from-chart-1 to-chart-2 border-0 text-white",
                "hover:from-chart-1/90 hover:to-chart-2/90 hover:text-white",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isOpen && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <Paintbrush className="h-5 w-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isOpen ? "Close Inspector (Ctrl+Shift+D)" : "Open Inspector (Ctrl+Shift+D)"}
          </TooltipContent>
        </Tooltip>

        {/* Panel toggles when open */}
        {isOpen && (
          <div className="flex items-center gap-1 bg-card border rounded-full shadow-lg p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showNavigator ? "default" : "ghost"}
                  size="icon"
                  aria-label={showNavigator ? "Hide Navigator panel" : "Show Navigator panel"}
                  aria-pressed={showNavigator}
                  className={cn(
                    "h-8 w-8 rounded-full",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    showNavigator && "bg-chart-1 text-chart-1-foreground hover:bg-chart-1/90"
                  )}
                  onClick={() => setShowNavigator(!showNavigator)}
                >
                  <PanelLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {showNavigator ? "Hide Navigator" : "Show Navigator"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showInspector ? "default" : "ghost"}
                  size="icon"
                  aria-label={showInspector ? "Hide Inspector panel" : "Show Inspector panel"}
                  aria-pressed={showInspector}
                  className={cn(
                    "h-8 w-8 rounded-full",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    showInspector && "bg-chart-1 text-chart-1-foreground hover:bg-chart-1/90"
                  )}
                  onClick={() => setShowInspector(!showInspector)}
                >
                  <PanelRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {showInspector ? "Hide Inspector" : "Show Inspector"}
              </TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-border" aria-hidden="true" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showElementPanel ? "default" : "ghost"}
                  size="icon"
                  aria-label={showElementPanel ? "Hide Add Element panel" : "Open Add Element panel"}
                  aria-pressed={showElementPanel}
                  className={cn(
                    "h-8 w-8 rounded-full",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    showElementPanel && "bg-chart-2 text-chart-2-foreground hover:bg-chart-2/90"
                  )}
                  onClick={() => setShowElementPanel(!showElementPanel)}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {showElementPanel ? "Hide Add Element" : "Add Element"}
              </TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-border" aria-hidden="true" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isMeasuring ? "default" : "ghost"}
                  size="icon"
                  aria-label={isMeasuring ? "Exit Measure mode" : "Enter Measure mode"}
                  aria-pressed={isMeasuring}
                  className={cn(
                    "h-8 w-8 rounded-full",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    isMeasuring && "bg-chart-3 text-chart-3-foreground hover:bg-chart-3/90"
                  )}
                  onClick={() => setIsMeasuring(!isMeasuring)}
                >
                  <Ruler className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isMeasuring ? "Exit Measure Mode" : "Measure Tool"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="View keyboard shortcuts"
                  className="h-8 w-8 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  onClick={() => setShowShortcutsHelp(true)}
                >
                  <Keyboard className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Keyboard Shortcuts
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {showShortcutsHelp && (
          <KeyboardShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />
        )}
      </div>
    </TooltipProvider>
  )
}

// Main inspector component
export function Inspector() {
  const { isOpen, isPreviewMode } = useInspector()

  // Don't render inspector in preview mode (inside iframe)
  if (isPreviewMode) {
    return null
  }

  if (!isOpen) {
    return <InspectorToggle />
  }

  return (
    <TooltipProvider>
      {/* Skip links for keyboard navigation */}
      <SkipLinks />

      {/* Core functionality */}
      <KeyboardShortcuts />
      <ContextMenuProvider />

      {/* Toggle controls */}
      <InspectorToggle />

      {/* Overlays */}
      <RulersOverlay />
      <AlignmentGuides />
      <ContainerAlignmentIndicator />
      <SpacingMeasurement />
      <MeasurementTool />

      {/* Panels */}
      <NavigatorPanel />
      <ElementAddPanel />
      <InspectorPanel />
      <InspectorOverlay />

      {/* Navigation aids */}
      <ElementBreadcrumb />
    </TooltipProvider>
  )
}

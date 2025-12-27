"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, MousePointer, Focus, Hand, Check, Zap, Eye,
  ToggleLeft, Copy, Trash2
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Input } from "../ui/input"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { useInspector } from "../core/inspector-context"

// Pseudo-state types
type PseudoState = "hover" | "focus" | "active" | "focus-visible" | "focus-within"

interface StateStyle {
  property: string
  value: string
}

interface ElementState {
  state: PseudoState
  styles: StateStyle[]
}

// State configuration
const pseudoStates: { state: PseudoState; label: string; icon: React.ElementType; description: string }[] = [
  { state: "hover", label: ":hover", icon: MousePointer, description: "Mouse over element" },
  { state: "focus", label: ":focus", icon: Focus, description: "Element has focus" },
  { state: "active", label: ":active", icon: Hand, description: "Being clicked/pressed" },
  { state: "focus-visible", label: ":focus-visible", icon: Eye, description: "Keyboard focus" },
  { state: "focus-within", label: ":focus-within", icon: Zap, description: "Child has focus" },
]

// Common state properties
const commonStateProperties = [
  "background-color",
  "color",
  "border-color",
  "box-shadow",
  "transform",
  "opacity",
  "outline",
  "text-decoration",
]

export function ElementStates() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeStates, setActiveStates] = useState<Set<PseudoState>>(new Set())
  const [stateStyles, setStateStyles] = useState<Record<PseudoState, StateStyle[]>>({
    hover: [],
    focus: [],
    active: [],
    "focus-visible": [],
    "focus-within": [],
  })
  const [editingState, setEditingState] = useState<PseudoState | null>(null)
  const [newProperty, setNewProperty] = useState("")
  const [newValue, setNewValue] = useState("")

  // Toggle forced state
  const toggleState = useCallback((state: PseudoState) => {
    if (!selectedElement?.element) return

    const newStates = new Set(activeStates)

    if (newStates.has(state)) {
      newStates.delete(state)
      // Remove forced state class
      selectedElement.element.classList.remove(`force-${state}`)
    } else {
      newStates.add(state)
      // Add forced state class
      selectedElement.element.classList.add(`force-${state}`)
    }

    setActiveStates(newStates)

    // Inject CSS for forced states if not already present
    injectForcedStateStyles()
  }, [selectedElement, activeStates])

  // Inject CSS for forced state simulation
  const injectForcedStateStyles = useCallback(() => {
    const styleId = "devtools-forced-states"
    let styleEl = document.getElementById(styleId) as HTMLStyleElement

    if (!styleEl) {
      styleEl = document.createElement("style")
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }

    // Generate CSS rules that apply state styles to elements with force-* classes
    const rules = pseudoStates.map(({ state }) => `
      .force-${state} {
        /* Forced ${state} state */
      }
    `).join("\n")

    styleEl.textContent = rules
  }, [])

  // Add style to a state
  const addStateStyle = useCallback((state: PseudoState) => {
    if (!newProperty || !newValue || !selectedElement?.element) return

    // Create or update the style rule
    const styleId = `devtools-state-${state}`
    let styleEl = document.getElementById(styleId) as HTMLStyleElement

    if (!styleEl) {
      styleEl = document.createElement("style")
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }

    // Build selector
    const element = selectedElement.element
    let selector = element.tagName.toLowerCase()
    if (element.id) {
      selector = `#${element.id}`
    } else if (element.classList.length > 0) {
      selector = `.${Array.from(element.classList).join(".")}`
    }

    // Update state styles
    const newStyles = [...(stateStyles[state] || []), { property: newProperty, value: newValue }]
    setStateStyles((prev) => ({ ...prev, [state]: newStyles }))

    // Generate CSS
    const cssProperties = newStyles.map((s) => `${s.property}: ${s.value} !important;`).join("\n  ")
    styleEl.textContent = `
      ${selector}:${state},
      ${selector}.force-${state} {
        ${cssProperties}
      }
    `

    setNewProperty("")
    setNewValue("")
    toast.success(`Added ${newProperty} to :${state}`)
  }, [newProperty, newValue, selectedElement, stateStyles])

  // Remove style from a state
  const removeStateStyle = useCallback((state: PseudoState, index: number) => {
    const newStyles = stateStyles[state].filter((_, i) => i !== index)
    setStateStyles((prev) => ({ ...prev, [state]: newStyles }))

    // Update CSS
    const styleId = `devtools-state-${state}`
    const styleEl = document.getElementById(styleId) as HTMLStyleElement

    if (styleEl && selectedElement?.element) {
      const element = selectedElement.element
      let selector = element.tagName.toLowerCase()
      if (element.id) {
        selector = `#${element.id}`
      } else if (element.classList.length > 0) {
        selector = `.${Array.from(element.classList).join(".")}`
      }

      if (newStyles.length === 0) {
        styleEl.remove()
      } else {
        const cssProperties = newStyles.map((s) => `${s.property}: ${s.value} !important;`).join("\n  ")
        styleEl.textContent = `
          ${selector}:${state},
          ${selector}.force-${state} {
            ${cssProperties}
          }
        `
      }
    }

    toast.success("Style removed")
  }, [stateStyles, selectedElement])

  // Copy state styles as CSS
  const copyStateCSS = useCallback((state: PseudoState) => {
    if (!selectedElement?.element) return

    const styles = stateStyles[state]
    if (styles.length === 0) {
      toast.info("No styles to copy")
      return
    }

    const element = selectedElement.element
    let selector = element.tagName.toLowerCase()
    if (element.id) {
      selector = `#${element.id}`
    } else if (element.classList.length > 0) {
      selector = `.${element.classList[0]}`
    }

    const css = `${selector}:${state} {\n  ${styles.map((s) => `${s.property}: ${s.value};`).join("\n  ")}\n}`
    navigator.clipboard.writeText(css)
    toast.success("Copied CSS to clipboard")
  }, [stateStyles, selectedElement])

  // Clear all forced states when element changes
  useEffect(() => {
    setActiveStates(new Set())
    setStateStyles({
      hover: [],
      focus: [],
      active: [],
      "focus-visible": [],
      "focus-within": [],
    })
  }, [selectedElement?.element])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <MousePointer className="h-4 w-4 text-chart-2" />
          <span>Element States</span>
          {activeStates.size > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4 bg-green-500/10 text-green-500">
              {activeStates.size} active
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {!selectedElement ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Select an element to edit its states
          </div>
        ) : (
          <>
            {/* State toggles */}
            <div className="grid grid-cols-5 gap-1">
              {pseudoStates.map(({ state, label, icon: Icon, description }) => (
                <Tooltip key={state}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeStates.has(state) ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-10 flex-col gap-0.5 px-1",
                        activeStates.has(state) && "bg-green-500 hover:bg-green-600"
                      )}
                      onClick={() => toggleState(state)}
                    >
                      <Icon className="h-3 w-3" />
                      <span className="text-[9px]">{label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{description}</TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* State styles editor */}
            <ScrollArea className="h-[180px]">
              <div className="space-y-2">
                {pseudoStates.map(({ state, label, icon: Icon }) => {
                  const styles = stateStyles[state]
                  const isEditing = editingState === state

                  return (
                    <Collapsible key={state} open={isEditing} onOpenChange={(open) => setEditingState(open ? state : null)}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3 w-3" />
                          <span className="text-xs font-mono">{label}</span>
                          {styles.length > 0 && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1">
                              {styles.length}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {styles.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyStateCSS(state)
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                          <ChevronDown className={cn("h-3 w-3 transition-transform", isEditing && "rotate-180")} />
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="pt-2 pl-4 space-y-2">
                        {/* Existing styles */}
                        {styles.map((style, index) => (
                          <div key={index} className="flex items-center gap-2 text-[10px]">
                            <span className="font-mono text-muted-foreground">{style.property}:</span>
                            <span className="font-mono flex-1">{style.value}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                              onClick={() => removeStateStyle(state, index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}

                        {/* Add new style */}
                        <div className="flex gap-1 pt-1">
                          <Input
                            placeholder="property"
                            value={newProperty}
                            onChange={(e) => setNewProperty(e.target.value)}
                            className="h-6 text-[10px] font-mono"
                            list="state-properties"
                          />
                          <datalist id="state-properties">
                            {commonStateProperties.map((prop) => (
                              <option key={prop} value={prop} />
                            ))}
                          </datalist>
                          <Input
                            placeholder="value"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="h-6 text-[10px] font-mono"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => addStateStyle(state)}
                            disabled={!newProperty || !newValue}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })}
              </div>
            </ScrollArea>

            {/* Info */}
            <p className="text-[10px] text-muted-foreground">
              Toggle states to preview how the element looks. Add custom styles for each state.
            </p>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

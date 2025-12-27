"use client"

import * as React from "react"
import { useCallback, useState } from "react"
import { Copy, Eye, EyeOff, Square, Code } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../../../ui/button"
import { useInspector } from "../../inspector-context"

export function ActionsTab() {
  const { selectedElement, activeClass } = useInspector()
  const [activeState, setActiveState] = useState<string>("none")

  // Simulate pseudo-state on element
  const simulateState = useCallback((stateId: string) => {
    if (!selectedElement?.element) return

    const el = selectedElement.element
    const prevState = activeState

    // Remove previous state class
    if (prevState !== "none") {
      el.classList.remove(`devtools-state-${prevState}`)
      // Clear all state attributes
      el.removeAttribute("data-state-hover")
      el.removeAttribute("data-state-focus")
      el.removeAttribute("data-state-active")
      el.removeAttribute("data-state-visited")
    }

    // Add new state class (or none)
    if (stateId !== "none") {
      el.classList.add(`devtools-state-${stateId}`)

      switch (stateId) {
        case "hover":
          el.setAttribute("data-state-hover", "true")
          break
        case "focus":
          el.setAttribute("data-state-focus", "true")
          el.focus?.()
          break
        case "active":
          el.setAttribute("data-state-active", "true")
          break
        case "visited":
          el.setAttribute("data-state-visited", "true")
          break
      }
    }

    setActiveState(stateId)
    toast.info(stateId === "none" ? "State simulation cleared" : `Simulating :${stateId} state`)
  }, [selectedElement, activeState])

  // Copy styles as CSS
  const copyStylesAsCSS = useCallback(() => {
    if (!selectedElement?.element) return

    const el = selectedElement.element
    const styles: string[] = []
    const styleProps = [
      "display", "position", "flex-direction", "justify-content", "align-items", "gap",
      "width", "height", "min-width", "max-width", "min-height", "max-height",
      "margin-top", "margin-right", "margin-bottom", "margin-left",
      "padding-top", "padding-right", "padding-bottom", "padding-left",
      "font-size", "font-weight", "line-height", "text-align", "color",
      "background-color", "border-width", "border-style", "border-color", "border-radius",
      "opacity", "box-shadow"
    ]

    styleProps.forEach((prop) => {
      const value = el.style.getPropertyValue(prop)
      if (value) {
        styles.push(`  ${prop}: ${value};`)
      }
    })

    if (styles.length === 0) {
      toast.info("No inline styles to copy")
      return
    }

    const selector = activeClass ? `.${activeClass}` : selectedElement.tagName.toLowerCase()
    const css = `${selector} {\n${styles.join("\n")}\n}`

    navigator.clipboard.writeText(css)
    toast.success(`Copied CSS for ${selector}`, {
      description: `${styles.length} style properties copied to clipboard.`,
    })
  }, [selectedElement, activeClass])

  if (!selectedElement) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">Select an element to use actions</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-3">
      {/* Element Info */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tag</span>
            <code className="font-mono">{selectedElement.tagName}</code>
          </div>
          {selectedElement.id && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <code className="font-mono text-chart-1">#{selectedElement.id}</code>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Classes</span>
            <span>{selectedElement.classList.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dimensions</span>
            <span>{Math.round(selectedElement.rect.width)} × {Math.round(selectedElement.rect.height)}</span>
          </div>
          {selectedElement.path && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-[10px]">Path</span>
              <code className="font-mono text-[10px] block mt-1 text-muted-foreground break-all">
                {selectedElement.path}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h4 className="font-medium text-sm mb-2">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs justify-start"
            onClick={() => {
              const selector = selectedElement.id
                ? `#${selectedElement.id}`
                : selectedElement.classList.length > 0
                ? `.${selectedElement.classList[0]}`
                : selectedElement.tagName
              navigator.clipboard.writeText(selector)
              toast.success('Selector copied!', { description: selector })
            }}
          >
            <Copy className="h-3 w-3 mr-2" />
            Copy Selector
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs justify-start"
            onClick={() => {
              selectedElement.element.scrollIntoView({ behavior: 'smooth', block: 'center' })
              toast.success('Scrolled to element')
            }}
          >
            <Eye className="h-3 w-3 mr-2" />
            Scroll to View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs justify-start"
            onClick={() => {
              const currentDisplay = selectedElement.element.style.display
              if (currentDisplay === 'none') {
                selectedElement.element.style.display = ''
                toast.success('Element shown')
              } else {
                selectedElement.element.style.display = 'none'
                toast.success('Element hidden')
              }
            }}
          >
            <EyeOff className="h-3 w-3 mr-2" />
            Toggle Visibility
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs justify-start"
            onClick={() => {
              const outline = selectedElement.element.style.outline
              if (outline) {
                selectedElement.element.style.outline = ''
              } else {
                selectedElement.element.style.outline = '2px solid red'
              }
            }}
          >
            <Square className="h-3 w-3 mr-2" />
            Highlight Border
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs justify-start col-span-2"
            onClick={copyStylesAsCSS}
          >
            <Code className="h-3 w-3 mr-2" />
            Copy All Styles as CSS
          </Button>
        </div>
      </div>

      {/* Element State */}
      <div>
        <h4 className="font-medium text-sm mb-2">Force State</h4>
        <div className="flex flex-wrap gap-1">
          {['hover', 'focus', 'active', 'visited'].map((state) => (
            <Button
              key={state}
              variant={activeState === state ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => simulateState(state)}
            >
              :{state}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => simulateState('none')}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}

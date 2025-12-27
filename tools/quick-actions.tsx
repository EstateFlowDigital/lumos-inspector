"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import {
  ChevronDown, Zap, AlignCenter, AlignLeft, AlignRight,
  StretchHorizontal, StretchVertical, Eye, EyeOff, Maximize2,
  Minimize2, Box, Grid3X3, Rows, Square, Circle, Trash2,
  Copy, FlipHorizontal, FlipVertical, RotateCw, Lock, Unlock,
  ArrowUp, ArrowDown, Layers
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Separator } from "../ui/separator"
import { useInspector } from "../core/inspector-context"

interface QuickAction {
  id: string
  icon: React.ElementType
  label: string
  action: (element: HTMLElement) => void
  group: "layout" | "alignment" | "visibility" | "transform" | "structure"
}

export function QuickActions() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)

  // Apply style to element
  const applyStyle = useCallback((element: HTMLElement, property: string, value: string) => {
    element.style.setProperty(property, value)
    notifyStyleChange()
  }, [notifyStyleChange])

  // Quick actions configuration
  const actions: QuickAction[] = [
    // Layout actions
    {
      id: "display-flex",
      icon: Rows,
      label: "Make Flex",
      action: (el) => applyStyle(el, "display", "flex"),
      group: "layout",
    },
    {
      id: "display-grid",
      icon: Grid3X3,
      label: "Make Grid",
      action: (el) => applyStyle(el, "display", "grid"),
      group: "layout",
    },
    {
      id: "display-block",
      icon: Square,
      label: "Make Block",
      action: (el) => applyStyle(el, "display", "block"),
      group: "layout",
    },
    {
      id: "display-inline",
      icon: StretchHorizontal,
      label: "Make Inline",
      action: (el) => applyStyle(el, "display", "inline-flex"),
      group: "layout",
    },

    // Alignment actions
    {
      id: "center-horizontal",
      icon: AlignCenter,
      label: "Center Horizontally",
      action: (el) => {
        applyStyle(el, "margin-left", "auto")
        applyStyle(el, "margin-right", "auto")
      },
      group: "alignment",
    },
    {
      id: "center-flex",
      icon: Box,
      label: "Center Contents (Flex)",
      action: (el) => {
        applyStyle(el, "display", "flex")
        applyStyle(el, "justify-content", "center")
        applyStyle(el, "align-items", "center")
      },
      group: "alignment",
    },
    {
      id: "align-left",
      icon: AlignLeft,
      label: "Align Left",
      action: (el) => applyStyle(el, "text-align", "left"),
      group: "alignment",
    },
    {
      id: "align-right",
      icon: AlignRight,
      label: "Align Right",
      action: (el) => applyStyle(el, "text-align", "right"),
      group: "alignment",
    },

    // Visibility actions
    {
      id: "hide",
      icon: EyeOff,
      label: "Hide Element",
      action: (el) => applyStyle(el, "display", "none"),
      group: "visibility",
    },
    {
      id: "show",
      icon: Eye,
      label: "Show Element",
      action: (el) => el.style.removeProperty("display"),
      group: "visibility",
    },
    {
      id: "opacity-50",
      icon: Circle,
      label: "50% Opacity",
      action: (el) => applyStyle(el, "opacity", "0.5"),
      group: "visibility",
    },
    {
      id: "opacity-100",
      icon: Circle,
      label: "100% Opacity",
      action: (el) => applyStyle(el, "opacity", "1"),
      group: "visibility",
    },

    // Transform actions
    {
      id: "flip-h",
      icon: FlipHorizontal,
      label: "Flip Horizontal",
      action: (el) => applyStyle(el, "transform", "scaleX(-1)"),
      group: "transform",
    },
    {
      id: "flip-v",
      icon: FlipVertical,
      label: "Flip Vertical",
      action: (el) => applyStyle(el, "transform", "scaleY(-1)"),
      group: "transform",
    },
    {
      id: "rotate-90",
      icon: RotateCw,
      label: "Rotate 90°",
      action: (el) => {
        const current = el.style.transform || ""
        const rotation = current.match(/rotate\((\d+)deg\)/)
        const currentDeg = rotation ? parseInt(rotation[1]) : 0
        applyStyle(el, "transform", `rotate(${currentDeg + 90}deg)`)
      },
      group: "transform",
    },
    {
      id: "reset-transform",
      icon: Minimize2,
      label: "Reset Transform",
      action: (el) => el.style.removeProperty("transform"),
      group: "transform",
    },

    // Structure actions
    {
      id: "full-width",
      icon: StretchHorizontal,
      label: "Full Width",
      action: (el) => applyStyle(el, "width", "100%"),
      group: "structure",
    },
    {
      id: "full-height",
      icon: StretchVertical,
      label: "Full Height",
      action: (el) => applyStyle(el, "height", "100%"),
      group: "structure",
    },
    {
      id: "position-relative",
      icon: Layers,
      label: "Position Relative",
      action: (el) => applyStyle(el, "position", "relative"),
      group: "structure",
    },
    {
      id: "position-absolute",
      icon: Lock,
      label: "Position Absolute",
      action: (el) => applyStyle(el, "position", "absolute"),
      group: "structure",
    },
  ]

  // Group actions
  const groupedActions = {
    layout: actions.filter((a) => a.group === "layout"),
    alignment: actions.filter((a) => a.group === "alignment"),
    visibility: actions.filter((a) => a.group === "visibility"),
    transform: actions.filter((a) => a.group === "transform"),
    structure: actions.filter((a) => a.group === "structure"),
  }

  // Execute action
  const executeAction = useCallback((action: QuickAction) => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    action.action(selectedElement.element)
    toast.success(action.label)
  }, [selectedElement])

  // Render action button
  const ActionButton = ({ action }: { action: QuickAction }) => {
    const Icon = action.icon
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => executeAction(action)}
            disabled={!selectedElement}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {action.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-chart-3" />
          <span>Quick Actions</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {!selectedElement ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Select an element to use quick actions
          </div>
        ) : (
          <div className="space-y-3">
            {/* Layout */}
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">Layout</div>
              <div className="flex flex-wrap gap-1">
                {groupedActions.layout.map((action) => (
                  <ActionButton key={action.id} action={action} />
                ))}
              </div>
            </div>

            <Separator />

            {/* Alignment */}
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">Alignment</div>
              <div className="flex flex-wrap gap-1">
                {groupedActions.alignment.map((action) => (
                  <ActionButton key={action.id} action={action} />
                ))}
              </div>
            </div>

            <Separator />

            {/* Visibility */}
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">Visibility</div>
              <div className="flex flex-wrap gap-1">
                {groupedActions.visibility.map((action) => (
                  <ActionButton key={action.id} action={action} />
                ))}
              </div>
            </div>

            <Separator />

            {/* Transform */}
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">Transform</div>
              <div className="flex flex-wrap gap-1">
                {groupedActions.transform.map((action) => (
                  <ActionButton key={action.id} action={action} />
                ))}
              </div>
            </div>

            <Separator />

            {/* Structure */}
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">Structure</div>
              <div className="flex flex-wrap gap-1">
                {groupedActions.structure.map((action) => (
                  <ActionButton key={action.id} action={action} />
                ))}
              </div>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

"use client"

import * as React from "react"
import { useMemo, useCallback } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "../lib/utils"
import { useInspector, ElementInfo } from "./inspector-context"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"

interface BreadcrumbItem {
  element: HTMLElement
  tagName: string
  id: string
  classList: string[]
  label: string
}

export function ElementBreadcrumb() {
  const { selectedElement, setSelectedElement, isOpen } = useInspector()

  // Build breadcrumb path from selected element to root
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    if (!selectedElement?.element) return []

    const path: BreadcrumbItem[] = []
    let current: HTMLElement | null = selectedElement.element

    while (current && current !== document.body.parentElement) {
      // Skip devtools elements
      if (current.hasAttribute("data-devtools")) {
        current = current.parentElement
        continue
      }

      const tagName = current.tagName.toLowerCase()
      const id = current.id
      const classList = Array.from(current.classList).filter(c => !c.startsWith("devtools-"))

      // Create readable label
      let label = tagName
      if (id) {
        label = `#${id}`
      } else if (classList.length > 0) {
        label = `.${classList[0]}`
      }

      path.unshift({
        element: current,
        tagName,
        id,
        classList,
        label,
      })

      current = current.parentElement
    }

    // Limit to last 6 items for display
    if (path.length > 6) {
      return [{ element: path[0].element, tagName: "...", id: "", classList: [], label: "..." }, ...path.slice(-5)]
    }

    return path
  }, [selectedElement])

  // Handle breadcrumb click
  const handleClick = useCallback((item: BreadcrumbItem) => {
    if (item.tagName === "...") return

    const rect = item.element.getBoundingClientRect()
    const computed = window.getComputedStyle(item.element)

    const info: ElementInfo = {
      tagName: item.tagName,
      id: item.id,
      classList: item.classList,
      computedStyles: {
        display: computed.display,
        position: computed.position,
        width: computed.width,
        height: computed.height,
      },
      rect,
      element: item.element,
    }

    setSelectedElement(info)
  }, [setSelectedElement])

  if (!isOpen || breadcrumbs.length === 0) return null

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-9999 bg-card/95 backdrop-blur-sm border rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1 text-xs"
      data-devtools
    >
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleClick(item)}
                disabled={item.tagName === "..."}
                className={cn(
                  "px-2 py-0.5 rounded-full transition-colors font-mono",
                  "hover:bg-muted",
                  index === breadcrumbs.length - 1
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground",
                  item.tagName === "..." && "cursor-default hover:bg-transparent"
                )}
              >
                {item.label}
              </button>
            </TooltipTrigger>
            {item.tagName !== "..." && (
              <TooltipContent side="top" className="font-mono text-xs">
                <div>{item.tagName}</div>
                {item.id && <div className="text-chart-1">#{item.id}</div>}
                {item.classList.length > 0 && (
                  <div className="text-muted-foreground">
                    .{item.classList.slice(0, 3).join(" .")}
                    {item.classList.length > 3 && ` +${item.classList.length - 3}`}
                  </div>
                )}
              </TooltipContent>
            )}
          </Tooltip>
        </React.Fragment>
      ))}
    </div>
  )
}

"use client"

import * as React from "react"
import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { Type, Plus, Copy } from "lucide-react"
import { cn } from "../../../lib/utils"
import { toast } from "sonner"
import { Button } from "../../../ui/button"
import { Input } from "../../../ui/input"
import { Badge } from "../../../ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../ui/tooltip"
import { Section } from "../shared"
import { useInspector, type ElementInfo } from "../../inspector-context"

interface SelectorSectionProps {
  selectedElement: ElementInfo | null
}

export function SelectorSection({ selectedElement }: SelectorSectionProps) {
  const { activeClass, setActiveClass } = useInspector()
  const [newClassName, setNewClassName] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [allClasses, setAllClasses] = useState<string[]>([])
  const classInputRef = useRef<HTMLInputElement>(null)

  // Collect all classes from the document
  const collectAllClasses = useCallback(() => {
    if (typeof document === 'undefined') return []
    const classSet = new Set<string>()

    const elements = document.querySelectorAll('*:not([data-devtools] *):not([data-devtools])')
    elements.forEach((el) => {
      el.classList.forEach((cls) => {
        if (cls && !cls.startsWith('__') && cls.length > 1) {
          classSet.add(cls)
        }
      })
    })

    return Array.from(classSet).sort()
  }, [])

  // Update available classes when element changes
  useEffect(() => {
    setAllClasses(collectAllClasses())
  }, [selectedElement, collectAllClasses])

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!newClassName.trim()) return []

    const searchTerm = newClassName.toLowerCase()
    const elementClasses = selectedElement?.classList || []

    return allClasses
      .filter((cls) => {
        if (elementClasses.includes(cls)) return false
        return cls.toLowerCase().includes(searchTerm)
      })
      .slice(0, 10)
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(searchTerm)
        const bStarts = b.toLowerCase().startsWith(searchTerm)
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1
        return a.localeCompare(b)
      })
  }, [newClassName, allClasses, selectedElement?.classList])

  // Handle class input change
  const handleClassInputChange = useCallback((value: string) => {
    setNewClassName(value)
    setShowSuggestions(value.trim().length > 0)
    setSelectedSuggestionIndex(0)
  }, [])

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((className: string) => {
    if (selectedElement) {
      selectedElement.element.classList.add(className)
      setNewClassName("")
      setShowSuggestions(false)
      setSelectedSuggestionIndex(0)
      setAllClasses(collectAllClasses())
    }
  }, [selectedElement, collectAllClasses])

  // Handle keyboard navigation in suggestions
  const handleClassInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault()
        if (newClassName && selectedElement) {
          selectedElement.element.classList.add(newClassName)
          setNewClassName("")
          setAllClasses(collectAllClasses())
        }
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedSuggestionIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        )
        break
      case "Enter":
        e.preventDefault()
        if (filteredSuggestions[selectedSuggestionIndex]) {
          handleSelectSuggestion(filteredSuggestions[selectedSuggestionIndex])
        } else if (newClassName) {
          handleSelectSuggestion(newClassName)
        }
        break
      case "Escape":
        e.preventDefault()
        setShowSuggestions(false)
        break
      case "Tab":
        if (filteredSuggestions[selectedSuggestionIndex]) {
          e.preventDefault()
          handleSelectSuggestion(filteredSuggestions[selectedSuggestionIndex])
        }
        break
    }
  }, [showSuggestions, filteredSuggestions, selectedSuggestionIndex, newClassName, selectedElement, handleSelectSuggestion, collectAllClasses])

  // Add new class
  const handleAddClass = useCallback(() => {
    if (newClassName && selectedElement) {
      selectedElement.element.classList.add(newClassName)
      setNewClassName("")
    }
  }, [newClassName, selectedElement])

  // Remove class
  const handleRemoveClass = useCallback((className: string) => {
    if (selectedElement) {
      selectedElement.element.classList.remove(className)
    }
  }, [selectedElement])

  // Highlight affected elements when hovering over class
  const highlightAffectedElements = useCallback((className: string, highlight: boolean) => {
    const elements = document.querySelectorAll(`.${CSS.escape(className)}`)
    elements.forEach((el) => {
      if (el instanceof HTMLElement && el !== selectedElement?.element) {
        if (highlight) {
          el.style.outline = "2px dashed var(--chart-1)"
          el.style.outlineOffset = "2px"
        } else {
          el.style.outline = ""
          el.style.outlineOffset = ""
        }
      }
    })
  }, [selectedElement])

  // Count affected elements for a class
  const getAffectedCount = useCallback((className: string): number => {
    if (typeof document === 'undefined') return 0
    try {
      const escapedClass = CSS.escape(className)
      return document.querySelectorAll(`.${escapedClass}`).length
    } catch {
      return 0
    }
  }, [])

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

  if (!selectedElement) return null

  return (
    <Section title="Selector" icon={Type} defaultOpen>
      {/* Active class indicator */}
      {activeClass && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-chart-1/10 border border-chart-1/30 text-xs">
          <div className="w-2 h-2 rounded-full bg-chart-1 animate-pulse" />
          <span>
            Editing <code className="font-mono font-semibold">.{activeClass}</code>
          </span>
          <span className="text-muted-foreground">
            ({getAffectedCount(activeClass)} elements)
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-auto"
                onClick={copyStylesAsCSS}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy as CSS</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Current classes */}
      <div className="flex flex-wrap gap-1">
        {selectedElement.classList.map((cls) => (
          <Badge
            key={cls}
            variant={activeClass === cls ? "default" : "outline"}
            className={cn(
              "cursor-pointer text-xs font-mono transition-all",
              activeClass === cls && "bg-chart-1 text-chart-1-foreground"
            )}
            onClick={() => setActiveClass(activeClass === cls ? null : cls)}
            onMouseEnter={() => highlightAffectedElements(cls, true)}
            onMouseLeave={() => highlightAffectedElements(cls, false)}
          >
            .{cls}
            <span className="ml-1 opacity-60 text-[10px]">
              ({getAffectedCount(cls)})
            </span>
            <button
              className="ml-1 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveClass(cls)
              }}
            >
              ×
            </button>
          </Badge>
        ))}
      </div>

      {/* Deselect class button */}
      {activeClass && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs w-full"
          onClick={() => setActiveClass(null)}
        >
          Edit element only (deselect class)
        </Button>
      )}

      {/* Add new class with autocomplete */}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={classInputRef}
            placeholder="Add class..."
            className="h-8 text-xs font-mono"
            value={newClassName}
            onChange={(e) => handleClassInputChange(e.target.value)}
            onKeyDown={handleClassInputKeyDown}
            onFocus={() => newClassName.trim() && setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 150)
            }}
          />
          <Button size="sm" className="h-8" onClick={handleAddClass}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-[10002] w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {filteredSuggestions.map((cls, index) => {
                const count = getAffectedCount(cls)
                return (
                  <button
                    key={cls}
                    className={cn(
                      "w-full px-3 py-1.5 text-left text-xs font-mono flex items-center justify-between hover:bg-muted/50 transition-colors",
                      index === selectedSuggestionIndex && "bg-muted"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelectSuggestion(cls)
                    }}
                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground">.</span>
                      <span>{cls}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {count} {count === 1 ? 'element' : 'elements'}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t bg-muted/30 flex items-center justify-between">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </div>
        )}

        {/* Show "create new class" option when no matches */}
        {showSuggestions && newClassName.trim() && filteredSuggestions.length === 0 && (
          <div className="absolute z-[10002] w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
            <button
              className="w-full px-3 py-2 text-left text-xs font-mono flex items-center gap-2 hover:bg-muted/50"
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelectSuggestion(newClassName.trim())
              }}
            >
              <Plus className="h-3 w-3 text-muted-foreground" />
              <span>Create <code className="bg-muted px-1 rounded">.{newClassName.trim()}</code></span>
            </button>
          </div>
        )}
      </div>
    </Section>
  )
}

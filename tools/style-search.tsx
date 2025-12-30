"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import {
  ChevronDown, Search, X
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface SearchResult {
  element: HTMLElement
  property: string
  value: string
  label: string
}

// Searchable properties
const searchableProperties = [
  "display", "position", "width", "height", "min-width", "max-width",
  "padding", "margin", "background-color", "color", "border",
  "border-radius", "font-size", "font-weight", "font-family",
  "flex-direction", "justify-content", "align-items", "gap",
  "box-shadow", "opacity", "z-index", "overflow", "visibility",
]

function getElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ""
  const cls = el.classList.length > 0 ? `.${Array.from(el.classList)[0]}` : ""
  return `${tag}${id}${cls}`.substring(0, 30)
}

export function StyleSearch() {
  const { isOpen, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [property, setProperty] = useState("display")
  const [searchValue, setSearchValue] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Search for elements
  const search = useCallback(() => {
    if (!searchValue.trim()) {
      toast.error("Enter a value to search for")
      return
    }

    setIsSearching(true)
    const found: SearchResult[] = []
    const searchLower = searchValue.toLowerCase()

    document.querySelectorAll("*").forEach(el => {
      if ((el as HTMLElement).hasAttribute?.("data-devtools")) return

      const computed = getComputedStyle(el)
      const value = computed.getPropertyValue(property)

      if (value && value.toLowerCase().includes(searchLower)) {
        found.push({
          element: el as HTMLElement,
          property,
          value,
          label: getElementLabel(el as HTMLElement),
        })
      }
    })

    setResults(found.slice(0, 50))
    setIsSearching(false)

    if (found.length === 0) {
      toast.info("No elements found")
    } else {
      toast.success(`Found ${found.length} element(s)`)
    }
  }, [property, searchValue])

  // Select result
  const selectResult = useCallback((result: SearchResult) => {
    const computed = getComputedStyle(result.element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: result.element,
      tagName: result.element.tagName.toLowerCase(),
      id: result.element.id,
      classList: Array.from(result.element.classList),
      rect: result.element.getBoundingClientRect(),
      computedStyles,
    })

    result.element.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [setSelectedElement])

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchValue("")
    setResults([])
  }, [])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[--accent-cyan]" />
          <span>Style Search</span>
          {results.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4">
              {results.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Property selector */}
        <div className="space-y-1">
          <Select value={property} onValueChange={setProperty}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {searchableProperties.map(prop => (
                <SelectItem key={prop} value={prop} className="text-xs">
                  {prop}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-7 text-xs pr-8"
              placeholder={`Search ${property} value...`}
              onKeyDown={(e) => {
                if (e.key === "Enter") search()
              }}
            />
            {searchValue && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={clearSearch}
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button
            variant="default"
            size="sm"
            className="h-7"
            onClick={search}
            disabled={isSearching}
          >
            <Search className="h-3 w-3" />
          </Button>
        </div>

        {/* Common searches */}
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground">Quick:</span>
          {property === "display" && (
            <>
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1 cursor-pointer hover:bg-muted"
                onClick={() => { setSearchValue("flex"); search() }}
              >
                flex
              </Badge>
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1 cursor-pointer hover:bg-muted"
                onClick={() => { setSearchValue("grid"); search() }}
              >
                grid
              </Badge>
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1 cursor-pointer hover:bg-muted"
                onClick={() => { setSearchValue("none"); search() }}
              >
                none
              </Badge>
            </>
          )}
          {property === "position" && (
            <>
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1 cursor-pointer hover:bg-muted"
                onClick={() => { setSearchValue("fixed"); search() }}
              >
                fixed
              </Badge>
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1 cursor-pointer hover:bg-muted"
                onClick={() => { setSearchValue("absolute"); search() }}
              >
                absolute
              </Badge>
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1 cursor-pointer hover:bg-muted"
                onClick={() => { setSearchValue("sticky"); search() }}
              >
                sticky
              </Badge>
            </>
          )}
        </div>

        {/* Results */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {results.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Search for elements by CSS property value
              </div>
            ) : (
              results.map((result, i) => (
                <div
                  key={i}
                  className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50"
                  onClick={() => selectResult(result)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono truncate">{result.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <Badge variant="outline" className="h-4 px-1">
                      {result.property}
                    </Badge>
                    <code className="text-muted-foreground truncate">
                      {result.value}
                    </code>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  )
}

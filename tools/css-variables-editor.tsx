"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import {
  ChevronDown, Variable, RefreshCw, Search, Copy, RotateCcw, Plus
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface CSSVariable {
  name: string
  value: string
  originalValue: string
  category: "color" | "spacing" | "typography" | "other"
  isModified: boolean
}

// Categorize variable by name
function categorizeVariable(name: string): CSSVariable["category"] {
  const lower = name.toLowerCase()
  if (lower.includes("color") || lower.includes("bg") || lower.includes("border") ||
      lower.includes("foreground") || lower.includes("background") || lower.includes("accent") ||
      lower.includes("muted") || lower.includes("primary") || lower.includes("secondary")) {
    return "color"
  }
  if (lower.includes("spacing") || lower.includes("gap") || lower.includes("margin") ||
      lower.includes("padding") || lower.includes("radius") || lower.includes("size")) {
    return "spacing"
  }
  if (lower.includes("font") || lower.includes("text") || lower.includes("line") ||
      lower.includes("letter") || lower.includes("weight")) {
    return "typography"
  }
  return "other"
}

// Check if value is a color
function isColorValue(value: string): boolean {
  return /^(#|rgb|hsl|hwb|lab|lch|oklch|oklab)/i.test(value) ||
    /^(red|blue|green|white|black|gray|transparent)/i.test(value)
}

export function CSSVariablesEditor() {
  const { isOpen } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [variables, setVariables] = useState<CSSVariable[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState<"all" | CSSVariable["category"]>("all")
  const [editingVar, setEditingVar] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  // Scan for CSS variables
  const scan = useCallback(() => {
    const found: CSSVariable[] = []
    const rootStyles = getComputedStyle(document.documentElement)

    // Get all CSS variables from :root
    for (let i = 0; i < rootStyles.length; i++) {
      const prop = rootStyles[i]
      if (prop.startsWith("--")) {
        const value = rootStyles.getPropertyValue(prop).trim()
        found.push({
          name: prop,
          value,
          originalValue: value,
          category: categorizeVariable(prop),
          isModified: false,
        })
      }
    }

    // Sort alphabetically
    found.sort((a, b) => a.name.localeCompare(b.name))

    setVariables(found)
    toast.success(`Found ${found.length} CSS variables`)
  }, [])

  // Update variable
  const updateVariable = useCallback((name: string, newValue: string) => {
    document.documentElement.style.setProperty(name, newValue)

    setVariables(prev =>
      prev.map(v =>
        v.name === name
          ? { ...v, value: newValue, isModified: newValue !== v.originalValue }
          : v
      )
    )

    setEditingVar(null)
    toast.success(`Updated ${name}`)
  }, [])

  // Reset variable
  const resetVariable = useCallback((name: string) => {
    const variable = variables.find(v => v.name === name)
    if (!variable) return

    document.documentElement.style.setProperty(name, variable.originalValue)

    setVariables(prev =>
      prev.map(v =>
        v.name === name
          ? { ...v, value: v.originalValue, isModified: false }
          : v
      )
    )

    toast.success(`Reset ${name}`)
  }, [variables])

  // Reset all
  const resetAll = useCallback(() => {
    variables.forEach(v => {
      if (v.isModified) {
        document.documentElement.style.setProperty(v.name, v.originalValue)
      }
    })

    setVariables(prev =>
      prev.map(v => ({ ...v, value: v.originalValue, isModified: false }))
    )

    toast.success("All variables reset")
  }, [variables])

  // Copy all modified
  const copyModified = useCallback(() => {
    const modified = variables.filter(v => v.isModified)
    if (modified.length === 0) {
      toast.error("No modified variables")
      return
    }

    const css = `:root {\n${modified.map(v => `  ${v.name}: ${v.value};`).join("\n")}\n}`
    navigator.clipboard.writeText(css)
    toast.success("Copied modified variables")
  }, [variables])

  // Filter variables
  const filteredVariables = useMemo(() => {
    return variables.filter(v => {
      const matchesSearch = !searchTerm ||
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.value.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = activeCategory === "all" || v.category === activeCategory

      return matchesSearch && matchesCategory
    })
  }, [variables, searchTerm, activeCategory])

  // Stats
  const stats = useMemo(() => ({
    total: variables.length,
    modified: variables.filter(v => v.isModified).length,
    colors: variables.filter(v => v.category === "color").length,
    spacing: variables.filter(v => v.category === "spacing").length,
  }), [variables])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Variable className="h-4 w-4 text-emerald-500" />
          <span>CSS Variables</span>
          {stats.modified > 0 && (
            <Badge variant="default" className="text-[10px] px-1 h-4">
              {stats.modified} modified
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Scan button */}
        <Button variant="default" size="sm" className="w-full h-7" onClick={scan}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Scan Variables
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-7 text-xs pl-7"
            placeholder="Search variables..."
          />
        </div>

        {/* Category tabs */}
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as typeof activeCategory)}>
          <TabsList className="grid w-full grid-cols-5 h-7">
            <TabsTrigger value="all" className="text-[9px]">All</TabsTrigger>
            <TabsTrigger value="color" className="text-[9px]">Color</TabsTrigger>
            <TabsTrigger value="spacing" className="text-[9px]">Space</TabsTrigger>
            <TabsTrigger value="typography" className="text-[9px]">Type</TabsTrigger>
            <TabsTrigger value="other" className="text-[9px]">Other</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Variables list */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {filteredVariables.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                {variables.length === 0 ? "Click Scan to find CSS variables" : "No matching variables"}
              </div>
            ) : (
              filteredVariables.map((variable) => (
                <div
                  key={variable.name}
                  className={cn(
                    "p-2 rounded border",
                    variable.isModified
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-muted/30 border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-[10px] text-primary truncate flex-1">
                      {variable.name}
                    </code>
                    {variable.isModified && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => resetVariable(variable.name)}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {editingVar === variable.name ? (
                    <div className="flex gap-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-6 text-[10px] font-mono flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateVariable(variable.name, editValue)
                          }
                          if (e.key === "Escape") {
                            setEditingVar(null)
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => updateVariable(variable.name, editValue)}
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1"
                      onClick={() => {
                        setEditingVar(variable.name)
                        setEditValue(variable.value)
                      }}
                    >
                      {isColorValue(variable.value) && (
                        <span
                          className="w-4 h-4 rounded border shrink-0"
                          style={{ backgroundColor: `var(${variable.name})` }}
                        />
                      )}
                      <code className="text-[10px] text-muted-foreground truncate">
                        {variable.value}
                      </code>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={copyModified}
            disabled={stats.modified === 0}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy Modified
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={resetAll}
            disabled={stats.modified === 0}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset All
          </Button>
        </div>

        {/* Stats */}
        <div className="p-2 bg-muted/30 rounded text-[10px] grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="font-bold">{stats.total}</div>
            <div className="text-muted-foreground">Total</div>
          </div>
          <div>
            <div className="font-bold">{stats.colors}</div>
            <div className="text-muted-foreground">Colors</div>
          </div>
          <div>
            <div className="font-bold">{stats.spacing}</div>
            <div className="text-muted-foreground">Spacing</div>
          </div>
          <div>
            <div className="font-bold text-emerald-500">{stats.modified}</div>
            <div className="text-muted-foreground">Modified</div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

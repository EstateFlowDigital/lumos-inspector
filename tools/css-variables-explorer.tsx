"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Search, Copy, Plus, Trash2, Edit2, Check, X, Palette
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"

// CSS Variable type
interface CSSVariable {
  name: string
  value: string
  computedValue: string
  source: string // stylesheet name or "inline"
  category: string
}

// Category detection based on variable name
function detectCategory(name: string): string {
  const lowerName = name.toLowerCase()
  if (lowerName.includes("color") || lowerName.includes("bg") || lowerName.includes("foreground")) {
    return "Colors"
  }
  if (lowerName.includes("font") || lowerName.includes("text") || lowerName.includes("letter") || lowerName.includes("line-height")) {
    return "Typography"
  }
  if (lowerName.includes("space") || lowerName.includes("gap") || lowerName.includes("margin") || lowerName.includes("padding")) {
    return "Spacing"
  }
  if (lowerName.includes("radius") || lowerName.includes("rounded")) {
    return "Border Radius"
  }
  if (lowerName.includes("shadow")) {
    return "Shadows"
  }
  if (lowerName.includes("z-") || lowerName.includes("zindex")) {
    return "Z-Index"
  }
  if (lowerName.includes("transition") || lowerName.includes("duration") || lowerName.includes("ease")) {
    return "Animation"
  }
  if (lowerName.includes("breakpoint") || lowerName.includes("screen")) {
    return "Breakpoints"
  }
  return "Other"
}

// Check if value is a color
function isColorValue(value: string): boolean {
  return (
    value.startsWith("#") ||
    value.startsWith("rgb") ||
    value.startsWith("hsl") ||
    value.startsWith("oklch") ||
    /^(red|blue|green|yellow|purple|orange|pink|gray|black|white|transparent)$/i.test(value)
  )
}

// Extract all CSS variables from the document
function extractCSSVariables(): CSSVariable[] {
  const variables: Map<string, CSSVariable> = new Map()

  // Get computed styles from :root
  const rootStyles = getComputedStyle(document.documentElement)

  // Extract from all stylesheets
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      const rules = sheet.cssRules || sheet.rules
      if (!rules) return

      Array.from(rules).forEach((rule) => {
        if (rule instanceof CSSStyleRule && rule.selectorText === ":root") {
          const style = rule.style
          for (let i = 0; i < style.length; i++) {
            const prop = style[i]
            if (prop.startsWith("--")) {
              const value = style.getPropertyValue(prop).trim()
              const computedValue = rootStyles.getPropertyValue(prop).trim()

              variables.set(prop, {
                name: prop,
                value,
                computedValue: computedValue || value,
                source: sheet.href ? new URL(sheet.href).pathname.split("/").pop() || "stylesheet" : "inline",
                category: detectCategory(prop),
              })
            }
          }
        }
      })
    } catch (e) {
      // CORS restriction on external stylesheets
    }
  })

  // Also check inline styles on :root
  const rootElement = document.documentElement
  const inlineStyle = rootElement.getAttribute("style")
  if (inlineStyle) {
    const matches = inlineStyle.matchAll(/--[\w-]+:\s*[^;]+/g)
    for (const match of matches) {
      const [prop, value] = match[0].split(":").map((s) => s.trim())
      if (!variables.has(prop)) {
        variables.set(prop, {
          name: prop,
          value,
          computedValue: rootStyles.getPropertyValue(prop).trim() || value,
          source: "inline",
          category: detectCategory(prop),
        })
      }
    }
  }

  return Array.from(variables.values()).sort((a, b) => a.name.localeCompare(b.name))
}

interface CSSVariablesExplorerProps {
  onApplyVariable?: (variableName: string) => void
}

export function CSSVariablesExplorer({ onApplyVariable }: CSSVariablesExplorerProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [variables, setVariables] = useState<CSSVariable[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [editingVar, setEditingVar] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newVarName, setNewVarName] = useState("")
  const [newVarValue, setNewVarValue] = useState("")

  // Load variables on mount
  useEffect(() => {
    setVariables(extractCSSVariables())
  }, [])

  // Refresh variables
  const refreshVariables = useCallback(() => {
    setVariables(extractCSSVariables())
    toast.success("Variables refreshed")
  }, [])

  // Filter variables
  const filteredVariables = useMemo(() => {
    return variables.filter((v) => {
      const matchesSearch =
        !searchQuery ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.value.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = !selectedCategory || v.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [variables, searchQuery, selectedCategory])

  // Group by category
  const groupedVariables = useMemo(() => {
    const groups: Record<string, CSSVariable[]> = {}
    filteredVariables.forEach((v) => {
      if (!groups[v.category]) {
        groups[v.category] = []
      }
      groups[v.category].push(v)
    })
    return groups
  }, [filteredVariables])

  // Get all categories
  const categories = useMemo(() => {
    const cats = new Set(variables.map((v) => v.category))
    return Array.from(cats).sort()
  }, [variables])

  // Copy variable to clipboard
  const copyVariable = useCallback((variable: CSSVariable) => {
    navigator.clipboard.writeText(`var(${variable.name})`)
    toast.success(`Copied var(${variable.name})`)
  }, [])

  // Start editing a variable
  const startEdit = useCallback((variable: CSSVariable) => {
    setEditingVar(variable.name)
    setEditValue(variable.value)
  }, [])

  // Save edited variable
  const saveEdit = useCallback(() => {
    if (!editingVar) return

    document.documentElement.style.setProperty(editingVar, editValue)
    setVariables((prev) =>
      prev.map((v) =>
        v.name === editingVar
          ? { ...v, value: editValue, computedValue: editValue, source: "inline" }
          : v
      )
    )
    setEditingVar(null)
    toast.success("Variable updated")
  }, [editingVar, editValue])

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingVar(null)
    setEditValue("")
  }, [])

  // Create new variable
  const createVariable = useCallback(() => {
    if (!newVarName || !newVarValue) {
      toast.error("Name and value are required")
      return
    }

    const name = newVarName.startsWith("--") ? newVarName : `--${newVarName}`
    document.documentElement.style.setProperty(name, newVarValue)

    setVariables((prev) => [
      ...prev,
      {
        name,
        value: newVarValue,
        computedValue: newVarValue,
        source: "inline",
        category: detectCategory(name),
      },
    ])

    setNewVarName("")
    setNewVarValue("")
    setShowCreateDialog(false)
    toast.success("Variable created")
  }, [newVarName, newVarValue])

  // Delete variable (only inline ones)
  const deleteVariable = useCallback((name: string) => {
    document.documentElement.style.removeProperty(name)
    setVariables((prev) => prev.filter((v) => v.name !== name))
    toast.success("Variable deleted")
  }, [])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-chart-5" />
          <span>CSS Variables</span>
          <Badge variant="secondary" className="text-[10px] px-1 h-4">
            {variables.length}
          </Badge>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Search & Actions */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search variables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs pl-8"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 px-2" onClick={refreshVariables}>
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create CSS Variable</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Variable Name</Label>
                  <Input
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    placeholder="--my-custom-color"
                  />
                </div>
                <div>
                  <Label>Value</Label>
                  <Input
                    value={newVarValue}
                    onChange={(e) => setNewVarValue(e.target.value)}
                    placeholder="#3b82f6"
                  />
                </div>
                <Button className="w-full" onClick={createVariable}>
                  Create Variable
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Variables List */}
        <ScrollArea className="h-[250px]">
          <div className="space-y-3">
            {Object.entries(groupedVariables).map(([category, vars]) => (
              <div key={category}>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {category} ({vars.length})
                </div>
                <div className="space-y-1">
                  {vars.map((variable) => (
                    <div
                      key={variable.name}
                      className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 group"
                    >
                      {/* Color swatch if applicable */}
                      {isColorValue(variable.computedValue) && (
                        <div
                          className="w-4 h-4 rounded border flex-shrink-0"
                          style={{ backgroundColor: variable.computedValue }}
                        />
                      )}

                      {/* Variable name and value */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono truncate">{variable.name}</div>
                        {editingVar === variable.name ? (
                          <div className="flex items-center gap-1 mt-1">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-6 text-[10px] font-mono"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={saveEdit}
                            >
                              <Check className="h-3 w-3 text-[--accent-green]" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={cancelEdit}
                            >
                              <X className="h-3 w-3 text-[--destructive]" />
                            </Button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground font-mono truncate">
                            {variable.value}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {editingVar !== variable.name && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyVariable(variable)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => startEdit(variable)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          {variable.source === "inline" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => deleteVariable(variable.name)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                          {onApplyVariable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => onApplyVariable(variable.name)}
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredVariables.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No variables found
              </div>
            )}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  )
}

"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { Keyboard, RotateCcw, Search, AlertCircle } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { Switch } from "../ui/switch"
import { ScrollArea } from "../ui/scroll-area"
import {
  useKeyboardShortcuts,
  useKeyRecorder,
  formatKeyCombo,
  ShortcutDefinition,
  ShortcutCategory,
} from "./keyboard-shortcuts-manager"

// Category display names and icons
const categoryInfo: Record<ShortcutCategory, { name: string; color: string }> = {
  general: { name: "General", color: "bg-blue-500/10 text-blue-500" },
  navigation: { name: "Navigation", color: "bg-green-500/10 text-green-500" },
  editing: { name: "Editing", color: "bg-orange-500/10 text-orange-500" },
  selection: { name: "Selection", color: "bg-purple-500/10 text-purple-500" },
  tools: { name: "Tools", color: "bg-pink-500/10 text-pink-500" },
  view: { name: "View", color: "bg-cyan-500/10 text-cyan-500" },
}

interface KeyboardShortcutsPanelProps {
  className?: string
}

export function KeyboardShortcutsPanel({ className }: KeyboardShortcutsPanelProps) {
  const manager = useKeyboardShortcuts()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<ShortcutCategory | "all">("all")

  const shortcuts = manager.getAll()

  // Filter shortcuts
  const filteredShortcuts = shortcuts.filter((shortcut) => {
    const matchesSearch =
      searchQuery === "" ||
      shortcut.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.currentKeys.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      filterCategory === "all" || shortcut.category === filterCategory

    return matchesSearch && matchesCategory
  })

  // Group by category
  const groupedShortcuts = filteredShortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = []
      }
      acc[shortcut.category].push(shortcut)
      return acc
    },
    {} as Record<ShortcutCategory, ShortcutDefinition[]>
  )

  const handleResetAll = useCallback(() => {
    if (confirm("Reset all keyboard shortcuts to their defaults?")) {
      manager.resetAllToDefaults()
    }
  }, [manager])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          <h2 className="font-semibold">Keyboard Shortcuts</h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleResetAll}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset All
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="p-4 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant={filterCategory === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilterCategory("all")}
          >
            All
          </Badge>
          {Object.entries(categoryInfo).map(([key, { name }]) => (
            <Badge
              key={key}
              variant={filterCategory === key ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilterCategory(key as ShortcutCategory)}
            >
              {name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Shortcuts List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {categoryInfo[category as ShortcutCategory]?.name || category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut) => (
                  <ShortcutRow
                    key={shortcut.id}
                    shortcut={shortcut}
                    isEditing={editingId === shortcut.id}
                    onStartEdit={() => setEditingId(shortcut.id)}
                    onStopEdit={() => setEditingId(null)}
                    onUpdateKeys={(keys) => manager.updateKeys(shortcut.id, keys)}
                    onToggleEnabled={() => manager.toggleEnabled(shortcut.id)}
                    onReset={() => manager.resetToDefault(shortcut.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Keyboard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No shortcuts found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Individual shortcut row
interface ShortcutRowProps {
  shortcut: ShortcutDefinition
  isEditing: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onUpdateKeys: (keys: string) => boolean
  onToggleEnabled: () => void
  onReset: () => void
}

function ShortcutRow({
  shortcut,
  isEditing,
  onStartEdit,
  onStopEdit,
  onUpdateKeys,
  onToggleEnabled,
  onReset,
}: ShortcutRowProps) {
  const { recording, keys, startRecording, stopRecording } = useKeyRecorder()
  const [error, setError] = useState<string | null>(null)

  const handleStartRecording = () => {
    setError(null)
    onStartEdit()
    startRecording()
  }

  const handleKeyRecorded = useCallback(() => {
    if (keys) {
      const success = onUpdateKeys(keys)
      if (!success) {
        setError("This shortcut conflicts with another")
        setTimeout(() => setError(null), 3000)
      }
    }
    stopRecording()
    onStopEdit()
  }, [keys, onUpdateKeys, stopRecording, onStopEdit])

  // Handle recorded key
  React.useEffect(() => {
    if (keys && !recording) {
      handleKeyRecorded()
    }
  }, [keys, recording, handleKeyRecorded])

  const isModified = shortcut.currentKeys !== shortcut.defaultKeys

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border bg-card",
        !shortcut.enabled && "opacity-50"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{shortcut.name}</span>
          {isModified && (
            <Badge variant="secondary" className="text-xs">
              Modified
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {shortcut.description}
        </p>
        {error && (
          <div className="flex items-center gap-1 text-xs text-destructive mt-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Key combo button */}
        <button
          onClick={handleStartRecording}
          disabled={!shortcut.enabled}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-mono",
            "border bg-muted/50 hover:bg-muted transition-colors",
            "min-w-[80px] text-center",
            recording && isEditing && "ring-2 ring-primary animate-pulse"
          )}
        >
          {recording && isEditing ? (
            <span className="text-primary">Press keys...</span>
          ) : (
            formatKeyCombo(shortcut.currentKeys)
          )}
        </button>

        {/* Reset button (if modified) */}
        {isModified && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onReset}
            title="Reset to default"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Enable/disable toggle */}
        <Switch
          checked={shortcut.enabled}
          onCheckedChange={onToggleEnabled}
        />
      </div>
    </div>
  )
}

// Compact version for settings popover
export function KeyboardShortcutsCompact() {
  const manager = useKeyboardShortcuts()
  const shortcuts = manager.getAll().slice(0, 10) // Show top 10

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm">Quick Shortcuts</h4>
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          View All
        </Button>
      </div>

      {shortcuts.map((shortcut) => (
        <div
          key={shortcut.id}
          className="flex items-center justify-between py-1"
        >
          <span className="text-sm text-muted-foreground">{shortcut.name}</span>
          <kbd className="px-2 py-0.5 text-xs font-mono bg-muted rounded">
            {formatKeyCombo(shortcut.currentKeys)}
          </kbd>
        </div>
      ))}
    </div>
  )
}

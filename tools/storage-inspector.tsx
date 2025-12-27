"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  ChevronDown, Database, RefreshCw, Trash2, Plus, Copy, Edit2, Check, X
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface StorageItem {
  key: string
  value: string
  size: number
}

function getStorageItems(storage: Storage): StorageItem[] {
  const items: StorageItem[] = []

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key) {
      const value = storage.getItem(key) || ""
      items.push({
        key,
        value,
        size: new Blob([value]).size,
      })
    }
  }

  return items.sort((a, b) => a.key.localeCompare(b.key))
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatValue(value: string): string {
  try {
    const parsed = JSON.parse(value)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return value
  }
}

export function StorageInspector() {
  const { isOpen } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [storageType, setStorageType] = useState<"local" | "session">("local")
  const [items, setItems] = useState<StorageItem[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)

  // Get current storage
  const getStorage = useCallback((): Storage | null => {
    if (typeof window === "undefined") return null
    return storageType === "local" ? localStorage : sessionStorage
  }, [storageType])

  // Refresh items
  const refresh = useCallback(() => {
    const storage = getStorage()
    if (storage) {
      setItems(getStorageItems(storage))
    }
  }, [getStorage])

  // Load items on mount and storage type change
  useEffect(() => {
    refresh()
  }, [refresh, storageType])

  // Delete item
  const deleteItem = useCallback((key: string) => {
    const storage = getStorage()
    if (storage) {
      storage.removeItem(key)
      refresh()
      setSelectedKey(null)
      toast.success(`Deleted "${key}"`)
    }
  }, [getStorage, refresh])

  // Clear all
  const clearAll = useCallback(() => {
    const storage = getStorage()
    if (storage) {
      storage.clear()
      refresh()
      setSelectedKey(null)
      toast.success(`Cleared ${storageType}Storage`)
    }
  }, [getStorage, refresh, storageType])

  // Add new item
  const addItem = useCallback(() => {
    if (!newKey.trim()) {
      toast.error("Key is required")
      return
    }

    const storage = getStorage()
    if (storage) {
      storage.setItem(newKey, newValue)
      refresh()
      setNewKey("")
      setNewValue("")
      setShowAddForm(false)
      toast.success(`Added "${newKey}"`)
    }
  }, [getStorage, refresh, newKey, newValue])

  // Start editing
  const startEdit = useCallback((key: string, value: string) => {
    setEditingKey(key)
    setEditValue(value)
  }, [])

  // Save edit
  const saveEdit = useCallback(() => {
    if (!editingKey) return

    const storage = getStorage()
    if (storage) {
      storage.setItem(editingKey, editValue)
      refresh()
      setEditingKey(null)
      setEditValue("")
      toast.success(`Updated "${editingKey}"`)
    }
  }, [getStorage, refresh, editingKey, editValue])

  // Copy value
  const copyValue = useCallback((value: string) => {
    navigator.clipboard.writeText(value)
    toast.success("Copied to clipboard")
  }, [])

  // Total size
  const totalSize = items.reduce((sum, item) => sum + item.size, 0)

  // Selected item
  const selectedItem = items.find(i => i.key === selectedKey)

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-green-500" />
          <span>Storage</span>
          <Badge variant="secondary" className="text-[10px] px-1 h-4">
            {items.length}
          </Badge>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Storage type tabs */}
        <Tabs value={storageType} onValueChange={(v) => setStorageType(v as "local" | "session")}>
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="local" className="text-[10px]">localStorage</TabsTrigger>
            <TabsTrigger value="session" className="text-[10px]">sessionStorage</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Stats */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{items.length} items</span>
          <span>{formatSize(totalSize)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-7" onClick={refresh}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-destructive"
            onClick={clearAll}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="p-2 bg-muted/50 rounded space-y-2">
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="h-7 text-xs"
              placeholder="Key"
            />
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="h-7 text-xs"
              placeholder="Value"
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7" onClick={addItem}>
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Items list */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {items.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No items in {storageType}Storage
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.key}
                  className={cn(
                    "p-2 rounded cursor-pointer hover:bg-muted/50",
                    selectedKey === item.key && "bg-muted"
                  )}
                  onClick={() => setSelectedKey(item.key)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono truncate flex-1">{item.key}</span>
                    <span className="text-[9px] text-muted-foreground ml-2">
                      {formatSize(item.size)}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {item.value.substring(0, 50)}
                    {item.value.length > 50 && "..."}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Selected item detail */}
        {selectedItem && (
          <div className="p-2 bg-muted/50 rounded space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{selectedItem.key}</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyValue(selectedItem.value)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => startEdit(selectedItem.key, selectedItem.value)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => deleteItem(selectedItem.key)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {editingKey === selectedItem.key ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full h-24 text-[10px] font-mono p-2 rounded border bg-background resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-6" onClick={saveEdit}>
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6"
                    onClick={() => setEditingKey(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <pre className="text-[10px] font-mono whitespace-pre-wrap break-all bg-background p-2 rounded max-h-32 overflow-auto">
                {formatValue(selectedItem.value)}
              </pre>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

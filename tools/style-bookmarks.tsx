"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  ChevronDown, Bookmark, Plus, Trash2, Copy, Check
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface StyleBookmark {
  id: string
  name: string
  styles: Record<string, string>
  createdAt: number
}

const STORAGE_KEY = "devtools-style-bookmarks"

// Properties to save
const savedProperties = [
  "display", "position", "width", "height", "padding", "margin",
  "background-color", "color", "border", "border-radius",
  "font-size", "font-weight", "font-family", "line-height",
  "flex-direction", "justify-content", "align-items", "gap",
  "box-shadow", "opacity", "transform", "transition",
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function StyleBookmarks() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [bookmarks, setBookmarks] = useState<StyleBookmark[]>([])
  const [newName, setNewName] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)

  // Load bookmarks from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return

    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to load bookmarks", e)
      }
    }
  }, [])

  // Save bookmarks to localStorage
  const saveBookmarks = useCallback((newBookmarks: StyleBookmark[]) => {
    setBookmarks(newBookmarks)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBookmarks))
  }, [])

  // Add bookmark from selected element
  const addBookmark = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    if (!newName.trim()) {
      toast.error("Please enter a name")
      return
    }

    const computed = getComputedStyle(selectedElement.element)
    const styles: Record<string, string> = {}

    savedProperties.forEach(prop => {
      const value = computed.getPropertyValue(prop)
      if (value) {
        styles[prop] = value
      }
    })

    const bookmark: StyleBookmark = {
      id: generateId(),
      name: newName.trim(),
      styles,
      createdAt: Date.now(),
    }

    saveBookmarks([...bookmarks, bookmark])
    setNewName("")
    setShowAddForm(false)
    toast.success(`Saved "${bookmark.name}"`)
  }, [selectedElement, newName, bookmarks, saveBookmarks])

  // Apply bookmark to selected element
  const applyBookmark = useCallback((bookmark: StyleBookmark) => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    Object.entries(bookmark.styles).forEach(([prop, value]) => {
      selectedElement.element.style.setProperty(prop, value)
    })

    notifyStyleChange()
    toast.success(`Applied "${bookmark.name}"`)
  }, [selectedElement, notifyStyleChange])

  // Delete bookmark
  const deleteBookmark = useCallback((id: string) => {
    saveBookmarks(bookmarks.filter(b => b.id !== id))
    toast.success("Bookmark deleted")
  }, [bookmarks, saveBookmarks])

  // Copy bookmark styles as CSS
  const copyBookmark = useCallback((bookmark: StyleBookmark) => {
    const css = Object.entries(bookmark.styles)
      .map(([prop, value]) => `${prop}: ${value};`)
      .join("\n")

    navigator.clipboard.writeText(css)
    toast.success("CSS copied to clipboard")
  }, [])

  // Get style preview
  const getPreviewStyles = (styles: Record<string, string>): React.CSSProperties => {
    return {
      backgroundColor: styles["background-color"],
      color: styles["color"],
      borderRadius: styles["border-radius"],
      border: styles["border"],
    }
  }

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-amber-500" />
          <span>Style Bookmarks</span>
          {bookmarks.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4">
              {bookmarks.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Add button */}
        {!showAddForm ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7"
            onClick={() => setShowAddForm(true)}
            disabled={!selectedElement}
          >
            <Plus className="h-3 w-3 mr-1" />
            Save Current Styles
          </Button>
        ) : (
          <div className="p-2 bg-muted/50 rounded space-y-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-7 text-xs"
              placeholder="Bookmark name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") addBookmark()
                if (e.key === "Escape") setShowAddForm(false)
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7" onClick={addBookmark}>
                <Check className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => {
                  setShowAddForm(false)
                  setNewName("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Bookmarks list */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {bookmarks.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No bookmarks yet. Select an element and save its styles.
              </div>
            ) : (
              bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="p-2 bg-card border rounded-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border"
                        style={getPreviewStyles(bookmark.styles)}
                      />
                      <span className="text-xs font-medium">{bookmark.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyBookmark(bookmark)}
                        title="Copy CSS"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => deleteBookmark(bookmark.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {Object.keys(bookmark.styles).slice(0, 5).map(prop => (
                      <Badge key={prop} variant="outline" className="text-[8px] h-4 px-1">
                        {prop}
                      </Badge>
                    ))}
                    {Object.keys(bookmark.styles).length > 5 && (
                      <Badge variant="outline" className="text-[8px] h-4 px-1">
                        +{Object.keys(bookmark.styles).length - 5}
                      </Badge>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-6 text-[10px]"
                    onClick={() => applyBookmark(bookmark)}
                    disabled={!selectedElement}
                  >
                    Apply to Selected
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Info */}
        <div className="text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
          Saves {savedProperties.length} CSS properties including layout, typography, and effects.
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

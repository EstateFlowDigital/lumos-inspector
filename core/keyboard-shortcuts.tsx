"use client"

import { useEffect, useCallback } from "react"
import { toast } from "sonner"
import { useInspector } from "./inspector-context"

// Keyboard shortcut definitions
export const SHORTCUTS = {
  // Selection & Navigation
  ESCAPE: { key: "Escape", description: "Deselect element / Close panels" },
  DELETE: { key: "Delete", description: "Delete selected element" },
  BACKSPACE: { key: "Backspace", description: "Delete selected element" },

  // Undo/Redo
  UNDO: { key: "z", meta: true, description: "Undo last change" },
  REDO: { key: "z", meta: true, shift: true, description: "Redo last change" },
  REDO_ALT: { key: "y", meta: true, description: "Redo last change" },

  // Copy/Paste
  COPY: { key: "c", meta: true, description: "Copy element styles" },
  PASTE: { key: "v", meta: true, description: "Paste element styles" },
  COPY_AS_HTML: { key: "c", meta: true, shift: true, description: "Copy as HTML" },

  // Nudge position
  NUDGE_UP: { key: "ArrowUp", description: "Nudge up 1px" },
  NUDGE_DOWN: { key: "ArrowDown", description: "Nudge down 1px" },
  NUDGE_LEFT: { key: "ArrowLeft", description: "Nudge left 1px" },
  NUDGE_RIGHT: { key: "ArrowRight", description: "Nudge right 1px" },
  NUDGE_UP_10: { key: "ArrowUp", shift: true, description: "Nudge up 10px" },
  NUDGE_DOWN_10: { key: "ArrowDown", shift: true, description: "Nudge down 10px" },
  NUDGE_LEFT_10: { key: "ArrowLeft", shift: true, description: "Nudge left 10px" },
  NUDGE_RIGHT_10: { key: "ArrowRight", shift: true, description: "Nudge right 10px" },

  // Toggle panels
  TOGGLE_NAVIGATOR: { key: "1", meta: true, description: "Toggle Navigator panel" },
  TOGGLE_INSPECTOR: { key: "2", meta: true, description: "Toggle Inspector panel" },
  TOGGLE_ADD_ELEMENT: { key: "a", meta: true, shift: true, description: "Toggle Add Element panel" },

  // Inspection
  TOGGLE_INSPECT: { key: "i", meta: true, shift: true, description: "Toggle inspect mode" },
  REFRESH_TREE: { key: "r", meta: true, shift: true, description: "Refresh DOM tree" },

  // Quick actions
  DUPLICATE: { key: "d", meta: true, description: "Duplicate element" },
  WRAP_DIV: { key: "g", meta: true, description: "Wrap in div" },
} as const

// Style clipboard for copy/paste
let styleClipboard: Record<string, string> | null = null

export function KeyboardShortcuts() {
  const {
    isOpen,
    selectedElement,
    setSelectedElement,
    showNavigator,
    setShowNavigator,
    showInspector,
    setShowInspector,
    showAddElement,
    setShowAddElement,
    isInspecting,
    setIsInspecting,
    refreshDOMTree,
  } = useInspector()

  // Copy styles from selected element
  const copyStyles = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const computed = window.getComputedStyle(selectedElement.element)
    const stylesToCopy = [
      "display", "position", "width", "height", "margin", "padding",
      "backgroundColor", "color", "fontSize", "fontWeight", "fontFamily",
      "border", "borderRadius", "boxShadow", "opacity", "transform",
      "flexDirection", "justifyContent", "alignItems", "gap",
    ]

    styleClipboard = {}
    stylesToCopy.forEach(prop => {
      const value = computed.getPropertyValue(prop.replace(/([A-Z])/g, "-$1").toLowerCase())
      if (value && value !== "none" && value !== "normal" && value !== "auto") {
        styleClipboard![prop] = value
      }
    })

    toast.success("Styles copied", { duration: 2000 })
  }, [selectedElement])

  // Paste styles to selected element
  const pasteStyles = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    if (!styleClipboard) {
      toast.error("No styles in clipboard")
      return
    }

    Object.entries(styleClipboard).forEach(([prop, value]) => {
      selectedElement.element.style.setProperty(
        prop.replace(/([A-Z])/g, "-$1").toLowerCase(),
        value
      )
    })

    toast.success("Styles pasted", { duration: 2000 })
  }, [selectedElement])

  // Copy as HTML
  const copyAsHTML = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const html = selectedElement.element.outerHTML
    navigator.clipboard.writeText(html)
    toast.success("HTML copied to clipboard", { duration: 2000 })
  }, [selectedElement])

  // Nudge element position
  const nudgeElement = useCallback((direction: "up" | "down" | "left" | "right", amount: number) => {
    if (!selectedElement?.element) return

    const el = selectedElement.element
    const computed = window.getComputedStyle(el)
    const position = computed.position

    // Only nudge if positioned
    if (position === "static") {
      el.style.position = "relative"
    }

    const currentTop = parseInt(computed.top) || 0
    const currentLeft = parseInt(computed.left) || 0

    switch (direction) {
      case "up":
        el.style.top = `${currentTop - amount}px`
        break
      case "down":
        el.style.top = `${currentTop + amount}px`
        break
      case "left":
        el.style.left = `${currentLeft - amount}px`
        break
      case "right":
        el.style.left = `${currentLeft + amount}px`
        break
    }
  }, [selectedElement])

  // Delete selected element
  const deleteElement = useCallback(() => {
    if (!selectedElement?.element) return

    const el = selectedElement.element
    const parent = el.parentElement

    if (!parent || el.tagName === "BODY" || el.tagName === "HTML") {
      toast.error("Cannot delete this element")
      return
    }

    el.remove()
    setSelectedElement(null)
    refreshDOMTree()
    toast.success("Element deleted", { duration: 2000 })
  }, [selectedElement, setSelectedElement, refreshDOMTree])

  // Duplicate selected element
  const duplicateElement = useCallback(() => {
    if (!selectedElement?.element) return

    const el = selectedElement.element
    const clone = el.cloneNode(true) as HTMLElement

    // Insert after the original
    el.parentElement?.insertBefore(clone, el.nextSibling)
    refreshDOMTree()
    toast.success("Element duplicated", { duration: 2000 })
  }, [selectedElement, refreshDOMTree])

  // Wrap element in div
  const wrapInDiv = useCallback(() => {
    if (!selectedElement?.element) return

    const el = selectedElement.element
    const wrapper = document.createElement("div")
    wrapper.className = "lumos-wrapper"

    el.parentElement?.insertBefore(wrapper, el)
    wrapper.appendChild(el)
    refreshDOMTree()
    toast.success("Wrapped in div", { duration: 2000 })
  }, [selectedElement, refreshDOMTree])

  // Main keyboard handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle if typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement).isContentEditable
    ) {
      return
    }

    // Only handle when inspector is open
    if (!isOpen) return

    const isMeta = e.metaKey || e.ctrlKey
    const isShift = e.shiftKey

    // Escape - deselect
    if (e.key === "Escape") {
      if (selectedElement) {
        setSelectedElement(null)
        e.preventDefault()
      }
      return
    }

    // Delete/Backspace - delete element
    if ((e.key === "Delete" || e.key === "Backspace") && selectedElement) {
      deleteElement()
      e.preventDefault()
      return
    }

    // Cmd/Ctrl + Z - Undo (handled by inspector context if available)
    // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y - Redo

    // Cmd/Ctrl + C - Copy styles
    if (isMeta && e.key === "c" && !isShift && selectedElement) {
      copyStyles()
      e.preventDefault()
      return
    }

    // Cmd/Ctrl + Shift + C - Copy as HTML
    if (isMeta && e.key === "c" && isShift && selectedElement) {
      copyAsHTML()
      e.preventDefault()
      return
    }

    // Cmd/Ctrl + V - Paste styles
    if (isMeta && e.key === "v" && selectedElement) {
      pasteStyles()
      e.preventDefault()
      return
    }

    // Cmd/Ctrl + D - Duplicate
    if (isMeta && e.key === "d" && selectedElement) {
      duplicateElement()
      e.preventDefault()
      return
    }

    // Cmd/Ctrl + G - Wrap in div
    if (isMeta && e.key === "g" && selectedElement) {
      wrapInDiv()
      e.preventDefault()
      return
    }

    // Cmd/Ctrl + 1 - Toggle Navigator
    if (isMeta && e.key === "1") {
      setShowNavigator(!showNavigator)
      e.preventDefault()
      return
    }

    // Cmd/Ctrl + 2 - Toggle Inspector
    if (isMeta && e.key === "2") {
      setShowInspector(!showInspector)
      e.preventDefault()
      return
    }

    // Cmd/Ctrl + Shift + A - Toggle Add Element
    if (isMeta && isShift && e.key === "a") {
      setShowAddElement(!showAddElement)
      e.preventDefault()
      return
    }

    // Cmd/Ctrl + Shift + I - Toggle Inspect mode
    if (isMeta && isShift && e.key === "i") {
      setIsInspecting(!isInspecting)
      e.preventDefault()
      return
    }

    // Cmd/Ctrl + Shift + R - Refresh tree
    if (isMeta && isShift && e.key === "r") {
      refreshDOMTree()
      toast.success("DOM tree refreshed", { duration: 2000 })
      e.preventDefault()
      return
    }

    // Arrow keys - Nudge
    if (selectedElement && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      const amount = isShift ? 10 : 1
      const direction = e.key.replace("Arrow", "").toLowerCase() as "up" | "down" | "left" | "right"
      nudgeElement(direction, amount)
      e.preventDefault()
      return
    }
  }, [
    isOpen,
    selectedElement,
    setSelectedElement,
    showNavigator,
    setShowNavigator,
    showInspector,
    setShowInspector,
    showAddElement,
    setShowAddElement,
    isInspecting,
    setIsInspecting,
    refreshDOMTree,
    copyStyles,
    copyAsHTML,
    pasteStyles,
    deleteElement,
    duplicateElement,
    wrapInDiv,
    nudgeElement,
  ])

  // Register global keyboard listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // This component doesn't render anything
  return null
}

// Keyboard shortcuts help panel
export function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  const shortcutGroups = [
    {
      title: "Selection",
      shortcuts: [
        { keys: ["Esc"], description: "Deselect element" },
        { keys: ["Delete"], description: "Delete element" },
        { keys: ["⌘", "D"], description: "Duplicate element" },
        { keys: ["⌘", "G"], description: "Wrap in div" },
      ],
    },
    {
      title: "Clipboard",
      shortcuts: [
        { keys: ["⌘", "C"], description: "Copy styles" },
        { keys: ["⌘", "V"], description: "Paste styles" },
        { keys: ["⌘", "⇧", "C"], description: "Copy as HTML" },
      ],
    },
    {
      title: "Nudge",
      shortcuts: [
        { keys: ["↑↓←→"], description: "Move 1px" },
        { keys: ["⇧", "+", "↑↓←→"], description: "Move 10px" },
      ],
    },
    {
      title: "Panels",
      shortcuts: [
        { keys: ["⌘", "1"], description: "Toggle Navigator" },
        { keys: ["⌘", "2"], description: "Toggle Inspector" },
        { keys: ["⌘", "⇧", "A"], description: "Toggle Add Element" },
        { keys: ["⌘", "⇧", "I"], description: "Toggle Inspect" },
        { keys: ["⌘", "⇧", "R"], description: "Refresh tree" },
      ],
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]" onClick={onClose}>
      <div
        className="bg-card border rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, j) => (
                        <kbd
                          key={j}
                          className="px-2 py-0.5 bg-muted rounded text-xs font-mono"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
          Press <kbd className="px-1 bg-muted rounded">?</kbd> to show/hide this panel
        </div>
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  Copy, Clipboard, Trash2, Copy as Duplicate, Layers, Eye, EyeOff,
  Code, WrapText, Scissors, ArrowUpToLine, ArrowDownToLine,
  MoveUp, MoveDown, AlignCenter, AlignLeft, AlignRight
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { useInspector, ElementInfo } from "./inspector-context"

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  element: HTMLElement
}

interface MenuItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  shortcut?: string
  divider?: boolean
  disabled?: boolean
}

// Style clipboard for copy/paste
let styleClipboard: Record<string, string> | null = null

function ContextMenuContent({ x, y, onClose, element }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { setSelectedElement, refreshDOMTree } = useInspector()

  // Adjust position to stay within viewport
  const [position, setPosition] = useState({ x, y })

  useEffect(() => {
    if (!menuRef.current) return

    const rect = menuRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let newX = x
    let newY = y

    if (x + rect.width > viewportWidth) {
      newX = viewportWidth - rect.width - 10
    }
    if (y + rect.height > viewportHeight) {
      newY = viewportHeight - rect.height - 10
    }

    setPosition({ x: newX, y: newY })
  }, [x, y])

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [onClose])

  // Copy styles
  const copyStyles = useCallback(() => {
    const computed = window.getComputedStyle(element)
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

    toast.success("Styles copied")
    onClose()
  }, [element, onClose])

  // Paste styles
  const pasteStyles = useCallback(() => {
    if (!styleClipboard) {
      toast.error("No styles in clipboard")
      return
    }

    Object.entries(styleClipboard).forEach(([prop, value]) => {
      element.style.setProperty(
        prop.replace(/([A-Z])/g, "-$1").toLowerCase(),
        value
      )
    })

    toast.success("Styles pasted")
    onClose()
  }, [element, onClose])

  // Copy as HTML
  const copyAsHTML = useCallback(() => {
    navigator.clipboard.writeText(element.outerHTML)
    toast.success("HTML copied")
    onClose()
  }, [element, onClose])

  // Copy as JSX
  const copyAsJSX = useCallback(() => {
    let jsx = element.outerHTML
    // Convert class to className
    jsx = jsx.replace(/\sclass="/g, ' className="')
    // Convert for to htmlFor
    jsx = jsx.replace(/\sfor="/g, ' htmlFor="')
    // Self-closing tags
    jsx = jsx.replace(/<(img|input|br|hr)([^>]*)>/g, '<$1$2 />')

    navigator.clipboard.writeText(jsx)
    toast.success("JSX copied")
    onClose()
  }, [element, onClose])

  // Copy Tailwind classes
  const copyTailwindClasses = useCallback(() => {
    const classes = Array.from(element.classList).join(" ")
    navigator.clipboard.writeText(classes)
    toast.success("Classes copied")
    onClose()
  }, [element, onClose])

  // Delete element
  const deleteElement = useCallback(() => {
    const parent = element.parentElement
    if (!parent || element.tagName === "BODY" || element.tagName === "HTML") {
      toast.error("Cannot delete this element")
      return
    }

    element.remove()
    setSelectedElement(null)
    refreshDOMTree()
    toast.success("Element deleted")
    onClose()
  }, [element, setSelectedElement, refreshDOMTree, onClose])

  // Duplicate element
  const duplicateElement = useCallback(() => {
    const clone = element.cloneNode(true) as HTMLElement
    element.parentElement?.insertBefore(clone, element.nextSibling)
    refreshDOMTree()
    toast.success("Element duplicated")
    onClose()
  }, [element, refreshDOMTree, onClose])

  // Wrap in div
  const wrapInDiv = useCallback(() => {
    const wrapper = document.createElement("div")
    wrapper.className = "lumos-wrapper"
    element.parentElement?.insertBefore(wrapper, element)
    wrapper.appendChild(element)
    refreshDOMTree()
    toast.success("Wrapped in div")
    onClose()
  }, [element, refreshDOMTree, onClose])

  // Unwrap (remove parent, keep children)
  const unwrapElement = useCallback(() => {
    const parent = element.parentElement
    if (!parent || element.tagName === "BODY") {
      toast.error("Cannot unwrap this element")
      return
    }

    const children = Array.from(element.children)
    children.forEach(child => {
      parent.insertBefore(child, element)
    })
    element.remove()
    refreshDOMTree()
    toast.success("Element unwrapped")
    onClose()
  }, [element, refreshDOMTree, onClose])

  // Move up (swap with previous sibling)
  const moveUp = useCallback(() => {
    const prev = element.previousElementSibling
    if (!prev) {
      toast.error("Already at top")
      return
    }
    element.parentElement?.insertBefore(element, prev)
    refreshDOMTree()
    onClose()
  }, [element, refreshDOMTree, onClose])

  // Move down (swap with next sibling)
  const moveDown = useCallback(() => {
    const next = element.nextElementSibling
    if (!next) {
      toast.error("Already at bottom")
      return
    }
    element.parentElement?.insertBefore(next, element)
    refreshDOMTree()
    onClose()
  }, [element, refreshDOMTree, onClose])

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    const isHidden = element.style.visibility === "hidden" || element.style.display === "none"
    if (isHidden) {
      element.style.visibility = ""
      element.style.display = ""
      toast.success("Element shown")
    } else {
      element.style.visibility = "hidden"
      toast.success("Element hidden")
    }
    onClose()
  }, [element, onClose])

  // Scroll into view
  const scrollIntoView = useCallback(() => {
    element.scrollIntoView({ behavior: "smooth", block: "center" })
    onClose()
  }, [element, onClose])

  const menuItems: MenuItem[] = [
    { label: "Copy Styles", icon: Copy, action: copyStyles, shortcut: "⌘C" },
    { label: "Paste Styles", icon: Clipboard, action: pasteStyles, shortcut: "⌘V", disabled: !styleClipboard },
    { label: "Copy as HTML", icon: Code, action: copyAsHTML, shortcut: "⌘⇧C", divider: true },
    { label: "Copy as JSX", icon: Code, action: copyAsJSX },
    { label: "Copy Classes", icon: Copy, action: copyTailwindClasses, divider: true },
    { label: "Duplicate", icon: Duplicate, action: duplicateElement, shortcut: "⌘D" },
    { label: "Wrap in Div", icon: WrapText, action: wrapInDiv, shortcut: "⌘G" },
    { label: "Unwrap", icon: Scissors, action: unwrapElement, divider: true },
    { label: "Move Up", icon: MoveUp, action: moveUp },
    { label: "Move Down", icon: MoveDown, action: moveDown, divider: true },
    { label: "Toggle Visibility", icon: element.style.visibility === "hidden" ? Eye : EyeOff, action: toggleVisibility },
    { label: "Scroll to View", icon: AlignCenter, action: scrollIntoView, divider: true },
    { label: "Delete", icon: Trash2, action: deleteElement, shortcut: "⌫" },
  ]

  return (
    <div
      ref={menuRef}
      className="fixed bg-popover border rounded-lg shadow-xl py-1 min-w-[200px] z-[10001]"
      style={{ left: position.x, top: position.y }}
      data-devtools
    >
      {menuItems.map((item, index) => (
        <React.Fragment key={item.label}>
          {item.divider && index > 0 && <div className="my-1 border-t" />}
          <button
            onClick={item.action}
            disabled={item.disabled}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-1.5 text-sm text-left",
              "hover:bg-accent transition-colors",
              item.disabled && "opacity-50 cursor-not-allowed",
              item.label === "Delete" && "text-destructive hover:text-destructive"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-muted-foreground">{item.shortcut}</span>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  )
}

export function ContextMenuProvider() {
  const { isOpen, selectedElement } = useInspector()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; element: HTMLElement } | null>(null)

  // Handle right-click on elements
  useEffect(() => {
    if (!isOpen) return

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Skip devtools elements
      if (target.closest("[data-devtools]")) return

      // Skip if not in inspector mode or no element selected
      if (!selectedElement) return

      // Check if right-clicking on selected element or its children
      if (selectedElement.element.contains(target)) {
        e.preventDefault()
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          element: selectedElement.element,
        })
      }
    }

    document.addEventListener("contextmenu", handleContextMenu)
    return () => document.removeEventListener("contextmenu", handleContextMenu)
  }, [isOpen, selectedElement])

  if (!contextMenu) return null

  return (
    <ContextMenuContent
      x={contextMenu.x}
      y={contextMenu.y}
      element={contextMenu.element}
      onClose={() => setContextMenu(null)}
    />
  )
}

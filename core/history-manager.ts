"use client"

import { getStyleManager } from "../tools/style-manager"

// Types of history entries
export type HistoryEntryType =
  | 'class-style'      // Class-based style change
  | 'inline-style'     // Inline style on specific element
  | 'add-class'        // Class added to element
  | 'remove-class'     // Class removed from element
  | 'dom-add'          // Element added to DOM
  | 'dom-remove'       // Element removed from DOM
  | 'dom-move'         // Element moved in DOM
  | 'attribute'        // Attribute changed

// History entry interface
export interface HistoryEntry {
  id: string
  type: HistoryEntryType
  timestamp: number
  description: string

  // For style changes
  target?: string           // CSS selector or element path
  property?: string         // CSS property
  oldValue?: string         // Previous value
  newValue?: string         // New value

  // For class changes
  element?: WeakRef<HTMLElement>  // WeakRef to avoid memory leaks
  className?: string

  // For DOM changes
  parentPath?: string
  html?: string
  index?: number
}

// History manager class
export class HistoryManager {
  private history: HistoryEntry[] = []
  private currentIndex: number = -1
  private maxHistory: number = 100
  private listeners: Set<() => void> = new Set()

  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Add entry to history
  add(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    // Remove any redo entries
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    const newEntry: HistoryEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
    }

    this.history.push(newEntry)

    // Trim history if too long
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory)
    }

    this.currentIndex = this.history.length - 1
    this.notifyListeners()
  }

  // Undo last action
  undo(): HistoryEntry | null {
    if (!this.canUndo()) return null

    const entry = this.history[this.currentIndex]
    this.applyEntry(entry, 'undo')
    this.currentIndex--
    this.notifyListeners()
    return entry
  }

  // Redo last undone action
  redo(): HistoryEntry | null {
    if (!this.canRedo()) return null

    this.currentIndex++
    const entry = this.history[this.currentIndex]
    this.applyEntry(entry, 'redo')
    this.notifyListeners()
    return entry
  }

  // Check if can undo
  canUndo(): boolean {
    return this.currentIndex >= 0
  }

  // Check if can redo
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  // Apply entry (undo or redo)
  private applyEntry(entry: HistoryEntry, direction: 'undo' | 'redo'): void {
    const value = direction === 'undo' ? entry.oldValue : entry.newValue

    switch (entry.type) {
      case 'class-style':
        if (entry.target && entry.property) {
          const styleManager = getStyleManager()
          styleManager.updateRule(`.${entry.target}`, entry.property, value || '')
        }
        break

      case 'inline-style':
        const element = entry.element?.deref()
        if (element && entry.property) {
          if (value) {
            element.style.setProperty(entry.property, value)
          } else {
            element.style.removeProperty(entry.property)
          }
        }
        break

      case 'add-class':
        const addElement = entry.element?.deref()
        if (addElement && entry.className) {
          if (direction === 'undo') {
            addElement.classList.remove(entry.className)
          } else {
            addElement.classList.add(entry.className)
          }
        }
        break

      case 'remove-class':
        const removeClass = entry.element?.deref()
        if (removeClass && entry.className) {
          if (direction === 'undo') {
            removeClass.classList.add(entry.className)
          } else {
            removeClass.classList.remove(entry.className)
          }
        }
        break

      case 'dom-add':
        // DOM add/remove requires more complex handling
        // For now, we'll just log it
        console.log(`[History] DOM ${direction}: ${entry.description}`)
        break

      case 'dom-remove':
        console.log(`[History] DOM ${direction}: ${entry.description}`)
        break

      case 'attribute':
        const attrElement = entry.element?.deref()
        if (attrElement && entry.property) {
          if (value) {
            attrElement.setAttribute(entry.property, value)
          } else {
            attrElement.removeAttribute(entry.property)
          }
        }
        break
    }
  }

  // Get history
  getHistory(): HistoryEntry[] {
    return [...this.history]
  }

  // Get current index
  getCurrentIndex(): number {
    return this.currentIndex
  }

  // Clear history
  clear(): void {
    this.history = []
    this.currentIndex = -1
    this.notifyListeners()
  }

  // Subscribe to changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Notify listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener())
  }

  // Get undo description
  getUndoDescription(): string | null {
    if (!this.canUndo()) return null
    return this.history[this.currentIndex].description
  }

  // Get redo description
  getRedoDescription(): string | null {
    if (!this.canRedo()) return null
    return this.history[this.currentIndex + 1].description
  }
}

// Singleton instance
let historyManagerInstance: HistoryManager | null = null

export function getHistoryManager(): HistoryManager {
  if (!historyManagerInstance) {
    historyManagerInstance = new HistoryManager()
  }
  return historyManagerInstance
}

// Helper function to create history entries
export function createStyleEntry(
  type: 'class-style' | 'inline-style',
  target: string,
  property: string,
  oldValue: string,
  newValue: string,
  element?: HTMLElement
): Omit<HistoryEntry, 'id' | 'timestamp'> {
  return {
    type,
    target,
    property,
    oldValue,
    newValue,
    description: `Changed ${property} on ${type === 'class-style' ? `.${target}` : target}`,
    element: element ? new WeakRef(element) : undefined,
  }
}

export function createClassEntry(
  type: 'add-class' | 'remove-class',
  element: HTMLElement,
  className: string
): Omit<HistoryEntry, 'id' | 'timestamp'> {
  return {
    type,
    className,
    description: `${type === 'add-class' ? 'Added' : 'Removed'} class .${className}`,
    element: new WeakRef(element),
  }
}

export function createDOMEntry(
  type: 'dom-add' | 'dom-remove' | 'dom-move',
  element: HTMLElement,
  description: string
): Omit<HistoryEntry, 'id' | 'timestamp'> {
  return {
    type,
    description,
    element: new WeakRef(element),
    html: element.outerHTML,
  }
}

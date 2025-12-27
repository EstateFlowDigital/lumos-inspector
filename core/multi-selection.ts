"use client"

import type { ElementInfo } from "./inspector-context"

// Selection mode types
export type SelectionMode = 'single' | 'multi' | 'range'

// Multi-selection manager
export class MultiSelectionManager {
  private selectedElements: Map<string, ElementInfo> = new Map()
  private primaryElement: ElementInfo | null = null
  private selectionMode: SelectionMode = 'single'
  private listeners: Set<() => void> = new Set()

  // Get element key
  private getElementKey(element: HTMLElement): string {
    // Use a combination of path and identity
    const path = this.getElementPath(element)
    return path
  }

  // Get element path for identification
  private getElementPath(element: HTMLElement): string {
    const parts: string[] = []
    let current: HTMLElement | null = element

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase()

      if (current.id) {
        selector += `#${current.id}`
      } else if (current.className) {
        const classes = Array.from(current.classList)
          .filter(c => !c.startsWith('devtools-'))
          .slice(0, 2)
          .join('.')
        if (classes) {
          selector += `.${classes}`
        }
      }

      // Add index if there are siblings
      const parent = current.parentElement
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          c => c.tagName === current!.tagName
        )
        if (siblings.length > 1) {
          const index = siblings.indexOf(current)
          selector += `:nth-child(${index + 1})`
        }
      }

      parts.unshift(selector)
      current = current.parentElement
    }

    return parts.join(' > ')
  }

  // Select an element
  select(elementInfo: ElementInfo, options?: { add?: boolean; toggle?: boolean }): void {
    const key = this.getElementKey(elementInfo.element)

    if (options?.toggle && this.selectedElements.has(key)) {
      // Toggle off
      this.selectedElements.delete(key)
      if (this.primaryElement?.element === elementInfo.element) {
        // Set new primary element
        const remaining = Array.from(this.selectedElements.values())
        this.primaryElement = remaining[0] || null
      }
    } else if (options?.add || this.selectionMode === 'multi') {
      // Add to selection
      this.selectedElements.set(key, elementInfo)
      if (!this.primaryElement) {
        this.primaryElement = elementInfo
      }
    } else {
      // Replace selection
      this.selectedElements.clear()
      this.selectedElements.set(key, elementInfo)
      this.primaryElement = elementInfo
    }

    this.notifyListeners()
  }

  // Select multiple elements
  selectMultiple(elements: ElementInfo[]): void {
    this.selectedElements.clear()
    this.primaryElement = null

    elements.forEach((elementInfo, index) => {
      const key = this.getElementKey(elementInfo.element)
      this.selectedElements.set(key, elementInfo)
      if (index === 0) {
        this.primaryElement = elementInfo
      }
    })

    this.notifyListeners()
  }

  // Deselect an element
  deselect(element: HTMLElement): void {
    const key = this.getElementKey(element)
    this.selectedElements.delete(key)

    if (this.primaryElement?.element === element) {
      const remaining = Array.from(this.selectedElements.values())
      this.primaryElement = remaining[0] || null
    }

    this.notifyListeners()
  }

  // Clear selection
  clearSelection(): void {
    this.selectedElements.clear()
    this.primaryElement = null
    this.notifyListeners()
  }

  // Check if element is selected
  isSelected(element: HTMLElement): boolean {
    const key = this.getElementKey(element)
    return this.selectedElements.has(key)
  }

  // Get selected elements
  getSelectedElements(): ElementInfo[] {
    return Array.from(this.selectedElements.values())
  }

  // Get primary element
  getPrimaryElement(): ElementInfo | null {
    return this.primaryElement
  }

  // Set primary element
  setPrimaryElement(element: HTMLElement): void {
    const key = this.getElementKey(element)
    const elementInfo = this.selectedElements.get(key)
    if (elementInfo) {
      this.primaryElement = elementInfo
      this.notifyListeners()
    }
  }

  // Get selection count
  getSelectionCount(): number {
    return this.selectedElements.size
  }

  // Check if has selection
  hasSelection(): boolean {
    return this.selectedElements.size > 0
  }

  // Check if has multiple selection
  hasMultipleSelection(): boolean {
    return this.selectedElements.size > 1
  }

  // Set selection mode
  setSelectionMode(mode: SelectionMode): void {
    this.selectionMode = mode
    if (mode === 'single' && this.selectedElements.size > 1) {
      // Keep only primary element
      if (this.primaryElement) {
        const key = this.getElementKey(this.primaryElement.element)
        this.selectedElements.clear()
        this.selectedElements.set(key, this.primaryElement)
      }
    }
    this.notifyListeners()
  }

  // Get selection mode
  getSelectionMode(): SelectionMode {
    return this.selectionMode
  }

  // Select all matching elements (by selector)
  selectAllMatching(selector: string): void {
    try {
      const elements = document.querySelectorAll(selector)
      const elementInfos: ElementInfo[] = []

      elements.forEach(el => {
        if (el instanceof HTMLElement && !el.closest('[data-devtools]')) {
          const computed = window.getComputedStyle(el)
          const rect = el.getBoundingClientRect()

          elementInfos.push({
            tagName: el.tagName.toLowerCase(),
            id: el.id,
            classList: Array.from(el.classList),
            computedStyles: {
              display: computed.display,
              position: computed.position,
              width: computed.width,
              height: computed.height,
            },
            rect,
            element: el,
            path: this.getElementPath(el),
          })
        }
      })

      this.selectMultiple(elementInfos)
    } catch (e) {
      console.error('[MultiSelection] Invalid selector:', selector)
    }
  }

  // Apply style to all selected elements
  applyStyleToAll(property: string, value: string): void {
    this.selectedElements.forEach(elementInfo => {
      elementInfo.element.style.setProperty(property, value)
    })
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
}

// Singleton instance
let multiSelectionInstance: MultiSelectionManager | null = null

export function getMultiSelectionManager(): MultiSelectionManager {
  if (!multiSelectionInstance) {
    multiSelectionInstance = new MultiSelectionManager()
  }
  return multiSelectionInstance
}

// React hook for multi-selection
export function useMultiSelection() {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)

  React.useEffect(() => {
    const manager = getMultiSelectionManager()
    return manager.subscribe(forceUpdate)
  }, [])

  return getMultiSelectionManager()
}

import * as React from "react"

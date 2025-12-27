"use client"

// Keyboard Shortcuts Management System

export interface ShortcutDefinition {
  id: string
  name: string
  description: string
  category: ShortcutCategory
  defaultKeys: string
  currentKeys: string
  action: () => void
  enabled: boolean
}

export type ShortcutCategory =
  | 'navigation'
  | 'editing'
  | 'selection'
  | 'tools'
  | 'view'
  | 'general'

export interface ShortcutConfig {
  id: string
  keys: string
  enabled: boolean
}

// Parse key combination string to KeyboardEvent check
function parseKeyCombo(combo: string): {
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
} {
  const parts = combo.toLowerCase().split('+').map(p => p.trim())
  const result = {
    key: '',
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
  }

  parts.forEach(part => {
    switch (part) {
      case 'ctrl':
      case 'control':
        result.ctrl = true
        break
      case 'shift':
        result.shift = true
        break
      case 'alt':
      case 'option':
        result.alt = true
        break
      case 'meta':
      case 'cmd':
      case 'command':
      case '⌘':
        result.meta = true
        break
      default:
        result.key = part
    }
  })

  return result
}

// Check if keyboard event matches key combo
function matchesKeyCombo(event: KeyboardEvent, combo: string): boolean {
  const parsed = parseKeyCombo(combo)

  const keyMatches = event.key.toLowerCase() === parsed.key ||
    event.code.toLowerCase() === parsed.key ||
    event.code.toLowerCase().replace('key', '') === parsed.key

  return (
    keyMatches &&
    event.ctrlKey === parsed.ctrl &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt &&
    event.metaKey === parsed.meta
  )
}

// Format key combo for display
export function formatKeyCombo(combo: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')

  return combo
    .split('+')
    .map(key => {
      const k = key.trim().toLowerCase()
      switch (k) {
        case 'ctrl':
        case 'control':
          return isMac ? '⌃' : 'Ctrl'
        case 'shift':
          return isMac ? '⇧' : 'Shift'
        case 'alt':
        case 'option':
          return isMac ? '⌥' : 'Alt'
        case 'meta':
        case 'cmd':
        case 'command':
          return isMac ? '⌘' : 'Win'
        case 'enter':
        case 'return':
          return isMac ? '↵' : 'Enter'
        case 'backspace':
          return isMac ? '⌫' : 'Backspace'
        case 'delete':
          return isMac ? '⌦' : 'Delete'
        case 'escape':
        case 'esc':
          return 'Esc'
        case 'tab':
          return isMac ? '⇥' : 'Tab'
        case 'space':
        case ' ':
          return 'Space'
        case 'arrowup':
        case 'up':
          return '↑'
        case 'arrowdown':
        case 'down':
          return '↓'
        case 'arrowleft':
        case 'left':
          return '←'
        case 'arrowright':
        case 'right':
          return '→'
        default:
          return k.toUpperCase()
      }
    })
    .join(isMac ? '' : ' + ')
}

// Keyboard Shortcuts Manager
export class KeyboardShortcutsManager {
  private shortcuts: Map<string, ShortcutDefinition> = new Map()
  private enabled: boolean = true
  private storageKey = 'lumos-inspector-shortcuts'
  private listeners: Set<() => void> = new Set()
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null

  constructor() {
    this.loadFromStorage()
    this.setupGlobalHandler()
  }

  // Register a shortcut
  register(shortcut: Omit<ShortcutDefinition, 'currentKeys'> & { currentKeys?: string }): void {
    const savedConfig = this.getSavedConfig(shortcut.id)

    const fullShortcut: ShortcutDefinition = {
      ...shortcut,
      currentKeys: savedConfig?.keys ?? shortcut.currentKeys ?? shortcut.defaultKeys,
      enabled: savedConfig?.enabled ?? shortcut.enabled ?? true,
    }

    this.shortcuts.set(shortcut.id, fullShortcut)
    this.notifyListeners()
  }

  // Unregister a shortcut
  unregister(id: string): void {
    this.shortcuts.delete(id)
    this.notifyListeners()
  }

  // Get all shortcuts
  getAll(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values())
  }

  // Get shortcuts by category
  getByCategory(category: ShortcutCategory): ShortcutDefinition[] {
    return this.getAll().filter(s => s.category === category)
  }

  // Get a specific shortcut
  get(id: string): ShortcutDefinition | undefined {
    return this.shortcuts.get(id)
  }

  // Update shortcut keys
  updateKeys(id: string, newKeys: string): boolean {
    const shortcut = this.shortcuts.get(id)
    if (!shortcut) return false

    // Check for conflicts
    const conflict = this.findConflict(id, newKeys)
    if (conflict) {
      console.warn(`[Shortcuts] Conflict with "${conflict.name}"`)
      return false
    }

    shortcut.currentKeys = newKeys
    this.saveToStorage()
    this.notifyListeners()
    return true
  }

  // Toggle shortcut enabled state
  toggleEnabled(id: string): boolean {
    const shortcut = this.shortcuts.get(id)
    if (!shortcut) return false

    shortcut.enabled = !shortcut.enabled
    this.saveToStorage()
    this.notifyListeners()
    return true
  }

  // Reset shortcut to default
  resetToDefault(id: string): void {
    const shortcut = this.shortcuts.get(id)
    if (!shortcut) return

    shortcut.currentKeys = shortcut.defaultKeys
    shortcut.enabled = true
    this.saveToStorage()
    this.notifyListeners()
  }

  // Reset all shortcuts to defaults
  resetAllToDefaults(): void {
    this.shortcuts.forEach(shortcut => {
      shortcut.currentKeys = shortcut.defaultKeys
      shortcut.enabled = true
    })
    localStorage.removeItem(this.storageKey)
    this.notifyListeners()
  }

  // Find conflicting shortcut
  findConflict(excludeId: string, keys: string): ShortcutDefinition | null {
    for (const [id, shortcut] of this.shortcuts) {
      if (id !== excludeId && shortcut.enabled && shortcut.currentKeys === keys) {
        return shortcut
      }
    }
    return null
  }

  // Enable/disable all shortcuts
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  // Check if shortcuts are enabled
  isEnabled(): boolean {
    return this.enabled
  }

  // Subscribe to changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Cleanup
  destroy(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler)
    }
    this.shortcuts.clear()
    this.listeners.clear()
  }

  // Setup global keyboard handler
  private setupGlobalHandler(): void {
    if (typeof document === 'undefined') return

    this.keydownHandler = (event: KeyboardEvent) => {
      if (!this.enabled) return

      // Skip if typing in input/textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow escape in inputs
        if (event.key !== 'Escape') return
      }

      for (const [, shortcut] of this.shortcuts) {
        if (!shortcut.enabled) continue

        if (matchesKeyCombo(event, shortcut.currentKeys)) {
          event.preventDefault()
          event.stopPropagation()
          shortcut.action()
          return
        }
      }
    }

    document.addEventListener('keydown', this.keydownHandler)
  }

  // Load shortcuts from storage
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        const configs: ShortcutConfig[] = JSON.parse(saved)
        configs.forEach(config => {
          const shortcut = this.shortcuts.get(config.id)
          if (shortcut) {
            shortcut.currentKeys = config.keys
            shortcut.enabled = config.enabled
          }
        })
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Save shortcuts to storage
  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return

    const configs: ShortcutConfig[] = Array.from(this.shortcuts.values()).map(s => ({
      id: s.id,
      keys: s.currentKeys,
      enabled: s.enabled,
    }))

    localStorage.setItem(this.storageKey, JSON.stringify(configs))
  }

  // Get saved config for a shortcut
  private getSavedConfig(id: string): ShortcutConfig | undefined {
    if (typeof localStorage === 'undefined') return undefined

    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        const configs: ShortcutConfig[] = JSON.parse(saved)
        return configs.find(c => c.id === id)
      }
    } catch {
      // Ignore
    }
    return undefined
  }

  // Notify listeners
  private notifyListeners(): void {
    this.listeners.forEach(l => l())
  }
}

// Singleton instance
let managerInstance: KeyboardShortcutsManager | null = null

export function getKeyboardShortcutsManager(): KeyboardShortcutsManager {
  if (!managerInstance) {
    managerInstance = new KeyboardShortcutsManager()
  }
  return managerInstance
}

// React hook for keyboard shortcuts
import { useEffect, useReducer } from 'react'

export function useKeyboardShortcuts() {
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  useEffect(() => {
    const manager = getKeyboardShortcutsManager()
    return manager.subscribe(forceUpdate)
  }, [])

  return getKeyboardShortcutsManager()
}

// Hook to record a new key combination
export function useKeyRecorder() {
  const [recording, setRecording] = useState(false)
  const [keys, setKeys] = useState<string | null>(null)

  const startRecording = useCallback(() => {
    setRecording(true)
    setKeys(null)
  }, [])

  const stopRecording = useCallback(() => {
    setRecording(false)
  }, [])

  useEffect(() => {
    if (!recording) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const parts: string[] = []
      if (e.ctrlKey) parts.push('Ctrl')
      if (e.shiftKey) parts.push('Shift')
      if (e.altKey) parts.push('Alt')
      if (e.metaKey) parts.push('Cmd')

      // Don't record just modifier keys
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
        setKeys(parts.join('+'))
        setRecording(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [recording])

  return { recording, keys, startRecording, stopRecording }
}

import { useState, useCallback } from 'react'

// Default shortcuts to register
export const defaultShortcuts: Omit<ShortcutDefinition, 'currentKeys' | 'action'>[] = [
  {
    id: 'toggle-inspector',
    name: 'Toggle Inspector',
    description: 'Show or hide the inspector panel',
    category: 'general',
    defaultKeys: 'Ctrl+Shift+D',
    enabled: true,
  },
  {
    id: 'deselect',
    name: 'Deselect Element',
    description: 'Clear the current element selection',
    category: 'selection',
    defaultKeys: 'Escape',
    enabled: true,
  },
  {
    id: 'delete-element',
    name: 'Delete Element',
    description: 'Delete the selected element',
    category: 'editing',
    defaultKeys: 'Delete',
    enabled: true,
  },
  {
    id: 'copy-styles',
    name: 'Copy Styles',
    description: 'Copy styles from selected element',
    category: 'editing',
    defaultKeys: 'Ctrl+C',
    enabled: true,
  },
  {
    id: 'paste-styles',
    name: 'Paste Styles',
    description: 'Paste copied styles to selected element',
    category: 'editing',
    defaultKeys: 'Ctrl+V',
    enabled: true,
  },
  {
    id: 'copy-html',
    name: 'Copy as HTML',
    description: 'Copy selected element as HTML',
    category: 'editing',
    defaultKeys: 'Ctrl+Shift+C',
    enabled: true,
  },
  {
    id: 'duplicate',
    name: 'Duplicate Element',
    description: 'Duplicate the selected element',
    category: 'editing',
    defaultKeys: 'Ctrl+D',
    enabled: true,
  },
  {
    id: 'wrap-div',
    name: 'Wrap in Div',
    description: 'Wrap selected element in a div',
    category: 'editing',
    defaultKeys: 'Ctrl+G',
    enabled: true,
  },
  {
    id: 'undo',
    name: 'Undo',
    description: 'Undo the last change',
    category: 'editing',
    defaultKeys: 'Ctrl+Z',
    enabled: true,
  },
  {
    id: 'redo',
    name: 'Redo',
    description: 'Redo the last undone change',
    category: 'editing',
    defaultKeys: 'Ctrl+Shift+Z',
    enabled: true,
  },
  {
    id: 'nudge-up',
    name: 'Nudge Up',
    description: 'Move element up by 1px',
    category: 'editing',
    defaultKeys: 'ArrowUp',
    enabled: true,
  },
  {
    id: 'nudge-down',
    name: 'Nudge Down',
    description: 'Move element down by 1px',
    category: 'editing',
    defaultKeys: 'ArrowDown',
    enabled: true,
  },
  {
    id: 'nudge-left',
    name: 'Nudge Left',
    description: 'Move element left by 1px',
    category: 'editing',
    defaultKeys: 'ArrowLeft',
    enabled: true,
  },
  {
    id: 'nudge-right',
    name: 'Nudge Right',
    description: 'Move element right by 1px',
    category: 'editing',
    defaultKeys: 'ArrowRight',
    enabled: true,
  },
  {
    id: 'nudge-up-10',
    name: 'Nudge Up 10px',
    description: 'Move element up by 10px',
    category: 'editing',
    defaultKeys: 'Shift+ArrowUp',
    enabled: true,
  },
  {
    id: 'nudge-down-10',
    name: 'Nudge Down 10px',
    description: 'Move element down by 10px',
    category: 'editing',
    defaultKeys: 'Shift+ArrowDown',
    enabled: true,
  },
  {
    id: 'nudge-left-10',
    name: 'Nudge Left 10px',
    description: 'Move element left by 10px',
    category: 'editing',
    defaultKeys: 'Shift+ArrowLeft',
    enabled: true,
  },
  {
    id: 'nudge-right-10',
    name: 'Nudge Right 10px',
    description: 'Move element right by 10px',
    category: 'editing',
    defaultKeys: 'Shift+ArrowRight',
    enabled: true,
  },
  {
    id: 'toggle-navigator',
    name: 'Toggle Navigator',
    description: 'Show or hide the navigator panel',
    category: 'view',
    defaultKeys: 'Ctrl+1',
    enabled: true,
  },
  {
    id: 'toggle-styles',
    name: 'Toggle Styles Panel',
    description: 'Show or hide the styles panel',
    category: 'view',
    defaultKeys: 'Ctrl+2',
    enabled: true,
  },
  {
    id: 'search-tools',
    name: 'Search Tools',
    description: 'Open the tool search dialog',
    category: 'tools',
    defaultKeys: 'Ctrl+K',
    enabled: true,
  },
  {
    id: 'toggle-xray',
    name: 'Toggle X-Ray Mode',
    description: 'Toggle X-Ray visualization mode',
    category: 'view',
    defaultKeys: 'Ctrl+X',
    enabled: true,
  },
]

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  HistoryManager,
  getHistoryManager,
  createStyleEntry,
  createClassEntry,
  createDOMEntry,
} from '../../core/history-manager'

describe('HistoryManager', () => {
  let manager: HistoryManager

  beforeEach(() => {
    manager = new HistoryManager(10) // Small max for testing
  })

  describe('add', () => {
    it('should add entries to history', () => {
      manager.add({
        type: 'class-style',
        description: 'Changed color',
        target: 'button',
        property: 'color',
        oldValue: 'red',
        newValue: 'blue',
      })

      expect(manager.getHistory()).toHaveLength(1)
      expect(manager.getCurrentIndex()).toBe(0)
    })

    it('should trim history when exceeding max', () => {
      // Add 15 entries to a manager with max 10
      for (let i = 0; i < 15; i++) {
        manager.add({
          type: 'class-style',
          description: `Change ${i}`,
          target: 'element',
          property: 'color',
          oldValue: `old-${i}`,
          newValue: `new-${i}`,
        })
      }

      expect(manager.getHistory()).toHaveLength(10)
    })

    it('should truncate redo entries when adding new entry', () => {
      // Add 3 entries
      manager.add({ type: 'class-style', description: '1', target: 'a', property: 'p', oldValue: '', newValue: '1' })
      manager.add({ type: 'class-style', description: '2', target: 'a', property: 'p', oldValue: '1', newValue: '2' })
      manager.add({ type: 'class-style', description: '3', target: 'a', property: 'p', oldValue: '2', newValue: '3' })

      // Undo twice
      manager.undo()
      manager.undo()

      // Add new entry - should truncate entries 2 and 3
      manager.add({ type: 'class-style', description: 'new', target: 'a', property: 'p', oldValue: '1', newValue: 'new' })

      expect(manager.getHistory()).toHaveLength(2)
      expect(manager.canRedo()).toBe(false)
    })
  })

  describe('undo/redo', () => {
    it('should undo last action', () => {
      manager.add({
        type: 'class-style',
        description: 'Change 1',
        target: 'button',
        property: 'color',
        oldValue: 'red',
        newValue: 'blue',
      })

      expect(manager.canUndo()).toBe(true)
      const entry = manager.undo()

      expect(entry).not.toBeNull()
      expect(entry?.description).toBe('Change 1')
      expect(manager.getCurrentIndex()).toBe(-1)
      expect(manager.canUndo()).toBe(false)
    })

    it('should redo undone action', () => {
      manager.add({
        type: 'class-style',
        description: 'Change 1',
        target: 'button',
        property: 'color',
        oldValue: 'red',
        newValue: 'blue',
      })

      manager.undo()
      expect(manager.canRedo()).toBe(true)

      const entry = manager.redo()
      expect(entry).not.toBeNull()
      expect(entry?.description).toBe('Change 1')
      expect(manager.getCurrentIndex()).toBe(0)
    })

    it('should return null when nothing to undo', () => {
      expect(manager.canUndo()).toBe(false)
      expect(manager.undo()).toBeNull()
    })

    it('should return null when nothing to redo', () => {
      manager.add({ type: 'class-style', description: '1', target: 'a', property: 'p', oldValue: '', newValue: '1' })
      expect(manager.canRedo()).toBe(false)
      expect(manager.redo()).toBeNull()
    })
  })

  describe('clear', () => {
    it('should clear all history', () => {
      manager.add({ type: 'class-style', description: '1', target: 'a', property: 'p', oldValue: '', newValue: '1' })
      manager.add({ type: 'class-style', description: '2', target: 'a', property: 'p', oldValue: '1', newValue: '2' })

      manager.clear()

      expect(manager.getHistory()).toHaveLength(0)
      expect(manager.getCurrentIndex()).toBe(-1)
      expect(manager.canUndo()).toBe(false)
      expect(manager.canRedo()).toBe(false)
    })
  })

  describe('subscribe', () => {
    it('should notify listeners on changes', () => {
      const listener = vi.fn()
      manager.subscribe(listener)

      manager.add({ type: 'class-style', description: '1', target: 'a', property: 'p', oldValue: '', newValue: '1' })
      expect(listener).toHaveBeenCalledTimes(1)

      manager.undo()
      expect(listener).toHaveBeenCalledTimes(2)

      manager.redo()
      expect(listener).toHaveBeenCalledTimes(3)
    })

    it('should allow unsubscribing', () => {
      const listener = vi.fn()
      const unsubscribe = manager.subscribe(listener)

      manager.add({ type: 'class-style', description: '1', target: 'a', property: 'p', oldValue: '', newValue: '1' })
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()

      manager.add({ type: 'class-style', description: '2', target: 'a', property: 'p', oldValue: '1', newValue: '2' })
      expect(listener).toHaveBeenCalledTimes(1) // Still 1, not called again
    })
  })

  describe('getUndoDescription / getRedoDescription', () => {
    it('should return correct descriptions', () => {
      manager.add({ type: 'class-style', description: 'First change', target: 'a', property: 'p', oldValue: '', newValue: '1' })
      manager.add({ type: 'class-style', description: 'Second change', target: 'a', property: 'p', oldValue: '1', newValue: '2' })

      expect(manager.getUndoDescription()).toBe('Second change')
      expect(manager.getRedoDescription()).toBeNull()

      manager.undo()
      expect(manager.getUndoDescription()).toBe('First change')
      expect(manager.getRedoDescription()).toBe('Second change')
    })
  })
})

describe('Helper functions', () => {
  describe('createStyleEntry', () => {
    it('should create a class-style entry', () => {
      const entry = createStyleEntry('class-style', 'button', 'color', 'red', 'blue')

      expect(entry.type).toBe('class-style')
      expect(entry.target).toBe('button')
      expect(entry.property).toBe('color')
      expect(entry.oldValue).toBe('red')
      expect(entry.newValue).toBe('blue')
      expect(entry.description).toContain('.button')
    })

    it('should create an inline-style entry with element reference', () => {
      const element = document.createElement('div')
      const entry = createStyleEntry('inline-style', 'div.test', 'color', 'red', 'blue', element)

      expect(entry.type).toBe('inline-style')
      expect(entry.element).toBeDefined()
      expect(entry.element?.deref()).toBe(element)
    })
  })

  describe('createClassEntry', () => {
    it('should create an add-class entry', () => {
      const element = document.createElement('div')
      const entry = createClassEntry('add-class', element, 'active')

      expect(entry.type).toBe('add-class')
      expect(entry.className).toBe('active')
      expect(entry.description).toContain('Added')
    })

    it('should create a remove-class entry', () => {
      const element = document.createElement('div')
      const entry = createClassEntry('remove-class', element, 'active')

      expect(entry.type).toBe('remove-class')
      expect(entry.className).toBe('active')
      expect(entry.description).toContain('Removed')
    })
  })

  describe('createDOMEntry', () => {
    it('should create a DOM entry with HTML', () => {
      const element = document.createElement('div')
      element.innerHTML = '<span>Test</span>'
      const entry = createDOMEntry('dom-add', element, 'Added element')

      expect(entry.type).toBe('dom-add')
      expect(entry.html).toContain('<span>Test</span>')
      expect(entry.description).toBe('Added element')
    })
  })
})

describe('getHistoryManager (singleton)', () => {
  it('should return the same instance', () => {
    const manager1 = getHistoryManager()
    const manager2 = getHistoryManager()

    expect(manager1).toBe(manager2)
  })
})

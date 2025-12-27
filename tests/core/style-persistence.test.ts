import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StylePersistenceManager, getStylePersistenceManager } from '../../core/style-persistence'

// Mock the style manager
vi.mock('../../tools/style-manager', () => ({
  getStyleManager: () => ({
    getAllStyles: vi.fn().mockReturnValue({
      '.button': { 'background-color': 'blue', 'color': 'white' },
      '.card': { 'border-radius': '8px', 'box-shadow': '0 2px 4px rgba(0,0,0,0.1)' },
    }),
    updateRule: vi.fn(),
    clear: vi.fn(),
    exportCSS: vi.fn().mockReturnValue('.button { background-color: blue; color: white; }'),
  }),
}))

describe('StylePersistenceManager', () => {
  let manager: StylePersistenceManager

  beforeEach(() => {
    manager = new StylePersistenceManager()
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('saveToLocalStorage', () => {
    it('should save styles and return session id', () => {
      const sessionId = manager.saveToLocalStorage('Test Session')

      expect(sessionId).toBeDefined()
      expect(sessionId).toMatch(/^session-/)

      const sessions = manager.getSessions()
      expect(sessions).toHaveLength(1)
      expect(sessions[0].name).toBe('Test Session')
    })

    it('should auto-generate session name if not provided', () => {
      manager.saveToLocalStorage()

      const sessions = manager.getSessions()
      expect(sessions).toHaveLength(1)
      expect(sessions[0].name).toContain('Session')
    })
  })

  describe('getSessions', () => {
    it('should return empty array when no sessions', () => {
      const sessions = manager.getSessions()
      expect(sessions).toEqual([])
    })

    it('should return all saved sessions', () => {
      manager.saveToLocalStorage('Session 1')
      manager.saveToLocalStorage('Session 2')

      const sessions = manager.getSessions()
      expect(sessions).toHaveLength(2)
    })
  })

  describe('deleteSession', () => {
    it('should delete a session by id', () => {
      const id1 = manager.saveToLocalStorage('Session 1')
      manager.saveToLocalStorage('Session 2')

      expect(manager.getSessions()).toHaveLength(2)

      const result = manager.deleteSession(id1)
      expect(result).toBe(true)
      expect(manager.getSessions()).toHaveLength(1)
    })

    it('should return false for non-existent session', () => {
      const result = manager.deleteSession('non-existent-id')
      expect(result).toBe(false)
    })
  })

  describe('export methods', () => {
    it('should export as CSS', () => {
      const css = manager.exportAsCSS()
      expect(css).toContain('.button')
    })

    it('should export as JSON', () => {
      const json = manager.exportAsJSON()
      const parsed = JSON.parse(json)

      expect(parsed['.button']).toBeDefined()
      expect(parsed['.button']['background-color']).toBe('blue')
    })

    it('should export as Tailwind config', () => {
      const tailwind = manager.exportAsTailwind()

      expect(tailwind).toContain('module.exports')
      expect(tailwind).toContain('extend')
    })

    it('should export as design tokens', () => {
      const tokens = manager.exportAsDesignTokens()
      const parsed = JSON.parse(tokens)

      // Should have categorized tokens
      expect(typeof parsed).toBe('object')
    })

    it('should use correct format via export()', () => {
      expect(manager.export('css')).toContain('.button')
      expect(() => JSON.parse(manager.export('json'))).not.toThrow()
      expect(manager.export('tailwind')).toContain('module.exports')
    })
  })

  describe('downloadAsFile', () => {
    it('should create and trigger download', () => {
      const createElementSpy = vi.spyOn(document, 'createElement')
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any)
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any)

      // Mock URL methods
      const mockUrl = 'blob:test'
      global.URL.createObjectURL = vi.fn().mockReturnValue(mockUrl)
      global.URL.revokeObjectURL = vi.fn()

      manager.downloadAsFile('css', 'test-styles.css')

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl)

      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
    })
  })

  describe('importFromJSON', () => {
    it('should import valid JSON', () => {
      const json = JSON.stringify({
        '.test': { color: 'red' },
      })

      const result = manager.importFromJSON(json)
      expect(result).toBe(true)
    })

    it('should return false for invalid JSON', () => {
      const result = manager.importFromJSON('invalid json {{{')
      expect(result).toBe(false)
    })
  })

  describe('clearAll', () => {
    it('should clear all saved data', () => {
      manager.saveToLocalStorage('Session 1')
      manager.saveToLocalStorage('Session 2')

      manager.clearAll()

      expect(manager.getSessions()).toEqual([])
    })
  })
})

describe('getStylePersistenceManager (singleton)', () => {
  it('should return the same instance', () => {
    const manager1 = getStylePersistenceManager()
    const manager2 = getStylePersistenceManager()

    expect(manager1).toBe(manager2)
  })
})

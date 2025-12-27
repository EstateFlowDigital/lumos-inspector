import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
  KeyboardShortcutsManager,
  formatKeyCombo,
  ShortcutDefinition,
} from "../../core/keyboard-shortcuts-manager"

describe("KeyboardShortcutsManager", () => {
  let manager: KeyboardShortcutsManager

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    manager = new KeyboardShortcutsManager()
  })

  afterEach(() => {
    manager.destroy()
  })

  describe("register", () => {
    it("should register a shortcut", () => {
      const shortcut: Omit<ShortcutDefinition, "currentKeys"> = {
        id: "test-shortcut",
        name: "Test Shortcut",
        description: "A test shortcut",
        category: "general",
        defaultKeys: "Ctrl+T",
        action: vi.fn(),
        enabled: true,
      }

      manager.register(shortcut)

      const registered = manager.get("test-shortcut")
      expect(registered).toBeDefined()
      expect(registered?.name).toBe("Test Shortcut")
      expect(registered?.currentKeys).toBe("Ctrl+T")
    })

    it("should use saved config if available", () => {
      // Save config to localStorage
      localStorage.setItem(
        "lumos-inspector-shortcuts",
        JSON.stringify([{ id: "test-shortcut", keys: "Ctrl+Shift+T", enabled: false }])
      )

      const newManager = new KeyboardShortcutsManager()

      newManager.register({
        id: "test-shortcut",
        name: "Test",
        description: "Test",
        category: "general",
        defaultKeys: "Ctrl+T",
        action: vi.fn(),
        enabled: true,
      })

      const shortcut = newManager.get("test-shortcut")
      expect(shortcut?.currentKeys).toBe("Ctrl+Shift+T")
      expect(shortcut?.enabled).toBe(false)

      newManager.destroy()
    })
  })

  describe("unregister", () => {
    it("should remove a registered shortcut", () => {
      manager.register({
        id: "test",
        name: "Test",
        description: "Test",
        category: "general",
        defaultKeys: "Ctrl+T",
        action: vi.fn(),
        enabled: true,
      })

      expect(manager.get("test")).toBeDefined()

      manager.unregister("test")

      expect(manager.get("test")).toBeUndefined()
    })
  })

  describe("getAll", () => {
    it("should return all registered shortcuts", () => {
      manager.register({
        id: "shortcut1",
        name: "Shortcut 1",
        description: "First",
        category: "general",
        defaultKeys: "Ctrl+1",
        action: vi.fn(),
        enabled: true,
      })

      manager.register({
        id: "shortcut2",
        name: "Shortcut 2",
        description: "Second",
        category: "editing",
        defaultKeys: "Ctrl+2",
        action: vi.fn(),
        enabled: true,
      })

      const all = manager.getAll()
      expect(all).toHaveLength(2)
    })
  })

  describe("getByCategory", () => {
    it("should filter shortcuts by category", () => {
      manager.register({
        id: "general1",
        name: "General 1",
        description: "General",
        category: "general",
        defaultKeys: "Ctrl+G",
        action: vi.fn(),
        enabled: true,
      })

      manager.register({
        id: "editing1",
        name: "Editing 1",
        description: "Editing",
        category: "editing",
        defaultKeys: "Ctrl+E",
        action: vi.fn(),
        enabled: true,
      })

      const generalShortcuts = manager.getByCategory("general")
      expect(generalShortcuts).toHaveLength(1)
      expect(generalShortcuts[0].id).toBe("general1")
    })
  })

  describe("updateKeys", () => {
    it("should update shortcut keys", () => {
      manager.register({
        id: "test",
        name: "Test",
        description: "Test",
        category: "general",
        defaultKeys: "Ctrl+T",
        action: vi.fn(),
        enabled: true,
      })

      const result = manager.updateKeys("test", "Ctrl+Shift+T")

      expect(result).toBe(true)
      expect(manager.get("test")?.currentKeys).toBe("Ctrl+Shift+T")
    })

    it("should detect conflicts", () => {
      manager.register({
        id: "test1",
        name: "Test 1",
        description: "Test 1",
        category: "general",
        defaultKeys: "Ctrl+T",
        action: vi.fn(),
        enabled: true,
      })

      manager.register({
        id: "test2",
        name: "Test 2",
        description: "Test 2",
        category: "general",
        defaultKeys: "Ctrl+E",
        action: vi.fn(),
        enabled: true,
      })

      // Try to set test2 to the same keys as test1
      const result = manager.updateKeys("test2", "Ctrl+T")

      expect(result).toBe(false)
      expect(manager.get("test2")?.currentKeys).toBe("Ctrl+E")
    })

    it("should return false for non-existent shortcut", () => {
      const result = manager.updateKeys("non-existent", "Ctrl+X")
      expect(result).toBe(false)
    })
  })

  describe("toggleEnabled", () => {
    it("should toggle enabled state", () => {
      manager.register({
        id: "test",
        name: "Test",
        description: "Test",
        category: "general",
        defaultKeys: "Ctrl+T",
        action: vi.fn(),
        enabled: true,
      })

      expect(manager.get("test")?.enabled).toBe(true)

      manager.toggleEnabled("test")

      expect(manager.get("test")?.enabled).toBe(false)

      manager.toggleEnabled("test")

      expect(manager.get("test")?.enabled).toBe(true)
    })
  })

  describe("resetToDefault", () => {
    it("should reset shortcut to default keys", () => {
      manager.register({
        id: "test",
        name: "Test",
        description: "Test",
        category: "general",
        defaultKeys: "Ctrl+T",
        action: vi.fn(),
        enabled: true,
      })

      manager.updateKeys("test", "Ctrl+Shift+T")
      manager.toggleEnabled("test")

      expect(manager.get("test")?.currentKeys).toBe("Ctrl+Shift+T")
      expect(manager.get("test")?.enabled).toBe(false)

      manager.resetToDefault("test")

      expect(manager.get("test")?.currentKeys).toBe("Ctrl+T")
      expect(manager.get("test")?.enabled).toBe(true)
    })
  })

  describe("resetAllToDefaults", () => {
    it("should reset all shortcuts to defaults", () => {
      manager.register({
        id: "test1",
        name: "Test 1",
        description: "Test 1",
        category: "general",
        defaultKeys: "Ctrl+1",
        action: vi.fn(),
        enabled: true,
      })

      manager.register({
        id: "test2",
        name: "Test 2",
        description: "Test 2",
        category: "general",
        defaultKeys: "Ctrl+2",
        action: vi.fn(),
        enabled: true,
      })

      manager.updateKeys("test1", "Ctrl+Shift+1")
      manager.updateKeys("test2", "Ctrl+Shift+2")
      manager.toggleEnabled("test1")

      manager.resetAllToDefaults()

      expect(manager.get("test1")?.currentKeys).toBe("Ctrl+1")
      expect(manager.get("test1")?.enabled).toBe(true)
      expect(manager.get("test2")?.currentKeys).toBe("Ctrl+2")
      expect(manager.get("test2")?.enabled).toBe(true)
    })
  })

  describe("findConflict", () => {
    it("should find conflicting shortcuts", () => {
      manager.register({
        id: "test1",
        name: "Test 1",
        description: "Test 1",
        category: "general",
        defaultKeys: "Ctrl+T",
        action: vi.fn(),
        enabled: true,
      })

      manager.register({
        id: "test2",
        name: "Test 2",
        description: "Test 2",
        category: "general",
        defaultKeys: "Ctrl+E",
        action: vi.fn(),
        enabled: true,
      })

      const conflict = manager.findConflict("test2", "Ctrl+T")
      expect(conflict).not.toBeNull()
      expect(conflict?.id).toBe("test1")
    })

    it("should not find conflict with disabled shortcuts", () => {
      manager.register({
        id: "test1",
        name: "Test 1",
        description: "Test 1",
        category: "general",
        defaultKeys: "Ctrl+T",
        action: vi.fn(),
        enabled: false,
      })

      const conflict = manager.findConflict("test2", "Ctrl+T")
      expect(conflict).toBeNull()
    })
  })

  describe("setEnabled/isEnabled", () => {
    it("should control global enabled state", () => {
      expect(manager.isEnabled()).toBe(true)

      manager.setEnabled(false)

      expect(manager.isEnabled()).toBe(false)

      manager.setEnabled(true)

      expect(manager.isEnabled()).toBe(true)
    })
  })

  describe("subscribe", () => {
    it("should notify listeners on changes", () => {
      const listener = vi.fn()

      manager.subscribe(listener)

      manager.register({
        id: "test",
        name: "Test",
        description: "Test",
        category: "general",
        defaultKeys: "Ctrl+T",
        action: vi.fn(),
        enabled: true,
      })

      expect(listener).toHaveBeenCalled()
    })

    it("should return unsubscribe function", () => {
      const listener = vi.fn()

      const unsubscribe = manager.subscribe(listener)
      unsubscribe()

      manager.register({
        id: "test",
        name: "Test",
        description: "Test",
        category: "general",
        defaultKeys: "Ctrl+T",
        action: vi.fn(),
        enabled: true,
      })

      expect(listener).not.toHaveBeenCalled()
    })
  })
})

describe("formatKeyCombo", () => {
  it("should format key combinations for display", () => {
    // Mock non-Mac platform
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, "platform")
    Object.defineProperty(navigator, "platform", {
      value: "Win32",
      configurable: true,
    })

    expect(formatKeyCombo("Ctrl+Shift+T")).toBe("Ctrl + Shift + T")
    expect(formatKeyCombo("alt+enter")).toBe("Alt + Enter")

    // Restore
    if (originalPlatform) {
      Object.defineProperty(navigator, "platform", originalPlatform)
    }
  })

  it("should handle special keys", () => {
    const result = formatKeyCombo("Escape")
    expect(result).toBe("Esc")
  })

  it("should handle arrow keys", () => {
    expect(formatKeyCombo("ArrowUp")).toContain("↑")
    expect(formatKeyCombo("ArrowDown")).toContain("↓")
    expect(formatKeyCombo("ArrowLeft")).toContain("←")
    expect(formatKeyCombo("ArrowRight")).toContain("→")
  })
})

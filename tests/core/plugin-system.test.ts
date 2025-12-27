import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getPluginRegistry,
  createToolConfig,
  createPlugin,
  type InspectorPlugin,
  type ToolRegistration,
} from '../../core/plugin-system'
import { Box } from 'lucide-react'

// Reset the singleton between tests
let registry: ReturnType<typeof getPluginRegistry>

describe('PluginRegistry', () => {
  beforeEach(() => {
    // Get fresh registry and clear it
    registry = getPluginRegistry()
    // Unregister all plugins
    registry.getPlugins().forEach(plugin => {
      registry.unregisterPlugin(plugin.id)
    })
  })

  describe('registerPlugin', () => {
    it('should register a plugin with tools', async () => {
      const plugin: InspectorPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        tools: [
          {
            config: createToolConfig('tool1', 'Tool 1', 'A test tool', Box, 'layout'),
            component: () => null,
          },
        ],
      }

      await registry.registerPlugin(plugin)

      expect(registry.getPlugins()).toHaveLength(1)
      expect(registry.getPlugin('test-plugin')).toBeDefined()
    })

    it('should call initialize on plugin registration', async () => {
      const initialize = vi.fn()
      const plugin: InspectorPlugin = {
        id: 'init-plugin',
        name: 'Init Plugin',
        version: '1.0.0',
        tools: [],
        initialize,
      }

      await registry.registerPlugin(plugin)

      expect(initialize).toHaveBeenCalledTimes(1)
    })

    it('should warn when registering duplicate plugin', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const plugin: InspectorPlugin = {
        id: 'dupe-plugin',
        name: 'Dupe Plugin',
        version: '1.0.0',
        tools: [],
      }

      await registry.registerPlugin(plugin)
      await registry.registerPlugin(plugin)

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('already registered'))
      warnSpy.mockRestore()
    })
  })

  describe('unregisterPlugin', () => {
    it('should unregister a plugin and its tools', async () => {
      const plugin: InspectorPlugin = {
        id: 'remove-plugin',
        name: 'Remove Plugin',
        version: '1.0.0',
        tools: [
          {
            config: createToolConfig('tool1', 'Tool 1', 'Test', Box, 'layout'),
            component: () => null,
          },
        ],
      }

      await registry.registerPlugin(plugin)
      expect(registry.getPlugins()).toHaveLength(1)
      expect(registry.getTools()).toHaveLength(1)

      registry.unregisterPlugin('remove-plugin')

      expect(registry.getPlugins()).toHaveLength(0)
      expect(registry.getTools()).toHaveLength(0)
    })

    it('should call cleanup on plugin unregistration', async () => {
      const cleanup = vi.fn()
      const plugin: InspectorPlugin = {
        id: 'cleanup-plugin',
        name: 'Cleanup Plugin',
        version: '1.0.0',
        tools: [],
        cleanup,
      }

      await registry.registerPlugin(plugin)
      registry.unregisterPlugin('cleanup-plugin')

      expect(cleanup).toHaveBeenCalledTimes(1)
    })
  })

  describe('registerTool', () => {
    it('should register a standalone tool', () => {
      const tool: ToolRegistration = {
        config: createToolConfig('standalone', 'Standalone Tool', 'A standalone tool', Box, 'debug'),
        component: () => null,
      }

      registry.registerTool(tool)

      expect(registry.getTools()).toHaveLength(1)
      expect(registry.getTool('custom:standalone')).toBeDefined()
    })

    it('should register with custom namespace', () => {
      const tool: ToolRegistration = {
        config: createToolConfig('mytool', 'My Tool', 'Custom namespace tool', Box, 'layout'),
        component: () => null,
      }

      registry.registerTool(tool, 'myspace')

      expect(registry.getTool('myspace:mytool')).toBeDefined()
    })
  })

  describe('getToolsByCategory', () => {
    it('should filter tools by category', async () => {
      const plugin: InspectorPlugin = {
        id: 'category-plugin',
        name: 'Category Plugin',
        version: '1.0.0',
        tools: [
          { config: createToolConfig('layout1', 'Layout 1', 'Test', Box, 'layout'), component: () => null },
          { config: createToolConfig('layout2', 'Layout 2', 'Test', Box, 'layout'), component: () => null },
          { config: createToolConfig('color1', 'Color 1', 'Test', Box, 'color'), component: () => null },
        ],
      }

      await registry.registerPlugin(plugin)

      const layoutTools = registry.getToolsByCategory('layout')
      const colorTools = registry.getToolsByCategory('color')

      expect(layoutTools).toHaveLength(2)
      expect(colorTools).toHaveLength(1)
    })
  })

  describe('searchTools', () => {
    it('should search by name', async () => {
      const plugin: InspectorPlugin = {
        id: 'search-plugin',
        name: 'Search Plugin',
        version: '1.0.0',
        tools: [
          { config: createToolConfig('shadow', 'Box Shadow', 'Shadow editor', Box, 'effects'), component: () => null },
          { config: createToolConfig('border', 'Border Editor', 'Border tool', Box, 'effects'), component: () => null },
        ],
      }

      await registry.registerPlugin(plugin)

      const results = registry.searchTools('shadow')
      expect(results).toHaveLength(1)
      expect(results[0].config.name).toBe('Box Shadow')
    })

    it('should search by description', async () => {
      const plugin: InspectorPlugin = {
        id: 'search-desc-plugin',
        name: 'Search Desc Plugin',
        version: '1.0.0',
        tools: [
          { config: createToolConfig('tool1', 'Tool 1', 'Gradient editor', Box, 'effects'), component: () => null },
          { config: createToolConfig('tool2', 'Tool 2', 'Color picker', Box, 'color'), component: () => null },
        ],
      }

      await registry.registerPlugin(plugin)

      const results = registry.searchTools('gradient')
      expect(results).toHaveLength(1)
      expect(results[0].config.id).toBe('tool1')
    })

    it('should search by keywords', async () => {
      const plugin: InspectorPlugin = {
        id: 'keyword-plugin',
        name: 'Keyword Plugin',
        version: '1.0.0',
        tools: [
          {
            config: createToolConfig('flex', 'Flexbox Editor', 'Layout tool', Box, 'layout', {
              keywords: ['flex', 'flexbox', 'direction', 'justify', 'align'],
            }),
            component: () => null,
          },
        ],
      }

      await registry.registerPlugin(plugin)

      expect(registry.searchTools('justify')).toHaveLength(1)
      expect(registry.searchTools('align')).toHaveLength(1)
      expect(registry.searchTools('xyz')).toHaveLength(0)
    })
  })

  describe('subscribe', () => {
    it('should notify on plugin changes', async () => {
      const listener = vi.fn()
      registry.subscribe(listener)

      const plugin: InspectorPlugin = {
        id: 'notify-plugin',
        name: 'Notify Plugin',
        version: '1.0.0',
        tools: [],
      }

      await registry.registerPlugin(plugin)
      expect(listener).toHaveBeenCalled()

      registry.unregisterPlugin('notify-plugin')
      expect(listener).toHaveBeenCalledTimes(2)
    })
  })
})

describe('createToolConfig', () => {
  it('should create a tool config with defaults', () => {
    const config = createToolConfig('myTool', 'My Tool', 'A description', Box, 'layout')

    expect(config.id).toBe('myTool')
    expect(config.name).toBe('My Tool')
    expect(config.description).toBe('A description')
    expect(config.category).toBe('layout')
    expect(config.keywords).toContain('my tool')
    expect(config.priority).toBe(0)
  })

  it('should create a tool config with options', () => {
    const config = createToolConfig('myTool', 'My Tool', 'A description', Box, 'layout', {
      keywords: ['custom', 'keywords'],
      shortcut: 'Ctrl+M',
      priority: 10,
    })

    expect(config.keywords).toEqual(['custom', 'keywords'])
    expect(config.shortcut).toBe('Ctrl+M')
    expect(config.priority).toBe(10)
  })
})

describe('createPlugin', () => {
  it('should create a plugin with defaults', () => {
    const tools: ToolRegistration[] = []
    const plugin = createPlugin('my-plugin', 'My Plugin', tools)

    expect(plugin.id).toBe('my-plugin')
    expect(plugin.name).toBe('My Plugin')
    expect(plugin.version).toBe('1.0.0')
    expect(plugin.tools).toBe(tools)
  })

  it('should create a plugin with options', () => {
    const tools: ToolRegistration[] = []
    const initialize = vi.fn()
    const cleanup = vi.fn()

    const plugin = createPlugin('my-plugin', 'My Plugin', tools, {
      version: '2.0.0',
      description: 'A test plugin',
      author: 'Test Author',
      initialize,
      cleanup,
    })

    expect(plugin.version).toBe('2.0.0')
    expect(plugin.description).toBe('A test plugin')
    expect(plugin.author).toBe('Test Author')
    expect(plugin.initialize).toBe(initialize)
    expect(plugin.cleanup).toBe(cleanup)
  })
})

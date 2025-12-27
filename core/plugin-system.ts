"use client"

import * as React from "react"

// Tool category types
export type ToolCategory =
  | 'layout'
  | 'typography'
  | 'color'
  | 'effects'
  | 'animation'
  | 'debug'
  | 'accessibility'
  | 'export'
  | 'other'

// Tool configuration interface
export interface ToolConfig {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: ToolCategory
  keywords: string[]
  shortcut?: string
  priority?: number // Higher priority tools appear first (default: 0)
}

// Tool component props
export interface ToolProps {
  element?: HTMLElement | null
  onStyleChange?: (property: string, value: string) => void
}

// Plugin interface
export interface InspectorPlugin {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  tools: ToolRegistration[]
  initialize?: () => void | Promise<void>
  cleanup?: () => void
}

// Tool registration
export interface ToolRegistration {
  config: ToolConfig
  component: React.ComponentType<ToolProps>
}

// Plugin registry class
class PluginRegistry {
  private plugins: Map<string, InspectorPlugin> = new Map()
  private tools: Map<string, ToolRegistration> = new Map()
  private listeners: Set<() => void> = new Set()
  private initialized: boolean = false

  // Register a plugin
  async registerPlugin(plugin: InspectorPlugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginRegistry] Plugin "${plugin.id}" is already registered`)
      return
    }

    // Initialize plugin if it has an initialize method
    if (plugin.initialize) {
      await plugin.initialize()
    }

    // Register plugin
    this.plugins.set(plugin.id, plugin)

    // Register all tools from the plugin
    plugin.tools.forEach(tool => {
      const toolId = `${plugin.id}:${tool.config.id}`
      if (this.tools.has(toolId)) {
        console.warn(`[PluginRegistry] Tool "${toolId}" is already registered`)
        return
      }
      this.tools.set(toolId, tool)
    })

    this.notifyListeners()
  }

  // Unregister a plugin
  unregisterPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      console.warn(`[PluginRegistry] Plugin "${pluginId}" is not registered`)
      return
    }

    // Cleanup plugin if it has a cleanup method
    if (plugin.cleanup) {
      plugin.cleanup()
    }

    // Unregister all tools from the plugin
    plugin.tools.forEach(tool => {
      const toolId = `${pluginId}:${tool.config.id}`
      this.tools.delete(toolId)
    })

    // Unregister plugin
    this.plugins.delete(pluginId)

    this.notifyListeners()
  }

  // Register a standalone tool
  registerTool(tool: ToolRegistration, namespace: string = 'custom'): void {
    const toolId = `${namespace}:${tool.config.id}`
    if (this.tools.has(toolId)) {
      console.warn(`[PluginRegistry] Tool "${toolId}" is already registered`)
      return
    }
    this.tools.set(toolId, tool)
    this.notifyListeners()
  }

  // Unregister a tool
  unregisterTool(toolId: string): void {
    if (!this.tools.has(toolId)) {
      console.warn(`[PluginRegistry] Tool "${toolId}" is not registered`)
      return
    }
    this.tools.delete(toolId)
    this.notifyListeners()
  }

  // Get all registered plugins
  getPlugins(): InspectorPlugin[] {
    return Array.from(this.plugins.values())
  }

  // Get all registered tools
  getTools(): ToolRegistration[] {
    return Array.from(this.tools.values())
  }

  // Get tools by category
  getToolsByCategory(category: ToolCategory): ToolRegistration[] {
    return this.getTools().filter(tool => tool.config.category === category)
  }

  // Search tools by keyword
  searchTools(query: string): ToolRegistration[] {
    const lowerQuery = query.toLowerCase()
    return this.getTools().filter(tool => {
      const { name, description, keywords } = tool.config
      return (
        name.toLowerCase().includes(lowerQuery) ||
        description.toLowerCase().includes(lowerQuery) ||
        keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
      )
    })
  }

  // Get a specific tool by ID
  getTool(toolId: string): ToolRegistration | undefined {
    return this.tools.get(toolId)
  }

  // Get a specific plugin by ID
  getPlugin(pluginId: string): InspectorPlugin | undefined {
    return this.plugins.get(pluginId)
  }

  // Subscribe to registry changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Notify listeners of changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener())
  }

  // Check if registry is initialized
  isInitialized(): boolean {
    return this.initialized
  }

  // Mark registry as initialized
  setInitialized(): void {
    this.initialized = true
    this.notifyListeners()
  }
}

// Singleton instance
let registryInstance: PluginRegistry | null = null

export function getPluginRegistry(): PluginRegistry {
  if (!registryInstance) {
    registryInstance = new PluginRegistry()
  }
  return registryInstance
}

// Helper to create a tool config
export function createToolConfig(
  id: string,
  name: string,
  description: string,
  icon: React.ComponentType<{ className?: string }>,
  category: ToolCategory,
  options?: {
    keywords?: string[]
    shortcut?: string
    priority?: number
  }
): ToolConfig {
  return {
    id,
    name,
    description,
    icon,
    category,
    keywords: options?.keywords || [name.toLowerCase()],
    shortcut: options?.shortcut,
    priority: options?.priority || 0,
  }
}

// Helper to create a plugin
export function createPlugin(
  id: string,
  name: string,
  tools: ToolRegistration[],
  options?: {
    version?: string
    description?: string
    author?: string
    initialize?: () => void | Promise<void>
    cleanup?: () => void
  }
): InspectorPlugin {
  return {
    id,
    name,
    version: options?.version || '1.0.0',
    description: options?.description,
    author: options?.author,
    tools,
    initialize: options?.initialize,
    cleanup: options?.cleanup,
  }
}

// React hook for using plugin registry
export function usePluginRegistry() {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)

  React.useEffect(() => {
    const registry = getPluginRegistry()
    return registry.subscribe(forceUpdate)
  }, [])

  return getPluginRegistry()
}

// React hook for getting tools
export function useTools(category?: ToolCategory) {
  const registry = usePluginRegistry()

  return React.useMemo(() => {
    if (category) {
      return registry.getToolsByCategory(category)
    }
    return registry.getTools()
  }, [registry, category])
}

// React hook for searching tools
export function useToolSearch(query: string) {
  const registry = usePluginRegistry()

  return React.useMemo(() => {
    if (!query.trim()) {
      return registry.getTools()
    }
    return registry.searchTools(query)
  }, [registry, query])
}

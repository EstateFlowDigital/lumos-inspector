"use client"

import { getStyleManager } from "../tools/style-manager"

// Export format types
export type ExportFormat = 'css' | 'json' | 'tailwind' | 'design-tokens'

// Design token interface
export interface DesignToken {
  name: string
  value: string
  category: 'color' | 'spacing' | 'typography' | 'border' | 'shadow' | 'other'
  description?: string
}

// Persisted style session
export interface StyleSession {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  styles: Record<string, Record<string, string>>
  designTokens?: DesignToken[]
}

// Style persistence manager
export class StylePersistenceManager {
  private storageKey = 'lumos-inspector-styles'
  private sessionsKey = 'lumos-inspector-sessions'

  // Save current styles to localStorage
  saveToLocalStorage(name?: string): string {
    const styleManager = getStyleManager()
    const styles = styleManager.getAllStyles()

    const session: StyleSession = {
      id: this.generateId(),
      name: name || `Session ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      styles,
    }

    // Get existing sessions
    const sessions = this.getSessions()
    sessions.push(session)

    localStorage.setItem(this.sessionsKey, JSON.stringify(sessions))
    localStorage.setItem(this.storageKey, JSON.stringify(styles))

    return session.id
  }

  // Load styles from localStorage
  loadFromLocalStorage(sessionId?: string): boolean {
    if (sessionId) {
      const sessions = this.getSessions()
      const session = sessions.find(s => s.id === sessionId)
      if (!session) return false

      const styleManager = getStyleManager()
      styleManager.clear()

      Object.entries(session.styles).forEach(([selector, properties]) => {
        Object.entries(properties).forEach(([property, value]) => {
          styleManager.updateRule(selector, property, value)
        })
      })

      return true
    }

    const savedStyles = localStorage.getItem(this.storageKey)
    if (!savedStyles) return false

    try {
      const styles = JSON.parse(savedStyles)
      const styleManager = getStyleManager()
      styleManager.clear()

      Object.entries(styles).forEach(([selector, properties]) => {
        Object.entries(properties as Record<string, string>).forEach(([property, value]) => {
          styleManager.updateRule(selector, property, value)
        })
      })

      return true
    } catch {
      return false
    }
  }

  // Get all saved sessions
  getSessions(): StyleSession[] {
    const sessionsJson = localStorage.getItem(this.sessionsKey)
    if (!sessionsJson) return []

    try {
      return JSON.parse(sessionsJson)
    } catch {
      return []
    }
  }

  // Delete a session
  deleteSession(sessionId: string): boolean {
    const sessions = this.getSessions()
    const filtered = sessions.filter(s => s.id !== sessionId)

    if (filtered.length === sessions.length) return false

    localStorage.setItem(this.sessionsKey, JSON.stringify(filtered))
    return true
  }

  // Export styles as CSS
  exportAsCSS(): string {
    const styleManager = getStyleManager()
    return styleManager.exportCSS()
  }

  // Export styles as JSON
  exportAsJSON(): string {
    const styleManager = getStyleManager()
    const styles = styleManager.getAllStyles()
    return JSON.stringify(styles, null, 2)
  }

  // Export styles as Tailwind config
  exportAsTailwind(): string {
    const styleManager = getStyleManager()
    const styles = styleManager.getAllStyles()

    const tailwindExtend: Record<string, Record<string, string>> = {
      colors: {},
      spacing: {},
      borderRadius: {},
      boxShadow: {},
      fontSize: {},
    }

    // Extract values and convert to Tailwind tokens
    Object.entries(styles).forEach(([selector, properties]) => {
      const className = selector.replace('.', '')

      Object.entries(properties).forEach(([property, value]) => {
        switch (property) {
          case 'background-color':
          case 'color':
          case 'border-color':
            tailwindExtend.colors[`custom-${className}`] = value
            break
          case 'padding':
          case 'margin':
          case 'gap':
            tailwindExtend.spacing[`custom-${className}`] = value
            break
          case 'border-radius':
            tailwindExtend.borderRadius[`custom-${className}`] = value
            break
          case 'box-shadow':
            tailwindExtend.boxShadow[`custom-${className}`] = value
            break
          case 'font-size':
            tailwindExtend.fontSize[`custom-${className}`] = value
            break
        }
      })
    })

    // Clean empty objects
    Object.keys(tailwindExtend).forEach(key => {
      if (Object.keys(tailwindExtend[key]).length === 0) {
        delete tailwindExtend[key]
      }
    })

    return `// tailwind.config.js extend
module.exports = {
  theme: {
    extend: ${JSON.stringify(tailwindExtend, null, 6)}
  }
}`
  }

  // Export as design tokens (JSON format)
  exportAsDesignTokens(): string {
    const styleManager = getStyleManager()
    const styles = styleManager.getAllStyles()
    const tokens: DesignToken[] = []

    Object.entries(styles).forEach(([selector, properties]) => {
      const className = selector.replace('.', '')

      Object.entries(properties).forEach(([property, value]) => {
        let category: DesignToken['category'] = 'other'

        if (property.includes('color') || property === 'background-color') {
          category = 'color'
        } else if (property.includes('padding') || property.includes('margin') || property === 'gap') {
          category = 'spacing'
        } else if (property.includes('font') || property.includes('line-height') || property.includes('text')) {
          category = 'typography'
        } else if (property.includes('border')) {
          category = 'border'
        } else if (property.includes('shadow')) {
          category = 'shadow'
        }

        tokens.push({
          name: `${className}-${property.replace(/-/g, '_')}`,
          value,
          category,
          description: `${property} for ${selector}`,
        })
      })
    })

    // Group tokens by category
    const groupedTokens: Record<string, DesignToken[]> = {}
    tokens.forEach(token => {
      if (!groupedTokens[token.category]) {
        groupedTokens[token.category] = []
      }
      groupedTokens[token.category].push(token)
    })

    return JSON.stringify(groupedTokens, null, 2)
  }

  // Export in specified format
  export(format: ExportFormat): string {
    switch (format) {
      case 'css':
        return this.exportAsCSS()
      case 'json':
        return this.exportAsJSON()
      case 'tailwind':
        return this.exportAsTailwind()
      case 'design-tokens':
        return this.exportAsDesignTokens()
      default:
        return this.exportAsCSS()
    }
  }

  // Download exported styles as file
  downloadAsFile(format: ExportFormat, filename?: string): void {
    const content = this.export(format)
    const extension = format === 'css' ? 'css' : 'json'
    const defaultFilename = `lumos-styles-${Date.now()}.${extension}`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename || defaultFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Import styles from JSON
  importFromJSON(json: string): boolean {
    try {
      const styles = JSON.parse(json)
      const styleManager = getStyleManager()

      Object.entries(styles).forEach(([selector, properties]) => {
        Object.entries(properties as Record<string, string>).forEach(([property, value]) => {
          styleManager.updateRule(selector, property, value)
        })
      })

      return true
    } catch {
      return false
    }
  }

  // Clear all saved data
  clearAll(): void {
    localStorage.removeItem(this.storageKey)
    localStorage.removeItem(this.sessionsKey)
  }

  // Generate unique ID
  private generateId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
let persistenceManagerInstance: StylePersistenceManager | null = null

export function getStylePersistenceManager(): StylePersistenceManager {
  if (!persistenceManagerInstance) {
    persistenceManagerInstance = new StylePersistenceManager()
  }
  return persistenceManagerInstance
}

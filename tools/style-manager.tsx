"use client"

import { useCallback, useEffect, useRef } from "react"

// Style manager for injecting and updating CSS rules globally
export class GlobalStyleManager {
  private styleSheet: CSSStyleSheet | null = null
  private styleElement: HTMLStyleElement | null = null
  private ruleMap: Map<string, number> = new Map() // selector -> rule index
  private styleCache: Map<string, Record<string, string>> = new Map() // selector -> styles

  constructor() {
    if (typeof document !== "undefined") {
      this.init()
    }
  }

  private init() {
    // Create or find the devtools style element
    let styleEl = document.getElementById("devtools-global-styles") as HTMLStyleElement
    if (!styleEl) {
      styleEl = document.createElement("style")
      styleEl.id = "devtools-global-styles"
      styleEl.setAttribute("data-devtools", "true")
      document.head.appendChild(styleEl)
    }
    this.styleElement = styleEl
    this.styleSheet = styleEl.sheet as CSSStyleSheet
  }

  // Helper to safely delete a rule and update indices
  private safeDeleteRule(selector: string): boolean {
    if (!this.styleSheet) return false

    const existingIndex = this.ruleMap.get(selector)
    if (existingIndex === undefined) return true

    try {
      // Validate index is in bounds
      if (existingIndex < 0 || existingIndex >= this.styleSheet.cssRules.length) {
        console.warn(`Invalid rule index ${existingIndex} for selector ${selector}`)
        this.ruleMap.delete(selector)
        return true
      }

      this.styleSheet.deleteRule(existingIndex)
      this.ruleMap.delete(selector)

      // Update indices for rules that came after the deleted one
      // Use Array.from to avoid modifying map during iteration
      const updates: [string, number][] = []
      this.ruleMap.forEach((index, key) => {
        if (index > existingIndex) {
          updates.push([key, index - 1])
        }
      })
      updates.forEach(([key, newIndex]) => {
        this.ruleMap.set(key, newIndex)
      })

      return true
    } catch (e) {
      console.warn("Failed to delete rule:", e)
      // Remove from map anyway to prevent stale references
      this.ruleMap.delete(selector)
      return false
    }
  }

  // Update or create a CSS rule for a selector
  updateRule(selector: string, property: string, value: string) {
    if (!this.styleSheet) return

    // Get existing styles for this selector
    const existingStyles = this.styleCache.get(selector) || {}
    existingStyles[property] = value
    this.styleCache.set(selector, existingStyles)

    // Build the full rule text
    const ruleText = this.buildRuleText(selector, existingStyles)

    // Remove old rule if exists
    this.safeDeleteRule(selector)

    // Insert new rule at the end
    try {
      const newIndex = this.styleSheet.insertRule(ruleText, this.styleSheet.cssRules.length)
      this.ruleMap.set(selector, newIndex)
    } catch (e) {
      console.warn("Failed to insert rule:", e)
      // Clean up cache if we couldn't insert
      this.styleCache.delete(selector)
    }
  }

  // Update multiple properties at once
  updateRuleMultiple(selector: string, styles: Record<string, string>) {
    if (!this.styleSheet) return

    // Merge with existing styles
    const existingStyles = this.styleCache.get(selector) || {}
    const mergedStyles = { ...existingStyles, ...styles }
    this.styleCache.set(selector, mergedStyles)

    // Build the full rule text
    const ruleText = this.buildRuleText(selector, mergedStyles)

    // Remove old rule if exists
    this.safeDeleteRule(selector)

    // Insert new rule at the end
    try {
      const newIndex = this.styleSheet.insertRule(ruleText, this.styleSheet.cssRules.length)
      this.ruleMap.set(selector, newIndex)
    } catch (e) {
      console.warn("Failed to insert rule:", e)
      // Clean up cache if we couldn't insert
      this.styleCache.delete(selector)
    }
  }

  // Build CSS rule text from styles object
  private buildRuleText(selector: string, styles: Record<string, string>): string {
    const declarations = Object.entries(styles)
      .filter(([_, value]) => value && value.trim() !== "")
      .map(([prop, value]) => {
        // Convert camelCase to kebab-case
        const kebabProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase()
        // Add !important to ensure inspector styles take precedence over existing CSS
        return `${kebabProp}: ${value} !important`
      })
      .join("; ")

    return `${selector} { ${declarations} }`
  }

  // Get all styles for a selector
  getStyles(selector: string): Record<string, string> {
    return this.styleCache.get(selector) || {}
  }

  // Get all styles from the cache
  getAllStyles(): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {}
    this.styleCache.forEach((styles, selector) => {
      result[selector] = { ...styles }
    })
    return result
  }

  // Remove all styles for a selector
  removeRule(selector: string) {
    this.safeDeleteRule(selector)
    this.styleCache.delete(selector)
  }

  // Clear all devtools styles
  clear() {
    if (this.styleSheet) {
      while (this.styleSheet.cssRules.length > 0) {
        this.styleSheet.deleteRule(0)
      }
    }
    this.ruleMap.clear()
    this.styleCache.clear()
  }

  // Export all styles as CSS text
  exportCSS(): string {
    const rules: string[] = []
    this.styleCache.forEach((styles, selector) => {
      rules.push(this.buildRuleText(selector, styles))
    })
    return rules.join("\n\n")
  }

  // Get all managed selectors
  getSelectors(): string[] {
    return Array.from(this.styleCache.keys())
  }
}

// Singleton instance
let styleManagerInstance: GlobalStyleManager | null = null

export function getStyleManager(): GlobalStyleManager {
  if (!styleManagerInstance) {
    styleManagerInstance = new GlobalStyleManager()
  }
  return styleManagerInstance
}

// React hook for using the style manager
export function useStyleManager() {
  const managerRef = useRef<GlobalStyleManager | null>(null)

  useEffect(() => {
    managerRef.current = getStyleManager()
  }, [])

  const updateClassStyle = useCallback((className: string, property: string, value: string) => {
    if (managerRef.current) {
      managerRef.current.updateRule(`.${className}`, property, value)
    }
  }, [])

  const updateClassStyles = useCallback((className: string, styles: Record<string, string>) => {
    if (managerRef.current) {
      managerRef.current.updateRuleMultiple(`.${className}`, styles)
    }
  }, [])

  const getClassStyles = useCallback((className: string): Record<string, string> => {
    if (managerRef.current) {
      return managerRef.current.getStyles(`.${className}`)
    }
    return {}
  }, [])

  const exportStyles = useCallback((): string => {
    if (managerRef.current) {
      return managerRef.current.exportCSS()
    }
    return ""
  }, [])

  const clearStyles = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.clear()
    }
  }, [])

  return {
    updateClassStyle,
    updateClassStyles,
    getClassStyles,
    exportStyles,
    clearStyles,
  }
}

// Base class definitions for common element types
export const BASE_CLASSES = {
  // Layout containers
  container: "lumos-container",
  section: "lumos-section",
  wrapper: "lumos-wrapper",
  grid: "lumos-grid",
  flex: "lumos-flex",

  // Cards
  card: "lumos-card",
  cardHeader: "lumos-card-header",
  cardBody: "lumos-card-body",
  cardFooter: "lumos-card-footer",

  // Typography
  heading1: "lumos-h1",
  heading2: "lumos-h2",
  heading3: "lumos-h3",
  heading4: "lumos-h4",
  paragraph: "lumos-paragraph",
  text: "lumos-text",
  link: "lumos-link",

  // Lists
  list: "lumos-list",
  listItem: "lumos-list-item",

  // Buttons
  button: "lumos-btn",
  buttonPrimary: "lumos-btn-primary",
  buttonSecondary: "lumos-btn-secondary",
  buttonOutline: "lumos-btn-outline",
  buttonGhost: "lumos-btn-ghost",

  // Form elements
  form: "lumos-form",
  formGroup: "lumos-form-group",
  input: "lumos-input",
  textarea: "lumos-textarea",
  select: "lumos-select",
  checkbox: "lumos-checkbox",
  radio: "lumos-radio",
  label: "lumos-label",

  // Media
  image: "lumos-image",
  figure: "lumos-figure",
  figcaption: "lumos-figcaption",
  video: "lumos-video",
  icon: "lumos-icon",

  // Interactive
  badge: "lumos-badge",
  table: "lumos-table",
  tableRow: "lumos-table-row",
  tableCell: "lumos-table-cell",

  // Utilities (combo classes)
  hidden: "lumos-hidden",
  srOnly: "lumos-sr-only",
  truncate: "lumos-truncate",
  shadow: "lumos-shadow",
  rounded: "lumos-rounded",
}

// Default styles for base classes (to be injected)
export const BASE_CLASS_STYLES: Record<string, Record<string, string>> = {
  // Container
  "lumos-container": {
    width: "100%",
    maxWidth: "1280px",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: "var(--_spacing---space--4)",
    paddingRight: "var(--_spacing---space--4)",
  },

  // Section
  "lumos-section": {
    paddingTop: "var(--_spacing---space--8)",
    paddingBottom: "var(--_spacing---space--8)",
  },

  // Grid
  "lumos-grid": {
    display: "grid",
    gap: "var(--_spacing---space--4)",
  },

  // Flex
  "lumos-flex": {
    display: "flex",
    gap: "var(--_spacing---space--2)",
  },

  // Card
  "lumos-card": {
    backgroundColor: "var(--card)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    padding: "var(--_spacing---space--4)",
  },

  // Headings
  "lumos-h1": {
    fontSize: "var(--_typography---font-size--4xl)",
    fontWeight: "var(--_typography---font-weight--bold)",
    lineHeight: "1.2",
    marginBottom: "var(--_spacing---space--4)",
  },
  "lumos-h2": {
    fontSize: "var(--_typography---font-size--3xl)",
    fontWeight: "var(--_typography---font-weight--semibold)",
    lineHeight: "1.25",
    marginBottom: "var(--_spacing---space--3)",
  },
  "lumos-h3": {
    fontSize: "var(--_typography---font-size--2xl)",
    fontWeight: "var(--_typography---font-weight--semibold)",
    lineHeight: "1.3",
    marginBottom: "var(--_spacing---space--2)",
  },

  // Paragraph
  "lumos-paragraph": {
    fontSize: "var(--_typography---font-size--base)",
    lineHeight: "1.6",
    marginBottom: "var(--_spacing---space--4)",
  },

  // Link
  "lumos-link": {
    color: "var(--primary)",
    textDecoration: "underline",
    cursor: "pointer",
  },

  // Button base
  "lumos-btn": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--_spacing---space--2)",
    paddingLeft: "var(--_spacing---space--4)",
    paddingRight: "var(--_spacing---space--4)",
    paddingTop: "var(--_spacing---space--2)",
    paddingBottom: "var(--_spacing---space--2)",
    borderRadius: "var(--radius)",
    fontSize: "var(--_typography---font-size--sm)",
    fontWeight: "var(--_typography---font-weight--medium)",
    cursor: "pointer",
    border: "none",
    transition: "all 0.2s ease",
  },

  // Button variants (combo classes)
  "lumos-btn-primary": {
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
  },
  "lumos-btn-secondary": {
    backgroundColor: "var(--secondary)",
    color: "var(--secondary-foreground)",
  },
  "lumos-btn-outline": {
    backgroundColor: "transparent",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
  },

  // Input
  "lumos-input": {
    width: "100%",
    paddingLeft: "var(--_spacing---space--3)",
    paddingRight: "var(--_spacing---space--3)",
    paddingTop: "var(--_spacing---space--2)",
    paddingBottom: "var(--_spacing---space--2)",
    border: "1px solid var(--input)",
    borderRadius: "var(--radius)",
    fontSize: "var(--_typography---font-size--sm)",
    backgroundColor: "transparent",
  },

  // Badge
  "lumos-badge": {
    display: "inline-flex",
    alignItems: "center",
    paddingLeft: "var(--_spacing---space--2)",
    paddingRight: "var(--_spacing---space--2)",
    paddingTop: "var(--_spacing---space--0-5)",
    paddingBottom: "var(--_spacing---space--0-5)",
    fontSize: "var(--_typography---font-size--xs)",
    fontWeight: "var(--_typography---font-weight--medium)",
    borderRadius: "9999px",
    backgroundColor: "var(--secondary)",
    color: "var(--secondary-foreground)",
  },

  // Image
  "lumos-image": {
    maxWidth: "100%",
    height: "auto",
    borderRadius: "var(--radius)",
  },

  // Table
  "lumos-table": {
    width: "100%",
    borderCollapse: "collapse",
  },
}

// Initialize base class styles
export function initializeBaseStyles() {
  const manager = getStyleManager()
  Object.entries(BASE_CLASS_STYLES).forEach(([className, styles]) => {
    manager.updateRuleMultiple(`.${className}`, styles)
  })
}

"use client"

// CSS-in-JS Detection and Inspection Utilities
// Supports: Emotion, styled-components, CSS Modules, Tailwind CSS

export type CSSInJSLibrary =
  | 'emotion'
  | 'styled-components'
  | 'css-modules'
  | 'tailwind'
  | 'vanilla-extract'
  | 'linaria'
  | 'unknown'

export interface CSSInJSInfo {
  library: CSSInJSLibrary
  className: string
  originalName?: string
  styles?: Record<string, string>
  sourceFile?: string
  componentName?: string
}

export interface DetectedLibraries {
  emotion: boolean
  styledComponents: boolean
  cssModules: boolean
  tailwind: boolean
  vanillaExtract: boolean
}

// Detect which CSS-in-JS libraries are present in the page
export function detectLibraries(): DetectedLibraries {
  const result: DetectedLibraries = {
    emotion: false,
    styledComponents: false,
    cssModules: false,
    tailwind: false,
    vanillaExtract: false,
  }

  if (typeof document === 'undefined') return result

  // Check for Emotion
  const emotionStyles = document.querySelectorAll('style[data-emotion]')
  result.emotion = emotionStyles.length > 0

  // Check for styled-components
  const scStyles = document.querySelectorAll('style[data-styled], style[data-styled-components]')
  result.styledComponents = scStyles.length > 0

  // Check for Tailwind (look for common utility classes in stylesheets)
  const stylesheets = Array.from(document.styleSheets)
  for (const sheet of stylesheets) {
    try {
      const rules = sheet.cssRules || sheet.rules
      if (rules) {
        for (let i = 0; i < Math.min(rules.length, 100); i++) {
          const rule = rules[i]
          if (rule instanceof CSSStyleRule) {
            // Tailwind patterns
            if (/^\.(flex|grid|p-|m-|text-|bg-|border-|rounded-)/.test(rule.selectorText)) {
              result.tailwind = true
              break
            }
          }
        }
      }
    } catch {
      // CORS restrictions on external stylesheets
    }
    if (result.tailwind) break
  }

  // Check for CSS Modules (hashed class names pattern)
  const allElements = document.querySelectorAll('[class]')
  for (const el of allElements) {
    const classes = el.className.split(' ')
    for (const cls of classes) {
      // CSS Modules pattern: componentName_className__hash
      if (/^[A-Za-z]+_[A-Za-z]+__[A-Za-z0-9]{5,}$/.test(cls)) {
        result.cssModules = true
        break
      }
    }
    if (result.cssModules) break
  }

  // Check for Vanilla Extract
  const veStyles = document.querySelectorAll('style[data-vanilla-extract]')
  result.vanillaExtract = veStyles.length > 0

  return result
}

// Analyze a class name to determine its origin
export function analyzeClassName(className: string): CSSInJSInfo {
  // Emotion pattern: css-xxxxx or emotion-xxxxx
  if (/^css-[a-z0-9]+$/i.test(className) || /^emotion-[a-z0-9]+$/i.test(className)) {
    return {
      library: 'emotion',
      className,
      originalName: extractEmotionLabel(className),
    }
  }

  // styled-components pattern: sc-xxxxx or random hash
  if (/^sc-[a-zA-Z0-9]+$/.test(className)) {
    return {
      library: 'styled-components',
      className,
      componentName: extractStyledComponentName(className),
    }
  }

  // CSS Modules pattern: ComponentName_className__hash
  const cssModuleMatch = className.match(/^([A-Za-z]+)_([A-Za-z]+)__([A-Za-z0-9]+)$/)
  if (cssModuleMatch) {
    return {
      library: 'css-modules',
      className,
      componentName: cssModuleMatch[1],
      originalName: cssModuleMatch[2],
    }
  }

  // Tailwind pattern: common utility class prefixes
  const tailwindPrefixes = [
    'flex', 'grid', 'block', 'inline', 'hidden',
    'p-', 'px-', 'py-', 'pt-', 'pr-', 'pb-', 'pl-',
    'm-', 'mx-', 'my-', 'mt-', 'mr-', 'mb-', 'ml-',
    'w-', 'h-', 'min-', 'max-',
    'text-', 'font-', 'leading-', 'tracking-',
    'bg-', 'border-', 'rounded-', 'shadow-',
    'opacity-', 'z-', 'gap-', 'space-',
    'justify-', 'items-', 'content-', 'self-',
    'overflow-', 'object-', 'cursor-',
    'sm:', 'md:', 'lg:', 'xl:', '2xl:',
    'hover:', 'focus:', 'active:', 'disabled:',
    'dark:', 'group-', 'peer-',
  ]

  for (const prefix of tailwindPrefixes) {
    if (className.startsWith(prefix) || className === prefix.replace('-', '').replace(':', '')) {
      return {
        library: 'tailwind',
        className,
        originalName: className,
      }
    }
  }

  // Vanilla Extract pattern
  if (/^[a-z]+[0-9]+$/.test(className) && className.length > 6) {
    return {
      library: 'vanilla-extract',
      className,
    }
  }

  return {
    library: 'unknown',
    className,
  }
}

// Extract Emotion label from data attribute or class name
function extractEmotionLabel(className: string): string | undefined {
  // Try to find the style tag with this class
  const styleTags = document.querySelectorAll('style[data-emotion]')
  for (const tag of styleTags) {
    const content = tag.textContent || ''
    // Emotion adds labels in comments: /* label: componentName; */
    const labelMatch = content.match(new RegExp(`\\.${className}[^{]*\\/\\*\\s*label:\\s*([^;]+);\\s*\\*\\/`))
    if (labelMatch) {
      return labelMatch[1].trim()
    }
  }
  return undefined
}

// Extract styled-components component name
function extractStyledComponentName(className: string): string | undefined {
  // styled-components stores component names in data attributes
  const element = document.querySelector(`.${className}`)
  if (element) {
    const scAttr = Array.from(element.attributes).find(
      attr => attr.name.startsWith('data-styled') || attr.name === 'data-testid'
    )
    if (scAttr) {
      return scAttr.value
    }
  }
  return undefined
}

// Get all CSS rules for a specific class
export function getClassRules(className: string): CSSStyleRule[] {
  const rules: CSSStyleRule[] = []

  if (typeof document === 'undefined') return rules

  const stylesheets = Array.from(document.styleSheets)
  for (const sheet of stylesheets) {
    try {
      const cssRules = sheet.cssRules || sheet.rules
      if (cssRules) {
        for (let i = 0; i < cssRules.length; i++) {
          const rule = cssRules[i]
          if (rule instanceof CSSStyleRule) {
            if (rule.selectorText.includes(`.${className}`)) {
              rules.push(rule)
            }
          }
        }
      }
    } catch {
      // CORS restrictions
    }
  }

  return rules
}

// Get computed styles from CSS-in-JS for an element
export function getCSSInJSStyles(element: HTMLElement): Map<string, CSSInJSInfo> {
  const result = new Map<string, CSSInJSInfo>()

  if (!element.className) return result

  const classes = typeof element.className === 'string'
    ? element.className.split(' ')
    : []

  for (const cls of classes) {
    if (!cls.trim()) continue

    const info = analyzeClassName(cls)

    // Get actual styles from the rules
    const rules = getClassRules(cls)
    if (rules.length > 0) {
      const styles: Record<string, string> = {}
      for (const rule of rules) {
        for (let i = 0; i < rule.style.length; i++) {
          const prop = rule.style[i]
          styles[prop] = rule.style.getPropertyValue(prop)
        }
      }
      info.styles = styles
    }

    result.set(cls, info)
  }

  return result
}

// Parse Tailwind class to CSS properties
export function parseTailwindClass(className: string): Record<string, string> | null {
  const styles: Record<string, string> = {}

  // Common Tailwind mappings
  const mappings: Record<string, (value: string) => Record<string, string>> = {
    // Display
    'flex': () => ({ display: 'flex' }),
    'grid': () => ({ display: 'grid' }),
    'block': () => ({ display: 'block' }),
    'inline': () => ({ display: 'inline' }),
    'inline-block': () => ({ display: 'inline-block' }),
    'hidden': () => ({ display: 'none' }),

    // Flex direction
    'flex-row': () => ({ 'flex-direction': 'row' }),
    'flex-col': () => ({ 'flex-direction': 'column' }),
    'flex-row-reverse': () => ({ 'flex-direction': 'row-reverse' }),
    'flex-col-reverse': () => ({ 'flex-direction': 'column-reverse' }),

    // Justify content
    'justify-start': () => ({ 'justify-content': 'flex-start' }),
    'justify-end': () => ({ 'justify-content': 'flex-end' }),
    'justify-center': () => ({ 'justify-content': 'center' }),
    'justify-between': () => ({ 'justify-content': 'space-between' }),
    'justify-around': () => ({ 'justify-content': 'space-around' }),
    'justify-evenly': () => ({ 'justify-content': 'space-evenly' }),

    // Align items
    'items-start': () => ({ 'align-items': 'flex-start' }),
    'items-end': () => ({ 'align-items': 'flex-end' }),
    'items-center': () => ({ 'align-items': 'center' }),
    'items-baseline': () => ({ 'align-items': 'baseline' }),
    'items-stretch': () => ({ 'align-items': 'stretch' }),

    // Position
    'relative': () => ({ position: 'relative' }),
    'absolute': () => ({ position: 'absolute' }),
    'fixed': () => ({ position: 'fixed' }),
    'sticky': () => ({ position: 'sticky' }),

    // Overflow
    'overflow-auto': () => ({ overflow: 'auto' }),
    'overflow-hidden': () => ({ overflow: 'hidden' }),
    'overflow-visible': () => ({ overflow: 'visible' }),
    'overflow-scroll': () => ({ overflow: 'scroll' }),

    // Font weight
    'font-thin': () => ({ 'font-weight': '100' }),
    'font-light': () => ({ 'font-weight': '300' }),
    'font-normal': () => ({ 'font-weight': '400' }),
    'font-medium': () => ({ 'font-weight': '500' }),
    'font-semibold': () => ({ 'font-weight': '600' }),
    'font-bold': () => ({ 'font-weight': '700' }),
    'font-extrabold': () => ({ 'font-weight': '800' }),
    'font-black': () => ({ 'font-weight': '900' }),

    // Text align
    'text-left': () => ({ 'text-align': 'left' }),
    'text-center': () => ({ 'text-align': 'center' }),
    'text-right': () => ({ 'text-align': 'right' }),
    'text-justify': () => ({ 'text-align': 'justify' }),
  }

  // Check exact matches first
  if (mappings[className]) {
    return mappings[className](className)
  }

  // Check spacing utilities (p-, m-, gap-, etc.)
  const spacingMatch = className.match(/^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y)-(\d+|auto|\[.+\])$/)
  if (spacingMatch) {
    const [, prefix, value] = spacingMatch
    const spacingValue = parseSpacingValue(value)

    const propMap: Record<string, string[]> = {
      'p': ['padding'],
      'px': ['padding-left', 'padding-right'],
      'py': ['padding-top', 'padding-bottom'],
      'pt': ['padding-top'],
      'pr': ['padding-right'],
      'pb': ['padding-bottom'],
      'pl': ['padding-left'],
      'm': ['margin'],
      'mx': ['margin-left', 'margin-right'],
      'my': ['margin-top', 'margin-bottom'],
      'mt': ['margin-top'],
      'mr': ['margin-right'],
      'mb': ['margin-bottom'],
      'ml': ['margin-left'],
      'gap': ['gap'],
      'gap-x': ['column-gap'],
      'gap-y': ['row-gap'],
    }

    const props = propMap[prefix]
    if (props) {
      props.forEach(prop => {
        styles[prop] = spacingValue
      })
      return styles
    }
  }

  // Check size utilities (w-, h-)
  const sizeMatch = className.match(/^(w|h|min-w|max-w|min-h|max-h)-(\d+|full|screen|auto|\[.+\])$/)
  if (sizeMatch) {
    const [, prefix, value] = sizeMatch
    const sizeValue = parseSizeValue(value)

    const propMap: Record<string, string> = {
      'w': 'width',
      'h': 'height',
      'min-w': 'min-width',
      'max-w': 'max-width',
      'min-h': 'min-height',
      'max-h': 'max-height',
    }

    styles[propMap[prefix]] = sizeValue
    return styles
  }

  // Check border radius
  const roundedMatch = className.match(/^rounded(-[a-z]+)?(-[a-z]+)?$/)
  if (roundedMatch) {
    const radiusMap: Record<string, string> = {
      'rounded': '0.25rem',
      'rounded-sm': '0.125rem',
      'rounded-md': '0.375rem',
      'rounded-lg': '0.5rem',
      'rounded-xl': '0.75rem',
      'rounded-2xl': '1rem',
      'rounded-3xl': '1.5rem',
      'rounded-full': '9999px',
      'rounded-none': '0',
    }
    if (radiusMap[className]) {
      styles['border-radius'] = radiusMap[className]
      return styles
    }
  }

  return null
}

function parseSpacingValue(value: string): string {
  if (value === 'auto') return 'auto'
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1) // Arbitrary value
  }
  const num = parseInt(value, 10)
  return `${num * 0.25}rem`
}

function parseSizeValue(value: string): string {
  if (value === 'full') return '100%'
  if (value === 'screen') return '100vw'
  if (value === 'auto') return 'auto'
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1) // Arbitrary value
  }
  const num = parseInt(value, 10)
  return `${num * 0.25}rem`
}

// Generate equivalent Tailwind classes from CSS properties
export function cssToTailwind(styles: Record<string, string>): string[] {
  const classes: string[] = []

  Object.entries(styles).forEach(([prop, value]) => {
    switch (prop) {
      case 'display':
        if (['flex', 'grid', 'block', 'inline', 'inline-block', 'hidden', 'none'].includes(value)) {
          classes.push(value === 'none' ? 'hidden' : value)
        }
        break
      case 'flex-direction':
        const dirMap: Record<string, string> = {
          'row': 'flex-row',
          'column': 'flex-col',
          'row-reverse': 'flex-row-reverse',
          'column-reverse': 'flex-col-reverse',
        }
        if (dirMap[value]) classes.push(dirMap[value])
        break
      case 'justify-content':
        const justifyMap: Record<string, string> = {
          'flex-start': 'justify-start',
          'flex-end': 'justify-end',
          'center': 'justify-center',
          'space-between': 'justify-between',
          'space-around': 'justify-around',
          'space-evenly': 'justify-evenly',
        }
        if (justifyMap[value]) classes.push(justifyMap[value])
        break
      case 'align-items':
        const alignMap: Record<string, string> = {
          'flex-start': 'items-start',
          'flex-end': 'items-end',
          'center': 'items-center',
          'baseline': 'items-baseline',
          'stretch': 'items-stretch',
        }
        if (alignMap[value]) classes.push(alignMap[value])
        break
      case 'position':
        if (['relative', 'absolute', 'fixed', 'sticky'].includes(value)) {
          classes.push(value)
        }
        break
      case 'font-weight':
        const weightMap: Record<string, string> = {
          '100': 'font-thin',
          '300': 'font-light',
          '400': 'font-normal',
          '500': 'font-medium',
          '600': 'font-semibold',
          '700': 'font-bold',
          '800': 'font-extrabold',
          '900': 'font-black',
        }
        if (weightMap[value]) classes.push(weightMap[value])
        break
    }
  })

  return classes
}

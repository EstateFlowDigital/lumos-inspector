"use client"

// Accessibility utilities for the Lumos Inspector

// ARIA live region announcements
class Announcer {
  private liveRegion: HTMLElement | null = null

  initialize() {
    if (typeof document === 'undefined') return

    // Check if already initialized
    if (this.liveRegion) return

    // Create live region for announcements
    this.liveRegion = document.createElement('div')
    this.liveRegion.setAttribute('role', 'status')
    this.liveRegion.setAttribute('aria-live', 'polite')
    this.liveRegion.setAttribute('aria-atomic', 'true')
    this.liveRegion.className = 'sr-only'
    this.liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `
    document.body.appendChild(this.liveRegion)
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.liveRegion) {
      this.initialize()
    }

    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', priority)
      this.liveRegion.textContent = ''
      // Use setTimeout to ensure the change is detected
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = message
        }
      }, 50)
    }
  }

  cleanup() {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion)
      this.liveRegion = null
    }
  }
}

// Singleton announcer
let announcerInstance: Announcer | null = null

export function getAnnouncer(): Announcer {
  if (!announcerInstance) {
    announcerInstance = new Announcer()
  }
  return announcerInstance
}

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  getAnnouncer().announce(message, priority)
}

// Focus management utilities
export function trapFocus(container: HTMLElement) {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable?.focus()
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable?.focus()
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

export function focusFirst(container: HTMLElement) {
  const focusable = container.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  focusable?.focus()
}

// Keyboard navigation utilities
export interface KeyboardNavigationOptions {
  onSelect?: (element: HTMLElement) => void
  onEscape?: () => void
  onEnter?: (element: HTMLElement) => void
  orientation?: 'horizontal' | 'vertical' | 'both'
  wrap?: boolean
}

export function createKeyboardNavigation(
  container: HTMLElement,
  selector: string,
  options: KeyboardNavigationOptions = {}
) {
  const {
    onSelect,
    onEscape,
    onEnter,
    orientation = 'vertical',
    wrap = true,
  } = options

  let currentIndex = -1

  const getItems = () => Array.from(container.querySelectorAll<HTMLElement>(selector))

  const focusItem = (index: number) => {
    const items = getItems()
    if (items.length === 0) return

    if (wrap) {
      index = ((index % items.length) + items.length) % items.length
    } else {
      index = Math.max(0, Math.min(index, items.length - 1))
    }

    currentIndex = index
    items[index].focus()
    onSelect?.(items[index])
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const items = getItems()
    if (items.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault()
          focusItem(currentIndex + 1)
        }
        break
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault()
          focusItem(currentIndex - 1)
        }
        break
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault()
          focusItem(currentIndex + 1)
        }
        break
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault()
          focusItem(currentIndex - 1)
        }
        break
      case 'Home':
        e.preventDefault()
        focusItem(0)
        break
      case 'End':
        e.preventDefault()
        focusItem(items.length - 1)
        break
      case 'Enter':
      case ' ':
        if (currentIndex >= 0 && currentIndex < items.length) {
          e.preventDefault()
          onEnter?.(items[currentIndex])
        }
        break
      case 'Escape':
        onEscape?.()
        break
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  // Track focus to update currentIndex
  const handleFocus = (e: FocusEvent) => {
    const items = getItems()
    const index = items.indexOf(e.target as HTMLElement)
    if (index >= 0) {
      currentIndex = index
    }
  }

  container.addEventListener('focusin', handleFocus)

  // Return cleanup function and focus control
  return {
    cleanup: () => {
      container.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('focusin', handleFocus)
    },
    focusFirst: () => focusItem(0),
    focusLast: () => focusItem(getItems().length - 1),
    focusIndex: focusItem,
    getCurrentIndex: () => currentIndex,
  }
}

// Generate unique IDs for ARIA relationships
let idCounter = 0

export function generateId(prefix: string = 'lumos'): string {
  return `${prefix}-${++idCounter}`
}

// Skip link component helper
export function createSkipLink(targetId: string, label: string = 'Skip to main content'): HTMLElement {
  const link = document.createElement('a')
  link.href = `#${targetId}`
  link.className = 'sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground'
  link.textContent = label

  link.addEventListener('click', (e) => {
    e.preventDefault()
    const target = document.getElementById(targetId)
    if (target) {
      target.focus()
      target.scrollIntoView()
    }
  })

  return link
}

// Color contrast utilities
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

function getLuminance(color: string): number {
  const rgb = parseColor(color)
  if (!rgb) return 0

  const [r, g, b] = rgb.map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function parseColor(color: string): [number, number, number] | null {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ]
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ]
    }
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1]),
      parseInt(rgbMatch[2]),
      parseInt(rgbMatch[3]),
    ]
  }

  return null
}

export function meetsWCAG(contrastRatio: number, level: 'AA' | 'AAA' = 'AA', isLargeText: boolean = false): boolean {
  if (level === 'AAA') {
    return isLargeText ? contrastRatio >= 4.5 : contrastRatio >= 7
  }
  return isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5
}

// Reduced motion utilities
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// High contrast mode detection
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(forced-colors: active)').matches ||
         window.matchMedia('(-ms-high-contrast: active)').matches
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Throttle a function to only execute once per wait period
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): T {
  let lastCall = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return ((...args: Parameters<T>) => {
    const now = Date.now()
    const remaining = wait - (now - lastCall)

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      lastCall = now
      return func(...args)
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now()
        timeoutId = null
        func(...args)
      }, remaining)
    }
  }) as T
}

/**
 * Debounce a function to only execute after wait period of inactivity
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      func(...args)
    }, wait)
  }) as T
}

/**
 * Check if an element is still in the DOM
 */
export function isElementInDOM(element: HTMLElement | null | undefined): boolean {
  if (!element) return false
  return document.body.contains(element)
}

/**
 * Safely get computed styles for an element
 */
export function safeGetComputedStyle(element: HTMLElement | null | undefined): CSSStyleDeclaration | null {
  if (!element || !isElementInDOM(element)) return null
  try {
    return window.getComputedStyle(element)
  } catch {
    return null
  }
}

/**
 * Safely get bounding client rect
 */
export function safeGetBoundingRect(element: HTMLElement | null | undefined): DOMRect | null {
  if (!element || !isElementInDOM(element)) return null
  try {
    return element.getBoundingClientRect()
  } catch {
    return null
  }
}

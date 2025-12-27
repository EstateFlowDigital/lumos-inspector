import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getAnnouncer,
  announce,
  trapFocus,
  focusFirst,
  createKeyboardNavigation,
  generateId,
  getContrastRatio,
  meetsWCAG,
  prefersReducedMotion,
  prefersHighContrast,
} from '../../core/accessibility'

describe('Announcer', () => {
  beforeEach(() => {
    // Clean up any existing live regions
    document.querySelectorAll('[role="status"]').forEach(el => el.remove())
  })

  afterEach(() => {
    getAnnouncer().cleanup()
  })

  describe('announce', () => {
    it('should create live region and announce message', async () => {
      announce('Test message')

      // Wait for the setTimeout in announce
      await new Promise(resolve => setTimeout(resolve, 100))

      const liveRegion = document.querySelector('[role="status"]')
      expect(liveRegion).not.toBeNull()
      expect(liveRegion?.textContent).toBe('Test message')
    })

    it('should support assertive priority', async () => {
      announce('Urgent message', 'assertive')

      await new Promise(resolve => setTimeout(resolve, 100))

      const liveRegion = document.querySelector('[role="status"]')
      expect(liveRegion?.getAttribute('aria-live')).toBe('assertive')
    })
  })
})

describe('trapFocus', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    container.innerHTML = `
      <button id="first">First</button>
      <input id="middle" type="text" />
      <button id="last">Last</button>
    `
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('should trap focus within container', () => {
    const cleanup = trapFocus(container)

    const first = container.querySelector('#first') as HTMLElement
    const last = container.querySelector('#last') as HTMLElement

    // Focus last element
    last.focus()

    // Simulate Tab key
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    container.dispatchEvent(tabEvent)

    // Cleanup
    cleanup()
  })

  it('should return cleanup function', () => {
    const cleanup = trapFocus(container)
    expect(typeof cleanup).toBe('function')
    cleanup()
  })
})

describe('focusFirst', () => {
  it('should focus first focusable element', () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <div>Non-focusable</div>
      <button id="first">First Button</button>
      <button id="second">Second Button</button>
    `
    document.body.appendChild(container)

    focusFirst(container)

    expect(document.activeElement?.id).toBe('first')

    document.body.removeChild(container)
  })
})

describe('createKeyboardNavigation', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    container.innerHTML = `
      <button class="item">Item 1</button>
      <button class="item">Item 2</button>
      <button class="item">Item 3</button>
    `
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('should navigate with arrow keys', () => {
    const onSelect = vi.fn()
    const nav = createKeyboardNavigation(container, '.item', { onSelect })

    nav.focusFirst()

    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    container.dispatchEvent(downEvent)

    expect(nav.getCurrentIndex()).toBe(1)

    nav.cleanup()
  })

  it('should wrap navigation by default', () => {
    const nav = createKeyboardNavigation(container, '.item', { wrap: true })

    nav.focusLast() // Index 2

    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    container.dispatchEvent(downEvent)

    expect(nav.getCurrentIndex()).toBe(0) // Wrapped to first

    nav.cleanup()
  })

  it('should call onEnter when Enter is pressed', () => {
    const onEnter = vi.fn()
    const nav = createKeyboardNavigation(container, '.item', { onEnter })

    nav.focusFirst()

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    container.dispatchEvent(enterEvent)

    expect(onEnter).toHaveBeenCalled()

    nav.cleanup()
  })

  it('should call onEscape when Escape is pressed', () => {
    const onEscape = vi.fn()
    const nav = createKeyboardNavigation(container, '.item', { onEscape })

    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    container.dispatchEvent(escEvent)

    expect(onEscape).toHaveBeenCalled()

    nav.cleanup()
  })
})

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    const id3 = generateId()

    expect(id1).not.toBe(id2)
    expect(id2).not.toBe(id3)
  })

  it('should use custom prefix', () => {
    const id = generateId('custom')
    expect(id).toMatch(/^custom-\d+$/)
  })
})

describe('getContrastRatio', () => {
  it('should calculate contrast ratio for black and white', () => {
    const ratio = getContrastRatio('#000000', '#ffffff')
    expect(ratio).toBeCloseTo(21, 0) // 21:1 is max contrast
  })

  it('should calculate contrast ratio for similar colors', () => {
    const ratio = getContrastRatio('#777777', '#888888')
    expect(ratio).toBeLessThan(2)
  })

  it('should handle rgb colors', () => {
    const ratio = getContrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)')
    expect(ratio).toBeCloseTo(21, 0)
  })

  it('should handle shorthand hex', () => {
    const ratio = getContrastRatio('#000', '#fff')
    expect(ratio).toBeCloseTo(21, 0)
  })
})

describe('meetsWCAG', () => {
  it('should pass AA for normal text with 4.5:1', () => {
    expect(meetsWCAG(4.5, 'AA', false)).toBe(true)
    expect(meetsWCAG(4.4, 'AA', false)).toBe(false)
  })

  it('should pass AA for large text with 3:1', () => {
    expect(meetsWCAG(3, 'AA', true)).toBe(true)
    expect(meetsWCAG(2.9, 'AA', true)).toBe(false)
  })

  it('should pass AAA for normal text with 7:1', () => {
    expect(meetsWCAG(7, 'AAA', false)).toBe(true)
    expect(meetsWCAG(6.9, 'AAA', false)).toBe(false)
  })

  it('should pass AAA for large text with 4.5:1', () => {
    expect(meetsWCAG(4.5, 'AAA', true)).toBe(true)
    expect(meetsWCAG(4.4, 'AAA', true)).toBe(false)
  })
})

describe('prefersReducedMotion', () => {
  it('should return false by default (mocked)', () => {
    expect(prefersReducedMotion()).toBe(false)
  })
})

describe('prefersHighContrast', () => {
  it('should return false by default (mocked)', () => {
    expect(prefersHighContrast()).toBe(false)
  })
})

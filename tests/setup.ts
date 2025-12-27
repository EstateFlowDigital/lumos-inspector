import '@testing-library/jest-dom'
import { vi, afterEach } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
window.ResizeObserver = ResizeObserverMock

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  root = null
  rootMargin = ''
  thresholds = []
}
window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver

// Mock CSS.escape
if (!CSS.escape) {
  CSS.escape = (str: string) => str.replace(/([^\w-])/g, '\\$1')
}

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
})

// Mock getComputedStyle
const mockComputedStyle: Partial<CSSStyleDeclaration> = {
  display: 'block',
  position: 'static',
  width: '100px',
  height: '50px',
  margin: '0px',
  padding: '0px',
  color: 'rgb(0, 0, 0)',
  backgroundColor: 'rgba(0, 0, 0, 0)',
  fontSize: '16px',
  fontWeight: '400',
  getPropertyValue: vi.fn((prop: string) => {
    const styles: Record<string, string> = {
      display: 'block',
      position: 'static',
      width: '100px',
      height: '50px',
    }
    return styles[prop] || ''
  }),
}

window.getComputedStyle = vi.fn().mockReturnValue(mockComputedStyle as CSSStyleDeclaration)

// Clean up between tests
afterEach(() => {
  vi.clearAllMocks()
  localStorageMock.getItem.mockReset()
  localStorageMock.setItem.mockReset()
})

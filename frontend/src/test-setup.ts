import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Fix Jest matchers conflict with Playwright
// Only initialize vitest matchers if we're in a vitest environment
if (typeof globalThis.expect !== 'undefined' && globalThis.expect.extend) {
  // We're in vitest, safe to proceed
} else {
  // Prevent Jest matchers redefinition error
  globalThis.process = globalThis.process || { env: {} };
}

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
  root: null,
  rootMargin: '0px',
  thresholds: [0],
  takeRecords: vi.fn().mockReturnValue([]),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
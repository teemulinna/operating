// Playwright-specific setup file
// This file is separate from vitest setup to avoid conflicts

// Mock browser APIs that might not be available in test environment
if (typeof global !== 'undefined') {
  // Set up any global mocks needed for Playwright tests
  
  // Mock IntersectionObserver for browser tests
  if (!global.IntersectionObserver) {
    global.IntersectionObserver = class IntersectionObserver {
      observe() { }
      disconnect() { }
      unobserve() { }
      root = null;
      rootMargin = '0px';
      thresholds = [0];
      takeRecords = () => [];
    };
  }

  // Mock ResizeObserver for browser tests
  if (!global.ResizeObserver) {
    global.ResizeObserver = class ResizeObserver {
      observe() { }
      disconnect() { }
      unobserve() { }
    };
  }
}

// Increase timeout for E2E tests
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}
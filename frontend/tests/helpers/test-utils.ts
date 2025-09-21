import { Page, Locator, expect } from '@playwright/test';

/**
 * Enhanced test utilities for handling real API calls and dynamic content
 */
export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Wait for API response with proper error handling
   */
  async waitForApiResponse(
    urlPattern: string | RegExp, 
    options: { timeout?: number; method?: string } = {}
  ) {
    const { timeout = 15000, method = 'GET' } = options;
    
    try {
      const response = await this.page.waitForResponse(
        (response) => {
          const url = response.url();
          const matchesPattern = typeof urlPattern === 'string' 
            ? url.includes(urlPattern)
            : urlPattern.test(url);
          
          return matchesPattern && response.request().method() === method;
        },
        { timeout }
      );
      
      // Ensure the response is successful
      expect(response.status()).toBeLessThan(400);
      return response;
    } catch (error) {
      console.error(`Failed to wait for API response: ${urlPattern}`, error);
      throw error;
    }
  }

  /**
   * Wait for element to be visible and stable
   */
  async waitForStableElement(
    selector: string, 
    options: { timeout?: number; stable?: number } = {}
  ) {
    const { timeout = 10000, stable = 1000 } = options;
    
    const element = this.page.locator(selector);
    
    // Wait for element to be visible
    await element.waitFor({ state: 'visible', timeout });
    
    // Wait for element to be stable (no layout changes)
    await this.page.waitForTimeout(stable);
    
    return element;
  }

  /**
   * Wait for loading states to complete
   */
  async waitForLoadingComplete(loadingSelector: string = '[data-testid="loading"]') {
    try {
      // Wait for loading indicator to appear (optional)
      await this.page.waitForSelector(loadingSelector, { timeout: 2000 });
      
      // Wait for loading indicator to disappear
      await this.page.waitForSelector(loadingSelector, { 
        state: 'hidden', 
        timeout: 20000 
      });
    } catch (error) {
      // Loading indicator might not appear, which is fine
      console.log('No loading indicator found, continuing...');
    }
  }

  /**
   * Safe click with retry logic
   */
  async safeClick(selector: string, options: { timeout?: number; retries?: number } = {}) {
    const { timeout = 10000, retries = 3 } = options;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const element = this.page.locator(selector);
        
        // Wait for element to be clickable
        await element.waitFor({ state: 'visible', timeout });
        await element.waitFor({ state: 'attached', timeout });
        
        // Scroll into view if needed
        await element.scrollIntoViewIfNeeded();
        
        // Click the element
        await element.click({ timeout });
        
        return; // Success
      } catch (error) {
        console.log(`Click attempt ${attempt} failed for selector: ${selector}`);
        
        if (attempt === retries) {
          throw new Error(`Failed to click element after ${retries} attempts: ${selector}`);
        }
        
        // Wait before retry
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Safe form fill with validation
   */
  async safeFill(selector: string, value: string, options: { timeout?: number } = {}) {
    const { timeout = 10000 } = options;
    
    const element = this.page.locator(selector);
    
    // Wait for element to be editable
    await element.waitFor({ state: 'visible', timeout });
    await element.waitFor({ state: 'attached', timeout });
    
    // Clear existing value
    await element.clear();
    
    // Fill with new value
    await element.fill(value);
    
    // Verify the value was set correctly
    const currentValue = await element.inputValue();
    expect(currentValue).toBe(value);
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(timeout: number = 15000) {
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch (error) {
      console.warn('Network idle timeout, continuing...');
    }
  }

  /**
   * Take screenshot with error context
   */
  async takeScreenshotOnError(testName: string, error: Error) {
    try {
      const screenshot = await this.page.screenshot({
        fullPage: true,
        path: `test-results/screenshots/${testName}-error-${Date.now()}.png`
      });
      
      console.log(`Screenshot saved for failed test: ${testName}`);
      console.error('Test error:', error.message);
      
      return screenshot;
    } catch (screenshotError) {
      console.error('Failed to take error screenshot:', screenshotError);
    }
  }

  /**
   * Wait for specific API endpoints to be ready
   */
  async waitForApiHealth(endpoints: string[] = ['/api/health', '/api/employees']) {
    console.log('Checking API health...');
    
    for (const endpoint of endpoints) {
      try {
        const response = await this.page.request.get(endpoint, { timeout: 10000 });
        console.log(`API endpoint ${endpoint}: ${response.status()}`);
        
        if (response.status() >= 400) {
          console.warn(`API endpoint ${endpoint} returned ${response.status()}`);
        }
      } catch (error) {
        console.warn(`API endpoint ${endpoint} not available:`, error.message);
      }
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retry attempt ${attempt} after ${delay}ms delay`);
        await this.page.waitForTimeout(delay);
      }
    }
    
    throw new Error('Max retries exceeded');
  }
}

/**
 * Custom expect matchers for better API testing
 */
export const customExpect = {
  async toBeSuccessfulResponse(response: any) {
    expect(response.status()).toBeLessThan(400);
    expect(response.status()).toBeGreaterThanOrEqual(200);
  },

  async toHaveValidApiData(response: any) {
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  }
};

/**
 * Test data generators for consistent test data
 */
export const testData = {
  employee: {
    valid: {
      name: 'Test Employee',
      email: 'test@example.com',
      department: 'Engineering',
      role: 'Software Engineer',
      startDate: '2024-01-01',
      salary: 75000
    },
    
    invalid: {
      missingName: {
        email: 'test@example.com',
        department: 'Engineering'
      },
      
      invalidEmail: {
        name: 'Test Employee',
        email: 'invalid-email',
        department: 'Engineering'
      }
    }
  },

  project: {
    valid: {
      name: 'Test Project',
      description: 'A test project for E2E testing',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      budget: 100000,
      status: 'active'
    }
  }
};
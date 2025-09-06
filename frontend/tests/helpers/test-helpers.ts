/**
 * Test Helpers for E2E Testing
 * Provides common utilities for Playwright tests
 */
import { Page, expect, Locator } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for element to be visible and interactable
   */
  async waitForElement(selector: string): Promise<Locator> {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();
    return element;
  }

  /**
   * Wait for API response and verify success
   */
  async waitForApiResponse(urlPattern: string | RegExp) {
    const response = await this.page.waitForResponse(urlPattern);
    expect(response.ok()).toBeTruthy();
    return response;
  }

  /**
   * Fill form field with validation
   */
  async fillFormField(selector: string, value: string) {
    const field = await this.waitForElement(selector);
    await field.fill(value);
    await expect(field).toHaveValue(value);
  }

  /**
   * Click button and wait for action
   */
  async clickAndWait(selector: string, options?: { waitFor?: 'networkidle' | 'load' }) {
    const button = await this.waitForElement(selector);
    await button.click();
    
    if (options?.waitFor === 'networkidle') {
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Verify toast notification appears
   */
  async verifyToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    const toast = this.page.locator(`[data-testid="toast-${type}"]`);
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(message);
    
    // Wait for toast to auto-dismiss
    await expect(toast).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify loading state
   */
  async verifyLoading(isLoading: boolean = true) {
    const loader = this.page.locator('[data-testid="loading-spinner"]');
    if (isLoading) {
      await expect(loader).toBeVisible();
    } else {
      await expect(loader).not.toBeVisible();
    }
  }

  /**
   * Drag and drop element
   */
  async dragAndDrop(sourceSelector: string, targetSelector: string) {
    const source = await this.waitForElement(sourceSelector);
    const target = await this.waitForElement(targetSelector);
    
    await source.dragTo(target);
    await this.page.waitForTimeout(500); // Allow for animation
  }

  /**
   * Verify responsive design at different viewports
   */
  async testResponsiveDesign(viewports: Array<{ name: string; width: number; height: number }>) {
    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      await this.page.waitForTimeout(500);
      
      // Take screenshot for visual comparison
      await this.page.screenshot({ 
        path: `test-results/responsive-${viewport.name}.png`,
        fullPage: true 
      });
    }
  }

  /**
   * Test accessibility features
   */
  async testAccessibility() {
    // Check for ARIA labels
    const interactiveElements = this.page.locator('button, input, select, textarea, [role="button"]');
    const count = await interactiveElements.count();
    
    for (let i = 0; i < count; i++) {
      const element = interactiveElements.nth(i);
      const hasAriaLabel = await element.getAttribute('aria-label');
      const hasAriaLabelledBy = await element.getAttribute('aria-labelledby');
      const hasTitle = await element.getAttribute('title');
      const hasText = await element.textContent();
      
      // Ensure interactive elements have accessible names
      expect(hasAriaLabel || hasAriaLabelledBy || hasTitle || hasText).toBeTruthy();
    }
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    // Test tab navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
    
    // Test escape key functionality
    await this.page.keyboard.press('Escape');
  }

  /**
   * Mock API responses for testing
   */
  async mockApiResponse(url: string | RegExp, response: any, status: number = 200) {
    await this.page.route(url, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Wait for WebSocket connection
   */
  async waitForWebSocket() {
    await this.page.waitForFunction(() => {
      return window.WebSocket && 
             Array.from(document.querySelectorAll('*')).some(el => 
               el.getAttribute('data-testid')?.includes('websocket-connected')
             );
    });
  }

  /**
   * Verify animation completion
   */
  async waitForAnimation(selector: string, timeout: number = 3000) {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible' });
    
    // Wait for CSS animations to complete
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        
        const style = window.getComputedStyle(el);
        return style.animationPlayState === 'paused' || style.animationPlayState === 'finished';
      },
      selector,
      { timeout }
    );
  }
}

export const VIEWPORTS = {
  MOBILE: { name: 'mobile', width: 375, height: 667 },
  TABLET: { name: 'tablet', width: 768, height: 1024 },
  DESKTOP: { name: 'desktop', width: 1920, height: 1080 },
  DESKTOP_LARGE: { name: 'desktop-large', width: 2560, height: 1440 }
};

export const TEST_DATA = {
  EMPLOYEE: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    department: 'Engineering',
    role: 'Senior Developer',
    skills: ['React', 'TypeScript', 'Node.js']
  },
  PROJECT: {
    name: 'Test Project',
    description: 'A test project for E2E testing',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'active',
    priority: 'high'
  }
};
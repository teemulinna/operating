import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object Model class that all page objects should extend.
 * Provides common functionality and patterns for page interactions.
 */
export abstract class BasePage {
  protected readonly page: Page;
  protected readonly baseUrl: string;

  constructor(page: Page, baseUrl: string = 'http://localhost:3002') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  /**
   * Navigate to the page
   * @param path - Relative path to navigate to
   * @param options - Navigation options
   */
  async navigate(path: string = '', options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }) {
    const url = `${this.baseUrl}${path}`;
    await this.page.goto(url, { waitUntil: 'networkidle', ...options });
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get element by test ID
   * @param testId - The data-testid attribute value
   */
  getByTestId(testId: string): Locator {
    return this.page.locator(`[data-testid="${testId}"]`);
  }

  /**
   * Wait for element to be visible
   * @param locator - Element locator
   * @param timeout - Timeout in milliseconds (default: 10000)
   */
  async waitForVisible(locator: Locator, timeout: number = 10000) {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden
   * @param locator - Element locator
   * @param timeout - Timeout in milliseconds (default: 10000)
   */
  async waitForHidden(locator: Locator, timeout: number = 10000) {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Click element with retry logic
   * @param locator - Element locator
   * @param options - Click options
   */
  async clickElement(locator: Locator, options?: { force?: boolean; timeout?: number }) {
    await this.waitForVisible(locator);
    await locator.click({ force: false, timeout: 5000, ...options });
  }

  /**
   * Fill input field with validation
   * @param locator - Input element locator
   * @param value - Value to fill
   * @param options - Fill options
   */
  async fillInput(locator: Locator, value: string, options?: { clear?: boolean }) {
    await this.waitForVisible(locator);
    
    if (options?.clear !== false) {
      await locator.clear();
    }
    
    await locator.fill(value);
    
    // Verify the value was filled
    await expect(locator).toHaveValue(value);
  }

  /**
   * Select option from dropdown
   * @param locator - Select element locator
   * @param value - Value to select
   */
  async selectOption(locator: Locator, value: string) {
    await this.waitForVisible(locator);
    await locator.selectOption(value);
  }

  /**
   * Wait for text to appear in element
   * @param locator - Element locator
   * @param text - Expected text
   * @param timeout - Timeout in milliseconds (default: 10000)
   */
  async waitForText(locator: Locator, text: string, timeout: number = 10000) {
    await expect(locator).toContainText(text, { timeout });
  }

  /**
   * Scroll element into view
   * @param locator - Element locator
   */
  async scrollIntoView(locator: Locator) {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Take screenshot of element or page
   * @param options - Screenshot options
   */
  async takeScreenshot(options?: { 
    path?: string; 
    locator?: Locator; 
    fullPage?: boolean 
  }) {
    if (options?.locator) {
      return await options.locator.screenshot({ path: options.path });
    }
    return await this.page.screenshot({ 
      path: options?.path, 
      fullPage: options?.fullPage ?? false 
    });
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Check if element is visible
   * @param locator - Element locator
   */
  async isVisible(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if element exists in DOM
   * @param locator - Element locator
   */
  async exists(locator: Locator): Promise<boolean> {
    return (await locator.count()) > 0;
  }

  /**
   * Wait for API response
   * @param urlPattern - URL pattern to wait for
   * @param method - HTTP method (default: 'GET')
   */
  async waitForApiResponse(urlPattern: string | RegExp, method: string = 'GET') {
    return await this.page.waitForResponse(response => 
      response.url().match(urlPattern) !== null && 
      response.request().method() === method
    );
  }

  /**
   * Reload the current page
   */
  async reload() {
    await this.page.reload({ waitUntil: 'networkidle' });
  }

  /**
   * Go back to previous page
   */
  async goBack() {
    await this.page.goBack({ waitUntil: 'networkidle' });
  }

  /**
   * Execute JavaScript in page context
   * @param script - JavaScript to execute
   * @param args - Arguments to pass to the script
   */
  async executeScript(script: string, ...args: any[]) {
    return await this.page.evaluate(script, ...args);
  }
}
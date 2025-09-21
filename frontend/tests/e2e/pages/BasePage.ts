import { Page, expect } from '@playwright/test';

/**
 * Base Page Object Model providing common functionality for all pages
 */
export abstract class BasePage {
  protected page: Page;
  protected baseURL: string;

  constructor(page: Page, baseURL: string = 'http://localhost:3002') {
    this.page = page;
    this.baseURL = baseURL;
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string = ''): Promise<void> {
    const url = path.startsWith('http') ? path : `${this.baseURL}${path}`;
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    // Wait for any loading spinners to disappear
    await this.page.waitForFunction(() => {
      const spinners = document.querySelectorAll('[data-testid*="loading"], .loading, .spinner');
      return spinners.length === 0;
    }, { timeout: 10000 }).catch(() => {
      // Ignore timeout - some pages might not have loading states
    });
  }

  /**
   * Wait for an element to be visible and interactable
   */
  async waitForElement(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Click an element with retry logic
   */
  async clickElement(selector: string, options?: { timeout?: number; force?: boolean }): Promise<void> {
    await this.waitForElement(selector, options?.timeout);
    await this.page.click(selector, { force: options?.force });
  }

  /**
   * Fill a form field with validation
   */
  async fillField(selector: string, value: string, options?: { clear?: boolean }): Promise<void> {
    await this.waitForElement(selector);
    if (options?.clear) {
      await this.page.fill(selector, '');
    }
    await this.page.fill(selector, value);
    // Verify the value was set
    const actualValue = await this.page.inputValue(selector);
    expect(actualValue).toBe(value);
  }

  /**
   * Select an option from a dropdown
   */
  async selectOption(selector: string, value: string): Promise<void> {
    await this.waitForElement(selector);
    await this.page.selectOption(selector, value);
  }

  /**
   * Get text content of an element
   */
  async getElementText(selector: string): Promise<string> {
    await this.waitForElement(selector);
    const text = await this.page.textContent(selector);
    return text?.trim() || '';
  }

  /**
   * Check if an element is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for element to disappear
   */
  async waitForElementToDisappear(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Wait for a toast/notification message
   */
  async waitForToast(expectedMessage?: string): Promise<string> {
    const toastSelector = '[data-testid="toast"], .toast, [role="alert"]';
    await this.waitForElement(toastSelector);
    const toastText = await this.getElementText(toastSelector);
    
    if (expectedMessage) {
      expect(toastText).toContain(expectedMessage);
    }
    
    return toastText;
  }

  /**
   * Wait for API calls to complete
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Take a screenshot for debugging
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Verify page title
   */
  async verifyPageTitle(expectedTitle: string): Promise<void> {
    await expect(this.page.locator('[data-testid*="title"], h1').first()).toContainText(expectedTitle);
  }

  /**
   * Verify URL contains expected path
   */
  async verifyURL(expectedPath: string): Promise<void> {
    expect(this.page.url()).toContain(expectedPath);
  }

  /**
   * Handle dialog boxes (alerts, confirms)
   */
  async handleDialog(accept: boolean = true, message?: string): Promise<void> {
    this.page.on('dialog', async dialog => {
      if (message) {
        expect(dialog.message()).toContain(message);
      }
      if (accept) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Wait for element count to match expected
   */
  async waitForElementCount(selector: string, expectedCount: number, timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(
      ({ selector, count }) => document.querySelectorAll(selector).length === count,
      { selector, count: expectedCount },
      { timeout }
    );
  }

  /**
   * Retry an action with exponential backoff
   */
  async retry<T>(
    action: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await action();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.page.waitForTimeout(baseDelay * Math.pow(2, i));
      }
    }
    throw new Error('Retry failed');
  }
}
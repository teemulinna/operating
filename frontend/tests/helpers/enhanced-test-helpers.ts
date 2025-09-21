/**
 * Enhanced Test Helpers for Phase 3 E2E Testing
 * Provides comprehensive utilities for advanced testing scenarios
 */
import { Page, expect, Locator } from '@playwright/test';

export class EnhancedTestHelpers {
  constructor(private page: Page) {}

  /**
   * Advanced element waiting with multiple conditions
   */
  async waitForElementAdvanced(
    selector: string, 
    options: {
      timeout?: number;
      state?: 'attached' | 'detached' | 'visible' | 'hidden';
      hasText?: string;
      hasClass?: string;
      hasAttribute?: { name: string; value?: string };
    } = {}
  ): Promise<Locator> {
    const element = this.page.locator(selector);
    
    await element.waitFor({
      state: options.state || 'visible',
      timeout: options.timeout || 10000
    });

    if (options.hasText) {
      await expect(element).toContainText(options.hasText);
    }

    if (options.hasClass) {
      await expect(element).toHaveClass(new RegExp(options.hasClass));
    }

    if (options.hasAttribute) {
      if (options.hasAttribute.value) {
        await expect(element).toHaveAttribute(options.hasAttribute.name, options.hasAttribute.value);
      } else {
        await expect(element).toHaveAttribute(options.hasAttribute.name);
      }
    }

    return element;
  }

  /**
   * Fill form with validation and retry logic
   */
  async fillFormAdvanced(
    formSelector: string,
    formData: Record<string, string | boolean | string[]>,
    options: {
      validateAfterFill?: boolean;
      retryOnFailure?: number;
      clearBefore?: boolean;
    } = {}
  ) {
    const form = await this.waitForElementAdvanced(formSelector);
    
    for (const [fieldKey, fieldValue] of Object.entries(formData)) {
      const fieldSelector = `[data-testid="${fieldKey}"], [name="${fieldKey}"], #${fieldKey}`;
      const field = form.locator(fieldSelector);

      let attempts = 0;
      const maxAttempts = options.retryOnFailure || 1;

      while (attempts < maxAttempts) {
        try {
          await field.waitFor({ state: 'visible', timeout: 5000 });

          if (options.clearBefore) {
            await field.clear();
          }

          // Handle different input types
          const inputType = await field.getAttribute('type');
          const tagName = await field.evaluate(el => el.tagName.toLowerCase());

          if (tagName === 'select') {
            await field.selectOption(fieldValue as string);
          } else if (inputType === 'checkbox') {
            const shouldCheck = Boolean(fieldValue);
            if (shouldCheck !== await field.isChecked()) {
              await field.click();
            }
          } else if (inputType === 'radio') {
            await field.click();
          } else if (Array.isArray(fieldValue)) {
            // Handle multi-select or tag inputs
            for (const value of fieldValue) {
              await field.fill(value);
              await this.page.keyboard.press('Enter');
            }
          } else {
            await field.fill(String(fieldValue));
          }

          // Validate field was filled correctly if requested
          if (options.validateAfterFill && typeof fieldValue === 'string') {
            const currentValue = await field.inputValue();
            if (currentValue !== fieldValue) {
              throw new Error(`Field ${fieldKey} validation failed: expected "${fieldValue}", got "${currentValue}"`);
            }
          }

          break; // Success, exit retry loop
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to fill field ${fieldKey} after ${maxAttempts} attempts: ${error.message}`);
          }
          await this.page.waitForTimeout(500); // Wait before retry
        }
      }
    }
  }

  /**
   * Advanced drag and drop with custom options
   */
  async dragAndDropAdvanced(
    sourceSelector: string,
    targetSelector: string,
    options: {
      offset?: { x: number; y: number };
      duration?: number;
      steps?: number;
      waitForAnimation?: boolean;
      validateDrop?: boolean;
    } = {}
  ) {
    const source = await this.waitForElementAdvanced(sourceSelector);
    const target = await this.waitForElementAdvanced(targetSelector);

    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();

    if (!sourceBox || !targetBox) {
      throw new Error('Could not get bounding boxes for drag and drop elements');
    }

    const sourceX = sourceBox.x + sourceBox.width / 2;
    const sourceY = sourceBox.y + sourceBox.height / 2;
    const targetX = targetBox.x + (options.offset?.x || targetBox.width / 2);
    const targetY = targetBox.y + (options.offset?.y || targetBox.height / 2);

    // Perform drag with smooth movement
    await this.page.mouse.move(sourceX, sourceY);
    await this.page.mouse.down();

    if (options.steps && options.steps > 1) {
      // Smooth drag with multiple steps
      const stepX = (targetX - sourceX) / options.steps;
      const stepY = (targetY - sourceY) / options.steps;
      const stepDuration = (options.duration || 1000) / options.steps;

      for (let i = 1; i <= options.steps; i++) {
        await this.page.mouse.move(sourceX + stepX * i, sourceY + stepY * i);
        await this.page.waitForTimeout(stepDuration);
      }
    } else {
      await this.page.mouse.move(targetX, targetY);
      if (options.duration) {
        await this.page.waitForTimeout(options.duration);
      }
    }

    await this.page.mouse.up();

    if (options.waitForAnimation) {
      await this.waitForAnimationsComplete();
    }

    if (options.validateDrop) {
      // Verify the element was actually moved
      const movedElement = target.locator(sourceSelector.split(' ').pop() || sourceSelector);
      await expect(movedElement).toBeVisible({ timeout: 5000 });
    }
  }

  /**
   * Wait for all CSS animations to complete
   */
  async waitForAnimationsComplete(timeout: number = 5000) {
    await this.page.waitForFunction(
      () => {
        const elements = document.querySelectorAll('*');
        for (const element of elements) {
          const styles = window.getComputedStyle(element);
          if (styles.animationPlayState === 'running' || 
              styles.transitionProperty !== 'none') {
            return false;
          }
        }
        return true;
      },
      {},
      { timeout }
    );
  }

  /**
   * Advanced WebSocket connection handling
   */
  async waitForWebSocketConnection(
    expectedUrl?: string,
    timeout: number = 10000
  ): Promise<{ connected: boolean; url?: string; error?: string }> {
    return await this.page.evaluate(
      ({ url, timeout }) => {
        return new Promise((resolve) => {
          let resolved = false;
          const startTime = Date.now();

          const checkConnection = () => {
            if (resolved) return;

            // Check for existing WebSocket connections
            const webSockets = Array.from(document.querySelectorAll('[data-websocket-status]'));
            const connectedSocket = webSockets.find(el => 
              el.getAttribute('data-websocket-status') === 'connected'
            );

            if (connectedSocket) {
              resolved = true;
              resolve({
                connected: true,
                url: connectedSocket.getAttribute('data-websocket-url') || undefined
              });
              return;
            }

            // Check if timeout exceeded
            if (Date.now() - startTime > timeout) {
              resolved = true;
              resolve({
                connected: false,
                error: 'WebSocket connection timeout'
              });
              return;
            }

            // Continue checking
            setTimeout(checkConnection, 100);
          };

          checkConnection();
        });
      },
      { url: expectedUrl, timeout }
    );
  }

  /**
   * Performance monitoring utilities
   */
  async measurePagePerformance(): Promise<{
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    memoryUsage?: {
      used: number;
      total: number;
      limit: number;
    };
  }> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      let cls = 0;
      let lcp = 0;

      // Get CLS if available
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
            if (entry.entryType === 'largest-contentful-paint') {
              lcp = entry.startTime;
            }
          }
        });
        
        try {
          observer.observe({ entryTypes: ['layout-shift', 'largest-contentful-paint'] });
        } catch (e) {
          // Browser may not support these entry types
        }
      }

      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      
      const performance: any = {
        loadTime: navigation.loadEventEnd - navigation.navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        firstContentfulPaint: fcp,
        largestContentfulPaint: lcp,
        cumulativeLayoutShift: cls
      };

      // Add memory info if available
      const memory = (window.performance as any).memory;
      if (memory) {
        performance.memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        };
      }

      return performance;
    });
  }

  /**
   * Advanced accessibility testing
   */
  async testKeyboardNavigation(
    startElement: string,
    expectedFocusSequence: string[],
    options: {
      useArrowKeys?: boolean;
      testReverse?: boolean;
    } = {}
  ): Promise<{ success: boolean; actualSequence: string[]; errors: string[] }> {
    const errors: string[] = [];
    const actualSequence: string[] = [];

    try {
      // Focus starting element
      await this.page.focus(startElement);
      actualSequence.push(startElement);

      // Navigate through expected sequence
      for (let i = 1; i < expectedFocusSequence.length; i++) {
        if (options.useArrowKeys) {
          await this.page.keyboard.press('ArrowDown');
        } else {
          await this.page.keyboard.press('Tab');
        }

        await this.page.waitForTimeout(100);

        const focused = await this.page.evaluate(() => {
          const activeEl = document.activeElement;
          return activeEl?.getAttribute('data-testid') || 
                 activeEl?.getAttribute('id') || 
                 activeEl?.tagName.toLowerCase() || 
                 'unknown';
        });

        actualSequence.push(focused);

        if (focused !== expectedFocusSequence[i]) {
          errors.push(`Expected focus on "${expectedFocusSequence[i]}" but got "${focused}"`);
        }
      }

      // Test reverse navigation if requested
      if (options.testReverse) {
        for (let i = expectedFocusSequence.length - 2; i >= 0; i--) {
          if (options.useArrowKeys) {
            await this.page.keyboard.press('ArrowUp');
          } else {
            await this.page.keyboard.press('Shift+Tab');
          }

          await this.page.waitForTimeout(100);

          const focused = await this.page.evaluate(() => {
            const activeEl = document.activeElement;
            return activeEl?.getAttribute('data-testid') || 
                   activeEl?.getAttribute('id') || 
                   activeEl?.tagName.toLowerCase() || 
                   'unknown';
          });

          if (focused !== expectedFocusSequence[i]) {
            errors.push(`Reverse navigation: Expected focus on "${expectedFocusSequence[i]}" but got "${focused}"`);
          }
        }
      }

      return {
        success: errors.length === 0,
        actualSequence,
        errors
      };
    } catch (error) {
      return {
        success: false,
        actualSequence,
        errors: [...errors, `Navigation error: ${error.message}`]
      };
    }
  }

  /**
   * Advanced toast/notification verification
   */
  async verifyNotification(
    expectedMessage: string,
    options: {
      type?: 'success' | 'error' | 'warning' | 'info';
      timeout?: number;
      shouldDisappear?: boolean;
      clickToDismiss?: boolean;
    } = {}
  ) {
    const notificationSelectors = [
      `[data-testid="toast-${options.type || 'success'}"]`,
      `[data-testid="notification"]`,
      `[role="alert"]`,
      `[aria-live="polite"]`,
      `[aria-live="assertive"]`,
      '.toast',
      '.notification',
      '.alert'
    ];

    let notification: Locator | null = null;

    // Find the notification
    for (const selector of notificationSelectors) {
      const element = this.page.locator(selector);
      if (await element.isVisible({ timeout: 1000 })) {
        notification = element;
        break;
      }
    }

    if (!notification) {
      throw new Error(`No notification found with message: "${expectedMessage}"`);
    }

    // Verify message content
    await expect(notification).toContainText(expectedMessage, {
      timeout: options.timeout || 5000
    });

    // Test dismissal behavior
    if (options.clickToDismiss) {
      const closeButton = notification.locator('[data-testid="close"], .close, [aria-label*="close"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else {
        await notification.click();
      }
    }

    // Verify auto-disappear behavior
    if (options.shouldDisappear !== false) {
      await expect(notification).not.toBeVisible({
        timeout: options.timeout || 10000
      });
    }
  }

  /**
   * Advanced data loading state verification
   */
  async waitForDataLoad(
    dataSelector: string,
    options: {
      loadingSelector?: string;
      errorSelector?: string;
      emptySelector?: string;
      minItems?: number;
      timeout?: number;
    } = {}
  ) {
    const timeout = options.timeout || 15000;
    const startTime = Date.now();

    // Wait for loading state to appear (if specified)
    if (options.loadingSelector) {
      const loadingElement = this.page.locator(options.loadingSelector);
      if (await loadingElement.isVisible({ timeout: 2000 })) {
        // Wait for loading to complete
        await expect(loadingElement).not.toBeVisible({ timeout });
      }
    }

    // Check for error state
    if (options.errorSelector) {
      const errorElement = this.page.locator(options.errorSelector);
      const hasError = await errorElement.isVisible({ timeout: 1000 });
      if (hasError) {
        const errorMessage = await errorElement.textContent();
        throw new Error(`Data loading error: ${errorMessage}`);
      }
    }

    // Check for empty state
    if (options.emptySelector) {
      const emptyElement = this.page.locator(options.emptySelector);
      const isEmpty = await emptyElement.isVisible({ timeout: 1000 });
      if (isEmpty && !options.minItems) {
        return { empty: true, count: 0 };
      }
    }

    // Wait for data to appear
    const dataElement = this.page.locator(dataSelector);
    await expect(dataElement).toBeVisible({ timeout });

    // Verify minimum item count if specified
    if (options.minItems && options.minItems > 0) {
      const items = dataElement.locator('> *');
      await expect(items).toHaveCount.greaterThanOrEqual(options.minItems);
      
      return { 
        empty: false, 
        count: await items.count(),
        loadTime: Date.now() - startTime
      };
    }

    return { 
      empty: false, 
      count: await dataElement.count(),
      loadTime: Date.now() - startTime
    };
  }

  /**
   * Advanced screenshot utilities with masking
   */
  async takeScreenshotWithMasking(
    filename: string,
    options: {
      maskSelectors?: string[];
      hideSelectors?: string[];
      fullPage?: boolean;
      clip?: { x: number; y: number; width: number; height: number };
    } = {}
  ) {
    // Hide dynamic elements
    if (options.hideSelectors) {
      await this.page.addStyleTag({
        content: options.hideSelectors.map(selector => `${selector} { visibility: hidden !important; }`).join('\n')
      });
    }

    // Take screenshot with masking
    const screenshotOptions: any = {
      path: filename,
      fullPage: options.fullPage,
      clip: options.clip,
      animations: 'disabled'
    };

    if (options.maskSelectors) {
      screenshotOptions.mask = options.maskSelectors.map(selector => this.page.locator(selector));
    }

    return await this.page.screenshot(screenshotOptions);
  }

  /**
   * Advanced form validation testing
   */
  async testFormValidation(
    formSelector: string,
    validationTests: Array<{
      field: string;
      invalidValue: string;
      expectedError: string;
      validValue?: string;
    }>
  ): Promise<{ passed: number; failed: number; errors: string[] }> {
    const form = await this.waitForElementAdvanced(formSelector);
    const errors: string[] = [];
    let passed = 0;
    let failed = 0;

    for (const test of validationTests) {
      try {
        // Clear and fill with invalid value
        const field = form.locator(`[data-testid="${test.field}"], [name="${test.field}"]`);
        await field.clear();
        await field.fill(test.invalidValue);
        await field.blur();

        // Trigger validation (try form submission or field validation)
        await this.page.keyboard.press('Tab');
        await this.page.waitForTimeout(500);

        // Look for error message
        const errorSelectors = [
          `[data-testid="${test.field}-error"]`,
          `[aria-describedby*="error"]`,
          `[id*="${test.field}-error"]`,
          '.field-error',
          '.error-message'
        ];

        let errorFound = false;
        for (const errorSelector of errorSelectors) {
          const errorElement = this.page.locator(errorSelector);
          if (await errorElement.isVisible({ timeout: 1000 })) {
            const errorText = await errorElement.textContent();
            if (errorText?.includes(test.expectedError)) {
              passed++;
              errorFound = true;
              break;
            }
          }
        }

        if (!errorFound) {
          failed++;
          errors.push(`Field "${test.field}": Expected error "${test.expectedError}" not found for value "${test.invalidValue}"`);
        }

        // Test valid value if provided
        if (test.validValue) {
          await field.clear();
          await field.fill(test.validValue);
          await field.blur();
          await this.page.waitForTimeout(500);

          // Error should disappear
          let errorStillVisible = false;
          for (const errorSelector of errorSelectors) {
            const errorElement = this.page.locator(errorSelector);
            if (await errorElement.isVisible({ timeout: 1000 })) {
              errorStillVisible = true;
              break;
            }
          }

          if (errorStillVisible) {
            errors.push(`Field "${test.field}": Error message persisted after entering valid value "${test.validValue}"`);
            failed++;
          } else {
            passed++;
          }
        }

      } catch (error) {
        failed++;
        errors.push(`Field "${test.field}": Validation test error - ${error.message}`);
      }
    }

    return { passed, failed, errors };
  }

  /**
   * Utility to generate mock data for testing
   */
  generateMockData<T>(
    template: T,
    count: number,
    customizer?: (item: T, index: number) => Partial<T>
  ): T[] {
    return Array.from({ length: count }, (_, index) => {
      const baseItem = JSON.parse(JSON.stringify(template));
      const customizations = customizer ? customizer(baseItem, index) : {};
      return { ...baseItem, ...customizations };
    });
  }

  /**
   * Wait for network requests to complete
   */
  async waitForNetworkIdle(
    options: {
      timeout?: number;
      idleTime?: number;
      ignorePatterns?: RegExp[];
    } = {}
  ) {
    const timeout = options.timeout || 30000;
    const idleTime = options.idleTime || 500;
    const ignorePatterns = options.ignorePatterns || [];

    let requestCount = 0;
    let lastRequestTime = Date.now();

    const requestHandler = (request: any) => {
      const url = request.url();
      const shouldIgnore = ignorePatterns.some(pattern => pattern.test(url));
      
      if (!shouldIgnore) {
        requestCount++;
        lastRequestTime = Date.now();
      }
    };

    const responseHandler = (response: any) => {
      const url = response.url();
      const shouldIgnore = ignorePatterns.some(pattern => pattern.test(url));
      
      if (!shouldIgnore) {
        requestCount--;
        lastRequestTime = Date.now();
      }
    };

    this.page.on('request', requestHandler);
    this.page.on('response', responseHandler);

    try {
      await this.page.waitForFunction(
        ({ idleTime, lastRequestTime }) => {
          return requestCount === 0 && (Date.now() - lastRequestTime) > idleTime;
        },
        { requestCount, idleTime, lastRequestTime },
        { timeout }
      );
    } finally {
      this.page.off('request', requestHandler);
      this.page.off('response', responseHandler);
    }
  }
}
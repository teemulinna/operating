/**
 * Test Helpers - Unified Utilities
 */

export const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
  wide: { width: 1920, height: 1080 }
};

export class TestHelpers {
  static async waitForElement(page: any, selector: string, timeout = 10000) {
    return await page.waitForSelector(selector, { timeout });
  }
  
  static async fillFormField(page: any, selector: string, value: string) {
    await page.fill(selector, value);
    await page.waitForTimeout(100);
  }
  
  static async verifyLoading(page: any, isLoading: boolean) {
    const loadingSelector = '[data-testid="loading"], .loading, .spinner';
    if (isLoading) {
      await page.locator(loadingSelector).waitFor({ state: 'visible' });
    } else {
      await page.locator(loadingSelector).waitFor({ state: 'hidden' });
    }
  }
}
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestHelpers = exports.VIEWPORTS = void 0;
exports.VIEWPORTS = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1440, height: 900 },
    wide: { width: 1920, height: 1080 }
};
class TestHelpers {
    static async waitForElement(page, selector, timeout = 10000) {
        return await page.waitForSelector(selector, { timeout });
    }
    static async fillFormField(page, selector, value) {
        await page.fill(selector, value);
        await page.waitForTimeout(100);
    }
    static async verifyLoading(page, isLoading) {
        const loadingSelector = '[data-testid="loading"], .loading, .spinner';
        if (isLoading) {
            await page.locator(loadingSelector).waitFor({ state: 'visible' });
        }
        else {
            await page.locator(loadingSelector).waitFor({ state: 'hidden' });
        }
    }
}
exports.TestHelpers = TestHelpers;
//# sourceMappingURL=test-helpers.js.map
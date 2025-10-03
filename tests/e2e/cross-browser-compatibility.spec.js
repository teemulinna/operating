"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const test_2 = require("@playwright/test");
const { test: enhancedTest, expect: enhancedExpect } = test_2.test;
const browsers = [
    { name: 'Chrome', project: 'Desktop Chrome' },
    { name: 'Firefox', project: 'Desktop Firefox' },
    { name: 'Safari', project: 'Desktop Safari' }
];
enhancedTest.describe('Cross-Browser Compatibility Tests', () => {
    enhancedTest.describe('Core Functionality Across Browsers', () => {
        browsers.forEach(browser => {
            enhancedTest.describe(`${browser.name} Browser Tests`, () => {
                enhancedTest(`should load dashboard correctly in ${browser.name}`, async ({ page, testHelpers, browserName }) => {
                    await page.goto('/dashboard');
                    await testHelpers.waitForElement('[data-testid="main-dashboard"]');
                    await (0, test_1.expect)(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
                    await (0, test_1.expect)(page.locator('[data-testid="navigation-menu"]')).toBeVisible();
                    await (0, test_1.expect)(page.locator('[data-testid="main-content"]')).toBeVisible();
                    const performanceMetrics = await page.evaluate(() => { n; const navigation = performance.getEntriesByType('navigation')[0]; n; return { n, loadTime: navigation.loadEventEnd - navigation.loadEventStart, n, domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart, n, firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0, n }; n; });
                    n;
                    n;
                });
            });
        });
    });
});
//# sourceMappingURL=cross-browser-compatibility.spec.js.map
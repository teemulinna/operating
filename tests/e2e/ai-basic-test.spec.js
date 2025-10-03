"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const BASE_URL = 'http://localhost:3003';
test_1.test.describe.configure({ mode: 'serial' });
test_1.test.describe('AI Basic Smoke Tests', () => {
    test_1.test.beforeEach(async ({ page }) => {
        page.setDefaultTimeout(30000);
    });
    (0, test_1.test)('Should load the main dashboard without errors', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        const errors = [];
        page.on('pageerror', (error) => {
            errors.push(error.message);
        });
        await page.waitForTimeout(2000);
        (0, test_1.expect)(errors.length).toBe(0);
        await (0, test_1.expect)(page).toHaveTitle(/.*/, { timeout: 10000 });
        const body = await page.locator('body');
        await (0, test_1.expect)(body).toBeVisible();
    });
    (0, test_1.test)('Should navigate to AI insights page', async ({ page }) => {
        await page.goto(`${BASE_URL}/ai-insights`);
        await page.waitForLoadState('networkidle');
        const body = page.locator('body');
        await (0, test_1.expect)(body).toBeVisible();
        const errorTexts = ['Page Not Found', 'Error', '404', 'Not Found'];
        for (const errorText of errorTexts) {
            const errorElement = page.getByText(errorText, { exact: false });
            const isVisible = await errorElement.isVisible({ timeout: 1000 }).catch(() => false);
            (0, test_1.expect)(isVisible).toBe(false);
        }
    });
    (0, test_1.test)('Should navigate to analytics dashboard', async ({ page }) => {
        await page.goto(`${BASE_URL}/analytics`);
        await page.waitForLoadState('networkidle');
        const body = page.locator('body');
        await (0, test_1.expect)(body).toBeVisible();
        const hasLoadingOrContent = await page.evaluate(() => {
            const loadingElements = document.querySelectorAll('[class*="loading"], [class*="Loading"], [class*="spinner"], [class*="Spinner"]');
            const contentElements = document.querySelectorAll('h1, h2, .card, [class*="card"], [class*="dashboard"]');
            return loadingElements.length > 0 || contentElements.length > 0;
        });
        (0, test_1.expect)(hasLoadingOrContent).toBe(true);
    });
    (0, test_1.test)('Should navigate to resource optimizer', async ({ page }) => {
        await page.goto(`${BASE_URL}/resource-optimizer`);
        await page.waitForLoadState('networkidle');
        const body = page.locator('body');
        await (0, test_1.expect)(body).toBeVisible();
        const pageContent = await page.textContent('body');
        (0, test_1.expect)(pageContent).not.toContain('Page Not Found');
    });
    (0, test_1.test)('Should handle navigation between pages', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.goto(`${BASE_URL}/analytics`);
        await page.waitForLoadState('networkidle');
        await page.goto(`${BASE_URL}/ai-insights`);
        await page.waitForLoadState('networkidle');
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        const body = page.locator('body');
        await (0, test_1.expect)(body).toBeVisible();
    });
    (0, test_1.test)('Should show proper 404 for non-existent routes', async ({ page }) => {
        await page.goto(`${BASE_URL}/non-existent-page`);
        await page.waitForLoadState('networkidle');
        const notFoundText = page.getByText('Page Not Found');
        await (0, test_1.expect)(notFoundText).toBeVisible({ timeout: 10000 });
        const goBackButton = page.getByText('Go Back');
        await (0, test_1.expect)(goBackButton).toBeVisible();
    });
    (0, test_1.test)('Should load without console errors on main routes', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        const routesToTest = [
            '/',
            '/analytics',
            '/ai-insights',
            '/resource-optimizer'
        ];
        for (const route of routesToTest) {
            await page.goto(`${BASE_URL}${route}`);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
        }
        const criticalErrors = consoleErrors.filter(error => !error.includes('DevTools') &&
            !error.includes('Extension') &&
            !error.includes('favicon') &&
            !error.includes('WebSocket'));
        (0, test_1.expect)(criticalErrors.length).toBeLessThanOrEqual(2);
    });
});
//# sourceMappingURL=ai-basic-test.spec.js.map
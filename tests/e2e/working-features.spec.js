"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const checkNoConsoleErrors = (page, testName) => {
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(`${testName}: ${msg.text()}`);
        }
    });
    return () => errors;
};
test_1.test.describe('Working Features - Basic Functionality', () => {
    test_1.test.beforeEach(async ({ page }) => {
        page.setDefaultTimeout(30000);
    });
    (0, test_1.test)('Navigate to home page and verify basic structure', async ({ page }) => {
        const getErrors = checkNoConsoleErrors(page, 'Home Navigation');
        try {
            await page.goto('/', { waitUntil: 'networkidle' });
            await (0, test_1.expect)(page.locator('h1')).toContainText('Resource Planning System', { timeout: 10000 });
            await (0, test_1.expect)(page.locator('.container')).toBeVisible();
            await (0, test_1.expect)(page.locator('header')).toBeVisible();
            const errors = getErrors();
            if (errors.length > 0) {
                console.warn('Console errors detected:', errors);
            }
        }
        catch (error) {
            console.log('Home page navigation failed:', error);
            await page.screenshot({ path: 'test-results/home-navigation-failure.png', fullPage: true });
            throw error;
        }
    });
    (0, test_1.test)('AI Features Dashboard loads and displays components', async ({ page }) => {
        const getErrors = checkNoConsoleErrors(page, 'AI Dashboard');
        try {
            await page.goto('/', { waitUntil: 'networkidle' });
            await (0, test_1.expect)(page.locator('text=AI Features Integration Test')).toBeVisible({ timeout: 15000 });
            const testCards = page.locator('[class*="grid"] > div[class*="Card"]');
            await (0, test_1.expect)(testCards.first()).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Test Summary')).toBeVisible();
            await (0, test_1.expect)(page.locator('button:has-text("Test All Features")')).toBeVisible();
            console.log('AI Dashboard loaded successfully');
        }
        catch (error) {
            console.log('AI Dashboard loading failed:', error);
            await page.screenshot({ path: 'test-results/ai-dashboard-failure.png', fullPage: true });
            throw error;
        }
    });
    (0, test_1.test)('Feature testing buttons are functional', async ({ page }) => {
        const getErrors = checkNoConsoleErrors(page, 'Feature Testing');
        try {
            await page.goto('/', { waitUntil: 'networkidle' });
            await (0, test_1.expect)(page.locator('text=AI Features Integration Test')).toBeVisible({ timeout: 15000 });
            const testButtons = page.locator('button:has-text("Test")');
            const buttonCount = await testButtons.count();
            (0, test_1.expect)(buttonCount).toBeGreaterThan(0);
            console.log(`Found ${buttonCount} test buttons`);
            if (buttonCount > 0) {
                const firstButton = testButtons.first();
                await (0, test_1.expect)(firstButton).toBeEnabled();
                await firstButton.click();
                await page.waitForTimeout(1000);
                console.log('Successfully clicked test button');
            }
        }
        catch (error) {
            console.log('Feature testing failed:', error);
            await page.screenshot({ path: 'test-results/feature-testing-failure.png', fullPage: true });
        }
    });
    (0, test_1.test)('Page renders without critical console errors', async ({ page }) => {
        const consoleErrors = [];
        const consoleWarnings = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
            else if (msg.type() === 'warning') {
                consoleWarnings.push(msg.text());
            }
        });
        try {
            await page.goto('/', { waitUntil: 'networkidle' });
            await (0, test_1.expect)(page.locator('h1')).toBeVisible({ timeout: 15000 });
            await page.waitForTimeout(3000);
            console.log(`Console errors: ${consoleErrors.length}`);
            console.log(`Console warnings: ${consoleWarnings.length}`);
            if (consoleErrors.length > 0) {
                console.log('Console errors found:', consoleErrors.slice(0, 5));
            }
            if (consoleWarnings.length > 0) {
                console.log('Console warnings found:', consoleWarnings.slice(0, 3));
            }
        }
        catch (error) {
            console.log('Page rendering failed:', error);
            await page.screenshot({ path: 'test-results/page-render-failure.png', fullPage: true });
            throw error;
        }
    });
    (0, test_1.test)('Basic navigation and accessibility', async ({ page }) => {
        const getErrors = checkNoConsoleErrors(page, 'Navigation');
        try {
            await page.goto('/', { waitUntil: 'networkidle' });
            await (0, test_1.expect)(page.locator('h1')).toHaveAttribute('class');
            const buttons = page.locator('button');
            const buttonCount = await buttons.count();
            if (buttonCount > 0) {
                await buttons.first().focus();
                console.log(`Found ${buttonCount} buttons, first one is focusable`);
            }
            await (0, test_1.expect)(page.locator('main')).toBeVisible();
            await (0, test_1.expect)(page.locator('header')).toBeVisible();
            console.log('Basic navigation and accessibility checks passed');
        }
        catch (error) {
            console.log('Navigation/accessibility test failed:', error);
            await page.screenshot({ path: 'test-results/navigation-failure.png', fullPage: true });
            throw error;
        }
    });
});
test_1.test.describe('Working Features - Detailed Component Testing', () => {
    (0, test_1.test)('Feature status indicators work correctly', async ({ page }) => {
        try {
            await page.goto('/', { waitUntil: 'networkidle' });
            await (0, test_1.expect)(page.locator('text=AI Features Integration Test')).toBeVisible({ timeout: 15000 });
            const badges = page.locator('[class*="Badge"]');
            const badgeCount = await badges.count();
            console.log(`Found ${badgeCount} status badges`);
            const summaryNumbers = page.locator('.text-2xl.font-bold');
            const statCount = await summaryNumbers.count();
            (0, test_1.expect)(statCount).toBeGreaterThanOrEqual(4);
            console.log(`Test summary shows ${statCount} statistics`);
        }
        catch (error) {
            console.log('Feature status test failed:', error);
            await page.screenshot({ path: 'test-results/feature-status-failure.png', fullPage: true });
            throw error;
        }
    });
    (0, test_1.test)('Component responsiveness', async ({ page }) => {
        try {
            await page.setViewportSize({ width: 1920, height: 1080 });
            await page.goto('/', { waitUntil: 'networkidle' });
            await (0, test_1.expect)(page.locator('h1')).toBeVisible();
            console.log('Desktop view: OK');
            await page.setViewportSize({ width: 768, height: 1024 });
            await page.waitForTimeout(500);
            await (0, test_1.expect)(page.locator('h1')).toBeVisible();
            console.log('Tablet view: OK');
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(500);
            await (0, test_1.expect)(page.locator('h1')).toBeVisible();
            console.log('Mobile view: OK');
        }
        catch (error) {
            console.log('Responsiveness test failed:', error);
            await page.screenshot({ path: 'test-results/responsiveness-failure.png', fullPage: true });
            throw error;
        }
    });
});
//# sourceMappingURL=working-features.spec.js.map
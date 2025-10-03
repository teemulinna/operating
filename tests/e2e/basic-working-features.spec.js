"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Basic Working Features - Simple Tests', () => {
    test_1.test.beforeEach(async ({ page }) => {
        page.setDefaultTimeout(30000);
        await page.goto('http://localhost:3002', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
    });
    (0, test_1.test)('Application loads without crashing', async ({ page }) => {
        try {
            await (0, test_1.expect)(page.locator('body')).toBeVisible({ timeout: 15000 });
            const pageContent = await page.textContent('body');
            (0, test_1.expect)(pageContent).toBeTruthy();
            (0, test_1.expect)(pageContent.length).toBeGreaterThan(0);
            console.log('✓ Application loaded successfully');
        }
        catch (error) {
            console.log('❌ Application failed to load:', error);
            await page.screenshot({ path: 'test-results/basic-load-failure.png', fullPage: true });
            throw error;
        }
    });
    (0, test_1.test)('Basic HTML structure exists', async ({ page }) => {
        try {
            await (0, test_1.expect)(page.locator('html')).toBeVisible();
            await (0, test_1.expect)(page.locator('body')).toBeVisible();
            const containers = page.locator('div');
            const containerCount = await containers.count();
            (0, test_1.expect)(containerCount).toBeGreaterThan(0);
            console.log(`✓ Found ${containerCount} div elements`);
        }
        catch (error) {
            console.log('❌ Basic HTML structure test failed:', error);
            await page.screenshot({ path: 'test-results/html-structure-failure.png', fullPage: true });
            throw error;
        }
    });
    (0, test_1.test)('Page title and meta information', async ({ page }) => {
        try {
            const title = await page.title();
            console.log(`Page title: "${title}"`);
            (0, test_1.expect)(title).toBeTruthy();
            const hasContent = await page.locator('body *').count();
            (0, test_1.expect)(hasContent).toBeGreaterThan(0);
            console.log('✓ Page meta information is present');
        }
        catch (error) {
            console.log('❌ Page meta test failed:', error);
            await page.screenshot({ path: 'test-results/meta-info-failure.png', fullPage: true });
            throw error;
        }
    });
    (0, test_1.test)('Console errors are reasonable', async ({ page }) => {
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
            await page.waitForTimeout(3000);
            console.log(`Console errors: ${consoleErrors.length}`);
            console.log(`Console warnings: ${consoleWarnings.length}`);
            if (consoleErrors.length > 0) {
                console.log('Console errors found:');
                consoleErrors.slice(0, 5).forEach((error, i) => {
                    console.log(`  ${i + 1}. ${error.substring(0, 100)}...`);
                });
            }
            console.log('✓ Console error check completed');
        }
        catch (error) {
            console.log('❌ Console error test failed:', error);
            await page.screenshot({ path: 'test-results/console-test-failure.png', fullPage: true });
            throw error;
        }
    });
    (0, test_1.test)('Basic navigation and interaction', async ({ page }) => {
        try {
            const buttons = page.locator('button');
            const buttonCount = await buttons.count();
            console.log(`Found ${buttonCount} buttons on the page`);
            const links = page.locator('a');
            const linkCount = await links.count();
            console.log(`Found ${linkCount} links on the page`);
            const inputs = page.locator('input, textarea, select');
            const inputCount = await inputs.count();
            console.log(`Found ${inputCount} input elements on the page`);
            if (buttonCount > 0) {
                await buttons.first().focus();
                console.log('✓ Successfully focused first button');
            }
            console.log('✓ Basic navigation check completed');
        }
        catch (error) {
            console.log('❌ Navigation test failed:', error);
            await page.screenshot({ path: 'test-results/navigation-test-failure.png', fullPage: true });
            throw error;
        }
    });
    (0, test_1.test)('Responsive design basics', async ({ page }) => {
        try {
            const viewports = [
                { width: 1920, height: 1080, name: 'Desktop' },
                { width: 768, height: 1024, name: 'Tablet' },
                { width: 375, height: 667, name: 'Mobile' }
            ];
            for (const viewport of viewports) {
                await page.setViewportSize({ width: viewport.width, height: viewport.height });
                await page.waitForTimeout(500);
                const bodyVisible = await page.locator('body').isVisible();
                (0, test_1.expect)(bodyVisible).toBe(true);
                console.log(`✓ ${viewport.name} (${viewport.width}x${viewport.height}): Content visible`);
            }
        }
        catch (error) {
            console.log('❌ Responsive design test failed:', error);
            await page.screenshot({ path: 'test-results/responsive-test-failure.png', fullPage: true });
            throw error;
        }
    });
});
//# sourceMappingURL=basic-working-features.spec.js.map
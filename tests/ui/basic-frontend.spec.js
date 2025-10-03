"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Employee Management System UI', () => {
    (0, test_1.test)('should load Employee Management System homepage', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('#root', { timeout: 10000 });
        await (0, test_1.expect)(page).toHaveTitle(/Employee Management System/);
        await (0, test_1.expect)(page.locator('h1')).toContainText('Employee Management System');
        await (0, test_1.expect)(page.locator('p')).toContainText('Manage your organization');
    });
    (0, test_1.test)('should display the employee management interface', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'employee-management-ui.png', fullPage: true });
        const appContent = page.locator('#root');
        await (0, test_1.expect)(appContent).toBeVisible();
        const content = await appContent.textContent();
        (0, test_1.expect)(content?.length || 0).toBeGreaterThan(50);
    });
    (0, test_1.test)('should connect to backend API successfully', async ({ page }) => {
        const healthResponse = await page.request.get('http://localhost:3001/health');
        (0, test_1.expect)(healthResponse.ok()).toBeTruthy();
        const healthData = await healthResponse.json();
        (0, test_1.expect)(healthData.status).toBe('healthy');
        const deptResponse = await page.request.get('http://localhost:3001/api/departments');
        (0, test_1.expect)(deptResponse.ok()).toBeTruthy();
        const departments = await deptResponse.json();
        (0, test_1.expect)(Array.isArray(departments)).toBeTruthy();
        (0, test_1.expect)(departments.length).toBe(10);
    });
    (0, test_1.test)('should handle basic navigation', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('#root');
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });
        await page.waitForTimeout(3000);
        (0, test_1.expect)(errors.length).toBeLessThan(10);
        console.log('Frontend loaded successfully with', errors.length, 'console errors');
        if (errors.length > 0) {
            console.log('Console errors:', errors);
        }
    });
});
//# sourceMappingURL=basic-frontend.spec.js.map
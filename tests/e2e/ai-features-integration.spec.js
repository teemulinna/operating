"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('AI Features Integration', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3003/');
    });
    (0, test_1.test)('should load AI Insights page without errors', async ({ page }) => {
        await page.goto('http://localhost:3003/ai-insights');
        await page.waitForTimeout(2000);
        await (0, test_1.expect)(page.locator('text=AI Insights & Predictions')).toBeVisible({ timeout: 10000 });
        await (0, test_1.expect)(page.locator('text=AI Insights')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Predictive Alerts')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Pattern Recognition')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Capacity Shortage Predicted')).toBeVisible();
    });
    (0, test_1.test)('should load Resource Optimizer page without errors', async ({ page }) => {
        await page.goto('/resource-optimizer');
        await page.waitForTimeout(2000);
        await (0, test_1.expect)(page.locator('text=Resource Optimization')).toBeVisible({ timeout: 10000 });
        await (0, test_1.expect)(page.locator('text=AI-Powered Suggestions')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Total Improvement')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Projected Utilization')).toBeVisible();
        await (0, test_1.expect)(page.locator('select').first()).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Filter:')).toBeVisible();
    });
    (0, test_1.test)('should load Resource Allocation Dashboard without errors', async ({ page }) => {
        await page.goto('/resource-allocation');
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');
        await (0, test_1.expect)(page.locator('text=Page Not Found')).not.toBeVisible();
        await (0, test_1.expect)(page.locator('text=Failed to load')).not.toBeVisible();
    });
    (0, test_1.test)('should load Analytics Dashboard without errors', async ({ page }) => {
        await page.goto('/analytics');
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');
        await (0, test_1.expect)(page.locator('text=Page Not Found')).not.toBeVisible();
        await (0, test_1.expect)(page.locator('text=Failed to load')).not.toBeVisible();
    });
    (0, test_1.test)('should load Scenario Planner without errors', async ({ page }) => {
        await page.goto('/scenarios');
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');
        await (0, test_1.expect)(page.locator('text=Page Not Found')).not.toBeVisible();
        await (0, test_1.expect)(page.locator('text=Failed to load')).not.toBeVisible();
    });
    (0, test_1.test)('should verify API connectivity', async ({ page }) => {
        const response = await page.request.get('http://localhost:3001/health');
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const healthData = await response.json();
        (0, test_1.expect)(healthData.status).toBe('healthy');
    });
    (0, test_1.test)('should verify employees API works', async ({ page }) => {
        const response = await page.request.get('http://localhost:3001/api/employees');
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const employeesData = await response.json();
        (0, test_1.expect)(Array.isArray(employeesData.data)).toBeTruthy();
    });
    (0, test_1.test)('should verify projects API works', async ({ page }) => {
        const response = await page.request.get('http://localhost:3001/api/projects');
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const projectsData = await response.json();
        (0, test_1.expect)(projectsData.success).toBeTruthy();
        (0, test_1.expect)(Array.isArray(projectsData.data)).toBeTruthy();
    });
    (0, test_1.test)('should handle navigation between AI features', async ({ page }) => {
        await page.goto('http://localhost:3003/ai-insights');
        await page.waitForTimeout(1000);
        await page.goto('/resource-optimizer');
        await page.waitForTimeout(1000);
        await page.goto('/analytics');
        await page.waitForTimeout(1000);
        await page.goto('/scenarios');
        await page.waitForTimeout(1000);
        (0, test_1.expect)(page.url()).toContain('/scenarios');
    });
    (0, test_1.test)('should load all routes without 404 errors', async ({ page }) => {
        const routes = [
            '/ai-insights',
            '/resource-optimizer',
            '/resource-calendar',
            '/capacity-chart',
            '/scenarios',
            '/project-planner',
            '/resource-allocation',
            '/analytics',
            '/executive-dashboard',
            '/utilization-report'
        ];
        for (const route of routes) {
            await page.goto(route);
            await page.waitForTimeout(2000);
            await (0, test_1.expect)(page.locator('text=Page Not Found')).not.toBeVisible();
            await (0, test_1.expect)(page.locator('text=Failed to load page')).not.toBeVisible();
        }
    });
});
test_1.test.describe('Data Flow Integration', () => {
    (0, test_1.test)('should demonstrate end-to-end data flow', async ({ page }) => {
        await page.goto('http://localhost:3003/employees');
        await page.waitForTimeout(2000);
        await page.goto('http://localhost:3003/ai-insights');
        await page.waitForTimeout(2000);
        await (0, test_1.expect)(page.locator('text=AI Insights & Predictions')).toBeVisible();
        await page.goto('/resource-optimizer');
        await page.waitForTimeout(2000);
        await (0, test_1.expect)(page.locator('text=Resource Optimization')).toBeVisible();
    });
});
//# sourceMappingURL=ai-features-integration.spec.js.map
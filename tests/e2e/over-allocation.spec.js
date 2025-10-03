"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const test_helpers_1 = require("../helpers/test-helpers");
test_1.test.describe('Over-allocation Protection UI', () => {
    test_1.test.beforeEach(async ({ page, testHelpers }) => {
        await testHelpers;
        await page.goto('/capacity/over-allocation');
    });
    (0, test_1.test)('should display over-allocation warnings', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        const warning = await testHelpers.waitForElement('[data-testid="over-allocation-warning"]');
        await (0, test_1.expect)(warning).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Over-allocation Protection')).toBeVisible();
        const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
        await (0, test_1.expect)(allocationItem).toBeVisible();
        await (0, test_1.expect)(allocationItem.locator('text=Alice Johnson')).toBeVisible();
        await (0, test_1.expect)(allocationItem.locator('text=Engineering')).toBeVisible();
    });
    (0, test_1.test)('should show capacity gauge with correct values', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
        await (0, test_1.expect)(allocationItem.locator('text=52h')).toBeVisible();
        await (0, test_1.expect)(allocationItem.locator('text=of 40h')).toBeVisible();
        await (0, test_1.expect)(allocationItem.locator('text=12h')).toBeVisible();
    });
    (0, test_1.test)('should display severity badges correctly', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
        const severityBadge = allocationItem.locator('text=danger');
        await (0, test_1.expect)(severityBadge).toBeVisible();
        const percentageBadge = allocationItem.locator('text=+30.0%');
        await (0, test_1.expect)(percentageBadge).toBeVisible();
    });
    (0, test_1.test)('should list all assigned projects', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
        await (0, test_1.expect)(allocationItem.locator('text=Active Projects:')).toBeVisible();
        await (0, test_1.expect)(allocationItem.locator('text=Mobile App Redesign')).toBeVisible();
        await (0, test_1.expect)(allocationItem.locator('text=Backend API Migration')).toBeVisible();
        await (0, test_1.expect)(allocationItem.locator('text=Code Review Tasks')).toBeVisible();
        await (0, test_1.expect)(allocationItem.locator('text=25h')).toBeVisible();
        await (0, test_1.expect)(allocationItem.locator('text=15h')).toBeVisible();
        await (0, test_1.expect)(allocationItem.locator('text=12h')).toBeVisible();
        await (0, test_1.expect)(allocationItem.locator('.bg-destructive').first()).toBeVisible();
    });
    (0, test_1.test)('should show summary statistics', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        await (0, test_1.expect)(page.locator('text=1')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Affected Employees')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=12.0h')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Avg Over-allocation')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Critical Cases')).toBeVisible();
    });
    (0, test_1.test)('should have action buttons', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
        await (0, test_1.expect)(allocationItem.locator('button:has-text("Resolve Conflict")')).toBeVisible();
        await (0, test_1.expect)(allocationItem.locator('button:has-text("View Details")')).toBeVisible();
        await (0, test_1.expect)(page.locator('button:has-text("Export Report")')).toBeVisible();
        await (0, test_1.expect)(page.locator('button:has-text("Auto-Resolve")')).toBeVisible();
        await (0, test_1.expect)(page.locator('button:has-text("Bulk Actions")')).toBeVisible();
    });
    (0, test_1.test)('should show alert message for over-allocations', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        const alert = page.locator('[role="alert"]').first();
        await (0, test_1.expect)(alert).toBeVisible();
        await (0, test_1.expect)(alert.locator('text=1 employee(s) are over-allocated')).toBeVisible();
        await (0, test_1.expect)(alert.locator('text=Consider redistributing tasks')).toBeVisible();
    });
    (0, test_1.test)('should display live indicator for real-time updates', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        const liveIndicator = page.locator('text=Live');
        await (0, test_1.expect)(liveIndicator).toBeVisible();
        const greenDot = page.locator('.bg-green-500').first();
        await (0, test_1.expect)(greenDot).toBeVisible();
    });
    (0, test_1.test)('should show no over-allocations state', async ({ page, testHelpers }) => {
        await testHelpers;
        await page.reload();
        await testHelpers.verifyLoading(false);
        const noOverAllocations = await testHelpers.waitForElement('[data-testid="no-over-allocations"]');
        await (0, test_1.expect)(noOverAllocations).toBeVisible();
        await (0, test_1.expect)(page.locator('text=All Clear!')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=No over-allocations detected')).toBeVisible();
        const shieldIcon = page.locator('.text-green-500').first();
        await (0, test_1.expect)(shieldIcon).toBeVisible();
    });
    (0, test_1.test)('should be responsive on mobile devices', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        await page.setViewportSize(test_helpers_1.VIEWPORTS.MOBILE);
        const warning = await testHelpers.waitForElement('[data-testid="over-allocation-warning"]');
        await (0, test_1.expect)(warning).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Alice Johnson')).toBeVisible();
        await page.screenshot({ path: 'test-results/over-allocation-mobile.png' });
    });
    (0, test_1.test)('should handle capacity gauge animations', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
        const gauge = allocationItem.locator('svg').first();
        await (0, test_1.expect)(gauge).toBeVisible();
        await testHelpers.waitForAnimation('[data-testid="over-allocation-1"] svg path');
    });
    (0, test_1.test)('should show real-time toast notifications', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        await page.waitForTimeout(6000);
        const toastExists = await page.locator('[data-testid="toast-destructive"]').count();
        if (toastExists > 0) {
            await (0, test_1.expect)(page.locator('text=New Over-allocation Detected')).toBeVisible();
        }
    });
    (0, test_1.test)('should have accessibility features', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        await testHelpers.testKeyboardNavigation();
        await testHelpers.testAccessibility();
        const gauge = page.locator('svg').first();
        const hasAriaLabel = await gauge.getAttribute('aria-label');
        const hasTitle = await gauge.getAttribute('title');
        (0, test_1.expect)(hasAriaLabel || hasTitle).toBeTruthy();
    });
    (0, test_1.test)('should handle different severity levels', async ({ page, testHelpers }) => {
        await testHelpers;
        await page.reload();
        await testHelpers.verifyLoading(false);
        const warningItem = page.locator('[data-testid="over-allocation-1"]');
        await (0, test_1.expect)(warningItem).toHaveClass(/bg-yellow-50/);
        const criticalItem = page.locator('[data-testid="over-allocation-2"]');
        await (0, test_1.expect)(criticalItem).toHaveClass(/bg-red-50/);
    });
    (0, test_1.test)('should handle loading and error states', async ({ page, testHelpers }) => {
        await page.goto('/capacity/over-allocation');
        const loader = page.locator('[data-testid="loading-spinner"]');
        await (0, test_1.expect)(loader).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Checking for over-allocations...')).toBeVisible();
        await testHelpers.verifyLoading(false);
        await testHelpers;
        await page.reload();
    });
    test_1.test.describe('Interactive Features', () => {
        (0, test_1.test)('should handle button clicks', async ({ page, testHelpers }) => {
            await testHelpers.verifyLoading(false);
            const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
            const resolveButton = allocationItem.locator('button:has-text("Resolve Conflict")');
            await resolveButton.click();
            const detailsButton = allocationItem.locator('button:has-text("View Details")');
            await detailsButton.click();
            const exportButton = page.locator('button:has-text("Export Report")');
            await exportButton.click();
        });
    });
});
//# sourceMappingURL=over-allocation.spec.js.map
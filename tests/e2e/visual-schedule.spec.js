"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const test_helpers_1 = require("../helpers/test-helpers");
test_1.test.describe('Visual Schedule Management', () => {
    test_1.test.beforeEach(async ({ page, testHelpers }) => {
        await testHelpers;
        await testHelpers;
        await testHelpers.toISOString(),
            task;
        'Component Development',
            priority;
        'high',
            color;
        '#ff6b6b';
    });
});
await page.goto('/schedule');
;
(0, test_1.test)('should display weekly schedule grid', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    const schedule = await testHelpers.waitForElement('[data-testid="visual-schedule"]');
    await (0, test_1.expect)(schedule).toBeVisible();
    for (let i = 0; i < 7; i++) {
        const day = await testHelpers.waitForElement(`[data-testid="schedule-day-${i}"]`);
        await (0, test_1.expect)(day).toBeVisible();
    }
    await (0, test_1.expect)(page.locator('[data-testid="prev-week-btn"]')).toBeVisible();
    await (0, test_1.expect)(page.locator('[data-testid="next-week-btn"]')).toBeVisible();
});
(0, test_1.test)('should support drag and drop functionality', async ({ page, testHelpers }) => {
    const scheduleItem = await testHelpers.waitForElement('[data-testid="schedule-item-1"]');
    const sourceDay = page.locator('[data-testid="schedule-day-0"]');
    const targetDay = page.locator('[data-testid="schedule-day-1"]');
    await (0, test_1.expect)(sourceDay.locator('[data-testid="schedule-item-1"]')).toBeVisible();
    await testHelpers.dragAndDrop('[data-testid="schedule-item-1"]', '[data-testid="schedule-day-1"]');
    await testHelpers.verifyToast('Schedule Updated', 'success');
    await (0, test_1.expect)(targetDay.locator('[data-testid="schedule-item-1"]')).toBeVisible();
});
(0, test_1.test)('should filter by priority levels', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    await testHelpers.clickAndWait('button:has-text("High")');
    await (0, test_1.expect)(page.locator('button:has-text("High")')).toHaveClass(/bg-red-100/);
    await testHelpers.clickAndWait('button:has-text("Medium")');
    await (0, test_1.expect)(page.locator('button:has-text("Medium")')).toHaveClass(/bg-yellow-100/);
    await testHelpers.clickAndWait('button:has-text("Low")');
    await (0, test_1.expect)(page.locator('button:has-text("Low")')).toHaveClass(/bg-green-100/);
    await testHelpers.clickAndWait('button:has-text("All")');
    await (0, test_1.expect)(page.locator('button:has-text("All")')).toHaveClass(/bg-blue-100/);
});
(0, test_1.test)('should navigate between weeks', async ({ page, testHelpers }) => {
    const weekHeader = page.locator('h3').filter({ hasText: /Week of/ });
    const currentWeek = await weekHeader.textContent();
    await testHelpers.clickAndWait('[data-testid="next-week-btn"]');
    const nextWeek = await weekHeader.textContent();
    (0, test_1.expect)(nextWeek).not.toBe(currentWeek);
    await testHelpers.clickAndWait('[data-testid="prev-week-btn"]');
    const backToOriginal = await weekHeader.textContent();
    (0, test_1.expect)(backToOriginal).toBe(currentWeek);
});
(0, test_1.test)('should display task details correctly', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    const scheduleItem = await testHelpers.waitForElement('[data-testid="schedule-item-1"]');
    await (0, test_1.expect)(scheduleItem.locator('text=Alice Johnson')).toBeVisible();
    await (0, test_1.expect)(scheduleItem.locator('text=Mobile App Redesign')).toBeVisible();
    await (0, test_1.expect)(scheduleItem.locator('text=Component Development')).toBeVisible();
    await (0, test_1.expect)(scheduleItem.locator('text=8h')).toBeVisible();
});
(0, test_1.test)('should highlight current day', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    const currentDay = page.locator('.border-blue-400').first();
    await (0, test_1.expect)(currentDay).toBeVisible();
    const currentDayText = currentDay.locator('.text-blue-600').first();
    await (0, test_1.expect)(currentDayText).toBeVisible();
});
(0, test_1.test)('should show empty state for days with no tasks', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    const emptyDay = page.locator('text=No tasks scheduled').first();
    await (0, test_1.expect)(emptyDay).toBeVisible();
    const clockIcon = page.locator('[data-testid="schedule-day-6"] .lucide-clock').first();
    await (0, test_1.expect)(clockIcon).toBeVisible();
});
(0, test_1.test)('should be responsive across different screen sizes', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    await testHelpers.testResponsiveDesign([
        test_helpers_1.VIEWPORTS.MOBILE,
        test_helpers_1.VIEWPORTS.TABLET,
        test_helpers_1.VIEWPORTS.DESKTOP
    ]);
    await page.setViewportSize(test_helpers_1.VIEWPORTS.MOBILE);
    const schedule = await testHelpers.waitForElement('[data-testid="visual-schedule"]');
    await (0, test_1.expect)(schedule).toBeVisible();
});
(0, test_1.test)('should support keyboard navigation', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    await testHelpers.testKeyboardNavigation();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    const weekHeader = page.locator('h3').filter({ hasText: /Week of/ });
    await (0, test_1.expect)(weekHeader).toBeVisible();
});
(0, test_1.test)('should have accessible labels and ARIA attributes', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    await testHelpers.testAccessibility();
    const schedule = await testHelpers.waitForElement('[data-testid="visual-schedule"]');
    const hasAriaLabel = await schedule.getAttribute('aria-label');
    (0, test_1.expect)(hasAriaLabel || await schedule.getAttribute('role')).toBeTruthy();
});
(0, test_1.test)('should export schedule data', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    const exportBtn = page.locator('button:has-text("Export")');
    await (0, test_1.expect)(exportBtn).toBeVisible();
    await testHelpers;
    await exportBtn.click();
    await testHelpers.waitForApiResponse('**/api/export/schedule');
});
(0, test_1.test)('should show loading state initially', async ({ page }) => {
    await page.goto('/schedule');
    const loader = page.locator('[data-testid="loading-spinner"]');
    await (0, test_1.expect)(loader).toBeVisible();
    await (0, test_1.expect)(page.locator('text=Loading schedule...')).toBeVisible();
});
(0, test_1.test)('should handle drag and drop with smooth animations', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    const scheduleItem = await testHelpers.waitForElement('[data-testid="schedule-item-1"]');
    await testHelpers.waitForAnimation('[data-testid="schedule-item-1"]');
    await scheduleItem.hover();
    await (0, test_1.expect)(scheduleItem).toHaveCSS('cursor', 'grab');
    await scheduleItem.dragTo(page.locator('[data-testid="schedule-day-2"]'));
    await testHelpers.waitForAnimation('[data-testid="schedule-item-1"]');
});
test_1.test.describe('Priority Color Coding', () => {
    (0, test_1.test)('should display correct colors for different priorities', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        const highPriorityItem = page.locator('[data-testid="schedule-item-1"]');
        await (0, test_1.expect)(highPriorityItem).toHaveClass(/border-red-300/);
        await (0, test_1.expect)(page.locator('text=High Priority').first()).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Medium Priority').first()).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Low Priority').first()).toBeVisible();
    });
});
test_1.test.describe('Real-time Updates', () => {
    (0, test_1.test)('should handle WebSocket updates', async ({ page, testHelpers }) => {
        await testHelpers.verifyLoading(false);
        await testHelpers.waitForWebSocket();
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('schedule-update', {
                detail: {
                    type: 'TASK_MOVED',
                    taskId: '1',
                    newDate: new Date().toISOString()
                }
            }));
        });
        await (0, test_1.expect)(page.locator('[data-testid="schedule-item-1"]')).toBeVisible();
    });
});
;
//# sourceMappingURL=visual-schedule.spec.js.map
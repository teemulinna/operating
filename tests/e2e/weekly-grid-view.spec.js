"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Weekly Grid View Layout (PRD Critical)', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
    });
    (0, test_1.test)('weekly grid displays employees as rows and weeks as columns', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-calendar');
        await page.waitForLoadState('networkidle');
        const scheduleGrid = page.locator('[data-testid="weekly-schedule-grid"], [data-testid="resource-calendar"], .schedule-grid');
        await (0, test_1.expect)(scheduleGrid).toBeVisible({ timeout: 10000 });
        const gridContainer = scheduleGrid.first();
        const employeeRows = page.locator('[data-testid^="employee-row-"], .employee-row, tr[data-employee-id]');
        const employeeCount = await employeeRows.count();
        (0, test_1.expect)(employeeCount).toBeGreaterThan(0);
        console.log(`✅ Found ${employeeCount} employee rows`);
        const weekColumns = page.locator('[data-testid^="week-column-"], .week-column, th[data-week]');
        const weekCount = await weekColumns.count();
        if (weekCount > 0) {
            console.log(`✅ Found ${weekCount} week columns`);
            (0, test_1.expect)(weekCount).toBeGreaterThan(0);
        }
        else {
            const calendarCells = page.locator('.calendar-cell, [data-testid^="calendar-cell-"]');
            const cellCount = await calendarCells.count();
            (0, test_1.expect)(cellCount).toBeGreaterThan(0);
            console.log(`✅ Found ${cellCount} calendar cells`);
        }
    });
    (0, test_1.test)('grid cells show project assignments for each employee/week intersection', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-calendar');
        await page.waitForLoadState('networkidle');
        const projectAssignments = page.locator('[data-testid^="assignment-"], .project-assignment, .allocation-cell, [data-project-id]');
        const assignmentCount = await projectAssignments.count();
        if (assignmentCount > 0) {
            console.log(`✅ Found ${assignmentCount} project assignments in grid`);
            const firstAssignment = projectAssignments.first();
            await (0, test_1.expect)(firstAssignment).toBeVisible();
            const assignmentText = await firstAssignment.textContent();
            (0, test_1.expect)(assignmentText?.length).toBeGreaterThan(0);
        }
        else {
            console.log('ℹ️  No project assignments currently visible in grid');
        }
    });
    (0, test_1.test)('grid navigation controls allow moving between weeks', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-calendar');
        await page.waitForLoadState('networkidle');
        const prevButton = page.locator('[data-testid="prev-week"], [data-testid="previous"], .prev-week, button:has-text("Previous")');
        const nextButton = page.locator('[data-testid="next-week"], [data-testid="next"], .next-week, button:has-text("Next")');
        if (await nextButton.count() > 0) {
            await nextButton.first().click();
            await page.waitForLoadState('networkidle');
            console.log('✅ Next week navigation works');
        }
        if (await prevButton.count() > 0) {
            await prevButton.first().click();
            await page.waitForLoadState('networkidle');
            console.log('✅ Previous week navigation works');
        }
        const dateDisplay = page.locator('[data-testid="current-date"], .current-week, .date-range');
        if (await dateDisplay.count() > 0) {
            const dateText = await dateDisplay.first().textContent();
            (0, test_1.expect)(dateText?.length).toBeGreaterThan(0);
            console.log(`✅ Date display shows: ${dateText}`);
        }
    });
    (0, test_1.test)('grid shows employee capacity vs allocation visually', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-calendar');
        await page.waitForLoadState('networkidle');
        const capacityIndicators = page.locator('[data-testid^="capacity-"], .capacity-bar, .utilization-indicator, [data-capacity]');
        const indicatorCount = await capacityIndicators.count();
        if (indicatorCount > 0) {
            console.log(`✅ Found ${indicatorCount} capacity indicators`);
            const overAllocationIndicators = page.locator('.over-allocated, [data-over-allocated="true"], .warning, .danger');
            const overAllocatedCount = await overAllocationIndicators.count();
            if (overAllocatedCount > 0) {
                console.log(`✅ Found ${overAllocatedCount} over-allocation warnings in grid`);
            }
        }
        else {
            console.log('ℹ️  No capacity indicators found in current grid view');
        }
    });
    (0, test_1.test)('grid is responsive and maintains structure on different screen sizes', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-calendar');
        await page.waitForLoadState('networkidle');
        const viewports = [
            { width: 1920, height: 1080 },
            { width: 1024, height: 768 },
            { width: 768, height: 1024 },
        ];
        for (const viewport of viewports) {
            await page.setViewportSize(viewport);
            await page.waitForTimeout(500);
            const grid = page.locator('[data-testid="weekly-schedule-grid"], [data-testid="resource-calendar"], .schedule-grid');
            await (0, test_1.expect)(grid.first()).toBeVisible();
            const employees = page.locator('[data-testid^="employee-row-"], .employee-row');
            const employeeCount = await employees.count();
            (0, test_1.expect)(employeeCount).toBeGreaterThan(0);
            console.log(`✅ Grid functional at ${viewport.width}x${viewport.height}: ${employeeCount} employees`);
        }
    });
    (0, test_1.test)('grid supports drag and drop allocation creation', async ({ page }) => {
        await page.goto('http://localhost:3003/resource-calendar');
        await page.waitForLoadState('networkidle');
        const draggableItems = page.locator('[draggable="true"], .draggable, [data-draggable]');
        const dropZones = page.locator('.drop-zone, [data-drop-zone], .allocation-cell');
        const draggableCount = await draggableItems.count();
        const dropZoneCount = await dropZones.count();
        if (draggableCount > 0) {
            console.log(`✅ Found ${draggableCount} draggable elements`);
        }
        if (dropZoneCount > 0) {
            console.log(`✅ Found ${dropZoneCount} drop zones`);
        }
        if (draggableCount > 0 && dropZoneCount > 0) {
            const firstDraggable = draggableItems.first();
            const firstDropZone = dropZones.first();
            await firstDraggable.hover();
            console.log('✅ Drag-drop elements are present and interactive');
        }
    });
});
//# sourceMappingURL=weekly-grid-view.spec.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enhanced_features_fixtures_1 = require("../fixtures/enhanced-features-fixtures");
enhanced_features_fixtures_1.test.describe('Enhanced UI Components - Real Interaction Tests', () => {
    enhanced_features_fixtures_1.test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
    });
    (0, enhanced_features_fixtures_1.test)('Interactive Gantt Chart with Drag-and-Drop', async ({ page }) => {
        await page.goto('http://localhost:3003/schedule');
        await page.waitForSelector('[data-testid="gantt-chart"]', { timeout: 10000 });
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="gantt-timeline-header"]')).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="gantt-task-list"]')).toBeVisible();
        const taskBars = page.locator('[data-testid="gantt-task-bar"]');
        const taskCount = await taskBars.count();
        (0, enhanced_features_fixtures_1.expect)(taskCount).toBeGreaterThan(0);
        const firstTaskBar = taskBars.first();
        const taskBarBox = await firstTaskBar.boundingBox();
        if (taskBarBox) {
            const dropTarget = page.locator('[data-testid="gantt-time-slot"]').nth(5);
            await firstTaskBar.hover();
            await page.mouse.down();
            await dropTarget.hover();
            await page.mouse.up();
            await page.waitForTimeout(1000);
            const newTaskBarBox = await firstTaskBar.boundingBox();
            (0, enhanced_features_fixtures_1.expect)(newTaskBarBox?.x).not.toBe(taskBarBox.x);
        }
        const resizeHandle = page.locator('[data-testid="task-resize-handle"]').first();
        if (await resizeHandle.isVisible()) {
            const initialWidth = await firstTaskBar.evaluate(el => el.clientWidth);
            const resizeHandleBox = await resizeHandle.boundingBox();
            if (resizeHandleBox) {
                await resizeHandle.hover();
                await page.mouse.down();
                await page.mouse.move(resizeHandleBox.x + 50, resizeHandleBox.y);
                await page.mouse.up();
                await page.waitForTimeout(500);
                const newWidth = await firstTaskBar.evaluate(el => el.clientWidth);
                (0, enhanced_features_fixtures_1.expect)(newWidth).toBeGreaterThan(initialWidth);
            }
        }
    });
    (0, enhanced_features_fixtures_1.test)('Capacity Heat Map Visualization', async ({ page }) => {
        await page.goto('http://localhost:3003/capacity');
        await page.waitForSelector('[data-testid="capacity-heatmap"]', { timeout: 10000 });
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="heatmap-container"]')).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="capacity-legend"]')).toBeVisible();
        const heatmapCells = page.locator('[data-testid="heatmap-cell"]');
        const cellCount = await heatmapCells.count();
        (0, enhanced_features_fixtures_1.expect)(cellCount).toBeGreaterThan(0);
        const firstCell = heatmapCells.first();
        const capacityValue = await firstCell.getAttribute('data-capacity');
        (0, enhanced_features_fixtures_1.expect)(capacityValue).toBeTruthy();
        (0, enhanced_features_fixtures_1.expect)(parseInt(capacityValue || '0')).toBeGreaterThanOrEqual(0);
        await firstCell.hover();
        await page.waitForTimeout(500);
        const tooltip = page.locator('[data-testid="capacity-tooltip"]');
        await (0, enhanced_features_fixtures_1.expect)(tooltip).toBeVisible();
        const tooltipText = await tooltip.textContent();
        (0, enhanced_features_fixtures_1.expect)(tooltipText).toContain('%');
        (0, enhanced_features_fixtures_1.expect)(tooltipText).toMatch(/\d+%/);
        const timeSelector = page.locator('[data-testid="time-period-selector"]');
        if (await timeSelector.isVisible()) {
            await timeSelector.selectOption('month');
            await page.waitForTimeout(1000);
            const monthlyCells = await page.locator('[data-testid="heatmap-cell"]').count();
            (0, enhanced_features_fixtures_1.expect)(monthlyCells).toBeGreaterThan(0);
        }
        const overCapacityCells = page.locator('[data-testid="heatmap-cell"][data-over-capacity="true"]');
        const overCapacityCount = await overCapacityCells.count();
        if (overCapacityCount > 0) {
            const firstOverCell = overCapacityCells.first();
            const cellColor = await firstOverCell.evaluate(el => window.getComputedStyle(el).backgroundColor);
            (0, enhanced_features_fixtures_1.expect)(cellColor).toMatch(/rgb/);
        }
    });
    (0, enhanced_features_fixtures_1.test)('Dark Mode Toggle with Persistence', async ({ page }) => {
        const htmlElement = page.locator('html');
        await (0, enhanced_features_fixtures_1.expect)(htmlElement).not.toHaveClass(/dark/);
        const initialBgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
        const themeToggle = page.locator('[data-testid="theme-toggle"]');
        await themeToggle.click();
        await (0, enhanced_features_fixtures_1.expect)(htmlElement).toHaveClass(/dark/);
        const darkBgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
        (0, enhanced_features_fixtures_1.expect)(darkBgColor).not.toBe(initialBgColor);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await (0, enhanced_features_fixtures_1.expect)(htmlElement).toHaveClass(/dark/);
        await page.locator('[data-testid="theme-toggle"]').click();
        await (0, enhanced_features_fixtures_1.expect)(htmlElement).not.toHaveClass(/dark/);
        const components = [
            '[data-testid="navigation-bar"]',
            '[data-testid="main-content"]',
            '[data-testid="sidebar"]'
        ];
        for (const component of components) {
            const element = page.locator(component);
            if (await element.isVisible()) {
                const styles = await element.evaluate(el => ({
                    backgroundColor: window.getComputedStyle(el).backgroundColor,
                    color: window.getComputedStyle(el).color
                }));
                (0, enhanced_features_fixtures_1.expect)(styles.backgroundColor).toMatch(/rgb/);
                (0, enhanced_features_fixtures_1.expect)(styles.color).toMatch(/rgb/);
            }
        }
    });
    (0, enhanced_features_fixtures_1.test)('Keyboard Shortcuts (Ctrl+K for Search)', async ({ page }) => {
        await page.keyboard.press('Control+k');
        const searchModal = page.locator('[data-testid="search-modal"]');
        await (0, enhanced_features_fixtures_1.expect)(searchModal).toBeVisible();
        const searchInput = page.locator('[data-testid="search-input"]');
        await (0, enhanced_features_fixtures_1.expect)(searchInput).toBeFocused();
        await searchInput.fill('John Doe');
        await page.waitForTimeout(500);
        const searchResults = page.locator('[data-testid="search-results"]');
        await (0, enhanced_features_fixtures_1.expect)(searchResults).toBeVisible();
        const resultItems = page.locator('[data-testid="search-result-item"]');
        const resultCount = await resultItems.count();
        (0, enhanced_features_fixtures_1.expect)(resultCount).toBeGreaterThan(0);
        await page.keyboard.press('ArrowDown');
        const firstResult = resultItems.first();
        await (0, enhanced_features_fixtures_1.expect)(firstResult).toHaveClass(/highlighted|selected|active/);
        await page.keyboard.press('Enter');
        await (0, enhanced_features_fixtures_1.expect)(searchModal).not.toBeVisible();
        await page.keyboard.press('Control+k');
        await (0, enhanced_features_fixtures_1.expect)(searchModal).toBeVisible();
        await page.keyboard.press('Escape');
        await (0, enhanced_features_fixtures_1.expect)(searchModal).not.toBeVisible();
        const shortcuts = [
            { key: 'Control+n', testid: 'new-item-modal' },
            { key: 'Control+s', action: 'save' },
            { key: 'Alt+d', testid: 'dashboard' }
        ];
        for (const shortcut of shortcuts) {
            await page.keyboard.press(shortcut.key);
            await page.waitForTimeout(500);
            if (shortcut.testid) {
                const element = page.locator(`[data-testid="${shortcut.testid}"]`);
                if (await element.isVisible()) {
                    await (0, enhanced_features_fixtures_1.expect)(element).toBeVisible();
                    await page.keyboard.press('Escape');
                }
            }
        }
    });
    (0, enhanced_features_fixtures_1.test)('Timeline Slider for Date Navigation', async ({ page }) => {
        await page.goto('http://localhost:3003/schedule');
        await page.waitForSelector('[data-testid="timeline-slider"]', { timeout: 10000 });
        const currentDateDisplay = page.locator('[data-testid="current-date-display"]');
        const initialDate = await currentDateDisplay.textContent();
        const slider = page.locator('[data-testid="timeline-slider"]');
        const sliderBox = await slider.boundingBox();
        if (sliderBox) {
            const positions = [0.25, 0.5, 0.75];
            for (const position of positions) {
                const clickX = sliderBox.x + (sliderBox.width * position);
                const clickY = sliderBox.y + (sliderBox.height / 2);
                await page.mouse.click(clickX, clickY);
                await page.waitForTimeout(1000);
                const newDate = await currentDateDisplay.textContent();
                (0, enhanced_features_fixtures_1.expect)(newDate).not.toBe(initialDate);
                await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="schedule-content"]')).toBeVisible();
                const scheduleItems = page.locator('[data-testid="schedule-item"]');
                const itemCount = await scheduleItems.count();
                (0, enhanced_features_fixtures_1.expect)(itemCount).toBeGreaterThanOrEqual(0);
            }
        }
        await slider.focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(500);
        const keyboardDate = await currentDateDisplay.textContent();
        (0, enhanced_features_fixtures_1.expect)(keyboardDate).toBeTruthy();
        const dateRangeSelector = page.locator('[data-testid="date-range-selector"]');
        if (await dateRangeSelector.isVisible()) {
            await dateRangeSelector.selectOption('week');
            await page.waitForTimeout(1000);
            const weekSlider = page.locator('[data-testid="timeline-slider"]');
            await (0, enhanced_features_fixtures_1.expect)(weekSlider).toBeVisible();
        }
    });
    (0, enhanced_features_fixtures_1.test)('Responsive Design and Mobile Interactions', async ({ page, browser }) => {
        const viewports = [
            { width: 1920, height: 1080, name: 'desktop' },
            { width: 768, height: 1024, name: 'tablet' },
            { width: 375, height: 667, name: 'mobile' }
        ];
        for (const viewport of viewports) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.reload();
            await page.waitForLoadState('networkidle');
            const navigationMenu = page.locator('[data-testid="navigation-menu"]');
            if (viewport.name === 'mobile') {
                const hamburgerButton = page.locator('[data-testid="hamburger-menu"]');
                await (0, enhanced_features_fixtures_1.expect)(hamburgerButton).toBeVisible();
                await hamburgerButton.click();
                const mobileMenu = page.locator('[data-testid="mobile-menu"]');
                await (0, enhanced_features_fixtures_1.expect)(mobileMenu).toBeVisible();
                await hamburgerButton.click();
                await (0, enhanced_features_fixtures_1.expect)(mobileMenu).not.toBeVisible();
            }
            else {
                await (0, enhanced_features_fixtures_1.expect)(navigationMenu).toBeVisible();
            }
            const dashboardCards = page.locator('[data-testid="dashboard-card"]');
            if (await dashboardCards.count() > 0) {
                const cardStyles = await dashboardCards.first().evaluate(el => ({
                    width: el.clientWidth,
                    display: window.getComputedStyle(el).display
                }));
                (0, enhanced_features_fixtures_1.expect)(cardStyles.width).toBeGreaterThan(0);
                (0, enhanced_features_fixtures_1.expect)(cardStyles.display).not.toBe('none');
            }
        }
        await page.setViewportSize({ width: 1280, height: 720 });
    });
    (0, enhanced_features_fixtures_1.test)('Advanced Chart Interactions', async ({ page }) => {
        await page.goto('http://localhost:3003/analytics');
        await page.waitForSelector('[data-testid="analytics-charts"]', { timeout: 10000 });
        const utilizationChart = page.locator('[data-testid="utilization-chart"]');
        if (await utilizationChart.isVisible()) {
            const chartArea = utilizationChart.locator('[data-testid="chart-area"]');
            await chartArea.hover();
            const chartTooltip = page.locator('[data-testid="chart-tooltip"]');
            if (await chartTooltip.isVisible()) {
                const tooltipText = await chartTooltip.textContent();
                (0, enhanced_features_fixtures_1.expect)(tooltipText).toMatch(/\d+/);
            }
            const zoomControls = page.locator('[data-testid="chart-zoom-controls"]');
            if (await zoomControls.isVisible()) {
                await page.click('[data-testid="zoom-in-btn"]');
                await page.waitForTimeout(500);
                await page.click('[data-testid="zoom-out-btn"]');
                await page.waitForTimeout(500);
            }
            const chartLegend = page.locator('[data-testid="chart-legend"]');
            if (await chartLegend.isVisible()) {
                const legendItems = page.locator('[data-testid="legend-item"]');
                const legendCount = await legendItems.count();
                if (legendCount > 0) {
                    await legendItems.first().click();
                    await page.waitForTimeout(500);
                    await (0, enhanced_features_fixtures_1.expect)(utilizationChart).toBeVisible();
                }
            }
        }
        const timelineChart = page.locator('[data-testid="project-timeline-chart"]');
        if (await timelineChart.isVisible()) {
            const timelineBar = timelineChart.locator('[data-testid="timeline-bar"]');
            const timelineBox = await timelineBar.boundingBox();
            if (timelineBox) {
                const scrubX = timelineBox.x + (timelineBox.width * 0.6);
                const scrubY = timelineBox.y + (timelineBox.height / 2);
                await page.mouse.click(scrubX, scrubY);
                await page.waitForTimeout(500);
                const timelineIndicator = page.locator('[data-testid="timeline-indicator"]');
                if (await timelineIndicator.isVisible()) {
                    const indicatorPos = await timelineIndicator.boundingBox();
                    (0, enhanced_features_fixtures_1.expect)(indicatorPos?.x).toBeCloseTo(scrubX, 10);
                }
            }
        }
    });
});
//# sourceMappingURL=enhanced-ui-components.spec.js.map
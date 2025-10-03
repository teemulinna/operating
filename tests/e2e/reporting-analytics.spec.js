"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enhanced_features_fixtures_1 = require("../fixtures/enhanced-features-fixtures");
enhanced_features_fixtures_1.test.describe('Reporting & Analytics - Real Data Tests', () => {
    enhanced_features_fixtures_1.test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
    });
    (0, enhanced_features_fixtures_1.test)('Executive Dashboard - Real KPIs with Live Data', async ({ page, dashboardHelper }) => {
        await page.goto('http://localhost:3003/dashboard');
        await dashboardHelper.waitForDashboardLoad();
        const totalEmployees = await dashboardHelper.getKPIValue('total-employees');
        (0, enhanced_features_fixtures_1.expect)(parseInt(totalEmployees)).toBeGreaterThan(0);
        const activeProjects = await dashboardHelper.getKPIValue('active-projects');
        (0, enhanced_features_fixtures_1.expect)(parseInt(activeProjects)).toBeGreaterThanOrEqual(0);
        const utilization = await dashboardHelper.getKPIValue('utilization');
        const utilizationValue = parseInt(utilization.replace('%', ''));
        (0, enhanced_features_fixtures_1.expect)(utilizationValue).toBeGreaterThanOrEqual(0);
        (0, enhanced_features_fixtures_1.expect)(utilizationValue).toBeLessThanOrEqual(100);
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="utilization-trend-chart"]')).toBeVisible();
        const chartDataPoints = await page.locator('[data-testid="chart-data-point"]').count();
        (0, enhanced_features_fixtures_1.expect)(chartDataPoints).toBeGreaterThan(0);
    });
    (0, enhanced_features_fixtures_1.test)('Generate Employee Utilization Report', async ({ page, testData }) => {
        await page.goto('http://localhost:3003/reports');
        await page.selectOption('[data-testid="report-type-select"]', 'utilization');
        await page.fill('[data-testid="date-from"]', '2024-01-01');
        await page.fill('[data-testid="date-to"]', '2024-12-31');
        await page.click('[data-testid="generate-report-btn"]');
        await page.waitForSelector('[data-testid="report-table"]', { timeout: 10000 });
        const reportRows = await page.locator('[data-testid="report-row"]').count();
        (0, enhanced_features_fixtures_1.expect)(reportRows).toBeGreaterThanOrEqual(testData.employees.length);
        const headers = ['Employee', 'Total Allocation', 'Utilization %', 'Available Hours'];
        for (const header of headers) {
            await (0, enhanced_features_fixtures_1.expect)(page.locator(`th:has-text("${header}")`)).toBeVisible();
        }
        const utilizationCells = page.locator('[data-testid="utilization-percentage"]');
        const count = await utilizationCells.count();
        for (let i = 0; i < count; i++) {
            const utilization = await utilizationCells.nth(i).textContent();
            const value = parseInt(utilization?.replace('%', '') || '0');
            (0, enhanced_features_fixtures_1.expect)(value).toBeGreaterThanOrEqual(0);
            (0, enhanced_features_fixtures_1.expect)(value).toBeLessThanOrEqual(200);
        }
    });
    (0, enhanced_features_fixtures_1.test)('Export Reports as CSV and PDF', async ({ page, dashboardHelper }) => {
        await page.goto('http://localhost:3003/reports');
        await page.selectOption('[data-testid="report-type-select"]', 'utilization');
        await page.click('[data-testid="generate-report-btn"]');
        await page.waitForSelector('[data-testid="report-table"]');
        const csvDownload = await dashboardHelper.exportReport('csv');
        (0, enhanced_features_fixtures_1.expect)(csvDownload.suggestedFilename()).toMatch(/utilization.*\.csv$/);
        const csvPath = await csvDownload.path();
        (0, enhanced_features_fixtures_1.expect)(csvPath).toBeTruthy();
        const pdfDownload = await dashboardHelper.exportReport('pdf');
        (0, enhanced_features_fixtures_1.expect)(pdfDownload.suggestedFilename()).toMatch(/utilization.*\.pdf$/);
        const pdfPath = await pdfDownload.path();
        (0, enhanced_features_fixtures_1.expect)(pdfPath).toBeTruthy();
    });
    (0, enhanced_features_fixtures_1.test)('Project Burn-down Charts with Real Timeline Data', async ({ page }) => {
        await page.goto('http://localhost:3003/projects');
        const projectCards = page.locator('[data-testid="project-card"]');
        await (0, enhanced_features_fixtures_1.expect)(projectCards).toHaveCountGreaterThan(0);
        await projectCards.first().click();
        await page.click('[data-testid="project-analytics-tab"]');
        await page.waitForSelector('[data-testid="burndown-chart"]', { timeout: 10000 });
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="planned-progress-line"]')).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="actual-progress-line"]')).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="chart-x-axis"]')).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="chart-y-axis"]')).toBeVisible();
        const chartPoints = await page.locator('[data-testid="progress-point"]').count();
        (0, enhanced_features_fixtures_1.expect)(chartPoints).toBeGreaterThan(0);
        const firstPoint = page.locator('[data-testid="progress-point"]').first();
        await firstPoint.hover();
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
    });
    (0, enhanced_features_fixtures_1.test)('Capacity Analytics with Heat Map', async ({ page }) => {
        await page.goto('http://localhost:3003/capacity');
        await page.waitForSelector('[data-testid="capacity-heatmap"]', { timeout: 10000 });
        const heatmapGrid = page.locator('[data-testid="heatmap-grid"]');
        await (0, enhanced_features_fixtures_1.expect)(heatmapGrid).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="capacity-legend"]')).toBeVisible();
        const cells = page.locator('[data-testid="capacity-cell"]');
        const cellCount = await cells.count();
        (0, enhanced_features_fixtures_1.expect)(cellCount).toBeGreaterThan(0);
        const firstCell = cells.first();
        await firstCell.hover();
        const tooltip = page.locator('[data-testid="capacity-tooltip"]');
        await (0, enhanced_features_fixtures_1.expect)(tooltip).toBeVisible();
        const tooltipText = await tooltip.textContent();
        (0, enhanced_features_fixtures_1.expect)(tooltipText).toMatch(/\d+%/);
        await page.selectOption('[data-testid="time-period-select"]', 'week');
        await page.waitForTimeout(1000);
        const weekCells = await page.locator('[data-testid="capacity-cell"]').count();
        (0, enhanced_features_fixtures_1.expect)(weekCells).toBeGreaterThan(0);
    });
    (0, enhanced_features_fixtures_1.test)('Revenue and Budget Analytics', async ({ page }) => {
        await page.goto('http://localhost:3003/analytics/financial');
        await page.waitForSelector('[data-testid="financial-dashboard"]', { timeout: 10000 });
        const totalRevenue = page.locator('[data-testid="total-revenue"]');
        await (0, enhanced_features_fixtures_1.expect)(totalRevenue).toBeVisible();
        const revenueText = await totalRevenue.textContent();
        (0, enhanced_features_fixtures_1.expect)(revenueText).toMatch(/\$[\d,]+/);
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="budget-vs-actual-chart"]')).toBeVisible();
        const profitabilityTable = page.locator('[data-testid="project-profitability-table"]');
        await (0, enhanced_features_fixtures_1.expect)(profitabilityTable).toBeVisible();
        const profitabilityRows = await page.locator('[data-testid="profitability-row"]').count();
        (0, enhanced_features_fixtures_1.expect)(profitabilityRows).toBeGreaterThan(0);
        await page.fill('[data-testid="financial-date-from"]', '2024-01-01');
        await page.fill('[data-testid="financial-date-to"]', '2024-06-30');
        await page.click('[data-testid="apply-financial-filter"]');
        await page.waitForTimeout(2000);
        const updatedRevenue = await page.locator('[data-testid="total-revenue"]').textContent();
        (0, enhanced_features_fixtures_1.expect)(updatedRevenue).toBeTruthy();
    });
    (0, enhanced_features_fixtures_1.test)('Real-time Analytics Updates', async ({ page, browser }) => {
        const context2 = await browser.newContext();
        const page2 = await context2.newPage();
        await page.goto('http://localhost:3003/dashboard');
        await page2.goto('http://localhost:3003/dashboard');
        await page.waitForLoadState('networkidle');
        await page2.waitForLoadState('networkidle');
        const initialUtilization = await page.locator('[data-testid="kpi-utilization"]').textContent();
        await page2.goto('http://localhost:3003/allocations');
        await page2.click('[data-testid="new-allocation-btn"]');
        await page2.selectOption('[data-testid="employee-select"]', { index: 1 });
        await page2.fill('[data-testid="allocation-percentage"]', '25');
        await page2.fill('[data-testid="start-date"]', '2024-06-01');
        await page2.fill('[data-testid="end-date"]', '2024-08-31');
        await page2.click('[data-testid="submit-allocation-btn"]');
        await page.waitForTimeout(3000);
        const updatedUtilization = await page.locator('[data-testid="kpi-utilization"]').textContent();
        (0, enhanced_features_fixtures_1.expect)(updatedUtilization).not.toBe(initialUtilization);
        await context2.close();
    });
});
//# sourceMappingURL=reporting-analytics.spec.js.map
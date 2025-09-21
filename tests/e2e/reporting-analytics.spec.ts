import { test, expect } from '../fixtures/enhanced-features-fixtures';

test.describe('Reporting & Analytics - Real Data Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');
  });

  test('Executive Dashboard - Real KPIs with Live Data', async ({ page, dashboardHelper }) => {
    await page.goto('http://localhost:3003/dashboard');
    await dashboardHelper.waitForDashboardLoad();

    // Verify real KPI data
    const totalEmployees = await dashboardHelper.getKPIValue('total-employees');
    expect(parseInt(totalEmployees)).toBeGreaterThan(0);

    const activeProjects = await dashboardHelper.getKPIValue('active-projects');
    expect(parseInt(activeProjects)).toBeGreaterThanOrEqual(0);

    // Check utilization percentage is realistic
    const utilization = await dashboardHelper.getKPIValue('utilization');
    const utilizationValue = parseInt(utilization.replace('%', ''));
    expect(utilizationValue).toBeGreaterThanOrEqual(0);
    expect(utilizationValue).toBeLessThanOrEqual(100);

    // Verify charts are rendered with real data
    await expect(page.locator('[data-testid="utilization-trend-chart"]')).toBeVisible();
    
    // Check that chart has data points
    const chartDataPoints = await page.locator('[data-testid="chart-data-point"]').count();
    expect(chartDataPoints).toBeGreaterThan(0);
  });

  test('Generate Employee Utilization Report', async ({ page, testData }) => {
    await page.goto('http://localhost:3003/reports');

    // Select report type
    await page.selectOption('[data-testid="report-type-select"]', 'utilization');

    // Set date range
    await page.fill('[data-testid="date-from"]', '2024-01-01');
    await page.fill('[data-testid="date-to"]', '2024-12-31');

    // Generate report
    await page.click('[data-testid="generate-report-btn"]');

    // Wait for report generation
    await page.waitForSelector('[data-testid="report-table"]', { timeout: 10000 });

    // Verify report contains employee data
    const reportRows = await page.locator('[data-testid="report-row"]').count();
    expect(reportRows).toBeGreaterThanOrEqual(testData.employees.length);

    // Check report headers
    const headers = ['Employee', 'Total Allocation', 'Utilization %', 'Available Hours'];
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }

    // Verify utilization calculations are reasonable
    const utilizationCells = page.locator('[data-testid="utilization-percentage"]');
    const count = await utilizationCells.count();
    
    for (let i = 0; i < count; i++) {
      const utilization = await utilizationCells.nth(i).textContent();
      const value = parseInt(utilization?.replace('%', '') || '0');
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(200); // Allow for over-allocation
    }
  });

  test('Export Reports as CSV and PDF', async ({ page, dashboardHelper }) => {
    await page.goto('http://localhost:3003/reports');

    // Generate a utilization report first
    await page.selectOption('[data-testid="report-type-select"]', 'utilization');
    await page.click('[data-testid="generate-report-btn"]');
    await page.waitForSelector('[data-testid="report-table"]');

    // Test CSV export
    const csvDownload = await dashboardHelper.exportReport('csv');
    expect(csvDownload.suggestedFilename()).toMatch(/utilization.*\.csv$/);

    // Verify CSV content by downloading and checking
    const csvPath = await csvDownload.path();
    expect(csvPath).toBeTruthy();

    // Test PDF export
    const pdfDownload = await dashboardHelper.exportReport('pdf');
    expect(pdfDownload.suggestedFilename()).toMatch(/utilization.*\.pdf$/);

    const pdfPath = await pdfDownload.path();
    expect(pdfPath).toBeTruthy();
  });

  test('Project Burn-down Charts with Real Timeline Data', async ({ page }) => {
    await page.goto('http://localhost:3003/projects');

    // Select first project
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCountGreaterThan(0);
    await projectCards.first().click();

    // Navigate to project analytics
    await page.click('[data-testid="project-analytics-tab"]');

    // Wait for burn-down chart
    await page.waitForSelector('[data-testid="burndown-chart"]', { timeout: 10000 });

    // Verify chart components
    await expect(page.locator('[data-testid="planned-progress-line"]')).toBeVisible();
    await expect(page.locator('[data-testid="actual-progress-line"]')).toBeVisible();

    // Check chart axes
    await expect(page.locator('[data-testid="chart-x-axis"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-y-axis"]')).toBeVisible();

    // Verify chart shows project timeline
    const chartPoints = await page.locator('[data-testid="progress-point"]').count();
    expect(chartPoints).toBeGreaterThan(0);

    // Test chart interactivity
    const firstPoint = page.locator('[data-testid="progress-point"]').first();
    await firstPoint.hover();
    
    // Check tooltip appears
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
  });

  test('Capacity Analytics with Heat Map', async ({ page }) => {
    await page.goto('http://localhost:3003/capacity');

    // Wait for capacity heat map to load
    await page.waitForSelector('[data-testid="capacity-heatmap"]', { timeout: 10000 });

    // Verify heat map structure
    const heatmapGrid = page.locator('[data-testid="heatmap-grid"]');
    await expect(heatmapGrid).toBeVisible();

    // Check heat map legend
    await expect(page.locator('[data-testid="capacity-legend"]')).toBeVisible();

    // Verify heat map cells contain capacity data
    const cells = page.locator('[data-testid="capacity-cell"]');
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(0);

    // Test cell interactivity
    const firstCell = cells.first();
    await firstCell.hover();

    // Verify tooltip shows capacity details
    const tooltip = page.locator('[data-testid="capacity-tooltip"]');
    await expect(tooltip).toBeVisible();
    
    // Check tooltip contains capacity percentage
    const tooltipText = await tooltip.textContent();
    expect(tooltipText).toMatch(/\d+%/);

    // Test different time periods
    await page.selectOption('[data-testid="time-period-select"]', 'week');
    await page.waitForTimeout(1000);
    
    const weekCells = await page.locator('[data-testid="capacity-cell"]').count();
    expect(weekCells).toBeGreaterThan(0);
  });

  test('Revenue and Budget Analytics', async ({ page }) => {
    await page.goto('http://localhost:3003/analytics/financial');

    // Wait for financial dashboard
    await page.waitForSelector('[data-testid="financial-dashboard"]', { timeout: 10000 });

    // Check revenue metrics
    const totalRevenue = page.locator('[data-testid="total-revenue"]');
    await expect(totalRevenue).toBeVisible();
    
    const revenueText = await totalRevenue.textContent();
    expect(revenueText).toMatch(/\$[\d,]+/); // Should show currency format

    // Verify budget vs actual chart
    await expect(page.locator('[data-testid="budget-vs-actual-chart"]')).toBeVisible();

    // Check project profitability table
    const profitabilityTable = page.locator('[data-testid="project-profitability-table"]');
    await expect(profitabilityTable).toBeVisible();

    const profitabilityRows = await page.locator('[data-testid="profitability-row"]').count();
    expect(profitabilityRows).toBeGreaterThan(0);

    // Test filtering by date range
    await page.fill('[data-testid="financial-date-from"]', '2024-01-01');
    await page.fill('[data-testid="financial-date-to"]', '2024-06-30');
    await page.click('[data-testid="apply-financial-filter"]');

    // Verify data updates
    await page.waitForTimeout(2000);
    const updatedRevenue = await page.locator('[data-testid="total-revenue"]').textContent();
    expect(updatedRevenue).toBeTruthy();
  });

  test('Real-time Analytics Updates', async ({ page, browser }) => {
    // Open two browser contexts to test real-time updates
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Navigate both to dashboard
    await page.goto('http://localhost:3003/dashboard');
    await page2.goto('http://localhost:3003/dashboard');

    await page.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Get initial KPI values
    const initialUtilization = await page.locator('[data-testid="kpi-utilization"]').textContent();

    // Create new allocation from page 2 (simulate another user)
    await page2.goto('http://localhost:3003/allocations');
    await page2.click('[data-testid="new-allocation-btn"]');
    
    await page2.selectOption('[data-testid="employee-select"]', { index: 1 });
    await page2.fill('[data-testid="allocation-percentage"]', '25');
    await page2.fill('[data-testid="start-date"]', '2024-06-01');
    await page2.fill('[data-testid="end-date"]', '2024-08-31');
    await page2.click('[data-testid="submit-allocation-btn"]');

    // Wait for WebSocket update
    await page.waitForTimeout(3000);

    // Check if utilization updated on page 1
    const updatedUtilization = await page.locator('[data-testid="kpi-utilization"]').textContent();
    
    // Utilization should have changed (even if slightly)
    expect(updatedUtilization).not.toBe(initialUtilization);

    await context2.close();
  });
});
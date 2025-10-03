"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const BASE_URL = 'http://localhost:3003';
const API_URL = 'http://localhost:3001';
const TEST_API_URL = 'http://localhost:3002';
test_1.test.describe('Enhanced Features - Comprehensive E2E Tests', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        const response = await page.request.get(`${API_URL}/api/employees`);
        (0, test_1.expect)(response.ok()).toBeTruthy();
    });
    test_1.test.describe('1. Reporting & Analytics Features', () => {
        (0, test_1.test)('should display executive dashboard with real KPIs', async ({ page }) => {
            await page.goto(`${BASE_URL}/dashboard`);
            await page.waitForSelector('[data-testid="executive-dashboard"]', { timeout: 10000 });
            const kpiCards = page.locator('[data-testid="kpi-card"]');
            await (0, test_1.expect)(kpiCards).toHaveCount(4);
            const totalEmployees = page.locator('[data-testid="kpi-total-employees"]');
            await (0, test_1.expect)(totalEmployees).toContainText(/[0-9]+/);
            const activeProjects = page.locator('[data-testid="kpi-active-projects"]');
            await (0, test_1.expect)(activeProjects).toContainText(/[0-9]+/);
            const utilization = page.locator('[data-testid="kpi-utilization"]');
            await (0, test_1.expect)(utilization).toContainText(/[0-9]+%/);
            await (0, test_1.expect)(page.locator('[data-testid="utilization-chart"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="project-timeline-chart"]')).toBeVisible();
        });
        (0, test_1.test)('should generate utilization report for employees', async ({ page }) => {
            await page.goto(`${BASE_URL}/reports`);
            await page.click('[data-testid="report-type-select"]');
            await page.click('[data-testid="utilization-report-option"]');
            await page.fill('[data-testid="start-date-input"]', '2024-01-01');
            await page.fill('[data-testid="end-date-input"]', '2024-12-31');
            await page.click('[data-testid="generate-report-btn"]');
            await page.waitForSelector('[data-testid="utilization-report"]', { timeout: 10000 });
            const reportRows = page.locator('[data-testid="report-row"]');
            await (0, test_1.expect)(reportRows).toHaveCountGreaterThan(0);
            await (0, test_1.expect)(page.locator('[data-testid="report-header"]')).toContainText('Employee Utilization Report');
            await (0, test_1.expect)(page.locator('th')).toContainText(['Employee', 'Utilization %', 'Total Hours', 'Available Hours']);
        });
        (0, test_1.test)('should export report as CSV/PDF', async ({ page }) => {
            await page.goto(`${BASE_URL}/reports`);
            await page.click('[data-testid="generate-report-btn"]');
            await page.waitForSelector('[data-testid="utilization-report"]');
            const [csvDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('[data-testid="export-csv-btn"]')
            ]);
            (0, test_1.expect)(csvDownload.suggestedFilename()).toMatch(/.*\.csv$/);
            const [pdfDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('[data-testid="export-pdf-btn"]')
            ]);
            (0, test_1.expect)(pdfDownload.suggestedFilename()).toMatch(/.*\.pdf$/);
        });
        (0, test_1.test)('should display burn-down charts for projects', async ({ page }) => {
            await page.goto(`${BASE_URL}/projects`);
            const projectCard = page.locator('[data-testid="project-card"]').first();
            await projectCard.click();
            await page.click('[data-testid="project-analytics-tab"]');
            await (0, test_1.expect)(page.locator('[data-testid="burndown-chart"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="chart-planned-line"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="chart-actual-line"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="chart-x-axis"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="chart-y-axis"]')).toBeVisible();
            const chartData = await page.locator('[data-testid="chart-data-point"]').count();
            (0, test_1.expect)(chartData).toBeGreaterThan(0);
        });
    });
    test_1.test.describe('2. Enhanced UI Features', () => {
        (0, test_1.test)('should display interactive Gantt chart with drag-and-drop', async ({ page }) => {
            await page.goto(`${BASE_URL}/schedule`);
            await page.waitForSelector('[data-testid="gantt-chart"]', { timeout: 10000 });
            await (0, test_1.expect)(page.locator('[data-testid="gantt-timeline"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="gantt-tasks"]')).toBeVisible();
            const taskBar = page.locator('[data-testid="gantt-task-bar"]').first();
            await (0, test_1.expect)(taskBar).toBeVisible();
            const initialBox = await taskBar.boundingBox();
            await taskBar.dragTo(page.locator('[data-testid="gantt-drop-zone"]'), { force: true });
            await page.waitForTimeout(1000);
            const newBox = await taskBar.boundingBox();
            (0, test_1.expect)(newBox?.x).not.toBe(initialBox?.x);
        });
        (0, test_1.test)('should show capacity heat map visualization', async ({ page }) => {
            await page.goto(`${BASE_URL}/capacity`);
            await page.waitForSelector('[data-testid="capacity-heatmap"]', { timeout: 10000 });
            await (0, test_1.expect)(page.locator('[data-testid="heatmap-grid"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="heatmap-legend"]')).toBeVisible();
            const heatmapCells = page.locator('[data-testid="heatmap-cell"]');
            await (0, test_1.expect)(heatmapCells).toHaveCountGreaterThan(0);
            const firstCell = heatmapCells.first();
            await (0, test_1.expect)(firstCell).toHaveAttribute('data-capacity');
            await firstCell.hover();
            await (0, test_1.expect)(page.locator('[data-testid="capacity-tooltip"]')).toBeVisible();
        });
        (0, test_1.test)('should support dark mode toggle', async ({ page }) => {
            await (0, test_1.expect)(page.locator('html')).not.toHaveClass(/dark/);
            await page.click('[data-testid="theme-toggle"]');
            await (0, test_1.expect)(page.locator('html')).toHaveClass(/dark/);
            const backgroundColor = await page.evaluate(() => {
                return window.getComputedStyle(document.body).backgroundColor;
            });
            (0, test_1.expect)(backgroundColor).toMatch(/rgb\(.*\)/);
            await page.click('[data-testid="theme-toggle"]');
            await (0, test_1.expect)(page.locator('html')).not.toHaveClass(/dark/);
        });
        (0, test_1.test)('should handle keyboard shortcuts (Ctrl+K for search)', async ({ page }) => {
            await page.keyboard.press('Control+k');
            await (0, test_1.expect)(page.locator('[data-testid="search-modal"]')).toBeVisible();
            await page.fill('[data-testid="search-input"]', 'John');
            await (0, test_1.expect)(page.locator('[data-testid="search-results"]')).toBeVisible();
            const searchResults = page.locator('[data-testid="search-result-item"]');
            await (0, test_1.expect)(searchResults).toHaveCountGreaterThan(0);
            await page.keyboard.press('Escape');
            await (0, test_1.expect)(page.locator('[data-testid="search-modal"]')).not.toBeVisible();
        });
        (0, test_1.test)('should display timeline slider to view different dates', async ({ page }) => {
            await page.goto(`${BASE_URL}/schedule`);
            await page.waitForSelector('[data-testid="timeline-slider"]', { timeout: 10000 });
            const initialDate = await page.locator('[data-testid="current-date-display"]').textContent();
            const slider = page.locator('[data-testid="timeline-slider"]');
            await slider.click({ position: { x: 100, y: 10 } });
            const newDate = await page.locator('[data-testid="current-date-display"]').textContent();
            (0, test_1.expect)(newDate).not.toBe(initialDate);
            await page.waitForTimeout(1000);
            await (0, test_1.expect)(page.locator('[data-testid="schedule-content"]')).toBeVisible();
        });
    });
    test_1.test.describe('3. Notifications System', () => {
        (0, test_1.test)('should display notification center with unread badges', async ({ page }) => {
            await page.click('[data-testid="notification-bell"]');
            await (0, test_1.expect)(page.locator('[data-testid="notification-panel"]')).toBeVisible();
            const unreadBadge = page.locator('[data-testid="unread-badge"]');
            if (await unreadBadge.isVisible()) {
                const badgeText = await unreadBadge.textContent();
                (0, test_1.expect)(parseInt(badgeText || '0')).toBeGreaterThanOrEqual(0);
            }
            await (0, test_1.expect)(page.locator('[data-testid="notification-list"]')).toBeVisible();
        });
        (0, test_1.test)('should detect allocation conflicts (Mike 80% + John 50%)', async ({ page }) => {
            await page.goto(`${BASE_URL}/allocations`);
            await page.click('[data-testid="new-allocation-btn"]');
            await page.selectOption('[data-testid="employee-select"]', { label: 'Mike Johnson' });
            await page.fill('[data-testid="allocation-percentage"]', '80');
            await page.fill('[data-testid="start-date"]', '2024-06-01');
            await page.fill('[data-testid="end-date"]', '2024-06-30');
            await page.click('[data-testid="submit-allocation-btn"]');
            await (0, test_1.expect)(page.locator('[data-testid="conflict-alert"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="conflict-message"]')).toContainText(/over.allocated|conflict|exceeds/i);
            await (0, test_1.expect)(page.locator('[data-testid="conflict-details"]')).toContainText(/80%/);
        });
        (0, test_1.test)('should test notification preferences', async ({ page }) => {
            await page.goto(`${BASE_URL}/settings/notifications`);
            await (0, test_1.expect)(page.locator('[data-testid="notification-preferences"]')).toBeVisible();
            const conflictNotifications = page.locator('[data-testid="conflict-notifications-toggle"]');
            await conflictNotifications.click();
            const projectUpdates = page.locator('[data-testid="project-updates-toggle"]');
            await projectUpdates.click();
            await page.click('[data-testid="save-preferences-btn"]');
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toBeVisible();
        });
        (0, test_1.test)('should check real-time alerts', async ({ page }) => {
            const wsConnected = page.evaluate(() => {
                return new Promise((resolve) => {
                    const ws = new WebSocket('ws://localhost:3001');
                    ws.onopen = () => resolve(true);
                    ws.onerror = () => resolve(false);
                });
            });
            (0, test_1.expect)(await wsConnected).toBeTruthy();
            await page.goto(`${BASE_URL}/allocations`);
            const alertReceived = page.evaluate(() => {
                return new Promise((resolve) => {
                    const ws = new WebSocket('ws://localhost:3001');
                    ws.onmessage = (event) => {
                        const data = JSON.parse(event.data);
                        if (data.type === 'allocation_conflict') {
                            resolve(true);
                        }
                    };
                    setTimeout(() => resolve(false), 5000);
                });
            });
            await page.click('[data-testid="new-allocation-btn"]');
            await page.selectOption('[data-testid="employee-select"]', { index: 1 });
            await page.fill('[data-testid="allocation-percentage"]', '150');
            await page.click('[data-testid="submit-allocation-btn"]');
            const receivedAlert = await alertReceived;
            (0, test_1.expect)(receivedAlert).toBeTruthy();
        });
    });
    test_1.test.describe('4. Bulk Operations', () => {
        (0, test_1.test)('should bulk assign multiple employees to project', async ({ page }) => {
            await page.goto(`${BASE_URL}/projects`);
            const projectCard = page.locator('[data-testid="project-card"]').first();
            await projectCard.click();
            await page.click('[data-testid="assign-team-btn"]');
            await page.click('[data-testid="employee-checkbox-1"]');
            await page.click('[data-testid="employee-checkbox-2"]');
            await page.click('[data-testid="employee-checkbox-3"]');
            await page.fill('[data-testid="bulk-allocation-percentage"]', '50');
            await page.fill('[data-testid="bulk-start-date"]', '2024-06-01');
            await page.fill('[data-testid="bulk-end-date"]', '2024-08-31');
            await page.click('[data-testid="apply-bulk-assignment-btn"]');
            await (0, test_1.expect)(page.locator('[data-testid="bulk-success-message"]')).toBeVisible();
            await page.goto(`${BASE_URL}/allocations`);
            const allocationRows = page.locator('[data-testid="allocation-row"]');
            await (0, test_1.expect)(allocationRows).toHaveCountGreaterThanOrEqual(3);
        });
        (0, test_1.test)('should update multiple allocations at once', async ({ page }) => {
            await page.goto(`${BASE_URL}/allocations`);
            await page.click('[data-testid="allocation-checkbox-1"]');
            await page.click('[data-testid="allocation-checkbox-2"]');
            await page.click('[data-testid="bulk-edit-btn"]');
            await page.fill('[data-testid="bulk-percentage-input"]', '75');
            await page.click('[data-testid="apply-bulk-changes-btn"]');
            await (0, test_1.expect)(page.locator('[data-testid="bulk-update-success"]')).toBeVisible();
            const updatedAllocations = page.locator('[data-testid="allocation-percentage"]:has-text("75%")');
            await (0, test_1.expect)(updatedAllocations).toHaveCountGreaterThanOrEqual(2);
        });
        (0, test_1.test)('should import allocations from CSV', async ({ page }) => {
            await page.goto(`${BASE_URL}/allocations`);
            await page.click('[data-testid="import-csv-btn"]');
            const csvContent = `Employee,Project,Percentage,Start Date,End Date
John Doe,Test Project,60,2024-06-01,2024-08-31
Jane Smith,Test Project,70,2024-06-01,2024-08-31`;
            const fileInput = page.locator('[data-testid="csv-file-input"]');
            await fileInput.setInputFiles({
                name: 'test-allocations.csv',
                mimeType: 'text/csv',
                buffer: Buffer.from(csvContent)
            });
            await page.click('[data-testid="preview-import-btn"]');
            await (0, test_1.expect)(page.locator('[data-testid="import-preview-table"]')).toBeVisible();
            const previewRows = page.locator('[data-testid="preview-row"]');
            await (0, test_1.expect)(previewRows).toHaveCount(2);
            await page.click('[data-testid="confirm-import-btn"]');
            await (0, test_1.expect)(page.locator('[data-testid="import-success-message"]')).toBeVisible();
        });
        (0, test_1.test)('should apply team template', async ({ page }) => {
            await page.goto(`${BASE_URL}/templates`);
            await page.click('[data-testid="team-template-card"]');
            await (0, test_1.expect)(page.locator('[data-testid="template-details"]')).toBeVisible();
            await page.click('[data-testid="apply-template-btn"]');
            await page.selectOption('[data-testid="target-project-select"]', { index: 1 });
            await page.fill('[data-testid="template-start-date"]', '2024-07-01');
            await page.fill('[data-testid="template-duration"]', '3');
            await page.click('[data-testid="confirm-apply-template-btn"]');
            await (0, test_1.expect)(page.locator('[data-testid="template-applied-success"]')).toBeVisible();
            await page.goto(`${BASE_URL}/allocations`);
            const templateAllocations = page.locator('[data-testid="allocation-row"]:has-text("Template")');
            await (0, test_1.expect)(templateAllocations).toHaveCountGreaterThan(0);
        });
    });
    test_1.test.describe('5. Data Persistence', () => {
        (0, test_1.test)('should verify all changes persist after refresh', async ({ page }) => {
            await page.goto(`${BASE_URL}/allocations`);
            await page.click('[data-testid="new-allocation-btn"]');
            const testEmployeeName = 'John Doe';
            const testPercentage = '85';
            await page.selectOption('[data-testid="employee-select"]', { label: testEmployeeName });
            await page.fill('[data-testid="allocation-percentage"]', testPercentage);
            await page.fill('[data-testid="start-date"]', '2024-07-01');
            await page.fill('[data-testid="end-date"]', '2024-09-30');
            await page.click('[data-testid="submit-allocation-btn"]');
            await (0, test_1.expect)(page.locator(`[data-testid="allocation-row"]:has-text("${testEmployeeName}")`)).toBeVisible();
            await page.reload();
            await page.waitForLoadState('networkidle');
            await (0, test_1.expect)(page.locator(`[data-testid="allocation-row"]:has-text("${testEmployeeName}")`)).toBeVisible();
            await (0, test_1.expect)(page.locator(`[data-testid="allocation-row"]:has-text("${testPercentage}%")`)).toBeVisible();
        });
        (0, test_1.test)('should check real database updates', async ({ page }) => {
            const initialResponse = await page.request.get(`${API_URL}/api/allocations`);
            const initialData = await initialResponse.json();
            const initialCount = initialData.data?.length || 0;
            await page.goto(`${BASE_URL}/allocations`);
            await page.click('[data-testid="new-allocation-btn"]');
            await page.selectOption('[data-testid="employee-select"]', { index: 1 });
            await page.fill('[data-testid="allocation-percentage"]', '90');
            await page.fill('[data-testid="start-date"]', '2024-08-01');
            await page.fill('[data-testid="end-date"]', '2024-10-31');
            await page.click('[data-testid="submit-allocation-btn"]');
            await page.waitForTimeout(2000);
            const updatedResponse = await page.request.get(`${API_URL}/api/allocations`);
            const updatedData = await updatedResponse.json();
            const updatedCount = updatedData.data?.length || 0;
            (0, test_1.expect)(updatedCount).toBe(initialCount + 1);
            const newAllocation = updatedData.data?.find((alloc) => alloc.percentage === 90);
            (0, test_1.expect)(newAllocation).toBeTruthy();
        });
        (0, test_1.test)('should confirm WebSocket real-time updates', async ({ page, browser }) => {
            const context2 = await browser.newContext();
            const page2 = await context2.newPage();
            await page.goto(`${BASE_URL}/allocations`);
            await page2.goto(`${BASE_URL}/allocations`);
            await page.waitForLoadState('networkidle');
            await page2.waitForLoadState('networkidle');
            const initialCount1 = await page.locator('[data-testid="allocation-row"]').count();
            const initialCount2 = await page2.locator('[data-testid="allocation-row"]').count();
            (0, test_1.expect)(initialCount1).toBe(initialCount2);
            await page.click('[data-testid="new-allocation-btn"]');
            await page.selectOption('[data-testid="employee-select"]', { index: 1 });
            await page.fill('[data-testid="allocation-percentage"]', '95');
            await page.fill('[data-testid="start-date"]', '2024-09-01');
            await page.fill('[data-testid="end-date"]', '2024-11-30');
            await page.click('[data-testid="submit-allocation-btn"]');
            await page.waitForTimeout(3000);
            const updatedCount2 = await page2.locator('[data-testid="allocation-row"]').count();
            (0, test_1.expect)(updatedCount2).toBe(initialCount2 + 1);
            await (0, test_1.expect)(page2.locator('[data-testid="allocation-row"]:has-text("95%")')).toBeVisible();
            await context2.close();
        });
        (0, test_1.test)('should handle concurrent modifications', async ({ page, browser }) => {
            const context2 = await browser.newContext();
            const page2 = await context2.newPage();
            await page.goto(`${BASE_URL}/allocations`);
            await page2.goto(`${BASE_URL}/allocations`);
            const [result1, result2] = await Promise.all([
                page.evaluate(async () => {
                    const response = await fetch('http://localhost:3001/api/allocations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employeeId: 1,
                            projectId: 1,
                            percentage: 40,
                            startDate: '2024-10-01',
                            endDate: '2024-12-31'
                        })
                    });
                    return response.status;
                }),
                page2.evaluate(async () => {
                    const response = await fetch('http://localhost:3001/api/allocations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employeeId: 2,
                            projectId: 2,
                            percentage: 60,
                            startDate: '2024-10-01',
                            endDate: '2024-12-31'
                        })
                    });
                    return response.status;
                })
            ]);
            (0, test_1.expect)(result1).toBe(201);
            (0, test_1.expect)(result2).toBe(201);
            await page.reload();
            await page2.reload();
            await page.waitForLoadState('networkidle');
            await page2.waitForLoadState('networkidle');
            const count1 = await page.locator('[data-testid="allocation-row"]').count();
            const count2 = await page2.locator('[data-testid="allocation-row"]').count();
            (0, test_1.expect)(count1).toBe(count2);
            await context2.close();
        });
    });
    test_1.test.describe('Performance and Load Tests', () => {
        (0, test_1.test)('should handle large datasets efficiently', async ({ page }) => {
            const startTime = Date.now();
            await page.goto(`${BASE_URL}/allocations?limit=1000`);
            await page.waitForLoadState('networkidle');
            const loadTime = Date.now() - startTime;
            (0, test_1.expect)(loadTime).toBeLessThan(5000);
            const rows = await page.locator('[data-testid="allocation-row"]').count();
            (0, test_1.expect)(rows).toBeGreaterThan(0);
            const scrollStartTime = Date.now();
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(500);
            const scrollTime = Date.now() - scrollStartTime;
            (0, test_1.expect)(scrollTime).toBeLessThan(1000);
        });
        (0, test_1.test)('should handle rapid user interactions', async ({ page }) => {
            await page.goto(`${BASE_URL}/allocations`);
            for (let i = 0; i < 10; i++) {
                await page.click('[data-testid="new-allocation-btn"]');
                await page.keyboard.press('Escape');
                await page.waitForTimeout(100);
            }
            await (0, test_1.expect)(page.locator('[data-testid="new-allocation-btn"]')).toBeEnabled();
        });
    });
});
//# sourceMappingURL=enhanced-features-comprehensive.spec.js.map
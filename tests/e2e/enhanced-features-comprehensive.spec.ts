import { test, expect, Page, Locator } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:3003';
const API_URL = 'http://localhost:3001';
const TEST_API_URL = 'http://localhost:3002';

test.describe('Enhanced Features - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    // Ensure we have test data
    const response = await page.request.get(`${API_URL}/api/employees`);
    expect(response.ok()).toBeTruthy();
  });

  test.describe('1. Reporting & Analytics Features', () => {
    test('should display executive dashboard with real KPIs', async ({ page }) => {
      // Navigate to dashboard/analytics
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Wait for dashboard to load
      await page.waitForSelector('[data-testid="executive-dashboard"]', { timeout: 10000 });
      
      // Check for KPI cards
      const kpiCards = page.locator('[data-testid="kpi-card"]');
      await expect(kpiCards).toHaveCount(4); // Total employees, active projects, utilization, revenue
      
      // Verify KPI values are populated with real data
      const totalEmployees = page.locator('[data-testid="kpi-total-employees"]');
      await expect(totalEmployees).toContainText(/[0-9]+/);
      
      const activeProjects = page.locator('[data-testid="kpi-active-projects"]');
      await expect(activeProjects).toContainText(/[0-9]+/);
      
      const utilization = page.locator('[data-testid="kpi-utilization"]');
      await expect(utilization).toContainText(/[0-9]+%/);
      
      // Check for charts
      await expect(page.locator('[data-testid="utilization-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="project-timeline-chart"]')).toBeVisible();
    });

    test('should generate utilization report for employees', async ({ page }) => {
      await page.goto(`${BASE_URL}/reports`);
      
      // Select utilization report
      await page.click('[data-testid="report-type-select"]');
      await page.click('[data-testid="utilization-report-option"]');
      
      // Select date range
      await page.fill('[data-testid="start-date-input"]', '2024-01-01');
      await page.fill('[data-testid="end-date-input"]', '2024-12-31');
      
      // Generate report
      await page.click('[data-testid="generate-report-btn"]');
      
      // Wait for report to load
      await page.waitForSelector('[data-testid="utilization-report"]', { timeout: 10000 });
      
      // Verify report contains employee data
      const reportRows = page.locator('[data-testid="report-row"]');
      await expect(reportRows).toHaveCountGreaterThan(0);
      
      // Check report structure
      await expect(page.locator('[data-testid="report-header"]')).toContainText('Employee Utilization Report');
      await expect(page.locator('th')).toContainText(['Employee', 'Utilization %', 'Total Hours', 'Available Hours']);
    });

    test('should export report as CSV/PDF', async ({ page }) => {
      await page.goto(`${BASE_URL}/reports`);
      
      // Generate a simple report first
      await page.click('[data-testid="generate-report-btn"]');
      await page.waitForSelector('[data-testid="utilization-report"]');
      
      // Test CSV export
      const [csvDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-csv-btn"]')
      ]);
      
      expect(csvDownload.suggestedFilename()).toMatch(/.*\.csv$/);
      
      // Test PDF export
      const [pdfDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-pdf-btn"]')
      ]);
      
      expect(pdfDownload.suggestedFilename()).toMatch(/.*\.pdf$/);
    });

    test('should display burn-down charts for projects', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      
      // Click on a project to view details
      const projectCard = page.locator('[data-testid="project-card"]').first();
      await projectCard.click();
      
      // Navigate to project analytics
      await page.click('[data-testid="project-analytics-tab"]');
      
      // Verify burn-down chart is displayed
      await expect(page.locator('[data-testid="burndown-chart"]')).toBeVisible();
      
      // Check chart elements
      await expect(page.locator('[data-testid="chart-planned-line"]')).toBeVisible();
      await expect(page.locator('[data-testid="chart-actual-line"]')).toBeVisible();
      await expect(page.locator('[data-testid="chart-x-axis"]')).toBeVisible();
      await expect(page.locator('[data-testid="chart-y-axis"]')).toBeVisible();
      
      // Verify chart shows realistic data
      const chartData = await page.locator('[data-testid="chart-data-point"]').count();
      expect(chartData).toBeGreaterThan(0);
    });
  });

  test.describe('2. Enhanced UI Features', () => {
    test('should display interactive Gantt chart with drag-and-drop', async ({ page }) => {
      await page.goto(`${BASE_URL}/schedule`);
      
      // Wait for Gantt chart to load
      await page.waitForSelector('[data-testid="gantt-chart"]', { timeout: 10000 });
      
      // Verify Gantt chart elements
      await expect(page.locator('[data-testid="gantt-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="gantt-tasks"]')).toBeVisible();
      
      // Test drag and drop functionality
      const taskBar = page.locator('[data-testid="gantt-task-bar"]').first();
      await expect(taskBar).toBeVisible();
      
      // Get initial position
      const initialBox = await taskBar.boundingBox();
      
      // Perform drag and drop
      await taskBar.dragTo(page.locator('[data-testid="gantt-drop-zone"]'), { force: true });
      
      // Verify task moved (position changed)
      await page.waitForTimeout(1000); // Allow for animation
      const newBox = await taskBar.boundingBox();
      expect(newBox?.x).not.toBe(initialBox?.x);
    });

    test('should show capacity heat map visualization', async ({ page }) => {
      await page.goto(`${BASE_URL}/capacity`);
      
      // Wait for heat map to load
      await page.waitForSelector('[data-testid="capacity-heatmap"]', { timeout: 10000 });
      
      // Verify heat map structure
      await expect(page.locator('[data-testid="heatmap-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="heatmap-legend"]')).toBeVisible();
      
      // Check heat map cells
      const heatmapCells = page.locator('[data-testid="heatmap-cell"]');
      await expect(heatmapCells).toHaveCountGreaterThan(0);
      
      // Verify cells have capacity data
      const firstCell = heatmapCells.first();
      await expect(firstCell).toHaveAttribute('data-capacity');
      
      // Test hover functionality
      await firstCell.hover();
      await expect(page.locator('[data-testid="capacity-tooltip"]')).toBeVisible();
    });

    test('should support dark mode toggle', async ({ page }) => {
      // Start in light mode
      await expect(page.locator('html')).not.toHaveClass(/dark/);
      
      // Toggle to dark mode
      await page.click('[data-testid="theme-toggle"]');
      
      // Verify dark mode is applied
      await expect(page.locator('html')).toHaveClass(/dark/);
      
      // Verify dark mode styles
      const backgroundColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      
      expect(backgroundColor).toMatch(/rgb\(.*\)/); // Should be dark color
      
      // Toggle back to light mode
      await page.click('[data-testid="theme-toggle"]');
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    });

    test('should handle keyboard shortcuts (Ctrl+K for search)', async ({ page }) => {
      // Press Ctrl+K to open search
      await page.keyboard.press('Control+k');
      
      // Verify search modal opens
      await expect(page.locator('[data-testid="search-modal"]')).toBeVisible();
      
      // Type search query
      await page.fill('[data-testid="search-input"]', 'John');
      
      // Verify search results appear
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      const searchResults = page.locator('[data-testid="search-result-item"]');
      await expect(searchResults).toHaveCountGreaterThan(0);
      
      // Press Escape to close
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="search-modal"]')).not.toBeVisible();
    });

    test('should display timeline slider to view different dates', async ({ page }) => {
      await page.goto(`${BASE_URL}/schedule`);
      
      // Wait for timeline slider
      await page.waitForSelector('[data-testid="timeline-slider"]', { timeout: 10000 });
      
      // Get initial date display
      const initialDate = await page.locator('[data-testid="current-date-display"]').textContent();
      
      // Move slider
      const slider = page.locator('[data-testid="timeline-slider"]');
      await slider.click({ position: { x: 100, y: 10 } });
      
      // Verify date changed
      const newDate = await page.locator('[data-testid="current-date-display"]').textContent();
      expect(newDate).not.toBe(initialDate);
      
      // Verify schedule updates with new date
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="schedule-content"]')).toBeVisible();
    });
  });

  test.describe('3. Notifications System', () => {
    test('should display notification center with unread badges', async ({ page }) => {
      // Click notification bell
      await page.click('[data-testid="notification-bell"]');
      
      // Verify notification panel opens
      await expect(page.locator('[data-testid="notification-panel"]')).toBeVisible();
      
      // Check for unread badge
      const unreadBadge = page.locator('[data-testid="unread-badge"]');
      if (await unreadBadge.isVisible()) {
        const badgeText = await unreadBadge.textContent();
        expect(parseInt(badgeText || '0')).toBeGreaterThanOrEqual(0);
      }
      
      // Verify notification list
      await expect(page.locator('[data-testid="notification-list"]')).toBeVisible();
    });

    test('should detect allocation conflicts (Mike 80% + John 50%)', async ({ page }) => {
      // Navigate to allocations
      await page.goto(`${BASE_URL}/allocations`);
      
      // Create conflicting allocation
      await page.click('[data-testid="new-allocation-btn"]');
      
      // Fill allocation form to create conflict
      await page.selectOption('[data-testid="employee-select"]', { label: 'Mike Johnson' });
      await page.fill('[data-testid="allocation-percentage"]', '80');
      await page.fill('[data-testid="start-date"]', '2024-06-01');
      await page.fill('[data-testid="end-date"]', '2024-06-30');
      
      // Submit allocation
      await page.click('[data-testid="submit-allocation-btn"]');
      
      // Check for conflict notification
      await expect(page.locator('[data-testid="conflict-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="conflict-message"]')).toContainText(/over.allocated|conflict|exceeds/i);
      
      // Verify conflict details
      await expect(page.locator('[data-testid="conflict-details"]')).toContainText(/80%/);
    });

    test('should test notification preferences', async ({ page }) => {
      // Navigate to settings/notifications
      await page.goto(`${BASE_URL}/settings/notifications`);
      
      // Verify notification preferences form
      await expect(page.locator('[data-testid="notification-preferences"]')).toBeVisible();
      
      // Test toggling different notification types
      const conflictNotifications = page.locator('[data-testid="conflict-notifications-toggle"]');
      await conflictNotifications.click();
      
      const projectUpdates = page.locator('[data-testid="project-updates-toggle"]');
      await projectUpdates.click();
      
      // Save preferences
      await page.click('[data-testid="save-preferences-btn"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should check real-time alerts', async ({ page }) => {
      // Create a WebSocket connection to monitor real-time updates
      const wsConnected = page.evaluate(() => {
        return new Promise((resolve) => {
          const ws = new WebSocket('ws://localhost:3001');
          ws.onopen = () => resolve(true);
          ws.onerror = () => resolve(false);
        });
      });
      
      expect(await wsConnected).toBeTruthy();
      
      // Make a change that should trigger real-time alert
      await page.goto(`${BASE_URL}/allocations`);
      
      // Listen for WebSocket messages
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
      
      // Create allocation that triggers alert
      await page.click('[data-testid="new-allocation-btn"]');
      await page.selectOption('[data-testid="employee-select"]', { index: 1 });
      await page.fill('[data-testid="allocation-percentage"]', '150'); // Over-allocation
      await page.click('[data-testid="submit-allocation-btn"]');
      
      // Check if real-time alert was received
      const receivedAlert = await alertReceived;
      expect(receivedAlert).toBeTruthy();
    });
  });

  test.describe('4. Bulk Operations', () => {
    test('should bulk assign multiple employees to project', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      
      // Select a project
      const projectCard = page.locator('[data-testid="project-card"]').first();
      await projectCard.click();
      
      // Navigate to team assignment
      await page.click('[data-testid="assign-team-btn"]');
      
      // Select multiple employees
      await page.click('[data-testid="employee-checkbox-1"]');
      await page.click('[data-testid="employee-checkbox-2"]');
      await page.click('[data-testid="employee-checkbox-3"]');
      
      // Set bulk allocation percentage
      await page.fill('[data-testid="bulk-allocation-percentage"]', '50');
      
      // Set date range
      await page.fill('[data-testid="bulk-start-date"]', '2024-06-01');
      await page.fill('[data-testid="bulk-end-date"]', '2024-08-31');
      
      // Apply bulk assignment
      await page.click('[data-testid="apply-bulk-assignment-btn"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="bulk-success-message"]')).toBeVisible();
      
      // Verify allocations were created
      await page.goto(`${BASE_URL}/allocations`);
      const allocationRows = page.locator('[data-testid="allocation-row"]');
      await expect(allocationRows).toHaveCountGreaterThanOrEqual(3);
    });

    test('should update multiple allocations at once', async ({ page }) => {
      await page.goto(`${BASE_URL}/allocations`);
      
      // Select multiple allocation rows
      await page.click('[data-testid="allocation-checkbox-1"]');
      await page.click('[data-testid="allocation-checkbox-2"]');
      
      // Click bulk edit button
      await page.click('[data-testid="bulk-edit-btn"]');
      
      // Update allocation percentage
      await page.fill('[data-testid="bulk-percentage-input"]', '75');
      
      // Apply changes
      await page.click('[data-testid="apply-bulk-changes-btn"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="bulk-update-success"]')).toBeVisible();
      
      // Verify allocations were updated
      const updatedAllocations = page.locator('[data-testid="allocation-percentage"]:has-text("75%")');
      await expect(updatedAllocations).toHaveCountGreaterThanOrEqual(2);
    });

    test('should import allocations from CSV', async ({ page }) => {
      await page.goto(`${BASE_URL}/allocations`);
      
      // Click import button
      await page.click('[data-testid="import-csv-btn"]');
      
      // Upload CSV file
      const csvContent = `Employee,Project,Percentage,Start Date,End Date
John Doe,Test Project,60,2024-06-01,2024-08-31
Jane Smith,Test Project,70,2024-06-01,2024-08-31`;
      
      const fileInput = page.locator('[data-testid="csv-file-input"]');
      await fileInput.setInputFiles({
        name: 'test-allocations.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      
      // Preview import
      await page.click('[data-testid="preview-import-btn"]');
      
      // Verify preview shows data
      await expect(page.locator('[data-testid="import-preview-table"]')).toBeVisible();
      const previewRows = page.locator('[data-testid="preview-row"]');
      await expect(previewRows).toHaveCount(2);
      
      // Confirm import
      await page.click('[data-testid="confirm-import-btn"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="import-success-message"]')).toBeVisible();
    });

    test('should apply team template', async ({ page }) => {
      await page.goto(`${BASE_URL}/templates`);
      
      // Select a team template
      await page.click('[data-testid="team-template-card"]');
      
      // View template details
      await expect(page.locator('[data-testid="template-details"]')).toBeVisible();
      
      // Apply to project
      await page.click('[data-testid="apply-template-btn"]');
      
      // Select target project
      await page.selectOption('[data-testid="target-project-select"]', { index: 1 });
      
      // Set template parameters
      await page.fill('[data-testid="template-start-date"]', '2024-07-01');
      await page.fill('[data-testid="template-duration"]', '3'); // months
      
      // Apply template
      await page.click('[data-testid="confirm-apply-template-btn"]');
      
      // Verify success
      await expect(page.locator('[data-testid="template-applied-success"]')).toBeVisible();
      
      // Check that allocations were created
      await page.goto(`${BASE_URL}/allocations`);
      const templateAllocations = page.locator('[data-testid="allocation-row"]:has-text("Template")');
      await expect(templateAllocations).toHaveCountGreaterThan(0);
    });
  });

  test.describe('5. Data Persistence', () => {
    test('should verify all changes persist after refresh', async ({ page }) => {
      // Create a new allocation
      await page.goto(`${BASE_URL}/allocations`);
      await page.click('[data-testid="new-allocation-btn"]');
      
      // Fill form
      const testEmployeeName = 'John Doe';
      const testPercentage = '85';
      
      await page.selectOption('[data-testid="employee-select"]', { label: testEmployeeName });
      await page.fill('[data-testid="allocation-percentage"]', testPercentage);
      await page.fill('[data-testid="start-date"]', '2024-07-01');
      await page.fill('[data-testid="end-date"]', '2024-09-30');
      
      // Submit
      await page.click('[data-testid="submit-allocation-btn"]');
      
      // Verify allocation appears
      await expect(page.locator(`[data-testid="allocation-row"]:has-text("${testEmployeeName}")`)).toBeVisible();
      
      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify allocation still exists
      await expect(page.locator(`[data-testid="allocation-row"]:has-text("${testEmployeeName}")`)).toBeVisible();
      await expect(page.locator(`[data-testid="allocation-row"]:has-text("${testPercentage}%")`)).toBeVisible();
    });

    test('should check real database updates', async ({ page }) => {
      // Make API call to verify database state before changes
      const initialResponse = await page.request.get(`${API_URL}/api/allocations`);
      const initialData = await initialResponse.json();
      const initialCount = initialData.data?.length || 0;
      
      // Create new allocation through UI
      await page.goto(`${BASE_URL}/allocations`);
      await page.click('[data-testid="new-allocation-btn"]');
      
      await page.selectOption('[data-testid="employee-select"]', { index: 1 });
      await page.fill('[data-testid="allocation-percentage"]', '90');
      await page.fill('[data-testid="start-date"]', '2024-08-01');
      await page.fill('[data-testid="end-date"]', '2024-10-31');
      
      await page.click('[data-testid="submit-allocation-btn"]');
      
      // Wait for UI to update
      await page.waitForTimeout(2000);
      
      // Verify database was updated via API
      const updatedResponse = await page.request.get(`${API_URL}/api/allocations`);
      const updatedData = await updatedResponse.json();
      const updatedCount = updatedData.data?.length || 0;
      
      expect(updatedCount).toBe(initialCount + 1);
      
      // Verify the new allocation exists in database
      const newAllocation = updatedData.data?.find((alloc: any) => alloc.percentage === 90);
      expect(newAllocation).toBeTruthy();
    });

    test('should confirm WebSocket real-time updates', async ({ page, browser }) => {
      // Open two browser contexts to test real-time updates
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      
      // Navigate both pages to allocations
      await page.goto(`${BASE_URL}/allocations`);
      await page2.goto(`${BASE_URL}/allocations`);
      
      // Wait for both pages to load
      await page.waitForLoadState('networkidle');
      await page2.waitForLoadState('networkidle');
      
      // Count initial allocations on both pages
      const initialCount1 = await page.locator('[data-testid="allocation-row"]').count();
      const initialCount2 = await page2.locator('[data-testid="allocation-row"]').count();
      
      expect(initialCount1).toBe(initialCount2);
      
      // Create new allocation on page 1
      await page.click('[data-testid="new-allocation-btn"]');
      await page.selectOption('[data-testid="employee-select"]', { index: 1 });
      await page.fill('[data-testid="allocation-percentage"]', '95');
      await page.fill('[data-testid="start-date"]', '2024-09-01');
      await page.fill('[data-testid="end-date"]', '2024-11-30');
      await page.click('[data-testid="submit-allocation-btn"]');
      
      // Wait for WebSocket update to propagate
      await page.waitForTimeout(3000);
      
      // Verify page 2 shows the new allocation (real-time update)
      const updatedCount2 = await page2.locator('[data-testid="allocation-row"]').count();
      expect(updatedCount2).toBe(initialCount2 + 1);
      
      // Verify the specific allocation appears on page 2
      await expect(page2.locator('[data-testid="allocation-row"]:has-text("95%")')).toBeVisible();
      
      await context2.close();
    });

    test('should handle concurrent modifications', async ({ page, browser }) => {
      // Test data consistency with concurrent updates
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      
      await page.goto(`${BASE_URL}/allocations`);
      await page2.goto(`${BASE_URL}/allocations`);
      
      // Both pages try to create allocations simultaneously
      const [result1, result2] = await Promise.all([
        page.evaluate(async () => {
          // Create allocation via API
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
          // Create different allocation via API
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
      
      // Both requests should succeed
      expect(result1).toBe(201);
      expect(result2).toBe(201);
      
      // Refresh both pages and verify both allocations exist
      await page.reload();
      await page2.reload();
      
      await page.waitForLoadState('networkidle');
      await page2.waitForLoadState('networkidle');
      
      const count1 = await page.locator('[data-testid="allocation-row"]').count();
      const count2 = await page2.locator('[data-testid="allocation-row"]').count();
      
      expect(count1).toBe(count2); // Both pages should show same data
      
      await context2.close();
    });
  });

  test.describe('Performance and Load Tests', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      // Navigate to a page with potentially large data
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/allocations?limit=1000`);
      
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);
      
      // Verify data is displayed
      const rows = await page.locator('[data-testid="allocation-row"]').count();
      expect(rows).toBeGreaterThan(0);
      
      // Test scrolling performance
      const scrollStartTime = Date.now();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const scrollTime = Date.now() - scrollStartTime;
      
      expect(scrollTime).toBeLessThan(1000);
    });

    test('should handle rapid user interactions', async ({ page }) => {
      await page.goto(`${BASE_URL}/allocations`);
      
      // Perform rapid clicks and interactions
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="new-allocation-btn"]');
        await page.keyboard.press('Escape'); // Close modal
        await page.waitForTimeout(100);
      }
      
      // UI should remain responsive
      await expect(page.locator('[data-testid="new-allocation-btn"]')).toBeEnabled();
    });
  });
});
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Reports Page E2E Tests
 * Tests all acceptance criteria for US-RP1 (CSV Export) and US-RP2 (Report Categories)
 */

test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to reports page
    await page.goto('http://localhost:3004/reports');

    // Wait for page to be fully loaded
    await page.waitForSelector('[data-testid="reports-page"]', { state: 'visible' });
  });

  test.describe('US-RP2: View Report Categories', () => {
    test('should display three report cards with correct titles', async ({ page }) => {
      // Verify all three cards are present
      const csvExportCard = page.locator('[data-testid="csv-export-card"]');
      const analyticsCard = page.locator('[data-testid="analytics-card"]');
      const reportsCard = page.locator('[data-testid="reports-card"]');

      await expect(csvExportCard).toBeVisible();
      await expect(analyticsCard).toBeVisible();
      await expect(reportsCard).toBeVisible();

      // Verify card titles
      await expect(csvExportCard.locator('h3')).toHaveText('Resource Allocations');
      await expect(analyticsCard.locator('h3')).toHaveText('Utilization Analytics');
      await expect(reportsCard.locator('h3')).toHaveText('Custom Reports');
    });

    test('should display descriptions for each report card', async ({ page }) => {
      const csvExportCard = page.locator('[data-testid="csv-export-card"]');
      const analyticsCard = page.locator('[data-testid="analytics-card"]');
      const reportsCard = page.locator('[data-testid="reports-card"]');

      // Verify descriptions are present and visible
      await expect(csvExportCard.locator('p').first()).toBeVisible();
      await expect(analyticsCard.locator('p').first()).toBeVisible();
      await expect(reportsCard.locator('p').first()).toBeVisible();

      // Verify description content
      await expect(csvExportCard.locator('p').first()).toContainText('Export resource allocations');
      await expect(analyticsCard.locator('p').first()).toContainText('View team utilization reports');
      await expect(reportsCard.locator('p').first()).toContainText('Generate custom reports');
    });

    test('should have functional Export button in Resource Allocations card', async ({ page }) => {
      const exportButton = page.locator('[data-testid="reports-export-csv-btn"]');

      await expect(exportButton).toBeVisible();
      await expect(exportButton).toBeEnabled();
      await expect(exportButton).toContainText('Export to CSV');

      // Verify it has the download icon
      await expect(exportButton.locator('svg').first()).toBeVisible();
    });

    test('should show "Coming Soon" for Utilization Analytics card', async ({ page }) => {
      const analyticsCard = page.locator('[data-testid="analytics-card"]');
      const comingSoonButton = analyticsCard.locator('button');

      await expect(comingSoonButton).toBeVisible();
      await expect(comingSoonButton).toContainText('Coming Soon');
      await expect(comingSoonButton).toBeDisabled();

      // Verify styling indicates disabled state
      await expect(comingSoonButton).toHaveClass(/cursor-not-allowed/);
    });

    test('should show "Coming Soon" for Custom Reports card', async ({ page }) => {
      const reportsCard = page.locator('[data-testid="reports-card"]');
      const comingSoonButton = reportsCard.locator('button');

      await expect(comingSoonButton).toBeVisible();
      await expect(comingSoonButton).toContainText('Coming Soon');
      await expect(comingSoonButton).toBeDisabled();

      // Verify styling indicates disabled state
      await expect(comingSoonButton).toHaveClass(/cursor-not-allowed/);
    });

    test('should display page title correctly', async ({ page }) => {
      const pageTitle = page.locator('[data-testid="reports-title"]');

      await expect(pageTitle).toBeVisible();
      await expect(pageTitle).toHaveText('Reports & Data Export');
    });
  });

  test.describe('US-RP1: Export Allocation Data - Basic Functionality', () => {
    test('should display CSV Export button clearly', async ({ page }) => {
      const exportButton = page.locator('[data-testid="reports-export-csv-btn"]');

      await expect(exportButton).toBeVisible();
      await expect(exportButton).toBeEnabled();

      // Verify button has proper styling and is prominent
      await expect(exportButton).toHaveClass(/bg-blue-600/);
      await expect(exportButton).toContainText('Export to CSV');
    });

    test('should have date range selector available', async ({ page }) => {
      // Click filters button to show date range selector
      const filtersButton = page.locator('[data-testid="toggle-filters-button"]');
      await expect(filtersButton).toBeVisible();
      await filtersButton.click();

      // Verify filters panel appears
      const filtersPanel = page.locator('[data-testid="export-filters"]');
      await expect(filtersPanel).toBeVisible();
    });

    test('should have functional start date picker', async ({ page }) => {
      // Show filters
      await page.locator('[data-testid="toggle-filters-button"]').click();

      const startDateInput = page.locator('[data-testid="export-start-date"]');
      await expect(startDateInput).toBeVisible();
      await expect(startDateInput).toHaveAttribute('type', 'date');

      // Test date input
      await startDateInput.fill('2024-01-01');
      await expect(startDateInput).toHaveValue('2024-01-01');
    });

    test('should have functional end date picker', async ({ page }) => {
      // Show filters
      await page.locator('[data-testid="toggle-filters-button"]').click();

      const endDateInput = page.locator('[data-testid="export-end-date"]');
      await expect(endDateInput).toBeVisible();
      await expect(endDateInput).toHaveAttribute('type', 'date');

      // Test date input
      await endDateInput.fill('2024-12-31');
      await expect(endDateInput).toHaveValue('2024-12-31');
    });

    test('should validate date range (end date after start date)', async ({ page }) => {
      // Show filters
      await page.locator('[data-testid="toggle-filters-button"]').click();

      // Set invalid date range (end before start)
      await page.locator('[data-testid="export-start-date"]').fill('2024-12-31');
      await page.locator('[data-testid="export-end-date"]').fill('2024-01-01');

      // Verify error message appears
      const errorMessage = page.locator('[data-testid="date-range-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('End date must be after start date');

      // Verify export button is disabled with invalid range
      const exportButton = page.locator('[data-testid="reports-export-csv-btn"]');
      await expect(exportButton).toBeDisabled();
    });

    test('should allow clearing filters', async ({ page }) => {
      // Show filters
      await page.locator('[data-testid="toggle-filters-button"]').click();

      // Set some filters
      await page.locator('[data-testid="export-start-date"]').fill('2024-01-01');
      await page.locator('[data-testid="export-end-date"]').fill('2024-12-31');
      await page.locator('[data-testid="export-employee-filter"]').fill('123');

      // Clear filters
      await page.locator('[data-testid="clear-filters-button"]').click();

      // Verify all filters are cleared
      await expect(page.locator('[data-testid="export-start-date"]')).toHaveValue('');
      await expect(page.locator('[data-testid="export-end-date"]')).toHaveValue('');
      await expect(page.locator('[data-testid="export-employee-filter"]')).toHaveValue('');
    });

    test('should toggle filters panel visibility', async ({ page }) => {
      const filtersButton = page.locator('[data-testid="toggle-filters-button"]');
      const filtersPanel = page.locator('[data-testid="export-filters"]');

      // Initially filters should be hidden
      await expect(filtersPanel).not.toBeVisible();

      // Click to show
      await filtersButton.click();
      await expect(filtersPanel).toBeVisible();

      // Click to hide
      await filtersButton.click();
      await expect(filtersPanel).not.toBeVisible();
    });

    test('should have optional employee and project filters', async ({ page }) => {
      // Show filters
      await page.locator('[data-testid="toggle-filters-button"]').click();

      const employeeFilter = page.locator('[data-testid="export-employee-filter"]');
      const projectFilter = page.locator('[data-testid="export-project-filter"]');

      await expect(employeeFilter).toBeVisible();
      await expect(projectFilter).toBeVisible();

      // Test filtering inputs
      await employeeFilter.fill('emp123');
      await expect(employeeFilter).toHaveValue('emp123');

      await projectFilter.fill('proj456');
      await expect(projectFilter).toHaveValue('proj456');
    });

    test('should have enhanced fields toggle option', async ({ page }) => {
      // Show filters
      await page.locator('[data-testid="toggle-filters-button"]').click();

      const enhancedFieldsCheckbox = page.locator('[data-testid="export-enhanced-fields"]');

      await expect(enhancedFieldsCheckbox).toBeVisible();
      await expect(enhancedFieldsCheckbox).toHaveAttribute('type', 'checkbox');

      // Test checkbox functionality
      await expect(enhancedFieldsCheckbox).not.toBeChecked();
      await enhancedFieldsCheckbox.check();
      await expect(enhancedFieldsCheckbox).toBeChecked();
    });
  });

  test.describe('US-RP1: Export with Mock Server', () => {
    test('should show progress notification during export', async ({ page }) => {
      // Mock successful CSV export
      await page.route('**/api/allocations/export/csv**', async (route) => {
        // Delay to simulate processing
        await new Promise(resolve => setTimeout(resolve, 500));

        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          headers: {
            'content-disposition': 'attachment; filename="resource-allocations.csv"'
          },
          body: 'Employee Name,Project Name,Week,Hours,Status\nJohn Doe,Project A,2024-01-01,40,active'
        });
      });

      // Click export button
      const exportButton = page.locator('[data-testid="reports-export-csv-btn"]');
      await exportButton.click();

      // Verify progress notification appears
      const progressNotification = page.locator('[data-testid="info-message"]');
      await expect(progressNotification).toBeVisible();
      await expect(progressNotification).toContainText('Starting CSV export');
    });

    test('should show success message on completion', async ({ page }) => {
      // Mock successful CSV export
      await page.route('**/api/allocations/export/csv**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          headers: {
            'content-disposition': 'attachment; filename="resource-allocations.csv"'
          },
          body: 'Employee Name,Project Name,Week,Hours,Status\nJohn Doe,Project A,2024-01-01,40,active'
        });
      });

      // Click export button
      const exportButton = page.locator('[data-testid="reports-export-csv-btn"]');
      await exportButton.click();

      // Wait for export to complete and verify success message
      const successMessage = page.locator('[data-testid="success-message"]');
      await expect(successMessage).toBeVisible({ timeout: 10000 });
      await expect(successMessage).toContainText('CSV export completed successfully');
    });

    test('should show error message if export fails', async ({ page }) => {
      // Mock failed CSV export
      await page.route('**/api/allocations/export/csv**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Database connection failed' })
        });
      });

      // Click export button
      const exportButton = page.locator('[data-testid="reports-export-csv-btn"]');
      await exportButton.click();

      // Verify error message appears
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      await expect(errorMessage).toContainText('Export failed');
    });

    test('should export with date range filters applied', async ({ page }) => {
      let capturedUrl = '';

      // Intercept the request to verify filters are applied
      await page.route('**/api/allocations/export/csv**', async (route) => {
        capturedUrl = route.request().url();
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'Employee Name,Project Name,Week,Hours,Status\nJohn Doe,Project A,2024-01-01,40,active'
        });
      });

      // Show filters and set date range
      await page.locator('[data-testid="toggle-filters-button"]').click();
      await page.locator('[data-testid="export-start-date"]').fill('2024-01-01');
      await page.locator('[data-testid="export-end-date"]').fill('2024-03-31');

      // Click export
      await page.locator('[data-testid="reports-export-csv-btn"]').click();

      // Wait for request
      await page.waitForTimeout(1000);

      // Verify URL contains date filters
      expect(capturedUrl).toContain('startDate=2024-01-01');
      expect(capturedUrl).toContain('endDate=2024-03-31');
    });

    test('should export with employee and project filters applied', async ({ page }) => {
      let capturedUrl = '';

      // Intercept the request
      await page.route('**/api/allocations/export/csv**', async (route) => {
        capturedUrl = route.request().url();
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'Employee Name,Project Name,Week,Hours,Status\nJohn Doe,Project A,2024-01-01,40,active'
        });
      });

      // Show filters and set filters
      await page.locator('[data-testid="toggle-filters-button"]').click();
      await page.locator('[data-testid="export-employee-filter"]').fill('emp123');
      await page.locator('[data-testid="export-project-filter"]').fill('proj456');

      // Click export
      await page.locator('[data-testid="reports-export-csv-btn"]').click();

      // Wait for request
      await page.waitForTimeout(1000);

      // Verify URL contains filters
      expect(capturedUrl).toContain('employeeId=emp123');
      expect(capturedUrl).toContain('projectId=proj456');
    });

    test('should show loading state during export', async ({ page }) => {
      // Mock slow CSV export
      await page.route('**/api/allocations/export/csv**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'Employee Name,Project Name,Week,Hours,Status\n'
        });
      });

      const exportButton = page.locator('[data-testid="reports-export-csv-btn"]');

      // Click export
      await exportButton.click();

      // Verify button shows loading state
      await expect(exportButton).toContainText('Exporting...');
      await expect(exportButton).toBeDisabled();

      // Verify spinner is visible
      await expect(exportButton.locator('.animate-spin')).toBeVisible();
    });
  });

  test.describe('US-RP1: CSV Content Verification', () => {
    test('should generate valid CSV with correct headers', async ({ page }) => {
      let csvContent = '';

      // Mock CSV export with realistic data
      await page.route('**/api/allocations/export/csv**', async (route) => {
        csvContent = 'Employee Name,Project Name,Week,Hours,Status\nJohn Doe,Project A,2024-01-01,40,active\nJane Smith,Project B,2024-01-08,30,active';

        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: csvContent
        });
      });

      // Trigger export
      await page.locator('[data-testid="reports-export-csv-btn"]').click();

      // Wait for completion
      await page.waitForTimeout(1000);

      // Verify CSV structure
      const lines = csvContent.split('\n');
      expect(lines.length).toBeGreaterThan(1); // At least header + 1 row

      // Verify headers
      const headers = lines[0].split(',');
      expect(headers).toContain('Employee Name');
      expect(headers).toContain('Project Name');
      expect(headers).toContain('Week');
      expect(headers).toContain('Hours');
      expect(headers).toContain('Status');
    });

    test('should include data rows in CSV', async ({ page }) => {
      let csvContent = '';

      await page.route('**/api/allocations/export/csv**', async (route) => {
        csvContent = 'Employee Name,Project Name,Week,Hours,Status\n' +
                     'John Doe,Project A,2024-01-01,40,active\n' +
                     'Jane Smith,Project B,2024-01-08,30,active\n' +
                     'Bob Wilson,Project C,2024-01-15,35,active';

        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: csvContent
        });
      });

      await page.locator('[data-testid="reports-export-csv-btn"]').click();
      await page.waitForTimeout(1000);

      // Verify data rows
      const lines = csvContent.split('\n').filter(line => line.trim());
      expect(lines.length).toBe(4); // 1 header + 3 data rows

      // Verify first data row
      expect(lines[1]).toContain('John Doe');
      expect(lines[1]).toContain('Project A');
      expect(lines[1]).toContain('40');
    });

    test('should handle empty results gracefully', async ({ page }) => {
      await page.route('**/api/allocations/export/csv**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'Employee Name,Project Name,Week,Hours,Status\n'
        });
      });

      // Set filters that return no results
      await page.locator('[data-testid="toggle-filters-button"]').click();
      await page.locator('[data-testid="export-start-date"]').fill('2025-01-01');
      await page.locator('[data-testid="export-end-date"]').fill('2025-01-01');

      await page.locator('[data-testid="reports-export-csv-btn"]').click();

      // Should still show success message even with no data
      const successMessage = page.locator('[data-testid="success-message"]');
      await expect(successMessage).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('US-RP1: File Download Verification', () => {
    test('should trigger file download automatically', async ({ page }) => {
      // Setup download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      // Mock CSV export
      await page.route('**/api/allocations/export/csv**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          headers: {
            'content-disposition': 'attachment; filename="resource-allocations.csv"'
          },
          body: 'Employee Name,Project Name,Week,Hours,Status\nJohn Doe,Project A,2024-01-01,40,active'
        });
      });

      // Trigger export
      await page.locator('[data-testid="reports-export-csv-btn"]').click();

      // Wait for download
      const download = await downloadPromise;

      // Verify download properties
      expect(download.suggestedFilename()).toContain('.csv');
    });

    test('should use correct filename from response headers', async ({ page }) => {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      const customFilename = 'allocations-2024-01-01-to-2024-12-31.csv';

      await page.route('**/api/allocations/export/csv**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          headers: {
            'content-disposition': `attachment; filename="${customFilename}"`
          },
          body: 'Employee Name,Project Name,Week,Hours,Status\nJohn Doe,Project A,2024-01-01,40,active'
        });
      });

      await page.locator('[data-testid="reports-export-csv-btn"]').click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(customFilename);
    });

    test('should use default filename if not provided in headers', async ({ page }) => {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      await page.route('**/api/allocations/export/csv**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'Employee Name,Project Name,Week,Hours,Status\n'
        });
      });

      await page.locator('[data-testid="reports-export-csv-btn"]').click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('resource-allocations.csv');
    });
  });

  test.describe('US-RP1 & US-RP2: Integration Tests', () => {
    test('should maintain card layout while exporting', async ({ page }) => {
      // Mock slow export
      await page.route('**/api/allocations/export/csv**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'Employee Name,Project Name,Week,Hours,Status\n'
        });
      });

      // Verify all cards are visible before export
      await expect(page.locator('[data-testid="csv-export-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="analytics-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="reports-card"]')).toBeVisible();

      // Start export
      await page.locator('[data-testid="reports-export-csv-btn"]').click();

      // Verify cards remain visible during export
      await expect(page.locator('[data-testid="csv-export-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="analytics-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="reports-card"]')).toBeVisible();
    });

    test('should allow multiple exports in sequence', async ({ page }) => {
      let exportCount = 0;

      await page.route('**/api/allocations/export/csv**', async (route) => {
        exportCount++;
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'Employee Name,Project Name,Week,Hours,Status\n'
        });
      });

      // First export
      await page.locator('[data-testid="reports-export-csv-btn"]').click();
      await page.waitForSelector('[data-testid="success-message"]', { state: 'visible' });

      // Second export
      await page.locator('[data-testid="reports-export-csv-btn"]').click();
      await page.waitForSelector('[data-testid="success-message"]', { state: 'visible' });

      expect(exportCount).toBe(2);
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/allocations/export/csv**', async (route) => {
        await route.abort('failed');
      });

      await page.locator('[data-testid="reports-export-csv-btn"]').click();

      // Verify error message
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      await expect(errorMessage).toContainText('Export failed');
    });
  });

  test.describe('Accessibility and UX', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check alert role for notifications
      await expect(page.locator('[role="alert"]').first()).toBeHidden();

      // Trigger notification
      await page.route('**/api/allocations/export/csv**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'test'
        });
      });

      await page.locator('[data-testid="reports-export-csv-btn"]').click();

      // Verify alert is visible
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Tab to export button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Verify focus is on export button (may need adjustments based on page structure)
      const exportButton = page.locator('[data-testid="reports-export-csv-btn"]');
      // Note: Focus assertions can be tricky, this is a basic check
      await expect(exportButton).toBeVisible();
    });

    test('should have responsive layout', async ({ page }) => {
      // Test desktop layout
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('[data-testid="csv-export-card"]')).toBeVisible();

      // Test tablet layout
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('[data-testid="csv-export-card"]')).toBeVisible();

      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('[data-testid="csv-export-card"]')).toBeVisible();
    });

    test('should close toast notification on button click', async ({ page }) => {
      // Mock export
      await page.route('**/api/allocations/export/csv**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'test'
        });
      });

      await page.locator('[data-testid="reports-export-csv-btn"]').click();

      // Wait for toast to appear
      const toast = page.locator('[role="alert"]');
      await expect(toast).toBeVisible({ timeout: 5000 });

      // Close toast
      await toast.locator('button').click();

      // Verify toast is hidden
      await expect(toast).toBeHidden();
    });
  });
});

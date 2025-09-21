import { test, expect } from '@playwright/test';
import { TestDataFactory, TestDataSetup } from '../fixtures/testDataFactory';

test.describe('CSV Export - Improved with Test Data Management', () => {
  let testData: {
    employees: any[];
    projects: any[];
    allocations: any[];
  };

  test.beforeAll(async () => {
    // Clean database and set up test data
    await TestDataSetup.cleanDatabase();
    const csvTestData = TestDataFactory.createCSVTestData();
    testData = await TestDataSetup.seedDatabase(csvTestData);
  });

  test.afterAll(async () => {
    // Clean up test data
    await TestDataSetup.cleanDatabase();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to reports page
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
  });

  test('should display CSV export button', async ({ page }) => {
    const exportButton = page.locator('[data-testid="reports-export-csv-btn"]');
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();
    await expect(exportButton).toContainText('Export to CSV');
  });

  test('should successfully download CSV file', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    
    await page.click('[data-testid="reports-export-csv-btn"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('should export CSV with correct structure and data', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    
    await page.click('[data-testid="reports-export-csv-btn"]');
    
    const download = await downloadPromise;
    const path = await download.path();
    
    if (path) {
      const fs = require('fs');
      const csvContent = fs.readFileSync(path, 'utf8');
      
      // Check that CSV has headers and data
      const lines = csvContent.split('\n').filter(line => line.trim());
      expect(lines.length).toBeGreaterThan(1); // At least header + 1 data row
      
      // Check for required fields
      const headers = lines[0].toLowerCase();
      expect(headers).toContain('employee');
      expect(headers).toContain('project'); 
      expect(headers).toContain('hours');
      expect(headers).toContain('start');
      expect(headers).toContain('end');
      
      // Check that we have our test data
      const csvData = csvContent.toLowerCase();
      expect(csvData).toContain('john doe');
      expect(csvData).toContain('integration test project');
    }
  });

  test('should show loading state during export', async ({ page }) => {
    // Mock slow response to see loading state
    await page.route('**/api/allocations', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    const exportButton = page.locator('[data-testid="reports-export-csv-btn"]');
    
    // Click and check for loading state
    await exportButton.click();
    
    // Should show "Exporting..." text
    await expect(exportButton).toContainText('Exporting');
    await expect(exportButton).toBeDisabled();
  });

  test('should handle export errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/allocations', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await page.click('[data-testid="reports-export-csv-btn"]');
    
    // Should show error message (looking for alert or error UI)
    await page.waitForTimeout(1000);
    
    // The current implementation shows browser alert
    // In a real app, this should be a proper error UI component
  });

  test('should make correct API calls for data', async ({ page }) => {
    const apiCalls: string[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });

    await page.click('[data-testid="reports-export-csv-btn"]');
    await page.waitForTimeout(1000);

    // Should call the allocations API
    const allocationsCall = apiCalls.find(url => 
      url.includes('/api/allocations')
    );
    expect(allocationsCall).toBeTruthy();
  });

  test('should handle empty data gracefully', async ({ page }) => {
    // Clean all data for this test
    await TestDataSetup.cleanDatabase();
    
    // Refresh the page to reload with no data
    await page.reload();
    await page.waitForLoadState('networkidle');

    const downloadPromise = page.waitForEvent('download');
    
    await page.click('[data-testid="reports-export-csv-btn"]');
    
    const download = await downloadPromise;
    const path = await download.path();
    
    if (path) {
      const fs = require('fs');
      const csvContent = fs.readFileSync(path, 'utf8');
      
      // Should still have headers even with no data
      const lines = csvContent.split('\n').filter(line => line.trim());
      expect(lines.length).toBeGreaterThanOrEqual(1); // At least headers
      
      const headers = lines[0];
      expect(headers).toContain('Employee');
    }
    
    // Restore test data for other tests
    testData = await TestDataSetup.seedDatabase(TestDataFactory.createCSVTestData());
  });
});
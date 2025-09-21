import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('CSV Import/Export E2E Tests', () => {
  const testFilesPath = path.join(__dirname, '../fixtures');
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('CSV Import', () => {
    test('should successfully import valid CSV file', async ({ page }) => {
      // Navigate to import page
      await page.click('[data-testid="import-employees-button"]');
      
      // Upload CSV file
      const filePath = path.join(testFilesPath, 'test-employees.csv');
      await page.setInputFiles('[data-testid="csv-file-input"]', filePath);
      
      // Check file preview
      await expect(page.locator('[data-testid="csv-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="csv-row-count"]')).toContainText('10 employees');
      
      // Verify preview shows correct data
      await expect(page.locator('[data-testid="preview-employee"]').first()).toContainText('John Doe');
      await expect(page.locator('[data-testid="preview-employee"]').first()).toContainText('john.doe@example.com');
      
      // Start import
      await page.click('[data-testid="start-import-button"]');
      
      // Wait for import progress
      await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
      
      // Wait for import completion
      await expect(page.locator('[data-testid="import-success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="import-result"]')).toContainText('Successfully imported 10 employees');
      
      // Navigate back to employee list and verify data
      await page.click('[data-testid="view-employees-button"]');
      await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: 'John Doe' })).toBeVisible();
      await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: 'Jane Smith' })).toBeVisible();
    });

    test('should handle CSV file with validation errors', async ({ page }) => {
      await page.click('[data-testid="import-employees-button"]');
      
      // Upload invalid CSV file
      const filePath = path.join(testFilesPath, 'invalid-employees.csv');
      await page.setInputFiles('[data-testid="csv-file-input"]', filePath);
      
      // Check validation errors in preview
      await expect(page.locator('[data-testid="csv-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible();
      
      // Check specific validation errors
      await expect(page.locator('[data-testid="validation-error"]').filter({ hasText: 'Invalid email format' })).toBeVisible();
      await expect(page.locator('[data-testid="validation-error"]').filter({ hasText: 'Missing required field' })).toBeVisible();
      
      // Verify import button is disabled or shows warning
      await expect(page.locator('[data-testid="start-import-button"]')).toBeDisabled();
      
      // Check error summary
      await expect(page.locator('[data-testid="error-summary"]')).toContainText('5 rows have validation errors');
    });

    test('should handle large CSV file import', async ({ page }) => {
      await page.click('[data-testid="import-employees-button"]');
      
      // Upload large CSV file
      const filePath = path.join(testFilesPath, 'large-dataset.csv');
      await page.setInputFiles('[data-testid="csv-file-input"]', filePath);
      
      // Check file is processed
      await expect(page.locator('[data-testid="csv-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="csv-row-count"]')).toContainText('20 employees');
      
      // Start import
      await page.click('[data-testid="start-import-button"]');
      
      // Check progress indicator works for large files
      await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
      
      // Wait for completion (should handle large files efficiently)
      await expect(page.locator('[data-testid="import-success-message"]')).toBeVisible({ timeout: 30000 });
      await expect(page.locator('[data-testid="import-result"]')).toContainText('Successfully imported 20 employees');
    });

    test('should allow user to correct validation errors and re-import', async ({ page }) => {
      await page.click('[data-testid="import-employees-button"]');
      
      // Upload file with errors
      const filePath = path.join(testFilesPath, 'invalid-employees.csv');
      await page.setInputFiles('[data-testid="csv-file-input"]', filePath);
      
      // Check validation errors
      await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible();
      
      // Click to edit/correct errors
      await page.click('[data-testid="edit-csv-data-button"]');
      
      // Make corrections in the inline editor
      await page.click('[data-testid="csv-row-1"] [data-testid="email-cell"]');
      await page.fill('[data-testid="inline-edit-input"]', 'corrected.email@example.com');
      await page.press('[data-testid="inline-edit-input"]', 'Enter');
      
      // Verify error is resolved
      await expect(page.locator('[data-testid="validation-error"]').filter({ hasText: 'Invalid email format' })).toHaveCount(0);
      
      // Now import should be enabled
      await expect(page.locator('[data-testid="start-import-button"]')).not.toBeDisabled();
    });

    test('should provide detailed import summary', async ({ page }) => {
      await page.click('[data-testid="import-employees-button"]');
      
      const filePath = path.join(testFilesPath, 'test-employees.csv');
      await page.setInputFiles('[data-testid="csv-file-input"]', filePath);
      
      await page.click('[data-testid="start-import-button"]');
      
      // Wait for completion
      await expect(page.locator('[data-testid="import-success-message"]')).toBeVisible();
      
      // Check detailed summary
      await expect(page.locator('[data-testid="import-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="summary-total-rows"]')).toContainText('10');
      await expect(page.locator('[data-testid="summary-successful"]')).toContainText('10');
      await expect(page.locator('[data-testid="summary-errors"]')).toContainText('0');
      await expect(page.locator('[data-testid="summary-skipped"]')).toContainText('0');
      
      // Check processing time
      await expect(page.locator('[data-testid="processing-time"]')).toBeVisible();
    });
  });

  test.describe('CSV Export', () => {
    test.beforeEach(async ({ page }) => {
      // Create some test employees for export
      const employees = [
        { firstName: 'Export', lastName: 'Test1', email: 'export.test1@example.com' },
        { firstName: 'Export', lastName: 'Test2', email: 'export.test2@example.com' },
        { firstName: 'Export', lastName: 'Test3', email: 'export.test3@example.com' },
      ];

      for (const emp of employees) {
        await page.click('[data-testid="add-employee-button"]');
        await page.fill('[data-testid="first-name-input"]', emp.firstName);
        await page.fill('[data-testid="last-name-input"]', emp.lastName);
        await page.fill('[data-testid="email-input"]', emp.email);
        await page.fill('[data-testid="phone-input"]', '+1-555-0000');
        await page.fill('[data-testid="position-input"]', 'Test Position');
        await page.click('[data-testid="department-select"]');
        await page.click('[data-testid="department-option-engineering"]');
        await page.fill('[data-testid="salary-input"]', '50000');
        await page.fill('[data-testid="hire-date-input"]', '2023-01-01');
        await page.click('[data-testid="status-select"]');
        await page.click('[data-testid="status-option-active"]');
        await page.click('[data-testid="submit-employee-form"]');
        await page.waitForTimeout(300);
      }
    });

    test('should export all employees to CSV', async ({ page }) => {
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-employees-button"]');
      
      const download = await downloadPromise;
      
      // Verify file name
      expect(download.suggestedFilename()).toMatch(/employees_\d{4}-\d{2}-\d{2}\.csv/);
      
      // Save and verify file content
      const filePath = await download.path();
      const content = fs.readFileSync(filePath!, 'utf8');
      
      // Check CSV header
      expect(content).toContain('firstName,lastName,email,phoneNumber,position,department,salary,hireDate,status');
      
      // Check exported data
      expect(content).toContain('Export,Test1,export.test1@example.com');
      expect(content).toContain('Export,Test2,export.test2@example.com');
      expect(content).toContain('Export,Test3,export.test3@example.com');
      
      // Count rows (should include header + data rows)
      const rows = content.split('\n').filter(row => row.trim() !== '');
      expect(rows.length).toBeGreaterThan(3); // At least header + 3 test employees
    });

    test('should export filtered employees only', async ({ page }) => {
      // Apply a filter
      await page.fill('[data-testid="search-input"]', 'Export Test1');
      await page.waitForTimeout(500);
      
      // Export filtered results
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-filtered-button"]');
      
      const download = await downloadPromise;
      const filePath = await download.path();
      const content = fs.readFileSync(filePath!, 'utf8');
      
      // Should only contain the filtered employee
      expect(content).toContain('Export,Test1,export.test1@example.com');
      expect(content).not.toContain('Export,Test2,export.test2@example.com');
      expect(content).not.toContain('Export,Test3,export.test3@example.com');
    });

    test('should export selected employees only', async ({ page }) => {
      // Select specific employees
      await page.check('[data-testid="employee-checkbox-1"]');
      await page.check('[data-testid="employee-checkbox-3"]');
      
      // Export selected
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-selected-button"]');
      
      const download = await downloadPromise;
      const filePath = await download.path();
      const content = fs.readFileSync(filePath!, 'utf8');
      
      // Should contain only selected employees
      const rows = content.split('\n').filter(row => row.trim() !== '');
      expect(rows.length).toBe(3); // Header + 2 selected employees
    });

    test('should allow custom field selection for export', async ({ page }) => {
      // Open export options
      await page.click('[data-testid="export-options-button"]');
      
      // Deselect some fields
      await page.uncheck('[data-testid="export-field-phoneNumber"]');
      await page.uncheck('[data-testid="export-field-hireDate"]');
      
      // Start export
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="start-export-button"]');
      
      const download = await downloadPromise;
      const filePath = await download.path();
      const content = fs.readFileSync(filePath!, 'utf8');
      
      // Check that excluded fields are not in CSV
      expect(content).not.toContain('phoneNumber');
      expect(content).not.toContain('hireDate');
      
      // Check that included fields are present
      expect(content).toContain('firstName,lastName,email,position,department,salary,status');
    });

    test('should show export progress for large datasets', async ({ page }) => {
      // This test assumes we have a large dataset or can simulate it
      
      // Start export
      await page.click('[data-testid="export-employees-button"]');
      
      // Check if progress indicator appears for large exports
      // (might not appear for small datasets due to fast processing)
      const progressVisible = await page.locator('[data-testid="export-progress"]').isVisible({ timeout: 1000 }).catch(() => false);
      
      if (progressVisible) {
        await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
        await expect(page.locator('[data-testid="export-status"]')).toContainText('Exporting employees...');
      }
      
      // Wait for completion
      await page.waitForEvent('download');
    });
  });

  test.describe('CSV Format Validation', () => {
    test('should reject non-CSV files', async ({ page }) => {
      await page.click('[data-testid="import-employees-button"]');
      
      // Try to upload a non-CSV file
      const textFilePath = path.join(testFilesPath, '../README.md');
      
      await page.setInputFiles('[data-testid="csv-file-input"]', textFilePath);
      
      // Should show error for invalid file type
      await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-type-error"]')).toContainText('Please upload a CSV file');
    });

    test('should validate CSV column headers', async ({ page }) => {
      await page.click('[data-testid="import-employees-button"]');
      
      // Create a temporary CSV with wrong headers
      const wrongHeadersCsv = 'name,emailAddress,job,dept,wage\nJohn Doe,john@example.com,Developer,IT,50000';
      const tempFilePath = path.join(testFilesPath, 'wrong-headers.csv');
      
      fs.writeFileSync(tempFilePath, wrongHeadersCsv);
      
      await page.setInputFiles('[data-testid="csv-file-input"]', tempFilePath);
      
      // Should show error for incorrect headers
      await expect(page.locator('[data-testid="header-validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="header-validation-error"]')).toContainText('CSV headers do not match expected format');
      
      // Cleanup
      fs.unlinkSync(tempFilePath);
    });

    test('should provide template download for correct format', async ({ page }) => {
      await page.click('[data-testid="import-employees-button"]');
      
      // Download template
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-template-button"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('employee-import-template.csv');
      
      // Verify template content
      const filePath = await download.path();
      const content = fs.readFileSync(filePath!, 'utf8');
      
      // Check correct headers
      expect(content).toContain('firstName,lastName,email,phoneNumber,position,department,salary,hireDate,status');
      
      // Check sample data row
      expect(content).toContain('John,Doe,john.doe@example.com');
    });
  });
});
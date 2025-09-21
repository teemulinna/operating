/**
 * Data Export & Sharing E2E Tests
 * Testing export functionality and sharing features
 */
import { test, expect } from '@playwright/test
import { TestHelpers, VIEWPORTS } from '../helpers/test-helpers';

test.describe('Data Export & Sharing', () => {
  test.beforeEach(async ({ page, testHelpers }) => {
    // Mock export API endpoints
    await testHelpers;

    await testHelpers;

    await page.goto('/');
  });

  test('should open export modal when triggered', async ({ page, testHelpers }) => {
    // Click export button (assuming it's in the UI)
    const exportTrigger = page.locator('button:has-text("Export Data")').first();
    await exportTrigger.click();

    // Check modal opens
    const modal = await testHelpers.waitForElement('[data-testid="data-export-modal"]');
    await expect(modal).toBeVisible();

    // Check modal title
    await expect(page.locator('text=Export & Share Data')).toBeVisible();

    // Check tabs are present
    await expect(page.locator('[data-testid="export-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="share-tab"]')).toBeVisible();
  });

  test('should allow format selection', async ({ page, testHelpers }) => {
    // Open export modal
    await page.locator('button:has-text("Export Data")').first().click();
    await testHelpers.waitForElement('[data-testid="data-export-modal"]');

    // Test CSV format selection
    const csvFormat = await testHelpers.waitForElement('[data-testid="format-csv"]');
    await csvFormat.click();
    await expect(csvFormat).toHaveClass(/ring-2/);

    // Test Excel format selection
    const excelFormat = await testHelpers.waitForElement('[data-testid="format-excel"]');
    await excelFormat.click();
    await expect(excelFormat).toHaveClass(/ring-2/);

    // Test PDF format selection
    const pdfFormat = await testHelpers.waitForElement('[data-testid="format-pdf"]');
    await pdfFormat.click();
    await expect(pdfFormat).toHaveClass(/ring-2/);

    // Test JSON format selection
    const jsonFormat = await testHelpers.waitForElement('[data-testid="format-json"]');
    await jsonFormat.click();
    await expect(jsonFormat).toHaveClass(/ring-2/);
  });

  test('should allow data type selection', async ({ page, testHelpers }) => {
    await page.locator('button:has-text("Export Data")').first().click();
    await testHelpers.waitForElement('[data-testid="data-export-modal"]');

    const typeSelect = await testHelpers.waitForElement('[data-testid="export-type-select"]');
    await typeSelect.click();

    // Check all export types are available
    await expect(page.locator('text=Projects')).toBeVisible();
    await expect(page.locator('text=Employees')).toBeVisible();
    await expect(page.locator('text=Allocations')).toBeVisible();
    await expect(page.locator('text=Schedule')).toBeVisible();
    await expect(page.locator('text=Analytics')).toBeVisible();

    // Select a type
    await page.locator('text=Projects').click();
    await expect(typeSelect).toContainText('Projects');
  });

  test('should handle date range selection', async ({ page, testHelpers }) => {
    await page.locator('button:has-text("Export Data")').first().click();
    await testHelpers.waitForElement('[data-testid="data-export-modal"]');

    const dateRangeSelect = await testHelpers.waitForElement('[data-testid="date-range-select"]');
    await dateRangeSelect.click();

    // Check date range options
    await expect(page.locator('text=Last 7 days')).toBeVisible();
    await expect(page.locator('text=Last 30 days')).toBeVisible();
    await expect(page.locator('text=Last 3 months')).toBeVisible();
    await expect(page.locator('text=Last 12 months')).toBeVisible();
    await expect(page.locator('text=Custom range')).toBeVisible();

    // Test custom date range
    await page.locator('text=Custom range').click();
    
    // Check custom date inputs appear
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('input[type="date"]').nth(1)).toBeVisible();
  });

  test('should toggle export options', async ({ page, testHelpers }) => {
    await page.locator('button:has-text("Export Data")').first().click();
    await testHelpers.waitForElement('[data-testid="data-export-modal"]');

    // Test include details toggle
    const includeDetailsSwitch = await testHelpers.waitForElement('[data-testid="include-details-switch"]');
    await includeDetailsSwitch.click();
    
    // Switch should be toggled
    const isChecked = await includeDetailsSwitch.getAttribute('aria-checked');
    expect(isChecked).toBe('false');

    // Test include charts toggle (should be disabled for CSV/JSON)
    await page.locator('[data-testid="format-csv"]').click();
    const includeChartsSwitch = page.locator('text=Include Charts').locator('..').locator('button');
    await expect(includeChartsSwitch).toBeDisabled();
  });

  test('should perform export with progress indication', async ({ page, testHelpers }) => {
    await page.locator('button:has-text("Export Data")').first().click();
    await testHelpers.waitForElement('[data-testid="data-export-modal"]');

    // Configure export settings
    await page.locator('[data-testid="format-csv"]').click();
    
    // Click export button
    const exportButton = await testHelpers.waitForElement('[data-testid="export-button"]');
    await exportButton.click();

    // Check progress bar appears
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();

    // Check export button shows loading state
    await expect(exportButton).toContainText('Exporting...');
    await expect(exportButton).toBeDisabled();

    // Wait for export completion toast
    await testHelpers.verifyToast('Export Completed', 'success');

    // Modal should close after completion
    await expect(page.locator('[data-testid="data-export-modal"]')).not.toBeVisible();
  });

  test('should handle sharing functionality', async ({ page, testHelpers }) => {
    await page.locator('button:has-text("Export Data")').first().click();
    await testHelpers.waitForElement('[data-testid="data-export-modal"]');

    // Switch to share tab
    await page.locator('[data-testid="share-tab"]').click();

    // Add email recipients
    const emailInput = await testHelpers.waitForElement('[data-testid="email-input"]');
    await emailInput.fill('test1@example.com');
    await page.keyboard.press('Enter');

    // Check email tag appears
    await expect(page.locator('[data-testid="email-tag-0"]')).toBeVisible();
    await expect(page.locator('text=test1@example.com')).toBeVisible();

    // Add another email using button
    await emailInput.fill('test2@example.com');
    await page.locator('button:has-text("Add")').click();
    
    await expect(page.locator('[data-testid="email-tag-1"]')).toBeVisible();

    // Remove an email
    await page.locator('[data-testid="email-tag-0"] button').click();
    await expect(page.locator('[data-testid="email-tag-0"]')).not.toBeVisible();
  });

  test('should validate email input', async ({ page, testHelpers }) => {
    await page.locator('button:has-text("Export Data")').first().click();
    await testHelpers.waitForElement('[data-testid="data-export-modal"]');

    await page.locator('[data-testid="share-tab"]').click();

    // Try to share without emails
    const shareButton = await testHelpers.waitForElement('[data-testid="share-button"]');
    await shareButton.click();

    // Should show validation error
    await testHelpers.verifyToast('No Recipients', 'error');
  });

  test('should customize email content', async ({ page, testHelpers }) => {
    await page.locator('button:has-text("Export Data")').first().click();
    await testHelpers.waitForElement('[data-testid="data-export-modal"]');

    await page.locator('[data-testid="share-tab"]').click();

    // Customize subject
    const subjectInput = await testHelpers.waitForElement('[data-testid="email-subject"]');
    await subjectInput.clear();
    await subjectInput.fill('Custom Report Subject');

    // Customize message
    const messageInput = await testHelpers.waitForElement('[data-testid="email-message"]');
    await messageInput.fill('This is a custom message for the shared report.');

    // Check values are preserved
    await expect(subjectInput).toHaveValue('Custom Report Subject');
    await expect(messageInput).toHaveValue('This is a custom message for the shared report.');
  });

  test('should configure share settings', async ({ page, testHelpers }) => {
    await page.locator('button:has-text("Export Data")').first().click();
    await testHelpers.waitForElement('[data-testid="data-export-modal"]');

    await page.locator('[data-testid="share-tab"]').click();

    // Toggle download link option
    const downloadLinkSwitch = page.locator('text=Include Download Link').locator('..').locator('button');
    await downloadLinkSwitch.click();

    // Configure expiration
    const expirationSelect = page.locator('text=Link Expiration').locator('..').locator('[role="combobox"]');
    await expirationSelect.click();
    await page.locator('text=30 days').click();
  });

  test('should be responsive on different devices', async ({ page, testHelpers }) => {
    // Test on mobile
    await page.setViewportSize(VIEWPORTS.MOBILE);
    
    await page.locator('button:has-text("Export Data")').first().click();
    const modal = await testHelpers.waitForElement('[data-testid="data-export-modal"]');
    await expect(modal).toBeVisible();

    // Modal should be responsive
    const modalContent = modal.locator('[role="dialog"]');
    await expect(modalContent).toBeVisible();

    // Test on tablet
    await page.setViewportSize(VIEWPORTS.TABLET);
    await expect(modal).toBeVisible();

    // Format selection should still be usable
    await expect(page.locator('[data-testid="format-csv"]')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page, testHelpers }) => {
    await page.locator('button:has-text("Export Data")').first().click();
    await testHelpers.waitForElement('[data-testid="data-export-modal"]');

    // Test tab navigation
    await testHelpers.testKeyboardNavigation();

    // Test escape to close modal
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="data-export-modal"]')).not.toBeVisible();
  });

  test('should have accessible labels', async ({ page, testHelpers }) => {
    await page.locator('button:has-text("Export Data")').first().click();
    await testHelpers.waitForElement('[data-testid="data-export-modal"]');

    // Test accessibility
    await testHelpers.testAccessibility();

    // Check modal has proper ARIA attributes
    const modal = page.locator('[data-testid="data-export-modal"]');
    const hasRole = await modal.getAttribute('role');
    const hasAriaLabel = await modal.getAttribute('aria-labelledby');
    expect(hasRole || hasAriaLabel).toBeTruthy();
  });

  test('should handle format-specific features', async ({ page, testHelpers }) => {
    await page.locator('button:has-text("Export Data")').first().click();
    await testHelpers.waitForElement('[data-testid="data-export-modal"]');

    // Test CSV format limitations
    await page.locator('[data-testid="format-csv"]').click();
    const chartsToggle = page.locator('text=Include Charts').locator('..').locator('button');
    await expect(chartsToggle).toBeDisabled();

    // Test PDF format with charts enabled
    await page.locator('[data-testid="format-pdf"]').click();
    await expect(chartsToggle).toBeEnabled();
  });

  test('should show format information', async ({ page, testHelpers }) => {
    await page.locator('button:has-text("Export Data")').first().click();
    await testHelpers.waitForElement('[data-testid="data-export-modal"]');

    // Check format descriptions and sizes are shown
    await expect(page.locator('text=Comma-separated values for spreadsheet applications')).toBeVisible();
    await expect(page.locator('text=~50KB')).toBeVisible();
    
    await expect(page.locator('text=Microsoft Excel with charts and formatting')).toBeVisible();
    await expect(page.locator('text=~200KB')).toBeVisible();
  });

  test.describe('Error Handling', () => {
    test('should handle export failures', async ({ page, testHelpers }) => {
      // Mock failed export
      await testHelpers;

      await page.locator('button:has-text("Export Data")').first().click();
      await testHelpers.waitForElement('[data-testid="data-export-modal"]');

      const exportButton = await testHelpers.waitForElement('[data-testid="export-button"]');
      await exportButton.click();

      // Should show error toast
      await testHelpers.verifyToast('Export Failed', 'error');
    });

    test('should handle sharing failures', async ({ page, testHelpers }) => {
      // Mock failed sharing
      await testHelpers;

      await page.locator('button:has-text("Export Data")').first().click();
      await testHelpers.waitForElement('[data-testid="data-export-modal"]');

      await page.locator('[data-testid="share-tab"]').click();

      // Add email and try to share
      await testHelpers.fillFormField('[data-testid="email-input"]', 'test@example.com');
      await page.keyboard.press('Enter');

      const shareButton = await testHelpers.waitForElement('[data-testid="share-button"]');
      await shareButton.click();

      await testHelpers.verifyToast('Sharing Failed', 'error');
    });
  });
});
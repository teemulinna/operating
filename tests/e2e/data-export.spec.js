"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const test_helpers_1 = require("../helpers/test-helpers");
test_1.test.describe('Data Export & Sharing', () => {
    test_1.test.beforeEach(async ({ page, testHelpers }) => {
        await testHelpers;
        await testHelpers;
        await page.goto('/');
    });
    (0, test_1.test)('should open export modal when triggered', async ({ page, testHelpers }) => {
        const exportTrigger = page.locator('button:has-text("Export Data")').first();
        await exportTrigger.click();
        const modal = await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        await (0, test_1.expect)(modal).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Export & Share Data')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="export-tab"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="share-tab"]')).toBeVisible();
    });
    (0, test_1.test)('should allow format selection', async ({ page, testHelpers }) => {
        await page.locator('button:has-text("Export Data")').first().click();
        await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        const csvFormat = await testHelpers.waitForElement('[data-testid="format-csv"]');
        await csvFormat.click();
        await (0, test_1.expect)(csvFormat).toHaveClass(/ring-2/);
        const excelFormat = await testHelpers.waitForElement('[data-testid="format-excel"]');
        await excelFormat.click();
        await (0, test_1.expect)(excelFormat).toHaveClass(/ring-2/);
        const pdfFormat = await testHelpers.waitForElement('[data-testid="format-pdf"]');
        await pdfFormat.click();
        await (0, test_1.expect)(pdfFormat).toHaveClass(/ring-2/);
        const jsonFormat = await testHelpers.waitForElement('[data-testid="format-json"]');
        await jsonFormat.click();
        await (0, test_1.expect)(jsonFormat).toHaveClass(/ring-2/);
    });
    (0, test_1.test)('should allow data type selection', async ({ page, testHelpers }) => {
        await page.locator('button:has-text("Export Data")').first().click();
        await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        const typeSelect = await testHelpers.waitForElement('[data-testid="export-type-select"]');
        await typeSelect.click();
        await (0, test_1.expect)(page.locator('text=Projects')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Employees')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Allocations')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Schedule')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Analytics')).toBeVisible();
        await page.locator('text=Projects').click();
        await (0, test_1.expect)(typeSelect).toContainText('Projects');
    });
    (0, test_1.test)('should handle date range selection', async ({ page, testHelpers }) => {
        await page.locator('button:has-text("Export Data")').first().click();
        await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        const dateRangeSelect = await testHelpers.waitForElement('[data-testid="date-range-select"]');
        await dateRangeSelect.click();
        await (0, test_1.expect)(page.locator('text=Last 7 days')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Last 30 days')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Last 3 months')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Last 12 months')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Custom range')).toBeVisible();
        await page.locator('text=Custom range').click();
        await (0, test_1.expect)(page.locator('input[type="date"]').first()).toBeVisible();
        await (0, test_1.expect)(page.locator('input[type="date"]').nth(1)).toBeVisible();
    });
    (0, test_1.test)('should toggle export options', async ({ page, testHelpers }) => {
        await page.locator('button:has-text("Export Data")').first().click();
        await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        const includeDetailsSwitch = await testHelpers.waitForElement('[data-testid="include-details-switch"]');
        await includeDetailsSwitch.click();
        const isChecked = await includeDetailsSwitch.getAttribute('aria-checked');
        (0, test_1.expect)(isChecked).toBe('false');
        await page.locator('[data-testid="format-csv"]').click();
        const includeChartsSwitch = page.locator('text=Include Charts').locator('..').locator('button');
        await (0, test_1.expect)(includeChartsSwitch).toBeDisabled();
    });
    (0, test_1.test)('should perform export with progress indication', async ({ page, testHelpers }) => {
        await page.locator('button:has-text("Export Data")').first().click();
        await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        await page.locator('[data-testid="format-csv"]').click();
        const exportButton = await testHelpers.waitForElement('[data-testid="export-button"]');
        await exportButton.click();
        const progressBar = page.locator('[role="progressbar"]');
        await (0, test_1.expect)(progressBar).toBeVisible();
        await (0, test_1.expect)(exportButton).toContainText('Exporting...');
        await (0, test_1.expect)(exportButton).toBeDisabled();
        await testHelpers.verifyToast('Export Completed', 'success');
        await (0, test_1.expect)(page.locator('[data-testid="data-export-modal"]')).not.toBeVisible();
    });
    (0, test_1.test)('should handle sharing functionality', async ({ page, testHelpers }) => {
        await page.locator('button:has-text("Export Data")').first().click();
        await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        await page.locator('[data-testid="share-tab"]').click();
        const emailInput = await testHelpers.waitForElement('[data-testid="email-input"]');
        await emailInput.fill('test1@example.com');
        await page.keyboard.press('Enter');
        await (0, test_1.expect)(page.locator('[data-testid="email-tag-0"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=test1@example.com')).toBeVisible();
        await emailInput.fill('test2@example.com');
        await page.locator('button:has-text("Add")').click();
        await (0, test_1.expect)(page.locator('[data-testid="email-tag-1"]')).toBeVisible();
        await page.locator('[data-testid="email-tag-0"] button').click();
        await (0, test_1.expect)(page.locator('[data-testid="email-tag-0"]')).not.toBeVisible();
    });
    (0, test_1.test)('should validate email input', async ({ page, testHelpers }) => {
        await page.locator('button:has-text("Export Data")').first().click();
        await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        await page.locator('[data-testid="share-tab"]').click();
        const shareButton = await testHelpers.waitForElement('[data-testid="share-button"]');
        await shareButton.click();
        await testHelpers.verifyToast('No Recipients', 'error');
    });
    (0, test_1.test)('should customize email content', async ({ page, testHelpers }) => {
        await page.locator('button:has-text("Export Data")').first().click();
        await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        await page.locator('[data-testid="share-tab"]').click();
        const subjectInput = await testHelpers.waitForElement('[data-testid="email-subject"]');
        await subjectInput.clear();
        await subjectInput.fill('Custom Report Subject');
        const messageInput = await testHelpers.waitForElement('[data-testid="email-message"]');
        await messageInput.fill('This is a custom message for the shared report.');
        await (0, test_1.expect)(subjectInput).toHaveValue('Custom Report Subject');
        await (0, test_1.expect)(messageInput).toHaveValue('This is a custom message for the shared report.');
    });
    (0, test_1.test)('should configure share settings', async ({ page, testHelpers }) => {
        await page.locator('button:has-text("Export Data")').first().click();
        await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        await page.locator('[data-testid="share-tab"]').click();
        const downloadLinkSwitch = page.locator('text=Include Download Link').locator('..').locator('button');
        await downloadLinkSwitch.click();
        const expirationSelect = page.locator('text=Link Expiration').locator('..').locator('[role="combobox"]');
        await expirationSelect.click();
        await page.locator('text=30 days').click();
    });
    (0, test_1.test)('should be responsive on different devices', async ({ page, testHelpers }) => {
        await page.setViewportSize(test_helpers_1.VIEWPORTS.MOBILE);
        await page.locator('button:has-text("Export Data")').first().click();
        const modal = await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        await (0, test_1.expect)(modal).toBeVisible();
        const modalContent = modal.locator('[role="dialog"]');
        await (0, test_1.expect)(modalContent).toBeVisible();
        await page.setViewportSize(test_helpers_1.VIEWPORTS.TABLET);
        await (0, test_1.expect)(modal).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="format-csv"]')).toBeVisible();
    });
    (0, test_1.test)('should handle keyboard navigation', async ({ page, testHelpers }) => {
        await page.locator('button:has-text("Export Data")').first().click();
        await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        await testHelpers.testKeyboardNavigation();
        await page.keyboard.press('Escape');
        await (0, test_1.expect)(page.locator('[data-testid="data-export-modal"]')).not.toBeVisible();
    });
    (0, test_1.test)('should have accessible labels', async ({ page, testHelpers }) => {
        await page.locator('button:has-text("Export Data")').first().click();
        await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        await testHelpers.testAccessibility();
        const modal = page.locator('[data-testid="data-export-modal"]');
        const hasRole = await modal.getAttribute('role');
        const hasAriaLabel = await modal.getAttribute('aria-labelledby');
        (0, test_1.expect)(hasRole || hasAriaLabel).toBeTruthy();
    });
    (0, test_1.test)('should handle format-specific features', async ({ page, testHelpers }) => {
        await page.locator('button:has-text("Export Data")').first().click();
        await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        await page.locator('[data-testid="format-csv"]').click();
        const chartsToggle = page.locator('text=Include Charts').locator('..').locator('button');
        await (0, test_1.expect)(chartsToggle).toBeDisabled();
        await page.locator('[data-testid="format-pdf"]').click();
        await (0, test_1.expect)(chartsToggle).toBeEnabled();
    });
    (0, test_1.test)('should show format information', async ({ page, testHelpers }) => {
        await page.locator('button:has-text("Export Data")').first().click();
        await testHelpers.waitForElement('[data-testid="data-export-modal"]');
        await (0, test_1.expect)(page.locator('text=Comma-separated values for spreadsheet applications')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=~50KB')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=Microsoft Excel with charts and formatting')).toBeVisible();
        await (0, test_1.expect)(page.locator('text=~200KB')).toBeVisible();
    });
    test_1.test.describe('Error Handling', () => {
        (0, test_1.test)('should handle export failures', async ({ page, testHelpers }) => {
            await testHelpers;
            await page.locator('button:has-text("Export Data")').first().click();
            await testHelpers.waitForElement('[data-testid="data-export-modal"]');
            const exportButton = await testHelpers.waitForElement('[data-testid="export-button"]');
            await exportButton.click();
            await testHelpers.verifyToast('Export Failed', 'error');
        });
        (0, test_1.test)('should handle sharing failures', async ({ page, testHelpers }) => {
            await testHelpers;
            await page.locator('button:has-text("Export Data")').first().click();
            await testHelpers.waitForElement('[data-testid="data-export-modal"]');
            await page.locator('[data-testid="share-tab"]').click();
            await testHelpers.fillFormField('[data-testid="email-input"]', 'test@example.com');
            await page.keyboard.press('Enter');
            const shareButton = await testHelpers.waitForElement('[data-testid="share-button"]');
            await shareButton.click();
            await testHelpers.verifyToast('Sharing Failed', 'error');
        });
    });
});
//# sourceMappingURL=data-export.spec.js.map
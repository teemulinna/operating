"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
test_1.test.describe('CSV Import/Export E2E Tests', () => {
    const testFilesPath = path_1.default.join(__dirname, '../fixtures');
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });
    test_1.test.describe('CSV Import', () => {
        (0, test_1.test)('should successfully import valid CSV file', async ({ page }) => {
            await page.click('[data-testid="import-employees-button"]');
            const filePath = path_1.default.join(testFilesPath, 'test-employees.csv');
            await page.setInputFiles('[data-testid="csv-file-input"]', filePath);
            await (0, test_1.expect)(page.locator('[data-testid="csv-preview"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="csv-row-count"]')).toContainText('10 employees');
            await (0, test_1.expect)(page.locator('[data-testid="preview-employee"]').first()).toContainText('John Doe');
            await (0, test_1.expect)(page.locator('[data-testid="preview-employee"]').first()).toContainText('john.doe@example.com');
            await page.click('[data-testid="start-import-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="import-progress"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="import-success-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="import-result"]')).toContainText('Successfully imported 10 employees');
            await page.click('[data-testid="view-employees-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="employee-row"]').filter({ hasText: 'John Doe' })).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="employee-row"]').filter({ hasText: 'Jane Smith' })).toBeVisible();
        });
        (0, test_1.test)('should handle CSV file with validation errors', async ({ page }) => {
            await page.click('[data-testid="import-employees-button"]');
            const filePath = path_1.default.join(testFilesPath, 'invalid-employees.csv');
            await page.setInputFiles('[data-testid="csv-file-input"]', filePath);
            await (0, test_1.expect)(page.locator('[data-testid="csv-preview"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="validation-errors"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]').filter({ hasText: 'Invalid email format' })).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]').filter({ hasText: 'Missing required field' })).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="start-import-button"]')).toBeDisabled();
            await (0, test_1.expect)(page.locator('[data-testid="error-summary"]')).toContainText('5 rows have validation errors');
        });
        (0, test_1.test)('should handle large CSV file import', async ({ page }) => {
            await page.click('[data-testid="import-employees-button"]');
            const filePath = path_1.default.join(testFilesPath, 'large-dataset.csv');
            await page.setInputFiles('[data-testid="csv-file-input"]', filePath);
            await (0, test_1.expect)(page.locator('[data-testid="csv-preview"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="csv-row-count"]')).toContainText('20 employees');
            await page.click('[data-testid="start-import-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="import-progress"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="progress-bar"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="import-success-message"]')).toBeVisible({ timeout: 30000 });
            await (0, test_1.expect)(page.locator('[data-testid="import-result"]')).toContainText('Successfully imported 20 employees');
        });
        (0, test_1.test)('should allow user to correct validation errors and re-import', async ({ page }) => {
            await page.click('[data-testid="import-employees-button"]');
            const filePath = path_1.default.join(testFilesPath, 'invalid-employees.csv');
            await page.setInputFiles('[data-testid="csv-file-input"]', filePath);
            await (0, test_1.expect)(page.locator('[data-testid="validation-errors"]')).toBeVisible();
            await page.click('[data-testid="edit-csv-data-button"]');
            await page.click('[data-testid="csv-row-1"] [data-testid="email-cell"]');
            await page.fill('[data-testid="inline-edit-input"]', 'corrected.email@example.com');
            await page.press('[data-testid="inline-edit-input"]', 'Enter');
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]').filter({ hasText: 'Invalid email format' })).toHaveCount(0);
            await (0, test_1.expect)(page.locator('[data-testid="start-import-button"]')).not.toBeDisabled();
        });
        (0, test_1.test)('should provide detailed import summary', async ({ page }) => {
            await page.click('[data-testid="import-employees-button"]');
            const filePath = path_1.default.join(testFilesPath, 'test-employees.csv');
            await page.setInputFiles('[data-testid="csv-file-input"]', filePath);
            await page.click('[data-testid="start-import-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="import-success-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="import-summary"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="summary-total-rows"]')).toContainText('10');
            await (0, test_1.expect)(page.locator('[data-testid="summary-successful"]')).toContainText('10');
            await (0, test_1.expect)(page.locator('[data-testid="summary-errors"]')).toContainText('0');
            await (0, test_1.expect)(page.locator('[data-testid="summary-skipped"]')).toContainText('0');
            await (0, test_1.expect)(page.locator('[data-testid="processing-time"]')).toBeVisible();
        });
    });
    test_1.test.describe('CSV Export', () => {
        test_1.test.beforeEach(async ({ page }) => {
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
        (0, test_1.test)('should export all employees to CSV', async ({ page }) => {
            const downloadPromise = page.waitForEvent('download');
            await page.click('[data-testid="export-employees-button"]');
            const download = await downloadPromise;
            (0, test_1.expect)(download.suggestedFilename()).toMatch(/employees_\d{4}-\d{2}-\d{2}\.csv/);
            const filePath = await download.path();
            const content = fs_1.default.readFileSync(filePath, 'utf8');
            (0, test_1.expect)(content).toContain('firstName,lastName,email,phoneNumber,position,department,salary,hireDate,status');
            (0, test_1.expect)(content).toContain('Export,Test1,export.test1@example.com');
            (0, test_1.expect)(content).toContain('Export,Test2,export.test2@example.com');
            (0, test_1.expect)(content).toContain('Export,Test3,export.test3@example.com');
            const rows = content.split('\n').filter(row => row.trim() !== '');
            (0, test_1.expect)(rows.length).toBeGreaterThan(3);
        });
        (0, test_1.test)('should export filtered employees only', async ({ page }) => {
            await page.fill('[data-testid="search-input"]', 'Export Test1');
            await page.waitForTimeout(500);
            const downloadPromise = page.waitForEvent('download');
            await page.click('[data-testid="export-filtered-button"]');
            const download = await downloadPromise;
            const filePath = await download.path();
            const content = fs_1.default.readFileSync(filePath, 'utf8');
            (0, test_1.expect)(content).toContain('Export,Test1,export.test1@example.com');
            (0, test_1.expect)(content).not.toContain('Export,Test2,export.test2@example.com');
            (0, test_1.expect)(content).not.toContain('Export,Test3,export.test3@example.com');
        });
        (0, test_1.test)('should export selected employees only', async ({ page }) => {
            await page.check('[data-testid="employee-checkbox-1"]');
            await page.check('[data-testid="employee-checkbox-3"]');
            const downloadPromise = page.waitForEvent('download');
            await page.click('[data-testid="export-selected-button"]');
            const download = await downloadPromise;
            const filePath = await download.path();
            const content = fs_1.default.readFileSync(filePath, 'utf8');
            const rows = content.split('\n').filter(row => row.trim() !== '');
            (0, test_1.expect)(rows.length).toBe(3);
        });
        (0, test_1.test)('should allow custom field selection for export', async ({ page }) => {
            await page.click('[data-testid="export-options-button"]');
            await page.uncheck('[data-testid="export-field-phoneNumber"]');
            await page.uncheck('[data-testid="export-field-hireDate"]');
            const downloadPromise = page.waitForEvent('download');
            await page.click('[data-testid="start-export-button"]');
            const download = await downloadPromise;
            const filePath = await download.path();
            const content = fs_1.default.readFileSync(filePath, 'utf8');
            (0, test_1.expect)(content).not.toContain('phoneNumber');
            (0, test_1.expect)(content).not.toContain('hireDate');
            (0, test_1.expect)(content).toContain('firstName,lastName,email,position,department,salary,status');
        });
        (0, test_1.test)('should show export progress for large datasets', async ({ page }) => {
            await page.click('[data-testid="export-employees-button"]');
            const progressVisible = await page.locator('[data-testid="export-progress"]').isVisible({ timeout: 1000 }).catch(() => false);
            if (progressVisible) {
                await (0, test_1.expect)(page.locator('[data-testid="export-progress"]')).toBeVisible();
                await (0, test_1.expect)(page.locator('[data-testid="export-status"]')).toContainText('Exporting employees...');
            }
            await page.waitForEvent('download');
        });
    });
    test_1.test.describe('CSV Format Validation', () => {
        (0, test_1.test)('should reject non-CSV files', async ({ page }) => {
            await page.click('[data-testid="import-employees-button"]');
            const textFilePath = path_1.default.join(testFilesPath, '../README.md');
            await page.setInputFiles('[data-testid="csv-file-input"]', textFilePath);
            await (0, test_1.expect)(page.locator('[data-testid="file-type-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="file-type-error"]')).toContainText('Please upload a CSV file');
        });
        (0, test_1.test)('should validate CSV column headers', async ({ page }) => {
            await page.click('[data-testid="import-employees-button"]');
            const wrongHeadersCsv = 'name,emailAddress,job,dept,wage\nJohn Doe,john@example.com,Developer,IT,50000';
            const tempFilePath = path_1.default.join(testFilesPath, 'wrong-headers.csv');
            fs_1.default.writeFileSync(tempFilePath, wrongHeadersCsv);
            await page.setInputFiles('[data-testid="csv-file-input"]', tempFilePath);
            await (0, test_1.expect)(page.locator('[data-testid="header-validation-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="header-validation-error"]')).toContainText('CSV headers do not match expected format');
            fs_1.default.unlinkSync(tempFilePath);
        });
        (0, test_1.test)('should provide template download for correct format', async ({ page }) => {
            await page.click('[data-testid="import-employees-button"]');
            const downloadPromise = page.waitForEvent('download');
            await page.click('[data-testid="download-template-button"]');
            const download = await downloadPromise;
            (0, test_1.expect)(download.suggestedFilename()).toBe('employee-import-template.csv');
            const filePath = await download.path();
            const content = fs_1.default.readFileSync(filePath, 'utf8');
            (0, test_1.expect)(content).toContain('firstName,lastName,email,phoneNumber,position,department,salary,hireDate,status');
            (0, test_1.expect)(content).toContain('John,Doe,john.doe@example.com');
        });
    });
});
//# sourceMappingURL=csv-import-export.spec.js.map
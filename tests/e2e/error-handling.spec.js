"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Error Handling E2E Tests', () => {
    test_1.test.describe('Network Error Handling', () => {
        (0, test_1.test)('should handle API server unavailable', async ({ page, context }) => {
            await context.route('**/api/**', route => {
                route.abort('failed');
            });
            await page.goto('/');
            await (0, test_1.expect)(page.locator('[data-testid="connection-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="connection-error"]')).toContainText('Unable to connect to server');
            await (0, test_1.expect)(page.locator('[data-testid="retry-button"]')).toBeVisible();
        });
        (0, test_1.test)('should handle slow API responses', async ({ page, context }) => {
            await context.route('**/api/**', async (route) => {
                await new Promise(resolve => setTimeout(resolve, 5000));
                route.continue();
            });
            await page.goto('/');
            await (0, test_1.expect)(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="timeout-error"]')).toBeVisible({ timeout: 10000 });
            await (0, test_1.expect)(page.locator('[data-testid="timeout-error"]')).toContainText('Request timed out');
        });
        (0, test_1.test)('should handle API errors gracefully', async ({ page, context }) => {
            await context.route('**/api/employees', route => {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal Server Error' })
                });
            });
            await page.goto('/');
            await (0, test_1.expect)(page.locator('[data-testid="server-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="server-error"]')).toContainText('Server error occurred');
            await (0, test_1.expect)(page.locator('[data-testid="retry-button"]')).toBeVisible();
        });
        (0, test_1.test)('should retry failed requests', async ({ page, context }) => {
            let requestCount = 0;
            await context.route('**/api/employees', route => {
                requestCount++;
                if (requestCount < 3) {
                    route.abort('failed');
                }
                else {
                    route.continue();
                }
            });
            await page.goto('/');
            await (0, test_1.expect)(page.locator('[data-testid="connection-error"]')).toBeVisible();
            await page.click('[data-testid="retry-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="employee-list"]')).toBeVisible();
        });
    });
    test_1.test.describe('Form Validation Errors', () => {
        (0, test_1.test)('should handle client-side validation errors', async ({ page }) => {
            await page.goto('/');
            await page.click('[data-testid="add-employee-button"]');
            await page.click('[data-testid="submit-employee-form"]');
            await (0, test_1.expect)(page.locator('[data-testid="validation-errors"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="first-name-error"]')).toContainText('First name is required');
            await (0, test_1.expect)(page.locator('[data-testid="last-name-error"]')).toContainText('Last name is required');
            await (0, test_1.expect)(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
            await (0, test_1.expect)(page.locator('[data-testid="employee-form"]')).toBeVisible();
        });
        (0, test_1.test)('should handle server-side validation errors', async ({ page, context }) => {
            await context.route('**/api/employees', route => {
                if (route.request().method() === 'POST') {
                    route.fulfill({
                        status: 400,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            errors: {
                                email: ['Email address is already in use'],
                                phoneNumber: ['Phone number format is invalid']
                            }
                        })
                    });
                }
                else {
                    route.continue();
                }
            });
            await page.goto('/');
            await page.click('[data-testid="add-employee-button"]');
            await page.fill('[data-testid="first-name-input"]', 'John');
            await page.fill('[data-testid="last-name-input"]', 'Doe');
            await page.fill('[data-testid="email-input"]', 'duplicate@company.com');
            await page.fill('[data-testid="phone-input"]', 'invalid-phone');
            await page.fill('[data-testid="position-input"]', 'Developer');
            await page.click('[data-testid="department-select"]');
            await page.click('[data-testid="department-option-engineering"]');
            await page.fill('[data-testid="salary-input"]', '70000');
            await page.fill('[data-testid="hire-date-input"]', '2023-01-01');
            await page.click('[data-testid="status-select"]');
            await page.click('[data-testid="status-option-active"]');
            await page.click('[data-testid="submit-employee-form"]');
            await (0, test_1.expect)(page.locator('[data-testid="server-validation-errors"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="email-server-error"]')).toContainText('Email address is already in use');
            await (0, test_1.expect)(page.locator('[data-testid="phone-server-error"]')).toContainText('Phone number format is invalid');
        });
        (0, test_1.test)('should handle file upload errors', async ({ page, context }) => {
            await context.route('**/api/employees/import', route => {
                route.fulfill({
                    status: 413,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'File too large' })
                });
            });
            await page.goto('/');
            await page.click('[data-testid="import-employees-button"]');
            const filePath = require('path').join(__dirname, '../fixtures/test-employees.csv');
            await page.setInputFiles('[data-testid="csv-file-input"]', filePath);
            await page.click('[data-testid="start-import-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="file-upload-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="file-upload-error"]')).toContainText('File too large');
        });
    });
    test_1.test.describe('User Input Errors', () => {
        (0, test_1.test)('should handle malformed data gracefully', async ({ page }) => {
            await page.goto('/');
            await page.click('[data-testid="add-employee-button"]');
            await page.fill('[data-testid="email-input"]', 'not-an-email');
            await page.fill('[data-testid="salary-input"]', 'not-a-number');
            await page.fill('[data-testid="hire-date-input"]', 'invalid-date');
            await page.blur('[data-testid="email-input"]');
            await (0, test_1.expect)(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email');
            await page.blur('[data-testid="salary-input"]');
            await (0, test_1.expect)(page.locator('[data-testid="salary-error"]')).toContainText('Please enter a valid number');
            await page.blur('[data-testid="hire-date-input"]');
            await (0, test_1.expect)(page.locator('[data-testid="date-error"]')).toContainText('Please enter a valid date');
        });
        (0, test_1.test)('should sanitize potentially dangerous input', async ({ page }) => {
            await page.goto('/');
            await page.click('[data-testid="add-employee-button"]');
            const xssAttempt = '<script>alert("XSS")</script>';
            await page.fill('[data-testid="first-name-input"]', xssAttempt);
            await page.fill('[data-testid="position-input"]', xssAttempt);
            const firstNameValue = await page.inputValue('[data-testid="first-name-input"]');
            (0, test_1.expect)(firstNameValue).not.toContain('<script>');
        });
        (0, test_1.test)('should handle extremely long input', async ({ page }) => {
            await page.goto('/');
            await page.click('[data-testid="add-employee-button"]');
            const longString = 'A'.repeat(1000);
            await page.fill('[data-testid="first-name-input"]', longString);
            await page.blur('[data-testid="first-name-input"]');
            await (0, test_1.expect)(page.locator('[data-testid="first-name-error"]')).toContainText('First name is too long');
        });
    });
    test_1.test.describe('System Errors', () => {
        (0, test_1.test)('should handle JavaScript errors gracefully', async ({ page }) => {
            let jsErrors = [];
            page.on('pageerror', error => {
                jsErrors.push(error.message);
            });
            await page.goto('/');
            await page.evaluate(() => {
                try {
                    window.nonExistentFunction();
                }
                catch (error) {
                    console.error('Caught error:', error);
                }
            });
            await (0, test_1.expect)(page.locator('[data-testid="employee-list"]')).toBeVisible();
        });
        (0, test_1.test)('should handle memory constraints', async ({ page }) => {
            await page.goto('/');
            await page.evaluate(() => {
                for (let i = 0; i < 10000; i++) {
                    const div = document.createElement('div');
                    div.textContent = `Item ${i}`;
                }
            });
            await page.click('[data-testid="add-employee-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="employee-form"]')).toBeVisible();
        });
        (0, test_1.test)('should handle browser compatibility issues', async ({ page, browserName }) => {
            await page.goto('/');
            const supportsLocalStorage = await page.evaluate(() => {
                try {
                    localStorage.setItem('test', 'test');
                    localStorage.removeItem('test');
                    return true;
                }
                catch (e) {
                    return false;
                }
            });
            if (!supportsLocalStorage) {
                await (0, test_1.expect)(page.locator('[data-testid="storage-fallback-message"]')).toBeVisible();
            }
            await (0, test_1.expect)(page.locator('[data-testid="employee-list"]')).toBeVisible();
        });
    });
    test_1.test.describe('Recovery Mechanisms', () => {
        (0, test_1.test)('should provide refresh option on errors', async ({ page, context }) => {
            await context.route('**/api/employees', route => {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Server Error' })
                });
            });
            await page.goto('/');
            await (0, test_1.expect)(page.locator('[data-testid="server-error"]')).toBeVisible();
            await context.unroute('**/api/employees');
            await page.click('[data-testid="refresh-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="employee-list"]')).toBeVisible();
        });
        (0, test_1.test)('should maintain form data during errors', async ({ page, context }) => {
            await page.goto('/');
            await page.click('[data-testid="add-employee-button"]');
            await page.fill('[data-testid="first-name-input"]', 'John');
            await page.fill('[data-testid="last-name-input"]', 'Doe');
            await page.fill('[data-testid="email-input"]', 'john.doe@company.com');
            await context.route('**/api/employees', route => {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Server Error' })
                });
            });
            await page.fill('[data-testid="position-input"]', 'Developer');
            await page.click('[data-testid="submit-employee-form"]');
            await (0, test_1.expect)(page.locator('[data-testid="server-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="first-name-input"]')).toHaveValue('John');
            await (0, test_1.expect)(page.locator('[data-testid="last-name-input"]')).toHaveValue('Doe');
            await (0, test_1.expect)(page.locator('[data-testid="email-input"]')).toHaveValue('john.doe@company.com');
            await (0, test_1.expect)(page.locator('[data-testid="position-input"]')).toHaveValue('Developer');
        });
        (0, test_1.test)('should provide offline functionality', async ({ page, context }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            await context.setOffline(true);
            await page.click('[data-testid="add-employee-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="offline-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="offline-message"]')).toContainText('You are currently offline');
            await page.fill('[data-testid="first-name-input"]', 'Offline');
            await page.fill('[data-testid="last-name-input"]', 'User');
            await context.setOffline(false);
            await (0, test_1.expect)(page.locator('[data-testid="sync-message"]')).toBeVisible();
        });
    });
    test_1.test.describe('Error Logging and Monitoring', () => {
        (0, test_1.test)('should capture client errors for monitoring', async ({ page }) => {
            let networkRequests = [];
            page.on('request', request => {
                networkRequests.push({
                    url: request.url(),
                    method: request.method()
                });
            });
            await page.goto('/');
            await page.evaluate(() => {
                if (window.errorLogger) {
                    window.errorLogger.log('Test error for monitoring');
                }
            });
            const errorLogRequest = networkRequests.find(req => req.url.includes('/api/errors') || req.url.includes('/api/logs'));
        });
        (0, test_1.test)('should provide error context to users', async ({ page, context }) => {
            await context.route('**/api/employees', route => {
                route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Not Found',
                        message: 'The requested resource was not found',
                        code: 'EMPLOYEE_NOT_FOUND'
                    })
                });
            });
            await page.goto('/');
            await (0, test_1.expect)(page.locator('[data-testid="user-error-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="user-error-message"]')).toContainText('resource was not found');
            await (0, test_1.expect)(page.locator('[data-testid="error-help-actions"]')).toBeVisible();
        });
    });
});
//# sourceMappingURL=error-handling.spec.js.map
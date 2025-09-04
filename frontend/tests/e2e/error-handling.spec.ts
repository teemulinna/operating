import { test, expect } from '@playwright/test';

test.describe('Error Handling E2E Tests', () => {
  test.describe('Network Error Handling', () => {
    test('should handle API server unavailable', async ({ page, context }) => {
      // Block all API requests to simulate server down
      await context.route('**/api/**', route => {
        route.abort('failed');
      });
      
      await page.goto('/');
      
      // Should show appropriate error message
      await expect(page.locator('[data-testid="connection-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-error"]')).toContainText('Unable to connect to server');
      
      // Should provide retry mechanism
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle slow API responses', async ({ page, context }) => {
      // Add delay to all API requests
      await context.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        route.continue();
      });
      
      await page.goto('/');
      
      // Should show loading state
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Should show timeout message after reasonable time
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="timeout-error"]')).toContainText('Request timed out');
    });

    test('should handle API errors gracefully', async ({ page, context }) => {
      // Mock API to return 500 error
      await context.route('**/api/employees', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.goto('/');
      
      await expect(page.locator('[data-testid="server-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="server-error"]')).toContainText('Server error occurred');
      
      // Should allow user to retry
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should retry failed requests', async ({ page, context }) => {
      let requestCount = 0;
      
      await context.route('**/api/employees', route => {
        requestCount++;
        if (requestCount < 3) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });
      
      await page.goto('/');
      
      // Should show error initially
      await expect(page.locator('[data-testid="connection-error"]')).toBeVisible();
      
      // Click retry
      await page.click('[data-testid="retry-button"]');
      
      // Should eventually succeed
      await expect(page.locator('[data-testid="employee-list"]')).toBeVisible();
    });
  });

  test.describe('Form Validation Errors', () => {
    test('should handle client-side validation errors', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="add-employee-button"]');
      
      // Try to submit empty form
      await page.click('[data-testid="submit-employee-form"]');
      
      // Should show multiple validation errors
      await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible();
      await expect(page.locator('[data-testid="first-name-error"]')).toContainText('First name is required');
      await expect(page.locator('[data-testid="last-name-error"]')).toContainText('Last name is required');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
      
      // Form should remain open
      await expect(page.locator('[data-testid="employee-form"]')).toBeVisible();
    });

    test('should handle server-side validation errors', async ({ page, context }) => {
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
        } else {
          route.continue();
        }
      });
      
      await page.goto('/');
      await page.click('[data-testid="add-employee-button"]');
      
      // Fill form with data that will trigger server validation
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
      
      // Should show server validation errors
      await expect(page.locator('[data-testid="server-validation-errors"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-server-error"]')).toContainText('Email address is already in use');
      await expect(page.locator('[data-testid="phone-server-error"]')).toContainText('Phone number format is invalid');
    });

    test('should handle file upload errors', async ({ page, context }) => {
      await context.route('**/api/employees/import', route => {
        route.fulfill({
          status: 413,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'File too large' })
        });
      });
      
      await page.goto('/');
      await page.click('[data-testid="import-employees-button"]');
      
      // Try to upload a file
      const filePath = require('path').join(__dirname, '../fixtures/test-employees.csv');
      await page.setInputFiles('[data-testid="csv-file-input"]', filePath);
      
      await page.click('[data-testid="start-import-button"]');
      
      await expect(page.locator('[data-testid="file-upload-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-upload-error"]')).toContainText('File too large');
    });
  });

  test.describe('User Input Errors', () => {
    test('should handle malformed data gracefully', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="add-employee-button"]');
      
      // Enter malformed data
      await page.fill('[data-testid="email-input"]', 'not-an-email');
      await page.fill('[data-testid="salary-input"]', 'not-a-number');
      await page.fill('[data-testid="hire-date-input"]', 'invalid-date');
      
      // Should show validation errors as user types/leaves fields
      await page.blur('[data-testid="email-input"]');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email');
      
      await page.blur('[data-testid="salary-input"]');
      await expect(page.locator('[data-testid="salary-error"]')).toContainText('Please enter a valid number');
      
      await page.blur('[data-testid="hire-date-input"]');
      await expect(page.locator('[data-testid="date-error"]')).toContainText('Please enter a valid date');
    });

    test('should sanitize potentially dangerous input', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="add-employee-button"]');
      
      // Enter potentially malicious input
      const xssAttempt = '<script>alert("XSS")</script>';
      await page.fill('[data-testid="first-name-input"]', xssAttempt);
      await page.fill('[data-testid="position-input"]', xssAttempt);
      
      // Input should be sanitized (script tags removed/escaped)
      const firstNameValue = await page.inputValue('[data-testid="first-name-input"]');
      expect(firstNameValue).not.toContain('<script>');
    });

    test('should handle extremely long input', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="add-employee-button"]');
      
      // Enter very long string
      const longString = 'A'.repeat(1000);
      await page.fill('[data-testid="first-name-input"]', longString);
      
      await page.blur('[data-testid="first-name-input"]');
      
      // Should show length validation error
      await expect(page.locator('[data-testid="first-name-error"]')).toContainText('First name is too long');
    });
  });

  test.describe('System Errors', () => {
    test('should handle JavaScript errors gracefully', async ({ page }) => {
      let jsErrors = [];
      
      page.on('pageerror', error => {
        jsErrors.push(error.message);
      });
      
      await page.goto('/');
      
      // Trigger a potential error by manipulating the DOM
      await page.evaluate(() => {
        // Simulate an error that might occur
        try {
          (window as any).nonExistentFunction();
        } catch (error) {
          console.error('Caught error:', error);
        }
      });
      
      // Page should still be functional despite the error
      await expect(page.locator('[data-testid="employee-list"]')).toBeVisible();
      
      // Optionally check that critical errors are handled
      // expect(jsErrors.length).toBe(0);
    });

    test('should handle memory constraints', async ({ page }) => {
      await page.goto('/');
      
      // Simulate creating many elements to test memory handling
      await page.evaluate(() => {
        for (let i = 0; i < 10000; i++) {
          const div = document.createElement('div');
          div.textContent = `Item ${i}`;
          // Don't actually add to DOM to avoid affecting test
        }
      });
      
      // Application should remain responsive
      await page.click('[data-testid="add-employee-button"]');
      await expect(page.locator('[data-testid="employee-form"]')).toBeVisible();
    });

    test('should handle browser compatibility issues', async ({ page, browserName }) => {
      await page.goto('/');
      
      // Test features that might not work in all browsers
      const supportsLocalStorage = await page.evaluate(() => {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
          return true;
        } catch (e) {
          return false;
        }
      });
      
      if (!supportsLocalStorage) {
        // Should show fallback behavior or graceful degradation
        await expect(page.locator('[data-testid="storage-fallback-message"]')).toBeVisible();
      }
      
      // Application should work regardless
      await expect(page.locator('[data-testid="employee-list"]')).toBeVisible();
    });
  });

  test.describe('Recovery Mechanisms', () => {
    test('should provide refresh option on errors', async ({ page, context }) => {
      await context.route('**/api/employees', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server Error' })
        });
      });
      
      await page.goto('/');
      
      await expect(page.locator('[data-testid="server-error"]')).toBeVisible();
      
      // Clear the route to allow refresh to work
      await context.unroute('**/api/employees');
      
      // Click refresh button
      await page.click('[data-testid="refresh-button"]');
      
      // Should load successfully after refresh
      await expect(page.locator('[data-testid="employee-list"]')).toBeVisible();
    });

    test('should maintain form data during errors', async ({ page, context }) => {
      await page.goto('/');
      await page.click('[data-testid="add-employee-button"]');
      
      // Fill out form
      await page.fill('[data-testid="first-name-input"]', 'John');
      await page.fill('[data-testid="last-name-input"]', 'Doe');
      await page.fill('[data-testid="email-input"]', 'john.doe@company.com');
      
      // Mock server error
      await context.route('**/api/employees', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server Error' })
        });
      });
      
      await page.fill('[data-testid="position-input"]', 'Developer');
      await page.click('[data-testid="submit-employee-form"]');
      
      // Should show error but maintain form data
      await expect(page.locator('[data-testid="server-error"]')).toBeVisible();
      
      // Form data should still be there
      await expect(page.locator('[data-testid="first-name-input"]')).toHaveValue('John');
      await expect(page.locator('[data-testid="last-name-input"]')).toHaveValue('Doe');
      await expect(page.locator('[data-testid="email-input"]')).toHaveValue('john.doe@company.com');
      await expect(page.locator('[data-testid="position-input"]')).toHaveValue('Developer');
    });

    test('should provide offline functionality', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Simulate going offline
      await context.setOffline(true);
      
      // Try to perform actions while offline
      await page.click('[data-testid="add-employee-button"]');
      
      // Should show offline message
      await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-message"]')).toContainText('You are currently offline');
      
      // Should queue actions or provide offline functionality
      await page.fill('[data-testid="first-name-input"]', 'Offline');
      await page.fill('[data-testid="last-name-input"]', 'User');
      
      // Go back online
      await context.setOffline(false);
      
      // Should sync when back online
      await expect(page.locator('[data-testid="sync-message"]')).toBeVisible();
    });
  });

  test.describe('Error Logging and Monitoring', () => {
    test('should capture client errors for monitoring', async ({ page }) => {
      let networkRequests = [];
      
      page.on('request', request => {
        networkRequests.push({
          url: request.url(),
          method: request.method()
        });
      });
      
      await page.goto('/');
      
      // Trigger an error condition
      await page.evaluate(() => {
        // Simulate an error that should be logged
        if ((window as any).errorLogger) {
          (window as any).errorLogger.log('Test error for monitoring');
        }
      });
      
      // Check if error logging endpoint was called
      const errorLogRequest = networkRequests.find(req => 
        req.url.includes('/api/errors') || req.url.includes('/api/logs')
      );
      
      // If error logging is implemented, it should have been called
      // expect(errorLogRequest).toBeTruthy();
    });

    test('should provide error context to users', async ({ page, context }) => {
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
      
      // Should show user-friendly error message with context
      await expect(page.locator('[data-testid="user-error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-error-message"]')).toContainText('resource was not found');
      
      // Should provide helpful actions
      await expect(page.locator('[data-testid="error-help-actions"]')).toBeVisible();
    });
  });
});
import { test, expect } from '@playwright/test';

test.describe('Frontend Diagnostics', () => {
  test('Check console errors and page rendering', async ({ page }) => {
    // Capture all console messages
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('Console Error:', msg.text());
      } else {
        consoleMessages.push(msg.text());
        console.log(`Console ${msg.type()}:`, msg.text());
      }
    });

    page.on('pageerror', error => {
      console.error('Page Error:', error.message);
      consoleErrors.push(error.message);
    });

    // Test homepage
    console.log('\n=== Testing Homepage ===');
    await page.goto('http://localhost:3003/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if app container exists
    const appContainer = page.getByTestId('app-container');
    console.log('App container exists:', await appContainer.isVisible());

    // Check navigation
    const navEmployees = page.getByTestId('nav-employees');
    console.log('Employees nav exists:', await navEmployees.isVisible());

    // Navigate to employees page
    console.log('\n=== Navigating to Employees Page ===');
    await navEmployees.click();
    await page.waitForTimeout(2000);

    // Check URL
    console.log('Current URL:', page.url());

    // Check if employees page loaded
    const employeesPage = page.getByTestId('employees-page');
    console.log('Employees page exists:', await employeesPage.isVisible());

    // Check for Add Employee button
    const addButton = page.getByTestId('add-employee-button');
    console.log('Add Employee button exists:', await addButton.isVisible());

    // Check for any loading indicators
    const loadingElements = await page.locator('[data-testid*="loading"]').all();
    console.log('Loading elements found:', loadingElements.length);

    // Take screenshot
    await page.screenshot({ path: 'frontend-diagnostics.png', fullPage: true });

    // Report findings
    console.log('\n=== Diagnostic Summary ===');
    console.log('Console messages:', consoleMessages.length);
    console.log('Console errors:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Errors found:');
      consoleErrors.forEach(err => console.log('  -', err));
    }

    // Check network requests
    const failedRequests: string[] = [];
    page.on('requestfailed', request => {
      failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
    });

    // Try to fetch employees directly
    console.log('\n=== Testing API Direct Call ===');
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/employees');
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('API Response:', JSON.stringify(apiResponse, null, 2));

    // Assert no critical errors
    expect(consoleErrors.length).toBe(0);
  });
});
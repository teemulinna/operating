import { test, expect } from '@playwright/test';

test.describe('Debug Team Dashboard', () => {
  test('capture console errors from Team Dashboard', async ({ page }) => {
    // Capture console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // Navigate to team dashboard
    await page.goto('http://localhost:3002/team-dashboard');
    await page.waitForLoadState('networkidle');

    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    // Log all console messages
    console.log('=== Console Messages ===');
    consoleMessages.forEach(msg => console.log(msg));

    // Log all page errors
    console.log('\n=== Page Errors ===');
    pageErrors.forEach(err => console.log(err));

    // Check what's actually on the page
    const bodyText = await page.textContent('body');
    console.log('\n=== Page Content ===');
    console.log(bodyText?.substring(0, 500));

    // Check if error message is displayed
    const errorElement = page.locator('text=/Failed to load|Error|failed/i');
    if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
      const errorText = await errorElement.textContent();
      console.log('\n=== Error Displayed ===');
      console.log(errorText);
    }

    // Try to call the API directly from the test
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/employees');
        const data = await response.json();
        return { success: true, data };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    console.log('\n=== Direct API Call Result ===');
    console.log(JSON.stringify(apiResponse, null, 2));
  });
});
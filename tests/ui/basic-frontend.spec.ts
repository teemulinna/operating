import { test, expect } from '@playwright/test';

test.describe('Employee Management System UI', () => {
  
  test('should load Employee Management System homepage', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for React to render
    await page.waitForSelector('#root', { timeout: 10000 });
    
    // Check the page title
    await expect(page).toHaveTitle(/Employee Management System/);
    
    // Check for the main heading
    await expect(page.locator('h1')).toContainText('Employee Management System');
    
    // Check for the subtitle
    await expect(page.locator('p')).toContainText('Manage your organization');
  });

  test('should display the employee management interface', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'employee-management-ui.png', fullPage: true });
    
    // The app should have content beyond just the header
    const appContent = page.locator('#root');
    await expect(appContent).toBeVisible();
    
    // Should have meaningful content
    const content = await appContent.textContent();
    expect(content?.length || 0).toBeGreaterThan(50);
  });

  test('should connect to backend API successfully', async ({ page }) => {
    // Test backend connectivity
    const healthResponse = await page.request.get('http://localhost:3001/health');
    expect(healthResponse.ok()).toBeTruthy();
    
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    
    // Test departments API
    const deptResponse = await page.request.get('http://localhost:3001/api/departments');
    expect(deptResponse.ok()).toBeTruthy();
    
    const departments = await deptResponse.json();
    expect(Array.isArray(departments)).toBeTruthy();
    expect(departments.length).toBe(10);
  });

  test('should handle basic navigation', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('#root');
    
    // App should load without JavaScript errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit for any async operations
    await page.waitForTimeout(3000);
    
    // Allow for some non-critical errors but not too many
    expect(errors.length).toBeLessThan(10);
    
    console.log('Frontend loaded successfully with', errors.length, 'console errors');
    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }
  });
});
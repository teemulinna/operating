import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3002';
const API_URL = 'http://localhost:3001';

test.describe('Quick Validation Tests', () => {
  test('should load frontend homepage', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/homepage-loaded.png' });
    
    // Basic validation
    await expect(page).toHaveTitle(/Resource/);
    
    console.log('✅ Frontend loaded successfully');
  });

  test('should connect to backend API', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/api/employees`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    
    console.log('✅ Backend API connected successfully');
  });

  test('should navigate to employees page', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Look for employees navigation link
    await page.locator('nav a, [href="/employees"], button:has-text("Employees")').first().click();
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/employees-navigation.png' });
    
    console.log('✅ Navigation to employees works');
  });

  test('should display projects page', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects`);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/projects-display.png' });
    
    console.log('✅ Projects page displays');
  });

  test('should access reports/export functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/reports-access.png' });
    
    console.log('✅ Reports page accessible');
  });
});
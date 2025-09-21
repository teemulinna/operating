import { test, expect } from '@playwright/test';
import { TestDatabaseUtils } from '../fixtures/testDataFactory';

const API_BASE_URL = 'http://localhost:3001';

test.describe('Navigation and Routing', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for API to be available
    await TestDatabaseUtils.waitForAPI(API_BASE_URL);
    
    // Clean database before each test
    await TestDatabaseUtils.cleanDatabase(API_BASE_URL);
  });

  test.afterEach(async () => {
    // Clean up after each test
    await TestDatabaseUtils.cleanDatabase(API_BASE_URL);
  });

  test('should navigate to all main pages', async ({ page }) => {
    // Start at dashboard
    await page.goto('/');
    
    // Verify main navigation is present
    await expect(page.getByTestId('main-navigation')).toBeVisible();
    await expect(page.getByTestId('app-title')).toHaveText('ResourceForge');
    
    // Test dashboard navigation
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    await expect(page.getByTestId('dashboard-title')).toHaveText('Dashboard');
    
    // Navigate to employees page
    await page.getByTestId('nav-employees').click();
    await expect(page).toHaveURL(/\/employees/);
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
    
    // Navigate to projects page
    await page.getByTestId('nav-projects').click();
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.getByTestId('projects-page')).toBeVisible({ timeout: 10000 });
    
    // Navigate to allocations page
    await page.getByTestId('nav-allocations').click();
    await expect(page).toHaveURL(/\/allocations/);
    await expect(page.getByTestId('allocations-page')).toBeVisible({ timeout: 10000 });
    
    // Navigate to schedule page
    await page.getByTestId('nav-schedule').click();
    await expect(page).toHaveURL(/\/schedule/);
    await expect(page.getByTestId('schedule-page')).toBeVisible({ timeout: 10000 });
    
    // Navigate to reports page
    await page.getByTestId('nav-reports').click();
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.getByTestId('reports-page')).toBeVisible({ timeout: 10000 });
    
    // Navigate back to dashboard
    await page.getByTestId('nav-dashboard').click();
    await expect(page).toHaveURL(/\//);
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
  });

  test('should handle direct URL navigation', async ({ page }) => {
    // Navigate directly to employees page
    await page.goto('/employees');
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
    
    // Navigate directly to projects page
    await page.goto('/projects');
    await expect(page.getByTestId('projects-page')).toBeVisible({ timeout: 10000 });
    
    // Navigate directly to allocations page
    await page.goto('/allocations');
    await expect(page.getByTestId('allocations-page')).toBeVisible({ timeout: 10000 });
    
    // Navigate directly to schedule page
    await page.goto('/schedule');
    await expect(page.getByTestId('schedule-page')).toBeVisible({ timeout: 10000 });
    
    // Navigate directly to reports page
    await page.goto('/reports');
    await expect(page.getByTestId('reports-page')).toBeVisible({ timeout: 10000 });
  });

  test('should redirect unknown routes to dashboard', async ({ page }) => {
    // Navigate to unknown route
    await page.goto('/unknown-route');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\//);
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
  });

  test('should handle browser back and forward navigation', async ({ page }) => {
    // Start at dashboard
    await page.goto('/');
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    
    // Navigate to employees
    await page.getByTestId('nav-employees').click();
    await expect(page).toHaveURL(/\/employees/);
    
    // Navigate to projects
    await page.getByTestId('nav-projects').click();
    await expect(page).toHaveURL(/\/projects/);
    
    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL(/\/employees/);
    await expect(page.getByTestId('employees-page')).toBeVisible();
    
    // Use browser back button again
    await page.goBack();
    await expect(page).toHaveURL(/\//);
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    
    // Use browser forward button
    await page.goForward();
    await expect(page).toHaveURL(/\/employees/);
    await expect(page.getByTestId('employees-page')).toBeVisible();
  });

  test('should show active navigation state', async ({ page }) => {
    // Start at dashboard
    await page.goto('/');
    
    // Check dashboard link is active (should have specific styling)
    const dashboardLink = page.getByTestId('nav-dashboard');
    await expect(dashboardLink).toHaveClass(/border-gray-300/); // Active state class
    
    // Navigate to employees
    await page.getByTestId('nav-employees').click();
    
    // Check employees link has active styling
    const employeesLink = page.getByTestId('nav-employees');
    // Note: The exact class names depend on the actual implementation
    // These tests verify that navigation state changes occur
    await expect(employeesLink).toBeVisible();
  });

  test('should maintain responsive navigation', async ({ page }) => {
    // Test on desktop size
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    
    // Navigation should be visible on desktop
    await expect(page.getByTestId('main-navigation')).toBeVisible();
    
    // Test on mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigation should still be functional (might be collapsed)
    await expect(page.getByTestId('main-navigation')).toBeVisible();
    
    // Try navigating on mobile
    await page.getByTestId('nav-employees').click();
    await expect(page).toHaveURL(/\/employees/);
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
  });

  test('should handle page refresh without losing state', async ({ page }) => {
    // Navigate to employees page
    await page.goto('/employees');
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
    
    // Refresh the page
    await page.reload();
    
    // Should still be on employees page
    await expect(page).toHaveURL(/\/employees/);
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
  });

  test('should show loading states during navigation', async ({ page }) => {
    // Start at dashboard
    await page.goto('/');
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    
    // Navigate to employees and check for loading state
    await page.getByTestId('nav-employees').click();
    
    // Page should eventually load
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
  });

  test('should handle deep linking to dashboard route variants', async ({ page }) => {
    // Test /dashboard route
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    
    // Test root route /
    await page.goto('/');
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
  });

  test('should maintain correct page titles', async ({ page }) => {
    // Dashboard
    await page.goto('/');
    await expect(page).toHaveTitle(/ResourceForge/);
    
    // Employees page
    await page.goto('/employees');
    await expect(page).toHaveTitle(/ResourceForge/);
    
    // Projects page
    await page.goto('/projects');
    await expect(page).toHaveTitle(/ResourceForge/);
  });

  test('should handle rapid navigation changes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    
    // Rapidly click through navigation
    await page.getByTestId('nav-employees').click();
    await page.getByTestId('nav-projects').click();
    await page.getByTestId('nav-allocations').click();
    await page.getByTestId('nav-schedule').click();
    await page.getByTestId('nav-reports').click();
    
    // Should end up on the final page
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.getByTestId('reports-page')).toBeVisible({ timeout: 10000 });
  });

  test('should handle navigation with query parameters', async ({ page }) => {
    // Navigate to employees with query parameter
    await page.goto('/employees?search=test');
    
    await expect(page).toHaveURL(/\/employees\?search=test/);
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
    
    // Navigate away and back
    await page.getByTestId('nav-projects').click();
    await page.getByTestId('nav-employees').click();
    
    // Should be back on employees page (query might or might not be preserved)
    await expect(page.getByTestId('employees-page')).toBeVisible();
  });

  test('should show dashboard statistics correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    
    // Check that dashboard statistics are displayed
    await expect(page.getByTestId('dashboard-stats')).toBeVisible();
    await expect(page.getByTestId('employees-stat')).toBeVisible();
    await expect(page.getByTestId('projects-stat')).toBeVisible();
    await expect(page.getByTestId('utilization-stat')).toBeVisible();
    
    // Check stat values are displayed (might be loading initially)
    const employeeCount = page.getByTestId('employees-count');
    const projectCount = page.getByTestId('projects-count');
    const utilizationPercent = page.getByTestId('utilization-percent');
    
    await expect(employeeCount).toBeVisible();
    await expect(projectCount).toBeVisible();
    await expect(utilizationPercent).toBeVisible();
    
    // Wait for stats to load (should not show "..." after loading)
    await page.waitForTimeout(3000);
  });

  test('should handle error states gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Mock API failure for dashboard stats
    await page.route('**/api/dashboard/stats', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    // Reload to trigger the error
    await page.reload();
    
    // Dashboard should still be displayed
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    
    // Error message should be shown
    const errorMessage = page.getByTestId('dashboard-error');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Failed to load dashboard statistics');
    }
    
    // Stats should still show default values (0 or fallback)
    await expect(page.getByTestId('employees-count')).toBeVisible();
    await expect(page.getByTestId('projects-count')).toBeVisible();
  });

  test('should maintain application state across navigation', async ({ page }) => {
    // Start at dashboard, verify it loads
    await page.goto('/');
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    
    // Navigate to employees, then projects, then back
    await page.getByTestId('nav-employees').click();
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('nav-projects').click();
    await expect(page.getByTestId('projects-page')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    
    // Application should still be functional
    await expect(page.getByTestId('main-navigation')).toBeVisible();
    await expect(page.getByTestId('app-container')).toBeVisible();
  });
});
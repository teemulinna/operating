import { test, expect } from '@playwright/test';

test.describe('Frontend App - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3003');
  });

  test('should load the app and display navigation', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/ResourceForge/i);

    // Check navigation items
    await expect(page.getByTestId('nav-dashboard')).toBeVisible();
    await expect(page.getByTestId('nav-employees')).toBeVisible();
    await expect(page.getByTestId('nav-projects')).toBeVisible();
    await expect(page.getByTestId('nav-allocations')).toBeVisible();
  });

  test('should navigate to Dashboard page', async ({ page }) => {
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('should navigate to Employees page', async ({ page }) => {
    await page.getByTestId('nav-employees').click();
    await expect(page.getByTestId('employees-page')).toBeVisible();
    // Employee management component should load
    await expect(page.getByText(/Employee/i)).toBeVisible();
  });

  test('should navigate to Projects page', async ({ page }) => {
    await page.getByTestId('nav-projects').click();
    await expect(page.getByTestId('projects-page')).toBeVisible();
    // Project management component should load
    await expect(page.getByText(/Project/i)).toBeVisible();
  });

  test('should navigate to Allocations page', async ({ page }) => {
    await page.getByTestId('nav-allocations').click();
    await expect(page.getByTestId('allocations-page')).toBeVisible();
    // Allocation management component should load
    await expect(page.getByText(/Allocation/i)).toBeVisible();
  });

  test('Dashboard should fetch and display stats', async ({ page }) => {
    await page.goto('http://localhost:3003/');
    await page.waitForTimeout(2000); // Wait for API call

    // Check if stats are displayed (not just loading dots)
    const employeeCount = await page.locator('text=/\\d+ Total team members/').isVisible()
      .catch(() => false);
    const projectCount = await page.locator('text=/\\d+ Active projects/').isVisible()
      .catch(() => false);

    // At least one stat should be loaded
    expect(employeeCount || projectCount).toBeTruthy();
  });
});
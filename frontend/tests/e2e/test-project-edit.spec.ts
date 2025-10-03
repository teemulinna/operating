import { test, expect } from '@playwright/test';

test.describe('Project Edit Form Date Population', () => {
  test('should populate dates correctly when editing a project', async ({ page }) => {
    // Navigate to projects page
    await page.goto('http://localhost:3002/projects');
    await page.waitForLoadState('networkidle');

    // Click edit on the first project (Legacy System Migration)
    const firstEditButton = page.locator('[data-testid*="edit"]').nth(1); // Second project
    await firstEditButton.click();

    // Wait for modal to appear
    await page.waitForSelector('text="Edit Project"', { timeout: 5000 });

    // Check that date fields are populated
    const startDateInput = page.locator('input[name="start_date"]');
    const endDateInput = page.locator('input[name="end_date"]');

    // Get the values
    const startDateValue = await startDateInput.inputValue();
    const endDateValue = await endDateInput.inputValue();

    console.log('Start Date:', startDateValue);
    console.log('End Date:', endDateValue);

    // Verify dates are not empty
    expect(startDateValue).not.toBe('');
    expect(endDateValue).not.toBe('');

    // Verify dates are in correct format (yyyy-MM-dd)
    expect(startDateValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(endDateValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // For Legacy System Migration, we expect dates around March-September 2025
    expect(startDateValue).toContain('2025');
    expect(endDateValue).toContain('2025');
  });
});
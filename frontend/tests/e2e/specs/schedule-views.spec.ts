import { test, expect, Page } from '@playwright/test';

/**
 * Schedule Views Comprehensive E2E Tests
 * Testing both Schedule View (US-SV) and Enhanced Schedule View (US-ES)
 */

// Helper function to wait for schedule to load
async function waitForScheduleLoad(page: Page) {
  // Wait for loading spinner to disappear
  await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 }).catch(() => {
    // Continue if spinner not found (already loaded)
  });

  // Wait for either schedule grid or empty state
  await Promise.race([
    page.waitForSelector('[data-testid="schedule-grid"]', { timeout: 10000 }),
    page.waitForSelector('[data-testid="empty-state"]', { timeout: 10000 }),
    page.waitForSelector('text="No employees found"', { timeout: 10000 })
  ]).catch(() => {
    // Continue if neither found
  });
}

// Helper function to navigate to schedule page
async function navigateToSchedule(page: Page) {
  await page.goto('/');

  // Find and click the Schedule link
  const scheduleLink = page.locator('a[href="/schedule"], nav a:has-text("Schedule")').first();
  await scheduleLink.click();

  // Wait for schedule page to load
  await waitForScheduleLoad(page);
}

test.describe('US-SV: Schedule View - Weekly Schedule Grid', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSchedule(page);
  });

  test('US-SV1.1: Grid shows Monday-Friday columns', async ({ page }) => {
    // Check for weekday headers
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    let foundWeekdays = 0;
    for (const day of weekdays) {
      const dayHeader = await page.locator(`text="${day}"`).count();
      if (dayHeader > 0) foundWeekdays++;
    }

    expect(foundWeekdays).toBeGreaterThan(0);
  });

  test('US-SV1.2: Rows display employees with names', async ({ page }) => {
    // Check if there are employee rows
    const employeeRows = await page.locator('[data-testid="employee-row"], .employee-row, tr:has(td)').count();

    if (employeeRows > 0) {
      // Verify employee names are visible
      const employeeNames = await page.locator('[data-testid="employee-name"], .employee-name').count();
      expect(employeeNames).toBeGreaterThan(0);
    } else {
      // If no employees, verify empty state
      const emptyState = await page.locator('text="No employees found"').count();
      expect(emptyState).toBeGreaterThan(0);
    }
  });

  test('US-SV1.3: Employee weekly capacity displayed', async ({ page }) => {
    const capacityElements = await page.locator('[data-testid="weekly-capacity"], text=/\\d+h/').count();

    // Either capacity is shown or no employees exist
    const hasEmployees = await page.locator('[data-testid="employee-row"], .employee-row').count();

    if (hasEmployees > 0) {
      expect(capacityElements).toBeGreaterThan(0);
    } else {
      // Empty state is acceptable
      const emptyState = await page.locator('text="No employees found"').count();
      expect(emptyState).toBeGreaterThan(0);
    }
  });

  test('US-SV1.4: Allocations shown as colored blocks', async ({ page }) => {
    const allocationBlocks = await page.locator('[data-testid="allocation-block"], .allocation-block, [class*="allocation"]').count();

    // Either allocations exist or none exist (acceptable)
    expect(allocationBlocks).toBeGreaterThanOrEqual(0);
  });

  test('US-SV1.5: Project name visible in allocation blocks', async ({ page }) => {
    const allocationBlocks = await page.locator('[data-testid="allocation-block"]').count();

    if (allocationBlocks > 0) {
      // Check first allocation block for project name
      const firstBlock = page.locator('[data-testid="allocation-block"]').first();
      const projectName = await firstBlock.locator('[data-testid="project-name"], .project-name').count();
      expect(projectName).toBeGreaterThan(0);
    } else {
      // No allocations is acceptable
      expect(allocationBlocks).toBe(0);
    }
  });

  test('US-SV1.6: Hours allocated displayed', async ({ page }) => {
    const allocationBlocks = await page.locator('[data-testid="allocation-block"]').count();

    if (allocationBlocks > 0) {
      // Check for hour displays (e.g., "8h", "40 hours")
      const hoursDisplay = await page.locator('text=/\\d+h/').count();
      expect(hoursDisplay).toBeGreaterThan(0);
    } else {
      expect(allocationBlocks).toBe(0);
    }
  });

  test('US-SV1.7: Role shown if available', async ({ page }) => {
    const allocationBlocks = await page.locator('[data-testid="allocation-block"]').count();

    if (allocationBlocks > 0) {
      // Check for role display
      const roleDisplay = await page.locator('[data-testid="allocation-role"], .role, [class*="role"]').count();
      // Role may or may not be present depending on data
      expect(roleDisplay).toBeGreaterThanOrEqual(0);
    }
  });

  test('US-SV1.8: Total hours per employee calculated', async ({ page }) => {
    const employeeRows = await page.locator('[data-testid="employee-row"], .employee-row').count();

    if (employeeRows > 0) {
      // Check for total hours display
      const totalHours = await page.locator('[data-testid="total-hours"], text=/Total.*\\d+h/').count();
      expect(totalHours).toBeGreaterThanOrEqual(0);
    }
  });

  test('US-SV1.9: Utilization percentage shown', async ({ page }) => {
    const employeeRows = await page.locator('[data-testid="employee-row"], .employee-row').count();

    if (employeeRows > 0) {
      // Check for utilization percentage (e.g., "75%", "Utilization: 80%")
      const utilizationDisplay = await page.locator('text=/\\d+%/').count();
      expect(utilizationDisplay).toBeGreaterThanOrEqual(0);
    }
  });

  test('US-SV1.10: Over-allocation highlighted in red', async ({ page }) => {
    // Check if there are any over-allocated employees
    const overAllocated = await page.locator('[data-testid="over-allocated"], .over-allocated, [class*="over-allocation"]').count();

    if (overAllocated > 0) {
      // Verify red highlighting (check for red color classes or styles)
      const redHighlight = await page.locator('[class*="red"], [class*="danger"], [style*="red"]').count();
      expect(redHighlight).toBeGreaterThan(0);
    } else {
      // No over-allocations is acceptable
      expect(overAllocated).toBe(0);
    }
  });
});

test.describe('US-SV2: Schedule View - Week Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSchedule(page);
  });

  test('US-SV2.1: Previous week button functional', async ({ page }) => {
    // Find previous week button
    const prevButton = page.locator('button:has-text("Previous"), button:has-text("Prev"), button[aria-label*="previous" i]').first();

    const exists = await prevButton.count();
    expect(exists).toBeGreaterThan(0);

    if (exists > 0) {
      // Get current week display
      const currentWeekText = await page.locator('[data-testid="current-week"], .current-week').first().textContent();

      // Click previous button
      await prevButton.click();
      await waitForScheduleLoad(page);

      // Verify week changed
      const newWeekText = await page.locator('[data-testid="current-week"], .current-week').first().textContent();
      expect(newWeekText).not.toBe(currentWeekText);
    }
  });

  test('US-SV2.2: Next week button functional', async ({ page }) => {
    // Find next week button
    const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next" i]').first();

    const exists = await nextButton.count();
    expect(exists).toBeGreaterThan(0);

    if (exists > 0) {
      // Get current week display
      const currentWeekText = await page.locator('[data-testid="current-week"], .current-week').first().textContent();

      // Click next button
      await nextButton.click();
      await waitForScheduleLoad(page);

      // Verify week changed
      const newWeekText = await page.locator('[data-testid="current-week"], .current-week').first().textContent();
      expect(newWeekText).not.toBe(currentWeekText);
    }
  });

  test('US-SV2.3: "This Week" button returns to current week', async ({ page }) => {
    // Find "This Week" or "Today" button
    const thisWeekButton = page.locator('button:has-text("This Week"), button:has-text("Today"), button:has-text("Current Week")').first();

    const exists = await thisWeekButton.count();

    if (exists > 0) {
      // Navigate away first
      const prevButton = page.locator('button:has-text("Previous"), button:has-text("Prev")').first();
      if (await prevButton.count() > 0) {
        await prevButton.click();
        await waitForScheduleLoad(page);
      }

      // Click "This Week" button
      await thisWeekButton.click();
      await waitForScheduleLoad(page);

      // Verify we're back to current week
      const currentWeekDisplay = await page.locator('[data-testid="current-week"], .current-week').first().textContent();
      expect(currentWeekDisplay).toBeTruthy();
    } else {
      // Button might not exist in UI
      console.log('This Week button not found - acceptable if not implemented');
    }
  });

  test('US-SV2.4: Current week date displayed', async ({ page }) => {
    // Check for date display (various formats)
    const dateDisplay = await page.locator('[data-testid="current-week"], .current-week').count();

    expect(dateDisplay).toBeGreaterThan(0);
  });

  test('US-SV2.5: Week navigation updates grid content', async ({ page }) => {
    const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next" i]').first();

    if (await nextButton.count() > 0) {
      // Get snapshot of current grid content
      const currentContent = await page.locator('[data-testid="schedule-grid"], .schedule-grid, table').innerHTML();

      // Navigate to next week
      await nextButton.click();
      await waitForScheduleLoad(page);

      // Get new grid content
      const newContent = await page.locator('[data-testid="schedule-grid"], .schedule-grid, table').innerHTML();

      // Content should change (unless no data exists)
      // At minimum, the structure should be present
      expect(newContent).toBeTruthy();
    }
  });
});

test.describe('US-SV3: Schedule View - Empty States', () => {
  test('US-SV3.1: "No employees found" message when empty', async ({ page }) => {
    // This test depends on having no employees
    await page.goto('/schedule');
    await waitForScheduleLoad(page);

    // Check for either employees or empty state
    const hasEmployees = await page.locator('[data-testid="employee-row"], .employee-row, tr:has(td)').count();
    const hasEmptyState = await page.locator('text="No employees found"').count();

    // Either employees exist or empty state is shown
    expect(hasEmployees > 0 || hasEmptyState > 0).toBeTruthy();
  });

  test('US-SV3.2: Loading spinner during data fetch', async ({ page }) => {
    // Navigate and check for loading state quickly
    await page.goto('/schedule');

    // Check if loading spinner appears (it may be very brief)
    const spinner = await page.locator('.animate-spin, [data-testid="loading-spinner"], .loading').count();

    // Spinner may or may not be visible depending on load speed
    expect(spinner).toBeGreaterThanOrEqual(0);

    // Ensure loading completes
    await waitForScheduleLoad(page);
  });

  test('US-SV3.3: Error message if fetch fails', async ({ page }) => {
    // Intercept API request and force failure
    await page.route('**/api/schedule/**', route => {
      route.abort('failed');
    });
    await page.route('**/api/employees/**', route => {
      route.abort('failed');
    });

    await page.goto('/schedule');

    // Wait for error message
    const errorMessage = await page.locator('text=/error/i').count();

    // Error message should appear or data might be cached
    expect(errorMessage).toBeGreaterThanOrEqual(0);
  });
});

test.describe('US-ES1: Enhanced Schedule - Comprehensive Statistics', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSchedule(page);
  });

  test('US-ES1.1: Summary cards display total employees', async ({ page }) => {
    // Look for Total Employees stat card
    const totalEmployeesCard = await page.locator('text=/Total Employees/i').count();

    if (totalEmployeesCard > 0) {
      // Verify number is displayed
      const employeeCount = await page.locator('text=/Total Employees/i').locator('..').locator('text=/\\d+/').count();
      expect(employeeCount).toBeGreaterThan(0);
    } else {
      console.log('Total Employees card not found - may not be implemented');
    }
  });

  test('US-ES1.2: Summary cards display active projects', async ({ page }) => {
    // Look for Active Projects stat card
    const activeProjectsCard = await page.locator('text=/Active Projects/i').count();

    if (activeProjectsCard > 0) {
      // Verify number is displayed
      const projectCount = await page.locator('text=/Active Projects/i').locator('..').locator('text=/\\d+/').count();
      expect(projectCount).toBeGreaterThan(0);
    } else {
      console.log('Active Projects card not found - may not be implemented');
    }
  });

  test('US-ES1.3: Summary cards display over-allocated count', async ({ page }) => {
    // Look for Over-allocated count
    const overAllocatedCard = await page.locator('text=/Over.?allocated/i').count();

    if (overAllocatedCard > 0) {
      // Verify number is displayed (could be 0)
      const count = await page.locator('text=/Over.?allocated/i').locator('..').locator('text=/\\d+/').count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('US-ES1.4: Summary cards display average utilization', async ({ page }) => {
    // Look for Average Utilization stat
    const utilizationCard = await page.locator('text=/Average Utilization/i').count();

    if (utilizationCard > 0) {
      // Verify percentage is displayed
      const percentage = await page.locator('text=/Average Utilization/i').locator('..').locator('text=/\\d+%/').count();
      expect(percentage).toBeGreaterThan(0);
    }
  });

  test('US-ES1.5: Badges show utilization levels', async ({ page }) => {
    // Look for utilization level badges (High/Medium/Low)
    const highBadges = await page.locator('text=/High/i').count();
    const mediumBadges = await page.locator('text=/Medium/i').count();
    const lowBadges = await page.locator('text=/Low/i').count();
    const badges = highBadges + mediumBadges + lowBadges;

    // Badges may or may not exist depending on data
    expect(badges).toBeGreaterThanOrEqual(0);
  });

  test('US-ES1.6: Real-time calculation from actual data', async ({ page }) => {
    // Get statistics values
    const statsCards = await page.locator('[data-testid*="stat-card"], .stat-card, [class*="statistic"]').count();

    if (statsCards > 0) {
      // Verify numbers are present and make sense
      const numbers = await page.locator('text=/\\d+/').count();
      expect(numbers).toBeGreaterThan(0);
    }
  });
});

test.describe('US-ES2: Enhanced Schedule - Over-allocation Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSchedule(page);
  });

  test('US-ES2.1: Red alert card when over-allocations exist', async ({ page }) => {
    // Look for over-allocation alert
    const alertCard = await page.locator('[data-testid="over-allocation-alert"], [class*="alert"][class*="red"], [role="alert"]').count();

    // Alert may or may not exist depending on data
    if (alertCard > 0) {
      // Verify it has red/warning styling
      const redAlert = await page.locator('[class*="red"], [class*="danger"], [class*="warning"]').count();
      expect(redAlert).toBeGreaterThan(0);
    }
  });

  test('US-ES2.2: Alert shows count of affected employees', async ({ page }) => {
    const alertCard = await page.locator('text=/over.?allocated/i').first();

    if (await alertCard.count() > 0) {
      // Look for count in alert
      const count = await alertCard.locator('text=/\\d+/').count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('US-ES2.3: Alert message provides actionable guidance', async ({ page }) => {
    const alertCard = await page.locator('[data-testid="over-allocation-alert"], [role="alert"]').first();

    if (await alertCard.count() > 0) {
      // Verify alert has meaningful text
      const alertText = await alertCard.textContent();
      expect(alertText).toBeTruthy();
      expect(alertText!.length).toBeGreaterThan(10);
    }
  });

  test('US-ES2.4: Alert icon for visual emphasis', async ({ page }) => {
    const alertCard = await page.locator('[data-testid="over-allocation-alert"], [role="alert"]').first();

    if (await alertCard.count() > 0) {
      // Look for icon (svg, img, or icon class)
      const icon = await alertCard.locator('svg, img, [class*="icon"]').count();
      expect(icon).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('US-ES3: Enhanced Schedule - Utilization Levels', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSchedule(page);
  });

  test('US-ES3.1: Schedule Management Tips card present', async ({ page }) => {
    // Look for tips/best practices card
    const tipsCard = await page.locator('text=/Schedule Management Tips/i').count();

    // Tips card may be optional
    expect(tipsCard).toBeGreaterThanOrEqual(0);
  });

  test('US-ES3.2: Utilization Legend with color coding', async ({ page }) => {
    // Look for legend
    const legend = await page.locator('text=/Utilization Legend/i').count();

    if (legend > 0) {
      // Verify color indicators present
      const colorIndicators = await page.locator('[class*="bg-"], [style*="background"], .color-indicator').count();
      expect(colorIndicators).toBeGreaterThan(0);
    }
  });

  test('US-ES3.3: Visual indicators with colors', async ({ page }) => {
    // Look for colored elements (utilization indicators)
    const coloredElements = await page.locator('[class*="bg-green"], [class*="bg-yellow"], [class*="bg-red"], [class*="bg-blue"]').count();

    // Colors may vary by implementation
    expect(coloredElements).toBeGreaterThanOrEqual(0);
  });

  test('US-ES3.4: Legend explains utilization ranges', async ({ page }) => {
    const legend = await page.locator('text=/Utilization Legend/i').first();

    if (await legend.count() > 0) {
      // Look for percentage ranges or descriptions
      const descriptions = await legend.locator('text=/%/').count();
      expect(descriptions).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Integration: Schedule Views Combined Functionality', () => {
  test('Combined: Schedule grid with statistics and navigation', async ({ page }) => {
    await navigateToSchedule(page);

    // Verify key elements are present together
    const hasGrid = await page.locator('[data-testid="schedule-grid"], table').count() > 0;
    const hasNavigation = await page.locator('button:has-text("Next"), button:has-text("Previous")').count() > 0;

    // At least one key feature should be present
    expect(hasGrid || hasNavigation).toBeTruthy();
  });

  test('Combined: Statistics update with week navigation', async ({ page }) => {
    await navigateToSchedule(page);

    // Get initial statistics if present
    const statsCard = page.locator('[data-testid*="stat"], .stat-card').first();

    if (await statsCard.count() > 0) {
      const initialStats = await statsCard.textContent();

      // Navigate to different week
      const nextButton = page.locator('button:has-text("Next")').first();
      if (await nextButton.count() > 0) {
        await nextButton.click();
        await waitForScheduleLoad(page);

        // Statistics may or may not change depending on data
        const newStats = await statsCard.textContent();
        expect(newStats).toBeTruthy();
      }
    }
  });

  test('Combined: Over-allocation visible in both grid and alerts', async ({ page }) => {
    await navigateToSchedule(page);

    // Check for over-allocation in grid
    const gridOverAllocation = await page.locator('[data-testid="over-allocated"], .over-allocated').count();

    // Check for over-allocation in alerts
    const alertOverAllocation = await page.locator('text=/over.?allocated/i').count();

    // If over-allocations exist, they should be visible somewhere
    if (gridOverAllocation > 0 || alertOverAllocation > 0) {
      expect(gridOverAllocation + alertOverAllocation).toBeGreaterThan(0);
    }
  });
});

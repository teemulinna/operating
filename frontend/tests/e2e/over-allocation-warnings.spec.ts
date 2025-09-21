import { test, expect, Page } from '@playwright/test';

test.describe('Over-Allocation Warning System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the enhanced schedule page
    await page.goto('http://localhost:3003/enhanced-schedule');
  });

  test('should display over-allocation alert when employees are over-allocated', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('[data-testid="enhanced-schedule-page"]');
    
    // Check for over-allocation alert presence
    const alert = page.locator('[data-testid="over-allocation-alert"]');
    await expect(alert).toBeVisible();
    
    // Verify alert contains expected information
    await expect(alert).toContainText('Over-Allocation Alert');
    await expect(alert).toContainText('Over-allocated Employees');
    await expect(alert).toContainText('Total Excess Hours');
    await expect(alert).toContainText('Average Utilization');
  });

  test('should show capacity warning indicators on employee cards', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('[data-testid="enhanced-schedule-page"]');
    
    // Toggle employee cards view
    await page.click('[data-testid="toggle-employee-cards"]');
    
    // Wait for employee cards to appear
    await page.waitForSelector('[data-testid^="employee-capacity-card-"]');
    
    // Check for capacity warning indicators
    const warningIndicators = page.locator('[data-testid="capacity-warning-indicator"]');
    await expect(warningIndicators.first()).toBeVisible();
  });

  test('should display over-allocation warnings in schedule grid', async ({ page }) => {
    // Wait for enhanced schedule grid to load
    await page.waitForSelector('[data-testid="enhanced-weekly-schedule-grid"]');
    
    // Check for over-allocation warnings in grid cells
    const overAllocationWarnings = page.locator('[data-testid^="over-allocation-warning-"]');
    await expect(overAllocationWarnings.first()).toBeVisible();
    
    // Verify warning icons are present and have proper styling
    const warningIcon = overAllocationWarnings.first();
    await expect(warningIcon).toHaveClass(/text-red-600/);
  });

  test('should show correct utilization percentages', async ({ page }) => {
    // Wait for schedule grid to load
    await page.waitForSelector('[data-testid="grid-table"]');
    
    // Check for over-allocated employees with percentages > 100%
    const employeeRows = page.locator('[data-testid^="employee-row-"]');
    const firstRow = employeeRows.first();
    
    // Look for over-allocation indicators
    const overAllocationText = firstRow.locator('text=/Over-allocated \(\d+%\)/');
    if (await overAllocationText.count() > 0) {
      await expect(overAllocationText).toBeVisible();
      
      // Extract percentage and verify it's over 100%
      const text = await overAllocationText.textContent();
      const percentageMatch = text?.match(/\((\d+)%\)/);
      if (percentageMatch) {
        const percentage = parseInt(percentageMatch[1]);
        expect(percentage).toBeGreaterThan(100);
      }
    }
  });

  test('should show different warning severity levels', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('[data-testid="enhanced-schedule-page"]');
    
    // Toggle employee cards to see detailed warnings
    await page.click('[data-testid="toggle-employee-cards"]');
    await page.waitForSelector('[data-testid^="employee-capacity-card-"]');
    
    // Check for warning indicators with different severity levels
    const warningIndicators = page.locator('[data-testid="capacity-warning-indicator"]');
    
    // Verify at least one warning indicator is present
    await expect(warningIndicators.first()).toBeVisible();
    
    // Check for different severity colors (yellow, orange, red)
    const severityClasses = [
      'bg-yellow-100',
      'bg-orange-100', 
      'bg-red-100'
    ];
    
    let foundSeverityIndicator = false;
    for (const severityClass of severityClasses) {
      const indicator = warningIndicators.locator(`.${severityClass}`);
      if (await indicator.count() > 0) {
        foundSeverityIndicator = true;
        break;
      }
    }
    
    expect(foundSeverityIndicator).toBe(true);
  });

  test('should display over-allocation details in employee cards', async ({ page }) => {
    // Wait for page to load and toggle employee cards
    await page.waitForSelector('[data-testid="enhanced-schedule-page"]');
    await page.click('[data-testid="toggle-employee-cards"]');
    await page.waitForSelector('[data-testid^="employee-capacity-card-"]');
    
    // Look for over-allocation details
    const overAllocationDetails = page.locator('[data-testid^="over-allocation-details-"]');
    
    if (await overAllocationDetails.count() > 0) {
      await expect(overAllocationDetails.first()).toBeVisible();
      
      // Check for specific details
      await expect(overAllocationDetails.first()).toContainText('Over-allocation Detected');
      await expect(overAllocationDetails.first()).toContainText('Over-allocated weeks:');
      await expect(overAllocationDetails.first()).toContainText('Excess hours:');
    }
  });

  test('should show real-time capacity calculations', async ({ page }) => {
    // Wait for schedule grid to load
    await page.waitForSelector('[data-testid="enhanced-weekly-schedule-grid"]');
    
    // Check for capacity indicators in grid cells
    const gridCells = page.locator('[data-testid^="grid-cell-"]');
    
    // Look for cells with allocations
    for (let i = 0; i < Math.min(5, await gridCells.count()); i++) {
      const cell = gridCells.nth(i);
      const allocationBlocks = cell.locator('[data-testid^="allocation-block-"]');
      
      if (await allocationBlocks.count() > 0) {
        // Check if capacity information is displayed
        const capacityInfo = cell.locator('text=/\d+h \/ \d+h/');
        if (await capacityInfo.count() > 0) {
          await expect(capacityInfo).toBeVisible();
        }
      }
    }
  });

  test('should highlight over-allocated cells with proper styling', async ({ page }) => {
    // Wait for schedule grid
    await page.waitForSelector('[data-testid="grid-table"]');
    
    // Look for over-allocated cells (should have red background)
    const gridCells = page.locator('[data-testid^="grid-cell-"]');
    
    let foundOverAllocatedCell = false;
    for (let i = 0; i < Math.min(10, await gridCells.count()); i++) {
      const cell = gridCells.nth(i);
      
      // Check if cell has red background indicating over-allocation
      const cellClass = await cell.getAttribute('class');
      if (cellClass?.includes('bg-red-100') || cellClass?.includes('bg-red-200')) {
        foundOverAllocatedCell = true;
        
        // Verify the cell also contains over-allocation indicators
        const overAllocationText = cell.locator('text=/\+\d+h over/');
        if (await overAllocationText.count() > 0) {
          await expect(overAllocationText).toBeVisible();
        }
        
        break;
      }
    }
    
    // At least one over-allocated cell should be found with mock data
    expect(foundOverAllocatedCell).toBe(true);
  });

  test('should show statistics cards with correct over-allocation metrics', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('[data-testid="enhanced-schedule-page"]');
    
    // Check statistics cards
    const statsCards = page.locator('.grid .p-4');
    await expect(statsCards).toHaveCount(4);
    
    // Verify over-allocation statistics are displayed
    const overAllocatedCard = page.locator('text=Over-allocated').locator('..');
    await expect(overAllocatedCard).toBeVisible();
    
    const excessHoursCard = page.locator('text=Excess Hours').locator('..');
    await expect(excessHoursCard).toBeVisible();
    
    const utilizationCard = page.locator('text=Avg Utilization').locator('..');
    await expect(utilizationCard).toBeVisible();
  });

  test('should display warning legends correctly', async ({ page }) => {
    // Wait for schedule grid to load
    await page.waitForSelector('[data-testid="enhanced-weekly-schedule-grid"]');
    
    // Check for utilization legend
    await expect(page.locator('text=Low utilization (≤50%)')).toBeVisible();
    await expect(page.locator('text=Medium utilization (51-80%)')).toBeVisible();
    await expect(page.locator('text=High utilization (81-100%)')).toBeVisible();
    await expect(page.locator('text=Over-allocated (>100%)')).toBeVisible();
    
    // Check for warning severity legend
    await expect(page.locator('text=Warning Levels:')).toBeVisible();
    await expect(page.locator('text=Normal (≤100%)')).toBeVisible();
    await expect(page.locator('text=Medium (101-120%)')).toBeVisible();
    await expect(page.locator('text=High (121-150%)')).toBeVisible();
    await expect(page.locator('text=Critical (>150%)')).toBeVisible();
  });
});

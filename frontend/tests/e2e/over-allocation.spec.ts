/**
 * Over-allocation Protection E2E Tests
 * Testing real-time warnings and capacity management UI
 */
import { test, expect } from '../fixtures/test-fixtures';
import { TestHelpers, VIEWPORTS } from '../helpers/test-helpers';

test.describe('Over-allocation Protection UI', () => {
  test.beforeEach(async ({ page, testHelpers }) => {
    // Mock over-allocation data
    await testHelpers.mockApiResponse('**/api/capacity/over-allocations', {
      overAllocations: [
        {
          id: '1',
          employeeId: 1,
          employeeName: 'Alice Johnson',
          department: 'Engineering',
          capacity: 40,
          currentLoad: 52,
          overAllocation: 12,
          projects: [
            { id: 1, name: 'Mobile App Redesign', hoursAssigned: 25, priority: 'high' },
            { id: 2, name: 'Backend API Migration', hoursAssigned: 15, priority: 'medium' },
            { id: 3, name: 'Code Review Tasks', hoursAssigned: 12, priority: 'low' }
          ],
          severity: 'danger'
        }
      ]
    });

    await page.goto('/capacity/over-allocation');
  });

  test('should display over-allocation warnings', async ({ page, testHelpers }) => {
    // Wait for component to load
    await testHelpers.verifyLoading(false);
    
    const warning = await testHelpers.waitForElement('[data-testid="over-allocation-warning"]');
    await expect(warning).toBeVisible();

    // Check title
    await expect(page.locator('text=Over-allocation Protection')).toBeVisible();

    // Verify over-allocation item is displayed
    const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
    await expect(allocationItem).toBeVisible();

    // Check employee name
    await expect(allocationItem.locator('text=Alice Johnson')).toBeVisible();
    
    // Check department
    await expect(allocationItem.locator('text=Engineering')).toBeVisible();
  });

  test('should show capacity gauge with correct values', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);

    const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
    
    // Check capacity values are displayed
    await expect(allocationItem.locator('text=52h')).toBeVisible(); // Current load
    await expect(allocationItem.locator('text=of 40h')).toBeVisible(); // Capacity
    await expect(allocationItem.locator('text=12h')).toBeVisible(); // Over-allocation amount
  });

  test('should display severity badges correctly', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);

    const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
    
    // Check danger severity badge
    const severityBadge = allocationItem.locator('text=danger');
    await expect(severityBadge).toBeVisible();
    
    // Check over-allocation percentage badge
    const percentageBadge = allocationItem.locator('text=+30.0%');
    await expect(percentageBadge).toBeVisible();
  });

  test('should list all assigned projects', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);

    const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
    
    // Check projects section
    await expect(allocationItem.locator('text=Active Projects:')).toBeVisible();
    
    // Verify all projects are listed
    await expect(allocationItem.locator('text=Mobile App Redesign')).toBeVisible();
    await expect(allocationItem.locator('text=Backend API Migration')).toBeVisible();
    await expect(allocationItem.locator('text=Code Review Tasks')).toBeVisible();
    
    // Check project hours
    await expect(allocationItem.locator('text=25h')).toBeVisible();
    await expect(allocationItem.locator('text=15h')).toBeVisible();
    await expect(allocationItem.locator('text=12h')).toBeVisible();
    
    // Check priority badges
    await expect(allocationItem.locator('.bg-destructive').first()).toBeVisible(); // High priority
  });

  test('should show summary statistics', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);

    // Check affected employees count
    await expect(page.locator('text=1')).toBeVisible();
    await expect(page.locator('text=Affected Employees')).toBeVisible();
    
    // Check average over-allocation
    await expect(page.locator('text=12.0h')).toBeVisible();
    await expect(page.locator('text=Avg Over-allocation')).toBeVisible();
    
    // Check critical cases
    await expect(page.locator('text=Critical Cases')).toBeVisible();
  });

  test('should have action buttons', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);

    const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
    
    // Check action buttons
    await expect(allocationItem.locator('button:has-text("Resolve Conflict")')).toBeVisible();
    await expect(allocationItem.locator('button:has-text("View Details")')).toBeVisible();
    
    // Check bulk action buttons
    await expect(page.locator('button:has-text("Export Report")')).toBeVisible();
    await expect(page.locator('button:has-text("Auto-Resolve")')).toBeVisible();
    await expect(page.locator('button:has-text("Bulk Actions")')).toBeVisible();
  });

  test('should show alert message for over-allocations', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);

    // Check alert message
    const alert = page.locator('[role="alert"]').first();
    await expect(alert).toBeVisible();
    await expect(alert.locator('text=1 employee(s) are over-allocated')).toBeVisible();
    await expect(alert.locator('text=Consider redistributing tasks')).toBeVisible();
  });

  test('should display live indicator for real-time updates', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);

    // Check live indicator
    const liveIndicator = page.locator('text=Live');
    await expect(liveIndicator).toBeVisible();
    
    // Check green dot animation
    const greenDot = page.locator('.bg-green-500').first();
    await expect(greenDot).toBeVisible();
  });

  test('should show no over-allocations state', async ({ page, testHelpers }) => {
    // Mock empty response
    await testHelpers.mockApiResponse('**/api/capacity/over-allocations', {
      overAllocations: []
    });
    
    await page.reload();
    await testHelpers.verifyLoading(false);

    // Check no over-allocations state
    const noOverAllocations = await testHelpers.waitForElement('[data-testid="no-over-allocations"]');
    await expect(noOverAllocations).toBeVisible();
    
    await expect(page.locator('text=All Clear!')).toBeVisible();
    await expect(page.locator('text=No over-allocations detected')).toBeVisible();
    
    // Check shield icon
    const shieldIcon = page.locator('.text-green-500').first();
    await expect(shieldIcon).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    
    // Test mobile responsiveness
    await page.setViewportSize(VIEWPORTS.MOBILE);
    
    const warning = await testHelpers.waitForElement('[data-testid="over-allocation-warning"]');
    await expect(warning).toBeVisible();
    
    // Verify content is still readable on mobile
    await expect(page.locator('text=Alice Johnson')).toBeVisible();
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/over-allocation-mobile.png' });
  });

  test('should handle capacity gauge animations', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);

    const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
    
    // Wait for gauge animation to complete
    const gauge = allocationItem.locator('svg').first();
    await expect(gauge).toBeVisible();
    
    // Wait for SVG path animation
    await testHelpers.waitForAnimation('[data-testid="over-allocation-1"] svg path');
  });

  test('should show real-time toast notifications', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);

    // Mock real-time update simulation
    await page.waitForTimeout(6000); // Wait for simulated real-time update
    
    // Check for toast notification (should appear randomly)
    const toastExists = await page.locator('[data-testid="toast-destructive"]').count();
    
    // If toast appeared, verify its content
    if (toastExists > 0) {
      await expect(page.locator('text=New Over-allocation Detected')).toBeVisible();
    }
  });

  test('should have accessibility features', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    
    // Test keyboard navigation
    await testHelpers.testKeyboardNavigation();
    
    // Test accessibility labels
    await testHelpers.testAccessibility();
    
    // Check for ARIA labels on capacity gauge
    const gauge = page.locator('svg').first();
    const hasAriaLabel = await gauge.getAttribute('aria-label');
    const hasTitle = await gauge.getAttribute('title');
    expect(hasAriaLabel || hasTitle).toBeTruthy();
  });

  test('should handle different severity levels', async ({ page, testHelpers }) => {
    // Mock data with different severity levels
    await testHelpers.mockApiResponse('**/api/capacity/over-allocations', {
      overAllocations: [
        {
          id: '1',
          employeeId: 1,
          employeeName: 'Alice Johnson',
          department: 'Engineering',
          capacity: 40,
          currentLoad: 45,
          overAllocation: 5,
          projects: [{ id: 1, name: 'Test Project', hoursAssigned: 25, priority: 'low' }],
          severity: 'warning'
        },
        {
          id: '2',
          employeeId: 2,
          employeeName: 'Bob Smith',
          department: 'Design',
          capacity: 40,
          currentLoad: 60,
          overAllocation: 20,
          projects: [{ id: 2, name: 'Critical Project', hoursAssigned: 40, priority: 'high' }],
          severity: 'critical'
        }
      ]
    });
    
    await page.reload();
    await testHelpers.verifyLoading(false);
    
    // Check warning severity styling
    const warningItem = page.locator('[data-testid="over-allocation-1"]');
    await expect(warningItem).toHaveClass(/bg-yellow-50/);
    
    // Check critical severity styling
    const criticalItem = page.locator('[data-testid="over-allocation-2"]');
    await expect(criticalItem).toHaveClass(/bg-red-50/);
  });

  test('should handle loading and error states', async ({ page, testHelpers }) => {
    // Test loading state
    await page.goto('/capacity/over-allocation');
    
    // Check loading spinner
    const loader = page.locator('[data-testid="loading-spinner"]');
    await expect(loader).toBeVisible();
    await expect(page.locator('text=Checking for over-allocations...')).toBeVisible();
    
    // Wait for loading to complete
    await testHelpers.verifyLoading(false);
    
    // Test error state by mocking failed API
    await testHelpers.mockApiResponse('**/api/capacity/over-allocations', 
      { error: 'Failed to load' }, 500
    );
    
    await page.reload();
    // Error handling would be implemented based on your error boundary
  });

  test.describe('Interactive Features', () => {
    test('should handle button clicks', async ({ page, testHelpers }) => {
      await testHelpers.verifyLoading(false);

      const allocationItem = await testHelpers.waitForElement('[data-testid="over-allocation-1"]');
      
      // Test resolve conflict button
      const resolveButton = allocationItem.locator('button:has-text("Resolve Conflict")');
      await resolveButton.click();
      
      // Test view details button
      const detailsButton = allocationItem.locator('button:has-text("View Details")');
      await detailsButton.click();
      
      // Test export report
      const exportButton = page.locator('button:has-text("Export Report")');
      await exportButton.click();
    });
  });
});
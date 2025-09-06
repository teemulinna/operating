/**
 * Visual Schedule E2E Tests
 * Comprehensive testing of drag-and-drop schedule management
 */
import { test, expect } from '../fixtures/test-fixtures';
import { TestHelpers, VIEWPORTS } from '../helpers/test-helpers';

test.describe('Visual Schedule Management', () => {
  test.beforeEach(async ({ page, testHelpers }) => {
    // Mock API responses for schedule data
    await testHelpers.mockApiResponse('**/api/projects/**', {
      projects: [
        {
          id: 1,
          name: 'Mobile App Redesign',
          description: 'Complete UI overhaul',
          status: 'active',
          priority: 'high'
        }
      ]
    });

    await testHelpers.mockApiResponse('**/api/employees/**', {
      employees: [
        {
          id: 1,
          name: 'Alice Johnson',
          department: 'Engineering',
          role: 'Senior Developer'
        }
      ]
    });

    await testHelpers.mockApiResponse('**/api/assignments/**', {
      assignments: [
        {
          id: '1',
          employeeId: 1,
          employeeName: 'Alice Johnson',
          projectId: 1,
          projectName: 'Mobile App Redesign',
          hours: 8,
          date: new Date().toISOString(),
          task: 'Component Development',
          priority: 'high',
          color: '#ff6b6b'
        }
      ]
    });

    await page.goto('/schedule');
  });

  test('should display weekly schedule grid', async ({ page, testHelpers }) => {
    // Wait for schedule to load
    await testHelpers.verifyLoading(false);
    
    // Check that visual schedule is rendered
    const schedule = await testHelpers.waitForElement('[data-testid="visual-schedule"]');
    await expect(schedule).toBeVisible();

    // Verify 7 days are displayed
    for (let i = 0; i < 7; i++) {
      const day = await testHelpers.waitForElement(`[data-testid="schedule-day-${i}"]`);
      await expect(day).toBeVisible();
    }

    // Check navigation controls
    await expect(page.locator('[data-testid="prev-week-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-week-btn"]')).toBeVisible();
  });

  test('should support drag and drop functionality', async ({ page, testHelpers }) => {
    // Wait for schedule items to load
    const scheduleItem = await testHelpers.waitForElement('[data-testid="schedule-item-1"]');
    
    // Verify initial position
    const sourceDay = page.locator('[data-testid="schedule-day-0"]');
    const targetDay = page.locator('[data-testid="schedule-day-1"]');
    
    await expect(sourceDay.locator('[data-testid="schedule-item-1"]')).toBeVisible();
    
    // Perform drag and drop
    await testHelpers.dragAndDrop('[data-testid="schedule-item-1"]', '[data-testid="schedule-day-1"]');
    
    // Verify toast notification
    await testHelpers.verifyToast('Schedule Updated', 'success');
    
    // Verify item moved to new day
    await expect(targetDay.locator('[data-testid="schedule-item-1"]')).toBeVisible();
  });

  test('should filter by priority levels', async ({ page, testHelpers }) => {
    // Wait for schedule to load
    await testHelpers.verifyLoading(false);
    
    // Test high priority filter
    await testHelpers.clickAndWait('button:has-text("High")');
    await expect(page.locator('button:has-text("High")')).toHaveClass(/bg-red-100/);
    
    // Test medium priority filter
    await testHelpers.clickAndWait('button:has-text("Medium")');
    await expect(page.locator('button:has-text("Medium")')).toHaveClass(/bg-yellow-100/);
    
    // Test low priority filter
    await testHelpers.clickAndWait('button:has-text("Low")');
    await expect(page.locator('button:has-text("Low")')).toHaveClass(/bg-green-100/);
    
    // Reset to all
    await testHelpers.clickAndWait('button:has-text("All")');
    await expect(page.locator('button:has-text("All")')).toHaveClass(/bg-blue-100/);
  });

  test('should navigate between weeks', async ({ page, testHelpers }) => {
    // Get current week text
    const weekHeader = page.locator('h3').filter({ hasText: /Week of/ });
    const currentWeek = await weekHeader.textContent();
    
    // Navigate to next week
    await testHelpers.clickAndWait('[data-testid="next-week-btn"]');
    const nextWeek = await weekHeader.textContent();
    expect(nextWeek).not.toBe(currentWeek);
    
    // Navigate back to previous week
    await testHelpers.clickAndWait('[data-testid="prev-week-btn"]');
    const backToOriginal = await weekHeader.textContent();
    expect(backToOriginal).toBe(currentWeek);
  });

  test('should display task details correctly', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    
    const scheduleItem = await testHelpers.waitForElement('[data-testid="schedule-item-1"]');
    
    // Check employee name
    await expect(scheduleItem.locator('text=Alice Johnson')).toBeVisible();
    
    // Check project name
    await expect(scheduleItem.locator('text=Mobile App Redesign')).toBeVisible();
    
    // Check task description
    await expect(scheduleItem.locator('text=Component Development')).toBeVisible();
    
    // Check hours badge
    await expect(scheduleItem.locator('text=8h')).toBeVisible();
  });

  test('should highlight current day', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    
    // Find today's column (should have blue highlight)
    const currentDay = page.locator('.border-blue-400').first();
    await expect(currentDay).toBeVisible();
    
    // Check blue text for current day
    const currentDayText = currentDay.locator('.text-blue-600').first();
    await expect(currentDayText).toBeVisible();
  });

  test('should show empty state for days with no tasks', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    
    // Find empty day columns
    const emptyDay = page.locator('text=No tasks scheduled').first();
    await expect(emptyDay).toBeVisible();
    
    // Check clock icon
    const clockIcon = page.locator('[data-testid="schedule-day-6"] .lucide-clock').first();
    await expect(clockIcon).toBeVisible();
  });

  test('should be responsive across different screen sizes', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    
    // Test responsive design
    await testHelpers.testResponsiveDesign([
      VIEWPORTS.MOBILE,
      VIEWPORTS.TABLET,
      VIEWPORTS.DESKTOP
    ]);
    
    // On mobile, schedule should adapt layout
    await page.setViewportSize(VIEWPORTS.MOBILE);
    const schedule = await testHelpers.waitForElement('[data-testid="visual-schedule"]');
    await expect(schedule).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    
    // Test tab navigation
    await testHelpers.testKeyboardNavigation();
    
    // Test arrow key navigation for week switching
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter'); // Should trigger next week
    
    const weekHeader = page.locator('h3').filter({ hasText: /Week of/ });
    await expect(weekHeader).toBeVisible();
  });

  test('should have accessible labels and ARIA attributes', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    
    // Test accessibility
    await testHelpers.testAccessibility();
    
    // Check specific ARIA labels for schedule
    const schedule = await testHelpers.waitForElement('[data-testid="visual-schedule"]');
    const hasAriaLabel = await schedule.getAttribute('aria-label');
    expect(hasAriaLabel || await schedule.getAttribute('role')).toBeTruthy();
  });

  test('should export schedule data', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    
    // Click export button
    const exportBtn = page.locator('button:has-text("Export")');
    await expect(exportBtn).toBeVisible();
    
    // Mock download functionality
    await testHelpers.mockApiResponse('**/api/export/schedule', {
      success: true,
      downloadUrl: 'mock-download-url'
    });
    
    await exportBtn.click();
    
    // Verify API call was made
    await testHelpers.waitForApiResponse('**/api/export/schedule');
  });

  test('should show loading state initially', async ({ page }) => {
    // Navigate without mocking data to test loading state
    await page.goto('/schedule');
    
    // Check loading spinner is visible
    const loader = page.locator('[data-testid="loading-spinner"]');
    await expect(loader).toBeVisible();
    
    // Check loading message
    await expect(page.locator('text=Loading schedule...')).toBeVisible();
  });

  test('should handle drag and drop with smooth animations', async ({ page, testHelpers }) => {
    await testHelpers.verifyLoading(false);
    
    const scheduleItem = await testHelpers.waitForElement('[data-testid="schedule-item-1"]');
    
    // Verify initial animations
    await testHelpers.waitForAnimation('[data-testid="schedule-item-1"]');
    
    // Perform drag with animation check
    await scheduleItem.hover();
    await expect(scheduleItem).toHaveCSS('cursor', 'grab');
    
    // Start drag
    await scheduleItem.dragTo(page.locator('[data-testid="schedule-day-2"]'));
    
    // Wait for drop animation to complete
    await testHelpers.waitForAnimation('[data-testid="schedule-item-1"]');
  });

  test.describe('Priority Color Coding', () => {
    test('should display correct colors for different priorities', async ({ page, testHelpers }) => {
      await testHelpers.verifyLoading(false);
      
      // High priority - red
      const highPriorityItem = page.locator('[data-testid="schedule-item-1"]');
      await expect(highPriorityItem).toHaveClass(/border-red-300/);
      
      // Check legend
      await expect(page.locator('text=High Priority').first()).toBeVisible();
      await expect(page.locator('text=Medium Priority').first()).toBeVisible();
      await expect(page.locator('text=Low Priority').first()).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test('should handle WebSocket updates', async ({ page, testHelpers }) => {
      await testHelpers.verifyLoading(false);
      
      // Mock WebSocket connection
      await testHelpers.waitForWebSocket();
      
      // Simulate real-time update
      await page.evaluate(() => {
        // Simulate WebSocket message
        window.dispatchEvent(new CustomEvent('schedule-update', {
          detail: {
            type: 'TASK_MOVED',
            taskId: '1',
            newDate: new Date().toISOString()
          }
        }));
      });
      
      // Verify UI updates without page refresh
      await expect(page.locator('[data-testid="schedule-item-1"]')).toBeVisible();
    });
  });
});
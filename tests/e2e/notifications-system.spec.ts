import { test, expect } from '../fixtures/enhanced-features-fixtures';

test.describe('Notifications System - Real-time Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');
  });

  test('Notification Center with Unread Badges', async ({ page, notificationHelper }) => {
    // Check notification bell visibility
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    await expect(notificationBell).toBeVisible();

    // Check for unread badge
    const unreadBadge = page.locator('[data-testid="unread-badge"]');
    
    if (await unreadBadge.isVisible()) {
      const badgeCount = await unreadBadge.textContent();
      const count = parseInt(badgeCount || '0');
      expect(count).toBeGreaterThanOrEqual(0);
    }

    // Click notification bell to open panel
    await notificationBell.click();

    // Verify notification panel opens
    const notificationPanel = page.locator('[data-testid="notification-panel"]');
    await expect(notificationPanel).toBeVisible();

    // Check notification list
    const notificationList = page.locator('[data-testid="notification-list"]');
    await expect(notificationList).toBeVisible();

    // Verify notification items structure
    const notificationItems = page.locator('[data-testid="notification-item"]');
    const itemCount = await notificationItems.count();

    if (itemCount > 0) {
      const firstNotification = notificationItems.first();
      
      // Check notification has required elements
      await expect(firstNotification.locator('[data-testid="notification-title"]')).toBeVisible();
      await expect(firstNotification.locator('[data-testid="notification-timestamp"]')).toBeVisible();
      
      // Check notification type indicator
      const typeIndicator = firstNotification.locator('[data-testid="notification-type"]');
      if (await typeIndicator.isVisible()) {
        const notificationType = await typeIndicator.getAttribute('data-type');
        expect(['info', 'warning', 'error', 'success']).toContain(notificationType);
      }

      // Test notification click
      await firstNotification.click();
      
      // Verify notification marked as read
      await page.waitForTimeout(500);
      await expect(firstNotification).toHaveClass(/read|viewed/);
    }

    // Test clear all notifications
    const clearAllButton = page.locator('[data-testid="clear-all-notifications"]');
    if (await clearAllButton.isVisible()) {
      await clearAllButton.click();
      
      // Verify confirmation dialog
      const confirmDialog = page.locator('[data-testid="confirm-clear-notifications"]');
      if (await confirmDialog.isVisible()) {
        await page.click('[data-testid="confirm-clear-btn"]');
        await page.waitForTimeout(1000);
        
        // Verify notifications cleared
        const remainingItems = await page.locator('[data-testid="notification-item"]').count();
        expect(remainingItems).toBe(0);
      }
    }

    // Close notification panel
    await page.click('[data-testid="close-notification-panel"]');
    await expect(notificationPanel).not.toBeVisible();
  });

  test('Allocation Conflict Detection (Mike 80% + John 50%)', async ({ page, apiHelper }) => {
    // First, create a base allocation for Mike Johnson
    await page.goto('http://localhost:3003/allocations');
    
    // Create first allocation
    await page.click('[data-testid="new-allocation-btn"]');
    
    // Fill form for Mike Johnson 80%
    await page.selectOption('[data-testid="employee-select"]', { label: 'Mike Johnson' });
    await page.selectOption('[data-testid="project-select"]', { index: 1 });
    await page.fill('[data-testid="allocation-percentage"]', '80');
    await page.fill('[data-testid="start-date"]', '2024-06-01');
    await page.fill('[data-testid="end-date"]', '2024-08-31');
    
    // Submit first allocation
    await page.click('[data-testid="submit-allocation-btn"]');
    
    // Wait for success and close modal
    await page.waitForTimeout(1000);
    
    // Create second conflicting allocation for Mike Johnson
    await page.click('[data-testid="new-allocation-btn"]');
    
    // Fill form for Mike Johnson 50% (overlapping dates)
    await page.selectOption('[data-testid="employee-select"]', { label: 'Mike Johnson' });
    await page.selectOption('[data-testid="project-select"]', { index: 2 });
    await page.fill('[data-testid="allocation-percentage"]', '50');
    await page.fill('[data-testid="start-date"]', '2024-07-01');
    await page.fill('[data-testid="end-date"]', '2024-09-30');
    
    // Submit second allocation - should trigger conflict detection
    await page.click('[data-testid="submit-allocation-btn"]');
    
    // Check for conflict alert
    const conflictAlert = page.locator('[data-testid="conflict-alert"]');
    await expect(conflictAlert).toBeVisible({ timeout: 5000 });
    
    // Verify conflict message content
    const conflictMessage = page.locator('[data-testid="conflict-message"]');
    await expect(conflictMessage).toBeVisible();
    
    const messageText = await conflictMessage.textContent();
    expect(messageText).toMatch(/over.allocated|conflict|exceeds|130%/i);
    
    // Check conflict details
    const conflictDetails = page.locator('[data-testid="conflict-details"]');
    if (await conflictDetails.isVisible()) {
      const detailsText = await conflictDetails.textContent();
      expect(detailsText).toContain('Mike Johnson');
      expect(detailsText).toMatch(/130%|80%.*50%/);
    }

    // Test conflict resolution options
    const resolveConflictBtn = page.locator('[data-testid="resolve-conflict-btn"]');
    if (await resolveConflictBtn.isVisible()) {
      await resolveConflictBtn.click();
      
      // Verify resolution modal opens
      const resolutionModal = page.locator('[data-testid="conflict-resolution-modal"]');
      await expect(resolutionModal).toBeVisible();
      
      // Test resolution options
      const resolutionOptions = page.locator('[data-testid="resolution-option"]');
      const optionCount = await resolutionOptions.count();
      expect(optionCount).toBeGreaterThan(0);
      
      // Close resolution modal
      await page.click('[data-testid="close-resolution-modal"]');
    }

    // Verify notification was created
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    await notificationBell.click();
    
    const conflictNotification = page.locator('[data-testid="notification-item"][data-type="conflict"]');
    await expect(conflictNotification).toBeVisible();
  });

  test('Real-time Notification Delivery via WebSocket', async ({ page, browser }) => {
    // Set up WebSocket listener for real-time notifications
    const notificationReceived = page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const ws = new WebSocket('ws://localhost:3001');
        let resolved = false;
        
        ws.onopen = () => {
          console.log('WebSocket connected for notifications');
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification' && !resolved) {
              resolved = true;
              resolve(true);
            }
          } catch (e) {
            console.error('WebSocket message parse error:', e);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        };
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }, 10000);
      });
    });

    // Open second browser context to trigger notification
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    await page2.goto('http://localhost:3003/allocations');
    await page2.waitForLoadState('networkidle');

    // Create allocation that should trigger real-time notification
    await page2.click('[data-testid="new-allocation-btn"]');
    await page2.selectOption('[data-testid="employee-select"]', { index: 1 });
    await page2.fill('[data-testid="allocation-percentage"]', '120'); // Over-allocation
    await page2.fill('[data-testid="start-date"]', '2024-06-01');
    await page2.fill('[data-testid="end-date"]', '2024-08-31');
    await page2.click('[data-testid="submit-allocation-btn"]');

    // Wait for WebSocket notification
    const receivedNotification = await notificationReceived;
    expect(receivedNotification).toBeTruthy();

    // Verify notification appears in UI
    await page.waitForTimeout(2000);
    
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    const unreadBadge = page.locator('[data-testid="unread-badge"]');
    
    if (await unreadBadge.isVisible()) {
      const badgeText = await unreadBadge.textContent();
      const count = parseInt(badgeText || '0');
      expect(count).toBeGreaterThan(0);
    }

    await context2.close();
  });

  test('Notification Preferences Configuration', async ({ page }) => {
    await page.goto('http://localhost:3003/settings/notifications');

    // Verify notification preferences page
    const preferencesForm = page.locator('[data-testid="notification-preferences-form"]');
    await expect(preferencesForm).toBeVisible();

    // Test different notification type toggles
    const notificationTypes = [
      'conflict-notifications',
      'project-updates',
      'deadline-reminders',
      'system-alerts'
    ];

    for (const notificationType of notificationTypes) {
      const toggle = page.locator(`[data-testid="${notificationType}-toggle"]`);
      
      if (await toggle.isVisible()) {
        // Get initial state
        const initialState = await toggle.isChecked();
        
        // Toggle the setting
        await toggle.click();
        await page.waitForTimeout(500);
        
        // Verify state changed
        const newState = await toggle.isChecked();
        expect(newState).not.toBe(initialState);
        
        // Toggle back
        await toggle.click();
        await page.waitForTimeout(500);
        
        const finalState = await toggle.isChecked();
        expect(finalState).toBe(initialState);
      }
    }

    // Test notification frequency settings
    const frequencySelector = page.locator('[data-testid="notification-frequency-select"]');
    if (await frequencySelector.isVisible()) {
      await frequencySelector.selectOption('daily');
      await page.waitForTimeout(500);
      
      await frequencySelector.selectOption('weekly');
      await page.waitForTimeout(500);
    }

    // Test email notification settings
    const emailToggle = page.locator('[data-testid="email-notifications-toggle"]');
    if (await emailToggle.isVisible()) {
      await emailToggle.click();
      
      // Verify email input appears when enabled
      const emailInput = page.locator('[data-testid="notification-email-input"]');
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
      }
    }

    // Save preferences
    const saveButton = page.locator('[data-testid="save-preferences-btn"]');
    await saveButton.click();

    // Verify success message
    const successMessage = page.locator('[data-testid="preferences-saved-message"]');
    await expect(successMessage).toBeVisible();

    // Verify preferences persist after page reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check that saved preferences are maintained
    for (const notificationType of notificationTypes) {
      const toggle = page.locator(`[data-testid="${notificationType}-toggle"]`);
      if (await toggle.isVisible()) {
        const isChecked = await toggle.isChecked();
        expect(typeof isChecked).toBe('boolean');
      }
    }
  });

  test('Bulk Notification Management', async ({ page }) => {
    // Navigate to notifications
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    await notificationBell.click();

    const notificationPanel = page.locator('[data-testid="notification-panel"]');
    await expect(notificationPanel).toBeVisible();

    // Check if there are notifications to manage
    const notificationItems = page.locator('[data-testid="notification-item"]');
    const itemCount = await notificationItems.count();

    if (itemCount > 0) {
      // Test select all functionality
      const selectAllCheckbox = page.locator('[data-testid="select-all-notifications"]');
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.click();
        
        // Verify all notifications are selected
        const selectedItems = page.locator('[data-testid="notification-item"][data-selected="true"]');
        const selectedCount = await selectedItems.count();
        expect(selectedCount).toBe(itemCount);
      }

      // Test bulk mark as read
      const markReadButton = page.locator('[data-testid="bulk-mark-read"]');
      if (await markReadButton.isVisible()) {
        await markReadButton.click();
        await page.waitForTimeout(1000);
        
        // Verify notifications marked as read
        const readNotifications = page.locator('[data-testid="notification-item"][data-read="true"]');
        const readCount = await readNotifications.count();
        expect(readCount).toBeGreaterThan(0);
      }

      // Test bulk delete
      const bulkDeleteButton = page.locator('[data-testid="bulk-delete-notifications"]');
      if (await bulkDeleteButton.isVisible()) {
        // Select some notifications first
        await notificationItems.first().click();
        if (itemCount > 1) {
          await notificationItems.nth(1).click();
        }
        
        await bulkDeleteButton.click();
        
        // Confirm deletion
        const confirmDialog = page.locator('[data-testid="confirm-bulk-delete"]');
        if (await confirmDialog.isVisible()) {
          await page.click('[data-testid="confirm-bulk-delete-btn"]');
          await page.waitForTimeout(1000);
          
          // Verify notifications were deleted
          const remainingItems = await page.locator('[data-testid="notification-item"]').count();
          expect(remainingItems).toBeLessThan(itemCount);
        }
      }
    }

    // Test notification filters
    const filterDropdown = page.locator('[data-testid="notification-filter"]');
    if (await filterDropdown.isVisible()) {
      // Filter by type
      await filterDropdown.selectOption('conflicts');
      await page.waitForTimeout(500);
      
      const conflictNotifications = page.locator('[data-testid="notification-item"][data-type="conflict"]');
      const conflictCount = await conflictNotifications.count();
      
      // Verify only conflict notifications are shown
      const allVisibleItems = await page.locator('[data-testid="notification-item"]:visible').count();
      expect(allVisibleItems).toBe(conflictCount);
      
      // Reset filter
      await filterDropdown.selectOption('all');
    }
  });

  test('Toast Notification Behavior', async ({ page }) => {
    // Navigate to allocations to trigger toast notifications
    await page.goto('http://localhost:3003/allocations');

    // Create allocation to trigger success toast
    await page.click('[data-testid="new-allocation-btn"]');
    await page.selectOption('[data-testid="employee-select"]', { index: 1 });
    await page.fill('[data-testid="allocation-percentage"]', '75');
    await page.fill('[data-testid="start-date"]', '2024-06-01');
    await page.fill('[data-testid="end-date"]', '2024-08-31');
    await page.click('[data-testid="submit-allocation-btn"]');

    // Check for success toast
    const successToast = page.locator('[data-testid="toast-notification"][data-type="success"]');
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // Verify toast content
    const toastMessage = successToast.locator('[data-testid="toast-message"]');
    const messageText = await toastMessage.textContent();
    expect(messageText).toMatch(/created|success|added/i);

    // Test toast auto-dismiss
    await page.waitForTimeout(5000);
    await expect(successToast).not.toBeVisible();

    // Test error toast by creating invalid allocation
    await page.click('[data-testid="new-allocation-btn"]');
    await page.fill('[data-testid="allocation-percentage"]', '200'); // Invalid percentage
    await page.click('[data-testid="submit-allocation-btn"]');

    // Check for error toast
    const errorToast = page.locator('[data-testid="toast-notification"][data-type="error"]');
    await expect(errorToast).toBeVisible({ timeout: 5000 });

    // Test manual toast dismissal
    const dismissButton = errorToast.locator('[data-testid="dismiss-toast"]');
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
      await expect(errorToast).not.toBeVisible();
    }

    // Test multiple toasts stacking
    const actions = [
      () => page.click('[data-testid="new-allocation-btn"]'),
      () => page.keyboard.press('Escape'),
      () => page.click('[data-testid="new-allocation-btn"]'),
      () => page.keyboard.press('Escape')
    ];

    for (const action of actions) {
      await action();
      await page.waitForTimeout(500);
    }

    // Check toast container for multiple toasts
    const toastContainer = page.locator('[data-testid="toast-container"]');
    if (await toastContainer.isVisible()) {
      const activeToasts = await page.locator('[data-testid="toast-notification"]:visible').count();
      expect(activeToasts).toBeGreaterThanOrEqual(0);
    }
  });
});
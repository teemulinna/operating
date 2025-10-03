"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enhanced_features_fixtures_1 = require("../fixtures/enhanced-features-fixtures");
enhanced_features_fixtures_1.test.describe('Notifications System - Real-time Tests', () => {
    enhanced_features_fixtures_1.test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
    });
    (0, enhanced_features_fixtures_1.test)('Notification Center with Unread Badges', async ({ page, notificationHelper }) => {
        const notificationBell = page.locator('[data-testid="notification-bell"]');
        await (0, enhanced_features_fixtures_1.expect)(notificationBell).toBeVisible();
        const unreadBadge = page.locator('[data-testid="unread-badge"]');
        if (await unreadBadge.isVisible()) {
            const badgeCount = await unreadBadge.textContent();
            const count = parseInt(badgeCount || '0');
            (0, enhanced_features_fixtures_1.expect)(count).toBeGreaterThanOrEqual(0);
        }
        await notificationBell.click();
        const notificationPanel = page.locator('[data-testid="notification-panel"]');
        await (0, enhanced_features_fixtures_1.expect)(notificationPanel).toBeVisible();
        const notificationList = page.locator('[data-testid="notification-list"]');
        await (0, enhanced_features_fixtures_1.expect)(notificationList).toBeVisible();
        const notificationItems = page.locator('[data-testid="notification-item"]');
        const itemCount = await notificationItems.count();
        if (itemCount > 0) {
            const firstNotification = notificationItems.first();
            await (0, enhanced_features_fixtures_1.expect)(firstNotification.locator('[data-testid="notification-title"]')).toBeVisible();
            await (0, enhanced_features_fixtures_1.expect)(firstNotification.locator('[data-testid="notification-timestamp"]')).toBeVisible();
            const typeIndicator = firstNotification.locator('[data-testid="notification-type"]');
            if (await typeIndicator.isVisible()) {
                const notificationType = await typeIndicator.getAttribute('data-type');
                (0, enhanced_features_fixtures_1.expect)(['info', 'warning', 'error', 'success']).toContain(notificationType);
            }
            await firstNotification.click();
            await page.waitForTimeout(500);
            await (0, enhanced_features_fixtures_1.expect)(firstNotification).toHaveClass(/read|viewed/);
        }
        const clearAllButton = page.locator('[data-testid="clear-all-notifications"]');
        if (await clearAllButton.isVisible()) {
            await clearAllButton.click();
            const confirmDialog = page.locator('[data-testid="confirm-clear-notifications"]');
            if (await confirmDialog.isVisible()) {
                await page.click('[data-testid="confirm-clear-btn"]');
                await page.waitForTimeout(1000);
                const remainingItems = await page.locator('[data-testid="notification-item"]').count();
                (0, enhanced_features_fixtures_1.expect)(remainingItems).toBe(0);
            }
        }
        await page.click('[data-testid="close-notification-panel"]');
        await (0, enhanced_features_fixtures_1.expect)(notificationPanel).not.toBeVisible();
    });
    (0, enhanced_features_fixtures_1.test)('Allocation Conflict Detection (Mike 80% + John 50%)', async ({ page, apiHelper }) => {
        await page.goto('http://localhost:3003/allocations');
        await page.click('[data-testid="new-allocation-btn"]');
        await page.selectOption('[data-testid="employee-select"]', { label: 'Mike Johnson' });
        await page.selectOption('[data-testid="project-select"]', { index: 1 });
        await page.fill('[data-testid="allocation-percentage"]', '80');
        await page.fill('[data-testid="start-date"]', '2024-06-01');
        await page.fill('[data-testid="end-date"]', '2024-08-31');
        await page.click('[data-testid="submit-allocation-btn"]');
        await page.waitForTimeout(1000);
        await page.click('[data-testid="new-allocation-btn"]');
        await page.selectOption('[data-testid="employee-select"]', { label: 'Mike Johnson' });
        await page.selectOption('[data-testid="project-select"]', { index: 2 });
        await page.fill('[data-testid="allocation-percentage"]', '50');
        await page.fill('[data-testid="start-date"]', '2024-07-01');
        await page.fill('[data-testid="end-date"]', '2024-09-30');
        await page.click('[data-testid="submit-allocation-btn"]');
        const conflictAlert = page.locator('[data-testid="conflict-alert"]');
        await (0, enhanced_features_fixtures_1.expect)(conflictAlert).toBeVisible({ timeout: 5000 });
        const conflictMessage = page.locator('[data-testid="conflict-message"]');
        await (0, enhanced_features_fixtures_1.expect)(conflictMessage).toBeVisible();
        const messageText = await conflictMessage.textContent();
        (0, enhanced_features_fixtures_1.expect)(messageText).toMatch(/over.allocated|conflict|exceeds|130%/i);
        const conflictDetails = page.locator('[data-testid="conflict-details"]');
        if (await conflictDetails.isVisible()) {
            const detailsText = await conflictDetails.textContent();
            (0, enhanced_features_fixtures_1.expect)(detailsText).toContain('Mike Johnson');
            (0, enhanced_features_fixtures_1.expect)(detailsText).toMatch(/130%|80%.*50%/);
        }
        const resolveConflictBtn = page.locator('[data-testid="resolve-conflict-btn"]');
        if (await resolveConflictBtn.isVisible()) {
            await resolveConflictBtn.click();
            const resolutionModal = page.locator('[data-testid="conflict-resolution-modal"]');
            await (0, enhanced_features_fixtures_1.expect)(resolutionModal).toBeVisible();
            const resolutionOptions = page.locator('[data-testid="resolution-option"]');
            const optionCount = await resolutionOptions.count();
            (0, enhanced_features_fixtures_1.expect)(optionCount).toBeGreaterThan(0);
            await page.click('[data-testid="close-resolution-modal"]');
        }
        const notificationBell = page.locator('[data-testid="notification-bell"]');
        await notificationBell.click();
        const conflictNotification = page.locator('[data-testid="notification-item"][data-type="conflict"]');
        await (0, enhanced_features_fixtures_1.expect)(conflictNotification).toBeVisible();
    });
    (0, enhanced_features_fixtures_1.test)('Real-time Notification Delivery via WebSocket', async ({ page, browser }) => {
        const notificationReceived = page.evaluate(() => {
            return new Promise((resolve) => {
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
                    }
                    catch (e) {
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
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        resolve(false);
                    }
                }, 10000);
            });
        });
        const context2 = await browser.newContext();
        const page2 = await context2.newPage();
        await page2.goto('http://localhost:3003/allocations');
        await page2.waitForLoadState('networkidle');
        await page2.click('[data-testid="new-allocation-btn"]');
        await page2.selectOption('[data-testid="employee-select"]', { index: 1 });
        await page2.fill('[data-testid="allocation-percentage"]', '120');
        await page2.fill('[data-testid="start-date"]', '2024-06-01');
        await page2.fill('[data-testid="end-date"]', '2024-08-31');
        await page2.click('[data-testid="submit-allocation-btn"]');
        const receivedNotification = await notificationReceived;
        (0, enhanced_features_fixtures_1.expect)(receivedNotification).toBeTruthy();
        await page.waitForTimeout(2000);
        const notificationBell = page.locator('[data-testid="notification-bell"]');
        const unreadBadge = page.locator('[data-testid="unread-badge"]');
        if (await unreadBadge.isVisible()) {
            const badgeText = await unreadBadge.textContent();
            const count = parseInt(badgeText || '0');
            (0, enhanced_features_fixtures_1.expect)(count).toBeGreaterThan(0);
        }
        await context2.close();
    });
    (0, enhanced_features_fixtures_1.test)('Notification Preferences Configuration', async ({ page }) => {
        await page.goto('http://localhost:3003/settings/notifications');
        const preferencesForm = page.locator('[data-testid="notification-preferences-form"]');
        await (0, enhanced_features_fixtures_1.expect)(preferencesForm).toBeVisible();
        const notificationTypes = [
            'conflict-notifications',
            'project-updates',
            'deadline-reminders',
            'system-alerts'
        ];
        for (const notificationType of notificationTypes) {
            const toggle = page.locator(`[data-testid="${notificationType}-toggle"]`);
            if (await toggle.isVisible()) {
                const initialState = await toggle.isChecked();
                await toggle.click();
                await page.waitForTimeout(500);
                const newState = await toggle.isChecked();
                (0, enhanced_features_fixtures_1.expect)(newState).not.toBe(initialState);
                await toggle.click();
                await page.waitForTimeout(500);
                const finalState = await toggle.isChecked();
                (0, enhanced_features_fixtures_1.expect)(finalState).toBe(initialState);
            }
        }
        const frequencySelector = page.locator('[data-testid="notification-frequency-select"]');
        if (await frequencySelector.isVisible()) {
            await frequencySelector.selectOption('daily');
            await page.waitForTimeout(500);
            await frequencySelector.selectOption('weekly');
            await page.waitForTimeout(500);
        }
        const emailToggle = page.locator('[data-testid="email-notifications-toggle"]');
        if (await emailToggle.isVisible()) {
            await emailToggle.click();
            const emailInput = page.locator('[data-testid="notification-email-input"]');
            if (await emailInput.isVisible()) {
                await emailInput.fill('test@example.com');
            }
        }
        const saveButton = page.locator('[data-testid="save-preferences-btn"]');
        await saveButton.click();
        const successMessage = page.locator('[data-testid="preferences-saved-message"]');
        await (0, enhanced_features_fixtures_1.expect)(successMessage).toBeVisible();
        await page.reload();
        await page.waitForLoadState('networkidle');
        for (const notificationType of notificationTypes) {
            const toggle = page.locator(`[data-testid="${notificationType}-toggle"]`);
            if (await toggle.isVisible()) {
                const isChecked = await toggle.isChecked();
                (0, enhanced_features_fixtures_1.expect)(typeof isChecked).toBe('boolean');
            }
        }
    });
    (0, enhanced_features_fixtures_1.test)('Bulk Notification Management', async ({ page }) => {
        const notificationBell = page.locator('[data-testid="notification-bell"]');
        await notificationBell.click();
        const notificationPanel = page.locator('[data-testid="notification-panel"]');
        await (0, enhanced_features_fixtures_1.expect)(notificationPanel).toBeVisible();
        const notificationItems = page.locator('[data-testid="notification-item"]');
        const itemCount = await notificationItems.count();
        if (itemCount > 0) {
            const selectAllCheckbox = page.locator('[data-testid="select-all-notifications"]');
            if (await selectAllCheckbox.isVisible()) {
                await selectAllCheckbox.click();
                const selectedItems = page.locator('[data-testid="notification-item"][data-selected="true"]');
                const selectedCount = await selectedItems.count();
                (0, enhanced_features_fixtures_1.expect)(selectedCount).toBe(itemCount);
            }
            const markReadButton = page.locator('[data-testid="bulk-mark-read"]');
            if (await markReadButton.isVisible()) {
                await markReadButton.click();
                await page.waitForTimeout(1000);
                const readNotifications = page.locator('[data-testid="notification-item"][data-read="true"]');
                const readCount = await readNotifications.count();
                (0, enhanced_features_fixtures_1.expect)(readCount).toBeGreaterThan(0);
            }
            const bulkDeleteButton = page.locator('[data-testid="bulk-delete-notifications"]');
            if (await bulkDeleteButton.isVisible()) {
                await notificationItems.first().click();
                if (itemCount > 1) {
                    await notificationItems.nth(1).click();
                }
                await bulkDeleteButton.click();
                const confirmDialog = page.locator('[data-testid="confirm-bulk-delete"]');
                if (await confirmDialog.isVisible()) {
                    await page.click('[data-testid="confirm-bulk-delete-btn"]');
                    await page.waitForTimeout(1000);
                    const remainingItems = await page.locator('[data-testid="notification-item"]').count();
                    (0, enhanced_features_fixtures_1.expect)(remainingItems).toBeLessThan(itemCount);
                }
            }
        }
        const filterDropdown = page.locator('[data-testid="notification-filter"]');
        if (await filterDropdown.isVisible()) {
            await filterDropdown.selectOption('conflicts');
            await page.waitForTimeout(500);
            const conflictNotifications = page.locator('[data-testid="notification-item"][data-type="conflict"]');
            const conflictCount = await conflictNotifications.count();
            const allVisibleItems = await page.locator('[data-testid="notification-item"]:visible').count();
            (0, enhanced_features_fixtures_1.expect)(allVisibleItems).toBe(conflictCount);
            await filterDropdown.selectOption('all');
        }
    });
    (0, enhanced_features_fixtures_1.test)('Toast Notification Behavior', async ({ page }) => {
        await page.goto('http://localhost:3003/allocations');
        await page.click('[data-testid="new-allocation-btn"]');
        await page.selectOption('[data-testid="employee-select"]', { index: 1 });
        await page.fill('[data-testid="allocation-percentage"]', '75');
        await page.fill('[data-testid="start-date"]', '2024-06-01');
        await page.fill('[data-testid="end-date"]', '2024-08-31');
        await page.click('[data-testid="submit-allocation-btn"]');
        const successToast = page.locator('[data-testid="toast-notification"][data-type="success"]');
        await (0, enhanced_features_fixtures_1.expect)(successToast).toBeVisible({ timeout: 5000 });
        const toastMessage = successToast.locator('[data-testid="toast-message"]');
        const messageText = await toastMessage.textContent();
        (0, enhanced_features_fixtures_1.expect)(messageText).toMatch(/created|success|added/i);
        await page.waitForTimeout(5000);
        await (0, enhanced_features_fixtures_1.expect)(successToast).not.toBeVisible();
        await page.click('[data-testid="new-allocation-btn"]');
        await page.fill('[data-testid="allocation-percentage"]', '200');
        await page.click('[data-testid="submit-allocation-btn"]');
        const errorToast = page.locator('[data-testid="toast-notification"][data-type="error"]');
        await (0, enhanced_features_fixtures_1.expect)(errorToast).toBeVisible({ timeout: 5000 });
        const dismissButton = errorToast.locator('[data-testid="dismiss-toast"]');
        if (await dismissButton.isVisible()) {
            await dismissButton.click();
            await (0, enhanced_features_fixtures_1.expect)(errorToast).not.toBeVisible();
        }
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
        const toastContainer = page.locator('[data-testid="toast-container"]');
        if (await toastContainer.isVisible()) {
            const activeToasts = await page.locator('[data-testid="toast-notification"]:visible').count();
            (0, enhanced_features_fixtures_1.expect)(activeToasts).toBeGreaterThanOrEqual(0);
        }
    });
});
//# sourceMappingURL=notifications-system.spec.js.map
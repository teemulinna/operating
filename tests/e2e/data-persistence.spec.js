"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enhanced_features_fixtures_1 = require("../fixtures/enhanced-features-fixtures");
enhanced_features_fixtures_1.test.describe('Data Persistence - Real Database Tests', () => {
    enhanced_features_fixtures_1.test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
    });
    (0, enhanced_features_fixtures_1.test)('Verify Changes Persist After Page Refresh', async ({ page }) => {
        const uniqueId = Date.now();
        const testData = {
            percentage: 85,
            startDate: '2024-11-01',
            endDate: '2024-12-31',
            notes: `Test allocation created at ${uniqueId}`
        };
        await page.goto('http://localhost:3003/allocations');
        await page.click('[data-testid="new-allocation-btn"]');
        await page.selectOption('[data-testid="employee-select"]', { index: 1 });
        await page.selectOption('[data-testid="project-select"]', { index: 1 });
        await page.fill('[data-testid="allocation-percentage"]', testData.percentage.toString());
        await page.fill('[data-testid="start-date"]', testData.startDate);
        await page.fill('[data-testid="end-date"]', testData.endDate);
        const notesField = page.locator('[data-testid="allocation-notes"]');
        if (await notesField.isVisible()) {
            await notesField.fill(testData.notes);
        }
        await page.click('[data-testid="submit-allocation-btn"]');
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="allocation-created-success"]')).toBeVisible();
        const createdAllocation = page.locator(`[data-testid="allocation-row"]:has-text("${testData.percentage}%")`);
        await (0, enhanced_features_fixtures_1.expect)(createdAllocation).toBeVisible();
        const allocationId = await createdAllocation.getAttribute('data-allocation-id');
        await page.reload();
        await page.waitForLoadState('networkidle');
        const persistedAllocation = page.locator(`[data-allocation-id="${allocationId}"]`);
        await (0, enhanced_features_fixtures_1.expect)(persistedAllocation).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(persistedAllocation).toContainText(`${testData.percentage}%`);
        await persistedAllocation.click();
        const allocationDetailsModal = page.locator('[data-testid="allocation-details-modal"]');
        if (await allocationDetailsModal.isVisible()) {
            await (0, enhanced_features_fixtures_1.expect)(allocationDetailsModal).toContainText(testData.startDate);
            await (0, enhanced_features_fixtures_1.expect)(allocationDetailsModal).toContainText(testData.endDate);
            if (testData.notes) {
                await (0, enhanced_features_fixtures_1.expect)(allocationDetailsModal).toContainText(testData.notes);
            }
        }
        const editButton = page.locator('[data-testid="edit-allocation-btn"]');
        if (await editButton.isVisible()) {
            await editButton.click();
            const newPercentage = 90;
            await page.fill('[data-testid="allocation-percentage"]', newPercentage.toString());
            await page.click('[data-testid="save-allocation-btn"]');
            await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="allocation-updated-success"]')).toBeVisible();
            await page.reload();
            await page.waitForLoadState('networkidle');
            const updatedAllocation = page.locator(`[data-allocation-id="${allocationId}"]`);
            await (0, enhanced_features_fixtures_1.expect)(updatedAllocation).toContainText(`${newPercentage}%`);
        }
    });
    (0, enhanced_features_fixtures_1.test)('Verify Database Updates Through API', async ({ page, apiHelper }) => {
        const initialResponse = await page.request.get('http://localhost:3001/api/allocations');
        (0, enhanced_features_fixtures_1.expect)(initialResponse.ok()).toBeTruthy();
        const initialData = await initialResponse.json();
        const initialCount = Array.isArray(initialData) ? initialData.length : (initialData.data?.length || 0);
        await page.goto('http://localhost:3003/allocations');
        await page.click('[data-testid="new-allocation-btn"]');
        await page.selectOption('[data-testid="employee-select"]', { index: 1 });
        await page.selectOption('[data-testid="project-select"]', { index: 1 });
        await page.fill('[data-testid="allocation-percentage"]', '95');
        await page.fill('[data-testid="start-date"]', '2024-12-01');
        await page.fill('[data-testid="end-date"]', '2024-12-31');
        await page.click('[data-testid="submit-allocation-btn"]');
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="allocation-created-success"]')).toBeVisible();
        await page.waitForTimeout(2000);
        const updatedResponse = await page.request.get('http://localhost:3001/api/allocations');
        (0, enhanced_features_fixtures_1.expect)(updatedResponse.ok()).toBeTruthy();
        const updatedData = await updatedResponse.json();
        const updatedCount = Array.isArray(updatedData) ? updatedData.length : (updatedData.data?.length || 0);
        (0, enhanced_features_fixtures_1.expect)(updatedCount).toBe(initialCount + 1);
        const allocations = Array.isArray(updatedData) ? updatedData : (updatedData.data || []);
        const newAllocation = allocations.find((alloc) => alloc.percentage === 95);
        (0, enhanced_features_fixtures_1.expect)(newAllocation).toBeTruthy();
        (0, enhanced_features_fixtures_1.expect)(newAllocation.startDate).toContain('2024-12-01');
        (0, enhanced_features_fixtures_1.expect)(newAllocation.endDate).toContain('2024-12-31');
        const updateResponse = await page.request.put(`http://localhost:3001/api/allocations/${newAllocation.id}`, {
            data: {
                percentage: 80,
                startDate: newAllocation.startDate,
                endDate: newAllocation.endDate,
                employeeId: newAllocation.employeeId,
                projectId: newAllocation.projectId
            }
        });
        (0, enhanced_features_fixtures_1.expect)(updateResponse.ok()).toBeTruthy();
        await page.reload();
        await page.waitForLoadState('networkidle');
        const updatedUIAllocation = page.locator(`[data-allocation-id="${newAllocation.id}"]`);
        await (0, enhanced_features_fixtures_1.expect)(updatedUIAllocation).toContainText('80%');
        const deleteResponse = await page.request.delete(`http://localhost:3001/api/allocations/${newAllocation.id}`);
        (0, enhanced_features_fixtures_1.expect)(deleteResponse.ok()).toBeTruthy();
        await page.reload();
        await page.waitForLoadState('networkidle');
        await (0, enhanced_features_fixtures_1.expect)(updatedUIAllocation).not.toBeVisible();
        const finalResponse = await page.request.get('http://localhost:3001/api/allocations');
        const finalData = await finalResponse.json();
        const finalCount = Array.isArray(finalData) ? finalData.length : (finalData.data?.length || 0);
        (0, enhanced_features_fixtures_1.expect)(finalCount).toBe(initialCount);
    });
    (0, enhanced_features_fixtures_1.test)('WebSocket Real-time Updates Between Browser Tabs', async ({ page, browser }) => {
        const context2 = await browser.newContext();
        const page2 = await context2.newPage();
        await page.goto('http://localhost:3003/allocations');
        await page2.goto('http://localhost:3003/allocations');
        await page.waitForLoadState('networkidle');
        await page2.waitForLoadState('networkidle');
        const initialCount1 = await page.locator('[data-testid="allocation-row"]').count();
        const initialCount2 = await page2.locator('[data-testid="allocation-row"]').count();
        (0, enhanced_features_fixtures_1.expect)(initialCount1).toBe(initialCount2);
        const wsUpdateReceived = page.evaluate(() => {
            return new Promise((resolve) => {
                const ws = new WebSocket('ws://localhost:3001');
                let resolved = false;
                ws.onopen = () => {
                    console.log('WebSocket connected for real-time updates');
                };
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('WebSocket message received:', data);
                        if (data.type === 'allocation_created' && !resolved) {
                            resolved = true;
                            resolve(true);
                        }
                    }
                    catch (e) {
                        console.error('WebSocket parse error:', e);
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
        await page2.click('[data-testid="new-allocation-btn"]');
        await page2.selectOption('[data-testid="employee-select"]', { index: 1 });
        await page2.selectOption('[data-testid="project-select"]', { index: 1 });
        await page2.fill('[data-testid="allocation-percentage"]', '88');
        await page2.fill('[data-testid="start-date"]', '2024-08-01');
        await page2.fill('[data-testid="end-date"]', '2024-10-31');
        await page2.click('[data-testid="submit-allocation-btn"]');
        const receivedUpdate = await wsUpdateReceived;
        (0, enhanced_features_fixtures_1.expect)(receivedUpdate).toBeTruthy();
        await page.waitForTimeout(3000);
        const updatedCount1 = await page.locator('[data-testid="allocation-row"]').count();
        (0, enhanced_features_fixtures_1.expect)(updatedCount1).toBe(initialCount1 + 1);
        const newAllocationOnPage1 = page.locator('[data-testid="allocation-row"]:has-text("88%")');
        await (0, enhanced_features_fixtures_1.expect)(newAllocationOnPage1).toBeVisible();
        await page.click('[data-testid="new-allocation-btn"]');
        await page.selectOption('[data-testid="employee-select"]', { index: 2 });
        await page.selectOption('[data-testid="project-select"]', { index: 2 });
        await page.fill('[data-testid="allocation-percentage"]', '77');
        await page.fill('[data-testid="start-date"]', '2024-09-01');
        await page.fill('[data-testid="end-date"]', '2024-11-30');
        await page.click('[data-testid="submit-allocation-btn"]');
        await page2.waitForTimeout(3000);
        const updatedCount2 = await page2.locator('[data-testid="allocation-row"]').count();
        (0, enhanced_features_fixtures_1.expect)(updatedCount2).toBe(initialCount2 + 2);
        const secondNewAllocation = page2.locator('[data-testid="allocation-row"]:has-text("77%")');
        await (0, enhanced_features_fixtures_1.expect)(secondNewAllocation).toBeVisible();
        await context2.close();
    });
    (0, enhanced_features_fixtures_1.test)('Concurrent Modification Handling', async ({ page, browser }) => {
        await page.goto('http://localhost:3003/allocations');
        await page.click('[data-testid="new-allocation-btn"]');
        await page.selectOption('[data-testid="employee-select"]', { index: 1 });
        await page.selectOption('[data-testid="project-select"]', { index: 1 });
        await page.fill('[data-testid="allocation-percentage"]', '60');
        await page.fill('[data-testid="start-date"]', '2024-07-01');
        await page.fill('[data-testid="end-date"]', '2024-09-30');
        await page.click('[data-testid="submit-allocation-btn"]');
        await page.waitForTimeout(2000);
        await page.reload();
        const allocationRow = page.locator('[data-testid="allocation-row"]:has-text("60%")').first();
        await (0, enhanced_features_fixtures_1.expect)(allocationRow).toBeVisible();
        const allocationId = await allocationRow.getAttribute('data-allocation-id');
        const context2 = await browser.newContext();
        const page2 = await context2.newPage();
        await page2.goto('http://localhost:3003/allocations');
        await allocationRow.click();
        await page.click('[data-testid="edit-allocation-btn"]');
        const page2AllocationRow = page2.locator(`[data-allocation-id="${allocationId}"]`);
        await page2AllocationRow.click();
        await page2.click('[data-testid="edit-allocation-btn"]');
        await page.fill('[data-testid="allocation-percentage"]', '70');
        await page2.fill('[data-testid="allocation-percentage"]', '80');
        await page.click('[data-testid="save-allocation-btn"]');
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="allocation-updated-success"]')).toBeVisible();
        await page2.click('[data-testid="save-allocation-btn"]');
        const conflictModal = page2.locator('[data-testid="conflict-resolution-modal"]');
        if (await conflictModal.isVisible()) {
            await (0, enhanced_features_fixtures_1.expect)(conflictModal).toContainText('modified');
            await (0, enhanced_features_fixtures_1.expect)(conflictModal).toContainText('70');
            await (0, enhanced_features_fixtures_1.expect)(conflictModal).toContainText('80');
            await page2.click('[data-testid="overwrite-changes-btn"]');
            await (0, enhanced_features_fixtures_1.expect)(page2.locator('[data-testid="overwrite-success"]')).toBeVisible();
        }
        else {
            await (0, enhanced_features_fixtures_1.expect)(page2.locator('[data-testid="allocation-updated-success"]')).toBeVisible();
        }
        await page.reload();
        await page2.reload();
        await page.waitForLoadState('networkidle');
        await page2.waitForLoadState('networkidle');
        const finalAllocation1 = page.locator(`[data-allocation-id="${allocationId}"]`);
        const finalAllocation2 = page2.locator(`[data-allocation-id="${allocationId}"]`);
        const value1 = await finalAllocation1.textContent();
        const value2 = await finalAllocation2.textContent();
        (0, enhanced_features_fixtures_1.expect)(value1).toBe(value2);
        await context2.close();
    });
    (0, enhanced_features_fixtures_1.test)('Database Transaction Integrity', async ({ page }) => {
        await page.goto('http://localhost:3003/allocations');
        await page.click('[data-testid="new-allocation-btn"]');
        await page.selectOption('[data-testid="employee-select"]', { index: 1 });
        await page.selectOption('[data-testid="project-select"]', { index: 1 });
        await page.fill('[data-testid="allocation-percentage"]', '200');
        await page.fill('[data-testid="start-date"]', '2024-12-31');
        await page.fill('[data-testid="end-date"]', '2024-01-01');
        await page.click('[data-testid="submit-allocation-btn"]');
        const validationError = page.locator('[data-testid="validation-error"]');
        await (0, enhanced_features_fixtures_1.expect)(validationError).toBeVisible();
        const response = await page.request.get('http://localhost:3001/api/allocations');
        const data = await response.json();
        const allocations = Array.isArray(data) ? data : (data.data || []);
        const invalidAllocation = allocations.find((alloc) => alloc.percentage === 200);
        (0, enhanced_features_fixtures_1.expect)(invalidAllocation).toBeFalsy();
        await page.fill('[data-testid="allocation-percentage"]', '75');
        await page.fill('[data-testid="start-date"]', '2024-08-01');
        await page.fill('[data-testid="end-date"]', '2024-10-31');
        await page.click('[data-testid="submit-allocation-btn"]');
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="allocation-created-success"]')).toBeVisible();
        await page.waitForTimeout(1000);
        const validResponse = await page.request.get('http://localhost:3001/api/allocations');
        const validData = await validResponse.json();
        const validAllocations = Array.isArray(validData) ? validData : (validData.data || []);
        const validAllocation = validAllocations.find((alloc) => alloc.percentage === 75);
        (0, enhanced_features_fixtures_1.expect)(validAllocation).toBeTruthy();
    });
    (0, enhanced_features_fixtures_1.test)('Data Consistency Across Multiple Operations', async ({ page }) => {
        const operationResults = [];
        await page.goto('http://localhost:3003/allocations');
        await page.click('[data-testid="new-allocation-btn"]');
        await page.selectOption('[data-testid="employee-select"]', { index: 1 });
        await page.selectOption('[data-testid="project-select"]', { index: 1 });
        await page.fill('[data-testid="allocation-percentage"]', '50');
        await page.fill('[data-testid="start-date"]', '2024-06-01');
        await page.fill('[data-testid="end-date"]', '2024-08-31');
        await page.click('[data-testid="submit-allocation-btn"]');
        await page.waitForTimeout(1000);
        operationResults.push({ operation: 'create', percentage: 50, success: true });
        await page.click('[data-testid="new-allocation-btn"]');
        await page.selectOption('[data-testid="employee-select"]', { index: 1 });
        await page.selectOption('[data-testid="project-select"]', { index: 2 });
        await page.fill('[data-testid="allocation-percentage"]', '40');
        await page.fill('[data-testid="start-date"]', '2024-06-15');
        await page.fill('[data-testid="end-date"]', '2024-09-15');
        await page.click('[data-testid="submit-allocation-btn"]');
        await page.waitForTimeout(1000);
        operationResults.push({ operation: 'create', percentage: 40, success: true });
        const firstAllocation = page.locator('[data-testid="allocation-row"]:has-text("50%")').first();
        await firstAllocation.click();
        await page.click('[data-testid="edit-allocation-btn"]');
        await page.fill('[data-testid="allocation-percentage"]', '55');
        await page.click('[data-testid="save-allocation-btn"]');
        await page.waitForTimeout(1000);
        operationResults.push({ operation: 'update', percentage: 55, success: true });
        const finalResponse = await page.request.get('http://localhost:3001/api/allocations');
        const finalData = await finalResponse.json();
        const finalAllocations = Array.isArray(finalData) ? finalData : (finalData.data || []);
        const allocation55 = finalAllocations.find((alloc) => alloc.percentage === 55);
        const allocation40 = finalAllocations.find((alloc) => alloc.percentage === 40);
        const allocation50 = finalAllocations.find((alloc) => alloc.percentage === 50);
        (0, enhanced_features_fixtures_1.expect)(allocation55).toBeTruthy();
        (0, enhanced_features_fixtures_1.expect)(allocation40).toBeTruthy();
        (0, enhanced_features_fixtures_1.expect)(allocation50).toBeFalsy();
        await page.reload();
        await page.waitForLoadState('networkidle');
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="allocation-row"]:has-text("55%")')).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="allocation-row"]:has-text("40%")')).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(page.locator('[data-testid="allocation-row"]:has-text("50%")')).not.toBeVisible();
        for (const allocation of [allocation55, allocation40]) {
            if (allocation) {
                await page.request.delete(`http://localhost:3001/api/allocations/${allocation.id}`);
            }
        }
    });
    (0, enhanced_features_fixtures_1.test)('Offline/Online State Handling', async ({ page, context }) => {
        await page.goto('http://localhost:3003/allocations');
        await context.setOffline(true);
        await page.click('[data-testid="new-allocation-btn"]');
        await page.selectOption('[data-testid="employee-select"]', { index: 1 });
        await page.selectOption('[data-testid="project-select"]', { index: 1 });
        await page.fill('[data-testid="allocation-percentage"]', '45');
        await page.fill('[data-testid="start-date"]', '2024-05-01');
        await page.fill('[data-testid="end-date"]', '2024-07-31');
        await page.click('[data-testid="submit-allocation-btn"]');
        const offlineMessage = page.locator('[data-testid="offline-message"]');
        const queuedMessage = page.locator('[data-testid="queued-for-sync"]');
        const isOfflineHandled = (await offlineMessage.isVisible()) || (await queuedMessage.isVisible());
        (0, enhanced_features_fixtures_1.expect)(isOfflineHandled).toBeTruthy();
        await context.setOffline(false);
        await page.waitForTimeout(3000);
        const syncSuccessMessage = page.locator('[data-testid="sync-success"]');
        if (await syncSuccessMessage.isVisible()) {
            await page.reload();
            await page.waitForLoadState('networkidle');
            const syncedAllocation = page.locator('[data-testid="allocation-row"]:has-text("45%")');
            await (0, enhanced_features_fixtures_1.expect)(syncedAllocation).toBeVisible();
        }
    });
});
//# sourceMappingURL=data-persistence.spec.js.map
import { test, expect } from '../fixtures/enhanced-features-fixtures';

test.describe('Data Persistence - Real Database Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');
  });

  test('Verify Changes Persist After Page Refresh', async ({ page }) => {
    // Create a unique test allocation
    const uniqueId = Date.now();
    const testData = {
      percentage: 85,
      startDate: '2024-11-01',
      endDate: '2024-12-31',
      notes: `Test allocation created at ${uniqueId}`
    };

    await page.goto('http://localhost:3003/allocations');

    // Create new allocation
    await page.click('[data-testid="new-allocation-btn"]');
    
    // Fill form with test data
    await page.selectOption('[data-testid="employee-select"]', { index: 1 });
    await page.selectOption('[data-testid="project-select"]', { index: 1 });
    await page.fill('[data-testid="allocation-percentage"]', testData.percentage.toString());
    await page.fill('[data-testid="start-date"]', testData.startDate);
    await page.fill('[data-testid="end-date"]', testData.endDate);
    
    const notesField = page.locator('[data-testid="allocation-notes"]');
    if (await notesField.isVisible()) {
      await notesField.fill(testData.notes);
    }

    // Submit allocation
    await page.click('[data-testid="submit-allocation-btn"]');

    // Wait for success confirmation
    await expect(page.locator('[data-testid="allocation-created-success"]')).toBeVisible();

    // Verify allocation appears in the list
    const createdAllocation = page.locator(`[data-testid="allocation-row"]:has-text("${testData.percentage}%")`);
    await expect(createdAllocation).toBeVisible();

    // Get allocation ID for tracking
    const allocationId = await createdAllocation.getAttribute('data-allocation-id');

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify allocation still exists after refresh
    const persistedAllocation = page.locator(`[data-allocation-id="${allocationId}"]`);
    await expect(persistedAllocation).toBeVisible();
    await expect(persistedAllocation).toContainText(`${testData.percentage}%`);

    // Click on allocation to view details
    await persistedAllocation.click();

    // Verify all details persist
    const allocationDetailsModal = page.locator('[data-testid="allocation-details-modal"]');
    if (await allocationDetailsModal.isVisible()) {
      await expect(allocationDetailsModal).toContainText(testData.startDate);
      await expect(allocationDetailsModal).toContainText(testData.endDate);
      
      if (testData.notes) {
        await expect(allocationDetailsModal).toContainText(testData.notes);
      }
    }

    // Test editing the allocation
    const editButton = page.locator('[data-testid="edit-allocation-btn"]');
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Update percentage
      const newPercentage = 90;
      await page.fill('[data-testid="allocation-percentage"]', newPercentage.toString());
      await page.click('[data-testid="save-allocation-btn"]');
      
      // Verify update success
      await expect(page.locator('[data-testid="allocation-updated-success"]')).toBeVisible();
      
      // Refresh again to verify persistence of update
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify updated value persists
      const updatedAllocation = page.locator(`[data-allocation-id="${allocationId}"]`);
      await expect(updatedAllocation).toContainText(`${newPercentage}%`);
    }
  });

  test('Verify Database Updates Through API', async ({ page, apiHelper }) => {
    // Get initial allocation count from API
    const initialResponse = await page.request.get('http://localhost:3001/api/allocations');
    expect(initialResponse.ok()).toBeTruthy();
    
    const initialData = await initialResponse.json();
    const initialCount = Array.isArray(initialData) ? initialData.length : (initialData.data?.length || 0);

    // Create allocation through UI
    await page.goto('http://localhost:3003/allocations');
    await page.click('[data-testid="new-allocation-btn"]');

    await page.selectOption('[data-testid="employee-select"]', { index: 1 });
    await page.selectOption('[data-testid="project-select"]', { index: 1 });
    await page.fill('[data-testid="allocation-percentage"]', '95');
    await page.fill('[data-testid="start-date"]', '2024-12-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');

    await page.click('[data-testid="submit-allocation-btn"]');

    // Wait for UI confirmation
    await expect(page.locator('[data-testid="allocation-created-success"]')).toBeVisible();
    await page.waitForTimeout(2000); // Allow time for database write

    // Verify through direct API call
    const updatedResponse = await page.request.get('http://localhost:3001/api/allocations');
    expect(updatedResponse.ok()).toBeTruthy();
    
    const updatedData = await updatedResponse.json();
    const updatedCount = Array.isArray(updatedData) ? updatedData.length : (updatedData.data?.length || 0);

    expect(updatedCount).toBe(initialCount + 1);

    // Find the newly created allocation
    const allocations = Array.isArray(updatedData) ? updatedData : (updatedData.data || []);
    const newAllocation = allocations.find((alloc: any) => alloc.percentage === 95);
    
    expect(newAllocation).toBeTruthy();
    expect(newAllocation.startDate).toContain('2024-12-01');
    expect(newAllocation.endDate).toContain('2024-12-31');

    // Test update through API
    const updateResponse = await page.request.put(`http://localhost:3001/api/allocations/${newAllocation.id}`, {
      data: {
        percentage: 80,
        startDate: newAllocation.startDate,
        endDate: newAllocation.endDate,
        employeeId: newAllocation.employeeId,
        projectId: newAllocation.projectId
      }
    });

    expect(updateResponse.ok()).toBeTruthy();

    // Verify update reflects in UI
    await page.reload();
    await page.waitForLoadState('networkidle');

    const updatedUIAllocation = page.locator(`[data-allocation-id="${newAllocation.id}"]`);
    await expect(updatedUIAllocation).toContainText('80%');

    // Test delete through API
    const deleteResponse = await page.request.delete(`http://localhost:3001/api/allocations/${newAllocation.id}`);
    expect(deleteResponse.ok()).toBeTruthy();

    // Verify deletion reflects in UI
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(updatedUIAllocation).not.toBeVisible();

    // Verify final count through API
    const finalResponse = await page.request.get('http://localhost:3001/api/allocations');
    const finalData = await finalResponse.json();
    const finalCount = Array.isArray(finalData) ? finalData.length : (finalData.data?.length || 0);

    expect(finalCount).toBe(initialCount);
  });

  test('WebSocket Real-time Updates Between Browser Tabs', async ({ page, browser }) => {
    // Create second browser context
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Navigate both pages to allocations
    await page.goto('http://localhost:3003/allocations');
    await page2.goto('http://localhost:3003/allocations');

    await page.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Count initial allocations on both pages
    const initialCount1 = await page.locator('[data-testid="allocation-row"]').count();
    const initialCount2 = await page2.locator('[data-testid="allocation-row"]').count();

    expect(initialCount1).toBe(initialCount2);

    // Set up WebSocket listener on page 1
    const wsUpdateReceived = page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
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
          } catch (e) {
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

    // Create allocation on page 2
    await page2.click('[data-testid="new-allocation-btn"]');
    await page2.selectOption('[data-testid="employee-select"]', { index: 1 });
    await page2.selectOption('[data-testid="project-select"]', { index: 1 });
    await page2.fill('[data-testid="allocation-percentage"]', '88');
    await page2.fill('[data-testid="start-date"]', '2024-08-01');
    await page2.fill('[data-testid="end-date"]', '2024-10-31');
    await page2.click('[data-testid="submit-allocation-btn"]');

    // Wait for WebSocket update
    const receivedUpdate = await wsUpdateReceived;
    expect(receivedUpdate).toBeTruthy();

    // Allow time for UI update
    await page.waitForTimeout(3000);

    // Verify page 1 shows the new allocation without refresh
    const updatedCount1 = await page.locator('[data-testid="allocation-row"]').count();
    expect(updatedCount1).toBe(initialCount1 + 1);

    // Verify the specific allocation appears on page 1
    const newAllocationOnPage1 = page.locator('[data-testid="allocation-row"]:has-text("88%")');
    await expect(newAllocationOnPage1).toBeVisible();

    // Test real-time updates in both directions
    await page.click('[data-testid="new-allocation-btn"]');
    await page.selectOption('[data-testid="employee-select"]', { index: 2 });
    await page.selectOption('[data-testid="project-select"]', { index: 2 });
    await page.fill('[data-testid="allocation-percentage"]', '77');
    await page.fill('[data-testid="start-date"]', '2024-09-01');
    await page.fill('[data-testid="end-date"]', '2024-11-30');
    await page.click('[data-testid="submit-allocation-btn"]');

    // Wait for real-time update on page 2
    await page2.waitForTimeout(3000);

    const updatedCount2 = await page2.locator('[data-testid="allocation-row"]').count();
    expect(updatedCount2).toBe(initialCount2 + 2);

    const secondNewAllocation = page2.locator('[data-testid="allocation-row"]:has-text("77%")');
    await expect(secondNewAllocation).toBeVisible();

    await context2.close();
  });

  test('Concurrent Modification Handling', async ({ page, browser }) => {
    // Create a test allocation first
    await page.goto('http://localhost:3003/allocations');
    await page.click('[data-testid="new-allocation-btn"]');
    
    await page.selectOption('[data-testid="employee-select"]', { index: 1 });
    await page.selectOption('[data-testid="project-select"]', { index: 1 });
    await page.fill('[data-testid="allocation-percentage"]', '60');
    await page.fill('[data-testid="start-date"]', '2024-07-01');
    await page.fill('[data-testid="end-date"]', '2024-09-30');
    await page.click('[data-testid="submit-allocation-btn"]');

    // Wait for creation
    await page.waitForTimeout(2000);
    await page.reload();

    // Get the allocation ID
    const allocationRow = page.locator('[data-testid="allocation-row"]:has-text("60%")').first();
    await expect(allocationRow).toBeVisible();
    const allocationId = await allocationRow.getAttribute('data-allocation-id');

    // Open second browser context
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto('http://localhost:3003/allocations');

    // Both pages edit the same allocation simultaneously
    await allocationRow.click();
    await page.click('[data-testid="edit-allocation-btn"]');

    const page2AllocationRow = page2.locator(`[data-allocation-id="${allocationId}"]`);
    await page2AllocationRow.click();
    await page2.click('[data-testid="edit-allocation-btn"]');

    // Both pages make different changes
    await page.fill('[data-testid="allocation-percentage"]', '70');
    await page2.fill('[data-testid="allocation-percentage"]', '80');

    // Page 1 saves first
    await page.click('[data-testid="save-allocation-btn"]');
    await expect(page.locator('[data-testid="allocation-updated-success"]')).toBeVisible();

    // Page 2 tries to save (should handle conflict)
    await page2.click('[data-testid="save-allocation-btn"]');

    // Check for conflict handling
    const conflictModal = page2.locator('[data-testid="conflict-resolution-modal"]');
    if (await conflictModal.isVisible()) {
      // Verify conflict details are shown
      await expect(conflictModal).toContainText('modified');
      await expect(conflictModal).toContainText('70'); // Page 1's value
      await expect(conflictModal).toContainText('80'); // Page 2's value

      // Choose to overwrite
      await page2.click('[data-testid="overwrite-changes-btn"]');
      
      // Verify overwrite success
      await expect(page2.locator('[data-testid="overwrite-success"]')).toBeVisible();
    } else {
      // If no conflict modal, verify the save was successful
      await expect(page2.locator('[data-testid="allocation-updated-success"]')).toBeVisible();
    }

    // Refresh both pages and verify final state
    await page.reload();
    await page2.reload();

    await page.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Both pages should show the same final value
    const finalAllocation1 = page.locator(`[data-allocation-id="${allocationId}"]`);
    const finalAllocation2 = page2.locator(`[data-allocation-id="${allocationId}"]`);

    const value1 = await finalAllocation1.textContent();
    const value2 = await finalAllocation2.textContent();

    expect(value1).toBe(value2);

    await context2.close();
  });

  test('Database Transaction Integrity', async ({ page }) => {
    // Test that partial failures don't corrupt data
    await page.goto('http://localhost:3003/allocations');

    // Create allocation that might trigger validation errors
    await page.click('[data-testid="new-allocation-btn"]');

    // Fill form with invalid data that should fail validation
    await page.selectOption('[data-testid="employee-select"]', { index: 1 });
    await page.selectOption('[data-testid="project-select"]', { index: 1 });
    await page.fill('[data-testid="allocation-percentage"]', '200'); // Invalid percentage
    await page.fill('[data-testid="start-date"]', '2024-12-31');
    await page.fill('[data-testid="end-date"]', '2024-01-01'); // End before start

    // Attempt to save
    await page.click('[data-testid="submit-allocation-btn"]');

    // Should see validation errors
    const validationError = page.locator('[data-testid="validation-error"]');
    await expect(validationError).toBeVisible();

    // Verify no partial data was saved by checking API
    const response = await page.request.get('http://localhost:3001/api/allocations');
    const data = await response.json();
    const allocations = Array.isArray(data) ? data : (data.data || []);
    
    // Should not find allocation with 200% percentage
    const invalidAllocation = allocations.find((alloc: any) => alloc.percentage === 200);
    expect(invalidAllocation).toBeFalsy();

    // Fix the form and submit valid data
    await page.fill('[data-testid="allocation-percentage"]', '75');
    await page.fill('[data-testid="start-date"]', '2024-08-01');
    await page.fill('[data-testid="end-date"]', '2024-10-31');

    await page.click('[data-testid="submit-allocation-btn"]');

    // Should succeed this time
    await expect(page.locator('[data-testid="allocation-created-success"]')).toBeVisible();

    // Verify valid data was saved
    await page.waitForTimeout(1000);
    const validResponse = await page.request.get('http://localhost:3001/api/allocations');
    const validData = await validResponse.json();
    const validAllocations = Array.isArray(validData) ? validData : (validData.data || []);
    
    const validAllocation = validAllocations.find((alloc: any) => alloc.percentage === 75);
    expect(validAllocation).toBeTruthy();
  });

  test('Data Consistency Across Multiple Operations', async ({ page }) => {
    const operationResults: any[] = [];
    
    // Perform multiple operations in sequence
    await page.goto('http://localhost:3003/allocations');

    // Operation 1: Create allocation
    await page.click('[data-testid="new-allocation-btn"]');
    await page.selectOption('[data-testid="employee-select"]', { index: 1 });
    await page.selectOption('[data-testid="project-select"]', { index: 1 });
    await page.fill('[data-testid="allocation-percentage"]', '50');
    await page.fill('[data-testid="start-date"]', '2024-06-01');
    await page.fill('[data-testid="end-date"]', '2024-08-31');
    await page.click('[data-testid="submit-allocation-btn"]');
    await page.waitForTimeout(1000);

    // Record result
    operationResults.push({ operation: 'create', percentage: 50, success: true });

    // Operation 2: Create second allocation for same employee
    await page.click('[data-testid="new-allocation-btn"]');
    await page.selectOption('[data-testid="employee-select"]', { index: 1 });
    await page.selectOption('[data-testid="project-select"]', { index: 2 });
    await page.fill('[data-testid="allocation-percentage"]', '40');
    await page.fill('[data-testid="start-date"]', '2024-06-15');
    await page.fill('[data-testid="end-date"]', '2024-09-15');
    await page.click('[data-testid="submit-allocation-btn"]');
    await page.waitForTimeout(1000);

    operationResults.push({ operation: 'create', percentage: 40, success: true });

    // Operation 3: Update first allocation
    const firstAllocation = page.locator('[data-testid="allocation-row"]:has-text("50%")').first();
    await firstAllocation.click();
    await page.click('[data-testid="edit-allocation-btn"]');
    await page.fill('[data-testid="allocation-percentage"]', '55');
    await page.click('[data-testid="save-allocation-btn"]');
    await page.waitForTimeout(1000);

    operationResults.push({ operation: 'update', percentage: 55, success: true });

    // Verify final state through API
    const finalResponse = await page.request.get('http://localhost:3001/api/allocations');
    const finalData = await finalResponse.json();
    const finalAllocations = Array.isArray(finalData) ? finalData : (finalData.data || []);

    // Should have allocations with 55% and 40%
    const allocation55 = finalAllocations.find((alloc: any) => alloc.percentage === 55);
    const allocation40 = finalAllocations.find((alloc: any) => alloc.percentage === 40);
    const allocation50 = finalAllocations.find((alloc: any) => alloc.percentage === 50);

    expect(allocation55).toBeTruthy();
    expect(allocation40).toBeTruthy();
    expect(allocation50).toBeFalsy(); // Should not exist after update

    // Verify UI consistency
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="allocation-row"]:has-text("55%")')).toBeVisible();
    await expect(page.locator('[data-testid="allocation-row"]:has-text("40%")')).toBeVisible();
    await expect(page.locator('[data-testid="allocation-row"]:has-text("50%")')).not.toBeVisible();

    // Clean up test data
    for (const allocation of [allocation55, allocation40]) {
      if (allocation) {
        await page.request.delete(`http://localhost:3001/api/allocations/${allocation.id}`);
      }
    }
  });

  test('Offline/Online State Handling', async ({ page, context }) => {
    await page.goto('http://localhost:3003/allocations');

    // Go offline
    await context.setOffline(true);

    // Try to create allocation while offline
    await page.click('[data-testid="new-allocation-btn"]');
    await page.selectOption('[data-testid="employee-select"]', { index: 1 });
    await page.selectOption('[data-testid="project-select"]', { index: 1 });
    await page.fill('[data-testid="allocation-percentage"]', '45');
    await page.fill('[data-testid="start-date"]', '2024-05-01');
    await page.fill('[data-testid="end-date"]', '2024-07-31');
    await page.click('[data-testid="submit-allocation-btn"]');

    // Should see offline message or queued state
    const offlineMessage = page.locator('[data-testid="offline-message"]');
    const queuedMessage = page.locator('[data-testid="queued-for-sync"]');
    
    const isOfflineHandled = (await offlineMessage.isVisible()) || (await queuedMessage.isVisible());
    expect(isOfflineHandled).toBeTruthy();

    // Go back online
    await context.setOffline(false);

    // Wait for sync
    await page.waitForTimeout(3000);

    // Check if sync occurred
    const syncSuccessMessage = page.locator('[data-testid="sync-success"]');
    if (await syncSuccessMessage.isVisible()) {
      // Verify allocation was created after sync
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const syncedAllocation = page.locator('[data-testid="allocation-row"]:has-text("45%")');
      await expect(syncedAllocation).toBeVisible();
    }
  });
});
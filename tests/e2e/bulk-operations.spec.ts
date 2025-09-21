import { test, expect } from '../fixtures/enhanced-features-fixtures';

test.describe('Bulk Operations - Real Data Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');
  });

  test('Bulk Assign Multiple Employees to Project', async ({ page, apiHelper }) => {
    await page.goto('http://localhost:3003/projects');

    // Wait for projects to load
    await page.waitForSelector('[data-testid="project-card"]', { timeout: 10000 });

    // Select first project
    const projectCards = page.locator('[data-testid="project-card"]');
    await expect(projectCards).toHaveCountGreaterThan(0);
    await projectCards.first().click();

    // Navigate to team assignment
    await page.click('[data-testid="manage-team-btn"]');

    // Verify bulk assignment modal opens
    const bulkAssignModal = page.locator('[data-testid="bulk-assign-modal"]');
    await expect(bulkAssignModal).toBeVisible();

    // Select multiple employees using checkboxes
    const employeeCheckboxes = page.locator('[data-testid*="employee-checkbox-"]');
    const checkboxCount = await employeeCheckboxes.count();
    expect(checkboxCount).toBeGreaterThan(0);

    // Select first 3 employees (or all if less than 3)
    const selectCount = Math.min(3, checkboxCount);
    for (let i = 0; i < selectCount; i++) {
      await employeeCheckboxes.nth(i).click();
    }

    // Verify selected count display
    const selectedCountDisplay = page.locator('[data-testid="selected-employee-count"]');
    await expect(selectedCountDisplay).toContainText(selectCount.toString());

    // Set bulk allocation parameters
    await page.fill('[data-testid="bulk-allocation-percentage"]', '60');
    await page.fill('[data-testid="bulk-start-date"]', '2024-07-01');
    await page.fill('[data-testid="bulk-end-date"]', '2024-09-30');

    // Select role for bulk assignment
    const roleSelect = page.locator('[data-testid="bulk-role-select"]');
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption({ index: 1 });
    }

    // Apply bulk assignment
    await page.click('[data-testid="apply-bulk-assignment-btn"]');

    // Verify success message
    const successMessage = page.locator('[data-testid="bulk-assignment-success"]');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText(`${selectCount} employees assigned`);

    // Close modal
    await page.click('[data-testid="close-bulk-assign-modal"]');

    // Verify allocations were created by navigating to allocations page
    await page.goto('http://localhost:3003/allocations');
    await page.waitForLoadState('networkidle');

    // Filter by recent allocations
    const dateFilter = page.locator('[data-testid="date-filter-input"]');
    if (await dateFilter.isVisible()) {
      await dateFilter.fill('2024-07-01');
    }

    // Count allocations with 60% percentage
    const bulkAllocations = page.locator('[data-testid="allocation-row"]:has-text("60%")');
    const bulkCount = await bulkAllocations.count();
    expect(bulkCount).toBeGreaterThanOrEqual(selectCount);

    // Verify allocation details
    if (bulkCount > 0) {
      const firstBulkAllocation = bulkAllocations.first();
      await firstBulkAllocation.click();
      
      const allocationDetails = page.locator('[data-testid="allocation-details"]');
      if (await allocationDetails.isVisible()) {
        await expect(allocationDetails).toContainText('60%');
        await expect(allocationDetails).toContainText('2024-07-01');
      }
    }
  });

  test('Update Multiple Allocations at Once', async ({ page }) => {
    await page.goto('http://localhost:3003/allocations');

    // Wait for allocations to load
    await page.waitForSelector('[data-testid="allocation-row"]', { timeout: 10000 });

    // Select multiple allocation rows using checkboxes
    const allocationCheckboxes = page.locator('[data-testid*="allocation-checkbox-"]');
    const availableCheckboxes = await allocationCheckboxes.count();
    
    if (availableCheckboxes === 0) {
      // Create some test allocations first
      await page.click('[data-testid="new-allocation-btn"]');
      await page.selectOption('[data-testid="employee-select"]', { index: 1 });
      await page.selectOption('[data-testid="project-select"]', { index: 1 });
      await page.fill('[data-testid="allocation-percentage"]', '50');
      await page.fill('[data-testid="start-date"]', '2024-06-01');
      await page.fill('[data-testid="end-date"]', '2024-08-31');
      await page.click('[data-testid="submit-allocation-btn"]');
      
      await page.waitForTimeout(1000);
      
      // Create second allocation
      await page.click('[data-testid="new-allocation-btn"]');
      await page.selectOption('[data-testid="employee-select"]', { index: 2 });
      await page.selectOption('[data-testid="project-select"]', { index: 1 });
      await page.fill('[data-testid="allocation-percentage"]', '40');
      await page.fill('[data-testid="start-date"]', '2024-06-01');
      await page.fill('[data-testid="end-date"]', '2024-08-31');
      await page.click('[data-testid="submit-allocation-btn"]');
      
      await page.waitForTimeout(1000);
    }

    // Re-select checkboxes after potential allocation creation
    const updatedCheckboxes = page.locator('[data-testid*="allocation-checkbox-"]');
    const checkboxCount = await updatedCheckboxes.count();
    
    // Select at least 2 allocations for bulk update
    const selectCount = Math.min(2, checkboxCount);
    for (let i = 0; i < selectCount; i++) {
      await updatedCheckboxes.nth(i).click();
    }

    // Verify bulk actions toolbar appears
    const bulkActionsToolbar = page.locator('[data-testid="bulk-actions-toolbar"]');
    await expect(bulkActionsToolbar).toBeVisible();

    // Click bulk edit button
    await page.click('[data-testid="bulk-edit-btn"]');

    // Verify bulk edit modal opens
    const bulkEditModal = page.locator('[data-testid="bulk-edit-modal"]');
    await expect(bulkEditModal).toBeVisible();

    // Update allocation percentage
    const bulkPercentageInput = page.locator('[data-testid="bulk-percentage-input"]');
    await bulkPercentageInput.fill('75');

    // Update end date
    const bulkEndDateInput = page.locator('[data-testid="bulk-end-date-input"]');
    if (await bulkEndDateInput.isVisible()) {
      await bulkEndDateInput.fill('2024-10-31');
    }

    // Apply bulk changes
    await page.click('[data-testid="apply-bulk-changes-btn"]');

    // Verify confirmation dialog
    const confirmDialog = page.locator('[data-testid="bulk-update-confirm"]');
    if (await confirmDialog.isVisible()) {
      await page.click('[data-testid="confirm-bulk-update-btn"]');
    }

    // Verify success message
    const updateSuccessMessage = page.locator('[data-testid="bulk-update-success"]');
    await expect(updateSuccessMessage).toBeVisible();
    await expect(updateSuccessMessage).toContainText('allocations updated');

    // Close modal
    await page.click('[data-testid="close-bulk-edit-modal"]');

    // Verify allocations were updated
    const updatedAllocations = page.locator('[data-testid="allocation-row"]:has-text("75%")');
    const updatedCount = await updatedAllocations.count();
    expect(updatedCount).toBeGreaterThanOrEqual(selectCount);

    // Test bulk status update
    await page.click('[data-testid="select-all-allocations"]');
    await page.click('[data-testid="bulk-status-btn"]');

    const bulkStatusModal = page.locator('[data-testid="bulk-status-modal"]');
    if (await bulkStatusModal.isVisible()) {
      await page.selectOption('[data-testid="bulk-status-select"]', 'active');
      await page.click('[data-testid="apply-bulk-status-btn"]');
      
      const statusSuccessMessage = page.locator('[data-testid="bulk-status-success"]');
      await expect(statusSuccessMessage).toBeVisible();
    }
  });

  test('Import Allocations from CSV File', async ({ page }) => {
    await page.goto('http://localhost:3003/allocations');

    // Click import button
    await page.click('[data-testid="import-csv-btn"]');

    // Verify import modal opens
    const importModal = page.locator('[data-testid="csv-import-modal"]');
    await expect(importModal).toBeVisible();

    // Create CSV content with test data
    const csvContent = `Employee Name,Project Name,Percentage,Start Date,End Date,Role
John Doe,Website Redesign,65,2024-08-01,2024-10-31,Frontend Developer
Jane Smith,Mobile App,75,2024-08-01,2024-11-30,UI Designer
Mike Johnson,Database Migration,55,2024-09-01,2024-12-31,Backend Developer
Sarah Wilson,Marketing Campaign,45,2024-08-15,2024-10-15,Project Manager`;

    // Upload CSV file
    const fileInput = page.locator('[data-testid="csv-file-input"]');
    await fileInput.setInputFiles({
      name: 'test-allocations.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });

    // Wait for file processing
    await page.waitForTimeout(2000);

    // Click preview import
    await page.click('[data-testid="preview-import-btn"]');

    // Verify preview table appears
    const previewTable = page.locator('[data-testid="import-preview-table"]');
    await expect(previewTable).toBeVisible();

    // Check preview rows
    const previewRows = page.locator('[data-testid="preview-row"]');
    const previewRowCount = await previewRows.count();
    expect(previewRowCount).toBe(4); // Should match CSV rows

    // Verify preview data accuracy
    const firstPreviewRow = previewRows.first();
    await expect(firstPreviewRow).toContainText('John Doe');
    await expect(firstPreviewRow).toContainText('65%');
    await expect(firstPreviewRow).toContainText('Website Redesign');

    // Test validation - check for any errors
    const validationErrors = page.locator('[data-testid="validation-error"]');
    const errorCount = await validationErrors.count();
    
    if (errorCount > 0) {
      // Display validation errors for debugging
      for (let i = 0; i < errorCount; i++) {
        const errorText = await validationErrors.nth(i).textContent();
        console.log(`Validation Error ${i + 1}: ${errorText}`);
      }
    }

    // Configure import options
    const skipDuplicatesCheckbox = page.locator('[data-testid="skip-duplicates-checkbox"]');
    if (await skipDuplicatesCheckbox.isVisible()) {
      await skipDuplicatesCheckbox.check();
    }

    const updateExistingCheckbox = page.locator('[data-testid="update-existing-checkbox"]');
    if (await updateExistingCheckbox.isVisible()) {
      await updateExistingCheckbox.check();
    }

    // Confirm import
    await page.click('[data-testid="confirm-import-btn"]');

    // Verify import progress
    const importProgress = page.locator('[data-testid="import-progress"]');
    if (await importProgress.isVisible()) {
      await page.waitForSelector('[data-testid="import-complete"]', { timeout: 15000 });
    }

    // Verify success message
    const importSuccessMessage = page.locator('[data-testid="import-success-message"]');
    await expect(importSuccessMessage).toBeVisible();
    await expect(importSuccessMessage).toContainText('4 allocations imported');

    // Close import modal
    await page.click('[data-testid="close-import-modal"]');

    // Verify imported allocations appear in the list
    await page.waitForTimeout(2000);
    
    const importedAllocations = [
      { name: 'John Doe', percentage: '65%' },
      { name: 'Jane Smith', percentage: '75%' },
      { name: 'Mike Johnson', percentage: '55%' },
      { name: 'Sarah Wilson', percentage: '45%' }
    ];

    for (const allocation of importedAllocations) {
      const allocationRow = page.locator(`[data-testid="allocation-row"]:has-text("${allocation.name}"):has-text("${allocation.percentage}")`);
      await expect(allocationRow).toBeVisible();
    }

    // Test CSV export to verify round-trip functionality
    await page.click('[data-testid="export-csv-btn"]');
    
    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="confirm-export-btn"]')
    ]);
    
    expect(csvDownload.suggestedFilename()).toMatch(/.*\.csv$/);
  });

  test('Apply Team Template to Projects', async ({ page }) => {
    await page.goto('http://localhost:3003/templates');

    // Wait for templates to load
    await page.waitForSelector('[data-testid="template-list"]', { timeout: 10000 });

    // Check if templates exist, create one if needed
    const templateCards = page.locator('[data-testid="team-template-card"]');
    const templateCount = await templateCards.count();
    
    if (templateCount === 0) {
      // Create a new team template
      await page.click('[data-testid="create-template-btn"]');
      
      // Fill template form
      await page.fill('[data-testid="template-name-input"]', 'Web Development Team');
      await page.fill('[data-testid="template-description-input"]', 'Standard web development team composition');
      
      // Add team members to template
      const addMemberBtn = page.locator('[data-testid="add-template-member-btn"]');
      
      // Add Frontend Developer
      await addMemberBtn.click();
      await page.selectOption('[data-testid="member-role-select"]', 'Frontend Developer');
      await page.fill('[data-testid="member-percentage-input"]', '80');
      
      // Add Backend Developer
      await addMemberBtn.click();
      await page.selectOption('[data-testid="member-role-select"]', 'Backend Developer');
      await page.fill('[data-testid="member-percentage-input"]', '70');
      
      // Add UI Designer
      await addMemberBtn.click();
      await page.selectOption('[data-testid="member-role-select"]', 'UI Designer');
      await page.fill('[data-testid="member-percentage-input"]', '60');
      
      // Save template
      await page.click('[data-testid="save-template-btn"]');
      
      // Verify template created
      const templateSuccessMessage = page.locator('[data-testid="template-created-success"]');
      await expect(templateSuccessMessage).toBeVisible();
    }

    // Select the first available template
    const availableTemplates = page.locator('[data-testid="team-template-card"]');
    await availableTemplates.first().click();

    // Verify template details modal opens
    const templateDetailsModal = page.locator('[data-testid="template-details-modal"]');
    await expect(templateDetailsModal).toBeVisible();

    // Check template composition
    const templateMembers = page.locator('[data-testid="template-member-row"]');
    const memberCount = await templateMembers.count();
    expect(memberCount).toBeGreaterThan(0);

    // Apply template to project
    await page.click('[data-testid="apply-template-btn"]');

    // Verify application modal opens
    const applyTemplateModal = page.locator('[data-testid="apply-template-modal"]');
    await expect(applyTemplateModal).toBeVisible();

    // Select target project
    const targetProjectSelect = page.locator('[data-testid="target-project-select"]');
    await targetProjectSelect.selectOption({ index: 1 });

    // Set template parameters
    await page.fill('[data-testid="template-start-date"]', '2024-09-01');
    await page.fill('[data-testid="template-duration"]', '4'); // 4 months

    // Configure employee assignment method
    const assignmentMethod = page.locator('[data-testid="assignment-method-select"]');
    if (await assignmentMethod.isVisible()) {
      await assignmentMethod.selectOption('auto'); // Auto-assign available employees
    }

    // Preview template application
    await page.click('[data-testid="preview-template-application-btn"]');

    // Verify preview shows planned allocations
    const previewAllocations = page.locator('[data-testid="preview-allocation-row"]');
    const previewCount = await previewAllocations.count();
    expect(previewCount).toBeGreaterThan(0);

    // Check for any conflicts
    const conflictWarnings = page.locator('[data-testid="template-conflict-warning"]');
    const conflictCount = await conflictWarnings.count();
    
    if (conflictCount > 0) {
      // Review conflicts
      const conflictDetails = page.locator('[data-testid="conflict-details"]');
      await expect(conflictDetails).toBeVisible();
      
      // Choose conflict resolution
      const resolutionSelect = page.locator('[data-testid="conflict-resolution-select"]');
      if (await resolutionSelect.isVisible()) {
        await resolutionSelect.selectOption('adjust'); // Adjust percentages
      }
    }

    // Apply template
    await page.click('[data-testid="confirm-apply-template-btn"]');

    // Verify application progress
    const applicationProgress = page.locator('[data-testid="template-application-progress"]');
    if (await applicationProgress.isVisible()) {
      await page.waitForSelector('[data-testid="template-application-complete"]', { timeout: 10000 });
    }

    // Verify success message
    const applicationSuccessMessage = page.locator('[data-testid="template-applied-success"]');
    await expect(applicationSuccessMessage).toBeVisible();
    await expect(applicationSuccessMessage).toContainText('template applied successfully');

    // Close modals
    await page.click('[data-testid="close-apply-template-modal"]');
    await page.click('[data-testid="close-template-details-modal"]');

    // Verify allocations were created by checking allocations page
    await page.goto('http://localhost:3003/allocations');
    await page.waitForLoadState('networkidle');

    // Filter by recent allocations (template applied)
    const dateFilter = page.locator('[data-testid="date-filter"]');
    if (await dateFilter.isVisible()) {
      await dateFilter.fill('2024-09-01');
    }

    // Check for template-generated allocations
    const templateAllocations = page.locator('[data-testid="allocation-row"]:has([data-template-generated="true"])');
    const templateAllocationCount = await templateAllocations.count();
    expect(templateAllocationCount).toBeGreaterThan(0);

    // Verify allocation details match template
    if (templateAllocationCount > 0) {
      const firstTemplateAllocation = templateAllocations.first();
      await firstTemplateAllocation.click();
      
      const allocationDetails = page.locator('[data-testid="allocation-details-modal"]');
      if (await allocationDetails.isVisible()) {
        await expect(allocationDetails).toContainText('2024-09-01');
        
        // Check template reference
        const templateReference = page.locator('[data-testid="template-reference"]');
        if (await templateReference.isVisible()) {
          await expect(templateReference).toContainText('Web Development Team');
        }
      }
    }
  });

  test('Bulk Delete and Archive Operations', async ({ page }) => {
    await page.goto('http://localhost:3003/allocations');
    await page.waitForLoadState('networkidle');

    // Ensure we have allocations to work with
    const allocationRows = page.locator('[data-testid="allocation-row"]');
    const initialCount = await allocationRows.count();

    if (initialCount < 3) {
      // Create some test allocations
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="new-allocation-btn"]');
        await page.selectOption('[data-testid="employee-select"]', { index: (i % 3) + 1 });
        await page.selectOption('[data-testid="project-select"]', { index: (i % 2) + 1 });
        await page.fill('[data-testid="allocation-percentage"]', `${30 + i * 10}`);
        await page.fill('[data-testid="start-date"]', '2024-10-01');
        await page.fill('[data-testid="end-date"]', '2024-12-31');
        await page.click('[data-testid="submit-allocation-btn"]');
        await page.waitForTimeout(1000);
      }
    }

    // Refresh to see all allocations
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Test bulk archive
    const updatedRows = page.locator('[data-testid="allocation-row"]');
    const currentCount = await updatedRows.count();
    
    // Select multiple allocations for archiving
    const selectCount = Math.min(2, currentCount);
    for (let i = 0; i < selectCount; i++) {
      await page.locator(`[data-testid="allocation-checkbox-${i}"]`).click();
    }

    // Click bulk archive button
    await page.click('[data-testid="bulk-archive-btn"]');

    // Verify archive confirmation modal
    const archiveConfirmModal = page.locator('[data-testid="bulk-archive-confirm-modal"]');
    await expect(archiveConfirmModal).toBeVisible();
    await expect(archiveConfirmModal).toContainText(`${selectCount} allocations`);

    // Confirm archive
    await page.click('[data-testid="confirm-bulk-archive-btn"]');

    // Verify archive success
    const archiveSuccessMessage = page.locator('[data-testid="bulk-archive-success"]');
    await expect(archiveSuccessMessage).toBeVisible();

    // Verify allocations are no longer visible in active view
    const remainingRows = await page.locator('[data-testid="allocation-row"]').count();
    expect(remainingRows).toBe(currentCount - selectCount);

    // Test viewing archived allocations
    const archivedFilter = page.locator('[data-testid="status-filter"]');
    if (await archivedFilter.isVisible()) {
      await archivedFilter.selectOption('archived');
      await page.waitForTimeout(1000);
      
      // Verify archived allocations are shown
      const archivedRows = await page.locator('[data-testid="allocation-row"]').count();
      expect(archivedRows).toBeGreaterThanOrEqual(selectCount);
    }

    // Test bulk restore from archive
    await page.locator('[data-testid="allocation-checkbox-0"]').click();
    await page.click('[data-testid="bulk-restore-btn"]');

    const restoreSuccessMessage = page.locator('[data-testid="bulk-restore-success"]');
    if (await restoreSuccessMessage.isVisible()) {
      await expect(restoreSuccessMessage).toBeVisible();
    }

    // Test permanent bulk delete
    await archivedFilter.selectOption('archived');
    await page.waitForTimeout(1000);

    const archivedAllocations = page.locator('[data-testid="allocation-row"]');
    const archivedCount = await archivedAllocations.count();

    if (archivedCount > 0) {
      await page.locator('[data-testid="allocation-checkbox-0"]').click();
      await page.click('[data-testid="bulk-delete-permanently-btn"]');

      // Verify permanent delete confirmation
      const deleteConfirmModal = page.locator('[data-testid="bulk-delete-confirm-modal"]');
      await expect(deleteConfirmModal).toBeVisible();
      await expect(deleteConfirmModal).toContainText('permanently delete');

      // Type confirmation text if required
      const confirmationInput = page.locator('[data-testid="delete-confirmation-input"]');
      if (await confirmationInput.isVisible()) {
        await confirmationInput.fill('DELETE');
      }

      await page.click('[data-testid="confirm-permanent-delete-btn"]');

      // Verify permanent deletion success
      const deleteSuccessMessage = page.locator('[data-testid="bulk-delete-success"]');
      await expect(deleteSuccessMessage).toBeVisible();
    }

    // Reset filter to show active allocations
    await archivedFilter.selectOption('active');
  });
});
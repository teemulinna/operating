"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enhanced_features_fixtures_1 = require("../fixtures/enhanced-features-fixtures");
enhanced_features_fixtures_1.test.describe('Bulk Operations - Real Data Tests', () => {
    enhanced_features_fixtures_1.test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
    });
    (0, enhanced_features_fixtures_1.test)('Bulk Assign Multiple Employees to Project', async ({ page, apiHelper }) => {
        await page.goto('http://localhost:3003/projects');
        await page.waitForSelector('[data-testid="project-card"]', { timeout: 10000 });
        const projectCards = page.locator('[data-testid="project-card"]');
        await (0, enhanced_features_fixtures_1.expect)(projectCards).toHaveCountGreaterThan(0);
        await projectCards.first().click();
        await page.click('[data-testid="manage-team-btn"]');
        const bulkAssignModal = page.locator('[data-testid="bulk-assign-modal"]');
        await (0, enhanced_features_fixtures_1.expect)(bulkAssignModal).toBeVisible();
        const employeeCheckboxes = page.locator('[data-testid*="employee-checkbox-"]');
        const checkboxCount = await employeeCheckboxes.count();
        (0, enhanced_features_fixtures_1.expect)(checkboxCount).toBeGreaterThan(0);
        const selectCount = Math.min(3, checkboxCount);
        for (let i = 0; i < selectCount; i++) {
            await employeeCheckboxes.nth(i).click();
        }
        const selectedCountDisplay = page.locator('[data-testid="selected-employee-count"]');
        await (0, enhanced_features_fixtures_1.expect)(selectedCountDisplay).toContainText(selectCount.toString());
        await page.fill('[data-testid="bulk-allocation-percentage"]', '60');
        await page.fill('[data-testid="bulk-start-date"]', '2024-07-01');
        await page.fill('[data-testid="bulk-end-date"]', '2024-09-30');
        const roleSelect = page.locator('[data-testid="bulk-role-select"]');
        if (await roleSelect.isVisible()) {
            await roleSelect.selectOption({ index: 1 });
        }
        await page.click('[data-testid="apply-bulk-assignment-btn"]');
        const successMessage = page.locator('[data-testid="bulk-assignment-success"]');
        await (0, enhanced_features_fixtures_1.expect)(successMessage).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(successMessage).toContainText(`${selectCount} employees assigned`);
        await page.click('[data-testid="close-bulk-assign-modal"]');
        await page.goto('http://localhost:3003/allocations');
        await page.waitForLoadState('networkidle');
        const dateFilter = page.locator('[data-testid="date-filter-input"]');
        if (await dateFilter.isVisible()) {
            await dateFilter.fill('2024-07-01');
        }
        const bulkAllocations = page.locator('[data-testid="allocation-row"]:has-text("60%")');
        const bulkCount = await bulkAllocations.count();
        (0, enhanced_features_fixtures_1.expect)(bulkCount).toBeGreaterThanOrEqual(selectCount);
        if (bulkCount > 0) {
            const firstBulkAllocation = bulkAllocations.first();
            await firstBulkAllocation.click();
            const allocationDetails = page.locator('[data-testid="allocation-details"]');
            if (await allocationDetails.isVisible()) {
                await (0, enhanced_features_fixtures_1.expect)(allocationDetails).toContainText('60%');
                await (0, enhanced_features_fixtures_1.expect)(allocationDetails).toContainText('2024-07-01');
            }
        }
    });
    (0, enhanced_features_fixtures_1.test)('Update Multiple Allocations at Once', async ({ page }) => {
        await page.goto('http://localhost:3003/allocations');
        await page.waitForSelector('[data-testid="allocation-row"]', { timeout: 10000 });
        const allocationCheckboxes = page.locator('[data-testid*="allocation-checkbox-"]');
        const availableCheckboxes = await allocationCheckboxes.count();
        if (availableCheckboxes === 0) {
            await page.click('[data-testid="new-allocation-btn"]');
            await page.selectOption('[data-testid="employee-select"]', { index: 1 });
            await page.selectOption('[data-testid="project-select"]', { index: 1 });
            await page.fill('[data-testid="allocation-percentage"]', '50');
            await page.fill('[data-testid="start-date"]', '2024-06-01');
            await page.fill('[data-testid="end-date"]', '2024-08-31');
            await page.click('[data-testid="submit-allocation-btn"]');
            await page.waitForTimeout(1000);
            await page.click('[data-testid="new-allocation-btn"]');
            await page.selectOption('[data-testid="employee-select"]', { index: 2 });
            await page.selectOption('[data-testid="project-select"]', { index: 1 });
            await page.fill('[data-testid="allocation-percentage"]', '40');
            await page.fill('[data-testid="start-date"]', '2024-06-01');
            await page.fill('[data-testid="end-date"]', '2024-08-31');
            await page.click('[data-testid="submit-allocation-btn"]');
            await page.waitForTimeout(1000);
        }
        const updatedCheckboxes = page.locator('[data-testid*="allocation-checkbox-"]');
        const checkboxCount = await updatedCheckboxes.count();
        const selectCount = Math.min(2, checkboxCount);
        for (let i = 0; i < selectCount; i++) {
            await updatedCheckboxes.nth(i).click();
        }
        const bulkActionsToolbar = page.locator('[data-testid="bulk-actions-toolbar"]');
        await (0, enhanced_features_fixtures_1.expect)(bulkActionsToolbar).toBeVisible();
        await page.click('[data-testid="bulk-edit-btn"]');
        const bulkEditModal = page.locator('[data-testid="bulk-edit-modal"]');
        await (0, enhanced_features_fixtures_1.expect)(bulkEditModal).toBeVisible();
        const bulkPercentageInput = page.locator('[data-testid="bulk-percentage-input"]');
        await bulkPercentageInput.fill('75');
        const bulkEndDateInput = page.locator('[data-testid="bulk-end-date-input"]');
        if (await bulkEndDateInput.isVisible()) {
            await bulkEndDateInput.fill('2024-10-31');
        }
        await page.click('[data-testid="apply-bulk-changes-btn"]');
        const confirmDialog = page.locator('[data-testid="bulk-update-confirm"]');
        if (await confirmDialog.isVisible()) {
            await page.click('[data-testid="confirm-bulk-update-btn"]');
        }
        const updateSuccessMessage = page.locator('[data-testid="bulk-update-success"]');
        await (0, enhanced_features_fixtures_1.expect)(updateSuccessMessage).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(updateSuccessMessage).toContainText('allocations updated');
        await page.click('[data-testid="close-bulk-edit-modal"]');
        const updatedAllocations = page.locator('[data-testid="allocation-row"]:has-text("75%")');
        const updatedCount = await updatedAllocations.count();
        (0, enhanced_features_fixtures_1.expect)(updatedCount).toBeGreaterThanOrEqual(selectCount);
        await page.click('[data-testid="select-all-allocations"]');
        await page.click('[data-testid="bulk-status-btn"]');
        const bulkStatusModal = page.locator('[data-testid="bulk-status-modal"]');
        if (await bulkStatusModal.isVisible()) {
            await page.selectOption('[data-testid="bulk-status-select"]', 'active');
            await page.click('[data-testid="apply-bulk-status-btn"]');
            const statusSuccessMessage = page.locator('[data-testid="bulk-status-success"]');
            await (0, enhanced_features_fixtures_1.expect)(statusSuccessMessage).toBeVisible();
        }
    });
    (0, enhanced_features_fixtures_1.test)('Import Allocations from CSV File', async ({ page }) => {
        await page.goto('http://localhost:3003/allocations');
        await page.click('[data-testid="import-csv-btn"]');
        const importModal = page.locator('[data-testid="csv-import-modal"]');
        await (0, enhanced_features_fixtures_1.expect)(importModal).toBeVisible();
        const csvContent = `Employee Name,Project Name,Percentage,Start Date,End Date,Role
John Doe,Website Redesign,65,2024-08-01,2024-10-31,Frontend Developer
Jane Smith,Mobile App,75,2024-08-01,2024-11-30,UI Designer
Mike Johnson,Database Migration,55,2024-09-01,2024-12-31,Backend Developer
Sarah Wilson,Marketing Campaign,45,2024-08-15,2024-10-15,Project Manager`;
        const fileInput = page.locator('[data-testid="csv-file-input"]');
        await fileInput.setInputFiles({
            name: 'test-allocations.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent)
        });
        await page.waitForTimeout(2000);
        await page.click('[data-testid="preview-import-btn"]');
        const previewTable = page.locator('[data-testid="import-preview-table"]');
        await (0, enhanced_features_fixtures_1.expect)(previewTable).toBeVisible();
        const previewRows = page.locator('[data-testid="preview-row"]');
        const previewRowCount = await previewRows.count();
        (0, enhanced_features_fixtures_1.expect)(previewRowCount).toBe(4);
        const firstPreviewRow = previewRows.first();
        await (0, enhanced_features_fixtures_1.expect)(firstPreviewRow).toContainText('John Doe');
        await (0, enhanced_features_fixtures_1.expect)(firstPreviewRow).toContainText('65%');
        await (0, enhanced_features_fixtures_1.expect)(firstPreviewRow).toContainText('Website Redesign');
        const validationErrors = page.locator('[data-testid="validation-error"]');
        const errorCount = await validationErrors.count();
        if (errorCount > 0) {
            for (let i = 0; i < errorCount; i++) {
                const errorText = await validationErrors.nth(i).textContent();
                console.log(`Validation Error ${i + 1}: ${errorText}`);
            }
        }
        const skipDuplicatesCheckbox = page.locator('[data-testid="skip-duplicates-checkbox"]');
        if (await skipDuplicatesCheckbox.isVisible()) {
            await skipDuplicatesCheckbox.check();
        }
        const updateExistingCheckbox = page.locator('[data-testid="update-existing-checkbox"]');
        if (await updateExistingCheckbox.isVisible()) {
            await updateExistingCheckbox.check();
        }
        await page.click('[data-testid="confirm-import-btn"]');
        const importProgress = page.locator('[data-testid="import-progress"]');
        if (await importProgress.isVisible()) {
            await page.waitForSelector('[data-testid="import-complete"]', { timeout: 15000 });
        }
        const importSuccessMessage = page.locator('[data-testid="import-success-message"]');
        await (0, enhanced_features_fixtures_1.expect)(importSuccessMessage).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(importSuccessMessage).toContainText('4 allocations imported');
        await page.click('[data-testid="close-import-modal"]');
        await page.waitForTimeout(2000);
        const importedAllocations = [
            { name: 'John Doe', percentage: '65%' },
            { name: 'Jane Smith', percentage: '75%' },
            { name: 'Mike Johnson', percentage: '55%' },
            { name: 'Sarah Wilson', percentage: '45%' }
        ];
        for (const allocation of importedAllocations) {
            const allocationRow = page.locator(`[data-testid="allocation-row"]:has-text("${allocation.name}"):has-text("${allocation.percentage}")`);
            await (0, enhanced_features_fixtures_1.expect)(allocationRow).toBeVisible();
        }
        await page.click('[data-testid="export-csv-btn"]');
        const [csvDownload] = await Promise.all([
            page.waitForEvent('download'),
            page.click('[data-testid="confirm-export-btn"]')
        ]);
        (0, enhanced_features_fixtures_1.expect)(csvDownload.suggestedFilename()).toMatch(/.*\.csv$/);
    });
    (0, enhanced_features_fixtures_1.test)('Apply Team Template to Projects', async ({ page }) => {
        await page.goto('http://localhost:3003/templates');
        await page.waitForSelector('[data-testid="template-list"]', { timeout: 10000 });
        const templateCards = page.locator('[data-testid="team-template-card"]');
        const templateCount = await templateCards.count();
        if (templateCount === 0) {
            await page.click('[data-testid="create-template-btn"]');
            await page.fill('[data-testid="template-name-input"]', 'Web Development Team');
            await page.fill('[data-testid="template-description-input"]', 'Standard web development team composition');
            const addMemberBtn = page.locator('[data-testid="add-template-member-btn"]');
            await addMemberBtn.click();
            await page.selectOption('[data-testid="member-role-select"]', 'Frontend Developer');
            await page.fill('[data-testid="member-percentage-input"]', '80');
            await addMemberBtn.click();
            await page.selectOption('[data-testid="member-role-select"]', 'Backend Developer');
            await page.fill('[data-testid="member-percentage-input"]', '70');
            await addMemberBtn.click();
            await page.selectOption('[data-testid="member-role-select"]', 'UI Designer');
            await page.fill('[data-testid="member-percentage-input"]', '60');
            await page.click('[data-testid="save-template-btn"]');
            const templateSuccessMessage = page.locator('[data-testid="template-created-success"]');
            await (0, enhanced_features_fixtures_1.expect)(templateSuccessMessage).toBeVisible();
        }
        const availableTemplates = page.locator('[data-testid="team-template-card"]');
        await availableTemplates.first().click();
        const templateDetailsModal = page.locator('[data-testid="template-details-modal"]');
        await (0, enhanced_features_fixtures_1.expect)(templateDetailsModal).toBeVisible();
        const templateMembers = page.locator('[data-testid="template-member-row"]');
        const memberCount = await templateMembers.count();
        (0, enhanced_features_fixtures_1.expect)(memberCount).toBeGreaterThan(0);
        await page.click('[data-testid="apply-template-btn"]');
        const applyTemplateModal = page.locator('[data-testid="apply-template-modal"]');
        await (0, enhanced_features_fixtures_1.expect)(applyTemplateModal).toBeVisible();
        const targetProjectSelect = page.locator('[data-testid="target-project-select"]');
        await targetProjectSelect.selectOption({ index: 1 });
        await page.fill('[data-testid="template-start-date"]', '2024-09-01');
        await page.fill('[data-testid="template-duration"]', '4');
        const assignmentMethod = page.locator('[data-testid="assignment-method-select"]');
        if (await assignmentMethod.isVisible()) {
            await assignmentMethod.selectOption('auto');
        }
        await page.click('[data-testid="preview-template-application-btn"]');
        const previewAllocations = page.locator('[data-testid="preview-allocation-row"]');
        const previewCount = await previewAllocations.count();
        (0, enhanced_features_fixtures_1.expect)(previewCount).toBeGreaterThan(0);
        const conflictWarnings = page.locator('[data-testid="template-conflict-warning"]');
        const conflictCount = await conflictWarnings.count();
        if (conflictCount > 0) {
            const conflictDetails = page.locator('[data-testid="conflict-details"]');
            await (0, enhanced_features_fixtures_1.expect)(conflictDetails).toBeVisible();
            const resolutionSelect = page.locator('[data-testid="conflict-resolution-select"]');
            if (await resolutionSelect.isVisible()) {
                await resolutionSelect.selectOption('adjust');
            }
        }
        await page.click('[data-testid="confirm-apply-template-btn"]');
        const applicationProgress = page.locator('[data-testid="template-application-progress"]');
        if (await applicationProgress.isVisible()) {
            await page.waitForSelector('[data-testid="template-application-complete"]', { timeout: 10000 });
        }
        const applicationSuccessMessage = page.locator('[data-testid="template-applied-success"]');
        await (0, enhanced_features_fixtures_1.expect)(applicationSuccessMessage).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(applicationSuccessMessage).toContainText('template applied successfully');
        await page.click('[data-testid="close-apply-template-modal"]');
        await page.click('[data-testid="close-template-details-modal"]');
        await page.goto('http://localhost:3003/allocations');
        await page.waitForLoadState('networkidle');
        const dateFilter = page.locator('[data-testid="date-filter"]');
        if (await dateFilter.isVisible()) {
            await dateFilter.fill('2024-09-01');
        }
        const templateAllocations = page.locator('[data-testid="allocation-row"]:has([data-template-generated="true"])');
        const templateAllocationCount = await templateAllocations.count();
        (0, enhanced_features_fixtures_1.expect)(templateAllocationCount).toBeGreaterThan(0);
        if (templateAllocationCount > 0) {
            const firstTemplateAllocation = templateAllocations.first();
            await firstTemplateAllocation.click();
            const allocationDetails = page.locator('[data-testid="allocation-details-modal"]');
            if (await allocationDetails.isVisible()) {
                await (0, enhanced_features_fixtures_1.expect)(allocationDetails).toContainText('2024-09-01');
                const templateReference = page.locator('[data-testid="template-reference"]');
                if (await templateReference.isVisible()) {
                    await (0, enhanced_features_fixtures_1.expect)(templateReference).toContainText('Web Development Team');
                }
            }
        }
    });
    (0, enhanced_features_fixtures_1.test)('Bulk Delete and Archive Operations', async ({ page }) => {
        await page.goto('http://localhost:3003/allocations');
        await page.waitForLoadState('networkidle');
        const allocationRows = page.locator('[data-testid="allocation-row"]');
        const initialCount = await allocationRows.count();
        if (initialCount < 3) {
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
        await page.reload();
        await page.waitForLoadState('networkidle');
        const updatedRows = page.locator('[data-testid="allocation-row"]');
        const currentCount = await updatedRows.count();
        const selectCount = Math.min(2, currentCount);
        for (let i = 0; i < selectCount; i++) {
            await page.locator(`[data-testid="allocation-checkbox-${i}"]`).click();
        }
        await page.click('[data-testid="bulk-archive-btn"]');
        const archiveConfirmModal = page.locator('[data-testid="bulk-archive-confirm-modal"]');
        await (0, enhanced_features_fixtures_1.expect)(archiveConfirmModal).toBeVisible();
        await (0, enhanced_features_fixtures_1.expect)(archiveConfirmModal).toContainText(`${selectCount} allocations`);
        await page.click('[data-testid="confirm-bulk-archive-btn"]');
        const archiveSuccessMessage = page.locator('[data-testid="bulk-archive-success"]');
        await (0, enhanced_features_fixtures_1.expect)(archiveSuccessMessage).toBeVisible();
        const remainingRows = await page.locator('[data-testid="allocation-row"]').count();
        (0, enhanced_features_fixtures_1.expect)(remainingRows).toBe(currentCount - selectCount);
        const archivedFilter = page.locator('[data-testid="status-filter"]');
        if (await archivedFilter.isVisible()) {
            await archivedFilter.selectOption('archived');
            await page.waitForTimeout(1000);
            const archivedRows = await page.locator('[data-testid="allocation-row"]').count();
            (0, enhanced_features_fixtures_1.expect)(archivedRows).toBeGreaterThanOrEqual(selectCount);
        }
        await page.locator('[data-testid="allocation-checkbox-0"]').click();
        await page.click('[data-testid="bulk-restore-btn"]');
        const restoreSuccessMessage = page.locator('[data-testid="bulk-restore-success"]');
        if (await restoreSuccessMessage.isVisible()) {
            await (0, enhanced_features_fixtures_1.expect)(restoreSuccessMessage).toBeVisible();
        }
        await archivedFilter.selectOption('archived');
        await page.waitForTimeout(1000);
        const archivedAllocations = page.locator('[data-testid="allocation-row"]');
        const archivedCount = await archivedAllocations.count();
        if (archivedCount > 0) {
            await page.locator('[data-testid="allocation-checkbox-0"]').click();
            await page.click('[data-testid="bulk-delete-permanently-btn"]');
            const deleteConfirmModal = page.locator('[data-testid="bulk-delete-confirm-modal"]');
            await (0, enhanced_features_fixtures_1.expect)(deleteConfirmModal).toBeVisible();
            await (0, enhanced_features_fixtures_1.expect)(deleteConfirmModal).toContainText('permanently delete');
            const confirmationInput = page.locator('[data-testid="delete-confirmation-input"]');
            if (await confirmationInput.isVisible()) {
                await confirmationInput.fill('DELETE');
            }
            await page.click('[data-testid="confirm-permanent-delete-btn"]');
            const deleteSuccessMessage = page.locator('[data-testid="bulk-delete-success"]');
            await (0, enhanced_features_fixtures_1.expect)(deleteSuccessMessage).toBeVisible();
        }
        await archivedFilter.selectOption('active');
    });
});
//# sourceMappingURL=bulk-operations.spec.js.map
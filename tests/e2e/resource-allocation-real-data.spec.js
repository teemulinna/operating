"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const REAL_EMPLOYEES = [
    { id: '1', name: 'John Doe', role: 'Frontend Developer' },
    { id: '2', name: 'Jane Smith', role: 'Backend Developer' },
    { id: '3', name: 'Mike Johnson', role: 'UI/UX Designer' }
];
const REAL_PROJECTS = [
    { id: '1', name: 'Budget Calc Project', status: 'active' },
    { id: '2', name: 'E-commerce Platform', status: 'active' },
    { id: '3', name: 'Mobile App Redesign', status: 'planning' },
    { id: '4', name: 'Data Analytics Dashboard', status: 'active' },
    { id: '5', name: 'Customer Portal', status: 'completed' }
];
class ResourceAllocationPage {
    constructor(page) {
        this.page = page;
    }
    async navigateTo(path = '') {
        await this.page.goto(`http://localhost:3003${path}`);
        await this.page.waitForLoadState('networkidle');
    }
    async waitForEmployeeData() {
        await this.page.waitForSelector('[data-testid="employee-list"]', { timeout: 10000 });
        await (0, test_1.expect)(this.page.locator('[data-testid="employee-list"] .employee-item')).toHaveCount(3);
    }
    async waitForProjectData() {
        await this.page.waitForSelector('[data-testid="project-list"]', { timeout: 10000 });
        await (0, test_1.expect)(this.page.locator('[data-testid="project-list"] .project-item')).toHaveCount(5);
    }
    async createAllocation(employeeName, projectName, percentage) {
        await this.page.click('[data-testid="create-allocation-btn"]');
        await this.page.waitForSelector('[data-testid="allocation-form"]');
        await this.page.selectOption('[data-testid="employee-select"]', { label: employeeName });
        await this.page.selectOption('[data-testid="project-select"]', { label: projectName });
        await this.page.fill('[data-testid="allocation-percentage"]', percentage);
        await this.page.click('[data-testid="save-allocation-btn"]');
        await this.page.waitForLoadState('networkidle');
    }
    async editAllocation(employeeName, newPercentage) {
        const allocationRow = this.page.locator(`[data-testid="allocation-row"]:has-text("${employeeName}")`);
        await allocationRow.locator('[data-testid="edit-allocation-btn"]').click();
        await this.page.waitForSelector('[data-testid="allocation-form"]');
        await this.page.fill('[data-testid="allocation-percentage"]', newPercentage);
        await this.page.click('[data-testid="save-allocation-btn"]');
        await this.page.waitForLoadState('networkidle');
    }
    async deleteAllocation(employeeName) {
        const allocationRow = this.page.locator(`[data-testid="allocation-row"]:has-text("${employeeName}")`);
        await allocationRow.locator('[data-testid="delete-allocation-btn"]').click();
        await this.page.click('[data-testid="confirm-delete-btn"]');
        await this.page.waitForLoadState('networkidle');
    }
    async checkConflictWarning() {
        return await this.page.locator('[data-testid="conflict-warning"]').isVisible();
    }
    async getUtilizationPercentage(employeeName) {
        const utilizationElement = this.page.locator(`[data-testid="utilization-${employeeName}"]`);
        return await utilizationElement.textContent();
    }
}
test_1.test.describe('Resource Allocation System - Real Data E2E Tests', () => {
    let page;
    let resourcePage;
    test_1.test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();
        resourcePage = new ResourceAllocationPage(page);
        await resourcePage.navigateTo();
        await page.waitForTimeout(2000);
    });
    test_1.test.afterEach(async () => {
        await page.close();
    });
    (0, test_1.test)('User Story 1: View all employees and their current allocations', async () => {
        await test_1.test.step('Navigate to employees view', async () => {
            await page.click('[data-testid="employees-tab"]');
            await resourcePage.waitForEmployeeData();
        });
        await test_1.test.step('Verify all employees are displayed', async () => {
            for (const employee of REAL_EMPLOYEES) {
                await (0, test_1.expect)(page.locator(`text=${employee.name}`)).toBeVisible();
                await (0, test_1.expect)(page.locator(`text=${employee.role}`)).toBeVisible();
            }
        });
        await test_1.test.step('Verify allocation percentages are displayed', async () => {
            const allocationElements = page.locator('[data-testid*="allocation-percentage"]');
            await (0, test_1.expect)(allocationElements.first()).toBeVisible();
        });
        await test_1.test.step('Take screenshot for visual verification', async () => {
            await page.screenshot({
                path: 'test-results/employees-view.png',
                fullPage: true
            });
        });
    });
    (0, test_1.test)('User Story 2: View all projects and assigned resources', async () => {
        await test_1.test.step('Navigate to projects view', async () => {
            await page.click('[data-testid="projects-tab"]');
            await resourcePage.waitForProjectData();
        });
        await test_1.test.step('Verify all projects are displayed', async () => {
            for (const project of REAL_PROJECTS) {
                await (0, test_1.expect)(page.locator(`text=${project.name}`)).toBeVisible();
            }
        });
        await test_1.test.step('Verify resource assignments are shown', async () => {
            const resourceElements = page.locator('[data-testid*="assigned-resources"]');
            await (0, test_1.expect)(resourceElements.first()).toBeVisible();
        });
        await test_1.test.step('Take screenshot for visual verification', async () => {
            await page.screenshot({
                path: 'test-results/projects-view.png',
                fullPage: true
            });
        });
    });
    (0, test_1.test)('User Story 3: Create new allocation - John Doe to Budget Calc Project at 30%', async () => {
        await test_1.test.step('Navigate to allocations view', async () => {
            await page.click('[data-testid="allocations-tab"]');
            await page.waitForLoadState('networkidle');
        });
        await test_1.test.step('Create new allocation', async () => {
            await resourcePage.createAllocation('John Doe', 'Budget Calc Project', '30');
        });
        await test_1.test.step('Verify allocation was created', async () => {
            await (0, test_1.expect)(page.locator('text=John Doe')).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Budget Calc Project')).toBeVisible();
            await (0, test_1.expect)(page.locator('text=30%')).toBeVisible();
        });
        await test_1.test.step('Verify in database via API', async () => {
            const response = await page.request.get('http://localhost:3002/api/working-allocations');
            (0, test_1.expect)(response.ok()).toBeTruthy();
            const data = await response.json();
            const newAllocation = data.data.find(a => a.employeeName === 'John Doe' &&
                a.projectName === 'Budget Calc Project' &&
                a.allocatedPercentage === 30);
            (0, test_1.expect)(newAllocation).toBeDefined();
        });
        await test_1.test.step('Take screenshot of new allocation', async () => {
            await page.screenshot({
                path: 'test-results/new-allocation-created.png',
                fullPage: true
            });
        });
    });
    (0, test_1.test)('User Story 4: Edit existing allocation - Change Jane from 75% to 60%', async () => {
        await test_1.test.step('Navigate to allocations view', async () => {
            await page.click('[data-testid="allocations-tab"]');
            await page.waitForLoadState('networkidle');
        });
        await test_1.test.step('Edit existing allocation', async () => {
            await resourcePage.editAllocation('Jane Smith', '60');
        });
        await test_1.test.step('Verify allocation was updated', async () => {
            const janeAllocation = page.locator('[data-testid="allocation-row"]:has-text("Jane Smith")');
            await (0, test_1.expect)(janeAllocation.locator('text=60%')).toBeVisible();
        });
        await test_1.test.step('Verify change persisted in database', async () => {
            const response = await page.request.get('http://localhost:3002/api/working-allocations');
            const data = await response.json();
            const updatedAllocation = data.data.find(a => a.employeeName === 'Jane Smith' && a.allocatedPercentage === 60);
            (0, test_1.expect)(updatedAllocation).toBeDefined();
        });
    });
    (0, test_1.test)('User Story 5: Delete allocation to free up resources', async () => {
        await test_1.test.step('Navigate to allocations view', async () => {
            await page.click('[data-testid="allocations-tab"]');
            await page.waitForLoadState('networkidle');
        });
        await test_1.test.step('Count initial allocations', async () => {
            const initialCount = await page.locator('[data-testid="allocation-row"]').count();
            (0, test_1.expect)(initialCount).toBeGreaterThan(0);
        });
        await test_1.test.step('Delete an allocation', async () => {
            await resourcePage.deleteAllocation('Mike Johnson');
        });
        await test_1.test.step('Verify allocation was removed', async () => {
            await (0, test_1.expect)(page.locator('[data-testid="allocation-row"]:has-text("Mike Johnson")')).not.toBeVisible();
        });
        await test_1.test.step('Verify deletion in database', async () => {
            const response = await page.request.get('http://localhost:3002/api/working-allocations');
            const data = await response.json();
            const deletedAllocation = data.data.find(a => a.employeeName === 'Mike Johnson');
            (0, test_1.expect)(deletedAllocation).toBeUndefined();
        });
    });
    (0, test_1.test)('User Story 6: Detect allocation conflicts (130% overallocation)', async () => {
        await test_1.test.step('Create conflicting allocations', async () => {
            await page.click('[data-testid="allocations-tab"]');
            await page.waitForLoadState('networkidle');
            await resourcePage.createAllocation('Mike Johnson', 'E-commerce Platform', '80');
            await resourcePage.createAllocation('Mike Johnson', 'Mobile App Redesign', '50');
        });
        await test_1.test.step('Verify conflict warning is displayed', async () => {
            const conflictVisible = await resourcePage.checkConflictWarning();
            (0, test_1.expect)(conflictVisible).toBeTruthy();
            await (0, test_1.expect)(page.locator('text=Overallocation detected')).toBeVisible();
            await (0, test_1.expect)(page.locator('text=130%')).toBeVisible();
        });
        await test_1.test.step('Verify conflict shows in capacity dashboard', async () => {
            await page.click('[data-testid="capacity-dashboard-tab"]');
            await page.waitForLoadState('networkidle');
            const mikeUtilization = await resourcePage.getUtilizationPercentage('Mike Johnson');
            (0, test_1.expect)(mikeUtilization).toContain('130%');
        });
        await test_1.test.step('Take screenshot of conflict state', async () => {
            await page.screenshot({
                path: 'test-results/allocation-conflict.png',
                fullPage: true
            });
        });
    });
    (0, test_1.test)('User Story 7: View capacity utilization dashboard', async () => {
        await test_1.test.step('Navigate to capacity dashboard', async () => {
            await page.click('[data-testid="capacity-dashboard-tab"]');
            await page.waitForLoadState('networkidle');
        });
        await test_1.test.step('Verify dashboard elements are visible', async () => {
            await (0, test_1.expect)(page.locator('[data-testid="capacity-chart"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="utilization-summary"]')).toBeVisible();
        });
        await test_1.test.step('Verify employee utilization percentages', async () => {
            for (const employee of REAL_EMPLOYEES) {
                const utilizationElement = page.locator(`[data-testid="utilization-${employee.name}"]`);
                await (0, test_1.expect)(utilizationElement).toBeVisible();
            }
        });
        await test_1.test.step('Verify capacity metrics are calculated', async () => {
            await (0, test_1.expect)(page.locator('[data-testid="total-capacity"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="available-capacity"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="overallocated-count"]')).toBeVisible();
        });
        await test_1.test.step('Take screenshot of dashboard', async () => {
            await page.screenshot({
                path: 'test-results/capacity-dashboard.png',
                fullPage: true
            });
        });
    });
    (0, test_1.test)('User Story 8: Navigate between different views', async () => {
        const views = [
            { tab: 'employees-tab', element: '[data-testid="employee-list"]' },
            { tab: 'projects-tab', element: '[data-testid="project-list"]' },
            { tab: 'allocations-tab', element: '[data-testid="allocation-list"]' },
            { tab: 'capacity-dashboard-tab', element: '[data-testid="capacity-chart"]' },
            { tab: 'calendar-view-tab', element: '[data-testid="calendar-container"]' }
        ];
        for (const view of views) {
            await test_1.test.step(`Navigate to ${view.tab}`, async () => {
                await page.click(`[data-testid="${view.tab}"]`);
                await page.waitForLoadState('networkidle');
                await (0, test_1.expect)(page.locator(view.element)).toBeVisible({ timeout: 10000 });
            });
        }
        await test_1.test.step('Verify navigation state persistence', async () => {
            for (const view of views) {
                await page.click(`[data-testid="${view.tab}"]`);
                await page.waitForTimeout(500);
            }
            await (0, test_1.expect)(page.locator(views[views.length - 1].element)).toBeVisible();
        });
    });
    (0, test_1.test)('User Story 9: Test error handling with invalid data', async () => {
        await test_1.test.step('Test invalid allocation percentage', async () => {
            await page.click('[data-testid="allocations-tab"]');
            await page.click('[data-testid="create-allocation-btn"]');
            await page.selectOption('[data-testid="employee-select"]', { label: 'John Doe' });
            await page.selectOption('[data-testid="project-select"]', { label: 'Budget Calc Project' });
            await page.fill('[data-testid="allocation-percentage"]', '150');
            await page.click('[data-testid="save-allocation-btn"]');
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Invalid allocation percentage')).toBeVisible();
        });
        await test_1.test.step('Test negative percentage', async () => {
            await page.fill('[data-testid="allocation-percentage"]', '-10');
            await page.click('[data-testid="save-allocation-btn"]');
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toBeVisible();
        });
        await test_1.test.step('Test empty form submission', async () => {
            await page.fill('[data-testid="allocation-percentage"]', '');
            await page.click('[data-testid="save-allocation-btn"]');
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toBeVisible();
        });
        await test_1.test.step('Test network error handling', async () => {
            await page.route('http://localhost:3001/api/**', route => route.abort());
            await page.fill('[data-testid="allocation-percentage"]', '50');
            await page.click('[data-testid="save-allocation-btn"]');
            await (0, test_1.expect)(page.locator('[data-testid="network-error"]')).toBeVisible();
        });
    });
    (0, test_1.test)('User Story 10: Verify data persists after page refresh', async () => {
        let initialAllocations;
        await test_1.test.step('Record initial state', async () => {
            await page.click('[data-testid="allocations-tab"]');
            await page.waitForLoadState('networkidle');
            const response = await page.request.get('http://localhost:3002/api/working-allocations');
            const data = await response.json();
            initialAllocations = [...data.data];
        });
        await test_1.test.step('Create new allocation', async () => {
            await resourcePage.createAllocation('John Doe', 'Data Analytics Dashboard', '25');
        });
        await test_1.test.step('Refresh page and verify persistence', async () => {
            await page.reload();
            await page.waitForLoadState('networkidle');
            await page.click('[data-testid="allocations-tab"]');
            await (0, test_1.expect)(page.locator('text=John Doe')).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Data Analytics Dashboard')).toBeVisible();
            await (0, test_1.expect)(page.locator('text=25%')).toBeVisible();
        });
        await test_1.test.step('Verify in database after refresh', async () => {
            const response = await page.request.get('http://localhost:3002/api/working-allocations');
            const data = await response.json();
            (0, test_1.expect)(data.data.length).toBe(initialAllocations.length + 1);
            const newAllocation = data.data.find(a => a.employeeName === 'John Doe' &&
                a.projectName === 'Data Analytics Dashboard' &&
                a.allocatedPercentage === 25);
            (0, test_1.expect)(newAllocation).toBeDefined();
        });
        await test_1.test.step('Test multiple browser sessions', async () => {
            const secondTab = await page.context().newPage();
            await secondTab.goto('http://localhost:3003');
            await secondTab.waitForLoadState('networkidle');
            await secondTab.click('[data-testid="allocations-tab"]');
            await (0, test_1.expect)(secondTab.locator('text=John Doe')).toBeVisible();
            await (0, test_1.expect)(secondTab.locator('text=Data Analytics Dashboard')).toBeVisible();
            await secondTab.close();
        });
    });
    (0, test_1.test)('Performance and Load Testing', async () => {
        await test_1.test.step('Measure page load time', async () => {
            const startTime = Date.now();
            await resourcePage.navigateTo();
            await page.waitForLoadState('networkidle');
            const loadTime = Date.now() - startTime;
            (0, test_1.expect)(loadTime).toBeLessThan(5000);
            console.log(`Page load time: ${loadTime}ms`);
        });
        await test_1.test.step('Test rapid navigation', async () => {
            const tabs = ['employees-tab', 'projects-tab', 'allocations-tab', 'capacity-dashboard-tab'];
            for (let i = 0; i < 10; i++) {
                for (const tab of tabs) {
                    await page.click(`[data-testid="${tab}"]`);
                    await page.waitForTimeout(100);
                }
            }
            await page.waitForLoadState('networkidle');
            await (0, test_1.expect)(page.locator('[data-testid="capacity-chart"]')).toBeVisible();
        });
    });
    (0, test_1.test)('Cross-browser Data Consistency', async () => {
        await test_1.test.step('Verify data loads consistently', async () => {
            await page.click('[data-testid="allocations-tab"]');
            await page.waitForLoadState('networkidle');
            const allocationCount = await page.locator('[data-testid="allocation-row"]').count();
            (0, test_1.expect)(allocationCount).toBeGreaterThan(0);
            await (0, test_1.expect)(page.locator('text=John Doe')).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Jane Smith')).toBeVisible();
            await (0, test_1.expect)(page.locator('text=Mike Johnson')).toBeVisible();
        });
    });
});
test_1.test.afterAll(async () => {
    console.log(`
  ====================================
  Resource Allocation E2E Test Summary
  ====================================
  
  Test Environment:
  - Frontend: http://localhost:3003
  - Backend: http://localhost:3001
  - Test API: http://localhost:3002
  
  Real Data Verified:
  - 3 employees (John Doe, Jane Smith, Mike Johnson)
  - 5 projects (Budget Calc, E-commerce, Mobile App, Analytics, Customer Portal)
  - Dynamic allocations with conflict detection
  
  User Stories Covered:
  ✓ View employees and allocations
  ✓ View projects and resources
  ✓ Create new allocations
  ✓ Edit existing allocations
  ✓ Delete allocations
  ✓ Detect conflicts (130% overallocation)
  ✓ Capacity utilization dashboard
  ✓ Navigation between views
  ✓ Error handling
  ✓ Data persistence after refresh
  
  Screenshots saved to: test-results/
  Full report available in: playwright-report/
  `);
});
//# sourceMappingURL=resource-allocation-real-data.spec.js.map
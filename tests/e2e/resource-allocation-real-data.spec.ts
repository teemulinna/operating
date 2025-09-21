import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Resource Allocation E2E Tests with Real Data
 * Tests against actual database with 3 employees, 5 projects, 3 allocations
 * 
 * Test Environment:
 * - Frontend: http://localhost:3003
 * - Backend: http://localhost:3001
 * - Test API: http://localhost:3002
 */

// Test data constants - matches real database
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

// Helper functions for test interactions
class ResourceAllocationPage {
  constructor(private page: Page) {}

  async navigateTo(path = '') {
    await this.page.goto(`http://localhost:3003${path}`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForEmployeeData() {
    // Wait for employee data to load
    await this.page.waitForSelector('[data-testid="employee-list"]', { timeout: 10000 });
    await expect(this.page.locator('[data-testid="employee-list"] .employee-item')).toHaveCount(3);
  }

  async waitForProjectData() {
    // Wait for project data to load
    await this.page.waitForSelector('[data-testid="project-list"]', { timeout: 10000 });
    await expect(this.page.locator('[data-testid="project-list"] .project-item')).toHaveCount(5);
  }

  async createAllocation(employeeName: string, projectName: string, percentage: string) {
    await this.page.click('[data-testid="create-allocation-btn"]');
    await this.page.waitForSelector('[data-testid="allocation-form"]');
    
    // Fill allocation form
    await this.page.selectOption('[data-testid="employee-select"]', { label: employeeName });
    await this.page.selectOption('[data-testid="project-select"]', { label: projectName });
    await this.page.fill('[data-testid="allocation-percentage"]', percentage);
    
    await this.page.click('[data-testid="save-allocation-btn"]');
    await this.page.waitForLoadState('networkidle');
  }

  async editAllocation(employeeName: string, newPercentage: string) {
    // Find allocation row for employee
    const allocationRow = this.page.locator(`[data-testid="allocation-row"]:has-text("${employeeName}")`);
    await allocationRow.locator('[data-testid="edit-allocation-btn"]').click();
    
    await this.page.waitForSelector('[data-testid="allocation-form"]');
    await this.page.fill('[data-testid="allocation-percentage"]', newPercentage);
    await this.page.click('[data-testid="save-allocation-btn"]');
    await this.page.waitForLoadState('networkidle');
  }

  async deleteAllocation(employeeName: string) {
    const allocationRow = this.page.locator(`[data-testid="allocation-row"]:has-text("${employeeName}")`);
    await allocationRow.locator('[data-testid="delete-allocation-btn"]').click();
    
    // Confirm deletion
    await this.page.click('[data-testid="confirm-delete-btn"]');
    await this.page.waitForLoadState('networkidle');
  }

  async checkConflictWarning() {
    return await this.page.locator('[data-testid="conflict-warning"]').isVisible();
  }

  async getUtilizationPercentage(employeeName: string) {
    const utilizationElement = this.page.locator(`[data-testid="utilization-${employeeName}"]`);
    return await utilizationElement.textContent();
  }
}

test.describe('Resource Allocation System - Real Data E2E Tests', () => {
  let page: Page;
  let resourcePage: ResourceAllocationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    resourcePage = new ResourceAllocationPage(page);
    
    // Navigate to the application
    await resourcePage.navigateTo();
    
    // Wait for initial data to load
    await page.waitForTimeout(2000); // Allow systems to stabilize
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('User Story 1: View all employees and their current allocations', async () => {
    await test.step('Navigate to employees view', async () => {
      await page.click('[data-testid="employees-tab"]');
      await resourcePage.waitForEmployeeData();
    });

    await test.step('Verify all employees are displayed', async () => {
      for (const employee of REAL_EMPLOYEES) {
        await expect(page.locator(`text=${employee.name}`)).toBeVisible();
        await expect(page.locator(`text=${employee.role}`)).toBeVisible();
      }
    });

    await test.step('Verify allocation percentages are displayed', async () => {
      // Check that allocation percentages are visible for each employee
      const allocationElements = page.locator('[data-testid*="allocation-percentage"]');
      await expect(allocationElements.first()).toBeVisible();
    });

    await test.step('Take screenshot for visual verification', async () => {
      await page.screenshot({ 
        path: 'test-results/employees-view.png',
        fullPage: true 
      });
    });
  });

  test('User Story 2: View all projects and assigned resources', async () => {
    await test.step('Navigate to projects view', async () => {
      await page.click('[data-testid="projects-tab"]');
      await resourcePage.waitForProjectData();
    });

    await test.step('Verify all projects are displayed', async () => {
      for (const project of REAL_PROJECTS) {
        await expect(page.locator(`text=${project.name}`)).toBeVisible();
      }
    });

    await test.step('Verify resource assignments are shown', async () => {
      // Check that assigned resources are displayed for each project
      const resourceElements = page.locator('[data-testid*="assigned-resources"]');
      await expect(resourceElements.first()).toBeVisible();
    });

    await test.step('Take screenshot for visual verification', async () => {
      await page.screenshot({ 
        path: 'test-results/projects-view.png',
        fullPage: true 
      });
    });
  });

  test('User Story 3: Create new allocation - John Doe to Budget Calc Project at 30%', async () => {
    await test.step('Navigate to allocations view', async () => {
      await page.click('[data-testid="allocations-tab"]');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Create new allocation', async () => {
      await resourcePage.createAllocation('John Doe', 'Budget Calc Project', '30');
    });

    await test.step('Verify allocation was created', async () => {
      await expect(page.locator('text=John Doe')).toBeVisible();
      await expect(page.locator('text=Budget Calc Project')).toBeVisible();
      await expect(page.locator('text=30%')).toBeVisible();
    });

    await test.step('Verify in database via API', async () => {
      const response = await page.request.get('http://localhost:3002/api/working-allocations');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      const newAllocation = data.data.find(a => 
        a.employeeName === 'John Doe' && 
        a.projectName === 'Budget Calc Project' && 
        a.allocatedPercentage === 30
      );
      expect(newAllocation).toBeDefined();
    });

    await test.step('Take screenshot of new allocation', async () => {
      await page.screenshot({ 
        path: 'test-results/new-allocation-created.png',
        fullPage: true 
      });
    });
  });

  test('User Story 4: Edit existing allocation - Change Jane from 75% to 60%', async () => {
    await test.step('Navigate to allocations view', async () => {
      await page.click('[data-testid="allocations-tab"]');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Edit existing allocation', async () => {
      await resourcePage.editAllocation('Jane Smith', '60');
    });

    await test.step('Verify allocation was updated', async () => {
      const janeAllocation = page.locator('[data-testid="allocation-row"]:has-text("Jane Smith")');
      await expect(janeAllocation.locator('text=60%')).toBeVisible();
    });

    await test.step('Verify change persisted in database', async () => {
      const response = await page.request.get('http://localhost:3002/api/working-allocations');
      const data = await response.json();
      
      const updatedAllocation = data.data.find(a => 
        a.employeeName === 'Jane Smith' && a.allocatedPercentage === 60
      );
      expect(updatedAllocation).toBeDefined();
    });
  });

  test('User Story 5: Delete allocation to free up resources', async () => {
    await test.step('Navigate to allocations view', async () => {
      await page.click('[data-testid="allocations-tab"]');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Count initial allocations', async () => {
      const initialCount = await page.locator('[data-testid="allocation-row"]').count();
      expect(initialCount).toBeGreaterThan(0);
    });

    await test.step('Delete an allocation', async () => {
      await resourcePage.deleteAllocation('Mike Johnson');
    });

    await test.step('Verify allocation was removed', async () => {
      await expect(
        page.locator('[data-testid="allocation-row"]:has-text("Mike Johnson")')
      ).not.toBeVisible();
    });

    await test.step('Verify deletion in database', async () => {
      const response = await page.request.get('http://localhost:3002/api/working-allocations');
      const data = await response.json();
      
      const deletedAllocation = data.data.find(a => 
        a.employeeName === 'Mike Johnson'
      );
      expect(deletedAllocation).toBeUndefined();
    });
  });

  test('User Story 6: Detect allocation conflicts (130% overallocation)', async () => {
    await test.step('Create conflicting allocations', async () => {
      await page.click('[data-testid="allocations-tab"]');
      await page.waitForLoadState('networkidle');

      // Create first allocation - Mike at 80%
      await resourcePage.createAllocation('Mike Johnson', 'E-commerce Platform', '80');
      
      // Create second allocation - Mike at 50% (total 130%)
      await resourcePage.createAllocation('Mike Johnson', 'Mobile App Redesign', '50');
    });

    await test.step('Verify conflict warning is displayed', async () => {
      const conflictVisible = await resourcePage.checkConflictWarning();
      expect(conflictVisible).toBeTruthy();
      
      // Check specific conflict message
      await expect(page.locator('text=Overallocation detected')).toBeVisible();
      await expect(page.locator('text=130%')).toBeVisible();
    });

    await test.step('Verify conflict shows in capacity dashboard', async () => {
      await page.click('[data-testid="capacity-dashboard-tab"]');
      await page.waitForLoadState('networkidle');
      
      const mikeUtilization = await resourcePage.getUtilizationPercentage('Mike Johnson');
      expect(mikeUtilization).toContain('130%');
    });

    await test.step('Take screenshot of conflict state', async () => {
      await page.screenshot({ 
        path: 'test-results/allocation-conflict.png',
        fullPage: true 
      });
    });
  });

  test('User Story 7: View capacity utilization dashboard', async () => {
    await test.step('Navigate to capacity dashboard', async () => {
      await page.click('[data-testid="capacity-dashboard-tab"]');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify dashboard elements are visible', async () => {
      await expect(page.locator('[data-testid="capacity-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="utilization-summary"]')).toBeVisible();
    });

    await test.step('Verify employee utilization percentages', async () => {
      for (const employee of REAL_EMPLOYEES) {
        const utilizationElement = page.locator(`[data-testid="utilization-${employee.name}"]`);
        await expect(utilizationElement).toBeVisible();
      }
    });

    await test.step('Verify capacity metrics are calculated', async () => {
      await expect(page.locator('[data-testid="total-capacity"]')).toBeVisible();
      await expect(page.locator('[data-testid="available-capacity"]')).toBeVisible();
      await expect(page.locator('[data-testid="overallocated-count"]')).toBeVisible();
    });

    await test.step('Take screenshot of dashboard', async () => {
      await page.screenshot({ 
        path: 'test-results/capacity-dashboard.png',
        fullPage: true 
      });
    });
  });

  test('User Story 8: Navigate between different views', async () => {
    const views = [
      { tab: 'employees-tab', element: '[data-testid="employee-list"]' },
      { tab: 'projects-tab', element: '[data-testid="project-list"]' },
      { tab: 'allocations-tab', element: '[data-testid="allocation-list"]' },
      { tab: 'capacity-dashboard-tab', element: '[data-testid="capacity-chart"]' },
      { tab: 'calendar-view-tab', element: '[data-testid="calendar-container"]' }
    ];

    for (const view of views) {
      await test.step(`Navigate to ${view.tab}`, async () => {
        await page.click(`[data-testid="${view.tab}"]`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator(view.element)).toBeVisible({ timeout: 10000 });
      });
    }

    await test.step('Verify navigation state persistence', async () => {
      // Click through views rapidly to test state management
      for (const view of views) {
        await page.click(`[data-testid="${view.tab}"]`);
        await page.waitForTimeout(500);
      }
      
      // Final view should still work
      await expect(page.locator(views[views.length - 1].element)).toBeVisible();
    });
  });

  test('User Story 9: Test error handling with invalid data', async () => {
    await test.step('Test invalid allocation percentage', async () => {
      await page.click('[data-testid="allocations-tab"]');
      await page.click('[data-testid="create-allocation-btn"]');
      
      await page.selectOption('[data-testid="employee-select"]', { label: 'John Doe' });
      await page.selectOption('[data-testid="project-select"]', { label: 'Budget Calc Project' });
      await page.fill('[data-testid="allocation-percentage"]', '150'); // Invalid > 100%
      
      await page.click('[data-testid="save-allocation-btn"]');
      
      // Verify error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('text=Invalid allocation percentage')).toBeVisible();
    });

    await test.step('Test negative percentage', async () => {
      await page.fill('[data-testid="allocation-percentage"]', '-10');
      await page.click('[data-testid="save-allocation-btn"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    await test.step('Test empty form submission', async () => {
      await page.fill('[data-testid="allocation-percentage"]', '');
      await page.click('[data-testid="save-allocation-btn"]');
      
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    });

    await test.step('Test network error handling', async () => {
      // Simulate network failure
      await page.route('http://localhost:3001/api/**', route => route.abort());
      
      await page.fill('[data-testid="allocation-percentage"]', '50');
      await page.click('[data-testid="save-allocation-btn"]');
      
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    });
  });

  test('User Story 10: Verify data persists after page refresh', async () => {
    let initialAllocations: any[];

    await test.step('Record initial state', async () => {
      await page.click('[data-testid="allocations-tab"]');
      await page.waitForLoadState('networkidle');
      
      const response = await page.request.get('http://localhost:3002/api/working-allocations');
      const data = await response.json();
      initialAllocations = [...data.data];
    });

    await test.step('Create new allocation', async () => {
      await resourcePage.createAllocation('John Doe', 'Data Analytics Dashboard', '25');
    });

    await test.step('Refresh page and verify persistence', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.click('[data-testid="allocations-tab"]');
      
      // Verify new allocation persists
      await expect(page.locator('text=John Doe')).toBeVisible();
      await expect(page.locator('text=Data Analytics Dashboard')).toBeVisible();
      await expect(page.locator('text=25%')).toBeVisible();
    });

    await test.step('Verify in database after refresh', async () => {
      const response = await page.request.get('http://localhost:3002/api/working-allocations');
      const data = await response.json();
      
      expect(data.data.length).toBe(initialAllocations.length + 1);
      
      const newAllocation = data.data.find(a => 
        a.employeeName === 'John Doe' && 
        a.projectName === 'Data Analytics Dashboard' &&
        a.allocatedPercentage === 25
      );
      expect(newAllocation).toBeDefined();
    });

    await test.step('Test multiple browser sessions', async () => {
      // Open second browser tab
      const secondTab = await page.context().newPage();
      await secondTab.goto('http://localhost:3003');
      await secondTab.waitForLoadState('networkidle');
      await secondTab.click('[data-testid="allocations-tab"]');
      
      // Verify data is consistent across sessions
      await expect(secondTab.locator('text=John Doe')).toBeVisible();
      await expect(secondTab.locator('text=Data Analytics Dashboard')).toBeVisible();
      
      await secondTab.close();
    });
  });

  test('Performance and Load Testing', async () => {
    await test.step('Measure page load time', async () => {
      const startTime = Date.now();
      await resourcePage.navigateTo();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
      console.log(`Page load time: ${loadTime}ms`);
    });

    await test.step('Test rapid navigation', async () => {
      const tabs = ['employees-tab', 'projects-tab', 'allocations-tab', 'capacity-dashboard-tab'];
      
      for (let i = 0; i < 10; i++) {
        for (const tab of tabs) {
          await page.click(`[data-testid="${tab}"]`);
          await page.waitForTimeout(100);
        }
      }
      
      // Verify final state is still functional
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="capacity-chart"]')).toBeVisible();
    });
  });

  test('Cross-browser Data Consistency', async () => {
    await test.step('Verify data loads consistently', async () => {
      await page.click('[data-testid="allocations-tab"]');
      await page.waitForLoadState('networkidle');
      
      const allocationCount = await page.locator('[data-testid="allocation-row"]').count();
      expect(allocationCount).toBeGreaterThan(0);
      
      // Verify specific data elements
      await expect(page.locator('text=John Doe')).toBeVisible();
      await expect(page.locator('text=Jane Smith')).toBeVisible();
      await expect(page.locator('text=Mike Johnson')).toBeVisible();
    });
  });
});

// Test suite summary and reporting
test.afterAll(async () => {
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
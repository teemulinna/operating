import { test, expect } from '@playwright/test';

/**
 * ALEX THE PLANNER - 10 MINUTE WORKFLOW VALIDATION
 * 
 * This test validates the core PRD success criteria:
 * "Professional services teams can allocate resources, prevent over-allocation, 
 * and export data within 10 minutes of setup"
 * 
 * Alex is a project manager who needs to:
 * 1. Set up a team (add employees)
 * 2. Create a project  
 * 3. Allocate resources
 * 4. Export for stakeholder reporting
 * 
 * All within 10 minutes using real data with no mocks.
 */

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3003';

test.describe('Alex the Planner - 10 Minute Setup Workflow', () => {
  
  let startTime: number;
  
  test.beforeAll(async () => {
    // Verify system is ready
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) {
      throw new Error('Backend not available - please start backend server on port 3001');
    }
  });

  test.beforeEach(async ({ page }) => {
    startTime = Date.now();
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Ensure we're starting fresh
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Complete Alex Workflow - Professional Services Setup in Under 10 Minutes', async ({ page }) => {
    console.log('🚀 Starting Alex the Planner workflow test...');
    
    // ===== MINUTE 0-2: TEAM SETUP (Add Employees) =====
    console.log('📝 Step 1: Setting up team members...');
    
    await page.goto(`${FRONTEND_URL}/employees`);
    await page.waitForLoadState('networkidle');
    
    // Add Senior Consultant
    await page.click('[data-testid="add-employee-button"]');
    await page.fill('[data-testid="employee-first-name"]', 'Sarah');
    await page.fill('[data-testid="employee-last-name"]', 'Martinez');
    await page.fill('[data-testid="employee-email"]', 'sarah.martinez@consulting.com');
    await page.fill('[data-testid="employee-position"]', 'Senior Consultant');
    await page.selectOption('[data-testid="employee-department"]', { index: 1 });
    await page.fill('[data-testid="employee-default-hours"]', '40');
    await page.click('[data-testid="submit-employee-form"]');
    await page.waitForSelector('text=Sarah Martinez');
    
    // Add Business Analyst  
    await page.click('[data-testid="add-employee-button"]');
    await page.fill('[data-testid="employee-first-name"]', 'David');
    await page.fill('[data-testid="employee-last-name"]', 'Chen');
    await page.fill('[data-testid="employee-email"]', 'd.chen@consulting.com');
    await page.fill('[data-testid="employee-position"]', 'Business Analyst');
    await page.selectOption('[data-testid="employee-department"]', { index: 1 });
    await page.fill('[data-testid="employee-default-hours"]', '40');
    await page.click('[data-testid="submit-employee-form"]');
    await page.waitForSelector('text=David Chen');
    
    // Add Technical Lead
    await page.click('[data-testid="add-employee-button"]');
    await page.fill('[data-testid="employee-first-name"]', 'Emily');
    await page.fill('[data-testid="employee-last-name"]', 'Johnson');
    await page.fill('[data-testid="employee-email"]', 'e.johnson@consulting.com');
    await page.fill('[data-testid="employee-position"]', 'Technical Lead');
    await page.selectOption('[data-testid="employee-department"]', { index: 1 });
    await page.fill('[data-testid="employee-default-hours"]', '40');
    await page.click('[data-testid="submit-employee-form"]');
    await page.waitForSelector('text=Emily Johnson');
    
    const teamSetupTime = Date.now() - startTime;
    console.log(`✅ Team setup completed in ${(teamSetupTime / 1000).toFixed(1)}s`);
    expect(teamSetupTime).toBeLessThan(120000); // Under 2 minutes
    
    // ===== MINUTE 2-4: PROJECT CREATION =====
    console.log('📋 Step 2: Creating client project...');
    
    await page.goto(`${FRONTEND_URL}/projects`);
    await page.waitForLoadState('networkidle');
    
    await page.click('[data-testid="add-project-button"]');
    await page.fill('[data-testid="project-name"]', 'Digital Transformation - MegaCorp');
    await page.fill('[data-testid="project-description"]', 'Comprehensive digital transformation project for MegaCorp including process optimization, system integration, and change management');
    await page.fill('[data-testid="project-start-date"]', '2024-06-01');
    await page.fill('[data-testid="project-end-date"]', '2024-12-31');
    await page.selectOption('[data-testid="project-status"]', 'active');
    await page.click('[data-testid="submit-project-form"]');
    await page.waitForSelector('text=Digital Transformation - MegaCorp');
    
    const projectSetupTime = Date.now() - startTime;
    console.log(`✅ Project creation completed in ${(projectSetupTime / 1000).toFixed(1)}s`);
    expect(projectSetupTime).toBeLessThan(240000); // Under 4 minutes
    
    // ===== MINUTE 4-7: RESOURCE ALLOCATION =====
    console.log('👥 Step 3: Allocating team members to project...');
    
    await page.goto(`${FRONTEND_URL}/allocations`);
    await page.waitForLoadState('networkidle');
    
    // Allocate Sarah Martinez (Senior Consultant) - Full time
    await page.click('[data-testid="create-allocation-button"]');
    await page.selectOption('[data-testid="allocation-employee"]', 'Sarah Martinez');
    await page.selectOption('[data-testid="allocation-project"]', 'Digital Transformation - MegaCorp');
    await page.fill('[data-testid="allocation-hours-per-week"]', '40');
    await page.fill('[data-testid="allocation-start-date"]', '2024-06-01');
    await page.fill('[data-testid="allocation-end-date"]', '2024-12-31');
    await page.click('[data-testid="submit-allocation-form"]');
    await page.waitForSelector('text=Sarah Martinez', { timeout: 5000 });
    
    // Allocate David Chen (Business Analyst) - 75% time
    await page.click('[data-testid="create-allocation-button"]');
    await page.selectOption('[data-testid="allocation-employee"]', 'David Chen');
    await page.selectOption('[data-testid="allocation-project"]', 'Digital Transformation - MegaCorp');
    await page.fill('[data-testid="allocation-hours-per-week"]', '30');
    await page.fill('[data-testid="allocation-start-date"]', '2024-06-01');
    await page.fill('[data-testid="allocation-end-date"]', '2024-10-31');
    await page.click('[data-testid="submit-allocation-form"]');
    await page.waitForSelector('text=David Chen', { timeout: 5000 });
    
    // Allocate Emily Johnson (Technical Lead) - 50% time
    await page.click('[data-testid="create-allocation-button"]');
    await page.selectOption('[data-testid="allocation-employee"]', 'Emily Johnson');
    await page.selectOption('[data-testid="allocation-project"]', 'Digital Transformation - MegaCorp');
    await page.fill('[data-testid="allocation-hours-per-week"]', '20');
    await page.fill('[data-testid="allocation-start-date"]', '2024-07-01');
    await page.fill('[data-testid="allocation-end-date"]', '2024-12-31');
    await page.click('[data-testid="submit-allocation-form"]');
    await page.waitForSelector('text=Emily Johnson', { timeout: 5000 });
    
    const allocationTime = Date.now() - startTime;
    console.log(`✅ Resource allocation completed in ${(allocationTime / 1000).toFixed(1)}s`);
    expect(allocationTime).toBeLessThan(420000); // Under 7 minutes
    
    // ===== MINUTE 7-8: VALIDATE NO OVER-ALLOCATION =====
    console.log('⚠️  Step 4: Validating allocation constraints...');
    
    // Verify no over-allocation warnings are present
    const overAllocationWarning = page.locator('[data-testid="over-allocation-warning"]');
    await expect(overAllocationWarning).not.toBeVisible();
    
    // Check capacity indicators
    const capacityIndicators = page.locator('[data-testid="employee-capacity-indicator"]');
    const capacityCount = await capacityIndicators.count();
    
    for (let i = 0; i < capacityCount; i++) {
      const indicator = capacityIndicators.nth(i);
      const utilizationLevel = await indicator.getAttribute('data-utilization-level');
      expect(['low', 'medium', 'high']).toContain(utilizationLevel); // Should not be 'over'
    }
    
    console.log('✅ No over-allocation detected - all constraints satisfied');
    
    // ===== MINUTE 8-9: EXPORT FOR STAKEHOLDERS =====
    console.log('📊 Step 5: Exporting data for stakeholder reporting...');
    
    // Export allocation data
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv-button"]');
    const download = await downloadPromise;
    
    // Validate export
    expect(download.suggestedFilename()).toMatch(/allocations.*\.csv/);
    
    // Save and validate CSV content
    const tempPath = `/tmp/alex-workflow-export-${Date.now()}.csv`;
    await download.saveAs(tempPath);
    
    const fs = require('fs');
    const csvContent = fs.readFileSync(tempPath, 'utf8');
    
    // Verify all team members are in export
    expect(csvContent).toContain('Sarah Martinez');
    expect(csvContent).toContain('David Chen');  
    expect(csvContent).toContain('Emily Johnson');
    expect(csvContent).toContain('Digital Transformation - MegaCorp');
    
    // Verify hours are correct
    expect(csvContent).toContain('40'); // Sarah's full-time allocation
    expect(csvContent).toContain('30'); // David's 75% allocation
    expect(csvContent).toContain('20'); // Emily's 50% allocation
    
    fs.unlinkSync(tempPath); // Clean up
    
    const exportTime = Date.now() - startTime;
    console.log(`✅ Export completed in ${(exportTime / 1000).toFixed(1)}s`);
    
    // ===== FINAL VALIDATION: UNDER 10 MINUTES =====
    const totalTime = Date.now() - startTime;
    const totalMinutes = totalTime / 60000;
    
    console.log(`🎉 ALEX WORKFLOW COMPLETED in ${totalMinutes.toFixed(2)} minutes!`);
    console.log(`Breakdown:`);
    console.log(`- Team Setup: ${(teamSetupTime / 1000).toFixed(1)}s`);
    console.log(`- Project Creation: ${((projectSetupTime - teamSetupTime) / 1000).toFixed(1)}s`);
    console.log(`- Resource Allocation: ${((allocationTime - projectSetupTime) / 1000).toFixed(1)}s`);
    console.log(`- Export & Validation: ${((totalTime - allocationTime) / 1000).toFixed(1)}s`);
    
    // CRITICAL SUCCESS CRITERIA: Must be under 10 minutes
    expect(totalMinutes).toBeLessThan(10);
    
    // Additional validation: Verify data persists
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // All allocations should still be visible after refresh
    await expect(page.locator('text=Sarah Martinez')).toBeVisible();
    await expect(page.locator('text=David Chen')).toBeVisible();
    await expect(page.locator('text=Emily Johnson')).toBeVisible();
    await expect(page.locator('text=Digital Transformation - MegaCorp')).toBeVisible();
  });
  
  test('Alex Workflow - Edge Case: Attempt Over-allocation and Handle Gracefully', async ({ page }) => {
    console.log('🚨 Testing over-allocation protection workflow...');
    
    // Quick setup: Create employee and project
    await page.goto(`${FRONTEND_URL}/employees`);
    await page.click('[data-testid="add-employee-button"]');
    await page.fill('[data-testid="employee-first-name"]', 'Test');
    await page.fill('[data-testid="employee-last-name"]', 'Consultant');
    await page.fill('[data-testid="employee-email"]', 'test@consulting.com');
    await page.fill('[data-testid="employee-position"]', 'Consultant');
    await page.selectOption('[data-testid="employee-department"]', { index: 1 });
    await page.fill('[data-testid="employee-default-hours"]', '40');
    await page.click('[data-testid="submit-employee-form"]');
    
    await page.goto(`${FRONTEND_URL}/projects`);
    await page.click('[data-testid="add-project-button"]');
    await page.fill('[data-testid="project-name"]', 'Project A');
    await page.fill('[data-testid="project-description"]', 'First project');
    await page.fill('[data-testid="project-start-date"]', '2024-06-01');
    await page.fill('[data-testid="project-end-date"]', '2024-08-31');
    await page.click('[data-testid="submit-project-form"]');
    
    await page.goto(`${FRONTEND_URL}/projects`);
    await page.click('[data-testid="add-project-button"]');
    await page.fill('[data-testid="project-name"]', 'Project B');
    await page.fill('[data-testid="project-description"]', 'Second project');
    await page.fill('[data-testid="project-start-date"]', '2024-06-15');
    await page.fill('[data-testid="project-end-date"]', '2024-09-15');
    await page.click('[data-testid="submit-project-form"]');
    
    // Create first allocation (30 hours)
    await page.goto(`${FRONTEND_URL}/allocations`);
    await page.click('[data-testid="create-allocation-button"]');
    await page.selectOption('[data-testid="allocation-employee"]', 'Test Consultant');
    await page.selectOption('[data-testid="allocation-project"]', 'Project A');
    await page.fill('[data-testid="allocation-hours-per-week"]', '30');
    await page.fill('[data-testid="allocation-start-date"]', '2024-06-01');
    await page.fill('[data-testid="allocation-end-date"]', '2024-08-31');
    await page.click('[data-testid="submit-allocation-form"]');
    
    // Attempt overlapping allocation that would cause over-allocation (25 hours = 55 total > 40 capacity)
    await page.click('[data-testid="create-allocation-button"]');
    await page.selectOption('[data-testid="allocation-employee"]', 'Test Consultant');
    await page.selectOption('[data-testid="allocation-project"]', 'Project B');
    await page.fill('[data-testid="allocation-hours-per-week"]', '25');
    await page.fill('[data-testid="allocation-start-date"]', '2024-06-15');
    await page.fill('[data-testid="allocation-end-date"]', '2024-08-15');
    
    // Submit and expect over-allocation warning
    await page.click('[data-testid="submit-allocation-form"]');
    
    // Should show warning dialog
    const warningDialog = page.locator('[data-testid="over-allocation-warning"]');
    await expect(warningDialog).toBeVisible();
    
    // Should show the over-allocation details
    await expect(warningDialog.locator('text=over-allocated')).toBeVisible();
    await expect(warningDialog.locator('text=55')).toBeVisible(); // Total hours
    await expect(warningDialog.locator('text=40')).toBeVisible(); // Capacity
    
    // Should provide options to proceed or cancel
    const proceedButton = page.locator('[data-testid="proceed-with-allocation"]');
    const cancelButton = page.locator('[data-testid="cancel-allocation"]');
    
    await expect(proceedButton).toBeVisible();
    await expect(cancelButton).toBeVisible();
    
    // Test cancelling (Alex chooses to adjust allocation instead)
    await cancelButton.click();
    
    // Dialog should close, form should remain open for adjustment
    await expect(warningDialog).not.toBeVisible();
    const allocationForm = page.locator('[data-testid="allocation-form-modal"]');
    await expect(allocationForm).toBeVisible();
    
    // Adjust to safe hours (10 hours = 40 total = 100% utilization)
    await page.fill('[data-testid="allocation-hours-per-week"]', '10');
    await page.click('[data-testid="submit-allocation-form"]');
    
    // Should succeed without warning
    await expect(warningDialog).not.toBeVisible();
    await expect(allocationForm).not.toBeVisible();
    
    // Verify allocation was created
    await page.waitForSelector('text=Project B');
    await expect(page.locator('text=10h')).toBeVisible();
    
    console.log('✅ Over-allocation protection working correctly');
    
    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(600000); // Still under 10 minutes including edge case testing
  });
  
  test('Alex Workflow - Realistic Professional Services Scenario', async ({ page }) => {
    console.log('🏢 Testing realistic professional services scenario...');
    
    // Create typical consulting team structure
    const team = [
      { name: 'Alex', last: 'Thompson', role: 'Project Manager', hours: 40 },
      { name: 'Maria', last: 'Rodriguez', role: 'Senior Consultant', hours: 40 },
      { name: 'James', last: 'Wilson', role: 'Business Analyst', hours: 40 },
      { name: 'Lisa', last: 'Chang', role: 'Technical Specialist', hours: 32 }, // Part-time
      { name: 'Robert', last: 'Davis', role: 'Junior Consultant', hours: 40 }
    ];
    
    // Add team members
    await page.goto(`${FRONTEND_URL}/employees`);
    for (const member of team) {
      await page.click('[data-testid="add-employee-button"]');
      await page.fill('[data-testid="employee-first-name"]', member.name);
      await page.fill('[data-testid="employee-last-name"]', member.last);
      await page.fill('[data-testid="employee-email"]', `${member.name.toLowerCase()}.${member.last.toLowerCase()}@consulting.com`);
      await page.fill('[data-testid="employee-position"]', member.role);
      await page.selectOption('[data-testid="employee-department"]', { index: 1 });
      await page.fill('[data-testid="employee-default-hours"]', member.hours.toString());
      await page.click('[data-testid="submit-employee-form"]');
      await page.waitForSelector(`text=${member.name} ${member.last}`);
    }
    
    // Create multiple concurrent projects
    const projects = [
      { name: 'Client A - Process Optimization', start: '2024-06-01', end: '2024-09-30' },
      { name: 'Client B - System Integration', start: '2024-07-01', end: '2024-12-31' },
      { name: 'Client C - Change Management', start: '2024-08-01', end: '2024-11-30' }
    ];
    
    await page.goto(`${FRONTEND_URL}/projects`);
    for (const project of projects) {
      await page.click('[data-testid="add-project-button"]');
      await page.fill('[data-testid="project-name"]', project.name);
      await page.fill('[data-testid="project-description"]', `Professional services engagement for ${project.name}`);
      await page.fill('[data-testid="project-start-date"]', project.start);
      await page.fill('[data-testid="project-end-date"]', project.end);
      await page.selectOption('[data-testid="project-status"]', 'active');
      await page.click('[data-testid="submit-project-form"]');
      await page.waitForSelector(`text=${project.name.split(' - ')[1]}`);
    }
    
    // Create realistic allocation patterns
    await page.goto(`${FRONTEND_URL}/allocations`);
    
    // Alex (PM) manages all projects at 25% each + 25% admin
    const allocations = [
      { employee: 'Alex Thompson', project: 'Client A - Process Optimization', hours: '10', start: '2024-06-01', end: '2024-09-30' },
      { employee: 'Alex Thompson', project: 'Client B - System Integration', hours: '10', start: '2024-07-01', end: '2024-12-31' },
      { employee: 'Alex Thompson', project: 'Client C - Change Management', hours: '10', start: '2024-08-01', end: '2024-11-30' },
      
      // Maria (Senior) leads Client A full-time
      { employee: 'Maria Rodriguez', project: 'Client A - Process Optimization', hours: '40', start: '2024-06-01', end: '2024-09-30' },
      
      // James (BA) splits between Client B and C
      { employee: 'James Wilson', project: 'Client B - System Integration', hours: '20', start: '2024-07-01', end: '2024-12-31' },
      { employee: 'James Wilson', project: 'Client C - Change Management', hours: '20', start: '2024-08-01', end: '2024-11-30' },
      
      // Lisa (Technical) supports all projects as needed
      { employee: 'Lisa Chang', project: 'Client A - Process Optimization', hours: '16', start: '2024-06-15', end: '2024-08-15' },
      { employee: 'Lisa Chang', project: 'Client B - System Integration', hours: '16', start: '2024-09-01', end: '2024-12-31' },
      
      // Robert (Junior) dedicated to Client B
      { employee: 'Robert Davis', project: 'Client B - System Integration', hours: '40', start: '2024-07-15', end: '2024-12-31' }
    ];
    
    for (const allocation of allocations) {
      await page.click('[data-testid="create-allocation-button"]');
      await page.selectOption('[data-testid="allocation-employee"]', allocation.employee);
      await page.selectOption('[data-testid="allocation-project"]', allocation.project);
      await page.fill('[data-testid="allocation-hours-per-week"]', allocation.hours);
      await page.fill('[data-testid="allocation-start-date"]', allocation.start);
      await page.fill('[data-testid="allocation-end-date"]', allocation.end);
      await page.click('[data-testid="submit-allocation-form"]');
      await page.waitForTimeout(1000); // Allow time for allocation to be processed
    }
    
    // Verify no over-allocations
    const overAllocationWarnings = page.locator('[data-testid="over-allocation-warning"]');
    await expect(overAllocationWarnings).not.toBeVisible();
    
    // Export comprehensive report
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv-button"]');
    const download = await downloadPromise;
    
    const tempPath = `/tmp/professional-services-export-${Date.now()}.csv`;
    await download.saveAs(tempPath);
    
    const fs = require('fs');
    const csvContent = fs.readFileSync(tempPath, 'utf8');
    
    // Verify all team members and projects are represented
    team.forEach(member => {
      expect(csvContent).toContain(`${member.name} ${member.last}`);
    });
    
    projects.forEach(project => {
      expect(csvContent).toContain(project.name);
    });
    
    fs.unlinkSync(tempPath);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Professional services scenario completed in ${(totalTime / 60000).toFixed(2)} minutes`);
    
    // Should still be under 10 minutes even for complex scenario
    expect(totalTime).toBeLessThan(600000);
    
    // Verify persistence by checking schedule view
    await page.goto(`${FRONTEND_URL}/schedule`);
    await page.waitForLoadState('networkidle');
    
    // Should see all team members in schedule
    for (const member of team) {
      await expect(page.locator(`text=${member.name} ${member.last}`)).toBeVisible();
    }
    
    console.log('✅ All data persisted correctly in schedule view');
  });
});
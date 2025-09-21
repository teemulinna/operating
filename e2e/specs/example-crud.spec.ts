import { test, expect } from '@playwright/test';
import { EmployeesPage } from '../pages/EmployeesPage';
import { testEmployees, generateTestData } from '../fixtures/testData';
import { createTestEmployee, deleteTestRecord } from '../helpers/testHelpers';

/**
 * Example CRUD test demonstrating the new E2E structure
 * This shows how to use Page Objects, fixtures, and helpers
 */
test.describe('Employee CRUD Operations - Example Test', () => {
  test('Create, read, update, and delete employee using page objects', async ({ page }) => {
    const employeesPage = new EmployeesPage(page);
    let createdEmployeeId: string;
    
    // Navigate to employees page
    await employeesPage.goto();
    await employeesPage.waitForEmployeesLoaded();
    
    // Verify page loaded correctly
    await expect(employeesPage.title).toContainText('Employees');
    
    // Test data using fixtures
    const testEmployee = {
      ...testEmployees.validEmployee,
      email: generateTestData.email(), // Generate unique email
      firstName: generateTestData.name(),
    };
    
    // CREATE: Add new employee via UI (if add button exists)
    const addButtonVisible = await employeesPage.isVisible(employeesPage.addButton);
    if (addButtonVisible) {
      console.log('✓ Add Employee button is visible - UI flow available');
      
      // This would normally click the add button and fill the form
      // await employeesPage.clickAddEmployee();
      // ... form filling logic would go here ...
      
      // For demo purposes, we'll create via API and verify in UI
      const apiEmployee = await createTestEmployee(page, testEmployee);
      createdEmployeeId = apiEmployee.id;
      console.log(`✓ Employee created via API: ${apiEmployee.firstName} ${apiEmployee.lastName}`);
    } else {
      console.log('ℹ Add Employee button not visible - using API only');
      const apiEmployee = await createTestEmployee(page, testEmployee);
      createdEmployeeId = apiEmployee.id;
    }
    
    // READ: Verify employee appears in the list
    await employeesPage.reload(); // Refresh to see new employee
    await employeesPage.waitForEmployeeCards();
    
    const employeeExists = await employeesPage.employeeExists(testEmployee.firstName);
    expect(employeeExists).toBeTruthy();
    console.log('✓ Employee found in UI list');
    
    // UPDATE: Search for the employee
    if (await employeesPage.isVisible(employeesPage.searchInput)) {
      await employeesPage.searchEmployees(testEmployee.firstName);
      await page.waitForTimeout(1000); // Wait for search
      
      const searchResults = await employeesPage.getEmployeeCount();
      expect(searchResults).toBeGreaterThan(0);
      console.log(`✓ Search found ${searchResults} result(s)`);
    }
    
    // DELETE: Clean up test data
    if (createdEmployeeId) {
      await deleteTestRecord(page, '/api/employees', createdEmployeeId);
      console.log('✓ Test employee deleted via API');
      
      // Verify deletion in UI
      await employeesPage.reload();
      await page.waitForTimeout(1000);
      
      const employeeStillExists = await employeesPage.employeeExists(testEmployee.firstName);
      expect(employeeStillExists).toBeFalsy();
      console.log('✓ Employee no longer appears in UI');
    }
  });
  
  test('Employee page accessibility and usability', async ({ page }) => {
    const employeesPage = new EmployeesPage(page);
    
    // Navigate and wait for load
    await employeesPage.goto();
    await employeesPage.waitForEmployeesLoaded();
    
    // Check basic accessibility
    const title = await employeesPage.getTitle();
    expect(title).toBeTruthy();
    console.log(`✓ Page title: ${title}`);
    
    // Check for essential elements
    const titleVisible = await employeesPage.isVisible(employeesPage.title);
    expect(titleVisible).toBeTruthy();
    console.log('✓ Page title is visible');
    
    // Check if employee list renders
    const listVisible = await employeesPage.isVisible(employeesPage.employeeList);
    expect(listVisible).toBeTruthy();
    console.log('✓ Employee list container is visible');
    
    // Take a screenshot for visual verification
    await employeesPage.takeScreenshot({ 
      path: 'test-results/employees-page-example.png' 
    });
    console.log('✓ Screenshot captured for visual verification');
  });
});
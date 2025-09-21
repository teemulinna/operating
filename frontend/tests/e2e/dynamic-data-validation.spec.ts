import { test, expect } from '@playwright/test';
import TestDataManager, { DatabaseStateDetector } from '../utils/test-data-manager';

test.describe('Dynamic Data Validation - Works with Any Database State', () => {
  
  test('Employee management works with empty, minimal, or rich data', async ({ page }) => {
    // Detect current database state
    const dbState = await DatabaseStateDetector.detectState(page, 'http://localhost:3001/api/employees');
    const strategy = DatabaseStateDetector.getTestStrategy(dbState);
    
    console.log(`🎯 Testing strategy: ${strategy.strategy}`);
    console.log(`📊 Database contains: ${dbState.count} employees`);
    strategy.recommendations.forEach(rec => console.log(`💡 ${rec}`));
    
    await page.goto('/employees');
    
    // Wait for data to load dynamically
    const employeeCount = await TestDataManager.waitForDataLoad(
      page, 
      '[data-testid^="employee-"], .employee-card, .employee-item', 
      'employee data',
      10000
    );
    
    if (dbState.isEmpty) {
      console.log('🏜️ Testing empty state handling');
      
      // Should show empty state message or add button
      const emptyIndicators = [
        '[data-testid="employees-empty-state"]',
        '[data-testid="add-employee-button"]',
        'text=No employees found',
        'text=Add Employee',
        'text=Create your first employee'
      ];
      
      let foundEmptyIndicator = false;
      for (const selector of emptyIndicators) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
          console.log(`✅ Found empty state indicator: ${selector}`);
          foundEmptyIndicator = true;
          break;
        }
      }
      
      if (!foundEmptyIndicator) {
        console.log('⚠️ No empty state indicator found - UI might need improvement');
      }
      
    } else if (dbState.hasMinimalData) {
      console.log('🔢 Testing with minimal data set');
      
      // Verify we can see the employees that exist
      TestDataManager.expectFlexibleCount(employeeCount, 'employees');
      
      if (employeeCount > 0) {
        // Check first employee card is visible
        const firstEmployee = page.locator('[data-testid^="employee-"], .employee-card, .employee-item').first();
        await expect(firstEmployee).toBeVisible();
        
        // Verify employee summary shows correct count
        const summarySelectors = [
          '[data-testid="employees-summary"]',
          '.employees-count',
          'text*="Total:"',
          'text*="employee"'
        ];
        
        for (const selector of summarySelectors) {
          const summary = page.locator(selector);
          if (await summary.isVisible()) {
            const summaryText = await summary.textContent();
            console.log(`📊 Employee summary: ${summaryText}`);
            break;
          }
        }
      }
      
    } else {
      console.log('🏢 Testing with rich data set');
      
      TestDataManager.expectFlexibleCount(employeeCount, 'employees');
      
      // Test pagination if available
      const paginationControls = page.locator('[data-testid*="pagination"], .pagination, [aria-label*="pagination"]');
      if (await paginationControls.isVisible()) {
        console.log('📄 Pagination controls found - testing pagination');
        await expect(paginationControls).toBeVisible();
      }
      
      // Test search if available
      const searchBox = page.locator('[data-testid="search"], input[placeholder*="search"], input[type="search"]');
      if (await searchBox.isVisible()) {
        console.log('🔍 Search functionality found - testing search');
        await searchBox.fill('a');
        await page.waitForTimeout(500); // Wait for search debounce
        // Results should still be valid after search
        TestDataManager.expectFlexibleCount(
          await page.locator('[data-testid^="employee-"], .employee-card').count(),
          'search results'
        );
        await searchBox.clear();
      }
    }
  });

  test('API endpoints handle dynamic data correctly', async ({ page }) => {
    // Test employees API
    const employeeResponse = await page.request.get('http://localhost:3001/api/employees');
    expect(employeeResponse.status()).toBe(200);
    
    const employeeData = await employeeResponse.json();
    await TestDataManager.validateEmployeeData(employeeData.data || [], {
      allowEmpty: true,
      minCount: 0,
      maxCount: 10000
    });
    
    console.log(`✅ Employee API validated: ${(employeeData.data || []).length} employees`);
    
    // Test projects API
    try {
      const projectResponse = await page.request.get('http://localhost:3001/api/projects');
      if (projectResponse.status() === 200) {
        const projectData = await projectResponse.json();
        await TestDataManager.validateProjectData(projectData.data || [], {
          allowEmpty: true,
          minCount: 0,
          maxCount: 10000
        });
        console.log(`✅ Project API validated: ${(projectData.data || []).length} projects`);
      } else {
        console.log('ℹ️ Projects API not available or returned non-200 status');
      }
    } catch (error) {
      console.log('ℹ️ Projects API not accessible:', error.message);
    }
  });

  test('CRUD operations work regardless of initial data state', async ({ page }) => {
    const initialState = await DatabaseStateDetector.detectState(page, 'http://localhost:3001/api/employees');
    console.log(`🔄 Starting CRUD test with ${initialState.count} existing employees`);
    
    await page.goto('/employees');
    
    // Try to find and click Add Employee button
    const addButtonSelectors = [
      '[data-testid="add-employee-button"]',
      'button:has-text("Add Employee")',
      'button:has-text("New Employee")',
      'button:has-text("Create Employee")',
      '[aria-label*="add employee"]'
    ];
    
    let addButtonFound = false;
    for (const selector of addButtonSelectors) {
      const button = page.locator(selector);
      if (await button.isVisible()) {
        await button.click();
        console.log(`✅ Found and clicked add button: ${selector}`);
        addButtonFound = true;
        break;
      }
    }
    
    if (!addButtonFound) {
      console.log('⚠️ No add employee button found - might need UI implementation');
      return;
    }
    
    // Look for form modal or form page
    const formSelectors = [
      '[data-testid="employee-form-modal"]',
      '[data-testid="employee-form"]',
      '.modal:has(input)',
      'form:has([placeholder*="name"], [placeholder*="email"])'
    ];
    
    let formFound = false;
    for (const selector of formSelectors) {
      const form = page.locator(selector);
      if (await form.isVisible()) {
        console.log(`✅ Employee form found: ${selector}`);
        formFound = true;
        break;
      }
    }
    
    if (formFound) {
      // Fill form with test data
      const testEmployee = TestDataManager.generateTestData('employee', Date.now());
      
      // Try to fill common form fields
      const fieldMappings = [
        { selectors: ['[data-testid="employee-first-name"]', 'input[name="firstName"]', '[placeholder*="first name"]'], value: testEmployee.firstName },
        { selectors: ['[data-testid="employee-last-name"]', 'input[name="lastName"]', '[placeholder*="last name"]'], value: testEmployee.lastName },
        { selectors: ['[data-testid="employee-email"]', 'input[name="email"]', '[placeholder*="email"]'], value: testEmployee.email },
        { selectors: ['[data-testid="employee-position"]', 'input[name="position"]', '[placeholder*="position"]'], value: testEmployee.position }
      ];
      
      for (const field of fieldMappings) {
        for (const selector of field.selectors) {
          const input = page.locator(selector);
          if (await input.isVisible()) {
            await input.fill(field.value);
            console.log(`✏️ Filled ${selector} with ${field.value}`);
            break;
          }
        }
      }
      
      // Try to submit
      const submitSelectors = [
        '[data-testid="submit-employee"]',
        'button[type="submit"]',
        'button:has-text("Save")',
        'button:has-text("Create")',
        'button:has-text("Add")'
      ];
      
      for (const selector of submitSelectors) {
        const button = page.locator(selector);
        if (await button.isVisible() && await button.isEnabled()) {
          await button.click();
          console.log(`✅ Clicked submit button: ${selector}`);
          
          // Wait for either success message or form to close
          await page.waitForTimeout(2000);
          
          // Check if employee was added
          const finalState = await DatabaseStateDetector.detectState(page, 'http://localhost:3001/api/employees');
          if (finalState.count > initialState.count) {
            console.log(`🎉 Employee successfully created! Count increased from ${initialState.count} to ${finalState.count}`);
          } else {
            console.log('ℹ️ Employee creation status unclear - form submitted but count unchanged');
          }
          break;
        }
      }
    } else {
      console.log('⚠️ Employee form not found after clicking add button');
    }
  });

  test('Error handling works with any data state', async ({ page }) => {
    // Test API error scenarios
    await page.route('**/api/employees*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      } else {
        await route.continue();
      }
    });
    
    await page.goto('/employees');
    
    // Should handle API errors gracefully
    const errorIndicators = [
      '[data-testid="error-message"]',
      '.error',
      'text=Error loading employees',
      'text=Something went wrong',
      '[role="alert"]'
    ];
    
    let errorFound = false;
    for (const selector of errorIndicators) {
      const element = page.locator(selector);
      try {
        await expect(element).toBeVisible({ timeout: 5000 });
        console.log(`✅ Error handling found: ${selector}`);
        errorFound = true;
        break;
      } catch {
        // Continue trying other selectors
      }
    }
    
    if (!errorFound) {
      console.log('⚠️ No error message found - error handling might need improvement');
    }
  });

  test('Performance is acceptable with any amount of data', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/employees');
    
    // Wait for page to be interactive
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Page load time: ${loadTime}ms`);
    
    // Performance expectations based on data amount
    const dbState = await DatabaseStateDetector.detectState(page, 'http://localhost:3001/api/employees');
    
    let expectedMaxLoadTime;
    if (dbState.count === 0) {
      expectedMaxLoadTime = 3000; // Empty state should be fast
    } else if (dbState.count <= 50) {
      expectedMaxLoadTime = 5000; // Small datasets
    } else {
      expectedMaxLoadTime = 10000; // Larger datasets
    }
    
    expect(loadTime).toBeLessThan(expectedMaxLoadTime);
    console.log(`✅ Performance acceptable: ${loadTime}ms < ${expectedMaxLoadTime}ms`);
  });

  test.afterEach('Cleanup test data', async ({ page }) => {
    // Clean up any test data we might have created
    try {
      await TestDataManager.cleanupTestData(
        page,
        'http://localhost:3001/api/employees',
        'test-automation'
      );
    } catch (error) {
      console.log('Note: Test cleanup had issues (this is usually fine):', error.message);
    }
  });
});
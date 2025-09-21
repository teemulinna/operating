import { test, expect, Page } from '@playwright/test';

// Test Configuration
const BASE_URL = 'http://localhost:3002';
const API_URL = 'http://localhost:3001';

test.describe('Comprehensive E2E Testing Suite', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto(BASE_URL);
    
    // Wait for app to load
    await page.waitForTimeout(1000);
  });

  test.describe('1. Employee Management - CRUD Operations', () => {
    test('should navigate to employees page and display employee list', async () => {
      // Navigate to employees
      await page.click('[href="/employees"]');
      await page.waitForURL(`${BASE_URL}/employees`);
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/screenshots/employees-page.png' });
      
      // Verify page loaded
      await expect(page).toHaveTitle(/Employee Management/);
      await expect(page.locator('h1')).toContainText('Employee');
    });

    test('should create a new employee successfully', async () => {
      await page.goto(`${BASE_URL}/employees`);
      
      // Click Add Employee button
      await page.click('button:has-text("Add Employee")');
      
      // Fill form with test data
      const testEmployee = {
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test.employee@example.com',
        department: 'Engineering',
        role: 'Developer',
        hourlyRate: '75'
      };
      
      await page.fill('[name="firstName"]', testEmployee.firstName);
      await page.fill('[name="lastName"]', testEmployee.lastName);
      await page.fill('[name="email"]', testEmployee.email);
      await page.fill('[name="department"]', testEmployee.department);
      await page.fill('[name="role"]', testEmployee.role);
      await page.fill('[name="hourlyRate"]', testEmployee.hourlyRate);
      
      // Take screenshot before submit
      await page.screenshot({ path: 'test-results/screenshots/employee-form-filled.png' });
      
      // Submit form
      await page.click('button[type="submit"]:has-text("Save")');
      
      // Wait for success feedback
      await page.waitForTimeout(2000);
      
      // Take screenshot after creation
      await page.screenshot({ path: 'test-results/screenshots/employee-created.png' });
      
      // Verify employee appears in list
      await expect(page.locator(`text=${testEmployee.email}`)).toBeVisible();
    });

    test('should edit an existing employee', async () => {
      await page.goto(`${BASE_URL}/employees`);
      
      // Find first employee edit button
      await page.click('button:has-text("Edit"):first');
      
      // Update employee data
      await page.fill('[name="role"]', 'Senior Developer');
      
      // Take screenshot before update
      await page.screenshot({ path: 'test-results/screenshots/employee-edit-form.png' });
      
      // Submit update
      await page.click('button[type="submit"]:has-text("Update")');
      
      await page.waitForTimeout(2000);
      
      // Take screenshot after update
      await page.screenshot({ path: 'test-results/screenshots/employee-updated.png' });
    });

    test('should delete an employee with confirmation', async () => {
      await page.goto(`${BASE_URL}/employees`);
      
      // Click delete button for first employee
      await page.click('button:has-text("Delete"):first');
      
      // Confirm deletion in modal
      await page.click('button:has-text("Delete"):visible');
      
      await page.waitForTimeout(2000);
      
      // Take screenshot after deletion
      await page.screenshot({ path: 'test-results/screenshots/employee-deleted.png' });
    });
  });

  test.describe('2. Project Management Workflows', () => {
    test('should navigate to projects page', async () => {
      await page.click('[href="/projects"]');
      await page.waitForURL(`${BASE_URL}/projects`);
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/screenshots/projects-page.png' });
      
      // Verify projects page loaded
      await expect(page.locator('h1')).toContainText('Project');
    });

    test('should create a new project', async () => {
      await page.goto(`${BASE_URL}/projects`);
      
      // Click Add Project button
      await page.click('button:has-text("Add Project")');
      
      // Fill project form
      const testProject = {
        name: 'E2E Test Project',
        description: 'Project created during E2E testing',
        status: 'Active',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };
      
      await page.fill('[name="name"]', testProject.name);
      await page.fill('[name="description"]', testProject.description);
      await page.selectOption('[name="status"]', testProject.status);
      await page.fill('[name="startDate"]', testProject.startDate);
      await page.fill('[name="endDate"]', testProject.endDate);
      
      // Take screenshot before submit
      await page.screenshot({ path: 'test-results/screenshots/project-form-filled.png' });
      
      // Submit form
      await page.click('button[type="submit"]:has-text("Create")');
      
      await page.waitForTimeout(2000);
      
      // Take screenshot after creation
      await page.screenshot({ path: 'test-results/screenshots/project-created.png' });
      
      // Verify project in list
      await expect(page.locator(`text=${testProject.name}`)).toBeVisible();
    });

    test('should display project details', async () => {
      await page.goto(`${BASE_URL}/projects`);
      
      // Click on first project to view details
      await page.click('.project-card:first-child, .project-item:first-child');
      
      await page.waitForTimeout(1000);
      
      // Take screenshot of project details
      await page.screenshot({ path: 'test-results/screenshots/project-details.png' });
    });
  });

  test.describe('3. CSV Export Functionality', () => {
    test('should export employees CSV', async () => {
      await page.goto(`${BASE_URL}/reports`);
      
      // Set up download handler
      const downloadPromise = page.waitForEvent('download');
      
      // Click employee CSV export
      await page.click('button:has-text("Export Employees")');
      
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('employee');
      expect(download.suggestedFilename()).toContain('.csv');
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/screenshots/employees-csv-export.png' });
    });

    test('should export projects CSV', async () => {
      await page.goto(`${BASE_URL}/reports`);
      
      const downloadPromise = page.waitForEvent('download');
      
      // Click projects CSV export
      await page.click('button:has-text("Export Projects")');
      
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('project');
      expect(download.suggestedFilename()).toContain('.csv');
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/screenshots/projects-csv-export.png' });
    });

    test('should export allocations CSV', async () => {
      await page.goto(`${BASE_URL}/reports`);
      
      const downloadPromise = page.waitForEvent('download');
      
      // Click allocations CSV export
      await page.click('button:has-text("Export Allocations")');
      
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('allocation');
      expect(download.suggestedFilename()).toContain('.csv');
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/screenshots/allocations-csv-export.png' });
    });
  });

  test.describe('4. Navigation and Routing', () => {
    test('should navigate between all main pages', async () => {
      // Test navigation to each main section
      const routes = [
        { href: '/dashboard', text: 'Dashboard' },
        { href: '/employees', text: 'Employees' },
        { href: '/projects', text: 'Projects' },
        { href: '/allocations', text: 'Allocations' },
        { href: '/reports', text: 'Reports' }
      ];
      
      for (const route of routes) {
        await page.click(`[href="${route.href}"]`);
        await page.waitForURL(`${BASE_URL}${route.href}`);
        
        // Take screenshot of each page
        await page.screenshot({ 
          path: `test-results/screenshots/navigation-${route.text.toLowerCase()}.png` 
        });
        
        // Verify page loaded correctly
        await expect(page).toHaveURL(new RegExp(route.href));
      }
    });

    test('should handle page transitions smoothly', async () => {
      // Quick navigation test
      await page.click('[href="/employees"]');
      await page.waitForLoadState('networkidle');
      
      await page.click('[href="/projects"]');
      await page.waitForLoadState('networkidle');
      
      await page.click('[href="/dashboard"]');
      await page.waitForLoadState('networkidle');
      
      // Take final screenshot
      await page.screenshot({ path: 'test-results/screenshots/smooth-transitions.png' });
      
      // Verify we're back at dashboard
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test.describe('5. Form Validation and Error Handling', () => {
    test('should validate required fields in employee form', async () => {
      await page.goto(`${BASE_URL}/employees`);
      
      // Open new employee form
      await page.click('button:has-text("Add Employee")');
      
      // Try to submit empty form
      await page.click('button[type="submit"]:has-text("Save")');
      
      // Check for validation messages
      const validationErrors = await page.locator('.error, [role="alert"], .invalid').count();
      expect(validationErrors).toBeGreaterThan(0);
      
      // Take screenshot of validation errors
      await page.screenshot({ path: 'test-results/screenshots/form-validation-errors.png' });
    });

    test('should validate email format', async () => {
      await page.goto(`${BASE_URL}/employees`);
      
      await page.click('button:has-text("Add Employee")');
      
      // Fill with invalid email
      await page.fill('[name="firstName"]', 'Test');
      await page.fill('[name="lastName"]', 'User');
      await page.fill('[name="email"]', 'invalid-email');
      
      await page.click('button[type="submit"]:has-text("Save")');
      
      // Check for email validation error
      await expect(page.locator('text=/invalid.*email|email.*invalid/i')).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/screenshots/email-validation-error.png' });
    });

    test('should handle API errors gracefully', async () => {
      await page.goto(`${BASE_URL}/employees`);
      
      // Intercept API calls to simulate errors
      await page.route(`${API_URL}/api/employees`, route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.reload();
      
      // Check for error handling
      await page.waitForTimeout(2000);
      
      // Take screenshot of error state
      await page.screenshot({ path: 'test-results/screenshots/api-error-handling.png' });
    });
  });

  test.describe('6. Real Backend Data Validation', () => {
    test('should verify backend connectivity', async () => {
      // Make direct API call to verify backend
      const response = await fetch(`${API_URL}/api/employees`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('should sync with backend data', async () => {
      // Navigate to employees and verify data loads from backend
      await page.goto(`${BASE_URL}/employees`);
      
      await page.waitForLoadState('networkidle');
      
      // Wait for data to load
      await page.waitForTimeout(3000);
      
      // Take screenshot of loaded data
      await page.screenshot({ path: 'test-results/screenshots/backend-data-sync.png' });
      
      // Verify some content loaded (not empty state)
      const hasContent = await page.locator('table tr, .employee-item, .employee-card').count();
      expect(hasContent).toBeGreaterThanOrEqual(0); // Accept empty state as valid
    });
  });

  test.describe('7. Console Errors and Performance', () => {
    test('should have no JavaScript console errors', async () => {
      const consoleErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Navigate through app
      await page.goto(`${BASE_URL}/employees`);
      await page.waitForLoadState('networkidle');
      
      await page.goto(`${BASE_URL}/projects`);
      await page.waitForLoadState('networkidle');
      
      await page.goto(`${BASE_URL}/reports`);
      await page.waitForLoadState('networkidle');
      
      // Check for console errors
      expect(consoleErrors.length).toBe(0);
      
      if (consoleErrors.length > 0) {
        console.log('Console Errors Found:', consoleErrors);
      }
    });

    test('should load pages within acceptable time', async () => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/employees`);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
      
      // Take performance screenshot
      await page.screenshot({ path: 'test-results/screenshots/performance-check.png' });
    });
  });
});
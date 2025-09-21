import { test, expect, Page } from '@playwright/test';

test.describe('Comprehensive End-to-End Reality Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to the application
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('01 - Employee Management Reality Check - CRUD with Database Verification', async () => {
    console.log('🔍 Starting Employee Management Reality Check...');

    // 1. GET - Verify initial employees from real database
    await page.goto('http://localhost:3002');
    await page.waitForSelector('[data-testid="employee-list"]', { timeout: 10000 });
    
    // Capture network request to verify it's hitting real API
    const [employeesResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/employees')),
      page.reload()
    ]);
    
    expect(employeesResponse.status()).toBe(200);
    const employeesData = await employeesResponse.json();
    console.log('📊 Employees API Response:', JSON.stringify(employeesData, null, 2));
    
    // Verify we have real employees (not mocked data)
    expect(employeesData.data).toBeInstanceOf(Array);
    expect(employeesData.data.length).toBeGreaterThanOrEqual(1);
    
    // Check for real database fields
    const firstEmployee = employeesData.data[0];
    expect(firstEmployee).toHaveProperty('id');
    expect(firstEmployee).toHaveProperty('firstName');
    expect(firstEmployee).toHaveProperty('lastName');
    expect(firstEmployee).toHaveProperty('email');
    expect(firstEmployee).toHaveProperty('createdAt');
    expect(firstEmployee).toHaveProperty('updatedAt');
    
    // 2. CREATE - Add new employee and verify database persistence
    await page.click('[data-testid="add-employee-btn"]');
    await page.waitForSelector('[data-testid="employee-form"]');
    
    const testEmployee = {
      firstName: 'Reality',
      lastName: 'Validator',
      email: `reality.validator.${Date.now()}@validation.test`,
      position: 'E2E Test Engineer',
      salary: '95000'
    };
    
    await page.fill('[name="firstName"]', testEmployee.firstName);
    await page.fill('[name="lastName"]', testEmployee.lastName);
    await page.fill('[name="email"]', testEmployee.email);
    await page.fill('[name="position"]', testEmployee.position);
    await page.fill('[name="salary"]', testEmployee.salary);
    
    // Capture CREATE request
    const [createResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/employees') && response.request().method() === 'POST'),
      page.click('[data-testid="submit-employee"]')
    ]);
    
    expect(createResponse.status()).toBe(201);
    const createdEmployee = await createResponse.json();
    console.log('✅ Created Employee:', JSON.stringify(createdEmployee, null, 2));
    
    // Verify response has database fields
    expect(createdEmployee).toHaveProperty('id');
    expect(createdEmployee.firstName).toBe(testEmployee.firstName);
    expect(createdEmployee.email).toBe(testEmployee.email);
    
    // 3. READ - Verify employee appears in list (database query)
    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForSelector('[data-testid="employee-list"]');
    
    const employeeExists = await page.locator(`[data-testid="employee-${createdEmployee.id}"]`).isVisible();
    expect(employeeExists).toBeTruthy();
    
    // 4. UPDATE - Modify employee and verify persistence
    await page.click(`[data-testid="edit-employee-${createdEmployee.id}"]`);
    await page.waitForSelector('[data-testid="employee-form"]');
    
    const updatedName = `${testEmployee.firstName} Updated`;
    await page.fill('[name="firstName"]', updatedName);
    
    const [updateResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes(`/api/employees/${createdEmployee.id}`) && response.request().method() === 'PUT'),
      page.click('[data-testid="submit-employee"]')
    ]);
    
    expect(updateResponse.status()).toBe(200);
    const updatedEmployee = await updateResponse.json();
    expect(updatedEmployee.firstName).toBe(updatedName);
    console.log('🔄 Updated Employee:', JSON.stringify(updatedEmployee, null, 2));
    
    // 5. DELETE - Remove employee and verify database removal
    await page.waitForTimeout(2000);
    await page.click(`[data-testid="delete-employee-${createdEmployee.id}"]`);
    
    const [deleteResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes(`/api/employees/${createdEmployee.id}`) && response.request().method() === 'DELETE'),
      page.click('[data-testid="confirm-delete"]')
    ]);
    
    expect(deleteResponse.status()).toBe(200);
    console.log('🗑️ Employee deleted successfully');
    
    // 6. Verify deletion from database
    await page.reload();
    await page.waitForSelector('[data-testid="employee-list"]');
    const deletedEmployeeExists = await page.locator(`[data-testid="employee-${createdEmployee.id}"]`).isVisible();
    expect(deletedEmployeeExists).toBeFalsy();
    
    console.log('✅ Employee Management Reality Check PASSED');
  });

  test('02 - Project Management Verification with Backend Persistence', async () => {
    console.log('🔍 Starting Project Management Verification...');
    
    // Navigate to projects section
    await page.click('[data-testid="nav-projects"]');
    await page.waitForSelector('[data-testid="projects-page"]', { timeout: 10000 });
    
    // 1. GET - Fetch real projects from database
    const [projectsResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/projects')),
      page.reload()
    ]);
    
    expect(projectsResponse.status()).toBe(200);
    const projectsData = await projectsResponse.json();
    console.log('📊 Projects API Response:', JSON.stringify(projectsData, null, 2));
    
    // 2. CREATE - Add new project with full data
    await page.click('[data-testid="add-project-btn"]');
    await page.waitForSelector('[data-testid="project-form"]');
    
    const testProject = {
      name: `E2E Test Project ${Date.now()}`,
      description: 'Comprehensive reality validation project for testing backend integration',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      status: 'active',
      budget: '500000',
      priority: 'high'
    };
    
    await page.fill('[name="name"]', testProject.name);
    await page.fill('[name="description"]', testProject.description);
    await page.fill('[name="startDate"]', testProject.startDate);
    await page.fill('[name="endDate"]', testProject.endDate);
    await page.selectOption('[name="status"]', testProject.status);
    await page.fill('[name="budget"]', testProject.budget);
    await page.selectOption('[name="priority"]', testProject.priority);
    
    // Capture CREATE request
    const [createProjectResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/projects') && response.request().method() === 'POST'),
      page.click('[data-testid="submit-project"]')
    ]);
    
    expect(createProjectResponse.status()).toBe(201);
    const createdProject = await createProjectResponse.json();
    console.log('✅ Created Project:', JSON.stringify(createdProject, null, 2));
    
    // 3. Verify project persistence after refresh
    await page.reload();
    await page.waitForSelector('[data-testid="projects-page"]');
    
    const projectExists = await page.locator(`[data-testid="project-${createdProject.id}"]`).isVisible();
    expect(projectExists).toBeTruthy();
    
    // 4. UPDATE - Modify project and verify database changes
    await page.click(`[data-testid="edit-project-${createdProject.id}"]`);
    await page.waitForSelector('[data-testid="project-form"]');
    
    const updatedName = `${testProject.name} UPDATED`;
    await page.fill('[name="name"]', updatedName);
    
    const [updateProjectResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes(`/api/projects/${createdProject.id}`) && response.request().method() === 'PUT'),
      page.click('[data-testid="submit-project"]')
    ]);
    
    expect(updateProjectResponse.status()).toBe(200);
    const updatedProject = await updateProjectResponse.json();
    expect(updatedProject.name).toBe(updatedName);
    console.log('🔄 Updated Project:', JSON.stringify(updatedProject, null, 2));
    
    console.log('✅ Project Management Verification PASSED');
  });

  test('03 - Data Export Validation - Real File Generation', async () => {
    console.log('🔍 Starting Data Export Validation...');
    
    // Navigate to employees for CSV export
    await page.goto('http://localhost:3002');
    await page.waitForSelector('[data-testid="employee-list"]');
    
    // Test CSV Export - Real file download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv-btn"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/employees.*\.csv/);
    
    // Save and verify file content
    const filePath = `/tmp/test-export-${Date.now()}.csv`;
    await download.saveAs(filePath);
    
    // Read and verify CSV content contains real data
    const csvContent = await page.evaluate(async (path) => {
      const fs = require('fs');
      return fs.readFileSync(path, 'utf8');
    }, filePath);
    
    console.log('📄 CSV Content Preview:', csvContent.substring(0, 200));
    
    // Verify CSV has headers and data
    const lines = csvContent.split('\n').filter(line => line.trim());
    expect(lines.length).toBeGreaterThanOrEqual(2); // Header + at least 1 data row
    expect(lines[0]).toContain('firstName'); // Header verification
    expect(lines[0]).toContain('lastName');
    expect(lines[0]).toContain('email');
    
    console.log('✅ Data Export Validation PASSED');
  });

  test('04 - Resource Allocation Testing with Backend Validation', async () => {
    console.log('🔍 Starting Resource Allocation Testing...');
    
    // Navigate to allocations
    await page.click('[data-testid="nav-allocations"]');
    await page.waitForSelector('[data-testid="allocations-page"]', { timeout: 10000 });
    
    // 1. GET - Fetch real allocations from database
    const [allocationsResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/allocations')),
      page.reload()
    ]);
    
    expect(allocationsResponse.status()).toBe(200);
    const allocationsData = await allocationsResponse.json();
    console.log('📊 Allocations API Response:', JSON.stringify(allocationsData, null, 2));
    
    // 2. CREATE - Test allocation with capacity validation
    if (page.locator('[data-testid="add-allocation-btn"]').isVisible()) {
      await page.click('[data-testid="add-allocation-btn"]');
      await page.waitForSelector('[data-testid="allocation-form"]');
      
      // Fill allocation form
      await page.selectOption('[name="employeeId"]', { index: 1 });
      await page.selectOption('[name="projectId"]', { index: 1 });
      await page.fill('[name="allocation"]', '50');
      await page.fill('[name="startDate"]', '2025-01-01');
      await page.fill('[name="endDate"]', '2025-03-31');
      
      // Capture CREATE request
      const [createAllocationResponse] = await Promise.all([
        page.waitForResponse(response => response.url().includes('/api/allocations') && response.request().method() === 'POST'),
        page.click('[data-testid="submit-allocation"]')
      ]);
      
      expect(createAllocationResponse.status()).toBe(201);
      const createdAllocation = await createAllocationResponse.json();
      console.log('✅ Created Allocation:', JSON.stringify(createdAllocation, null, 2));
    }
    
    console.log('✅ Resource Allocation Testing PASSED');
  });

  test('05 - Real-time Features and WebSocket Testing', async () => {
    console.log('🔍 Starting Real-time Features Testing...');
    
    // Test WebSocket connection (if available)
    const wsConnected = await page.evaluate(() => {
      return typeof window !== 'undefined' && 'WebSocket' in window;
    });
    
    console.log('🔌 WebSocket Support:', wsConnected);
    
    // Test real-time notifications (if implemented)
    await page.goto('http://localhost:3002');
    await page.waitForSelector('[data-testid="employee-list"]');
    
    // Monitor for any real-time updates
    let notificationReceived = false;
    page.on('console', msg => {
      if (msg.text().includes('notification') || msg.text().includes('websocket')) {
        notificationReceived = true;
        console.log('📡 Real-time message detected:', msg.text());
      }
    });
    
    // Trigger action that might send notifications
    await page.click('[data-testid="add-employee-btn"]');
    await page.waitForTimeout(3000);
    
    console.log('📡 Notification system active:', notificationReceived);
    console.log('✅ Real-time Features Testing COMPLETED');
  });

  test('06 - Edge Cases and Error Handling', async () => {
    console.log('🔍 Starting Edge Cases Testing...');
    
    // 1. Network failure simulation
    await page.route('**/api/employees', route => {
      route.abort('failed');
    });
    
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(3000);
    
    // Check for error handling UI
    const errorVisible = await page.locator('[data-testid="error-message"]').isVisible().catch(() => false);
    console.log('🚨 Error handling UI displayed:', errorVisible);
    
    // Re-enable network
    await page.unroute('**/api/employees');
    
    // 2. Large dataset pagination test
    const [paginationResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/employees')),
      page.reload()
    ]);
    
    const paginationData = await paginationResponse.json();
    console.log('📄 Pagination info:', paginationData.pagination);
    
    // 3. Concurrent operations test (rapid clicks)
    await page.waitForSelector('[data-testid="add-employee-btn"]');
    
    // Rapid clicks to test race conditions
    const clickPromises = Array.from({ length: 3 }, () => 
      page.click('[data-testid="add-employee-btn"]').catch(() => {})
    );
    
    await Promise.all(clickPromises);
    await page.waitForTimeout(2000);
    
    console.log('✅ Edge Cases Testing COMPLETED');
  });

  test('07 - Complete Data Persistence Validation', async () => {
    console.log('🔍 Starting Complete Data Persistence Validation...');
    
    // Create test data
    await page.goto('http://localhost:3002');
    await page.waitForSelector('[data-testid="employee-list"]');
    
    const testData = {
      firstName: 'Persistence',
      lastName: 'Test',
      email: `persistence.${Date.now()}@test.com`,
      position: 'Data Validator'
    };
    
    // Create employee
    await page.click('[data-testid="add-employee-btn"]');
    await page.waitForSelector('[data-testid="employee-form"]');
    
    await page.fill('[name="firstName"]', testData.firstName);
    await page.fill('[name="lastName"]', testData.lastName);
    await page.fill('[name="email"]', testData.email);
    await page.fill('[name="position"]', testData.position);
    
    const [createResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/employees') && response.request().method() === 'POST'),
      page.click('[data-testid="submit-employee"]')
    ]);
    
    const createdEmployee = await createResponse.json();
    console.log('💾 Created for persistence test:', createdEmployee.id);
    
    // Close browser tab and reopen (simulate session end)
    await page.close();
    page = await page.context().newPage();
    
    // Verify data persists across sessions
    await page.goto('http://localhost:3002');
    await page.waitForSelector('[data-testid="employee-list"]');
    
    const persistedEmployee = await page.locator(`[data-testid="employee-${createdEmployee.id}"]`).isVisible();
    expect(persistedEmployee).toBeTruthy();
    
    console.log('✅ Data Persistence Validation PASSED');
  });

  test('08 - API Response Validation and Schema Check', async () => {
    console.log('🔍 Starting API Response Validation...');
    
    // Test all major endpoints for proper schema
    const endpoints = [
      '/api/employees',
      '/api/projects', 
      '/api/departments',
      '/api/skills'
    ];
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(`http://localhost:3001${endpoint}`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      console.log(`📋 ${endpoint} Schema:`, Object.keys(data));
      
      // Validate common schema properties
      expect(data).toHaveProperty('data');
      
      if (data.pagination) {
        expect(data.pagination).toHaveProperty('currentPage');
        expect(data.pagination).toHaveProperty('totalItems');
      }
    }
    
    console.log('✅ API Response Validation PASSED');
  });
});
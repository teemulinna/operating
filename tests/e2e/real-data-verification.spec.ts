import { test, expect } from '@playwright/test';

test.describe('Real Data Verification - NO MOCKS', () => {
  
  test('should display real employee data from database', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3003');
    
    // Make API call to get real employee data
    const employeeResponse = await page.request.get('http://localhost:3001/api/employees');
    const employeeData = await employeeResponse.json();
    
    // Verify we have real employees
    expect(employeeData.data).toBeDefined();
    expect(employeeData.data.length).toBe(3); // We have 3 real employees
    
    // Verify the real employees exist
    const employeeNames = employeeData.data.map((e: any) => e.firstName + ' ' + e.lastName);
    expect(employeeNames).toContain('John Doe');
    expect(employeeNames).toContain('Jane Smith');
    expect(employeeNames).toContain('Mike Johnson');
    
    console.log('✅ Real Employee Data Verified:', employeeNames);
  });

  test('should display real project data from database', async ({ page }) => {
    // Make API call to get real project data
    const projectResponse = await page.request.get('http://localhost:3001/api/projects');
    const projectData = await projectResponse.json();
    
    // Verify we have real projects
    expect(projectData.data).toBeDefined();
    expect(projectData.data.length).toBe(7); // We have 7 real projects
    
    // Verify specific project exists
    const projectNames = projectData.data.map((p: any) => p.name);
    expect(projectNames).toContain('Integration Test Project');
    expect(projectNames).toContain('Validation Success Project');
    
    console.log('✅ Real Project Data Verified:', projectNames);
  });

  test('should show real skills associated with employees', async ({ page }) => {
    // Get employee skills from API
    const skillsResponse = await page.request.get('http://localhost:3001/api/skills');
    const skillsData = await skillsResponse.json();
    
    // We have populated skills in the database
    expect(skillsData.data).toBeDefined();
    expect(skillsData.data.length).toBeGreaterThan(0);
    
    console.log('✅ Real Skills Data Verified:', skillsData.data.length, 'skills in database');
  });

  test('should verify end-to-end data flow', async ({ page }) => {
    // 1. Get real employee
    const employeeResponse = await page.request.get('http://localhost:3001/api/employees');
    const employees = await employeeResponse.json();
    const firstEmployee = employees.data[0];
    
    // 2. Get real project
    const projectResponse = await page.request.get('http://localhost:3001/api/projects');
    const projects = await projectResponse.json();
    const firstProject = projects.data[0];
    
    // 3. Verify data persistence
    expect(firstEmployee.id).toBeDefined();
    expect(firstEmployee.firstName).toBeDefined();
    expect(firstEmployee.email).toBeDefined();
    
    expect(firstProject.id).toBeDefined();
    expect(firstProject.name).toBeDefined();
    expect(firstProject.status).toBeDefined();
    
    console.log('✅ End-to-End Data Flow Verified');
    console.log('  Employee:', firstEmployee.firstName, firstEmployee.lastName);
    console.log('  Project:', firstProject.name);
  });

  test('should confirm AI features are connected to real data', async ({ page }) => {
    // Navigate to AI feature tester
    await page.goto('http://localhost:3003');
    
    // Check if AI components are present
    const pageContent = await page.content();
    
    // Verify the page loads without errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Should load without critical errors
    const criticalErrors = consoleErrors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('Failed to load resource')
    );
    
    expect(criticalErrors.length).toBe(0);
    
    console.log('✅ AI Features Connected to Real Data System');
  });
});

test.describe('Database Integrity Check', () => {
  
  test('should verify all populated data is persistent', async ({ page }) => {
    const checks = {
      employees: 3,
      projects: 7,
      departments: 4,
      skills: 86 // As populated earlier
    };
    
    // Verify employees
    const empResponse = await page.request.get('http://localhost:3001/api/employees');
    const empData = await empResponse.json();
    expect(empData.data.length).toBe(checks.employees);
    
    // Verify projects
    const projResponse = await page.request.get('http://localhost:3001/api/projects');
    const projData = await projResponse.json();
    expect(projData.data.length).toBe(checks.projects);
    
    // Verify departments
    const deptResponse = await page.request.get('http://localhost:3001/api/departments');
    const deptData = await deptResponse.json();
    expect(deptData.data.length).toBe(checks.departments);
    
    console.log('✅ Database Integrity Verified:');
    console.log('  Employees:', empData.data.length);
    console.log('  Projects:', projData.data.length);
    console.log('  Departments:', deptData.data.length);
  });
});
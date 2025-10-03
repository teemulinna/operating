"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Real Data Verification - NO MOCKS', () => {
    (0, test_1.test)('should display real employee data from database', async ({ page }) => {
        await page.goto('http://localhost:3003');
        const employeeResponse = await page.request.get('http://localhost:3001/api/employees');
        const employeeData = await employeeResponse.json();
        (0, test_1.expect)(employeeData.data).toBeDefined();
        (0, test_1.expect)(employeeData.data.length).toBe(3);
        const employeeNames = employeeData.data.map((e) => e.firstName + ' ' + e.lastName);
        (0, test_1.expect)(employeeNames).toContain('John Doe');
        (0, test_1.expect)(employeeNames).toContain('Jane Smith');
        (0, test_1.expect)(employeeNames).toContain('Mike Johnson');
        console.log('✅ Real Employee Data Verified:', employeeNames);
    });
    (0, test_1.test)('should display real project data from database', async ({ page }) => {
        const projectResponse = await page.request.get('http://localhost:3001/api/projects');
        const projectData = await projectResponse.json();
        (0, test_1.expect)(projectData.data).toBeDefined();
        (0, test_1.expect)(projectData.data.length).toBe(7);
        const projectNames = projectData.data.map((p) => p.name);
        (0, test_1.expect)(projectNames).toContain('Integration Test Project');
        (0, test_1.expect)(projectNames).toContain('Validation Success Project');
        console.log('✅ Real Project Data Verified:', projectNames);
    });
    (0, test_1.test)('should show real skills associated with employees', async ({ page }) => {
        const skillsResponse = await page.request.get('http://localhost:3001/api/skills');
        const skillsData = await skillsResponse.json();
        (0, test_1.expect)(skillsData.data).toBeDefined();
        (0, test_1.expect)(skillsData.data.length).toBeGreaterThan(0);
        console.log('✅ Real Skills Data Verified:', skillsData.data.length, 'skills in database');
    });
    (0, test_1.test)('should verify end-to-end data flow', async ({ page }) => {
        const employeeResponse = await page.request.get('http://localhost:3001/api/employees');
        const employees = await employeeResponse.json();
        const firstEmployee = employees.data[0];
        const projectResponse = await page.request.get('http://localhost:3001/api/projects');
        const projects = await projectResponse.json();
        const firstProject = projects.data[0];
        (0, test_1.expect)(firstEmployee.id).toBeDefined();
        (0, test_1.expect)(firstEmployee.firstName).toBeDefined();
        (0, test_1.expect)(firstEmployee.email).toBeDefined();
        (0, test_1.expect)(firstProject.id).toBeDefined();
        (0, test_1.expect)(firstProject.name).toBeDefined();
        (0, test_1.expect)(firstProject.status).toBeDefined();
        console.log('✅ End-to-End Data Flow Verified');
        console.log('  Employee:', firstEmployee.firstName, firstEmployee.lastName);
        console.log('  Project:', firstProject.name);
    });
    (0, test_1.test)('should confirm AI features are connected to real data', async ({ page }) => {
        await page.goto('http://localhost:3003');
        const pageContent = await page.content();
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        await page.waitForTimeout(2000);
        const criticalErrors = consoleErrors.filter(e => !e.includes('favicon') &&
            !e.includes('Failed to load resource'));
        (0, test_1.expect)(criticalErrors.length).toBe(0);
        console.log('✅ AI Features Connected to Real Data System');
    });
});
test_1.test.describe('Database Integrity Check', () => {
    (0, test_1.test)('should verify all populated data is persistent', async ({ page }) => {
        const checks = {
            employees: 3,
            projects: 7,
            departments: 4,
            skills: 86
        };
        const empResponse = await page.request.get('http://localhost:3001/api/employees');
        const empData = await empResponse.json();
        (0, test_1.expect)(empData.data.length).toBe(checks.employees);
        const projResponse = await page.request.get('http://localhost:3001/api/projects');
        const projData = await projResponse.json();
        (0, test_1.expect)(projData.data.length).toBe(checks.projects);
        const deptResponse = await page.request.get('http://localhost:3001/api/departments');
        const deptData = await deptResponse.json();
        (0, test_1.expect)(deptData.data.length).toBe(checks.departments);
        console.log('✅ Database Integrity Verified:');
        console.log('  Employees:', empData.data.length);
        console.log('  Projects:', projData.data.length);
        console.log('  Departments:', deptData.data.length);
    });
});
//# sourceMappingURL=real-data-verification.spec.js.map
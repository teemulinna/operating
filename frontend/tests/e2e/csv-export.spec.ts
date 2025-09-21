import { test, expect } from '@playwright/test';
import { TestDataFactory, TestDatabaseUtils } from '../fixtures/testDataFactory';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = 'http://localhost:3001';

test.describe('CSV Export Functionality', () => {
  const downloadsPath = path.join(process.cwd(), 'test-downloads');
  
  test.beforeAll(async () => {
    // Create downloads directory if it doesn't exist
    if (!fs.existsSync(downloadsPath)) {
      fs.mkdirSync(downloadsPath, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Configure download directory
    await page.context().setDefaultTimeout(30000);
    
    // Wait for API to be available
    await TestDatabaseUtils.waitForAPI(API_BASE_URL);
    
    // Clean database before each test
    await TestDatabaseUtils.cleanDatabase(API_BASE_URL);
    
    // Create test data
    const testData = TestDataFactory.createCSVTestData();
    
    // Seed database with test data
    for (const employee of testData.employees) {
      await fetch(`${API_BASE_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee)
      });
    }
    
    for (const project of testData.projects) {
      await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
    }
  });

  test.afterEach(async () => {
    // Clean up downloads directory
    if (fs.existsSync(downloadsPath)) {
      const files = fs.readdirSync(downloadsPath);
      files.forEach(file => {
        fs.unlinkSync(path.join(downloadsPath, file));
      });
    }
    
    // Clean up database
    await TestDatabaseUtils.cleanDatabase(API_BASE_URL);
  });

  test('should export employees to CSV from employees page', async ({ page }) => {
    // Navigate to employees page
    await page.goto('/employees');
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
    
    // Wait for employees to load
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
    
    // Set up download handler
    const downloadPromise = page.waitForDownload();
    
    // Click export button
    await page.getByTestId('export-employees-button').click();
    
    // Wait for download to complete
    const download = await downloadPromise;
    
    // Save the file
    const filePath = path.join(downloadsPath, 'employees-export.csv');
    await download.saveAs(filePath);
    
    // Verify file was downloaded
    expect(fs.existsSync(filePath)).toBeTruthy();
    
    // Read and verify CSV content
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Check header
    expect(lines[0]).toContain('First Name');
    expect(lines[0]).toContain('Last Name');
    expect(lines[0]).toContain('Email');
    expect(lines[0]).toContain('Position');
    expect(lines[0]).toContain('Department');
    
    // Check data rows
    expect(lines.length).toBeGreaterThan(1); // Header + data rows
    expect(csvContent).toContain('John,Doe');
    expect(csvContent).toContain('jane.smith@test.com');
    expect(csvContent).toContain('Software Engineer');
    expect(csvContent).toContain('Product Manager');
  });

  test('should export projects to CSV from projects page', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');
    await expect(page.getByTestId('projects-page')).toBeVisible({ timeout: 10000 });
    
    // Wait for projects to load
    await expect(page.getByText('CSV Test Project')).toBeVisible();
    
    // Set up download handler
    const downloadPromise = page.waitForDownload();
    
    // Click export button
    await page.getByTestId('export-projects-button').click();
    
    // Wait for download to complete
    const download = await downloadPromise;
    
    // Save the file
    const filePath = path.join(downloadsPath, 'projects-export.csv');
    await download.saveAs(filePath);
    
    // Verify file was downloaded
    expect(fs.existsSync(filePath)).toBeTruthy();
    
    // Read and verify CSV content
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Check header
    expect(lines[0]).toContain('Name');
    expect(lines[0]).toContain('Description');
    expect(lines[0]).toContain('Client');
    expect(lines[0]).toContain('Status');
    expect(lines[0]).toContain('Priority');
    expect(lines[0]).toContain('Start Date');
    expect(lines[0]).toContain('Budget');
    
    // Check data
    expect(csvContent).toContain('CSV Test Project');
    expect(csvContent).toContain('Test Client Inc');
    expect(csvContent).toContain('active');
    expect(csvContent).toContain('high');
    expect(csvContent).toContain('100000');
  });

  test('should export allocations to CSV from allocations page', async ({ page }) => {
    // First create some allocations
    const employeesResponse = await fetch(`${API_BASE_URL}/api/employees`);
    const employeesData = await employeesResponse.json();
    const employees = employeesData.data || [];
    
    const projectsResponse = await fetch(`${API_BASE_URL}/api/projects`);
    const projectsData = await projectsResponse.json();
    const projects = projectsData.data || [];
    
    if (employees.length > 0 && projects.length > 0) {
      const allocation = TestDataFactory.createAllocation(employees[0].id, projects[0].id, {
        hoursPerWeek: 25
      });
      
      await fetch(`${API_BASE_URL}/api/allocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocation)
      });
    }
    
    // Navigate to allocations page
    await page.goto('/allocations');
    await expect(page.getByTestId('allocations-page')).toBeVisible({ timeout: 10000 });
    
    // Wait for allocations to load (if any exist)
    await page.waitForTimeout(2000);
    
    // Set up download handler
    const downloadPromise = page.waitForDownload();
    
    // Click export button
    await page.getByTestId('export-allocations-button').click();
    
    // Wait for download to complete
    const download = await downloadPromise;
    
    // Save the file
    const filePath = path.join(downloadsPath, 'allocations-export.csv');
    await download.saveAs(filePath);
    
    // Verify file was downloaded
    expect(fs.existsSync(filePath)).toBeTruthy();
    
    // Read and verify CSV content
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Check header
    expect(lines[0]).toContain('Employee');
    expect(lines[0]).toContain('Project');
    expect(lines[0]).toContain('Hours Per Week');
    expect(lines[0]).toContain('Start Date');
    expect(lines[0]).toContain('End Date');
    
    // If we have allocations, check data
    if (lines.length > 1) {
      expect(csvContent).toContain('25');
    }
  });

  test('should handle CSV export with special characters', async ({ page }) => {
    // Create employee with special characters
    const specialEmployee = TestDataFactory.createEmployee({
      firstName: 'José',
      lastName: 'O\'Connor',
      email: 'jose.oconnor@test.com',
      position: 'Senior Developer, Team Lead'
    });
    
    await fetch(`${API_BASE_URL}/api/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(specialEmployee)
    });
    
    // Navigate to employees page
    await page.goto('/employees');
    await expect(page.getByText('José O\'Connor')).toBeVisible({ timeout: 10000 });
    
    // Export to CSV
    const downloadPromise = page.waitForDownload();
    await page.getByTestId('export-employees-button').click();
    const download = await downloadPromise;
    
    // Save and verify
    const filePath = path.join(downloadsPath, 'special-chars-export.csv');
    await download.saveAs(filePath);
    
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    
    // Verify special characters are properly escaped
    expect(csvContent).toContain('José');
    expect(csvContent).toContain('O\'Connor');
    expect(csvContent).toContain('Senior Developer, Team Lead');
  });

  test('should export empty data gracefully', async ({ page }) => {
    // Clean all data
    await TestDatabaseUtils.cleanDatabase(API_BASE_URL);
    
    // Navigate to employees page (should be empty)
    await page.goto('/employees');
    await expect(page.getByTestId('employees-page')).toBeVisible();
    
    // Try to export empty data
    const downloadPromise = page.waitForDownload();
    await page.getByTestId('export-employees-button').click();
    const download = await downloadPromise;
    
    // Save and verify
    const filePath = path.join(downloadsPath, 'empty-export.csv');
    await download.saveAs(filePath);
    
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Should still have headers
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines[0]).toContain('First Name');
  });

  test('should handle export errors gracefully', async ({ page }) => {
    // Navigate to employees page
    await page.goto('/employees');
    await expect(page.getByTestId('employees-page')).toBeVisible();
    
    // Mock a server error by intercepting the export request
    await page.route('**/api/export/employees', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Export failed' })
      });
    });
    
    // Try to export
    await page.getByTestId('export-employees-button').click();
    
    // Check for error message
    await expect(page.getByTestId('export-error')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Export failed/i)).toBeVisible();
  });

  test('should validate CSV file structure', async ({ page }) => {
    // Navigate to employees page
    await page.goto('/employees');
    await expect(page.getByText('John Doe')).toBeVisible();
    
    // Export CSV
    const downloadPromise = page.waitForDownload();
    await page.getByTestId('export-employees-button').click();
    const download = await downloadPromise;
    
    // Save and verify structure
    const filePath = path.join(downloadsPath, 'structure-test.csv');
    await download.saveAs(filePath);
    
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Verify CSV structure
    expect(lines.length).toBeGreaterThan(1); // Header + data
    
    // All data rows should have the same number of columns as header
    const headerColumns = lines[0].split(',').length;
    for (let i = 1; i < lines.length; i++) {
      const dataColumns = lines[i].split(',').length;
      expect(dataColumns).toBe(headerColumns);
    }
    
    // Should be properly quoted
    expect(csvContent).toMatch(/"[^"]*"/); // Contains quoted fields
  });
});
import { Page, expect } from '@playwright/test';
import { Pool } from 'pg';

// Database helper functions
export class DatabaseHelper {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      user: process.env.TEST_DB_USER || 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      database: process.env.TEST_DB_NAME || 'employee_management_test',
      password: process.env.TEST_DB_PASSWORD || 'password',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
    });
  }

  async createEmployee(employeeData: any) {
    const query = `
      INSERT INTO employees (first_name, last_name, email, phone_number, position, department, salary, hire_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      employeeData.firstName,
      employeeData.lastName,
      employeeData.email,
      employeeData.phoneNumber,
      employeeData.position,
      employeeData.department,
      employeeData.salary,
      employeeData.hireDate,
      employeeData.status
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async deleteEmployee(id: string) {
    await this.pool.query('DELETE FROM employees WHERE id = $1', [id]);
  }

  async deleteEmployeesByEmail(emailPattern: string) {
    await this.pool.query('DELETE FROM employees WHERE email LIKE $1', [emailPattern]);
  }

  async getEmployeeByEmail(email: string) {
    const result = await this.pool.query('SELECT * FROM employees WHERE email = $1', [email]);
    return result.rows[0];
  }

  async getEmployeeCount() {
    const result = await this.pool.query('SELECT COUNT(*) FROM employees');
    return parseInt(result.rows[0].count);
  }

  async cleanup() {
    // Clean up test data
    await this.pool.query("DELETE FROM employees WHERE email LIKE '%test%' OR email LIKE '%e2e%'");
  }

  async close() {
    await this.pool.end();
  }
}

// Page Object Model helpers
export class EmployeeFormPage {
  constructor(private page: Page) {}

  async fillForm(employeeData: any) {
    await this.page.fill('[data-testid="first-name-input"]', employeeData.firstName);
    await this.page.fill('[data-testid="last-name-input"]', employeeData.lastName);
    await this.page.fill('[data-testid="email-input"]', employeeData.email);
    await this.page.fill('[data-testid="phone-input"]', employeeData.phoneNumber);
    await this.page.fill('[data-testid="position-input"]', employeeData.position);
    
    if (employeeData.department) {
      await this.page.click('[data-testid="department-select"]');
      await this.page.click(`[data-testid="department-option-${employeeData.department.toLowerCase()}"]`);
    }
    
    await this.page.fill('[data-testid="salary-input"]', employeeData.salary.toString());
    await this.page.fill('[data-testid="hire-date-input"]', employeeData.hireDate);
    
    if (employeeData.status) {
      await this.page.click('[data-testid="status-select"]');
      await this.page.click(`[data-testid="status-option-${employeeData.status.toLowerCase()}"]`);
    }
  }

  async submit() {
    await this.page.click('[data-testid="submit-employee-form"]');
  }

  async expectValidationError(field: string, message: string) {
    await expect(this.page.locator(`[data-testid="${field}-error"]`)).toBeVisible();
    await expect(this.page.locator(`[data-testid="${field}-error"]`)).toContainText(message);
  }

  async expectFormVisible() {
    await expect(this.page.locator('[data-testid="employee-form"]')).toBeVisible();
  }
}

export class EmployeeListPage {
  constructor(private page: Page) {}

  async search(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.waitForTimeout(500); // Wait for debounce
  }

  async filterByDepartment(department: string) {
    await this.page.click('[data-testid="department-filter"]');
    await this.page.click(`[data-testid="filter-${department.toLowerCase()}"]`);
    await this.page.waitForTimeout(500);
  }

  async getEmployeeRowByEmail(email: string) {
    return this.page.locator(`[data-testid="employee-row"]`).filter({ hasText: email });
  }

  async expectEmployeeVisible(name: string) {
    await expect(this.page.locator('[data-testid="employee-row"]').filter({ hasText: name })).toBeVisible();
  }

  async expectEmployeeNotVisible(name: string) {
    await expect(this.page.locator('[data-testid="employee-row"]').filter({ hasText: name })).not.toBeVisible();
  }

  async getEmployeeCount() {
    return await this.page.locator('[data-testid="employee-row"]').count();
  }

  async openAddEmployeeForm() {
    await this.page.click('[data-testid="add-employee-button"]');
    await this.page.waitForSelector('[data-testid="employee-form"]');
  }

  async editEmployee(email: string) {
    const row = await this.getEmployeeRowByEmail(email);
    await row.locator('[data-testid="edit-employee-button"]').click();
    await this.page.waitForSelector('[data-testid="employee-form"]');
  }

  async deleteEmployee(email: string) {
    const row = await this.getEmployeeRowByEmail(email);
    await row.locator('[data-testid="delete-employee-button"]').click();
    await this.page.click('[data-testid="confirm-delete-button"]');
  }
}

// Test data generators
export class TestDataGenerator {
  static generateEmployee(overrides: any = {}) {
    const timestamp = Date.now();
    return {
      firstName: 'Test',
      lastName: 'Employee',
      email: `test.employee.${timestamp}@example.com`,
      phoneNumber: '+1-555-0000',
      position: 'Software Engineer',
      department: 'Engineering',
      salary: 75000,
      hireDate: '2023-01-01',
      status: 'active',
      ...overrides
    };
  }

  static generateEmployees(count: number, baseOverrides: any = {}) {
    return Array.from({ length: count }, (_, index) => 
      this.generateEmployee({
        firstName: `Test${index + 1}`,
        email: `test.employee.${Date.now()}.${index}@example.com`,
        ...baseOverrides
      })
    );
  }

  static generateInvalidEmployee() {
    return {
      firstName: '', // Invalid: empty
      lastName: 'User',
      email: 'invalid-email', // Invalid: not email format
      phoneNumber: 'invalid-phone', // Invalid: not phone format
      position: '',
      department: '',
      salary: -1000, // Invalid: negative
      hireDate: 'invalid-date', // Invalid: not date format
      status: 'invalid-status'
    };
  }

  static generateCSVData(employees: any[]) {
    const headers = 'firstName,lastName,email,phoneNumber,position,department,salary,hireDate,status';
    const rows = employees.map(emp => 
      `${emp.firstName},${emp.lastName},${emp.email},${emp.phoneNumber},${emp.position},${emp.department},${emp.salary},${emp.hireDate},${emp.status}`
    );
    return [headers, ...rows].join('\n');
  }
}

// API helpers
export class APIHelper {
  constructor(private baseURL: string = process.env.VITE_API_URL || 'http://localhost:3001/api') {}

  async createEmployee(employeeData: any) {
    const response = await fetch(`${this.baseURL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData)
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  }

  async getEmployee(id: string) {
    const response = await fetch(`${this.baseURL}/employees/${id}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  }

  async updateEmployee(id: string, updateData: any) {
    const response = await fetch(`${this.baseURL}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  }

  async deleteEmployee(id: string) {
    const response = await fetch(`${this.baseURL}/employees/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
  }

  async searchEmployees(query: string) {
    const response = await fetch(`${this.baseURL}/employees?search=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  }
}

// Mock helpers
export class MockHelper {
  static mockAPIResponse(page: Page, endpoint: string, response: any, status: number = 200) {
    return page.route(endpoint, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  static mockAPIError(page: Page, endpoint: string, status: number = 500, message: string = 'Server Error') {
    return page.route(endpoint, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: message })
      });
    });
  }

  static mockSlowResponse(page: Page, endpoint: string, delay: number = 5000) {
    return page.route(endpoint, async route => {
      await new Promise(resolve => setTimeout(resolve, delay));
      route.continue();
    });
  }
}

// Assertion helpers
export class AssertionHelper {
  static async expectSuccessMessage(page: Page, message?: string) {
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    if (message) {
      await expect(page.locator('[data-testid="success-message"]')).toContainText(message);
    }
  }

  static async expectErrorMessage(page: Page, message?: string) {
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    if (message) {
      await expect(page.locator('[data-testid="error-message"]')).toContainText(message);
    }
  }

  static async expectLoadingState(page: Page) {
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  }

  static async expectNoLoadingState(page: Page) {
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
  }

  static async expectModalOpen(page: Page, modalTestId: string) {
    await expect(page.locator(`[data-testid="${modalTestId}"]`)).toBeVisible();
    
    // Check that modal has focus trap
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  }

  static async expectModalClosed(page: Page, modalTestId: string) {
    await expect(page.locator(`[data-testid="${modalTestId}"]`)).not.toBeVisible();
  }
}

// Performance helpers
export class PerformanceHelper {
  static async measurePageLoad(page: Page, url: string) {
    const start = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    return Date.now() - start;
  }

  static async measureOperation(operation: () => Promise<void>) {
    const start = Date.now();
    await operation();
    return Date.now() - start;
  }

  static async getMemoryUsage(page: Page) {
    return await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
  }

  static async trackNetworkRequests(page: Page) {
    const requests: any[] = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now()
      });
    });

    return requests;
  }
}

// File helpers
export class FileHelper {
  static async createTempCSV(data: string, filename: string = 'temp.csv') {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const tempPath = path.join(__dirname, '../fixtures', filename);
    await fs.writeFile(tempPath, data);
    return tempPath;
  }

  static async readFile(filePath: string) {
    const fs = await import('fs/promises');
    return await fs.readFile(filePath, 'utf8');
  }

  static async deleteFile(filePath: string) {
    const fs = await import('fs/promises');
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore error
    }
  }
}

// Wait helpers
export class WaitHelper {
  static async waitForStableDOM(page: Page, timeout: number = 5000) {
    await page.waitForFunction(
      () => {
        const currentHTML = document.documentElement.innerHTML;
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(document.documentElement.innerHTML === currentHTML);
          }, 100);
        });
      },
      { timeout }
    );
  }

  static async waitForNoNetworkActivity(page: Page, timeout: number = 5000) {
    let requestCount = 0;
    
    const requestHandler = () => requestCount++;
    const responseHandler = () => requestCount--;
    
    page.on('request', requestHandler);
    page.on('response', responseHandler);
    
    try {
      await page.waitForFunction(
        () => requestCount === 0,
        { timeout }
      );
    } finally {
      page.off('request', requestHandler);
      page.off('response', responseHandler);
    }
  }

  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }
}
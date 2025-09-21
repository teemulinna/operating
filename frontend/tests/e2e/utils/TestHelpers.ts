import { Page, expect } from '@playwright/test';
import { EmployeePage, EmployeeData } from '../pages/EmployeePage';
import { ProjectPage, ProjectData } from '../pages/ProjectPage';
import { AllocationPage, AllocationData } from '../pages/AllocationPage';
import { TestDataFactory } from './TestDataFactory';

/**
 * Test Helper Functions - Common utilities for E2E tests
 */
export class TestHelpers {
  /**
   * Clean up test data by deleting entities created during tests
   */
  static async cleanupTestData(
    page: Page,
    entities: {
      employees?: string[];
      projects?: string[];
      allocations?: { employee: string; project: string }[];
    }
  ): Promise<void> {
    try {
      const employeePage = new EmployeePage(page);
      const projectPage = new ProjectPage(page);
      const allocationPage = new AllocationPage(page);

      // Clean up allocations first (they depend on employees and projects)
      if (entities.allocations && entities.allocations.length > 0) {
        await allocationPage.navigateToAllocations();
        for (const allocation of entities.allocations) {
          try {
            await allocationPage.deleteAllocation(allocation.employee, allocation.project);
          } catch (error) {
            console.log(`Failed to delete allocation ${allocation.employee} - ${allocation.project}:`, error);
          }
        }
      }

      // Clean up projects
      if (entities.projects && entities.projects.length > 0) {
        await projectPage.navigateToProjects();
        for (const projectName of entities.projects) {
          try {
            await projectPage.deleteProjectByName(projectName);
          } catch (error) {
            console.log(`Failed to delete project ${projectName}:`, error);
          }
        }
      }

      // Clean up employees
      if (entities.employees && entities.employees.length > 0) {
        await employeePage.navigateToEmployees();
        for (const employeeName of entities.employees) {
          try {
            await employeePage.deleteEmployeeByName(employeeName);
          } catch (error) {
            console.log(`Failed to delete employee ${employeeName}:`, error);
          }
        }
      }
    } catch (error) {
      console.log('Cleanup failed:', error);
      // Don't fail the test because of cleanup issues
    }
  }

  /**
   * Set up complete test scenario with employee, project, and allocation
   */
  static async setupCompleteScenario(page: Page, overrides: {
    employee?: Partial<EmployeeData>;
    project?: Partial<ProjectData>;
    allocation?: Partial<AllocationData>;
  } = {}): Promise<{
    employee: EmployeeData;
    project: ProjectData;
    allocation: AllocationData;
  }> {
    const employeePage = new EmployeePage(page);
    const projectPage = new ProjectPage(page);
    const allocationPage = new AllocationPage(page);

    // Create test data
    const employee = TestDataFactory.createCompleteEmployee(overrides.employee);
    const project = TestDataFactory.createCompleteProject(overrides.project);

    // Create employee
    await employeePage.navigateToEmployees();
    await employeePage.createEmployee(employee);

    // Create project
    await projectPage.navigateToProjects();
    await projectPage.createProject(project);

    // Create allocation
    const employeeName = `${employee.firstName} ${employee.lastName}`;
    const allocation = TestDataFactory.createCompleteAllocation(
      employeeName,
      project.name,
      overrides.allocation
    );

    await allocationPage.navigateToAllocations();
    await allocationPage.createAllocation(allocation);

    return { employee, project, allocation };
  }

  /**
   * Create multiple employees for testing
   */
  static async createMultipleEmployees(page: Page, count: number): Promise<EmployeeData[]> {
    const employeePage = new EmployeePage(page);
    const employees = TestDataFactory.createMultipleEmployees(count);

    await employeePage.navigateToEmployees();
    for (const employee of employees) {
      await employeePage.createEmployee(employee);
    }

    return employees;
  }

  /**
   * Create multiple projects for testing
   */
  static async createMultipleProjects(page: Page, count: number): Promise<ProjectData[]> {
    const projectPage = new ProjectPage(page);
    const projects = TestDataFactory.createMultipleProjects(count);

    await projectPage.navigateToProjects();
    for (const project of projects) {
      await projectPage.createProject(project);
    }

    return projects;
  }

  /**
   * Verify dashboard statistics are updated
   */
  static async verifyDashboardStats(
    page: Page,
    expectedMinimums: { employees?: number; projects?: number; utilization?: number } = {}
  ): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    if (expectedMinimums.employees !== undefined) {
      const employeeCount = await page.textContent('[data-testid="employees-count"]');
      const count = parseInt(employeeCount || '0');
      expect(count).toBeGreaterThanOrEqual(expectedMinimums.employees);
    }

    if (expectedMinimums.projects !== undefined) {
      const projectCount = await page.textContent('[data-testid="projects-count"]');
      const count = parseInt(projectCount || '0');
      expect(count).toBeGreaterThanOrEqual(expectedMinimums.projects);
    }

    if (expectedMinimums.utilization !== undefined) {
      const utilization = await page.textContent('[data-testid="utilization-percent"]');
      const percentage = parseInt(utilization?.replace('%', '') || '0');
      expect(percentage).toBeGreaterThanOrEqual(expectedMinimums.utilization);
    }
  }

  /**
   * Wait for all API calls to complete
   */
  static async waitForAllAPICalls(page: Page, timeout: number = 10000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
    
    // Wait for any loading indicators to disappear
    await page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll(
        '[data-testid*="loading"], .loading, .spinner, [data-loading="true"]'
      );
      return loadingElements.length === 0;
    }, { timeout: 5000 }).catch(() => {
      // Ignore timeout - some pages might not have loading indicators
    });
  }

  /**
   * Take screenshot with timestamp for debugging
   */
  static async takeDebugScreenshot(page: Page, testName: string, step: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `debug-${testName}-${step}-${timestamp}.png`;
    const path = `test-results/screenshots/${filename}`;
    
    await page.screenshot({ 
      path,
      fullPage: true 
    });
    
    return path;
  }

  /**
   * Verify page accessibility
   */
  static async verifyPageAccessibility(page: Page): Promise<void> {
    // Check for basic accessibility attributes
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    
    // Check for navigation
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    
    // Check that all interactive elements are accessible
    const interactiveElements = await page.locator('button, a, input, select, textarea').all();
    for (const element of interactiveElements) {
      // Ensure interactive elements are visible or properly hidden
      const isVisible = await element.isVisible();
      if (isVisible) {
        await expect(element).not.toBeDisabled();
      }
    }
  }

  /**
   * Measure page performance
   */
  static async measurePagePerformance(page: Page): Promise<{
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint: number;
  }> {
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
      
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: fcp ? fcp.startTime : 0
      };
    });

    return performanceMetrics;
  }

  /**
   * Generate test report data
   */
  static generateTestReport(testName: string, results: {
    passed: boolean;
    duration: number;
    steps: string[];
    screenshots?: string[];
    performance?: any;
    errors?: string[];
  }): any {
    return {
      testName,
      timestamp: new Date().toISOString(),
      status: results.passed ? 'PASSED' : 'FAILED',
      duration: `${results.duration}ms`,
      steps: results.steps,
      screenshots: results.screenshots || [],
      performance: results.performance,
      errors: results.errors || []
    };
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} failed, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  /**
   * Verify form validation errors
   */
  static async verifyFormValidation(
    page: Page,
    expectedErrors: { field: string; message: string }[]
  ): Promise<void> {
    for (const error of expectedErrors) {
      const errorElement = page.locator(
        `[data-testid="${error.field}-error"], ` +
        `input[name="${error.field}"] + .error, ` +
        `.field-error:has-text("${error.message}")`
      ).first();
      
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toContainText(error.message);
    }
  }

  /**
   * Fill form with error handling
   */
  static async fillFormSafely(
    page: Page,
    formData: { [field: string]: string },
    formSelector: string = 'form'
  ): Promise<void> {
    const form = page.locator(formSelector);
    await expect(form).toBeVisible();

    for (const [field, value] of Object.entries(formData)) {
      const input = form.locator(`input[name="${field}"], select[name="${field}"], textarea[name="${field}"]`);
      await expect(input).toBeVisible();
      await input.fill(value);
      
      // Verify the value was set (for input elements)
      if (await input.getAttribute('type') !== 'select-one') {
        const actualValue = await input.inputValue();
        expect(actualValue).toBe(value);
      }
    }
  }

  /**
   * Wait for element with custom timeout and error message
   */
  static async waitForElementWithTimeout(
    page: Page,
    selector: string,
    timeout: number = 5000,
    customErrorMessage?: string
  ): Promise<void> {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
    } catch (error) {
      const message = customErrorMessage || `Element ${selector} not found within ${timeout}ms`;
      throw new Error(message);
    }
  }

  /**
   * Verify API response times
   */
  static async monitorAPIPerformance(
    page: Page,
    expectedMaxTime: number = 5000
  ): Promise<{ url: string; duration: number }[]> {
    const apiCalls: { url: string; duration: number }[] = [];

    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        const timing = response.timing();
        if (timing) {
          const duration = timing.responseEnd - timing.requestStart;
          apiCalls.push({ url, duration });
          
          if (duration > expectedMaxTime) {
            console.warn(`Slow API call detected: ${url} took ${duration}ms`);
          }
        }
      }
    });

    return apiCalls;
  }

  /**
   * Create comprehensive test data set
   */
  static async setupComprehensiveTestData(page: Page): Promise<{
    employees: EmployeeData[];
    projects: ProjectData[];
    departments: string[];
  }> {
    const employees: EmployeeData[] = [];
    const projects: ProjectData[] = [];
    const departments = ['Engineering', 'Design', 'QA', 'Marketing'];

    // Create employees from different departments
    const departmentalEmployees = TestDataFactory.createDepartmentalEmployees();
    for (const [dept, employee] of Object.entries(departmentalEmployees)) {
      employees.push(employee);
    }

    // Create projects with different statuses
    const categorizedProjects = TestDataFactory.createCategorizedProjects();
    for (const [category, project] of Object.entries(categorizedProjects)) {
      projects.push(project);
    }

    // Create the data in the application
    const employeePage = new EmployeePage(page);
    await employeePage.navigateToEmployees();
    for (const employee of employees) {
      await employeePage.createEmployee(employee);
    }

    const projectPage = new ProjectPage(page);
    await projectPage.navigateToProjects();
    for (const project of projects) {
      await projectPage.createProject(project);
    }

    return { employees, projects, departments };
  }

  /**
   * Validate data consistency across modules
   */
  static async validateDataConsistency(
    page: Page,
    expectedData: {
      employees: string[];
      projects: string[];
      allocations: { employee: string; project: string }[];
    }
  ): Promise<void> {
    const employeePage = new EmployeePage(page);
    const projectPage = new ProjectPage(page);
    const allocationPage = new AllocationPage(page);

    // Validate employees exist
    await employeePage.navigateToEmployees();
    for (const employeeName of expectedData.employees) {
      await employeePage.verifyEmployeeExists(employeeName);
    }

    // Validate projects exist
    await projectPage.navigateToProjects();
    for (const projectName of expectedData.projects) {
      await projectPage.verifyProjectExists(projectName);
    }

    // Validate allocations exist
    await allocationPage.navigateToAllocations();
    for (const allocation of expectedData.allocations) {
      await allocationPage.verifyAllocationExists(allocation.employee, allocation.project);
    }
  }

  /**
   * Generate realistic test names
   */
  static generateRealisticTestData(): {
    employees: EmployeeData[];
    projects: ProjectData[];
  } {
    const names = TestDataFactory.getRealisticNames();
    const departmentRoles = TestDataFactory.getDepartmentRoles();
    const departmentSkills = TestDataFactory.getDepartmentSkills();
    const departments = Object.keys(departmentRoles);

    const employees: EmployeeData[] = names.map((name, index) => {
      const department = departments[index % departments.length];
      const roles = departmentRoles[department];
      const skills = departmentSkills[department];

      return {
        firstName: name.firstName,
        lastName: name.lastName,
        email: TestDataFactory.generateUniqueEmail(
          `${name.firstName.toLowerCase()}.${name.lastName.toLowerCase()}`
        ),
        department,
        role: roles[index % roles.length],
        skills: skills?.slice(0, 3) // Take first 3 skills
      };
    });

    const projectTypes = ['Web App', 'Mobile App', 'API', 'Platform', 'Tool', 'Dashboard'];
    const projects: ProjectData[] = projectTypes.map(type => {
      return TestDataFactory.createCompleteProject({
        name: TestDataFactory.generateUniqueProjectName(type),
        description: `${type} development project with comprehensive features`
      });
    });

    return { employees, projects };
  }
}
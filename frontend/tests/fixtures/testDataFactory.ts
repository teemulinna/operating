import { faker } from '@faker-js/faker';

export interface TestEmployee {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: string;
  defaultHoursPerWeek: number;
  salary: number;
}

export interface TestProject {
  id?: string;
  name: string;
  description: string;
  clientName: string;
  startDate: string;
  endDate: string;
  budget: number;
  priority: 'low' | 'medium' | 'high';
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
}

export interface TestAllocation {
  id?: string;
  employeeId: string;
  projectId: string;
  hoursPerWeek: number;
  startDate: string;
  endDate: string;
  role?: string;
}

export interface TestDepartment {
  id: string;
  name: string;
}

// Known department IDs from the frontend system
export const DEPARTMENTS: TestDepartment[] = [
  { id: '1', name: 'Engineering' },
  { id: '2', name: 'Product' },
  { id: '3', name: 'Marketing' },
  { id: '4', name: 'QA' }
];

export class TestDataFactory {
  private static employeeCounter = 1;
  private static projectCounter = 1;

  /**
   * Generate a realistic test employee
   */
  static createEmployee(overrides: Partial<TestEmployee> = {}): TestEmployee {
    const department = faker.helpers.arrayElement(DEPARTMENTS);
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    return {
      firstName,
      lastName,
      email: overrides.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test-${this.employeeCounter++}.com`,
      position: overrides.position || faker.person.jobTitle(),
      departmentId: overrides.departmentId || department.id,
      defaultHoursPerWeek: overrides.defaultHoursPerWeek || faker.number.int({ min: 20, max: 40 }),
      salary: overrides.salary || faker.number.int({ min: 40000, max: 120000 }),
      ...overrides
    };
  }

  /**
   * Generate a realistic test project
   */
  static createProject(overrides: Partial<TestProject> = {}): TestProject {
    const startDate = overrides.startDate || faker.date.future({ years: 0.5 }).toISOString().split('T')[0];
    const endDate = overrides.endDate || faker.date.future({ years: 1, refDate: startDate }).toISOString().split('T')[0];
    
    return {
      name: overrides.name || `${faker.company.catchPhrase()} Project ${this.projectCounter++}`,
      description: overrides.description || faker.lorem.paragraph(),
      clientName: overrides.clientName || faker.company.name(),
      startDate,
      endDate,
      budget: overrides.budget || faker.number.int({ min: 10000, max: 500000 }),
      priority: overrides.priority || faker.helpers.arrayElement(['low', 'medium', 'high'] as const),
      status: overrides.status || faker.helpers.arrayElement(['planning', 'active', 'on-hold'] as const),
      ...overrides
    };
  }

  /**
   * Generate a test allocation
   */
  static createAllocation(
    employeeId: string,
    projectId: string,
    overrides: Partial<TestAllocation> = {}
  ): TestAllocation {
    const startDate = overrides.startDate || faker.date.future({ years: 0.2 }).toISOString().split('T')[0];
    const endDate = overrides.endDate || faker.date.future({ years: 0.8, refDate: startDate }).toISOString().split('T')[0];
    
    return {
      employeeId,
      projectId,
      hoursPerWeek: overrides.hoursPerWeek || faker.number.int({ min: 10, max: 40 }),
      startDate,
      endDate,
      role: overrides.role || faker.person.jobTitle(),
      ...overrides
    };
  }

  /**
   * Generate multiple employees
   */
  static createEmployees(count: number, overrides: Partial<TestEmployee> = {}): TestEmployee[] {
    return Array.from({ length: count }, () => this.createEmployee(overrides));
  }

  /**
   * Generate multiple projects
   */
  static createProjects(count: number, overrides: Partial<TestProject> = {}): TestProject[] {
    return Array.from({ length: count }, () => this.createProject(overrides));
  }

  /**
   * Create test data for over-allocation scenario
   */
  static createOverAllocationScenario(employeeId: string, projectIds: string[]): TestAllocation[] {
    return projectIds.map(projectId => ({
      employeeId,
      projectId,
      hoursPerWeek: 30, // Multiple 30-hour allocations will cause over-allocation
      startDate: faker.date.future({ years: 0.1 }).toISOString().split('T')[0],
      endDate: faker.date.future({ years: 0.5 }).toISOString().split('T')[0],
      role: faker.person.jobTitle()
    }));
  }

  /**
   * Generate test data for CSV export testing
   */
  static createCSVTestData() {
    return {
      employees: [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@test.com',
          position: 'Software Engineer',
          departmentId: DEPARTMENTS[0].id,
          defaultHoursPerWeek: 40,
          salary: 100000
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@test.com',
          position: 'Product Manager',
          departmentId: DEPARTMENTS[1].id,
          defaultHoursPerWeek: 40,
          salary: 120000
        }
      ],
      projects: [
        {
          name: 'CSV Test Project',
          description: 'Test project for CSV export',
          clientName: 'Test Client Inc',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          budget: 100000,
          priority: 'high' as const,
          status: 'active' as const
        }
      ]
    };
  }

  /**
   * Create realistic validation test cases
   */
  static getValidationTestCases() {
    return {
      employee: {
        valid: this.createEmployee(),
        invalidEmail: this.createEmployee({ email: 'invalid-email' }),
        emptyFirstName: this.createEmployee({ firstName: '' }),
        emptyLastName: this.createEmployee({ lastName: '' }),
        invalidHours: this.createEmployee({ defaultHoursPerWeek: 0 }),
        negativeSalary: this.createEmployee({ salary: -1000 })
      },
      project: {
        valid: this.createProject(),
        emptyName: this.createProject({ name: '' }),
        emptyDescription: this.createProject({ description: '' }),
        invalidDateRange: this.createProject({
          startDate: '2024-12-01',
          endDate: '2024-11-01' // End before start
        }),
        negativeBudget: this.createProject({ budget: -5000 })
      }
    };
  }

  /**
   * Reset counters (useful for test isolation)
   */
  static resetCounters() {
    this.employeeCounter = 1;
    this.projectCounter = 1;
  }

  /**
   * Create a complete data set with employees and projects
   */
  static createCompleteDataSet(employeeCount: number = 3, projectCount: number = 2) {
    const employees = this.createEmployees(employeeCount);
    const projects = this.createProjects(projectCount);
    
    return {
      employees,
      projects,
      allocations: []
    };
  }
}

// Utility functions for test data
export function getRandomDepartment(): TestDepartment {
  return faker.helpers.arrayElement(DEPARTMENTS);
}

export function getEngineeringDepartmentId(): string {
  return 'e85e5cfe-1970-4ea8-98c8-4a59b7587a52';
}

export function getMarketingDepartmentId(): string {
  return 'fe827643-ab36-4d5f-a3a3-b52b20b8fdfa';
}

// Test database utilities
export class TestDatabaseUtils {
  /**
   * Clean up all test data from the database via API
   */
  static async cleanDatabase(baseURL: string = 'http://localhost:3001'): Promise<void> {
    try {
      // Delete in proper order to respect foreign key constraints
      await this.deleteAllAllocations(baseURL);
      await this.deleteAllProjects(baseURL);
      await this.deleteAllEmployees(baseURL);
    } catch (error) {
      console.warn('Error cleaning database:', error);
    }
  }

  private static async deleteAllAllocations(baseURL: string): Promise<void> {
    try {
      const response = await fetch(`${baseURL}/api/allocations`);
      if (response.ok) {
        const data = await response.json();
        const allocations = data.data || [];
        
        for (const allocation of allocations) {
          await fetch(`${baseURL}/api/allocations/${allocation.id}`, { 
            method: 'DELETE' 
          });
        }
      }
    } catch (error) {
      console.warn('Error deleting allocations:', error);
    }
  }

  private static async deleteAllProjects(baseURL: string): Promise<void> {
    try {
      const response = await fetch(`${baseURL}/api/projects`);
      if (response.ok) {
        const data = await response.json();
        const projects = data.data || [];
        
        for (const project of projects) {
          await fetch(`${baseURL}/api/projects/${project.id}`, { 
            method: 'DELETE' 
          });
        }
      }
    } catch (error) {
      console.warn('Error deleting projects:', error);
    }
  }

  private static async deleteAllEmployees(baseURL: string): Promise<void> {
    try {
      const response = await fetch(`${baseURL}/api/employees`);
      if (response.ok) {
        const data = await response.json();
        const employees = data.data || [];
        
        for (const employee of employees) {
          await fetch(`${baseURL}/api/employees/${employee.id}`, { 
            method: 'DELETE' 
          });
        }
      }
    } catch (error) {
      console.warn('Error deleting employees:', error);
    }
  }

  /**
   * Wait for API to be available
   */
  static async waitForAPI(baseURL: string = 'http://localhost:3001', maxAttempts: number = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${baseURL}/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          return;
        }
      } catch (error) {
        // API not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`API not available after ${maxAttempts} attempts`);
  }
}

// Test Database Setup and Management
export class TestDataSetup {
  /**
   * Clean database via API
   */
  static async cleanDatabase(baseURL: string = 'http://localhost:3001'): Promise<void> {
    return TestDatabaseUtils.cleanDatabase(baseURL);
  }

  /**
   * Seed database with test data
   */
  static async seedDatabase(data: {
    employees: TestEmployee[];
    projects?: TestProject[];
    allocations?: TestAllocation[];
  }, baseURL: string = 'http://localhost:3001'): Promise<{
    employees: any[];
    projects: any[];
    allocations: any[];
  }> {
    const results = {
      employees: [] as any[],
      projects: [] as any[], 
      allocations: [] as any[]
    };

    // Create employees first
    for (const employee of data.employees) {
      try {
        const response = await fetch(`${baseURL}/api/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(employee)
        });
        
        if (response.ok) {
          const created = await response.json();
          results.employees.push(created.data);
        }
      } catch (error) {
        console.warn('Error creating employee:', error);
      }
    }

    // Create projects if provided
    if (data.projects) {
      for (const project of data.projects) {
        try {
          const response = await fetch(`${baseURL}/api/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
          });
          
          if (response.ok) {
            const created = await response.json();
            results.projects.push(created.data);
          }
        } catch (error) {
          console.warn('Error creating project:', error);
        }
      }
    }

    // Create allocations if provided
    if (data.allocations) {
      for (const allocation of data.allocations) {
        try {
          const response = await fetch(`${baseURL}/api/allocations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allocation)
          });
          
          if (response.ok) {
            const created = await response.json();
            results.allocations.push(created.data);
          }
        } catch (error) {
          console.warn('Error creating allocation:', error);
        }
      }
    }

    return results;
  }

  /**
   * Wait for API to be ready
   */
  static async waitForAPI(baseURL: string = 'http://localhost:3001'): Promise<void> {
    return TestDatabaseUtils.waitForAPI(baseURL);
  }
}

// Add method to TestDataFactory that was referenced in tests
export class ExtendedTestDataFactory extends TestDataFactory {
  /**
   * Create a complete data set with employees and projects
   */
  static createCompleteDataSet(employeeCount: number = 3, projectCount: number = 2) {
    const employees = this.createEmployees(employeeCount);
    const projects = this.createProjects(projectCount);
    
    return {
      employees,
      projects,
      allocations: []
    };
  }
}

// Export types and constants for use in tests
export { faker };
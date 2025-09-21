import { EmployeeData } from '../pages/EmployeePage';
import { ProjectData } from '../pages/ProjectPage';
import { AllocationData } from '../pages/AllocationPage';

/**
 * Test Data Factory - Creates consistent test data for E2E tests
 */
export class TestDataFactory {
  private static getTimestamp(): number {
    return Date.now();
  }

  private static getRandomId(): string {
    return Math.random().toString(36).substring(2, 8);
  }

  /**
   * Create a basic employee with minimal required fields
   */
  static createBasicEmployee(overrides: Partial<EmployeeData> = {}): EmployeeData {
    const id = this.getRandomId();
    return {
      firstName: `TestEmp${id}`,
      lastName: 'User',
      email: `test.emp.${id}.${this.getTimestamp()}@testcompany.com`,
      ...overrides
    };
  }

  /**
   * Create a complete employee with all fields
   */
  static createCompleteEmployee(overrides: Partial<EmployeeData> = {}): EmployeeData {
    const id = this.getRandomId();
    return {
      firstName: `Complete${id}`,
      lastName: 'Employee',
      email: `complete.emp.${id}.${this.getTimestamp()}@testcompany.com`,
      department: 'Engineering',
      role: 'Software Developer',
      capacity: '100',
      skills: ['JavaScript', 'React', 'Node.js'],
      ...overrides
    };
  }

  /**
   * Create multiple employees for bulk testing
   */
  static createMultipleEmployees(count: number, overrides: Partial<EmployeeData> = {}): EmployeeData[] {
    const employees: EmployeeData[] = [];
    for (let i = 0; i < count; i++) {
      const id = this.getRandomId();
      employees.push({
        firstName: `BulkEmp${i}${id}`,
        lastName: 'TestUser',
        email: `bulk.emp.${i}.${id}.${this.getTimestamp()}@testcompany.com`,
        department: i % 2 === 0 ? 'Engineering' : 'Design',
        role: i % 2 === 0 ? 'Developer' : 'Designer',
        ...overrides
      });
    }
    return employees;
  }

  /**
   * Create employees for different departments
   */
  static createDepartmentalEmployees(): { [department: string]: EmployeeData } {
    const timestamp = this.getTimestamp();
    return {
      engineering: {
        firstName: 'Eng',
        lastName: 'Developer',
        email: `eng.dev.${timestamp}@testcompany.com`,
        department: 'Engineering',
        role: 'Senior Developer',
        skills: ['React', 'TypeScript', 'Node.js']
      },
      design: {
        firstName: 'UI',
        lastName: 'Designer',
        email: `ui.designer.${timestamp}@testcompany.com`,
        department: 'Design',
        role: 'UX/UI Designer',
        skills: ['Figma', 'Adobe XD', 'User Research']
      },
      qa: {
        firstName: 'Quality',
        lastName: 'Assurance',
        email: `qa.tester.${timestamp}@testcompany.com`,
        department: 'QA',
        role: 'QA Engineer',
        skills: ['Selenium', 'Jest', 'Playwright']
      },
      marketing: {
        firstName: 'Marketing',
        lastName: 'Specialist',
        email: `marketing.spec.${timestamp}@testcompany.com`,
        department: 'Marketing',
        role: 'Marketing Manager',
        skills: ['SEO', 'Social Media', 'Analytics']
      }
    };
  }

  /**
   * Create a basic project with minimal required fields
   */
  static createBasicProject(overrides: Partial<ProjectData> = {}): ProjectData {
    const id = this.getRandomId();
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 30);

    return {
      name: `Test Project ${id}`,
      startDate: this.formatDateForInput(today),
      endDate: this.formatDateForInput(futureDate),
      ...overrides
    };
  }

  /**
   * Create a complete project with all fields
   */
  static createCompleteProject(overrides: Partial<ProjectData> = {}): ProjectData {
    const id = this.getRandomId();
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 60);

    return {
      name: `Complete Project ${id}`,
      description: `A comprehensive test project ${id} for E2E testing scenarios`,
      startDate: this.formatDateForInput(today),
      endDate: this.formatDateForInput(futureDate),
      status: 'Planning',
      priority: 'High',
      budget: '75000',
      client: `Test Client ${id}`,
      ...overrides
    };
  }

  /**
   * Create multiple projects for bulk testing
   */
  static createMultipleProjects(count: number, overrides: Partial<ProjectData> = {}): ProjectData[] {
    const projects: ProjectData[] = [];
    const statuses: Array<ProjectData['status']> = ['Planning', 'Active', 'On Hold', 'Completed'];
    const priorities: Array<ProjectData['priority']> = ['Low', 'Medium', 'High', 'Critical'];

    for (let i = 0; i < count; i++) {
      const id = this.getRandomId();
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + (i * 5)); // Stagger start dates
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 45);

      projects.push({
        name: `Bulk Project ${i} ${id}`,
        description: `Bulk test project number ${i}`,
        startDate: this.formatDateForInput(startDate),
        endDate: this.formatDateForInput(endDate),
        status: statuses[i % statuses.length],
        priority: priorities[i % priorities.length],
        budget: `${(i + 1) * 10000}`,
        ...overrides
      });
    }
    return projects;
  }

  /**
   * Create projects with different statuses and priorities
   */
  static createCategorizedProjects(): { [key: string]: ProjectData } {
    const timestamp = this.getTimestamp();
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 45);

    return {
      planning: {
        name: `Planning Project ${timestamp}`,
        startDate: this.formatDateForInput(today),
        endDate: this.formatDateForInput(futureDate),
        status: 'Planning',
        priority: 'Medium',
        description: 'Project in planning phase'
      },
      active: {
        name: `Active Project ${timestamp}`,
        startDate: this.formatDateForInput(today),
        endDate: this.formatDateForInput(futureDate),
        status: 'Active',
        priority: 'High',
        description: 'Currently active project'
      },
      onHold: {
        name: `On Hold Project ${timestamp}`,
        startDate: this.formatDateForInput(today),
        endDate: this.formatDateForInput(futureDate),
        status: 'On Hold',
        priority: 'Low',
        description: 'Project temporarily on hold'
      },
      critical: {
        name: `Critical Project ${timestamp}`,
        startDate: this.formatDateForInput(today),
        endDate: this.formatDateForInput(futureDate),
        status: 'Active',
        priority: 'Critical',
        description: 'High priority critical project'
      }
    };
  }

  /**
   * Create allocation data
   */
  static createBasicAllocation(
    employeeName: string,
    projectName: string,
    overrides: Partial<AllocationData> = {}
  ): AllocationData {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30);

    return {
      employeeName,
      projectName,
      startDate: this.formatDateForInput(today),
      endDate: this.formatDateForInput(endDate),
      capacity: 80,
      ...overrides
    };
  }

  /**
   * Create complete allocation with all fields
   */
  static createCompleteAllocation(
    employeeName: string,
    projectName: string,
    overrides: Partial<AllocationData> = {}
  ): AllocationData {
    const id = this.getRandomId();
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 45);

    return {
      employeeName,
      projectName,
      startDate: this.formatDateForInput(today),
      endDate: this.formatDateForInput(endDate),
      capacity: 75,
      role: `Test Role ${id}`,
      notes: `Test allocation notes for ${id}`,
      ...overrides
    };
  }

  /**
   * Create allocations for over-allocation testing
   */
  static createOverAllocationScenario(employeeName: string, projects: string[]): AllocationData[] {
    const allocations: AllocationData[] = [];
    const today = new Date();

    projects.forEach((projectName, index) => {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + (index * 5)); // Slight offset
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 30); // 30-day overlapping periods

      allocations.push({
        employeeName,
        projectName,
        startDate: this.formatDateForInput(startDate),
        endDate: this.formatDateForInput(endDate),
        capacity: 60 // 60% each - will cause over-allocation
      });
    });

    return allocations;
  }

  /**
   * Create time-based allocation scenarios
   */
  static createTimeBasedAllocations(employeeName: string, projectName: string): {
    past: AllocationData;
    current: AllocationData;
    future: AllocationData;
  } {
    const today = new Date();
    
    // Past allocation
    const pastStart = new Date(today);
    pastStart.setDate(today.getDate() - 60);
    const pastEnd = new Date(today);
    pastEnd.setDate(today.getDate() - 30);

    // Current allocation
    const currentStart = new Date(today);
    currentStart.setDate(today.getDate() - 15);
    const currentEnd = new Date(today);
    currentEnd.setDate(today.getDate() + 15);

    // Future allocation
    const futureStart = new Date(today);
    futureStart.setDate(today.getDate() + 30);
    const futureEnd = new Date(today);
    futureEnd.setDate(today.getDate() + 60);

    return {
      past: {
        employeeName,
        projectName: `${projectName} Past`,
        startDate: this.formatDateForInput(pastStart),
        endDate: this.formatDateForInput(pastEnd),
        capacity: 50
      },
      current: {
        employeeName,
        projectName: `${projectName} Current`,
        startDate: this.formatDateForInput(currentStart),
        endDate: this.formatDateForInput(currentEnd),
        capacity: 75
      },
      future: {
        employeeName,
        projectName: `${projectName} Future`,
        startDate: this.formatDateForInput(futureStart),
        endDate: this.formatDateForInput(futureEnd),
        capacity: 60
      }
    };
  }

  /**
   * Create test data for edge cases
   */
  static createEdgeCaseData(): {
    longNameEmployee: EmployeeData;
    specialCharsEmployee: EmployeeData;
    longTermProject: ProjectData;
    sameDayProject: ProjectData;
    fullCapacityAllocation: AllocationData;
  } {
    const timestamp = this.getTimestamp();
    const today = new Date();

    return {
      longNameEmployee: {
        firstName: 'VeryLongFirstNameForTesting',
        lastName: 'VeryLongLastNameForTesting',
        email: `very.long.name.${timestamp}@verylongdomainfortesting.com`,
        department: 'Engineering',
        role: 'Senior Full Stack Developer With Very Long Title'
      },
      specialCharsEmployee: {
        firstName: 'Test-Name',
        lastName: "O'Connor",
        email: `special.chars.${timestamp}@test-company.com`,
        department: 'R&D',
        role: 'Developer/Designer'
      },
      longTermProject: {
        name: `Long Term Project ${timestamp}`,
        description: 'A very long-term project spanning multiple years',
        startDate: this.formatDateForInput(today),
        endDate: this.formatDateForInput(new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())),
        status: 'Planning',
        priority: 'Low'
      },
      sameDayProject: {
        name: `Same Day Project ${timestamp}`,
        description: 'Project that starts and ends on the same day',
        startDate: this.formatDateForInput(today),
        endDate: this.formatDateForInput(today),
        status: 'Active',
        priority: 'Critical'
      },
      fullCapacityAllocation: {
        employeeName: 'TBD', // To be determined when used
        projectName: 'TBD', // To be determined when used
        startDate: this.formatDateForInput(today),
        endDate: this.formatDateForInput(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)),
        capacity: 100,
        role: 'Full-time Assignment',
        notes: 'Employee allocated at 100% capacity'
      }
    };
  }

  /**
   * Helper method to format date for HTML input
   */
  private static formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get today's date formatted for input
   */
  static getTodayFormatted(): string {
    return this.formatDateForInput(new Date());
  }

  /**
   * Get future date formatted for input
   */
  static getFutureDateFormatted(daysAhead: number): string {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    return this.formatDateForInput(futureDate);
  }

  /**
   * Get past date formatted for input
   */
  static getPastDateFormatted(daysBehind: number): string {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - daysBehind);
    return this.formatDateForInput(pastDate);
  }

  /**
   * Generate unique email for testing
   */
  static generateUniqueEmail(prefix: string = 'test'): string {
    return `${prefix}.${this.getTimestamp()}.${this.getRandomId()}@testcompany.com`;
  }

  /**
   * Generate unique project name
   */
  static generateUniqueProjectName(prefix: string = 'Test Project'): string {
    return `${prefix} ${this.getTimestamp()} ${this.getRandomId()}`;
  }

  /**
   * Create realistic employee names
   */
  static getRealisticNames(): { firstName: string; lastName: string }[] {
    return [
      { firstName: 'Alice', lastName: 'Johnson' },
      { firstName: 'Bob', lastName: 'Smith' },
      { firstName: 'Charlie', lastName: 'Brown' },
      { firstName: 'Diana', lastName: 'Davis' },
      { firstName: 'Eva', lastName: 'Wilson' },
      { firstName: 'Frank', lastName: 'Miller' },
      { firstName: 'Grace', lastName: 'Taylor' },
      { firstName: 'Henry', lastName: 'Anderson' },
      { firstName: 'Ivy', lastName: 'Thomas' },
      { firstName: 'Jack', lastName: 'Jackson' }
    ];
  }

  /**
   * Create realistic department and role combinations
   */
  static getDepartmentRoles(): { [department: string]: string[] } {
    return {
      Engineering: [
        'Software Developer',
        'Senior Developer',
        'Full Stack Developer',
        'Frontend Developer',
        'Backend Developer',
        'DevOps Engineer',
        'Technical Lead',
        'Software Architect'
      ],
      Design: [
        'UI Designer',
        'UX Designer',
        'UX/UI Designer',
        'Product Designer',
        'Visual Designer',
        'Design Lead'
      ],
      QA: [
        'QA Engineer',
        'Test Automation Engineer',
        'Manual Tester',
        'QA Lead',
        'Performance Tester'
      ],
      Marketing: [
        'Marketing Manager',
        'Digital Marketing Specialist',
        'Content Creator',
        'SEO Specialist',
        'Social Media Manager'
      ],
      Sales: [
        'Sales Representative',
        'Account Manager',
        'Sales Manager',
        'Business Development',
        'Customer Success Manager'
      ],
      HR: [
        'HR Specialist',
        'Recruiter',
        'HR Manager',
        'People Operations',
        'HR Business Partner'
      ]
    };
  }

  /**
   * Get common skill sets by department
   */
  static getDepartmentSkills(): { [department: string]: string[] } {
    return {
      Engineering: [
        'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java',
        'PostgreSQL', 'MongoDB', 'Docker', 'Kubernetes', 'AWS', 'Git'
      ],
      Design: [
        'Figma', 'Adobe XD', 'Sketch', 'Adobe Photoshop', 'Adobe Illustrator',
        'User Research', 'Wireframing', 'Prototyping', 'Design Systems'
      ],
      QA: [
        'Selenium', 'Jest', 'Playwright', 'Cypress', 'Postman', 'JIRA',
        'Test Planning', 'Automated Testing', 'Manual Testing', 'API Testing'
      ],
      Marketing: [
        'Google Analytics', 'SEO', 'SEM', 'Social Media', 'Content Creation',
        'Email Marketing', 'A/B Testing', 'Adobe Creative Suite'
      ]
    };
  }
}
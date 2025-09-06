/**
 * Test Fixtures for E2E Testing
 * Provides consistent test data and setup utilities
 */
import { test as base, Page } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

// Extend base test with custom fixtures
export const test = base.extend<{
  testHelpers: TestHelpers;
  authenticatedPage: Page;
}>({
  testHelpers: async ({ page }, use) => {
    const helpers = new TestHelpers(page);
    await use(helpers);
  },

  authenticatedPage: async ({ page }, use) => {
    // Mock authentication for testing
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin'
      }));
    });

    // Navigate to app
    await page.goto('/');
    await use(page);
  }
});

export { expect } from '@playwright/test';

// Mock data for testing
export const MOCK_DATA = {
  employees: [
    {
      id: 1,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      department: 'Engineering',
      role: 'Senior Developer',
      skills: ['React', 'TypeScript', 'Node.js'],
      availableCapacity: 40,
      currentLoad: 32
    },
    {
      id: 2,
      name: 'Bob Smith',
      email: 'bob@example.com',
      department: 'Design',
      role: 'UI/UX Designer',
      skills: ['Figma', 'Design Systems', 'User Research'],
      availableCapacity: 40,
      currentLoad: 20
    }
  ],
  
  projects: [
    {
      id: 1,
      name: 'Mobile App Redesign',
      description: 'Complete UI overhaul for mobile application',
      startDate: '2024-01-15',
      endDate: '2024-06-30',
      status: 'active',
      priority: 'high',
      requiredHours: 320
    },
    {
      id: 2,
      name: 'Backend API Migration',
      description: 'Migrate legacy API to modern architecture',
      startDate: '2024-02-01',
      endDate: '2024-08-31',
      status: 'planning',
      priority: 'medium',
      requiredHours: 480
    }
  ],

  assignments: [
    {
      id: 1,
      employeeId: 1,
      projectId: 1,
      hoursPerWeek: 20,
      startDate: '2024-01-15',
      endDate: '2024-06-30',
      role: 'Frontend Lead'
    }
  ],

  scheduleData: {
    '2024-01-15': [
      {
        employeeId: 1,
        projectId: 1,
        hours: 8,
        task: 'Component Development'
      }
    ]
  }
};

export const API_ROUTES = {
  EMPLOYEES: '**/api/employees',
  PROJECTS: '**/api/projects',
  ASSIGNMENTS: '**/api/assignments',
  ALLOCATIONS: '**/api/allocations',
  CAPACITY: '**/api/capacity',
  ANALYTICS: '**/api/analytics/**'
};
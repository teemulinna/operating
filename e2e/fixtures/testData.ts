/**
 * Test data fixtures for E2E tests
 * Provides consistent test data across all test suites
 */

export const testEmployees = {
  validEmployee: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
    department: 'Engineering',
    position: 'Software Developer',
    skills: ['JavaScript', 'TypeScript', 'React'],
    startDate: '2024-01-01',
    salary: 75000,
    capacity: 40, // hours per week
  },
  
  employeeWithMinimumData: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@test.com',
    department: 'Design',
    position: 'UI/UX Designer',
  },
  
  employeeForUpdate: {
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@test.com',
    department: 'Marketing',
    position: 'Marketing Manager',
    skills: ['Marketing', 'Analytics'],
    startDate: '2024-02-15',
    salary: 65000,
    capacity: 40,
  }
};

export const testProjects = {
  validProject: {
    name: 'E2E Test Project',
    description: 'A project created for end-to-end testing purposes',
    startDate: '2024-09-01',
    endDate: '2024-12-31',
    status: 'active',
    priority: 'high',
    budget: 100000,
    client: 'Test Client',
  },
  
  projectWithMinimumData: {
    name: 'Minimal Test Project',
    description: 'Minimal project for testing',
    startDate: '2024-10-01',
    endDate: '2024-11-30',
  },
  
  urgentProject: {
    name: 'Urgent Test Project',
    description: 'High priority urgent project',
    startDate: '2024-09-15',
    endDate: '2024-10-15',
    status: 'active',
    priority: 'critical',
    budget: 50000,
  }
};

export const testSkills = {
  technicalSkills: [
    'JavaScript',
    'TypeScript',
    'React',
    'Node.js',
    'Python',
    'SQL',
    'Docker',
    'AWS',
    'Git',
    'Testing'
  ],
  
  softSkills: [
    'Communication',
    'Leadership',
    'Problem Solving',
    'Team Work',
    'Project Management',
    'Critical Thinking'
  ],
  
  designSkills: [
    'UI/UX Design',
    'Figma',
    'Adobe Creative Suite',
    'Prototyping',
    'User Research',
    'Information Architecture'
  ]
};

export const testDepartments = [
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'Human Resources',
  'Finance',
  'Operations',
  'Customer Success'
];

export const testAllocations = {
  fullTimeAllocation: {
    employeeId: '', // Will be set dynamically
    projectId: '', // Will be set dynamically
    startDate: '2024-09-01',
    endDate: '2024-12-31',
    percentage: 100,
    role: 'Developer',
    billableHours: 40,
  },
  
  partTimeAllocation: {
    employeeId: '', // Will be set dynamically
    projectId: '', // Will be set dynamically
    startDate: '2024-10-01',
    endDate: '2024-11-30',
    percentage: 50,
    role: 'Consultant',
    billableHours: 20,
  }
};

export const apiEndpoints = {
  employees: '/api/employees',
  projects: '/api/projects',
  skills: '/api/skills',
  departments: '/api/departments',
  allocations: '/api/allocations',
  analytics: '/api/analytics',
  reports: '/api/reports'
};

export const selectors = {
  // Navigation
  nav: {
    dashboard: '[data-testid="nav-dashboard"]',
    employees: '[data-testid="nav-employees"]',
    projects: '[data-testid="nav-projects"]',
    reports: '[data-testid="nav-reports"]',
    analytics: '[data-testid="nav-analytics"]'
  },
  
  // Employee page selectors
  employees: {
    title: '[data-testid="employees-title"]',
    addButton: '[data-testid="add-employee-button"]',
    searchInput: '[data-testid="employee-search"]',
    employeeCard: '[data-testid^="employee-card-"]',
    employeeList: '[data-testid="employee-list"]',
    editButton: '[data-testid^="edit-employee-"]',
    deleteButton: '[data-testid^="delete-employee-"]'
  },
  
  // Employee form selectors
  employeeForm: {
    firstNameInput: '[data-testid="employee-first-name"]',
    lastNameInput: '[data-testid="employee-last-name"]',
    emailInput: '[data-testid="employee-email"]',
    departmentSelect: '[data-testid="employee-department"]',
    positionInput: '[data-testid="employee-position"]',
    skillsInput: '[data-testid="employee-skills"]',
    startDateInput: '[data-testid="employee-start-date"]',
    salaryInput: '[data-testid="employee-salary"]',
    capacityInput: '[data-testid="employee-capacity"]',
    submitButton: '[data-testid="employee-form-submit"]',
    cancelButton: '[data-testid="employee-form-cancel"]'
  },
  
  // Project page selectors
  projects: {
    title: '[data-testid="projects-title"]',
    addButton: '[data-testid="add-project-button"]',
    projectCard: '[data-testid^="project-card-"]',
    projectList: '[data-testid="project-list"]',
    editButton: '[data-testid^="edit-project-"]',
    deleteButton: '[data-testid^="delete-project-"]'
  },
  
  // Reports page selectors
  reports: {
    title: '[data-testid="reports-title"]',
    exportCsvButton: '[data-testid="reports-export-csv-btn"]',
    reportsList: '[data-testid="reports-list"]',
    generateButton: '[data-testid="generate-report"]'
  },
  
  // Common UI selectors
  common: {
    loadingSpinner: '[data-testid="loading-spinner"]',
    errorMessage: '[data-testid="error-message"]',
    successMessage: '[data-testid="success-message"]',
    confirmDialog: '[data-testid="confirm-dialog"]',
    confirmButton: '[data-testid="confirm-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    modal: '[data-testid="modal"]',
    modalCloseButton: '[data-testid="modal-close"]'
  }
};

export const testTimeouts = {
  short: 2000,
  medium: 5000,
  long: 10000,
  api: 15000,
  pageLoad: 30000
};

export const testUrls = {
  dashboard: '/',
  employees: '/employees',
  projects: '/projects',
  reports: '/reports',
  analytics: '/analytics'
};
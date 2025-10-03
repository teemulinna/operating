"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceThresholds = exports.testSelectors = exports.invalidCSVData = exports.validCSVData = exports.testDepartments = exports.testSkills = exports.testAllocations = exports.testProjects = exports.invalidPersonData = exports.mockPersons = void 0;
exports.mockPersons = [
    {
        id: 1,
        name: 'John Doe',
        age: 30,
        occupation: 'Software Engineer',
        email: 'john.doe@example.com',
        phone: '+1-555-0100',
        address: '123 Main St, Anytown, USA',
        department: 'Engineering',
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js']
    },
    {
        id: 2,
        name: 'Jane Smith',
        age: 28,
        occupation: 'Product Manager',
        email: 'jane.smith@example.com',
        phone: '+1-555-0101',
        address: '456 Oak Ave, Somewhere, USA',
        department: 'Product',
        skills: ['Product Strategy', 'Agile', 'User Research']
    },
    {
        id: 3,
        name: 'Bob Johnson',
        age: 35,
        occupation: 'UX Designer',
        email: 'bob.johnson@example.com',
        phone: '+1-555-0102',
        address: '789 Pine Rd, Elsewhere, USA',
        department: 'Design',
        skills: ['Figma', 'Sketch', 'User Experience', 'Prototyping']
    },
    {
        id: 4,
        name: 'Alice Williams',
        age: 32,
        occupation: 'Data Scientist',
        email: 'alice.williams@example.com',
        phone: '+1-555-0103',
        address: '321 Elm St, Anywhere, USA',
        department: 'Data',
        skills: ['Python', 'Machine Learning', 'SQL', 'Statistics']
    },
    {
        id: 5,
        name: 'Charlie Brown',
        age: 29,
        occupation: 'DevOps Engineer',
        email: 'charlie.brown@example.com',
        phone: '+1-555-0104',
        address: '654 Maple Dr, Nowhere, USA',
        department: 'Infrastructure',
        skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD']
    }
];
exports.invalidPersonData = {
    missingName: {
        age: 25,
        occupation: 'Developer',
        email: 'test@example.com'
    },
    invalidAge: {
        name: 'Test User',
        age: -5,
        occupation: 'Developer',
        email: 'test@example.com'
    },
    invalidEmail: {
        name: 'Test User',
        age: 25,
        occupation: 'Developer',
        email: 'not-an-email'
    },
    emptyFields: {
        name: '',
        age: '',
        occupation: '',
        email: ''
    }
};
exports.testProjects = [
    {
        id: 1,
        name: 'Project Alpha',
        description: 'Web application modernization',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        status: 'active',
        budget: 100000,
        requiredSkills: ['React', 'Node.js', 'PostgreSQL']
    },
    {
        id: 2,
        name: 'Project Beta',
        description: 'Mobile app development',
        startDate: '2024-02-01',
        endDate: '2024-08-31',
        status: 'planning',
        budget: 150000,
        requiredSkills: ['React Native', 'TypeScript', 'GraphQL']
    },
    {
        id: 3,
        name: 'Project Gamma',
        description: 'Data pipeline implementation',
        startDate: '2024-03-01',
        endDate: '2024-09-30',
        status: 'active',
        budget: 80000,
        requiredSkills: ['Python', 'Apache Spark', 'AWS']
    }
];
exports.testAllocations = [
    {
        employeeId: 1,
        projectId: 1,
        role: 'Frontend Developer',
        allocation: 80,
        startDate: '2024-01-01',
        endDate: '2024-03-31'
    },
    {
        employeeId: 2,
        projectId: 1,
        role: 'Product Owner',
        allocation: 50,
        startDate: '2024-01-01',
        endDate: '2024-06-30'
    },
    {
        employeeId: 3,
        projectId: 2,
        role: 'UI/UX Designer',
        allocation: 100,
        startDate: '2024-02-01',
        endDate: '2024-04-30'
    },
    {
        employeeId: 4,
        projectId: 3,
        role: 'Data Engineer',
        allocation: 100,
        startDate: '2024-03-01',
        endDate: '2024-09-30'
    },
    {
        employeeId: 5,
        projectId: 1,
        role: 'DevOps Engineer',
        allocation: 30,
        startDate: '2024-01-01',
        endDate: '2024-06-30'
    }
];
exports.testSkills = [
    { name: 'JavaScript', category: 'Programming', level: 'Expert' },
    { name: 'TypeScript', category: 'Programming', level: 'Advanced' },
    { name: 'React', category: 'Framework', level: 'Expert' },
    { name: 'Node.js', category: 'Runtime', level: 'Advanced' },
    { name: 'Python', category: 'Programming', level: 'Expert' },
    { name: 'SQL', category: 'Database', level: 'Advanced' },
    { name: 'Docker', category: 'DevOps', level: 'Intermediate' },
    { name: 'Kubernetes', category: 'DevOps', level: 'Intermediate' },
    { name: 'AWS', category: 'Cloud', level: 'Advanced' },
    { name: 'Agile', category: 'Methodology', level: 'Expert' }
];
exports.testDepartments = [
    { id: 1, name: 'Engineering', manager: 'John Manager', budget: 500000 },
    { id: 2, name: 'Product', manager: 'Jane Leader', budget: 300000 },
    { id: 3, name: 'Design', manager: 'Bob Director', budget: 200000 },
    { id: 4, name: 'Data', manager: 'Alice Chief', budget: 400000 },
    { id: 5, name: 'Infrastructure', manager: 'Charlie Head', budget: 350000 }
];
exports.validCSVData = `name,age,occupation,email,department
John Doe,30,Software Engineer,john@example.com,Engineering
Jane Smith,28,Product Manager,jane@example.com,Product
Bob Johnson,35,UX Designer,bob@example.com,Design`;
exports.invalidCSVData = `name,age,occupation
Missing Email,30,Developer
Invalid Age,not-a-number,Designer,invalid@example.com
,25,Empty Name,empty@example.com`;
exports.testSelectors = {
    navbar: '[data-testid="navbar"]',
    sidebar: '[data-testid="sidebar"]',
    mainContent: '[data-testid="main-content"]',
    addPersonBtn: '[data-testid="add-person-btn"]',
    personForm: '[data-testid="person-form"]',
    nameInput: '[data-testid="name-input"]',
    ageInput: '[data-testid="age-input"]',
    occupationInput: '[data-testid="occupation-input"]',
    emailInput: '[data-testid="email-input"]',
    phoneInput: '[data-testid="phone-input"]',
    addressInput: '[data-testid="address-input"]',
    savePersonBtn: '[data-testid="save-person-btn"]',
    cancelBtn: '[data-testid="cancel-btn"]',
    personList: '[data-testid="person-list"]',
    personCard: '[data-testid="person-card"]',
    editBtn: '[data-testid="edit-btn"]',
    deleteBtn: '[data-testid="delete-btn"]',
    successMessage: '[data-testid="success-message"]',
    errorMessage: '[data-testid="error-message"]',
    loadingSpinner: '[data-testid="loading-spinner"]',
    searchInput: '[data-testid="search-input"]',
    departmentFilter: '[data-testid="department-filter"]',
    skillFilter: '[data-testid="skill-filter"]',
    prevPageBtn: '[data-testid="prev-page"]',
    nextPageBtn: '[data-testid="next-page"]',
    pageInfo: '[data-testid="page-info"]'
};
exports.performanceThresholds = {
    pageLoad: 3000,
    apiResponse: 500,
    formSubmission: 1000,
    searchResponse: 300,
    firstContentfulPaint: 1500,
    timeToInteractive: 3500
};
exports.default = {
    mockPersons: exports.mockPersons,
    invalidPersonData: exports.invalidPersonData,
    testProjects: exports.testProjects,
    testAllocations: exports.testAllocations,
    testSkills: exports.testSkills,
    testDepartments: exports.testDepartments,
    validCSVData: exports.validCSVData,
    invalidCSVData: exports.invalidCSVData,
    testSelectors: exports.testSelectors,
    performanceThresholds: exports.performanceThresholds
};
//# sourceMappingURL=test-data.js.map
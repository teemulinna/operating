// Jest setup file for unit tests (with mocked database)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

// Increase timeout for database operations
jest.setTimeout(30000);

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

import { 
  Department, 
  Employee, 
  Skill, 
  CreateDepartmentInput, 
  CreateEmployeeInput, 
  CreateSkillInput,
  SkillCategory,
  ProficiencyLevel
} from '../src/types';

// Mock data store
interface MockDataStore {
  departments: Department[];
  employees: Employee[];
  skills: Skill[];
  nextId: number;
}

let mockData: MockDataStore = {
  departments: [],
  employees: [],
  skills: [],
  nextId: 1
};

// Helper to generate UUID-like strings
const generateId = (): string => {
  const id = mockData.nextId++;
  return `mock-uuid-${id.toString().padStart(8, '0')}`;
};

// Helper to create timestamps
const now = (): Date => new Date();

// Mock helper functions
export const createTestDepartment = async (input?: Partial<CreateDepartmentInput>): Promise<Department> => {
  const department: Department = {
    id: generateId(),
    name: input?.name || `Test Department ${Date.now()}`,
    description: input?.description || 'Test department description',
    managerId: input?.managerId || undefined,
    isActive: true,
    createdAt: now(),
    updatedAt: now()
  };
  
  mockData.departments.push(department);
  return department;
};

export const createTestSkill = async (input?: Partial<CreateSkillInput>): Promise<Skill> => {
  const skill: Skill = {
    id: generateId(),
    name: input?.name || `Test Skill ${Date.now()}`,
    category: input?.category || SkillCategory.TECHNICAL,
    description: input?.description || 'Test skill description',
    isActive: true,
    createdAt: now(),
    updatedAt: now()
  };
  
  mockData.skills.push(skill);
  return skill;
};

export const createTestEmployee = async (departmentId: string, input?: Partial<CreateEmployeeInput>): Promise<Employee> => {
  const employee: Employee = {
    id: generateId(),
    firstName: input?.firstName || 'Test',
    lastName: input?.lastName || `Employee-${Date.now()}`,
    email: input?.email || `test-${Date.now()}@example.com`,
    departmentId,
    position: input?.position || 'Test Position',
    hireDate: input?.hireDate || now(),
    isActive: true,
    createdAt: now(),
    updatedAt: now()
  };
  
  mockData.employees.push(employee);
  return employee;
};

// Mock the database models
const mockDepartmentModel = {
  create: jest.fn().mockImplementation(async (input: CreateDepartmentInput) => {
    const department: Department = {
      id: generateId(),
      name: input.name,
      description: input.description,
      managerId: input.managerId,
      isActive: true,
      createdAt: now(),
      updatedAt: now()
    };
    mockData.departments.push(department);
    return department;
  }),

  findById: jest.fn().mockImplementation(async (id: string) => {
    return mockData.departments.find(d => d.id === id && d.isActive) || null;
  }),

  update: jest.fn().mockImplementation(async (id: string, updates: any) => {
    const department = mockData.departments.find(d => d.id === id);
    if (!department) return null;
    
    Object.assign(department, updates, { updatedAt: now() });
    return department;
  }),

  delete: jest.fn().mockImplementation(async (id: string) => {
    const department = mockData.departments.find(d => d.id === id);
    if (!department) return null;
    
    department.isActive = false;
    department.updatedAt = now();
    return department;
  }),

  findAll: jest.fn().mockImplementation(async (filters: any = {}) => {
    let filtered = mockData.departments.filter(d => d.isActive);
    if (filters.isActive !== undefined) {
      filtered = mockData.departments.filter(d => d.isActive === filters.isActive);
    }
    return filtered;
  })
};

const mockSkillModel = {
  create: jest.fn().mockImplementation(async (input: CreateSkillInput) => {
    const skill: Skill = {
      id: generateId(),
      name: input.name,
      category: input.category,
      description: input.description,
      isActive: true,
      createdAt: now(),
      updatedAt: now()
    };
    mockData.skills.push(skill);
    return skill;
  }),

  findById: jest.fn().mockImplementation(async (id: string) => {
    return mockData.skills.find(s => s.id === id && s.isActive) || null;
  }),

  update: jest.fn().mockImplementation(async (id: string, updates: any) => {
    const skill = mockData.skills.find(s => s.id === id);
    if (!skill) return null;
    
    Object.assign(skill, updates, { updatedAt: now() });
    return skill;
  }),

  findAll: jest.fn().mockImplementation(async (filters: any = {}) => {
    let filtered = mockData.skills.filter(s => s.isActive);
    if (filters.category) {
      filtered = filtered.filter(s => s.category === filters.category);
    }
    return filtered;
  })
};

const mockEmployeeModel = {
  create: jest.fn().mockImplementation(async (input: CreateEmployeeInput) => {
    // Check for duplicate email
    const existingEmployee = mockData.employees.find(e => e.email.toLowerCase() === input.email.toLowerCase());
    if (existingEmployee) {
      throw new Error(`Employee with email '${input.email}' already exists`);
    }

    const employee: Employee = {
      id: generateId(),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      departmentId: input.departmentId,
      position: input.position,
      hireDate: input.hireDate,
      isActive: true,
      createdAt: now(),
      updatedAt: now()
    };
    mockData.employees.push(employee);
    return employee;
  }),

  findById: jest.fn().mockImplementation(async (id: string) => {
    return mockData.employees.find(e => e.id === id && e.isActive) || null;
  }),

  findByIdWithDetails: jest.fn().mockImplementation(async (id: string) => {
    const employee = mockData.employees.find(e => e.id === id && e.isActive);
    if (!employee) return null;

    const department = mockData.departments.find(d => d.id === employee.departmentId);
    
    // Find employee skills
    const employeeSkills = mockEmployeeSkills.filter(es => 
      es.employeeId === id && es.isActive
    );
    
    const skills = employeeSkills.map(es => ({
      ...es,
      skill: mockData.skills.find(s => s.id === es.skillId)
    }));
    
    return {
      ...employee,
      department,
      skills
    };
  }),

  findAll: jest.fn().mockImplementation(async (filters: any = {}) => {
    let filtered = mockData.employees.filter(e => e.isActive);
    if (filters.departmentId) {
      filtered = filtered.filter(e => e.departmentId === filters.departmentId);
    }
    
    return {
      data: filtered,
      total: filtered.length,
      page: 1,
      limit: 50,
      totalPages: 1
    };
  })
};

// Employee Skills mock store
let mockEmployeeSkills: any[] = [];

const mockEmployeeSkillModel = {
  create: jest.fn().mockImplementation(async (input: any) => {
    // Check for duplicate employee-skill mapping
    const existing = mockEmployeeSkills.find(es => 
      es.employeeId === input.employeeId && 
      es.skillId === input.skillId && 
      es.isActive
    );
    
    if (existing) {
      throw new Error('Employee-skill mapping already exists');
    }

    const employeeSkill = {
      id: generateId(),
      employeeId: input.employeeId,
      skillId: input.skillId,
      proficiencyLevel: input.proficiencyLevel,
      yearsOfExperience: input.yearsOfExperience,
      lastAssessed: input.lastAssessed,
      isActive: true,
      createdAt: now(),
      updatedAt: now()
    };
    
    mockEmployeeSkills.push(employeeSkill);
    return employeeSkill;
  }),

  findByEmployee: jest.fn().mockImplementation(async (employeeId: string) => {
    const employeeSkills = mockEmployeeSkills.filter(es => 
      es.employeeId === employeeId && es.isActive
    );
    
    return employeeSkills.map(es => ({
      ...es,
      skill: mockData.skills.find(s => s.id === es.skillId)
    }));
  })
};

// Capacity History mock store
let mockCapacityHistory: any[] = [];

const mockCapacityHistoryModel = {
  create: jest.fn().mockImplementation(async (input: any) => {
    const utilizationRate = input.allocatedHours / input.availableHours;
    
    const capacity = {
      id: generateId(),
      employeeId: input.employeeId,
      date: input.date,
      availableHours: input.availableHours,
      allocatedHours: input.allocatedHours,
      utilizationRate,
      notes: input.notes,
      createdAt: now(),
      updatedAt: now()
    };
    
    mockCapacityHistory.push(capacity);
    return capacity;
  }),

  findByDateRange: jest.fn().mockImplementation(async (employeeId: string, startDate: Date, endDate: Date) => {
    return mockCapacityHistory.filter(ch => 
      ch.employeeId === employeeId &&
      ch.date >= startDate &&
      ch.date <= endDate
    );
  }),

  findAll: jest.fn().mockImplementation(async (filters: any = {}) => {
    let filtered = mockCapacityHistory;
    
    if (filters.employeeId) {
      filtered = filtered.filter(ch => ch.employeeId === filters.employeeId);
    }
    
    if (filters.dateFrom) {
      filtered = filtered.filter(ch => ch.date >= filters.dateFrom);
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter(ch => ch.date <= filters.dateTo);
    }
    
    return filtered;
  })
};

// Mock the models
jest.mock('../src/models/Department', () => ({
  DepartmentModel: mockDepartmentModel
}));

jest.mock('../src/models/Skill', () => ({
  SkillModel: mockSkillModel
}));

jest.mock('../src/models/Employee', () => ({
  EmployeeModel: mockEmployeeModel
}));

jest.mock('../src/models/EmployeeSkill', () => ({
  EmployeeSkillModel: mockEmployeeSkillModel
}));

jest.mock('../src/models/CapacityHistory', () => ({
  CapacityHistoryModel: mockCapacityHistoryModel
}));

// Reset mock data before each test
beforeEach(() => {
  mockData = {
    departments: [],
    employees: [],
    skills: [],
    nextId: 1
  };
  
  mockEmployeeSkills = [];
  mockCapacityHistory = [];

  // Clear all mock calls
  Object.values(mockDepartmentModel).forEach(mock => jest.clearAllMocks && (mock as any).mockClear?.());
  Object.values(mockSkillModel).forEach(mock => jest.clearAllMocks && (mock as any).mockClear?.());
  Object.values(mockEmployeeModel).forEach(mock => jest.clearAllMocks && (mock as any).mockClear?.());
  Object.values(mockEmployeeSkillModel).forEach(mock => jest.clearAllMocks && (mock as any).mockClear?.());
  Object.values(mockCapacityHistoryModel).forEach(mock => jest.clearAllMocks && (mock as any).mockClear?.());
});
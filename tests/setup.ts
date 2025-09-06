// Jest setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

// Set database URL for integration tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/employee_test';

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

import { Pool } from 'pg';
import { 
  Department, 
  Employee, 
  Skill, 
  CreateDepartmentInput, 
  CreateEmployeeInput, 
  CreateSkillInput,
  SkillCategory 
} from '../src/types';
import { DepartmentModel } from '../src/models/Department';
import { EmployeeModel } from '../src/models/Employee';
import { SkillModel } from '../src/models/Skill';

// Test database connection - initialize immediately
const testPool: Pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Initialize models with test pool
DepartmentModel.initialize(testPool);
EmployeeModel.initialize(testPool);
SkillModel.initialize(testPool);

export const initTestDb = async (): Promise<Pool> => {
  return testPool;
};

export const closeTestDb = async (): Promise<void> => {
  if (testPool) {
    await testPool.end();
  }
};

export const cleanupTestDb = async (): Promise<void> => {
  const pool = await initTestDb();
  await pool.query('TRUNCATE TABLE employee_skills CASCADE');
  await pool.query('TRUNCATE TABLE capacity_history CASCADE');
  await pool.query('TRUNCATE TABLE employees CASCADE');
  await pool.query('TRUNCATE TABLE departments CASCADE');
  await pool.query('TRUNCATE TABLE skills CASCADE');
};

// Test helper functions
export const createTestDepartment = async (input?: Partial<CreateDepartmentInput>): Promise<Department> => {
  await initTestDb();
  const defaultInput: CreateDepartmentInput = {
    name: `Test Department ${Date.now()}`,
    description: 'Test department description',
    ...input
  };
  return DepartmentModel.create(defaultInput);
};

export const createTestSkill = async (input?: Partial<CreateSkillInput>): Promise<Skill> => {
  await initTestDb();
  const defaultInput: CreateSkillInput = {
    name: `Test Skill ${Date.now()}`,
    category: SkillCategory.TECHNICAL,
    description: 'Test skill description',
    ...input
  };
  return SkillModel.create(defaultInput);
};

export const createTestEmployee = async (departmentId: string, input?: Partial<CreateEmployeeInput>): Promise<Employee> => {
  await initTestDb();
  const defaultInput: CreateEmployeeInput = {
    firstName: 'Test',
    lastName: `Employee-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    departmentId,
    position: 'Test Position',
    hireDate: new Date(),
    ...input
  };
  return EmployeeModel.create(defaultInput);
};

// Export test pool and database wrapper for tests
export { testPool };

// Create a wrapper that provides the methods integration tests expect
export const testDb = {
  pool: testPool,
  async isConnected(): Promise<boolean> {
    try {
      const client = await testPool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch {
      return false;
    }
  },
  async query(text: string, params?: any[]): Promise<any> {
    return testPool.query(text, params);
  },
  async getClient() {
    return testPool.connect();
  }
};

// Setup and teardown helpers
beforeEach(async () => {
  await cleanupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});
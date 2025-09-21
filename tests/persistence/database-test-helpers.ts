/**
 * Database Test Helpers for Form Persistence Testing
 * Real PostgreSQL database utilities - NO MOCKS
 */

import { DatabaseService } from '../../src/database/database.service';
import { EmployeeService } from '../../src/services/employee.service';
import { DepartmentService } from '../../src/services/department.service';
import { ProjectService } from '../../src/services/project.service';
import { AllocationService } from '../../src/services/allocation.service';
import { CreateEmployeeRequest, Department } from '../../src/types/employee.types';
import {
  CreateProjectInput,
  CreateResourceAllocationInput,
  ProjectStatus
} from '../../src/types';

export interface TestDatabaseConnection {
  db: DatabaseService;
  employeeService: EmployeeService;
  departmentService: DepartmentService;
  projectService: ProjectService;
  allocationService: AllocationService;
}

/**
 * Initialize test database connection and services
 */
export async function initializeTestDatabase(): Promise<TestDatabaseConnection> {
  const db = DatabaseService.getInstance();

  // Force reconnect if not connected
  if (!db.isConnected()) {
    await db.connect();
  }

  const employeeService = new EmployeeService(db);
  const departmentService = new DepartmentService(db);
  const projectService = new ProjectService(db);
  const allocationService = new AllocationService(db);

  return {
    db,
    employeeService,
    departmentService,
    projectService,
    allocationService
  };
}

/**
 * Clean up all test data from database
 */
export async function cleanupTestDatabase(db: DatabaseService): Promise<void> {
  // Delete in reverse dependency order
  await db.query('DELETE FROM resource_allocations WHERE employee_id IN (SELECT id FROM employees WHERE email LIKE $1)', ['%@test.persistence%']);
  await db.query('DELETE FROM employees WHERE email LIKE $1', ['%@test.persistence%']);
  await db.query('DELETE FROM projects WHERE name LIKE $1', ['%Test Project%']);
  await db.query('DELETE FROM departments WHERE name LIKE $1', ['%Test Department%']);
  
  // Reset sequences (only for tables with serial columns)
  // Skip employees table since it uses UUID primary key, not serial
  // Skip departments table since it also might use UUID
  try {
    await db.query('SELECT setval(pg_get_serial_sequence(\'projects\', \'id\'), COALESCE(MAX(id), 1)) FROM projects');
    await db.query('SELECT setval(pg_get_serial_sequence(\'resource_allocations\', \'id\'), COALESCE(MAX(id), 1)) FROM resource_allocations');
  } catch (error: any) {
    console.log('Sequence reset skipped for UUID tables:', error.message);
  }
}

/**
 * Verify database record exists using raw SQL
 */
export async function verifyEmployeeExists(db: DatabaseService, employeeId: string): Promise<boolean> {
  const result = await db.query('SELECT 1 FROM employees WHERE id = $1', [employeeId]);
  return result.rows.length > 0;
}

/**
 * Verify database record matches expected data
 */
export async function verifyEmployeeData(
  db: DatabaseService, 
  employeeId: string, 
  expectedData: Partial<CreateEmployeeRequest>
): Promise<void> {
  const result = await db.query(`
    SELECT 
      first_name,
      last_name,
      email,
      position,
      department_id,
      salary,
      skills,
      is_active,
      hire_date,
      created_at,
      updated_at
    FROM employees 
    WHERE id = $1
  `, [employeeId]);

  expect(result.rows).toHaveLength(1);
  const employee = result.rows[0];

  if (expectedData.firstName) expect(employee.first_name).toBe(expectedData.firstName);
  if (expectedData.lastName) expect(employee.last_name).toBe(expectedData.lastName);
  if (expectedData.email) expect(employee.email).toBe(expectedData.email);
  if (expectedData.position) expect(employee.position).toBe(expectedData.position);
  if (expectedData.departmentId) expect(employee.department_id).toBe(expectedData.departmentId);
  if (expectedData.salary) expect(employee.salary).toBe(expectedData.salary);
  if (expectedData.skills) expect(employee.skills).toEqual(expectedData.skills);
}

/**
 * Create test department for form testing
 */
export async function createTestDepartment(
  departmentService: DepartmentService,
  overrides?: Partial<Department>
): Promise<any> {
  const departmentData = {
    name: `Test Department ${Date.now()}`,
    description: 'Department created for form persistence testing',
    ...overrides
  };

  return await departmentService.createDepartment(departmentData);
}

/**
 * Create test project for form testing
 */
export async function createTestProject(
  projectService: ProjectService,
  overrides?: Partial<CreateProjectInput>
): Promise<any> {
  const projectData: CreateProjectInput = {
    name: `Test Project ${Date.now()}`,
    description: 'Project created for form persistence testing',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: ProjectStatus.PLANNING,
    budget: 100000,
    ...overrides
  };

  return await projectService.createProject(projectData);
}

/**
 * Create test employee with valid department reference
 */
export async function createTestEmployee(
  employeeService: EmployeeService,
  departmentId: string,
  overrides?: Partial<CreateEmployeeRequest>
): Promise<any> {
  const employeeData: CreateEmployeeRequest = {
    firstName: 'Test',
    lastName: `Employee-${Date.now()}`,
    email: `test.employee.${Date.now()}@test.persistence`,
    position: 'Software Engineer',
    departmentId,
    salary: 75000,
    skills: ['JavaScript', 'TypeScript'],
    ...overrides
  };

  return await employeeService.createEmployee(employeeData);
}

/**
 * Verify data persists across database connection restarts
 */
export async function verifyDataPersistsAcrossRestart(
  recordId: number,
  tableName: string,
  idColumn: string = 'id'
): Promise<void> {
  // Disconnect current connection
  await DatabaseService.disconnect();
  
  // Create new connection
  const newDb = DatabaseService.getInstance();
  await newDb.connect();

  // Verify data still exists
  const result = await newDb.query(
    `SELECT 1 FROM ${tableName} WHERE ${idColumn} = $1`,
    [recordId]
  );

  expect(result.rows).toHaveLength(1);
}

/**
 * Test concurrent form submissions
 */
export async function testConcurrentFormSubmissions<T>(
  formDataArray: T[],
  submitFunction: (data: T) => Promise<any>
): Promise<any[]> {
  // Submit all forms concurrently
  const results = await Promise.all(
    formDataArray.map(formData => submitFunction(formData))
  );

  // Verify all submissions succeeded
  expect(results).toHaveLength(formDataArray.length);
  results.forEach(result => {
    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });

  return results;
}

/**
 * Verify referential integrity constraints
 */
export async function verifyReferentialIntegrity(
  db: DatabaseService,
  childTable: string,
  parentTable: string,
  foreignKeyColumn: string,
  parentIdColumn: string = 'id'
): Promise<void> {
  const result = await db.query(`
    SELECT c.${foreignKeyColumn}
    FROM ${childTable} c
    LEFT JOIN ${parentTable} p ON c.${foreignKeyColumn} = p.${parentIdColumn}
    WHERE p.${parentIdColumn} IS NULL AND c.${foreignKeyColumn} IS NOT NULL
  `);

  // Should have no orphaned records
  expect(result.rows).toHaveLength(0);
}

/**
 * Test database transaction rollback
 */
export async function testTransactionRollback(
  db: DatabaseService,
  testOperations: (client: any) => Promise<void>
): Promise<void> {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Execute test operations within transaction
    await testOperations(client);
    
    // Rollback transaction
    await client.query('ROLLBACK');
    
  } finally {
    client.release();
  }
}

/**
 * Measure query performance for form submissions
 */
export async function measureFormSubmissionPerformance<T>(
  formData: T,
  submitFunction: (data: T) => Promise<any>,
  maxExecutionTimeMs: number = 1000
): Promise<{ result: any; executionTime: number }> {
  const startTime = Date.now();
  
  const result = await submitFunction(formData);
  
  const executionTime = Date.now() - startTime;
  
  expect(executionTime).toBeLessThan(maxExecutionTimeMs);
  
  return { result, executionTime };
}

/**
 * Verify database constraints prevent invalid data
 */
export async function verifyConstraintEnforcement(
  db: DatabaseService,
  tableName: string,
  invalidData: Record<string, any>,
  expectedErrorMessage?: string
): Promise<void> {
  const columns = Object.keys(invalidData);
  const values = Object.values(invalidData);
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  
  const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
  
  await expect(
    db.query(query, values)
  ).rejects.toThrow(expectedErrorMessage);
}

/**
 * Count records in table with optional filter
 */
export async function countRecords(
  db: DatabaseService,
  tableName: string,
  whereClause?: string,
  params?: any[]
): Promise<number> {
  const query = `SELECT COUNT(*) as count FROM ${tableName}${whereClause ? ` WHERE ${whereClause}` : ''}`;
  const result = await db.query(query, params);
  return parseInt(result.rows[0].count);
}

/**
 * Verify audit trail/timestamps are properly maintained
 */
export async function verifyAuditTrail(
  db: DatabaseService,
  tableName: string,
  recordId: number,
  idColumn: string = 'id'
): Promise<void> {
  const result = await db.query(`
    SELECT created_at, updated_at
    FROM ${tableName}
    WHERE ${idColumn} = $1
  `, [recordId]);

  expect(result.rows).toHaveLength(1);
  const record = result.rows[0];

  expect(record.created_at).toBeInstanceOf(Date);
  expect(record.updated_at).toBeInstanceOf(Date);
  expect(record.created_at.getTime()).toBeLessThanOrEqual(record.updated_at.getTime());
}

/**
 * Test data validation at database level
 */
export async function testDatabaseValidation(
  db: DatabaseService,
  tableName: string,
  validData: Record<string, any>,
  invalidTestCases: Array<{
    name: string;
    data: Record<string, any>;
    expectedError?: string;
  }>
): Promise<void> {
  // First verify valid data works
  const validColumns = Object.keys(validData);
  const validValues = Object.values(validData);
  const validPlaceholders = validValues.map((_, index) => `$${index + 1}`).join(', ');
  
  const validQuery = `INSERT INTO ${tableName} (${validColumns.join(', ')}) VALUES (${validPlaceholders})`;
  await expect(db.query(validQuery, validValues)).resolves.toBeDefined();

  // Test invalid cases
  for (const testCase of invalidTestCases) {
    const columns = Object.keys(testCase.data);
    const values = Object.values(testCase.data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    await expect(
      db.query(query, values)
    ).rejects.toThrow();
  }
}

/**
 * Test bulk operations performance
 */
export async function testBulkOperationPerformance<T>(
  items: T[],
  batchSize: number,
  operationFunction: (batch: T[]) => Promise<void>,
  maxTotalTimeMs: number = 5000
): Promise<{ totalTime: number; batches: number }> {
  const startTime = Date.now();
  let batchCount = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await operationFunction(batch);
    batchCount++;
  }

  const totalTime = Date.now() - startTime;
  
  expect(totalTime).toBeLessThan(maxTotalTimeMs);
  
  return { totalTime, batches: batchCount };
}
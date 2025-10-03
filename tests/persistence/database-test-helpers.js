"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTestDatabase = initializeTestDatabase;
exports.cleanupTestDatabase = cleanupTestDatabase;
exports.verifyEmployeeExists = verifyEmployeeExists;
exports.verifyEmployeeData = verifyEmployeeData;
exports.createTestDepartment = createTestDepartment;
exports.createTestProject = createTestProject;
exports.createTestEmployee = createTestEmployee;
exports.verifyDataPersistsAcrossRestart = verifyDataPersistsAcrossRestart;
exports.testConcurrentFormSubmissions = testConcurrentFormSubmissions;
exports.verifyReferentialIntegrity = verifyReferentialIntegrity;
exports.testTransactionRollback = testTransactionRollback;
exports.measureFormSubmissionPerformance = measureFormSubmissionPerformance;
exports.verifyConstraintEnforcement = verifyConstraintEnforcement;
exports.countRecords = countRecords;
exports.verifyAuditTrail = verifyAuditTrail;
exports.testDatabaseValidation = testDatabaseValidation;
exports.testBulkOperationPerformance = testBulkOperationPerformance;
const database_service_1 = require("../../src/database/database.service");
const employee_service_1 = require("../../src/services/employee.service");
const department_service_1 = require("../../src/services/department.service");
const project_service_1 = require("../../src/services/project.service");
const allocation_service_1 = require("../../src/services/allocation.service");
const types_1 = require("../../src/types");
async function initializeTestDatabase() {
    const db = database_service_1.DatabaseService.getInstance();
    if (!db.isConnected()) {
        await db.connect();
    }
    const employeeService = new employee_service_1.EmployeeService(db);
    const departmentService = new department_service_1.DepartmentService(db);
    const projectService = new project_service_1.ProjectService(db);
    const allocationService = new allocation_service_1.AllocationService(db);
    return {
        db,
        employeeService,
        departmentService,
        projectService,
        allocationService
    };
}
async function cleanupTestDatabase(db) {
    await db.query('DELETE FROM resource_allocations WHERE employee_id IN (SELECT id FROM employees WHERE email LIKE $1)', ['%@test.persistence%']);
    await db.query('DELETE FROM employees WHERE email LIKE $1', ['%@test.persistence%']);
    await db.query('DELETE FROM projects WHERE name LIKE $1', ['%Test Project%']);
    await db.query('DELETE FROM departments WHERE name LIKE $1', ['%Test Department%']);
    try {
        await db.query('SELECT setval(pg_get_serial_sequence(\'projects\', \'id\'), COALESCE(MAX(id), 1)) FROM projects');
        await db.query('SELECT setval(pg_get_serial_sequence(\'resource_allocations\', \'id\'), COALESCE(MAX(id), 1)) FROM resource_allocations');
    }
    catch (error) {
        console.log('Sequence reset skipped for UUID tables:', error.message);
    }
}
async function verifyEmployeeExists(db, employeeId) {
    const result = await db.query('SELECT 1 FROM employees WHERE id = $1', [employeeId]);
    return result.rows.length > 0;
}
async function verifyEmployeeData(db, employeeId, expectedData) {
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
    if (expectedData.firstName)
        expect(employee.first_name).toBe(expectedData.firstName);
    if (expectedData.lastName)
        expect(employee.last_name).toBe(expectedData.lastName);
    if (expectedData.email)
        expect(employee.email).toBe(expectedData.email);
    if (expectedData.position)
        expect(employee.position).toBe(expectedData.position);
    if (expectedData.departmentId)
        expect(employee.department_id).toBe(expectedData.departmentId);
    if (expectedData.salary)
        expect(employee.salary).toBe(expectedData.salary);
    if (expectedData.skills)
        expect(employee.skills).toEqual(expectedData.skills);
}
async function createTestDepartment(departmentService, overrides) {
    const departmentData = {
        name: `Test Department ${Date.now()}`,
        description: 'Department created for form persistence testing',
        ...overrides
    };
    return await departmentService.createDepartment(departmentData);
}
async function createTestProject(projectService, overrides) {
    const projectData = {
        name: `Test Project ${Date.now()}`,
        description: 'Project created for form persistence testing',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: types_1.ProjectStatus.PLANNING,
        budget: 100000,
        ...overrides
    };
    return await projectService.createProject(projectData);
}
async function createTestEmployee(employeeService, departmentId, overrides) {
    const employeeData = {
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
async function verifyDataPersistsAcrossRestart(recordId, tableName, idColumn = 'id') {
    await database_service_1.DatabaseService.disconnect();
    const newDb = database_service_1.DatabaseService.getInstance();
    await newDb.connect();
    const result = await newDb.query(`SELECT 1 FROM ${tableName} WHERE ${idColumn} = $1`, [recordId]);
    expect(result.rows).toHaveLength(1);
}
async function testConcurrentFormSubmissions(formDataArray, submitFunction) {
    const results = await Promise.all(formDataArray.map(formData => submitFunction(formData)));
    expect(results).toHaveLength(formDataArray.length);
    results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.id).toBeGreaterThan(0);
    });
    return results;
}
async function verifyReferentialIntegrity(db, childTable, parentTable, foreignKeyColumn, parentIdColumn = 'id') {
    const result = await db.query(`
    SELECT c.${foreignKeyColumn}
    FROM ${childTable} c
    LEFT JOIN ${parentTable} p ON c.${foreignKeyColumn} = p.${parentIdColumn}
    WHERE p.${parentIdColumn} IS NULL AND c.${foreignKeyColumn} IS NOT NULL
  `);
    expect(result.rows).toHaveLength(0);
}
async function testTransactionRollback(db, testOperations) {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        await testOperations(client);
        await client.query('ROLLBACK');
    }
    finally {
        client.release();
    }
}
async function measureFormSubmissionPerformance(formData, submitFunction, maxExecutionTimeMs = 1000) {
    const startTime = Date.now();
    const result = await submitFunction(formData);
    const executionTime = Date.now() - startTime;
    expect(executionTime).toBeLessThan(maxExecutionTimeMs);
    return { result, executionTime };
}
async function verifyConstraintEnforcement(db, tableName, invalidData, expectedErrorMessage) {
    const columns = Object.keys(invalidData);
    const values = Object.values(invalidData);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    await expect(db.query(query, values)).rejects.toThrow(expectedErrorMessage);
}
async function countRecords(db, tableName, whereClause, params) {
    const query = `SELECT COUNT(*) as count FROM ${tableName}${whereClause ? ` WHERE ${whereClause}` : ''}`;
    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
}
async function verifyAuditTrail(db, tableName, recordId, idColumn = 'id') {
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
async function testDatabaseValidation(db, tableName, validData, invalidTestCases) {
    const validColumns = Object.keys(validData);
    const validValues = Object.values(validData);
    const validPlaceholders = validValues.map((_, index) => `$${index + 1}`).join(', ');
    const validQuery = `INSERT INTO ${tableName} (${validColumns.join(', ')}) VALUES (${validPlaceholders})`;
    await expect(db.query(validQuery, validValues)).resolves.toBeDefined();
    for (const testCase of invalidTestCases) {
        const columns = Object.keys(testCase.data);
        const values = Object.values(testCase.data);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
        const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        await expect(db.query(query, values)).rejects.toThrow();
    }
}
async function testBulkOperationPerformance(items, batchSize, operationFunction, maxTotalTimeMs = 5000) {
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
//# sourceMappingURL=database-test-helpers.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureTestTables = exports.resetTestSequences = exports.getTestDatabase = exports.cleanupTestData = exports.createTestEmployee = exports.createTestSkill = exports.createTestDepartment = void 0;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
jest.setTimeout(30000);
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
const database_service_1 = require("../src/database/database.service");
const types_1 = require("../src/types");
let testDb;
beforeAll(async () => {
    testDb = database_service_1.DatabaseService.getInstance();
    await testDb.connect();
});
afterAll(async () => {
    await database_service_1.DatabaseService.disconnect();
});
const generateTestId = () => {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
const now = () => new Date();
const createTestDepartment = async (input) => {
    const departmentData = {
        name: input?.name || `Test Department ${Date.now()}`,
        description: input?.description || 'Test department description',
        managerId: input?.managerId || undefined
    };
    const result = await testDb.query(`
    INSERT INTO departments (name, description, manager_id, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
        departmentData.name,
        departmentData.description,
        departmentData.managerId,
        true,
        now(),
        now()
    ]);
    return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        description: result.rows[0].description,
        managerId: result.rows[0].manager_id,
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
    };
};
exports.createTestDepartment = createTestDepartment;
const createTestSkill = async (input) => {
    const skillData = {
        name: input?.name || `Test Skill ${Date.now()}`,
        category: input?.category || types_1.SkillCategory.TECHNICAL,
        description: input?.description || 'Test skill description'
    };
    const result = await testDb.query(`
    INSERT INTO skills (name, category, description, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
        skillData.name,
        skillData.category,
        skillData.description,
        true,
        now(),
        now()
    ]);
    return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        category: result.rows[0].category,
        description: result.rows[0].description,
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
    };
};
exports.createTestSkill = createTestSkill;
const createTestEmployee = async (departmentId, input) => {
    const employeeData = {
        firstName: input?.firstName || 'Test',
        lastName: input?.lastName || `Employee-${Date.now()}`,
        email: input?.email || `test-${Date.now()}@example.com`,
        departmentId,
        position: input?.position || 'Test Position',
        hireDate: input?.hireDate || now()
    };
    const result = await testDb.query(`
    INSERT INTO employees (first_name, last_name, email, department_id, position, hire_date, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
        employeeData.firstName,
        employeeData.lastName,
        employeeData.email,
        employeeData.departmentId,
        employeeData.position,
        employeeData.hireDate,
        true,
        now(),
        now()
    ]);
    return {
        id: result.rows[0].id,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        email: result.rows[0].email,
        departmentId: result.rows[0].department_id,
        position: result.rows[0].position,
        hireDate: result.rows[0].hire_date,
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
    };
};
exports.createTestEmployee = createTestEmployee;
const cleanupTestData = async (patterns = ['test-%']) => {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('cleanupTestData can only be called in test environment');
    }
    for (const pattern of patterns) {
        try {
            await testDb.query('DELETE FROM employee_skills WHERE employee_id LIKE $1', [pattern]);
            await testDb.query('DELETE FROM resource_assignments WHERE employee_id LIKE $1', [pattern]);
            await testDb.query('DELETE FROM capacity_history WHERE employee_id LIKE $1', [pattern]);
            await testDb.query('DELETE FROM employees WHERE id LIKE $1', [pattern]);
            await testDb.query('DELETE FROM projects WHERE id LIKE $1', [pattern]);
            await testDb.query('DELETE FROM skills WHERE id LIKE $1', [pattern]);
            await testDb.query('DELETE FROM departments WHERE id LIKE $1', [pattern]);
            await testDb.query('DELETE FROM capacity_bottlenecks WHERE id LIKE $1', [pattern]);
        }
        catch (error) {
            console.warn(`Cleanup warning for pattern ${pattern}:`, error);
        }
    }
};
exports.cleanupTestData = cleanupTestData;
const getTestDatabase = () => {
    if (!testDb) {
        throw new Error('Test database not initialized. Make sure setup is imported.');
    }
    return testDb;
};
exports.getTestDatabase = getTestDatabase;
const resetTestSequences = async () => {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('resetTestSequences can only be called in test environment');
    }
    try {
        await testDb.query('ALTER SEQUENCE IF EXISTS employees_id_seq RESTART WITH 1000');
        await testDb.query('ALTER SEQUENCE IF EXISTS departments_id_seq RESTART WITH 1000');
        await testDb.query('ALTER SEQUENCE IF EXISTS skills_id_seq RESTART WITH 1000');
        await testDb.query('ALTER SEQUENCE IF EXISTS projects_id_seq RESTART WITH 1000');
    }
    catch (error) {
        console.warn('Sequence reset warning:', error);
    }
};
exports.resetTestSequences = resetTestSequences;
beforeEach(async () => {
    if (testDb) {
        await (0, exports.cleanupTestData)();
    }
});
const ensureTestTables = async () => {
    if (process.env.NODE_ENV !== 'test') {
        return;
    }
    try {
        await testDb.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        manager_id INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await testDb.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await testDb.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        department_id INTEGER REFERENCES departments(id),
        position VARCHAR(255),
        hire_date DATE,
        is_active BOOLEAN DEFAULT true,
        weekly_hours INTEGER DEFAULT 40,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await testDb.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE,
        end_date DATE,
        status VARCHAR(100) DEFAULT 'planning',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await testDb.query(`
      CREATE TABLE IF NOT EXISTS resource_assignments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id),
        employee_id INTEGER,
        planned_allocation_percentage DECIMAL(5,2),
        start_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR(100) DEFAULT 'planned',
        planned_hours_per_week DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await testDb.query(`
      CREATE TABLE IF NOT EXISTS employee_skills (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER,
        skill_id INTEGER,
        proficiency_level VARCHAR(100),
        years_of_experience INTEGER,
        last_assessed DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await testDb.query(`
      CREATE TABLE IF NOT EXISTS capacity_history (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(255),
        date DATE NOT NULL,
        available_hours DECIMAL(5,2),
        allocated_hours DECIMAL(5,2),
        utilization_rate DECIMAL(5,4),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await testDb.query(`
      CREATE TABLE IF NOT EXISTS capacity_bottlenecks (
        id VARCHAR(255) PRIMARY KEY,
        bottleneck_type VARCHAR(100),
        affected_resource VARCHAR(255),
        severity VARCHAR(100),
        impact_score DECIMAL(5,2),
        estimated_duration INTEGER,
        affected_projects TEXT,
        root_causes TEXT,
        resolution_actions TEXT,
        status VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await testDb.query(`
      CREATE TABLE IF NOT EXISTS project_skill_requirements (
        id SERIAL PRIMARY KEY,
        project_id INTEGER,
        skill_id VARCHAR(255),
        required_level VARCHAR(100),
        quantity_needed INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('Test tables ensured successfully');
    }
    catch (error) {
        console.warn('Error ensuring test tables:', error);
    }
};
exports.ensureTestTables = ensureTestTables;
if (process.env.NODE_ENV === 'test') {
    setTimeout(async () => {
        if (testDb) {
            await (0, exports.ensureTestTables)();
        }
    }, 1000);
}
//# sourceMappingURL=setup-unit.js.map
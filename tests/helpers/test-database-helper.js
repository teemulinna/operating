"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestDatabaseHelper = void 0;
const database_service_1 = require("../../src/database/database.service");
class TestDatabaseHelper {
    static async initialize() {
        if (this.initialized)
            return;
        this.db = database_service_1.DatabaseService.getInstance();
        await this.db.connect();
        await this.ensureTestEnvironment();
        await this.createTestTables();
        this.initialized = true;
        console.log('✅ Test database helper initialized with real database connection');
    }
    static async cleanup() {
        if (!this.db)
            return;
        await this.cleanAllTestData();
        await database_service_1.DatabaseService.disconnect();
        this.initialized = false;
        console.log('✅ Test database helper cleaned up');
    }
    static getDatabase() {
        if (!this.db || !this.initialized) {
            throw new Error('Test database helper not initialized. Call initialize() first.');
        }
        return this.db;
    }
    static async ensureTestEnvironment() {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('TestDatabaseHelper can only be used in test environment');
        }
        const result = await this.db.query('SELECT current_database()');
        const dbName = result.rows[0].current_database;
        if (!dbName.includes('test')) {
            console.warn(`⚠️  Warning: Connected to database '${dbName}' which doesn't appear to be a test database`);
        }
        console.log(`🔗 Connected to test database: ${dbName}`);
    }
    static async createTestTables() {
        const tables = [
            {
                name: 'departments',
                sql: `
          CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            manager_id INTEGER,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
            },
            {
                name: 'skills',
                sql: `
          CREATE TABLE IF NOT EXISTS skills (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            category VARCHAR(100) NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
            },
            {
                name: 'employees',
                sql: `
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
            max_capacity_hours INTEGER DEFAULT 40,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
            },
            {
                name: 'projects',
                sql: `
          CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            start_date DATE,
            end_date DATE,
            status VARCHAR(100) DEFAULT 'planning',
            budget DECIMAL(12,2),
            priority VARCHAR(50) DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
            },
            {
                name: 'resource_assignments',
                sql: `
          CREATE TABLE IF NOT EXISTS resource_assignments (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id),
            employee_id INTEGER REFERENCES employees(id),
            planned_allocation_percentage DECIMAL(5,2),
            start_date DATE NOT NULL,
            end_date DATE,
            status VARCHAR(100) DEFAULT 'planned',
            planned_hours_per_week DECIMAL(5,2),
            role_on_project VARCHAR(255),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
            },
            {
                name: 'resource_allocations',
                sql: `
          CREATE TABLE IF NOT EXISTS resource_allocations (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id),
            employee_id INTEGER REFERENCES employees(id),
            allocated_hours DECIMAL(5,2),
            start_date DATE NOT NULL,
            end_date DATE,
            status VARCHAR(100) DEFAULT 'tentative',
            role_on_project VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
            },
            {
                name: 'employee_skills',
                sql: `
          CREATE TABLE IF NOT EXISTS employee_skills (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id),
            skill_id INTEGER REFERENCES skills(id),
            proficiency_level VARCHAR(100),
            years_of_experience INTEGER,
            last_assessed DATE,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, skill_id)
          )
        `
            },
            {
                name: 'capacity_history',
                sql: `
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
        `
            },
            {
                name: 'capacity_bottlenecks',
                sql: `
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
        `
            },
            {
                name: 'project_skill_requirements',
                sql: `
          CREATE TABLE IF NOT EXISTS project_skill_requirements (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id),
            skill_id VARCHAR(255),
            required_level VARCHAR(100),
            quantity_needed INTEGER,
            priority VARCHAR(50) DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
            }
        ];
        for (const table of tables) {
            try {
                await this.db.query(table.sql);
                console.log(`✅ Table '${table.name}' ready`);
            }
            catch (error) {
                console.error(`❌ Error creating table '${table.name}':`, error);
                throw error;
            }
        }
    }
    static async cleanAllTestData() {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('cleanAllTestData can only be called in test environment');
        }
        const cleanupQueries = [
            'DELETE FROM project_skill_requirements WHERE project_id < 1000 OR skill_id LIKE \'test-%\'',
            'DELETE FROM capacity_bottlenecks WHERE id LIKE \'test-%\'',
            'DELETE FROM capacity_history WHERE employee_id LIKE \'test-%\'',
            'DELETE FROM employee_skills WHERE employee_id < 1000 OR skill_id < 1000',
            'DELETE FROM resource_allocations WHERE employee_id < 1000 OR project_id < 1000',
            'DELETE FROM resource_assignments WHERE employee_id < 1000 OR project_id < 1000',
            'DELETE FROM employees WHERE id < 1000 OR email LIKE \'%test%\' OR email LIKE \'%example.com\'',
            'DELETE FROM projects WHERE id < 1000 OR name LIKE \'Test %\'',
            'DELETE FROM skills WHERE id < 1000 OR name LIKE \'Test %\'',
            'DELETE FROM departments WHERE id < 1000 OR name LIKE \'Test %\''
        ];
        for (const query of cleanupQueries) {
            try {
                const result = await this.db.query(query);
                if (result.rowCount && result.rowCount > 0) {
                    console.log(`🧹 Cleaned ${result.rowCount} rows: ${query.split(' ')[2]}`);
                }
            }
            catch (error) {
                console.warn(`Warning during cleanup: ${query}`, error);
            }
        }
        await this.resetSequences();
    }
    static async resetSequences() {
        const sequences = [
            'departments_id_seq',
            'skills_id_seq',
            'employees_id_seq',
            'projects_id_seq',
            'resource_assignments_id_seq',
            'resource_allocations_id_seq',
            'employee_skills_id_seq',
            'capacity_history_id_seq',
            'project_skill_requirements_id_seq'
        ];
        for (const seq of sequences) {
            try {
                await this.db.query(`ALTER SEQUENCE IF EXISTS ${seq} RESTART WITH 1000`);
            }
            catch (error) {
                console.warn(`Sequence ${seq} might not exist:`, error.message);
            }
        }
        console.log('🔄 Test sequences reset to start from 1000');
    }
    static async seedBasicTestData() {
        const deptResult = await this.db.query(`
      INSERT INTO departments (name, description, is_active)
      VALUES ('Test Engineering', 'Test engineering department', true)
      RETURNING id
    `);
        const departmentId = deptResult.rows[0].id;
        const skillResult = await this.db.query(`
      INSERT INTO skills (name, category, description, is_active)
      VALUES ('Test JavaScript', 'technical', 'JavaScript programming', true)
      RETURNING id
    `);
        const skillId = skillResult.rows[0].id;
        const empResult = await this.db.query(`
      INSERT INTO employees (first_name, last_name, email, department_id, position, weekly_hours, is_active)
      VALUES ('Test', 'Developer', 'test.developer@example.com', $1, 'Senior Developer', 40, true)
      RETURNING id
    `, [departmentId]);
        const employeeId = empResult.rows[0].id;
        const projResult = await this.db.query(`
      INSERT INTO projects (name, description, start_date, end_date, status)
      VALUES ('Test Project Alpha', 'Test project for allocation testing', '2024-01-01', '2024-12-31', 'active')
      RETURNING id
    `);
        const projectId = projResult.rows[0].id;
        console.log(`🌱 Seeded basic test data: dept(${departmentId}), emp(${employeeId}), proj(${projectId}), skill(${skillId})`);
        return {
            departmentId: departmentId.toString(),
            employeeId: employeeId.toString(),
            projectId: projectId.toString(),
            skillId: skillId.toString()
        };
    }
    static async verifyTestEnvironment() {
        const healthCheck = await this.db.query('SELECT 1 as health');
        if (!healthCheck.rows[0]?.health) {
            throw new Error('Database health check failed');
        }
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('Not in test environment');
        }
        const dbResult = await this.db.query('SELECT current_database()');
        const dbName = dbResult.rows[0].current_database;
        if (!dbName.includes('test')) {
            console.warn(`⚠️  Database name '${dbName}' doesn't contain 'test'`);
        }
        console.log('✅ Test environment verified');
    }
    static async getTableRowCount(tableName) {
        const result = await this.db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        return parseInt(result.rows[0].count);
    }
    static async getTestDataStats() {
        const tables = [
            'departments', 'skills', 'employees', 'projects',
            'resource_assignments', 'resource_allocations', 'employee_skills',
            'capacity_history', 'capacity_bottlenecks', 'project_skill_requirements'
        ];
        const stats = {};
        for (const table of tables) {
            try {
                stats[table] = await this.getTableRowCount(table);
            }
            catch (error) {
                stats[table] = 0;
            }
        }
        return stats;
    }
    static async executeQuery(sql, params) {
        return await this.db.query(sql, params);
    }
    static async beginTransaction() {
        await this.db.query('BEGIN');
    }
    static async commitTransaction() {
        await this.db.query('COMMIT');
    }
    static async rollbackTransaction() {
        await this.db.query('ROLLBACK');
    }
}
exports.TestDatabaseHelper = TestDatabaseHelper;
TestDatabaseHelper.initialized = false;
//# sourceMappingURL=test-database-helper.js.map
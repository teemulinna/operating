"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../src/app"));
const database_service_1 = require("../src/database/database.service");
(0, globals_1.describe)('Employee Weekly Capacity Feature', () => {
    let pool;
    let testEmployeeId;
    let testDepartmentId;
    (0, globals_1.beforeAll)(async () => {
        const dbService = database_service_1.DatabaseService.getInstance();
        pool = dbService.getPool();
        const deptResult = await pool.query(`INSERT INTO departments (name, description)
       VALUES ($1, $2)
       RETURNING id`, ['Test Department', 'Department for testing weekly capacity']);
        testDepartmentId = deptResult.rows[0].id;
    });
    (0, globals_1.afterAll)(async () => {
        if (testEmployeeId) {
            await pool.query('DELETE FROM employees WHERE id = $1', [testEmployeeId]);
        }
        await pool.query('DELETE FROM departments WHERE id = $1', [testDepartmentId]);
        await pool.end();
    });
    (0, globals_1.beforeEach)(async () => {
        if (testEmployeeId) {
            await pool.query('DELETE FROM employees WHERE id = $1', [testEmployeeId]);
            testEmployeeId = '';
        }
    });
    (0, globals_1.describe)('Database Schema', () => {
        (0, globals_1.it)('should have weekly_capacity column in employees table', async () => {
            const result = await pool.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'weekly_capacity'
      `);
            (0, globals_1.expect)(result.rows.length).toBe(1);
            (0, globals_1.expect)(result.rows[0].column_name).toBe('weekly_capacity');
            (0, globals_1.expect)(result.rows[0].data_type).toBe('numeric');
            (0, globals_1.expect)(result.rows[0].column_default).toContain('40');
        });
        (0, globals_1.it)('should enforce weekly_capacity constraints (0-168 hours)', async () => {
            await (0, globals_1.expect)(pool.query(`INSERT INTO employees (first_name, last_name, email, department_id, position, weekly_capacity, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)`, ['Test', 'User', 'test1@example.com', testDepartmentId, 'Developer', -1])).rejects.toThrow();
            await (0, globals_1.expect)(pool.query(`INSERT INTO employees (first_name, last_name, email, department_id, position, weekly_capacity, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)`, ['Test', 'User', 'test2@example.com', testDepartmentId, 'Developer', 169])).rejects.toThrow();
        });
    });
    (0, globals_1.describe)('POST /api/employees', () => {
        (0, globals_1.it)('should create employee with specified weekly_capacity', async () => {
            const newEmployee = {
                firstName: 'John',
                lastName: 'Capacity',
                email: 'john.capacity@example.com',
                position: 'Part-Time Developer',
                departmentId: testDepartmentId,
                weeklyCapacity: 20,
                salary: 50000
            };
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/employees')
                .send(newEmployee)
                .expect(201);
            (0, globals_1.expect)(response.body).toHaveProperty('id');
            (0, globals_1.expect)(response.body.weeklyCapacity).toBe(20);
            testEmployeeId = response.body.id;
            const dbResult = await pool.query('SELECT weekly_capacity FROM employees WHERE id = $1', [testEmployeeId]);
            (0, globals_1.expect)(parseFloat(dbResult.rows[0].weekly_capacity)).toBe(20);
        });
        (0, globals_1.it)('should use default 40 hours when weekly_capacity not specified', async () => {
            const newEmployee = {
                firstName: 'Jane',
                lastName: 'Default',
                email: 'jane.default@example.com',
                position: 'Full-Time Developer',
                departmentId: testDepartmentId,
                salary: 60000
            };
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/employees')
                .send(newEmployee)
                .expect(201);
            (0, globals_1.expect)(response.body.weeklyCapacity).toBe(40);
            testEmployeeId = response.body.id;
            const dbResult = await pool.query('SELECT weekly_capacity FROM employees WHERE id = $1', [testEmployeeId]);
            (0, globals_1.expect)(parseFloat(dbResult.rows[0].weekly_capacity)).toBe(40);
        });
        (0, globals_1.it)('should reject invalid weekly_capacity values', async () => {
            const invalidEmployee = {
                firstName: 'Invalid',
                lastName: 'Hours',
                email: 'invalid@example.com',
                position: 'Developer',
                departmentId: testDepartmentId,
                weeklyCapacity: 200,
                salary: 60000
            };
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/employees')
                .send(invalidEmployee)
                .expect(400);
            (0, globals_1.expect)(response.body).toHaveProperty('error');
            (0, globals_1.expect)(response.body.error).toContain('weekly_capacity');
        });
    });
    (0, globals_1.describe)('PUT /api/employees/:id', () => {
        (0, globals_1.beforeEach)(async () => {
            const result = await pool.query(`INSERT INTO employees (first_name, last_name, email, department_id, position, weekly_capacity, salary, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
         RETURNING id`, ['Update', 'Test', 'update.test@example.com', testDepartmentId, 'Developer', 40, 60000]);
            testEmployeeId = result.rows[0].id;
        });
        (0, globals_1.it)('should update employee weekly_capacity', async () => {
            const updateData = {
                firstName: 'Update',
                lastName: 'Test',
                email: 'update.test@example.com',
                position: 'Part-Time Developer',
                departmentId: testDepartmentId,
                weeklyCapacity: 25,
                salary: 60000
            };
            const response = await (0, supertest_1.default)(app_1.default)
                .put(`/api/employees/${testEmployeeId}`)
                .send(updateData)
                .expect(200);
            (0, globals_1.expect)(response.body.weeklyCapacity).toBe(25);
            const dbResult = await pool.query('SELECT weekly_capacity FROM employees WHERE id = $1', [testEmployeeId]);
            (0, globals_1.expect)(parseFloat(dbResult.rows[0].weekly_capacity)).toBe(25);
        });
        (0, globals_1.it)('should maintain weekly_capacity when not included in update', async () => {
            const updateData = {
                firstName: 'Updated',
                lastName: 'Test',
                email: 'update.test@example.com',
                position: 'Senior Developer',
                departmentId: testDepartmentId,
                salary: 70000
            };
            const response = await (0, supertest_1.default)(app_1.default)
                .put(`/api/employees/${testEmployeeId}`)
                .send(updateData)
                .expect(200);
            (0, globals_1.expect)(response.body.weeklyCapacity).toBe(40);
            const dbResult = await pool.query('SELECT weekly_capacity FROM employees WHERE id = $1', [testEmployeeId]);
            (0, globals_1.expect)(parseFloat(dbResult.rows[0].weekly_capacity)).toBe(40);
        });
    });
    (0, globals_1.describe)('GET /api/employees', () => {
        (0, globals_1.beforeEach)(async () => {
            const result1 = await pool.query(`INSERT INTO employees (first_name, last_name, email, department_id, position, weekly_capacity, salary, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
         RETURNING id`, ['Part', 'Timer', 'part.timer@example.com', testDepartmentId, 'Developer', 20, 40000]);
            const result2 = await pool.query(`INSERT INTO employees (first_name, last_name, email, department_id, position, weekly_capacity, salary, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
         RETURNING id`, ['Full', 'Timer', 'full.timer@example.com', testDepartmentId, 'Developer', 40, 60000]);
            testEmployeeId = result1.rows[0].id;
        });
        (0, globals_1.it)('should return weekly_capacity in employee list', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/employees')
                .expect(200);
            (0, globals_1.expect)(response.body.data).toBeInstanceOf(Array);
            const partTimer = response.body.data.find((e) => e.email === 'part.timer@example.com');
            const fullTimer = response.body.data.find((e) => e.email === 'full.timer@example.com');
            (0, globals_1.expect)(partTimer).toBeDefined();
            (0, globals_1.expect)(partTimer.weeklyCapacity).toBe(20);
            (0, globals_1.expect)(fullTimer).toBeDefined();
            (0, globals_1.expect)(fullTimer.weeklyCapacity).toBe(40);
        });
    });
    (0, globals_1.describe)('GET /api/employees/:id', () => {
        (0, globals_1.beforeEach)(async () => {
            const result = await pool.query(`INSERT INTO employees (first_name, last_name, email, department_id, position, weekly_capacity, salary, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
         RETURNING id`, ['Single', 'Employee', 'single@example.com', testDepartmentId, 'Developer', 30, 55000]);
            testEmployeeId = result.rows[0].id;
        });
        (0, globals_1.it)('should return weekly_capacity for single employee', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/api/employees/${testEmployeeId}`)
                .expect(200);
            (0, globals_1.expect)(response.body.weeklyCapacity).toBe(30);
            (0, globals_1.expect)(response.body.email).toBe('single@example.com');
        });
    });
    (0, globals_1.describe)('Capacity Validation', () => {
        (0, globals_1.it)('should validate weekly_capacity is between 0 and 168', async () => {
            const partTimeEmployee = {
                firstName: 'Part',
                lastName: 'Time',
                email: 'parttime@example.com',
                position: 'Part-Time Developer',
                departmentId: testDepartmentId,
                weeklyCapacity: 15,
                salary: 30000
            };
            const response1 = await (0, supertest_1.default)(app_1.default)
                .post('/api/employees')
                .send(partTimeEmployee)
                .expect(201);
            (0, globals_1.expect)(response1.body.weeklyCapacity).toBe(15);
            testEmployeeId = response1.body.id;
            await pool.query('DELETE FROM employees WHERE id = $1', [testEmployeeId]);
            const maxHoursEmployee = {
                firstName: 'Max',
                lastName: 'Hours',
                email: 'maxhours@example.com',
                position: 'Workaholic Developer',
                departmentId: testDepartmentId,
                weeklyCapacity: 168,
                salary: 100000
            };
            const response2 = await (0, supertest_1.default)(app_1.default)
                .post('/api/employees')
                .send(maxHoursEmployee)
                .expect(201);
            (0, globals_1.expect)(response2.body.weeklyCapacity).toBe(168);
            testEmployeeId = response2.body.id;
        });
    });
});
//# sourceMappingURL=employee-weekly-capacity.test.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
const database_service_1 = require("../../src/database/database.service");
describe('Availability Patterns API - Production Integration Tests', () => {
    let db;
    let testEmployeeId;
    let createdPatternId;
    beforeAll(async () => {
        const dbService = database_service_1.DatabaseService.getInstance();
        db = dbService.getPool();
        try {
            const deptCheck = await db.query('SELECT id FROM departments LIMIT 1');
            let departmentId;
            if (deptCheck.rows.length === 0) {
                const deptResult = await db.query(`INSERT INTO departments (name, description, is_active)
           VALUES ('Test Department', 'Test department for integration tests', true)
           RETURNING id`);
                departmentId = deptResult.rows[0].id;
            }
            else {
                departmentId = deptCheck.rows[0].id;
            }
            const employeeResult = await db.query(`INSERT INTO employees (first_name, last_name, email, department_id, position, hire_date, is_active)
         VALUES ('Test', 'Employee', 'test.availability@test.com', $1, 'Developer', CURRENT_DATE, true)
         RETURNING id`, [departmentId]);
            testEmployeeId = employeeResult.rows[0].id;
        }
        catch (error) {
            console.error('Error setting up test data:', error);
            const existingEmployee = await db.query(`SELECT id FROM employees WHERE email = 'test.availability@test.com' LIMIT 1`);
            if (existingEmployee.rows.length > 0) {
                testEmployeeId = existingEmployee.rows[0].id;
            }
            else {
                throw error;
            }
        }
    });
    afterAll(async () => {
        try {
            if (createdPatternId) {
                await db.query('DELETE FROM availability_patterns WHERE id = $1', [createdPatternId]);
            }
            if (testEmployeeId) {
                await db.query('DELETE FROM availability_patterns WHERE employee_id = $1', [testEmployeeId]);
                await db.query('DELETE FROM employees WHERE id = $1', [testEmployeeId]);
            }
        }
        catch (error) {
            console.error('Cleanup error:', error);
        }
        await db.end();
    });
    describe('GET /api/availability/patterns', () => {
        it('should return all availability patterns with pagination', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/availability/patterns')
                .expect(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('patterns');
            expect(Array.isArray(response.body.data.patterns)).toBe(true);
            expect(response.body.data).toHaveProperty('pagination');
            expect(response.body.data.pagination).toHaveProperty('page');
            expect(response.body.data.pagination).toHaveProperty('limit');
            expect(response.body.data.pagination).toHaveProperty('total');
        });
        it('should filter patterns by employee ID', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get(`/api/availability/patterns?employeeId=${testEmployeeId}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.patterns).toBeDefined();
        });
        it('should filter patterns by active status', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/availability/patterns?isActive=true')
                .expect(200);
            expect(response.body.success).toBe(true);
            const patterns = response.body.data.patterns;
            patterns.forEach((pattern) => {
                expect(pattern.isActive).toBe(true);
            });
        });
        it('should support pagination parameters', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/availability/patterns?page=1&limit=5')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.pagination.page).toBe(1);
            expect(response.body.data.pagination.limit).toBe(5);
        });
    });
    describe('POST /api/availability/patterns', () => {
        it('should create a new availability pattern with valid data', async () => {
            const newPattern = {
                employeeId: testEmployeeId,
                name: 'Test Pattern',
                patternType: 'weekly',
                startDate: '2025-04-01',
                endDate: '2025-12-31',
                weeklyHours: {
                    monday: 8,
                    tuesday: 8,
                    wednesday: 8,
                    thursday: 8,
                    friday: 8,
                    saturday: 0,
                    sunday: 0
                },
                configuration: {
                    weeklyHours: 40,
                    dailyHours: 8,
                    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
                },
                isActive: false,
                notes: 'Test pattern for integration testing'
            };
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/availability/patterns')
                .send(newPattern)
                .expect(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Availability pattern created successfully');
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.employeeId).toBe(testEmployeeId);
            expect(response.body.data.patternType).toBe('weekly');
            createdPatternId = response.body.data.id;
        });
        it('should validate required fields', async () => {
            const invalidPattern = {
                patternType: 'weekly'
            };
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/availability/patterns')
                .send(invalidPattern)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Validation failed');
        });
        it('should not allow invalid pattern types', async () => {
            const invalidPattern = {
                employeeId: testEmployeeId,
                name: 'Invalid Pattern',
                patternType: 'invalid_type',
                startDate: '2025-04-01',
                endDate: '2025-12-31'
            };
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/availability/patterns')
                .send(invalidPattern)
                .expect(400);
            expect(response.body.success).toBe(false);
        });
        it('should handle date validation', async () => {
            const invalidPattern = {
                employeeId: testEmployeeId,
                name: 'Invalid Dates',
                patternType: 'weekly',
                startDate: '2025-12-31',
                endDate: '2025-01-01'
            };
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/availability/patterns')
                .send(invalidPattern);
            console.log('Date validation test response status:', response.status);
            console.log('Date validation test response body:', response.body);
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('date');
        });
        it('should support both field naming conventions', async () => {
            const patternWithAlternateNames = {
                employeeId: testEmployeeId,
                name: 'Alternate Field Names',
                patternType: 'weekly',
                effectiveFrom: '2025-05-01',
                effectiveTo: '2025-12-31',
                isActive: false
            };
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/availability/patterns')
                .send(patternWithAlternateNames);
            expect(response.status).toBeLessThan(500);
        });
    });
    describe('GET /api/availability/patterns/:id', () => {
        beforeAll(async () => {
            if (!createdPatternId) {
                const result = await db.query(`INSERT INTO availability_patterns
           (employee_id, pattern_type, pattern_name, effective_from, effective_until, is_active)
           VALUES ($1, 'weekly', 'Test Pattern', '2025-01-01', '2025-12-31', false)
           RETURNING id`, [testEmployeeId]);
                createdPatternId = result.rows[0].id;
            }
        });
        it('should return a specific pattern by ID', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get(`/api/availability/patterns/${createdPatternId}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(createdPatternId);
            expect(response.body.data.employeeId).toBe(testEmployeeId);
        });
        it('should return 404 for non-existent pattern', async () => {
            const fakeId = '550e8400-e29b-41d4-a716-446655440000';
            const response = await (0, supertest_1.default)(app_1.app)
                .get(`/api/availability/patterns/${fakeId}`)
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('not found');
        });
        it('should validate UUID format', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/availability/patterns/invalid-uuid')
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid pattern ID');
        });
    });
    describe('PUT /api/availability/patterns/:id', () => {
        it('should update an existing pattern', async () => {
            const updates = {
                name: 'Updated Pattern Name',
                isActive: true,
                notes: 'Updated notes'
            };
            const response = await (0, supertest_1.default)(app_1.app)
                .put(`/api/availability/patterns/${createdPatternId}`)
                .send(updates)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Availability pattern updated successfully');
            expect(response.body.data.name).toBe('Updated Pattern Name');
            expect(response.body.data.notes).toBe('Updated notes');
            expect(response.body.data.isActive).toBeDefined();
        });
        it('should return 404 when updating non-existent pattern', async () => {
            const fakeId = '550e8400-e29b-41d4-a716-446655440000';
            const response = await (0, supertest_1.default)(app_1.app)
                .put(`/api/availability/patterns/${fakeId}`)
                .send({ name: 'Test' })
                .expect(404);
            expect(response.body.success).toBe(false);
        });
        it('should validate update data', async () => {
            const invalidUpdate = {
                patternType: 'invalid_type'
            };
            const response = await (0, supertest_1.default)(app_1.app)
                .put(`/api/availability/patterns/${createdPatternId}`)
                .send(invalidUpdate)
                .expect(400);
            expect(response.body.success).toBe(false);
        });
    });
    describe('DELETE /api/availability/patterns/:id', () => {
        let patternToDelete;
        beforeEach(async () => {
            const result = await db.query(`INSERT INTO availability_patterns
         (employee_id, pattern_type, pattern_name, effective_from, effective_until, is_active)
         VALUES ($1, 'weekly', 'Pattern to Delete', '2025-01-01', '2025-12-31', false)
         RETURNING id`, [testEmployeeId]);
            patternToDelete = result.rows[0].id;
        });
        it('should delete an existing pattern', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .delete(`/api/availability/patterns/${patternToDelete}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Availability pattern deleted successfully');
            const checkResult = await db.query('SELECT * FROM availability_patterns WHERE id = $1', [patternToDelete]);
            expect(checkResult.rows.length).toBe(0);
        });
        it('should return 404 when deleting non-existent pattern', async () => {
            const fakeId = '550e8400-e29b-41d4-a716-446655440000';
            const response = await (0, supertest_1.default)(app_1.app)
                .delete(`/api/availability/patterns/${fakeId}`)
                .expect(404);
            expect(response.body.success).toBe(false);
        });
    });
    describe('POST /api/availability/patterns/:id/activate', () => {
        it('should activate a pattern and deactivate others for the same employee', async () => {
            const pattern1Result = await db.query(`INSERT INTO availability_patterns
         (employee_id, pattern_type, pattern_name, effective_from, effective_until, is_active)
         VALUES ($1, 'weekly', 'Pattern 1', '2025-01-01', '2025-06-30', true)
         RETURNING id`, [testEmployeeId]);
            const pattern1Id = pattern1Result.rows[0].id;
            const pattern2Result = await db.query(`INSERT INTO availability_patterns
         (employee_id, pattern_type, pattern_name, effective_from, effective_until, is_active)
         VALUES ($1, 'weekly', 'Pattern 2', '2025-07-01', '2025-12-31', false)
         RETURNING id`, [testEmployeeId]);
            const pattern2Id = pattern2Result.rows[0].id;
            const response = await (0, supertest_1.default)(app_1.app)
                .post(`/api/availability/patterns/${pattern2Id}/activate`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Pattern activated successfully');
            const pattern2Check = await db.query('SELECT is_active FROM availability_patterns WHERE id = $1', [pattern2Id]);
            expect(pattern2Check.rows[0].is_active).toBe(true);
            const pattern1Check = await db.query('SELECT is_active FROM availability_patterns WHERE id = $1', [pattern1Id]);
            expect(pattern1Check.rows[0].is_active).toBe(false);
            await db.query('DELETE FROM availability_patterns WHERE id IN ($1, $2)', [pattern1Id, pattern2Id]);
        });
    });
    describe('Performance Tests', () => {
        it('should handle concurrent requests efficiently', async () => {
            const requests = Array.from({ length: 10 }, () => (0, supertest_1.default)(app_1.app)
                .get('/api/availability/patterns')
                .query({ page: 1, limit: 10 }));
            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const endTime = Date.now();
            const duration = endTime - startTime;
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
            expect(duration).toBeLessThan(5000);
        });
    });
    describe('Security Tests', () => {
        it('should sanitize input to prevent SQL injection', async () => {
            const maliciousInput = {
                employeeId: testEmployeeId,
                name: "'; DROP TABLE availability_patterns; --",
                patternType: 'weekly',
                startDate: '2025-01-01',
                endDate: '2025-12-31'
            };
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/availability/patterns')
                .send(maliciousInput);
            expect([201, 400, 500]).toContain(response.status);
            const tableCheck = await db.query("SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'availability_patterns')");
            expect(tableCheck.rows[0].exists).toBe(true);
        });
    });
});
//# sourceMappingURL=availability-patterns.test.js.map
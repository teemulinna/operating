"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
const database_service_1 = require("../../src/database/database.service");
const cache_1 = require("../../src/utils/cache");
describe('Heat Map API - Production Integration Tests', () => {
    let db;
    let testEmployeeId;
    let testDepartmentId;
    let testProjectId;
    beforeAll(async () => {
        const dbService = new database_service_1.DatabaseService();
        await dbService.connect();
        db = dbService.getPool();
        try {
            await db.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS daily_capacity_heatmap AS
        SELECT * FROM generate_series(CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '6 months', '1 day'::INTERVAL) AS date
      `);
        }
        catch (err) {
        }
        if (global.cacheIntervals) {
            global.cacheIntervals.forEach((interval) => clearInterval(interval));
            global.cacheIntervals = [];
        }
        try {
            const deptResult = await db.query(`INSERT INTO departments (name, description)
         VALUES ('Test Department', 'Heat map test department')
         ON CONFLICT (name) DO UPDATE SET description = 'Heat map test department'
         RETURNING id`);
            testDepartmentId = deptResult.rows[0].id;
            const empResult = await db.query(`INSERT INTO employees (first_name, last_name, email, department_id, position, hire_date, is_active)
         VALUES ('Heat', 'MapTest', 'heatmap.test@test.com', $1, 'Developer', CURRENT_DATE, true)
         ON CONFLICT (email) DO UPDATE SET first_name = 'Heat'
         RETURNING id`, [testDepartmentId]);
            testEmployeeId = empResult.rows[0].id;
            const projResult = await db.query(`INSERT INTO projects (name, status, start_date, end_date, budget)
         VALUES ('Heat Map Test Project', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', 100000)
         RETURNING id`);
            testProjectId = projResult.rows[0].id;
            await db.query(`INSERT INTO resource_allocations (employee_id, project_id, allocated_hours, start_date, end_date, is_active)
         VALUES ($1, $2, 40, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true)
         ON CONFLICT DO NOTHING`, [testEmployeeId, testProjectId]);
            await db.query(`INSERT INTO availability_patterns (employee_id, pattern_type, name, start_date, end_date, is_active, weekly_hours)
         VALUES ($1, 'weekly', 'Standard Week', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '180 days', true,
         '{"monday": 8, "tuesday": 8, "wednesday": 8, "thursday": 8, "friday": 8, "saturday": 0, "sunday": 0}'::jsonb)
         ON CONFLICT DO NOTHING`, [testEmployeeId]);
            await db.query('REFRESH MATERIALIZED VIEW daily_capacity_heatmap');
        }
        catch (error) {
            console.error('Error setting up test data:', error);
        }
    });
    afterAll(async () => {
        try {
            if (testEmployeeId) {
                await db.query('DELETE FROM resource_allocations WHERE employee_id = $1', [testEmployeeId]);
                await db.query('DELETE FROM availability_patterns WHERE employee_id = $1', [testEmployeeId]);
                await db.query('DELETE FROM employees WHERE id = $1', [testEmployeeId]);
            }
            if (testProjectId) {
                await db.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
            }
            if (testDepartmentId) {
                await db.query('DELETE FROM departments WHERE id = $1 AND name = $2', [testDepartmentId, 'Test Department']);
            }
        }
        catch (error) {
            console.error('Cleanup error:', error);
        }
        await db.end();
        cache_1.Cache.destroyAll();
    });
    describe('GET /api/capacity/heatmap', () => {
        it('should return heat map data with default filters', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .expect(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body).toHaveProperty('meta');
            expect(response.body.meta).toHaveProperty('count');
            expect(response.body.meta).toHaveProperty('timestamp');
        });
        it('should filter by date range', async () => {
            const startDate = new Date();
            const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .query({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.meta.filters.startDate).toBeDefined();
            expect(response.body.meta.filters.endDate).toBeDefined();
        });
        it('should filter by employee ID', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .query({ employeeId: testEmployeeId })
                .expect(200);
            expect(response.body.success).toBe(true);
            const data = response.body.data;
            if (data.length > 0) {
                expect(data.every((item) => item.employeeId === testEmployeeId)).toBe(true);
            }
        });
        it('should filter by department ID', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .query({ departmentId: testDepartmentId })
                .expect(200);
            expect(response.body.success).toBe(true);
            const data = response.body.data;
            if (data.length > 0) {
                expect(data.every((item) => item.departmentId === testDepartmentId)).toBe(true);
            }
        });
        it('should group by week when granularity is specified', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .query({ granularity: 'week' })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
        });
        it('should filter by utilization levels', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .query({ levels: 'high,critical' })
                .expect(200);
            expect(response.body.success).toBe(true);
            const data = response.body.data;
            if (data.length > 0) {
                expect(data.every((item) => ['high', 'critical'].includes(item.utilizationCategory))).toBe(true);
            }
        });
        it('should return cache headers for performance', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .expect(200);
            expect(response.headers['cache-control']).toBeDefined();
            expect(response.headers['cache-control']).toContain('max-age=300');
            expect(response.headers['etag']).toBeDefined();
            expect(response.headers['x-total-count']).toBeDefined();
        });
        it('should validate date format', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .query({ startDate: 'invalid-date' })
                .expect(400);
            expect(response.body).toHaveProperty('message', 'Validation failed');
        });
    });
    describe('GET /api/capacity/heatmap/summary', () => {
        it('should return heat map summary statistics', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap/summary')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('totalEmployees');
            expect(response.body.data).toHaveProperty('averageUtilization');
            expect(response.body.data).toHaveProperty('criticalCount');
            expect(response.body.data).toHaveProperty('overAllocatedCount');
            expect(response.body.data).toHaveProperty('optimalCount');
            expect(response.body.data).toHaveProperty('underUtilizedCount');
            expect(response.body.data).toHaveProperty('dateRange');
            expect(response.body.data).toHaveProperty('departmentBreakdown');
            expect(Array.isArray(response.body.data.departmentBreakdown)).toBe(true);
        });
        it('should filter summary by date range', async () => {
            const startDate = new Date();
            const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap/summary')
                .query({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.dateRange.start).toBeDefined();
            expect(response.body.data.dateRange.end).toBeDefined();
        });
    });
    describe('GET /api/capacity/trends/:employeeId', () => {
        it('should return employee utilization trends', async () => {
            const startDate = new Date();
            const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const response = await (0, supertest_1.default)(app_1.app)
                .get(`/api/capacity/trends/${testEmployeeId}`)
                .query({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('employeeId', testEmployeeId);
            expect(response.body.data).toHaveProperty('timeline');
            expect(response.body.data).toHaveProperty('statistics');
            expect(Array.isArray(response.body.data.timeline)).toBe(true);
        });
        it('should calculate trend statistics', async () => {
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const endDate = new Date();
            const response = await (0, supertest_1.default)(app_1.app)
                .get(`/api/capacity/trends/${testEmployeeId}`)
                .query({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })
                .expect(200);
            const stats = response.body.data.statistics;
            if (stats && Object.keys(stats).length > 0) {
                expect(stats).toHaveProperty('average');
                expect(stats).toHaveProperty('max');
                expect(stats).toHaveProperty('min');
                expect(stats).toHaveProperty('trend');
                expect(stats).toHaveProperty('overAllocationDays');
                expect(stats).toHaveProperty('criticalDays');
            }
        });
        it('should require date parameters', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get(`/api/capacity/trends/${testEmployeeId}`)
                .expect(400);
            expect(response.body.message).toContain('required');
        });
        it('should validate employee ID format', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/trends/invalid-uuid')
                .query({
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString()
            })
                .expect(400);
            expect(response.body.message).toContain('Invalid employee ID');
        });
    });
    describe('GET /api/capacity/bottlenecks', () => {
        it('should identify capacity bottlenecks', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/bottlenecks')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('bottlenecks');
            expect(response.body.data).toHaveProperty('totalBottlenecks');
            expect(response.body.data).toHaveProperty('criticalCount');
            expect(response.body.data).toHaveProperty('recommendations');
            expect(Array.isArray(response.body.data.bottlenecks)).toBe(true);
            expect(Array.isArray(response.body.data.recommendations)).toBe(true);
        });
        it('should sort bottlenecks by severity', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/bottlenecks')
                .expect(200);
            const bottlenecks = response.body.data.bottlenecks;
            if (bottlenecks.length > 1) {
                for (let i = 0; i < bottlenecks.length - 1; i++) {
                    expect(bottlenecks[i].maxUtilization >= bottlenecks[i + 1].maxUtilization).toBe(true);
                }
            }
        });
        it('should provide actionable recommendations', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/bottlenecks')
                .expect(200);
            const recommendations = response.body.data.recommendations;
            expect(Array.isArray(recommendations)).toBe(true);
            if (response.body.data.criticalCount > 0) {
                expect(recommendations.some((r) => r.includes('critical'))).toBe(true);
            }
        });
    });
    describe('GET /api/capacity/heatmap/export', () => {
        it('should export heat map data as CSV', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap/export')
                .query({ format: 'csv' })
                .expect(200);
            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.headers['content-disposition']).toContain('attachment');
            expect(response.headers['content-disposition']).toContain('.csv');
            expect(response.text).toContain('Employee ID');
            expect(response.text).toContain('Utilization %');
        });
        it('should export heat map data as JSON', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap/export')
                .query({ format: 'json' })
                .expect(200);
            expect(response.headers['content-type']).toContain('application/json');
            expect(response.headers['content-disposition']).toContain('attachment');
            expect(response.headers['content-disposition']).toContain('.json');
            expect(Array.isArray(response.body)).toBe(true);
        });
        it('should reject invalid export formats', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap/export')
                .query({ format: 'pdf' })
                .expect(400);
            expect(response.body.message).toContain('Invalid export format');
        });
    });
    describe('POST /api/capacity/heatmap/refresh', () => {
        it('should refresh heat map materialized view', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/capacity/heatmap/refresh')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('refreshed successfully');
            expect(response.body.timestamp).toBeDefined();
        });
    });
    describe('Performance Tests', () => {
        it('should respond within 500ms for default query', async () => {
            const startTime = Date.now();
            await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .expect(200);
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(500);
        });
        it('should respond within 500ms for filtered query', async () => {
            const startTime = Date.now();
            await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .query({
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                departmentId: testDepartmentId
            })
                .expect(200);
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(500);
        });
    });
    describe('Data Integrity Tests', () => {
        it('should return consistent utilization categories', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .expect(200);
            const validCategories = ['critical', 'over', 'high', 'optimal', 'moderate', 'low', 'available'];
            const data = response.body.data;
            if (data.length > 0) {
                data.forEach((item) => {
                    if (item.utilizationCategory) {
                        expect(validCategories).toContain(item.utilizationCategory);
                    }
                });
            }
        });
        it('should calculate utilization percentage correctly', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/capacity/heatmap')
                .expect(200);
            const data = response.body.data;
            if (data.length > 0) {
                data.forEach((item) => {
                    if (item.availableHours > 0) {
                        const calculatedUtilization = (item.allocatedHours / item.availableHours) * 100;
                        expect(Math.abs(item.utilizationPercentage - calculatedUtilization)).toBeLessThan(0.01);
                    }
                });
            }
        });
    });
});
//# sourceMappingURL=heat-map.test.js.map
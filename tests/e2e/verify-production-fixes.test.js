"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const globals_1 = require("@jest/globals");
const API_BASE_URL = 'http://localhost:3001/api';
(0, globals_1.describe)('E2E Production Functionality Verification', () => {
    let testEmployeeId;
    let testProjectId;
    let testAllocationId;
    (0, globals_1.beforeAll)(async () => {
        const healthResponse = await axios_1.default.get('http://localhost:3001/health');
        (0, globals_1.expect)(healthResponse.data.status).toBe('healthy');
        (0, globals_1.expect)(healthResponse.data.services.database).toBe(true);
    });
    (0, globals_1.describe)('Employee Management (UUID Support)', () => {
        (0, globals_1.it)('should create employee with UUID', async () => {
            const employeeData = {
                first_name: `Test_${Date.now()}`,
                last_name: 'Employee',
                email: `test${Date.now()}@example.com`,
                department: 'Engineering',
                position: 'Developer',
                weekly_capacity_hours: 40
            };
            const response = await axios_1.default.post(`${API_BASE_URL}/employees`, employeeData);
            (0, globals_1.expect)(response.status).toBe(201);
            (0, globals_1.expect)(response.data).toHaveProperty('id');
            (0, globals_1.expect)(typeof response.data.id).toBe('string');
            testEmployeeId = response.data.id;
        });
        (0, globals_1.it)('should get employee by UUID', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/employees/${testEmployeeId}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.id).toBe(testEmployeeId);
        });
        (0, globals_1.it)('should list all employees', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/employees`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(Array.isArray(response.data)).toBe(true);
            (0, globals_1.expect)(response.data.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Project Management', () => {
        (0, globals_1.it)('should create project', async () => {
            const projectData = {
                name: `Test Project ${Date.now()}`,
                description: 'E2E test project',
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'active'
            };
            const response = await axios_1.default.post(`${API_BASE_URL}/projects`, projectData);
            (0, globals_1.expect)(response.status).toBe(201);
            (0, globals_1.expect)(response.data).toHaveProperty('id');
            testProjectId = response.data.id;
        });
        (0, globals_1.it)('should get project details', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/projects/${testProjectId}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.id).toBe(testProjectId);
        });
    });
    (0, globals_1.describe)('Resource Allocation (Real Functionality)', () => {
        (0, globals_1.it)('should create allocation with validation', async () => {
            const allocationData = {
                employee_id: testEmployeeId,
                project_id: testProjectId,
                allocated_hours: 20,
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'confirmed'
            };
            const response = await axios_1.default.post(`${API_BASE_URL}/allocations`, allocationData);
            (0, globals_1.expect)(response.status).toBe(201);
            (0, globals_1.expect)(response.data).toHaveProperty('id');
            testAllocationId = response.data.id;
        });
        (0, globals_1.it)('should detect over-allocation', async () => {
            const overAllocationData = {
                employee_id: testEmployeeId,
                project_id: testProjectId,
                allocated_hours: 45,
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'confirmed'
            };
            try {
                await axios_1.default.post(`${API_BASE_URL}/allocations`, overAllocationData);
                fail('Should have thrown over-allocation error');
            }
            catch (error) {
                (0, globals_1.expect)(error.response.status).toBe(400);
                (0, globals_1.expect)(error.response.data.message).toContain('over-allocated');
            }
        });
    });
    (0, globals_1.describe)('Over-Allocation Warning Service', () => {
        (0, globals_1.it)('should check over-allocation for employee', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/over-allocation/check/${testEmployeeId}`);
            (0, globals_1.expect)(response.status).toBe(200);
            if (response.data.warning) {
                (0, globals_1.expect)(response.data.warning).toHaveProperty('employeeId');
                (0, globals_1.expect)(response.data.warning).toHaveProperty('severity');
                (0, globals_1.expect)(['low', 'medium', 'high', 'critical']).toContain(response.data.warning.severity);
            }
        });
        (0, globals_1.it)('should get over-allocation summary', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/over-allocation/summary`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('totalEmployees');
            (0, globals_1.expect)(response.data).toHaveProperty('overAllocatedCount');
            (0, globals_1.expect)(response.data).toHaveProperty('averageUtilization');
            (0, globals_1.expect)(response.data.overAllocatedCount).toBeLessThanOrEqual(response.data.totalEmployees);
        });
    });
    (0, globals_1.describe)('Capacity Intelligence Service', () => {
        (0, globals_1.it)('should get capacity intelligence', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/capacity-intelligence`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('currentUtilization');
            (0, globals_1.expect)(response.data.currentUtilization).toHaveProperty('overall');
            (0, globals_1.expect)(response.data.currentUtilization.overall).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(response.data.currentUtilization.overall).toBeLessThanOrEqual(100);
        });
        (0, globals_1.it)('should get capacity predictions', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/capacity-intelligence/predictions?horizon=6_months`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(Array.isArray(response.data)).toBe(true);
            response.data.forEach((prediction) => {
                (0, globals_1.expect)(prediction).toHaveProperty('period');
                (0, globals_1.expect)(prediction).toHaveProperty('predictedCapacity');
                (0, globals_1.expect)(prediction).toHaveProperty('confidence');
            });
        });
        (0, globals_1.it)('should identify bottlenecks', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/capacity-intelligence/bottlenecks`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('current');
            (0, globals_1.expect)(response.data).toHaveProperty('predicted');
            (0, globals_1.expect)(Array.isArray(response.data.current)).toBe(true);
        });
    });
    (0, globals_1.describe)('Pipeline Management Service', () => {
        let pipelineProjectId;
        (0, globals_1.it)('should create pipeline project', async () => {
            const pipelineData = {
                name: `Pipeline Test ${Date.now()}`,
                clientName: 'Test Client',
                stage: 'opportunity',
                priority: 'high',
                probability: 0.75,
                estimatedValue: 100000,
                estimatedStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                estimatedDuration: 90
            };
            const response = await axios_1.default.post(`${API_BASE_URL}/pipeline/projects`, pipelineData);
            (0, globals_1.expect)(response.status).toBe(201);
            (0, globals_1.expect)(response.data).toHaveProperty('id');
            pipelineProjectId = response.data.id;
        });
        (0, globals_1.it)('should update pipeline project with two parameters', async () => {
            const updateData = {
                stage: 'proposal',
                probability: 0.85
            };
            const response = await axios_1.default.put(`${API_BASE_URL}/pipeline/projects/${pipelineProjectId}`, updateData);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data.stage).toBe('proposal');
            (0, globals_1.expect)(response.data.probability).toBe(0.85);
        });
        (0, globals_1.it)('should get pipeline analytics', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/pipeline/analytics`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('totalValue');
            (0, globals_1.expect)(response.data).toHaveProperty('weightedValue');
            (0, globals_1.expect)(response.data).toHaveProperty('averageProbability');
            (0, globals_1.expect)(response.data).toHaveProperty('winRate');
        });
        (0, globals_1.it)('should get win/loss rates', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/pipeline/win-loss-rates`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('winRate');
            (0, globals_1.expect)(response.data).toHaveProperty('lossRate');
            (0, globals_1.expect)(response.data.winRate).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(response.data.winRate).toBeLessThanOrEqual(1);
        });
    });
    (0, globals_1.describe)('CRM Integration Service', () => {
        (0, globals_1.it)('should get CRM systems', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/crm/systems`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(Array.isArray(response.data)).toBe(true);
        });
        (0, globals_1.it)('should get sync status', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/crm/sync/status`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('lastSyncAt');
            (0, globals_1.expect)(response.data).toHaveProperty('status');
        });
    });
    (0, globals_1.describe)('Analytics and Reporting', () => {
        (0, globals_1.it)('should get resource utilization', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/analytics/utilization`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('overall');
            (0, globals_1.expect)(response.data.overall).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(response.data.overall).toBeLessThanOrEqual(100);
        });
        (0, globals_1.it)('should get project metrics', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/analytics/projects`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.data).toHaveProperty('totalProjects');
            (0, globals_1.expect)(response.data).toHaveProperty('activeProjects');
        });
    });
    (0, globals_1.describe)('Data Export Functionality', () => {
        (0, globals_1.it)('should export employees to CSV', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/export/employees`, {
                headers: { 'Accept': 'text/csv' }
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.headers['content-type']).toContain('csv');
            (0, globals_1.expect)(response.data).toContain('first_name');
            (0, globals_1.expect)(response.data).toContain('last_name');
        });
        (0, globals_1.it)('should export allocations to CSV', async () => {
            const response = await axios_1.default.get(`${API_BASE_URL}/export/allocations`, {
                headers: { 'Accept': 'text/csv' }
            });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.headers['content-type']).toContain('csv');
        });
    });
    (0, globals_1.describe)('Cleanup', () => {
        (0, globals_1.it)('should delete test allocation', async () => {
            if (testAllocationId) {
                const response = await axios_1.default.delete(`${API_BASE_URL}/allocations/${testAllocationId}`);
                (0, globals_1.expect)(response.status).toBe(204);
            }
        });
        (0, globals_1.it)('should delete test project', async () => {
            if (testProjectId) {
                const response = await axios_1.default.delete(`${API_BASE_URL}/projects/${testProjectId}`);
                (0, globals_1.expect)(response.status).toBe(204);
            }
        });
        (0, globals_1.it)('should delete test employee', async () => {
            if (testEmployeeId) {
                const response = await axios_1.default.delete(`${API_BASE_URL}/employees/${testEmployeeId}`);
                (0, globals_1.expect)(response.status).toBe(204);
            }
        });
    });
});
//# sourceMappingURL=verify-production-fixes.test.js.map
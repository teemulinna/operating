import axios from 'axios';
import { describe, it, expect, beforeAll } from '@jest/globals';

const API_BASE_URL = 'http://localhost:3001/api';

describe('E2E Production Functionality Verification', () => {
  let testEmployeeId: string;
  let testProjectId: string;
  let testAllocationId: string;

  beforeAll(async () => {
    // Verify backend is healthy
    const healthResponse = await axios.get('http://localhost:3001/health');
    expect(healthResponse.data.status).toBe('healthy');
    expect(healthResponse.data.services.database).toBe(true);
  });

  describe('Employee Management (UUID Support)', () => {
    it('should create employee with UUID', async () => {
      const employeeData = {
        first_name: `Test_${Date.now()}`,
        last_name: 'Employee',
        email: `test${Date.now()}@example.com`,
        department: 'Engineering',
        position: 'Developer',
        weekly_capacity_hours: 40
      };

      const response = await axios.post(`${API_BASE_URL}/employees`, employeeData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(typeof response.data.id).toBe('string'); // UUID is string
      testEmployeeId = response.data.id;
    });

    it('should get employee by UUID', async () => {
      const response = await axios.get(`${API_BASE_URL}/employees/${testEmployeeId}`);
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testEmployeeId);
    });

    it('should list all employees', async () => {
      const response = await axios.get(`${API_BASE_URL}/employees`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });
  });

  describe('Project Management', () => {
    it('should create project', async () => {
      const projectData = {
        name: `Test Project ${Date.now()}`,
        description: 'E2E test project',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active'
      };

      const response = await axios.post(`${API_BASE_URL}/projects`, projectData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      testProjectId = response.data.id;
    });

    it('should get project details', async () => {
      const response = await axios.get(`${API_BASE_URL}/projects/${testProjectId}`);
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testProjectId);
    });
  });

  describe('Resource Allocation (Real Functionality)', () => {
    it('should create allocation with validation', async () => {
      const allocationData = {
        employee_id: testEmployeeId,
        project_id: testProjectId,
        allocated_hours: 20,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'confirmed'
      };

      const response = await axios.post(`${API_BASE_URL}/allocations`, allocationData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      testAllocationId = response.data.id;
    });

    it('should detect over-allocation', async () => {
      // Try to allocate same employee more than 100%
      const overAllocationData = {
        employee_id: testEmployeeId,
        project_id: testProjectId,
        allocated_hours: 45, // This would exceed 40 hour capacity
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'confirmed'
      };

      try {
        await axios.post(`${API_BASE_URL}/allocations`, overAllocationData);
        fail('Should have thrown over-allocation error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toContain('over-allocated');
      }
    });
  });

  describe('Over-Allocation Warning Service', () => {
    it('should check over-allocation for employee', async () => {
      const response = await axios.get(`${API_BASE_URL}/over-allocation/check/${testEmployeeId}`);
      expect(response.status).toBe(200);

      if (response.data.warning) {
        expect(response.data.warning).toHaveProperty('employeeId');
        expect(response.data.warning).toHaveProperty('severity');
        expect(['low', 'medium', 'high', 'critical']).toContain(response.data.warning.severity);
      }
    });

    it('should get over-allocation summary', async () => {
      const response = await axios.get(`${API_BASE_URL}/over-allocation/summary`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('totalEmployees');
      expect(response.data).toHaveProperty('overAllocatedCount');
      expect(response.data).toHaveProperty('averageUtilization');
      expect(response.data.overAllocatedCount).toBeLessThanOrEqual(response.data.totalEmployees);
    });
  });

  describe('Capacity Intelligence Service', () => {
    it('should get capacity intelligence', async () => {
      const response = await axios.get(`${API_BASE_URL}/capacity-intelligence`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('currentUtilization');
      expect(response.data.currentUtilization).toHaveProperty('overall');
      expect(response.data.currentUtilization.overall).toBeGreaterThanOrEqual(0);
      expect(response.data.currentUtilization.overall).toBeLessThanOrEqual(100);
    });

    it('should get capacity predictions', async () => {
      const response = await axios.get(`${API_BASE_URL}/capacity-intelligence/predictions?horizon=6_months`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      response.data.forEach((prediction: any) => {
        expect(prediction).toHaveProperty('period');
        expect(prediction).toHaveProperty('predictedCapacity');
        expect(prediction).toHaveProperty('confidence');
      });
    });

    it('should identify bottlenecks', async () => {
      const response = await axios.get(`${API_BASE_URL}/capacity-intelligence/bottlenecks`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('current');
      expect(response.data).toHaveProperty('predicted');
      expect(Array.isArray(response.data.current)).toBe(true);
    });
  });

  describe('Pipeline Management Service', () => {
    let pipelineProjectId: string;

    it('should create pipeline project', async () => {
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

      const response = await axios.post(`${API_BASE_URL}/pipeline/projects`, pipelineData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      pipelineProjectId = response.data.id;
    });

    it('should update pipeline project with two parameters', async () => {
      const updateData = {
        stage: 'proposal',
        probability: 0.85
      };

      const response = await axios.put(`${API_BASE_URL}/pipeline/projects/${pipelineProjectId}`, updateData);
      expect(response.status).toBe(200);
      expect(response.data.stage).toBe('proposal');
      expect(response.data.probability).toBe(0.85);
    });

    it('should get pipeline analytics', async () => {
      const response = await axios.get(`${API_BASE_URL}/pipeline/analytics`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('totalValue');
      expect(response.data).toHaveProperty('weightedValue');
      expect(response.data).toHaveProperty('averageProbability');
      expect(response.data).toHaveProperty('winRate');
    });

    it('should get win/loss rates', async () => {
      const response = await axios.get(`${API_BASE_URL}/pipeline/win-loss-rates`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('winRate');
      expect(response.data).toHaveProperty('lossRate');
      expect(response.data.winRate).toBeGreaterThanOrEqual(0);
      expect(response.data.winRate).toBeLessThanOrEqual(1);
    });
  });

  describe('CRM Integration Service', () => {
    it('should get CRM systems', async () => {
      const response = await axios.get(`${API_BASE_URL}/crm/systems`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should get sync status', async () => {
      const response = await axios.get(`${API_BASE_URL}/crm/sync/status`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('lastSyncAt');
      expect(response.data).toHaveProperty('status');
    });
  });

  describe('Analytics and Reporting', () => {
    it('should get resource utilization', async () => {
      const response = await axios.get(`${API_BASE_URL}/analytics/utilization`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('overall');
      expect(response.data.overall).toBeGreaterThanOrEqual(0);
      expect(response.data.overall).toBeLessThanOrEqual(100);
    });

    it('should get project metrics', async () => {
      const response = await axios.get(`${API_BASE_URL}/analytics/projects`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('totalProjects');
      expect(response.data).toHaveProperty('activeProjects');
    });
  });

  describe('Data Export Functionality', () => {
    it('should export employees to CSV', async () => {
      const response = await axios.get(`${API_BASE_URL}/export/employees`, {
        headers: { 'Accept': 'text/csv' }
      });
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('csv');
      expect(response.data).toContain('first_name');
      expect(response.data).toContain('last_name');
    });

    it('should export allocations to CSV', async () => {
      const response = await axios.get(`${API_BASE_URL}/export/allocations`, {
        headers: { 'Accept': 'text/csv' }
      });
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('csv');
    });
  });

  describe('Cleanup', () => {
    it('should delete test allocation', async () => {
      if (testAllocationId) {
        const response = await axios.delete(`${API_BASE_URL}/allocations/${testAllocationId}`);
        expect(response.status).toBe(204);
      }
    });

    it('should delete test project', async () => {
      if (testProjectId) {
        const response = await axios.delete(`${API_BASE_URL}/projects/${testProjectId}`);
        expect(response.status).toBe(204);
      }
    });

    it('should delete test employee', async () => {
      if (testEmployeeId) {
        const response = await axios.delete(`${API_BASE_URL}/employees/${testEmployeeId}`);
        expect(response.status).toBe(204);
      }
    });
  });
});
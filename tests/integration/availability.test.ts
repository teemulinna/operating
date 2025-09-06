import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../config/database';

describe('Availability Dashboard API Integration Tests', () => {
  let testEmployeeIds: string[] = [];

  beforeAll(async () => {
    // Create test data
    const employee1 = await request(app)
      .post('/api/employees')
      .send({
        firstName: 'Alice',
        lastName: 'Manager',
        email: 'alice.manager@test.com',
        position: 'Team Lead',
        departmentId: 'e85e5cfe-1970-4ea8-98c8-4a59b7587a52',
        hireDate: '2023-01-01'
      });
    
    testEmployeeIds.push(employee1.body.data.id);
  });

  afterAll(async () => {
    // Clean up test data
    for (const id of testEmployeeIds) {
      await request(app)
        .delete(`/api/employees/${id}`)
        .expect(200);
    }
    await pool.end();
  });

  describe('Availability Status API', () => {
    test('GET /api/availability/status - should return all employee availability', async () => {
      const response = await request(app)
        .get('/api/availability/status')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const employee = response.body.data[0];
      expect(employee).toHaveProperty('id');
      expect(employee).toHaveProperty('firstName');
      expect(employee).toHaveProperty('lastName');
      expect(employee).toHaveProperty('status');
      expect(employee).toHaveProperty('capacity');
      expect(['available', 'busy', 'unavailable']).toContain(employee.status);
    });

    test('PUT /api/availability/status/:id - should update employee availability', async () => {
      const employeeId = testEmployeeIds[0];
      const updateData = {
        status: 'busy' as const,
        capacity: 75,
        currentProjects: 2,
        availableHours: 10
      };

      const response = await request(app)
        .put(`/api/availability/status/${employeeId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data).toMatchObject(updateData);
    });

    test('GET /api/availability/department/:id - should return department utilization', async () => {
      const departmentId = 'e85e5cfe-1970-4ea8-98c8-4a59b7587a52';
      
      const response = await request(app)
        .get(`/api/availability/department/${departmentId}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('departmentId', departmentId);
      expect(response.body.data).toHaveProperty('totalEmployees');
      expect(response.body.data).toHaveProperty('availableEmployees');
      expect(response.body.data).toHaveProperty('busyEmployees');
      expect(response.body.data).toHaveProperty('unavailableEmployees');
      expect(response.body.data).toHaveProperty('averageCapacity');
      expect(response.body.data).toHaveProperty('employees');
      expect(Array.isArray(response.body.data.employees)).toBe(true);
    });

    test('GET /api/availability/real-time - should provide WebSocket info', async () => {
      const response = await request(app)
        .get('/api/availability/real-time')
        .expect(200);

      expect(response.body).toHaveProperty('websocketUrl');
      expect(response.body).toHaveProperty('protocols');
      expect(response.body).toHaveProperty('heartbeatInterval');
    });
  });

  describe('Export Functionality API Tests', () => {
    test('POST /api/export/employees/csv - should export employees as CSV', async () => {
      const response = await request(app)
        .post('/api/export/employees/csv')
        .send({
          filters: {
            status: 'active',
            departmentId: 'e85e5cfe-1970-4ea8-98c8-4a59b7587a52'
          },
          fields: ['firstName', 'lastName', 'email', 'position', 'status']
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('First Name,Last Name,Email,Position,Status');
    });

    test('POST /api/export/employees/excel - should export employees as Excel', async () => {
      const response = await request(app)
        .post('/api/export/employees/excel')
        .send({
          filters: { status: 'active' },
          includeCharts: true,
          worksheets: ['employees', 'summary', 'department_breakdown']
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    test('POST /api/export/capacity-report/pdf - should generate PDF capacity report', async () => {
      const response = await request(app)
        .post('/api/export/capacity-report/pdf')
        .send({
          dateRange: {
            start: '2024-01-01',
            end: '2024-12-31'
          },
          includeDepartments: ['e85e5cfe-1970-4ea8-98c8-4a59b7587a52'],
          reportType: 'quarterly',
          includeCharts: true,
          includeProjections: true
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('capacity-report');
    });

    test('POST /api/integration/external/sync - should sync data with external tools', async () => {
      const response = await request(app)
        .post('/api/integration/external/sync')
        .send({
          targetSystems: ['jira', 'asana'],
          syncType: 'capacity_update',
          data: {
            employeeId: testEmployeeIds[0],
            capacity: 80,
            availableHours: 32
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('syncResults');
      expect(Array.isArray(response.body.syncResults)).toBe(true);
      expect(response.body.syncResults[0]).toHaveProperty('system');
      expect(response.body.syncResults[0]).toHaveProperty('status');
      expect(response.body.syncResults[0]).toHaveProperty('syncedAt');
    });

    test('PUT /api/employees/bulk-update - should bulk update employee capacities', async () => {
      const bulkUpdates = [
        {
          employeeId: testEmployeeIds[0],
          updates: {
            capacity: 85,
            status: 'available' as const,
            availableHours: 35
          }
        }
      ];

      const response = await request(app)
        .put('/api/employees/bulk-update')
        .send({ updates: bulkUpdates })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results[0]).toHaveProperty('employeeId');
      expect(response.body.results[0]).toHaveProperty('status', 'success');
    });

    test('POST /api/export/schedule - should schedule automated reports', async () => {
      const scheduleData = {
        reportType: 'capacity_summary',
        frequency: 'weekly',
        format: 'pdf',
        recipients: ['manager@test.com'],
        filters: {
          departmentId: 'e85e5cfe-1970-4ea8-98c8-4a59b7587a52'
        },
        startDate: '2024-09-06'
      };

      const response = await request(app)
        .post('/api/export/schedule')
        .send(scheduleData)
        .expect(201);

      expect(response.body).toHaveProperty('scheduleId');
      expect(response.body).toHaveProperty('nextRun');
      expect(response.body.data).toMatchObject({
        reportType: 'capacity_summary',
        frequency: 'weekly',
        format: 'pdf'
      });
    });
  });

  describe('Real-time Integration Tests', () => {
    test('GET /api/availability/real-time/status - should provide real-time status updates', async () => {
      const response = await request(app)
        .get('/api/availability/real-time/status')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('activeConnections');
      expect(response.body.data).toHaveProperty('lastUpdated');
      expect(response.body.data).toHaveProperty('systemHealth');
    });
  });

  describe('Performance Tests', () => {
    test('Concurrent availability status requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/api/availability/status')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
      });
    });

    test('Large CSV export performance', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/export/employees/csv')
        .send({
          filters: {},
          fields: ['firstName', 'lastName', 'email', 'position', 'departmentName', 'status']
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete under 5 seconds
      expect(response.text.length).toBeGreaterThan(0);
    });
  });
});
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';

describe('End-to-End Availability Dashboard Integration Tests', () => {
  let testEmployeeIds: string[] = [];
  let testDepartmentIds: string[] = [];
  let db: DatabaseService;
  let pool: any;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.connect();
    pool = db.getPool();
    // Clean up any existing test data
    await pool.query('DELETE FROM employee_availability WHERE employee_id IN (SELECT id FROM employees WHERE email LIKE \'%@e2etest.com
ostí');
    await pool.query('DELETE FROM employees WHERE email LIKE \'%@e2etest.com
ostí');
    
    // Create test departments
    const deptResult = await pool.query(`
      INSERT INTO departments (name, description, is_active) 
      VALUES ('E2E Test Dept', 'End-to-end testing department', true)
      RETURNING id
    `);
    testDepartmentIds.push(deptResult.rows[0].id);

    // Create test employees
    const employees = [
      { name: 'Alice', email: 'alice@e2etest.com', position: 'Senior Developer' },
      { name: 'Bob', email: 'bob@e2etest.com', position: 'Project Manager' },
      { name: 'Carol', email: 'carol@e2etest.com', position: 'UX Designer' }
    ];

    for (const emp of employees) {
      const result = await pool.query(`
        INSERT INTO employees (first_name, last_name, email, position, department_id, hire_date, is_active)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, true)
        RETURNING id
      `, [emp.name, 'TestUser', emp.email, emp.position, testDepartmentIds[0]]);
      testEmployeeIds.push(result.rows[0].id);
    }
  });

  afterAll(async () => {
    // Clean up test data
    for (const id of testEmployeeIds) {
      await pool.query('DELETE FROM employee_availability WHERE employee_id = $1', [id]);
      await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    }
    for (const id of testDepartmentIds) {
      await pool.query('DELETE FROM departments WHERE id = $1', [id]);
    }
    await db.disconnect();
  });

  describe('🧪 Availability Status API Tests', () => {
    test('should get employee availability statuses with real data', async () => {
      const response = await request(app)
        .get('/api/availability/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify data structure
      const employee = response.body.data[0];
      expect(employee).toHaveProperty('id');
      expect(employee).toHaveProperty('firstName');
      expect(employee).toHaveProperty('lastName');
      expect(employee).toHaveProperty('status');
      expect(employee).toHaveProperty('capacity');
      expect(['available', 'busy', 'unavailable']).toContain(employee.status);
      expect(typeof employee.capacity).toBe('number');
    });

    test('should filter employees by availability status', async () => {
      // First, set up some test availability data
      await pool.query(`
        INSERT INTO employee_availability (employee_id, status, capacity, current_projects, available_hours)
        VALUES ($1, 'available', 90, 1, 35)
        ON CONFLICT (employee_id) DO UPDATE SET status = EXCLUDED.status, capacity = EXCLUDED.capacity
      `, [testEmployeeIds[0]]);

      const response = await request(app)
        .get('/api/availability/status?status=available')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((emp: any) => {
        expect(emp.status).toBe('available');
      });
    });

    test('should update employee availability status', async () => {
      const updateData = {
        status: 'busy',
        capacity: 75,
        currentProjects: 3,
        availableHours: 15
      };

      const response = await request(app)
        .put(`/api/availability/status/${testEmployeeIds[0]}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('busy');
      expect(response.body.data.capacity).toBe(75);
    });

    test('should get department utilization metrics', async () => {
      const response = await request(app)
        .get(`/api/availability/department/${testDepartmentIds[0]}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('departmentId', testDepartmentIds[0]);
      expect(response.body.data).toHaveProperty('totalEmployees');
      expect(response.body.data).toHaveProperty('availableEmployees');
      expect(response.body.data).toHaveProperty('busyEmployees');
      expect(response.body.data).toHaveProperty('averageCapacity');
      expect(Array.isArray(response.body.data.employees)).toBe(true);
    });
  });

  describe('📊 Export Functionality Tests', () => {
    test('should export employees as CSV', async () => {
      const exportData = {
        filters: { status: 'all' },
        fields: ['firstName', 'lastName', 'email', 'position', 'status', 'capacity']
      };

      const response = await request(app)
        .post('/api/export/employees/csv')
        .send(exportData)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      
      // Check CSV structure
      const csvContent = response.text;
      const lines = csvContent.split('\n');
      expect(lines[0]).toContain('First Name,Last Name,Email,Position,Status,Capacity');
      expect(lines.length).toBeGreaterThan(1);
    });

    test('should handle bulk availability updates', async () => {
      const bulkUpdates = [
        {
          employeeId: testEmployeeIds[0],
          updates: {
            status: 'available',
            capacity: 100,
            availableHours: 40
          }
        },
        {
          employeeId: testEmployeeIds[1],
          updates: {
            status: 'busy',
            capacity: 60,
            availableHours: 10
          }
        }
      ];

      const response = await request(app)
        .put('/api/employees/bulk-update')
        .send({ updates: bulkUpdates })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(2);
      response.body.results.forEach((result: any) => {
        expect(result.status).toBe('success');
      });
    });

    test('should simulate external system sync', async () => {
      const syncData = {
        targetSystems: ['jira', 'asana'],
        syncType: 'capacity_update',
        data: {
          employeeId: testEmployeeIds[0],
          capacity: 85,
          availableHours: 30
        }
      };

      const response = await request(app)
        .post('/api/integration/external/sync')
        .send(syncData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.syncResults).toHaveLength(2);
      expect(response.body.syncResults[0]).toHaveProperty('system', 'jira');
      expect(response.body.syncResults[0]).toHaveProperty('status', 'success');
    });
  });

  describe('⚡ Performance and Reliability Tests', () => {
    test('should handle concurrent availability status requests', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app).get('/api/availability/status')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    test('should handle large CSV export efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/export/employees/csv')
        .send({
          filters: {},
          fields: ['firstName', 'lastName', 'email', 'position', 'departmentName', 'status', 'capacity']
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete under 5 seconds
      expect(response.text.length).toBeGreaterThan(0);
    });

    test('should validate input data properly', async () => {
      // Test invalid status update
      const invalidUpdate = {
        status: 'invalid-status',
        capacity: 150, // Over 100%
        currentProjects: -1 // Negative
      };

      await request(app)
        .put(`/api/availability/status/${testEmployeeIds[0]}`)
        .send(invalidUpdate)
        .expect(400);

      // Test invalid employee ID
      await request(app)
        .put('/api/availability/status/invalid-uuid')
        .send({ status: 'available', capacity: 100 })
        .expect(400);
    });
  });

  describe('🔄 End-to-End Workflow Tests', () => {
    test('complete workflow: search -> filter -> update -> export', async () => {
      // 1. Search for employees
      const searchResponse = await request(app)
        .get('/api/availability/status?search=Alice')
        .expect(200);

      expect(searchResponse.body.data.length).toBeGreaterThan(0);
      const alice = searchResponse.body.data.find((emp: any) => emp.firstName === 'Alice');
      expect(alice).toBeDefined();

      // 2. Update Alice\'s status
      const updateResponse = await request(app)
        .put(`/api/availability/status/${alice.id}`)
        .send({
          status: 'busy',
          capacity: 80,
          currentProjects: 2,
          availableHours: 20
        })
        .expect(200);

      expect(updateResponse.body.data.status).toBe('busy');

      // 3. Filter by busy status
      const filterResponse = await request(app)
        .get('/api/availability/status?status=busy')
        .expect(200);

      const busyAlice = filterResponse.body.data.find((emp: any) => emp.id === alice.id);
      expect(busyAlice).toBeDefined();
      expect(busyAlice.status).toBe('busy');

      // 4. Export the filtered results
      const exportResponse = await request(app)
        .post('/api/export/employees/csv')
        .send({
          filters: { status: 'busy' },
          fields: ['firstName', 'lastName', 'status', 'capacity']
        })
        .expect(200);

      expect(exportResponse.text).toContain('Alice');
      expect(exportResponse.text).toContain('busy');
    });

    test('department utilization workflow', async () => {
      // 1. Set up varied availability statuses
      await pool.query(`
        INSERT INTO employee_availability (employee_id, status, capacity, current_projects, available_hours)
        VALUES 
          ($1, 'available', 100, 1, 40),
          ($2, 'busy', 75, 3, 10),
          ($3, 'unavailable', 0, 0, 0)
        ON CONFLICT (employee_id) DO UPDATE SET 
          status = EXCLUDED.status, 
          capacity = EXCLUDED.capacity,
          current_projects = EXCLUDED.current_projects,
          available_hours = EXCLUDED.available_hours
      `, testEmployeeIds);

      // 2. Get department utilization
      const utilizationResponse = await request(app)
        .get(`/api/availability/department/${testDepartmentIds[0]}`)
        .expect(200);

      const data = utilizationResponse.body.data;
      expect(data.totalEmployees).toBe(3);
      expect(data.availableEmployees).toBe(1);
      expect(data.busyEmployees).toBe(1);
      expect(data.unavailableEmployees).toBe(1);
      expect(data.averageCapacity).toBeCloseTo(58.33, 1); // (100 + 75 + 0) / 3

      // 3. Generate department report
      const reportResponse = await request(app)
        .post('/api/export/capacity-report/pdf')
        .send({
          dateRange: {
            start: '2024-01-01',
            end: '2024-12-31'
          },
          includeDepartments: [testDepartmentIds[0]],
          reportType: 'quarterly',
          includeCharts: true
        })
        .expect(200);

      expect(reportResponse.headers['content-type']).toBe('application/pdf');
    });
  });

  describe('📈 Data Consistency Tests', () => {
    test('should maintain data consistency across operations', async () => {
      // Update employee status
      await request(app)
        .put(`/api/availability/status/${testEmployeeIds[0]}`)
        .send({
          status: 'available',
          capacity: 90,
          currentProjects: 1,
          availableHours: 36
        })
        .expect(200);

      // Verify in individual employee query
      const individualResponse = await request(app)
        .get(`/api/availability/status?search=${testEmployeeIds[0]}`)
        .expect(200);

      const employee = individualResponse.body.data.find((emp: any) => emp.id === testEmployeeIds[0]);
      expect(employee.status).toBe('available');
      expect(employee.capacity).toBe(90);

      // Verify in department utilization
      const deptResponse = await request(app)
        .get(`/api/availability/department/${testDepartmentIds[0]}`)
        .expect(200);

      const deptEmployee = deptResponse.body.data.employees.find((emp: any) => emp.id === testEmployeeIds[0]);
      expect(deptEmployee.status).toBe('available');
      expect(deptEmployee.capacity).toBe(90);
    });
  });
});

describe('🎯 Integration Test Summary', () => {
  test('should provide system health overview', async () => {
    const healthResponse = await request(app)
      .get('/health')
      .expect(200);

    expect(healthResponse.body.status).toBe('healthy');
    
    // Test all new endpoints
    const endpoints = [
      '/api/availability/status',
      '/api/availability/real-time',
      '/api/export/employees/csv',
      '/api/integration/external/sync'
    ];

    const endpointTests = endpoints.map(endpoint => 
      request(app).get(endpoint).then(response => ({
        endpoint,
        status: response.status,
        accessible: response.status < 500
      })).catch(error => ({
        endpoint,
        status: error.status || 500,
        accessible: false
      }))
    );

    const results = await Promise.all(endpointTests);
    
    console.log('\n🔍 API Endpoint Accessibility Test Results:');
    results.forEach(result => {
      console.log(`${result.accessible ? '✅' : '❌'} ${result.endpoint} (${result.status})`);
    });

    // At least availability status should be accessible
    const availabilityEndpoint = results.find(r => r.endpoint === '/api/availability/status');
    expect(availabilityEndpoint?.accessible).toBe(true);
  });
});

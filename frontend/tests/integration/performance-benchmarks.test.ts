import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import { performance } from 'perf_hooks';
import { Pool } from 'pg';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001/api';

describe('Performance Benchmarks', () => {
  let dbPool: Pool;
  let testEmployeeIds: string[] = [];

  beforeAll(async () => {
    dbPool = new Pool({
      user: process.env.TEST_DB_USER || 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      database: process.env.TEST_DB_NAME || 'employee_management_test',
      password: process.env.TEST_DB_PASSWORD || 'password',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
    });

    // Create test dataset for performance testing
    await setupLargeDataset();
  });

  afterAll(async () => {
    // Cleanup test data
    if (testEmployeeIds.length > 0) {
      await dbPool.query(
        `DELETE FROM employees WHERE id = ANY($1::int[])`,
        [testEmployeeIds]
      );
    }
    
    await dbPool.end();
  });

  async function setupLargeDataset() {
    console.log('Setting up large dataset for performance testing...');
    
    // Create 1000 test employees
    const employees = Array.from({ length: 1000 }, (_, index) => ({
      firstName: `Perf${index}`,
      lastName: `Test${index}`,
      email: `perf.test.${index}@benchmark.com`,
      phoneNumber: `+1-555-${String(index).padStart(4, '0')}`,
      position: ['Software Engineer', 'Senior Developer', 'Product Manager', 'Designer', 'QA Engineer'][index % 5],
      department: ['Engineering', 'Product', 'Design', 'Marketing', 'Sales'][index % 5],
      salary: 50000 + (index * 100),
      hireDate: new Date(2020 + (index % 4), (index % 12), (index % 28) + 1).toISOString().split('T')[0],
      status: index % 10 === 0 ? 'inactive' : 'active'
    }));

    // Batch insert for better performance
    const batchSize = 100;
    for (let i = 0; i < employees.length; i += batchSize) {
      const batch = employees.slice(i, i + batchSize);
      
      const values = batch.map((emp, batchIndex) => {
        const paramIndex = batchIndex * 9;
        return `($${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`;
      }).join(', ');

      const query = `
        INSERT INTO employees (first_name, last_name, email, phone_number, position, department, salary, hire_date, status)
        VALUES ${values}
        RETURNING id
      `;

      const flatParams = batch.flatMap(emp => [
        emp.firstName, emp.lastName, emp.email, emp.phoneNumber,
        emp.position, emp.department, emp.salary, emp.hireDate, emp.status
      ]);

      const result = await dbPool.query(query, flatParams);
      testEmployeeIds.push(...result.rows.map(row => row.id));
    }

    console.log(`Created ${testEmployeeIds.length} test employees`);
  }

  describe('API Response Time Benchmarks', () => {
    it('should list employees within acceptable time', async () => {
      const start = performance.now();
      
      const response = await axios.get(`${API_BASE_URL}/employees?limit=50`);
      
      const duration = performance.now() - start;
      
      expect(response.status).toBe(200);
      expect(response.data.employees).toHaveLength(50);
      
      // Should respond within 200ms for paginated results
      expect(duration).toBeLessThan(200);
      
      console.log(`List employees (50 items): ${duration.toFixed(2)}ms`);
    });

    it('should search employees quickly', async () => {
      const searchQueries = ['Perf1', 'Engineer', 'Engineering', 'test', '2023'];
      const results = [];

      for (const query of searchQueries) {
        const start = performance.now();
        
        const response = await axios.get(`${API_BASE_URL}/employees?search=${encodeURIComponent(query)}`);
        
        const duration = performance.now() - start;
        results.push({ query, duration, count: response.data.employees.length });
        
        expect(response.status).toBe(200);
        
        // Search should complete within 300ms
        expect(duration).toBeLessThan(300);
      }

      console.log('Search performance:', results.map(r => 
        `${r.query}: ${r.duration.toFixed(2)}ms (${r.count} results)`
      ));
    });

    it('should handle complex filtering efficiently', async () => {
      const filterCombinations = [
        { department: 'Engineering', status: 'active' },
        { position: 'Software Engineer', department: 'Engineering' },
        { minSalary: 60000, maxSalary: 80000 },
        { hireDate: '2023-01-01', status: 'active' }
      ];

      const results = [];

      for (const filters of filterCombinations) {
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          queryParams.append(key, value.toString());
        });

        const start = performance.now();
        
        const response = await axios.get(`${API_BASE_URL}/employees?${queryParams}`);
        
        const duration = performance.now() - start;
        results.push({ filters, duration, count: response.data.employees.length });
        
        expect(response.status).toBe(200);
        
        // Complex filtering should complete within 400ms
        expect(duration).toBeLessThan(400);
      }

      console.log('Filter performance:', results.map(r => 
        `${JSON.stringify(r.filters)}: ${r.duration.toFixed(2)}ms (${r.count} results)`
      ));
    });

    it('should paginate large datasets efficiently', async () => {
      const pageSize = 100;
      const pages = [1, 2, 5, 10]; // Test different page numbers
      const results = [];

      for (const page of pages) {
        const start = performance.now();
        
        const response = await axios.get(`${API_BASE_URL}/employees?page=${page}&limit=${pageSize}`);
        
        const duration = performance.now() - start;
        results.push({ page, duration, count: response.data.employees.length });
        
        expect(response.status).toBe(200);
        
        // Pagination should not degrade significantly with page number
        expect(duration).toBeLessThan(250);
      }

      console.log('Pagination performance:', results.map(r => 
        `Page ${r.page}: ${r.duration.toFixed(2)}ms (${r.count} results)`
      ));

      // Later pages shouldn't be significantly slower than early pages
      const maxDuration = Math.max(...results.map(r => r.duration));
      const minDuration = Math.min(...results.map(r => r.duration));
      const degradationRatio = maxDuration / minDuration;
      
      expect(degradationRatio).toBeLessThan(2); // No more than 2x slower
    });
  });

  describe('Database Performance Benchmarks', () => {
    it('should execute complex queries efficiently', async () => {
      const queries = [
        {
          name: 'Count by department',
          query: 'SELECT department, COUNT(*) FROM employees WHERE email LIKE \'%benchmark.com\' GROUP BY department'
        },
        {
          name: 'Average salary by position',
          query: 'SELECT position, AVG(salary) FROM employees WHERE email LIKE \'%benchmark.com\' GROUP BY position'
        },
        {
          name: 'Search with ILIKE',
          query: 'SELECT id, first_name, last_name FROM employees WHERE (first_name ILIKE \'%Perf%\' OR last_name ILIKE \'%Test%\') AND email LIKE \'%benchmark.com\' LIMIT 50'
        },
        {
          name: 'Date range query',
          query: 'SELECT COUNT(*) FROM employees WHERE hire_date >= \'2023-01-01\' AND hire_date < \'2024-01-01\' AND email LIKE \'%benchmark.com\''
        }
      ];

      const results = [];

      for (const { name, query } of queries) {
        const start = performance.now();
        
        const result = await dbPool.query(query);
        
        const duration = performance.now() - start;
        results.push({ name, duration, rows: result.rowCount });
        
        // Database queries should be fast (under 50ms for this dataset size)
        expect(duration).toBeLessThan(50);
      }

      console.log('Database query performance:', results.map(r => 
        `${r.name}: ${r.duration.toFixed(2)}ms (${r.rows} rows)`
      ));
    });

    it('should handle concurrent database connections', async () => {
      const concurrentQueries = 10;
      const query = 'SELECT COUNT(*) FROM employees WHERE email LIKE \'%benchmark.com\' AND status = \'active\'';

      const start = performance.now();
      
      const promises = Array.from({ length: concurrentQueries }, () => dbPool.query(query));
      const results = await Promise.all(promises);
      
      const totalDuration = performance.now() - start;
      
      // All queries should complete successfully
      expect(results).toHaveLength(concurrentQueries);
      results.forEach(result => {
        expect(result.rows[0].count).toBeGreaterThan(0);
      });

      // Concurrent execution should be efficient
      const averageDuration = totalDuration / concurrentQueries;
      expect(averageDuration).toBeLessThan(100);

      console.log(`Concurrent queries (${concurrentQueries}): ${totalDuration.toFixed(2)}ms total, ${averageDuration.toFixed(2)}ms average`);
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should create employees in bulk efficiently', async () => {
      const batchSizes = [10, 50, 100];
      const results = [];

      for (const batchSize of batchSizes) {
        const employees = Array.from({ length: batchSize }, (_, index) => ({
          firstName: `Bulk${index}`,
          lastName: `Test${index}`,
          email: `bulk.test.${Date.now()}.${index}@benchmark.com`,
          phoneNumber: `+1-555-${String(index + 9000).padStart(4, '0')}`,
          position: 'Test Position',
          department: 'Test Department',
          salary: 50000,
          hireDate: '2023-01-01',
          status: 'active'
        }));

        const start = performance.now();
        
        // Simulate bulk create via API
        const promises = employees.map(emp => axios.post(`${API_BASE_URL}/employees`, emp));
        const responses = await Promise.all(promises);
        
        const duration = performance.now() - start;
        const avgDuration = duration / batchSize;
        
        results.push({ batchSize, duration, avgDuration });
        
        // Clean up
        const createdIds = responses.map(r => r.data.id);
        await dbPool.query('DELETE FROM employees WHERE id = ANY($1::int[])', [createdIds]);
        
        expect(responses.every(r => r.status === 201)).toBe(true);
        
        // Average time per employee should be reasonable
        expect(avgDuration).toBeLessThan(50);
      }

      console.log('Bulk create performance:', results.map(r => 
        `${r.batchSize} employees: ${r.duration.toFixed(2)}ms total, ${r.avgDuration.toFixed(2)}ms average`
      ));
    });

    it('should update multiple employees efficiently', async () => {
      // Get a subset of test employees for updates
      const employeeIds = testEmployeeIds.slice(0, 50);
      
      const start = performance.now();
      
      const updatePromises = employeeIds.map(id => 
        axios.put(`${API_BASE_URL}/employees/${id}`, {
          salary: 60000,
          status: 'active'
        })
      );
      
      const responses = await Promise.all(updatePromises);
      
      const duration = performance.now() - start;
      const avgDuration = duration / employeeIds.length;
      
      expect(responses.every(r => r.status === 200)).toBe(true);
      
      // Bulk updates should be efficient
      expect(avgDuration).toBeLessThan(30);
      
      console.log(`Bulk update (${employeeIds.length} employees): ${duration.toFixed(2)}ms total, ${avgDuration.toFixed(2)}ms average`);
    });

    it('should export large datasets efficiently', async () => {
      const exportSizes = [100, 500, 1000];
      const results = [];

      for (const size of exportSizes) {
        const start = performance.now();
        
        const response = await axios.get(`${API_BASE_URL}/employees/export?limit=${size}&format=csv`);
        
        const duration = performance.now() - start;
        
        results.push({ size, duration });
        
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        
        // Export time should scale reasonably with dataset size
        const timePerRecord = duration / size;
        expect(timePerRecord).toBeLessThan(2); // Less than 2ms per record
      }

      console.log('Export performance:', results.map(r => 
        `${r.size} records: ${r.duration.toFixed(2)}ms (${(r.duration / r.size).toFixed(2)}ms per record)`
      ));
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should handle large result sets without memory issues', async () => {
      // Measure memory usage before operation
      const initialMemory = process.memoryUsage();
      
      // Request large dataset
      const response = await axios.get(`${API_BASE_URL}/employees?limit=1000`);
      
      expect(response.status).toBe(200);
      expect(response.data.employees).toHaveLength(1000);
      
      // Measure memory usage after operation
      const finalMemory = process.memoryUsage();
      
      const heapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Memory usage increase: ${(heapIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory increase should be reasonable (less than 50MB for 1000 records)
      expect(heapIncrease).toBeLessThan(50 * 1024 * 1024);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    });

    it('should not cause memory leaks during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform repeated operations
      for (let i = 0; i < 10; i++) {
        const response = await axios.get(`${API_BASE_URL}/employees?limit=100&page=${i + 1}`);
        expect(response.status).toBe(200);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const heapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Memory increase after repeated operations: ${(heapIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      // Should not significantly increase memory usage
      expect(heapIncrease).toBeLessThan(20 * 1024 * 1024); // Less than 20MB increase
    });
  });

  describe('Stress Testing', () => {
    it('should handle high concurrent load', async () => {
      const concurrentRequests = 50;
      const start = performance.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, index) => 
        axios.get(`${API_BASE_URL}/employees?search=Perf${index % 10}&limit=20`)
      );
      
      const responses = await Promise.all(promises);
      
      const totalDuration = performance.now() - start;
      
      // All requests should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
      
      const avgDuration = totalDuration / concurrentRequests;
      
      console.log(`Concurrent load test (${concurrentRequests} requests): ${totalDuration.toFixed(2)}ms total, ${avgDuration.toFixed(2)}ms average`);
      
      // System should handle concurrent load reasonably
      expect(avgDuration).toBeLessThan(500);
    });

    it('should maintain performance under sustained load', async () => {
      const iterations = 20;
      const durations = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        const response = await axios.get(`${API_BASE_URL}/employees?limit=100`);
        
        const duration = performance.now() - start;
        durations.push(duration);
        
        expect(response.status).toBe(200);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      
      console.log(`Sustained load test: avg ${avgDuration.toFixed(2)}ms, min ${minDuration.toFixed(2)}ms, max ${maxDuration.toFixed(2)}ms`);
      
      // Performance should be consistent (max shouldn't be more than 3x min)
      expect(maxDuration / minDuration).toBeLessThan(3);
      
      // Average performance should be good
      expect(avgDuration).toBeLessThan(200);
    });
  });
});
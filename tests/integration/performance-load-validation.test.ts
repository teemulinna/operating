import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';
import { performance } from 'perf_hooks';

describe('Performance and Load Validation', () => {
  const performanceMetrics: { [key: string]: number[] } = {};

  beforeAll(async () => {
    await DatabaseService.getPool();
  });

  afterAll(async () => {
    await DatabaseService.closePool();
    
    // Output performance summary
    console.log('\n📊 PERFORMANCE METRICS SUMMARY:');
    Object.entries(performanceMetrics).forEach(([operation, times]) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      console.log(`  ${operation}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
    });
  });

  const measurePerformance = async (operation: string, testFunction: () => Promise<any>) => {
    const start = performance.now();
    const result = await testFunction();
    const end = performance.now();
    const duration = end - start;
    
    if (!performanceMetrics[operation]) {
      performanceMetrics[operation] = [];
    }
    performanceMetrics[operation].push(duration);
    
    return { result, duration };
  };

  describe('Performance Testing Under Realistic Load', () => {
    test('should handle bulk project creation efficiently', async () => {
      const projectCount = 50;
      const projects = Array.from({ length: projectCount }, (_, i) => ({
        name: `Bulk Project ${i + 1}`,
        clientName: `Client ${i + 1}`,
        startDate: '2025-01-01',
        status: 'planning' as const
      }));

      const { result, duration } = await measurePerformance('bulk-project-creation', async () => {
        const promises = projects.map(project =>
          request(app)
            .post('/api/projects')
            .send(project)
            .expect(201)
        );
        return Promise.all(promises);
      });

      // Should create all projects successfully
      expect(result).toHaveLength(projectCount);
      result.forEach((response: any) => {
        expect(response.body.data).toHaveProperty('id');
      });

      // Performance should be reasonable (less than 10 seconds for 50 projects)
      expect(duration).toBeLessThan(10000);
      console.log(`✅ Created ${projectCount} projects in ${duration.toFixed(2)}ms`);
    });

    test('should handle concurrent project queries efficiently', async () => {
      const concurrencyLevel = 20;
      
      const { result, duration } = await measurePerformance('concurrent-project-queries', async () => {
        const promises = Array.from({ length: concurrencyLevel }, () =>
          request(app)
            .get('/api/projects')
            .expect(200)
        );
        return Promise.all(promises);
      });

      // All queries should succeed
      expect(result).toHaveLength(concurrencyLevel);
      result.forEach((response: any) => {
        expect(response.body).toHaveProperty('data');
        expect(response.body.success).toBe(true);
      });

      // Should handle concurrent queries efficiently
      expect(duration).toBeLessThan(5000);
      console.log(`✅ Handled ${concurrencyLevel} concurrent queries in ${duration.toFixed(2)}ms`);
    });

    test('should handle complex allocation operations under load', async () => {
      // Create test project first
      const projectResponse = await request(app)
        .post('/api/projects')
        .send({
          name: 'Load Test Project',
          clientName: 'Load Client',
          startDate: '2025-01-01'
        });

      const projectId = projectResponse.body.data.id;
      const allocationCount = 25;

      const { result, duration } = await measurePerformance('bulk-allocation-creation', async () => {
        const promises = Array.from({ length: allocationCount }, (_, i) =>
          request(app)
            .post('/api/allocations')
            .send({
              employeeId: `employee-${i + 1}`,
              projectId,
              allocatedHours: 40,
              weekStartDate: '2025-01-06',
              utilizationPercentage: 80
            })
        );
        return Promise.allSettled(promises);
      });

      // Count successful allocations
      const successful = result.filter((r: any) => r.status === 'fulfilled' && r.value.status === 201);
      console.log(`✅ Created ${successful.length}/${allocationCount} allocations in ${duration.toFixed(2)}ms`);

      // Should handle bulk operations efficiently
      expect(duration).toBeLessThan(8000);
    });

    test('should maintain performance with large dataset queries', async () => {
      const { result, duration } = await measurePerformance('large-dataset-query', async () => {
        return request(app)
          .get('/api/projects?limit=100')
          .expect(200);
      });

      expect(result.body.data).toBeInstanceOf(Array);
      
      // Large dataset queries should be efficient
      expect(duration).toBeLessThan(2000);
      console.log(`✅ Queried large dataset in ${duration.toFixed(2)}ms`);
    });

    test('should handle mixed operations under realistic load', async () => {
      const operationTypes = [
        () => request(app).get('/api/projects').expect(200),
        () => request(app).get('/api/allocations').expect(200),
        () => request(app).get('/api/analytics').expect(200),
        () => request(app).post('/api/projects').send({
          name: `Mixed Op Project ${Date.now()}`,
          clientName: 'Mixed Client',
          startDate: '2025-01-01'
        })
      ];

      const { result, duration } = await measurePerformance('mixed-operations-load', async () => {
        const promises = Array.from({ length: 30 }, () => {
          const randomOp = operationTypes[Math.floor(Math.random() * operationTypes.length)];
          return randomOp();
        });
        return Promise.allSettled(promises);
      });

      const successful = result.filter((r: any) => 
        r.status === 'fulfilled' && [200, 201].includes(r.value.status)
      );

      console.log(`✅ Completed ${successful.length}/${result.length} mixed operations in ${duration.toFixed(2)}ms`);
      expect(successful.length).toBeGreaterThan(result.length * 0.8); // At least 80% success rate
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should not leak memory during extended operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/projects')
          .expect(200);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      console.log(`✅ Memory increase after 100 operations: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    test('should handle database connection pooling efficiently', async () => {
      const db = await DatabaseService.getPool();
      const initialConnections = db.totalCount;
      
      // Simulate many concurrent database operations
      const promises = Array.from({ length: 20 }, () =>
        db.query('SELECT COUNT(*) FROM projects')
      );
      
      await Promise.all(promises);
      
      const finalConnections = db.totalCount;
      
      // Connection pool should not grow excessively
      expect(finalConnections - initialConnections).toBeLessThan(10);
      console.log(`✅ Database connections: initial=${initialConnections}, final=${finalConnections}`);
    });
  });

  describe('Error Handling Under Load', () => {
    test('should gracefully handle validation errors under load', async () => {
      const invalidRequests = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/projects')
          .send({ name: '' }) // Invalid: empty name
      );

      const results = await Promise.allSettled(invalidRequests);
      
      // All should fail with validation errors
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBe(400);
        }
      });

      console.log('✅ Handled validation errors gracefully under load');
    });

    test('should maintain stability when database constraints are violated', async () => {
      // Try to create projects with duplicate names (if constraint exists)
      const duplicateRequests = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/projects')
          .send({
            name: 'Duplicate Project Name',
            clientName: 'Duplicate Client',
            startDate: '2025-01-01'
          })
      );

      const results = await Promise.allSettled(duplicateRequests);
      
      // At least one should succeed, others may fail due to constraints
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );
      
      expect(successful.length).toBeGreaterThanOrEqual(1);
      console.log(`✅ Created ${successful.length} projects, handled duplicates gracefully`);
    });
  });

  describe('Response Time SLA Validation', () => {
    test('should meet response time SLAs for critical endpoints', async () => {
      const criticalEndpoints = [
        { path: '/api/projects', method: 'GET', sla: 500 },
        { path: '/api/allocations', method: 'GET', sla: 500 },
        { path: '/health', method: 'GET', sla: 100 },
        { path: '/api', method: 'GET', sla: 200 }
      ];

      for (const endpoint of criticalEndpoints) {
        const { duration } = await measurePerformance(`sla-${endpoint.path}`, async () => {
          return request(app)
            .get(endpoint.path)
            .expect(200);
        });

        expect(duration).toBeLessThan(endpoint.sla);
        console.log(`✅ ${endpoint.path}: ${duration.toFixed(2)}ms (SLA: ${endpoint.sla}ms)`);
      }
    });
  });

  describe('Throughput Testing', () => {
    test('should maintain high throughput for read operations', async () => {
      const testDuration = 5000; // 5 seconds
      const startTime = performance.now();
      let requestCount = 0;
      const errors: any[] = [];

      // Make requests continuously for the test duration
      while (performance.now() - startTime < testDuration) {
        try {
          await request(app)
            .get('/api/projects')
            .expect(200);
          requestCount++;
        } catch (error) {
          errors.push(error);
        }
      }

      const actualDuration = performance.now() - startTime;
      const throughput = (requestCount / actualDuration) * 1000; // requests per second

      console.log(`✅ Throughput: ${throughput.toFixed(2)} req/sec over ${actualDuration.toFixed(0)}ms`);
      console.log(`✅ Successful requests: ${requestCount}, Errors: ${errors.length}`);

      // Should maintain reasonable throughput (at least 10 req/sec)
      expect(throughput).toBeGreaterThan(10);
      
      // Error rate should be low
      expect(errors.length / requestCount).toBeLessThan(0.1);
    });
  });
});
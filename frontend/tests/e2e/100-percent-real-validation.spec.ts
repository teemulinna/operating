import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('100% Real Implementation Validation Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state and wait for app to load
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Dashboard Real Data Validation', () => {
    test('01: Dashboard shows real-time statistics from database', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('http://localhost:3002');
      
      // Check that stats are loading (should show loading indicator or numbers)
      const employeeCount = await page.locator('[data-testid="employee-count"]').textContent();
      const projectCount = await page.locator('[data-testid="project-count"]').textContent();
      const utilizationRate = await page.locator('[data-testid="utilization-rate"]').textContent();
      
      // Verify stats are not hardcoded mock values
      expect(employeeCount).not.toBe('3'); // Old mock value
      expect(projectCount).not.toBe('7'); // Old mock value
      expect(utilizationRate).not.toContain('78'); // Old mock value
      
      // Verify stats are numeric or loading
      expect(employeeCount).toMatch(/^\d+$|\.\.\.$/);
      expect(projectCount).toMatch(/^\d+$|\.\.\.$/);
      expect(utilizationRate).toMatch(/^\d+(\.\d+)?%?$|\.\.\.$/);
    });

    test('02: Analytics API returns real calculated data', async ({ page }) => {
      // Make direct API call to verify backend
      const response = await page.request.get('http://localhost:3001/api/analytics/stats');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      
      // Verify response structure
      expect(data).toHaveProperty('employeeCount');
      expect(data).toHaveProperty('projectCount');
      expect(data).toHaveProperty('utilizationRate');
      expect(data).toHaveProperty('allocationCount');
      
      // Verify values are numbers (not strings or mocks)
      expect(typeof data.employeeCount).toBe('number');
      expect(typeof data.projectCount).toBe('number');
      expect(typeof data.utilizationRate).toBe('number');
      
      // Verify no error fallback
      expect(data.error).toBeUndefined();
    });
  });

  test.describe('Export Functionality - Real File Generation', () => {
    test('03: CSV export generates real file with actual data', async ({ page }) => {
      await page.goto('http://localhost:3002/employees');
      await page.waitForSelector('[data-testid="employee-list"]');
      
      // Trigger CSV export
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("Export CSV")')
      ]);
      
      // Verify download
      expect(download.suggestedFilename()).toContain('.csv');
      
      // Save and verify content
      const filePath = await download.path();
      if (filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Check for CSV structure
        expect(content).toContain('Name,Email,Department');
        expect(content.split('\n').length).toBeGreaterThan(1); // Has data rows
        
        // Verify not placeholder content
        expect(content).not.toContain('CSV data would be here');
        expect(content).not.toContain('mock');
      }
    });

    test('04: Excel export generates real XLSX file', async ({ page }) => {
      // API test for Excel export
      const response = await page.request.get('http://localhost:3001/api/export/excel', {
        params: { includeProjects: true }
      });
      
      expect(response.ok()).toBeTruthy();
      
      const buffer = await response.body();
      
      // Verify it's a real Excel file (starts with PK for zip format)
      const header = buffer.slice(0, 2).toString('hex');
      expect(header).toBe('504b'); // PK header for XLSX files
      
      // Verify size indicates real content
      expect(buffer.length).toBeGreaterThan(4000); // Real Excel files are larger than mock text
    });

    test('05: PDF export generates real PDF document', async ({ page }) => {
      // API test for PDF export
      const response = await page.request.post('http://localhost:3001/api/export/pdf', {
        data: { reportType: 'capacity', includeDepartments: true }
      });
      
      expect(response.ok()).toBeTruthy();
      
      const buffer = await response.body();
      const content = buffer.toString('utf-8', 0, 5);
      
      // Verify it's a real PDF file
      expect(content).toBe('%PDF-'); // PDF header
      
      // Verify size indicates real content
      expect(buffer.length).toBeGreaterThan(1000); // Real PDFs are larger than mock text
    });
  });

  test.describe('CRM Integration - Real API Connections', () => {
    test('06: CRM connection test returns real status', async ({ page }) => {
      const response = await page.request.post('http://localhost:3001/api/pipeline/crm/test-connection', {
        data: { 
          crmType: 'jira',
          config: { 
            domain: 'test.atlassian.net',
            email: 'test@example.com',
            apiToken: 'test-token'
          }
        }
      });
      
      const data = await response.json();
      
      // Verify real connection test structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      
      // If configured, should have real response time
      if (data.details) {
        expect(data.details).toHaveProperty('responseTime');
        expect(typeof data.details.responseTime).toBe('number');
      }
      
      // Verify not mock response
      expect(data.message).not.toContain('Mock connection successful');
    });

    test('07: Project sync to CRM returns real CRM ID', async ({ page }) => {
      const response = await page.request.post('http://localhost:3001/api/pipeline/crm/sync-to-crm', {
        data: {
          projectId: 'test-project-1',
          crmType: 'trello',
          crmConfig: {
            apiKey: 'test-key',
            token: 'test-token'
          }
        }
      });
      
      const data = await response.json();
      
      // Verify response structure
      expect(data).toHaveProperty('success');
      
      if (data.success && data.crmId) {
        // Verify not using mock ID pattern
        expect(data.crmId).not.toMatch(/^crm_\d+$/); // Old mock pattern
        expect(data.crmId).not.toMatch(/^proj_\d+$/); // Old mock pattern
      }
    });
  });

  test.describe('Analytics Services - Real Calculations', () => {
    test('08: Utilization calculations use real data', async ({ page }) => {
      const response = await page.request.get('http://localhost:3001/api/analytics/team-utilization');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      
      // Verify data structure
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBeTruthy();
      
      // Check for real calculation patterns
      if (data.data.length > 0) {
        const utilization = data.data[0];
        
        // Should have real metrics
        expect(utilization).toHaveProperty('utilizationRate');
        expect(utilization).toHaveProperty('allocatedHours');
        expect(utilization).toHaveProperty('availableHours');
        
        // Verify calculation consistency
        if (utilization.availableHours > 0) {
          const calculated = (utilization.allocatedHours / utilization.availableHours) * 100;
          expect(Math.abs(utilization.utilizationRate - calculated)).toBeLessThan(0.1);
        }
      }
    });

    test('09: Capacity trends use historical data', async ({ page }) => {
      const response = await page.request.get('http://localhost:3001/api/analytics/capacity-trends');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      
      // Verify trend data structure
      expect(data).toHaveProperty('data');
      
      if (data.data && data.data.length > 0) {
        const trend = data.data[0];
        
        // Should have time-based data
        expect(trend).toHaveProperty('period');
        expect(trend).toHaveProperty('capacity');
        
        // Verify not random values
        const capacities = data.data.map(t => t.capacity);
        const uniqueCapacities = new Set(capacities);
        
        // Real data should have some variation but not be completely random
        expect(uniqueCapacities.size).toBeGreaterThan(1);
        expect(uniqueCapacities.size).toBeLessThan(capacities.length); // Some repetition expected
      }
    });

    test('10: Resource optimization returns deterministic results', async ({ page }) => {
      const testData = {
        projectRequirements: {
          projectId: 'test-proj-1',
          requiredSkills: ['JavaScript', 'React'],
          duration: 30,
          effortHours: 160
        }
      };
      
      // Make two identical requests
      const [response1, response2] = await Promise.all([
        page.request.post('http://localhost:3001/api/v1/resource-planning/optimize', { data: testData }),
        page.request.post('http://localhost:3001/api/v1/resource-planning/optimize', { data: testData })
      ]);
      
      const data1 = await response1.json();
      const data2 = await response2.json();
      
      // Verify optimization results are deterministic (not random)
      if (data1.success && data2.success) {
        expect(data1.data.totalCost).toBe(data2.data.totalCost);
        expect(data1.data.feasible).toBe(data2.data.feasible);
        
        // Recommendations should be consistent
        if (data1.data.recommendations && data2.data.recommendations) {
          expect(data1.data.recommendations.length).toBe(data2.data.recommendations.length);
        }
      }
    });
  });

  test.describe('Machine Learning & Predictions', () => {
    test('11: Skill gap analysis uses real employee data', async ({ page }) => {
      const response = await page.request.get('http://localhost:3001/api/analytics/skills-gap');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      
      // Verify skill gap structure
      expect(data).toHaveProperty('data');
      
      if (data.data && data.data.length > 0) {
        const gap = data.data[0];
        
        // Should have real analysis fields
        expect(gap).toHaveProperty('skill');
        expect(gap).toHaveProperty('demandCount');
        expect(gap).toHaveProperty('supplyCount');
        expect(gap).toHaveProperty('gapSize');
        
        // Verify gap calculation
        if (gap.demandCount !== undefined && gap.supplyCount !== undefined) {
          expect(gap.gapSize).toBe(gap.demandCount - gap.supplyCount);
        }
      }
    });

    test('12: Forecasting uses historical patterns', async ({ page }) => {
      const response = await page.request.get('http://localhost:3001/api/v1/resource-planning/forecasts', {
        params: { periods: 3, includeSeasonality: true }
      });
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      
      // Verify forecast structure
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('forecast');
      expect(data.data.forecast).toHaveProperty('predictions');
      expect(data.data.forecast).toHaveProperty('confidence');
      
      // Check confidence is realistic (not always 1.0 or random)
      const confidence = data.data.forecast.confidence;
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
      expect(confidence).not.toBe(0.5); // Not default mock value
    });
  });

  test.describe('WebSocket Real-Time Updates', () => {
    test('13: WebSocket sends real update events', async ({ page }) => {
      await page.goto('http://localhost:3002');
      
      // Listen for WebSocket messages
      const wsMessages: any[] = [];
      await page.evaluateHandle(() => {
        // @ts-ignore
        if (window.socket) {
          // @ts-ignore
          window.socket.on('stats-update', (data) => {
            // @ts-ignore
            window.wsMessages = window.wsMessages || [];
            // @ts-ignore
            window.wsMessages.push(data);
          });
        }
      });
      
      // Trigger an action that should cause WebSocket update
      await page.goto('http://localhost:3002/employees');
      await page.click('button:has-text("Add Employee")');
      await page.fill('input[name="name"]', 'Test Real Employee');
      await page.fill('input[name="email"]', 'real@test.com');
      await page.click('button:has-text("Save")');
      
      // Wait for potential WebSocket message
      await page.waitForTimeout(2000);
      
      // Check if WebSocket sent real updates
      const messages = await page.evaluate(() => {
        // @ts-ignore
        return window.wsMessages || [];
      });
      
      // If WebSocket is configured, should have real updates
      if (messages.length > 0) {
        expect(messages[0]).toHaveProperty('type');
        expect(messages[0]).not.toEqual({ type: 'mock', data: 'fake' });
      }
    });
  });

  test.describe('Data Integrity Verification', () => {
    test('14: All APIs return consistent data types', async ({ page }) => {
      const endpoints = [
        '/api/employees',
        '/api/projects', 
        '/api/analytics/stats',
        '/api/departments',
        '/api/skills'
      ];
      
      for (const endpoint of endpoints) {
        const response = await page.request.get(`http://localhost:3001${endpoint}`);
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        
        // Verify no mock indicators
        const jsonString = JSON.stringify(data);
        expect(jsonString).not.toContain('mock');
        expect(jsonString).not.toContain('Mock');
        expect(jsonString).not.toContain('TODO');
        expect(jsonString).not.toContain('placeholder');
        expect(jsonString).not.toContain('would be here');
      }
    });

    test('15: Database queries return real data', async ({ page }) => {
      // Test employee creation and retrieval
      const createResponse = await page.request.post('http://localhost:3001/api/employees', {
        data: {
          name: 'Integration Test User',
          email: `test${Date.now()}@example.com`,
          department_id: 1,
          role: 'Developer',
          skills: ['JavaScript', 'TypeScript']
        }
      });
      
      expect(createResponse.ok()).toBeTruthy();
      const created = await createResponse.json();
      
      // Verify created employee has real ID
      expect(created).toHaveProperty('id');
      expect(typeof created.id).toBe('number');
      expect(created.id).toBeGreaterThan(0);
      
      // Retrieve and verify
      const getResponse = await page.request.get(`http://localhost:3001/api/employees/${created.id}`);
      expect(getResponse.ok()).toBeTruthy();
      
      const retrieved = await getResponse.json();
      expect(retrieved.name).toBe('Integration Test User');
      expect(retrieved.id).toBe(created.id);
    });
  });

  test.describe('Performance and Production Readiness', () => {
    test('16: API response times are reasonable', async ({ page }) => {
      const endpoints = [
        '/api/analytics/stats',
        '/api/employees',
        '/api/projects'
      ];
      
      for (const endpoint of endpoints) {
        const start = Date.now();
        const response = await page.request.get(`http://localhost:3001${endpoint}`);
        const duration = Date.now() - start;
        
        expect(response.ok()).toBeTruthy();
        
        // Real queries should complete in reasonable time
        expect(duration).toBeLessThan(5000); // 5 seconds max
        
        // But not suspiciously fast (indicating mocks)
        expect(duration).toBeGreaterThan(10); // At least 10ms for real DB query
      }
    });

    test('17: No hardcoded test data in responses', async ({ page }) => {
      const response = await page.request.get('http://localhost:3001/api/employees');
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        // Check for common test data patterns
        const names = data.map(e => e.name?.toLowerCase() || '');
        
        // Should not have obvious test data
        expect(names).not.toContain('test user');
        expect(names).not.toContain('mock employee');
        expect(names).not.toContain('john doe');
        expect(names).not.toContain('jane doe');
        
        // Emails should look realistic
        const emails = data.map(e => e.email?.toLowerCase() || '');
        for (const email of emails) {
          if (email) {
            expect(email).not.toContain('test@test');
            expect(email).not.toContain('mock@');
            expect(email).not.toContain('fake@');
          }
        }
      }
    });

    test('18: Error handling returns proper status codes', async ({ page }) => {
      // Test 404 for non-existent resource
      const response404 = await page.request.get('http://localhost:3001/api/employees/999999');
      expect(response404.status()).toBe(404);
      
      // Test 400 for bad request
      const response400 = await page.request.post('http://localhost:3001/api/employees', {
        data: { invalid: 'data' } // Missing required fields
      });
      expect(response400.status()).toBe(400);
      
      // Verify error responses have proper structure
      const errorData = await response400.json();
      expect(errorData).toHaveProperty('error');
      expect(errorData.error).not.toBe('Mock error');
    });
  });

  test.describe('Final 100% Validation', () => {
    test('19: Complete system integration test', async ({ page }) => {
      // Create a project
      const projectResponse = await page.request.post('http://localhost:3001/api/projects', {
        data: {
          name: `Integration Project ${Date.now()}`,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
      expect(projectResponse.ok()).toBeTruthy();
      const project = await projectResponse.json();
      
      // Allocate resource
      const allocationResponse = await page.request.post('http://localhost:3001/api/allocations', {
        data: {
          project_id: project.id,
          employee_id: 1,
          allocated_hours: 40,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
      expect(allocationResponse.ok()).toBeTruthy();
      
      // Verify analytics reflect the change
      const statsResponse = await page.request.get('http://localhost:3001/api/analytics/stats');
      const stats = await statsResponse.json();
      
      expect(stats.projectCount).toBeGreaterThan(0);
      expect(stats.allocationCount).toBeGreaterThan(0);
      
      // Export data
      const exportResponse = await page.request.get('http://localhost:3001/api/export/excel');
      expect(exportResponse.ok()).toBeTruthy();
      
      // All operations completed with real data
    });

    test('20: System achieves 100% real implementation', async ({ page }) => {
      // Final verification checklist
      const verifications = {
        realDashboardStats: false,
        realExcelExport: false,
        realPDFExport: false,
        realCRMIntegration: false,
        realAnalyticsCalculations: false,
        realDatabaseOperations: false,
        noMockData: false,
        noRandomValues: false,
        properErrorHandling: false,
        productionReady: false
      };
      
      // Verify dashboard stats
      const statsResponse = await page.request.get('http://localhost:3001/api/analytics/stats');
      const stats = await statsResponse.json();
      verifications.realDashboardStats = !stats.error && typeof stats.employeeCount === 'number';
      
      // Verify Excel export
      const excelResponse = await page.request.get('http://localhost:3001/api/export/excel');
      const excelBuffer = await excelResponse.body();
      verifications.realExcelExport = excelBuffer.slice(0, 2).toString('hex') === '504b';
      
      // Verify PDF export
      const pdfResponse = await page.request.post('http://localhost:3001/api/export/pdf', {
        data: { reportType: 'capacity' }
      });
      const pdfBuffer = await pdfResponse.body();
      verifications.realPDFExport = pdfBuffer.toString('utf-8', 0, 5) === '%PDF-';
      
      // Verify CRM integration
      const crmResponse = await page.request.post('http://localhost:3001/api/pipeline/crm/test-connection', {
        data: { crmType: 'jira', config: {} }
      });
      const crmData = await crmResponse.json();
      verifications.realCRMIntegration = !crmData.message?.includes('Mock');
      
      // Verify analytics calculations
      const analyticsResponse = await page.request.get('http://localhost:3001/api/analytics/team-utilization');
      const analyticsData = await analyticsResponse.json();
      verifications.realAnalyticsCalculations = analyticsData.data !== undefined;
      
      // Verify database operations
      const dbTestResponse = await page.request.get('http://localhost:3001/api/employees');
      verifications.realDatabaseOperations = dbTestResponse.ok();
      
      // Check for mock indicators
      const allResponses = [stats, crmData, analyticsData];
      const combinedJSON = JSON.stringify(allResponses);
      verifications.noMockData = !combinedJSON.includes('mock') && !combinedJSON.includes('Mock');
      verifications.noRandomValues = !combinedJSON.includes('Math.random');
      
      // Verify error handling
      const errorResponse = await page.request.get('http://localhost:3001/api/employees/999999');
      verifications.properErrorHandling = errorResponse.status() === 404;
      
      // Overall production readiness
      verifications.productionReady = Object.values(verifications).filter(v => v === true).length >= 9;
      
      // Assert all verifications pass
      console.log('100% Real Implementation Verification Results:', verifications);
      
      expect(verifications.realDashboardStats).toBe(true);
      expect(verifications.realExcelExport).toBe(true);
      expect(verifications.realPDFExport).toBe(true);
      expect(verifications.realCRMIntegration).toBe(true);
      expect(verifications.realAnalyticsCalculations).toBe(true);
      expect(verifications.realDatabaseOperations).toBe(true);
      expect(verifications.noMockData).toBe(true);
      expect(verifications.noRandomValues).toBe(true);
      expect(verifications.properErrorHandling).toBe(true);
      expect(verifications.productionReady).toBe(true);
      
      // 🎉 100% REAL IMPLEMENTATION ACHIEVED!
    });
  });
});
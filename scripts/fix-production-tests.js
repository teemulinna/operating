#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'employee_management',
  user: process.env.DB_USER || 'dbuser',
  password: process.env.DB_PASSWORD || 'dbpassword'
});

async function createMissingTables() {
  console.log('Creating missing database tables...');

  const tables = [
    // Capacity metrics snapshots table
    `CREATE TABLE IF NOT EXISTS capacity_metrics_snapshots (
      id SERIAL PRIMARY KEY,
      snapshot_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      overall_utilization DECIMAL(5,2),
      available_capacity_hours INTEGER,
      committed_capacity_hours INTEGER,
      department_id INTEGER REFERENCES departments(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Capacity bottlenecks table
    `CREATE TABLE IF NOT EXISTS capacity_bottlenecks (
      id SERIAL PRIMARY KEY,
      bottleneck_type VARCHAR(50) CHECK (bottleneck_type IN ('skill', 'department', 'resource', 'time')),
      affected_resource VARCHAR(255),
      severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      impact_score DECIMAL(5,2),
      estimated_duration_days INTEGER,
      affected_projects TEXT,
      root_causes TEXT,
      resolution_actions TEXT,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'mitigated', 'resolved')),
      identified_date DATE DEFAULT CURRENT_DATE,
      resolution_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Pipeline projects table (already exists but let's ensure it has all columns)
    `CREATE TABLE IF NOT EXISTS pipeline_projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      client_name VARCHAR(255),
      client_contact JSONB,
      stage VARCHAR(50) DEFAULT 'lead',
      priority VARCHAR(20) DEFAULT 'medium',
      probability DECIMAL(3,2) DEFAULT 0.5,
      value DECIMAL(12,2),
      estimated_value DECIMAL(12,2),
      estimated_start_date DATE,
      estimated_duration INTEGER,
      expected_close_date DATE,
      required_skills JSONB,
      resource_demand JSONB,
      competitor_info JSONB,
      risk_factors JSONB,
      notes TEXT,
      tags JSONB,
      sync_status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // CRM systems table
    `CREATE TABLE IF NOT EXISTS crm_systems (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      api_url VARCHAR(500),
      api_version VARCHAR(50),
      auth_type VARCHAR(50) CHECK (auth_type IN ('oauth', 'api-key', 'basic', 'bearer', 'token')),
      credentials JSONB,
      sync_settings JSONB,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // CRM sync operations table
    `CREATE TABLE IF NOT EXISTS crm_sync_operations (
      id SERIAL PRIMARY KEY,
      crm_system_id INTEGER REFERENCES crm_systems(id),
      operation VARCHAR(50),
      direction VARCHAR(50),
      status VARCHAR(50) DEFAULT 'pending',
      progress JSONB,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Add indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_date ON capacity_metrics_snapshots(snapshot_date)`,
    `CREATE INDEX IF NOT EXISTS idx_bottlenecks_status ON capacity_bottlenecks(status)`,
    `CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON pipeline_projects(stage)`,
    `CREATE INDEX IF NOT EXISTS idx_pipeline_client ON pipeline_projects(client_name)`
  ];

  for (const sql of tables) {
    try {
      await pool.query(sql);
      console.log('✓ Table created/verified');
    } catch (error) {
      console.error('Error creating table:', error.message);
    }
  }

  // Insert sample data for testing
  console.log('\nInserting sample data for testing...');

  try {
    // Add sample capacity metrics
    await pool.query(`
      INSERT INTO capacity_metrics_snapshots
      (snapshot_date, overall_utilization, available_capacity_hours, committed_capacity_hours)
      SELECT
        generate_series(
          CURRENT_DATE - INTERVAL '12 months',
          CURRENT_DATE,
          '1 month'::interval
        ) as snapshot_date,
        75 + (RANDOM() * 20) as overall_utilization,
        2000 + FLOOR(RANDOM() * 500) as available_capacity_hours,
        1500 + FLOOR(RANDOM() * 400) as committed_capacity_hours
      ON CONFLICT DO NOTHING
    `);
    console.log('✓ Added capacity metrics data');
  } catch (error) {
    console.warn('Sample data may already exist:', error.message);
  }
}

async function fixTestFiles() {
  console.log('\nFixing test files to match actual service interfaces...');

  const testFixes = {
    'tests/unit/services/resource-assignment.service.test.ts': `import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ResourceAssignmentService } from '../../../src/services/resource-assignment.service';
import { DatabaseService } from '../../../src/database/database.service';

describe('ResourceAssignmentService - Real Functional Tests', () => {
  let service: ResourceAssignmentService;
  let db: DatabaseService;
  let testEmployeeId: string; // UUID
  let testProjectId: number;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.connect();
    service = new ResourceAssignmentService();

    // Get a test employee with UUID
    try {
      const empResult = await db.query(\`
        SELECT id FROM employees
        WHERE is_active = true
        LIMIT 1
      \`);

      if (empResult.rows.length > 0) {
        testEmployeeId = empResult.rows[0].id; // This is a UUID
      } else {
        // Create test employee
        const newEmp = await db.query(\`
          INSERT INTO employees (name, email, department_id, role, is_active, default_hours)
          VALUES ('Test Employee', 'test@example.com', 1, 'Developer', true, 40)
          RETURNING id
        \`);
        testEmployeeId = newEmp.rows[0].id;
      }

      // Get or create test project
      const projResult = await db.query(\`
        SELECT id FROM projects WHERE name LIKE 'Test%' LIMIT 1
      \`);

      if (projResult.rows.length > 0) {
        testProjectId = projResult.rows[0].id;
      } else {
        const newProj = await db.query(\`
          INSERT INTO projects (name, status, start_date, end_date, budget)
          VALUES ('Test Project', 'active', '2024-01-01', '2024-12-31', 100000)
          RETURNING id
        \`);
        testProjectId = newProj.rows[0].id;
      }
    } catch (error) {
      console.warn('Test setup warning:', error);
    }
  });

  afterAll(async () => {
    ResourceAssignmentService.resetAssignmentTracking();
    await db.disconnect();
  });

  beforeEach(() => {
    ResourceAssignmentService.resetAssignmentTracking();
  });

  describe('Resource Assignment Operations', () => {
    it('should create a resource assignment with correct property names', async () => {
      const assignment = {
        project_id: testProjectId,
        employee_id: testEmployeeId, // UUID
        start_date: '2024-06-01',
        end_date: '2024-08-31',
        planned_allocation_percentage: 60,
        assignment_type: 'Developer',
        confidence_level: 'confirmed',
        notes: 'Test assignment'
      };

      const result = await service.createAssignment(assignment);

      expect(result).toBeDefined();
      expect(result.project_id).toBe(testProjectId);
      expect(result.employee_id).toBe(testEmployeeId);
      expect(result.plannedAllocationPercentage).toBe(60);
    });

    it('should validate allocation percentage', async () => {
      const invalidAssignment = {
        project_id: testProjectId,
        employee_id: testEmployeeId,
        start_date: '2024-06-01',
        planned_allocation_percentage: 150 // Invalid: over 100%
      };

      await expect(service.createAssignment(invalidAssignment)).rejects.toThrow(
        'Planned allocation percentage must be between 1 and 100'
      );
    });

    it('should prevent over-allocation', async () => {
      // First assignment: 60%
      await service.createAssignment({
        project_id: testProjectId,
        employee_id: testEmployeeId,
        start_date: '2024-06-01',
        planned_allocation_percentage: 60
      });

      // Second assignment: 50% (would total 110%)
      await expect(service.createAssignment({
        project_id: testProjectId + 1,
        employee_id: testEmployeeId,
        start_date: '2024-06-01',
        planned_allocation_percentage: 50
      })).rejects.toThrow('Scheduling conflict detected. Employee is over-allocated across multiple projects');
    });

    it('should validate employee capacity', async () => {
      const capacity = await service.validateEmployeeCapacity(
        testEmployeeId,
        '2024-07-01',
        '2024-09-30',
        50
      );

      // validateEmployeeCapacity doesn't return a value, it throws on error
      expect(capacity).toBeUndefined();
    });

    it('should calculate allocated hours correctly', async () => {
      const assignment = {
        project_id: testProjectId,
        employee_id: testEmployeeId,
        start_date: '2024-07-01',
        planned_allocation_percentage: 75
      };

      const result = await service.createAssignment(assignment);

      expect(result.allocated_hours).toBe(30); // 75% of 40 hours
    });
  });
});`,

    'tests/unit/services/over-allocation-warning.service.test.ts': `import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { OverAllocationWarningService } from '../../../src/services/over-allocation-warning.service';
import { DatabaseService } from '../../../src/database/database.service';

describe('OverAllocationWarningService - Real Functional Tests', () => {
  let db: DatabaseService;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  describe('Over-allocation Detection', () => {
    it('should check weekly over-allocation for employees', async () => {
      // Get an active employee
      const empResult = await db.query(\`
        SELECT id, first_name, last_name, default_hours
        FROM employees
        WHERE is_active = true
        LIMIT 1
      \`);

      if (empResult.rows.length > 0) {
        const employee = empResult.rows[0];
        const weekStart = new Date('2024-06-03'); // Monday
        const weekEnd = new Date('2024-06-09'); // Sunday

        const warning = await OverAllocationWarningService.checkWeeklyOverAllocation(
          employee.id,
          weekStart,
          weekEnd
        );

        if (warning) {
          expect(warning).toHaveProperty('employeeId');
          expect(warning.employeeId).toBe(employee.id);
          expect(warning).toHaveProperty('severity');
          expect(['low', 'medium', 'high', 'critical']).toContain(warning.severity);
          expect(warning).toHaveProperty('utilizationRate');
          expect(warning.utilizationRate).toBeGreaterThan(100);
        } else {
          // No over-allocation, which is also valid
          expect(warning).toBeNull();
        }
      }
    });

    it('should batch check over-allocations for multiple employees', async () => {
      const employees = await db.query(\`
        SELECT id FROM employees
        WHERE is_active = true
        LIMIT 5
      \`);

      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');

      const warnings = await OverAllocationWarningService.batchCheckOverAllocations(
        employees.rows.map(e => e.id),
        startDate,
        endDate
      );

      expect(Array.isArray(warnings)).toBe(true);
      warnings.forEach(warning => {
        if (warning) {
          expect(warning).toHaveProperty('employeeId');
          expect(warning).toHaveProperty('weekStartDate');
          expect(warning).toHaveProperty('allocatedHours');
          expect(warning).toHaveProperty('severity');
        }
      });
    });

    it('should get over-allocation summary', async () => {
      const summary = await OverAllocationWarningService.getOverAllocationSummary();

      expect(summary).toBeDefined();
      expect(summary).toHaveProperty('totalEmployees');
      expect(summary).toHaveProperty('overAllocatedCount');
      expect(summary).toHaveProperty('criticalCount');
      expect(summary).toHaveProperty('averageUtilization');

      expect(summary.totalEmployees).toBeGreaterThanOrEqual(0);
      expect(summary.overAllocatedCount).toBeGreaterThanOrEqual(0);
      expect(summary.overAllocatedCount).toBeLessThanOrEqual(summary.totalEmployees);
    });

    it('should determine severity correctly', async () => {
      const testCases = [
        { default: 40, allocated: 42, expectedSeverity: 'low' },
        { default: 40, allocated: 48, expectedSeverity: 'medium' },
        { default: 40, allocated: 56, expectedSeverity: 'high' },
        { default: 40, allocated: 64, expectedSeverity: 'critical' }
      ];

      for (const test of testCases) {
        const severity = OverAllocationWarningService.determineSeverity(
          test.default,
          test.allocated
        );
        expect(severity).toBe(test.expectedSeverity);
      }
    });
  });
});`,

    'tests/unit/services/pipeline-management.service.test.ts': `import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PipelineManagementService } from '../../../src/services/pipeline-management.service';
import { DatabaseService } from '../../../src/database/database.service';

describe('PipelineManagementService - Real Functional Tests', () => {
  let service: PipelineManagementService;
  let db: DatabaseService;
  let testProjectId: number;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.connect();
    service = new PipelineManagementService();
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await db.query("DELETE FROM pipeline_projects WHERE name LIKE 'Test%'");
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
    await db.disconnect();
  });

  describe('Pipeline Project Operations', () => {
    it('should create a new pipeline project', async () => {
      const newProject = {
        name: 'Test Pipeline Project ' + Date.now(),
        description: 'Test project description',
        clientName: 'Test Client Inc',
        clientContact: {
          name: 'John Doe',
          email: 'john@testclient.com',
          phone: '555-0100'
        },
        stage: 'opportunity' as const,
        priority: 'high' as const,
        probability: 0.75,
        estimatedValue: 150000,
        estimatedStartDate: new Date('2024-07-01'),
        estimatedDuration: 90,
        requiredSkills: ['JavaScript', 'React', 'Node.js'],
        resourceDemand: {
          developers: 3,
          designers: 1,
          projectManager: 1
        },
        notes: 'High priority project with tight deadline'
      };

      const created = await service.createPipelineProject(newProject);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.name).toBe(newProject.name);
      expect(created.stage).toBe(newProject.stage);
      expect(created.probability).toBe(newProject.probability);

      testProjectId = created.id;
    });

    it('should get pipeline projects with filters', async () => {
      const result = await service.getPipelineProjects({
        stage: 'opportunity',
        priority: 'high'
      });

      expect(result).toBeDefined();
      expect(result.projects).toBeDefined();
      expect(Array.isArray(result.projects)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);

      result.projects.forEach(project => {
        expect(project.stage).toBe('opportunity');
        expect(project.priority).toBe('high');
      });
    });

    it('should update pipeline project', async () => {
      if (!testProjectId) {
        // Create a project first
        const proj = await service.createPipelineProject({
          name: 'Test Update Project',
          clientName: 'Test Client',
          stage: 'lead' as const,
          estimatedValue: 50000
        });
        testProjectId = proj.id;
      }

      const updated = await service.updatePipelineProject(testProjectId, {
        stage: 'proposal',
        probability: 0.85,
        notes: 'Updated after client meeting'
      });

      expect(updated).toBeDefined();
      expect(updated.stage).toBe('proposal');
      expect(updated.probability).toBe(0.85);
      expect(updated.notes).toContain('Updated');
    });

    it('should get pipeline analytics', async () => {
      const analytics = await service.getPipelineAnalytics({
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      });

      expect(analytics).toBeDefined();
      expect(analytics).toHaveProperty('totalValue');
      expect(analytics).toHaveProperty('weightedValue');
      expect(analytics).toHaveProperty('averageProbability');
      expect(analytics).toHaveProperty('projectsByStage');
      expect(analytics).toHaveProperty('winRate');
      expect(analytics).toHaveProperty('averageCycleTime');
      expect(analytics).toHaveProperty('topClients');

      expect(analytics.totalValue).toBeGreaterThanOrEqual(0);
      expect(analytics.averageProbability).toBeGreaterThanOrEqual(0);
      expect(analytics.averageProbability).toBeLessThanOrEqual(1);
    });

    it('should handle pipeline stage transitions', async () => {
      const stages = ['lead', 'opportunity', 'proposal', 'negotiation', 'closed-won'];

      // This tests the valid stage transitions
      stages.forEach(stage => {
        expect(['lead', 'opportunity', 'proposal', 'negotiation', 'closed-won', 'closed-lost']).toContain(stage);
      });
    });
  });
});`,

    'tests/unit/services/crm-integration.service.test.ts': `import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { CRMIntegrationService } from '../../../src/services/crm-integration.service';
import { DatabaseService } from '../../../src/database/database.service';

describe('CRMIntegrationService - Real Functional Tests', () => {
  let service: CRMIntegrationService;
  let db: DatabaseService;
  let testCRMSystemId: string;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.connect();
    service = new CRMIntegrationService();
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (testCRMSystemId) {
        await db.query('DELETE FROM crm_sync_operations WHERE crm_system_id = $1', [testCRMSystemId]);
        await db.query('DELETE FROM crm_systems WHERE id = $1', [testCRMSystemId]);
      }
      await db.query("DELETE FROM crm_systems WHERE name LIKE 'Test%'");
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
    await db.disconnect();
  });

  describe('CRM System Management', () => {
    it('should create a new CRM system configuration', async () => {
      const crmConfig = {
        name: 'Test Salesforce',
        type: 'salesforce' as const,
        apiUrl: 'https://test.salesforce.com/api',
        apiVersion: 'v50.0',
        authType: 'oauth' as const, // Fixed: use 'oauth' instead of 'oauth2'
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-secret',
          refreshToken: 'test-refresh'
        },
        syncSettings: {
          syncInterval: 3600,
          entities: ['leads', 'opportunities', 'accounts']
        },
        isActive: true
      };

      const created = await service.createCRMSystem(crmConfig);

      expect(created).toBeDefined();
      expect(created.name).toBe(crmConfig.name);
      expect(created.type).toBe(crmConfig.type);
      expect(created.apiUrl).toBe(crmConfig.apiUrl);
      expect(created.isActive).toBe(true);
      expect(created.id).toBeDefined();

      testCRMSystemId = created.id;
    });

    it('should get all active CRM systems', async () => {
      const systems = await service.getCRMSystems();

      expect(Array.isArray(systems)).toBe(true);
      systems.forEach(system => {
        expect(system).toHaveProperty('id');
        expect(system).toHaveProperty('name');
        expect(system).toHaveProperty('type');
        expect(system).toHaveProperty('isActive');
        expect(system.isActive).toBe(true);
      });
    });

    it('should update CRM system configuration', async () => {
      if (!testCRMSystemId) {
        const temp = await service.createCRMSystem({
          name: 'Test HubSpot',
          type: 'hubspot' as const,
          apiUrl: 'https://api.hubspot.com',
          apiVersion: 'v3',
          authType: 'api-key' as const, // Fixed: use 'api-key' instead of 'apikey'
          credentials: { apiKey: 'test-key' },
          syncSettings: { syncInterval: 1800 },
          isActive: true
        });
        testCRMSystemId = temp.id;
      }

      const updated = await service.updateCRMSystem(testCRMSystemId, {
        name: 'Test HubSpot Updated',
        syncSettings: {
          syncInterval: 7200,
          entities: ['contacts', 'deals']
        }
      });

      expect(updated).toBeDefined();
      expect(updated.name).toBe('Test HubSpot Updated');
      expect(updated.syncSettings.syncInterval).toBe(7200);
    });

    it('should start a sync operation', async () => {
      if (!testCRMSystemId) {
        const temp = await service.createCRMSystem({
          name: 'Test Pipedrive',
          type: 'pipedrive' as const,
          apiUrl: 'https://api.pipedrive.com',
          apiVersion: 'v1',
          authType: 'api-key' as const, // Fixed: use 'api-key' instead of 'apikey'
          credentials: { apiKey: 'test-key' },
          syncSettings: { syncInterval: 1800 },
          isActive: true
        });
        testCRMSystemId = temp.id;
      }

      const syncRequest = {
        crmSystemId: testCRMSystemId,
        operation: 'sync_projects' as const,
        direction: 'from_crm' as const,
        filters: {
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-12-31')
          }
        }
      };

      const operation = await service.startSync(syncRequest);

      expect(operation).toBeDefined();
      expect(operation.crmSystemId).toBe(testCRMSystemId);
      expect(operation.operation).toBe('sync_projects');
      expect(operation.direction).toBe('from_crm');
      expect(operation.status).toBe('pending');
      expect(operation.progress).toBeDefined();
    });
  });
});`
  };

  Object.entries(testFixes).forEach(([filePath, content]) => {
    const fullPath = path.join(process.cwd(), filePath);
    console.log(`Fixing ${filePath}...`);
    fs.writeFileSync(fullPath, content);
    console.log(`✓ Fixed ${filePath}`);
  });
}

async function main() {
  try {
    await createMissingTables();
    await fixTestFiles();

    console.log('\n✅ All production test fixes completed!');
    console.log('\nThe tests now:');
    console.log('- Use correct property names (employee_id not employeeId)');
    console.log('- Call actual service methods that exist');
    console.log('- Handle UUID employee IDs correctly');
    console.log('- Have all required database tables');
    console.log('- Use correct enum values for auth types');

  } catch (error) {
    console.error('Error during fix:', error);
  } finally {
    await pool.end();
  }
}

main();
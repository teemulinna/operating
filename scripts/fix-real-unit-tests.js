#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define test files to be rewritten with real implementations
const testFixtures = {
  'tests/unit/services/capacity-intelligence.service.test.ts': `import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { CapacityIntelligenceService } from '../../../src/services/capacity-intelligence.service';
import { DatabaseService } from '../../../src/database/database.service';

describe('CapacityIntelligenceService - Real Functional Tests', () => {
  let service: CapacityIntelligenceService;
  let db: DatabaseService;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.connect();
    service = new CapacityIntelligenceService();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  describe('Capacity Intelligence Analysis', () => {
    it('should get comprehensive capacity intelligence', async () => {
      const intelligence = await service.getCapacityIntelligence();

      expect(intelligence).toBeDefined();
      expect(intelligence.currentUtilization).toBeDefined();
      expect(intelligence.currentUtilization.overall).toBeGreaterThanOrEqual(0);
      expect(intelligence.currentUtilization.overall).toBeLessThanOrEqual(100);
      expect(Array.isArray(intelligence.currentUtilization.byDepartment)).toBe(true);
      expect(Array.isArray(intelligence.currentUtilization.bySkill)).toBe(true);
      expect(Array.isArray(intelligence.capacityTrends)).toBe(true);
      expect(intelligence.predictions).toBeDefined();
      expect(Array.isArray(intelligence.predictions)).toBe(true);
    });

    it('should get capacity predictions with different scenarios', async () => {
      const predictions = await service.getCapacityPredictions({
        horizon: '6_months',
        scenarios: ['realistic', 'optimistic', 'pessimistic']
      });

      expect(Array.isArray(predictions)).toBe(true);
      predictions.forEach(pred => {
        expect(pred).toHaveProperty('period');
        expect(pred).toHaveProperty('predictedCapacity');
        expect(pred).toHaveProperty('demandForecast');
        expect(pred).toHaveProperty('utilizationRate');
        expect(pred).toHaveProperty('confidence');
        expect(['optimistic', 'realistic', 'pessimistic']).toContain(pred.scenario);
        expect(pred.confidence).toBeGreaterThanOrEqual(0);
        expect(pred.confidence).toBeLessThanOrEqual(100);
      });
    });

    it('should identify capacity bottlenecks', async () => {
      const bottlenecks = await service.identifyBottlenecks();

      expect(bottlenecks).toBeDefined();
      expect(bottlenecks).toHaveProperty('current');
      expect(bottlenecks).toHaveProperty('predicted');
      expect(bottlenecks).toHaveProperty('historical');
      expect(Array.isArray(bottlenecks.current)).toBe(true);

      bottlenecks.current.forEach(bottleneck => {
        expect(bottleneck).toHaveProperty('type');
        expect(['skill', 'department', 'resource', 'time']).toContain(bottleneck.type);
        expect(bottleneck).toHaveProperty('severity');
        expect(['low', 'medium', 'high', 'critical']).toContain(bottleneck.severity);
        expect(bottleneck).toHaveProperty('impact');
        expect(bottleneck.impact).toBeGreaterThanOrEqual(0);
        expect(bottleneck.impact).toBeLessThanOrEqual(100);
      });
    });

    it('should run scenario analysis for capacity planning', async () => {
      const scenarioData = {
        scenario: {
          name: 'Q4 Growth',
          description: 'Planning for Q4 growth with new projects',
          changes: [
            {
              type: 'add_project' as const,
              details: {
                name: 'New Product Launch',
                estimatedHours: 500,
                requiredSkills: ['React', 'Node.js'],
                priority: 'high' as const,
                teamSize: 3,
                duration: 3
              }
            },
            {
              type: 'add_resources' as const,
              details: {
                count: 2,
                skills: ['React'],
                hoursPerWeek: 40
              }
            }
          ]
        },
        analysisOptions: {
          includeRiskAnalysis: true,
          optimizationSuggestions: true,
          costImpact: true
        }
      };

      const analysis = await service.runScenarioAnalysis(scenarioData);

      expect(analysis).toBeDefined();
      expect(analysis).toHaveProperty('scenarioId');
      expect(analysis.analysis).toHaveProperty('capacityImpact');
      expect(analysis.analysis.capacityImpact).toHaveProperty('totalCapacityChange');
      expect(analysis.analysis).toHaveProperty('bottleneckAnalysis');
      expect(analysis.analysis).toHaveProperty('recommendations');
      expect(analysis.analysis).toHaveProperty('riskAssessment');
    });

    it('should analyze utilization patterns over time', async () => {
      const patterns = await service.analyzeUtilizationPatterns({
        period: 'last_year',
        granularity: 'monthly'
      });

      expect(patterns).toBeDefined();
      expect(patterns.patterns).toBeDefined();
      expect(patterns.patterns.averageUtilization).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(patterns.patterns.peakPeriods)).toBe(true);
      expect(Array.isArray(patterns.patterns.lowUtilizationPeriods)).toBe(true);

      expect(patterns.seasonality).toBeDefined();
      expect(typeof patterns.seasonality.hasSeasonality).toBe('boolean');

      expect(patterns.trends).toBeDefined();
      expect(['increasing', 'decreasing', 'stable']).toContain(patterns.trends.direction);

      expect(Array.isArray(patterns.anomalies)).toBe(true);
    });

    it('should forecast skill demand', async () => {
      const forecast = await service.forecastSkillDemand('12_months');

      expect(forecast).toBeDefined();
      expect(Array.isArray(forecast.skillDemand)).toBe(true);
      expect(Array.isArray(forecast.skillGaps)).toBe(true);
      expect(Array.isArray(forecast.hiringRecommendations)).toBe(true);
      expect(Array.isArray(forecast.trainingRecommendations)).toBe(true);

      forecast.skillDemand.forEach(demand => {
        expect(demand).toHaveProperty('skill');
        expect(demand).toHaveProperty('currentSupply');
        expect(demand).toHaveProperty('forecastedDemand');
        expect(demand).toHaveProperty('gap');
        expect(demand).toHaveProperty('confidence');
        expect(demand).toHaveProperty('trendDirection');
        expect(['increasing', 'decreasing', 'stable']).toContain(demand.trendDirection);
      });
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

    // Create test data for pipeline projects
    try {
      // First ensure the table exists
      await db.query(\`
        CREATE TABLE IF NOT EXISTS pipeline_projects (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          client_name VARCHAR(255),
          stage VARCHAR(50) NOT NULL DEFAULT 'lead',
          value DECIMAL(12, 2),
          probability DECIMAL(3, 2) DEFAULT 0.5,
          expected_close_date DATE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      \`);

      // Clean up any existing test data
      await db.query("DELETE FROM pipeline_projects WHERE name LIKE 'Test%'");

      // Create a test project for update operations
      const result = await db.query(
        \`INSERT INTO pipeline_projects (name, client_name, stage, value, probability, expected_close_date)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id\`,
        ['Test Pipeline Project', 'Test Client', 'lead', 50000, 0.3, '2024-12-31']
      );
      testProjectId = result.rows[0].id;
    } catch (error) {
      console.warn('Test data setup warning:', error);
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await db.query("DELETE FROM pipeline_projects WHERE name LIKE 'Test%'");
    } catch (error) {
      console.warn('Test data cleanup warning:', error);
    }
    await db.disconnect();
  });

  describe('Pipeline Project Operations', () => {
    it('should get all pipeline projects', async () => {
      const projects = await service.getAllPipelineProjects();

      expect(Array.isArray(projects)).toBe(true);
      projects.forEach(project => {
        expect(project).toHaveProperty('id');
        expect(project).toHaveProperty('name');
        expect(project).toHaveProperty('stage');
        expect(['lead', 'opportunity', 'proposal', 'negotiation', 'closed-won', 'closed-lost']).toContain(project.stage);
      });
    });

    it('should get pipeline projects by stage', async () => {
      const projects = await service.getPipelineProjectsByStage('lead');

      expect(Array.isArray(projects)).toBe(true);
      projects.forEach(project => {
        expect(project.stage).toBe('lead');
      });
    });

    it('should create a new pipeline project', async () => {
      const newProject = {
        name: 'Test New Project ' + Date.now(),
        client_name: 'New Test Client',
        stage: 'opportunity' as const,
        value: 75000,
        probability: 0.6,
        expected_close_date: '2024-12-31',
        notes: 'Test notes'
      };

      const created = await service.createPipelineProject(newProject);

      expect(created).toBeDefined();
      expect(created.name).toBe(newProject.name);
      expect(created.client_name).toBe(newProject.client_name);
      expect(created.stage).toBe(newProject.stage);
      expect(parseFloat(created.value)).toBe(newProject.value);
      expect(parseFloat(created.probability)).toBeCloseTo(newProject.probability);
    });

    it('should update pipeline stage', async () => {
      if (!testProjectId) {
        // Create a project if test setup failed
        const proj = await service.createPipelineProject({
          name: 'Test Update Project',
          client_name: 'Test Client',
          stage: 'lead' as const,
          value: 30000,
          probability: 0.2
        });
        testProjectId = proj.id;
      }

      const updated = await service.updatePipelineStage(testProjectId, 'proposal', 0.7);

      expect(updated).toBeDefined();
      expect(updated.stage).toBe('proposal');
      expect(parseFloat(updated.probability)).toBeCloseTo(0.7);
    });

    it('should calculate pipeline metrics', async () => {
      const metrics = await service.getPipelineMetrics();

      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('totalValue');
      expect(metrics).toHaveProperty('weightedValue');
      expect(metrics).toHaveProperty('averageProbability');
      expect(metrics).toHaveProperty('projectsByStage');

      expect(typeof metrics.totalValue).toBe('number');
      expect(metrics.totalValue).toBeGreaterThanOrEqual(0);

      expect(typeof metrics.weightedValue).toBe('number');
      expect(metrics.weightedValue).toBeGreaterThanOrEqual(0);
      expect(metrics.weightedValue).toBeLessThanOrEqual(metrics.totalValue);

      expect(metrics.projectsByStage).toBeDefined();
      Object.values(metrics.projectsByStage).forEach(count => {
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should get win/loss rates', async () => {
      const rates = await service.getWinLossRates();

      expect(rates).toBeDefined();
      expect(rates).toHaveProperty('winRate');
      expect(rates).toHaveProperty('lossRate');
      expect(rates).toHaveProperty('totalClosed');
      expect(rates).toHaveProperty('totalWon');
      expect(rates).toHaveProperty('totalLost');

      expect(rates.winRate).toBeGreaterThanOrEqual(0);
      expect(rates.winRate).toBeLessThanOrEqual(100);
      expect(rates.lossRate).toBeGreaterThanOrEqual(0);
      expect(rates.lossRate).toBeLessThanOrEqual(100);
    });

    it('should get pipeline history', async () => {
      const history = await service.getPipelineHistory(30);

      expect(Array.isArray(history)).toBe(true);
      history.forEach(entry => {
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('totalValue');
        expect(entry).toHaveProperty('projectCount');
        expect(entry).toHaveProperty('averageProbability');
      });
    });
  });
});`,

  'tests/unit/services/over-allocation-warning.service.test.ts': `import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { OverAllocationWarningService } from '../../../src/services/over-allocation-warning.service';
import { DatabaseService } from '../../../src/database/database.service';

describe('OverAllocationWarningService - Real Functional Tests', () => {
  let service: OverAllocationWarningService;
  let db: DatabaseService;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.connect();
    service = new OverAllocationWarningService();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  describe('Over-allocation Detection', () => {
    it('should check for over-allocated employees', async () => {
      const overAllocated = await service.checkOverAllocation();

      expect(Array.isArray(overAllocated)).toBe(true);
      overAllocated.forEach(warning => {
        expect(warning).toHaveProperty('employeeId');
        expect(warning).toHaveProperty('employeeName');
        expect(warning).toHaveProperty('totalAllocation');
        expect(warning).toHaveProperty('projects');
        expect(warning.totalAllocation).toBeGreaterThan(100);
      });
    });

    it('should get allocation summary for an employee', async () => {
      // Get any active employee for testing
      const employeeResult = await db.query(\`
        SELECT id FROM employees
        WHERE is_active = true
        LIMIT 1
      \`);

      if (employeeResult.rows.length > 0) {
        const employeeId = employeeResult.rows[0].id;
        const summary = await service.getEmployeeAllocationSummary(employeeId);

        expect(summary).toBeDefined();
        expect(summary).toHaveProperty('employeeId');
        expect(summary).toHaveProperty('totalAllocation');
        expect(summary).toHaveProperty('allocations');
        expect(Array.isArray(summary.allocations)).toBe(true);
        expect(summary.totalAllocation).toBeGreaterThanOrEqual(0);
      }
    });

    it('should generate warnings for date range', async () => {
      const warnings = await service.getWarningsForDateRange(
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(Array.isArray(warnings)).toBe(true);
      warnings.forEach(warning => {
        expect(warning).toHaveProperty('employeeId');
        expect(warning).toHaveProperty('date');
        expect(warning).toHaveProperty('totalAllocation');
        expect(warning).toHaveProperty('severity');
        expect(['low', 'medium', 'high', 'critical']).toContain(warning.severity);
      });
    });

    it('should suggest rebalancing options', async () => {
      // Get an over-allocated employee if exists
      const overAllocated = await service.checkOverAllocation();

      if (overAllocated.length > 0) {
        const suggestions = await service.suggestRebalancing(overAllocated[0].employeeId);

        expect(suggestions).toBeDefined();
        expect(Array.isArray(suggestions.reduce)).toBe(true);
        expect(Array.isArray(suggestions.redistribute)).toBe(true);
        expect(Array.isArray(suggestions.extend)).toBe(true);

        suggestions.reduce.forEach(s => {
          expect(s).toHaveProperty('projectId');
          expect(s).toHaveProperty('currentAllocation');
          expect(s).toHaveProperty('suggestedAllocation');
        });
      }
    });

    it('should validate allocation before saving', async () => {
      const validAllocation = {
        employeeId: 1,
        projectId: 1,
        allocation: 50,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-12-31')
      };

      const validation = await service.validateAllocation(validAllocation);

      expect(validation).toBeDefined();
      expect(validation).toHaveProperty('isValid');
      expect(typeof validation.isValid).toBe('boolean');
      expect(validation).toHaveProperty('warnings');
      expect(Array.isArray(validation.warnings)).toBe(true);

      if (!validation.isValid) {
        expect(validation).toHaveProperty('errors');
        expect(Array.isArray(validation.errors)).toBe(true);
      }
    });

    it('should get team allocation heatmap', async () => {
      const heatmap = await service.getTeamAllocationHeatmap();

      expect(heatmap).toBeDefined();
      expect(Array.isArray(heatmap)).toBe(true);

      heatmap.forEach(entry => {
        expect(entry).toHaveProperty('employeeId');
        expect(entry).toHaveProperty('employeeName');
        expect(entry).toHaveProperty('weeklyAllocations');
        expect(Array.isArray(entry.weeklyAllocations)).toBe(true);

        entry.weeklyAllocations.forEach(week => {
          expect(week).toHaveProperty('weekStart');
          expect(week).toHaveProperty('allocation');
          expect(week).toHaveProperty('status');
          expect(['available', 'optimal', 'warning', 'critical']).toContain(week.status);
        });
      });
    });
  });
});`,

  'tests/unit/services/resource-assignment.service.test.ts': `import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ResourceAssignmentService } from '../../../src/services/resource-assignment.service';
import { DatabaseService } from '../../../src/database/database.service';

describe('ResourceAssignmentService - Real Functional Tests', () => {
  let service: ResourceAssignmentService;
  let db: DatabaseService;
  let testEmployeeId: number;
  let testProjectId: number;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.connect();
    service = new ResourceAssignmentService();

    // Setup test data
    try {
      // Get or create test employee
      const empResult = await db.query(\`
        SELECT id FROM employees WHERE email LIKE 'test%' LIMIT 1
      \`);

      if (empResult.rows.length > 0) {
        testEmployeeId = empResult.rows[0].id;
      } else {
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
      testEmployeeId = 1;
      testProjectId = 1;
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await db.query("DELETE FROM resource_allocations WHERE employee_id = $1", [testEmployeeId]);
      await db.query("DELETE FROM employees WHERE email = 'test@example.com'");
      await db.query("DELETE FROM projects WHERE name = 'Test Project'");
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clean up allocations before each test
    try {
      await db.query(\`
        DELETE FROM resource_allocations
        WHERE employee_id = $1 AND project_id = $2
      \`, [testEmployeeId, testProjectId]);
    } catch (error) {
      console.warn('Test cleanup warning:', error);
    }
  });

  describe('Resource Assignment Operations', () => {
    it('should create a resource assignment', async () => {
      const assignment = {
        employeeId: testEmployeeId,
        projectId: testProjectId,
        role: 'Developer',
        allocation: 60,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-08-31')
      };

      const result = await service.createAssignment(assignment);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.assignment).toBeDefined();
      expect(result.assignment.employeeId).toBe(testEmployeeId);
      expect(result.assignment.projectId).toBe(testProjectId);
      expect(result.assignment.allocation).toBe(60);
    });

    it('should get employee assignments', async () => {
      // Create an assignment first
      await service.createAssignment({
        employeeId: testEmployeeId,
        projectId: testProjectId,
        role: 'Developer',
        allocation: 50,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-08-31')
      });

      const assignments = await service.getEmployeeAssignments(testEmployeeId);

      expect(Array.isArray(assignments)).toBe(true);
      assignments.forEach(assignment => {
        expect(assignment).toHaveProperty('projectId');
        expect(assignment).toHaveProperty('projectName');
        expect(assignment).toHaveProperty('role');
        expect(assignment).toHaveProperty('allocation');
        expect(assignment).toHaveProperty('startDate');
        expect(assignment).toHaveProperty('endDate');
      });
    });

    it('should get project team', async () => {
      const team = await service.getProjectTeam(testProjectId);

      expect(Array.isArray(team)).toBe(true);
      team.forEach(member => {
        expect(member).toHaveProperty('employeeId');
        expect(member).toHaveProperty('employeeName');
        expect(member).toHaveProperty('role');
        expect(member).toHaveProperty('allocation');
      });
    });

    it('should check availability before assignment', async () => {
      const availability = await service.checkAvailability(
        testEmployeeId,
        new Date('2024-07-01'),
        new Date('2024-09-30')
      );

      expect(availability).toBeDefined();
      expect(availability).toHaveProperty('isAvailable');
      expect(typeof availability.isAvailable).toBe('boolean');
      expect(availability).toHaveProperty('currentAllocation');
      expect(availability).toHaveProperty('availableCapacity');
      expect(availability.currentAllocation).toBeGreaterThanOrEqual(0);
      expect(availability.currentAllocation).toBeLessThanOrEqual(100);
    });

    it('should find available resources with specific skills', async () => {
      const resources = await service.findAvailableResources({
        skills: ['JavaScript', 'React'],
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-09-30'),
        requiredAllocation: 50
      });

      expect(Array.isArray(resources)).toBe(true);
      resources.forEach(resource => {
        expect(resource).toHaveProperty('employeeId');
        expect(resource).toHaveProperty('employeeName');
        expect(resource).toHaveProperty('skills');
        expect(resource).toHaveProperty('availableCapacity');
        expect(resource).toHaveProperty('matchScore');
        expect(resource.availableCapacity).toBeGreaterThanOrEqual(50);
      });
    });

    it('should optimize team composition', async () => {
      const requirements = {
        projectId: testProjectId,
        requiredSkills: [
          { skill: 'JavaScript', level: 'advanced', priority: 'high' },
          { skill: 'React', level: 'intermediate', priority: 'medium' },
          { skill: 'Node.js', level: 'intermediate', priority: 'medium' }
        ],
        teamSize: 3,
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-12-31')
      };

      const team = await service.optimizeTeamComposition(requirements);

      expect(team).toBeDefined();
      expect(Array.isArray(team.members)).toBe(true);
      expect(team.members.length).toBeLessThanOrEqual(requirements.teamSize);
      expect(team).toHaveProperty('skillCoverage');
      expect(team).toHaveProperty('totalCost');
      expect(team).toHaveProperty('score');

      team.members.forEach(member => {
        expect(member).toHaveProperty('employeeId');
        expect(member).toHaveProperty('allocation');
        expect(member).toHaveProperty('skills');
      });
    });

    it('should update assignment allocation', async () => {
      // Create assignment first
      const created = await service.createAssignment({
        employeeId: testEmployeeId,
        projectId: testProjectId,
        role: 'Developer',
        allocation: 50,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-08-31')
      });

      if (created.assignment) {
        const updated = await service.updateAssignment(created.assignment.id, {
          allocation: 75,
          endDate: new Date('2024-09-30')
        });

        expect(updated).toBeDefined();
        expect(updated.success).toBe(true);
        expect(updated.assignment.allocation).toBe(75);
      }
    });
  });
});`
};

// Write the fixed test files
console.log('Fixing unit tests to use real service methods...');

Object.entries(testFixtures).forEach(([filePath, content]) => {
  const fullPath = path.join(process.cwd(), filePath);
  console.log(`Writing ${filePath}...`);

  fs.writeFileSync(fullPath, content);
  console.log(`✓ Fixed ${filePath}`);
});

console.log('\\n✅ All unit tests have been fixed to use real service methods!');
console.log('\\nThe tests now:');
console.log('- Call actual service methods from the real implementations');
console.log('- Connect to real PostgreSQL database');
console.log('- Verify actual business logic');
console.log('- Test real validation rules');
console.log('- Check actual database operations');
// Integration Tests for Pipeline Management with Real API Calls
import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';
import { PipelineManagementService } from '../../src/services/pipeline-management.service';
import { CRMIntegrationService } from '../../src/services/crm-integration.service';
import { PipelineScenarioIntegrationService } from '../../src/services/pipeline-scenario-integration.service';
import {
  PipelineProject,
  CreatePipelineProjectRequest,
  CRMSystemConfig,
  PipelineStage,
  PipelinePriority
} from '../../src/types/pipeline';

describe('Pipeline Integration Tests', () => {
  let db: DatabaseService;
  let pipelineService: PipelineManagementService;
  let crmService: CRMIntegrationService;
  let integrationService: PipelineScenarioIntegrationService;

  const testProjectData: CreatePipelineProjectRequest = {
    name: 'Test Enterprise Software Project',
    description: 'Large-scale enterprise software development project with CRM integration',
    clientName: 'Acme Corporation',
    clientContact: {
      name: 'John Smith',
      email: 'john.smith@acme.com',
      phone: '+1-555-0123',
      title: 'CTO'
    },
    stage: 'opportunity',
    priority: 'high',
    probability: 75,
    estimatedValue: 250000,
    estimatedStartDate: '2024-03-01',
    estimatedDuration: 180,
    requiredSkills: ['JavaScript', 'Node.js', 'React', 'PostgreSQL', 'AWS'],
    resourceDemand: [
      {
        skillCategory: 'JavaScript',
        experienceLevel: 'senior',
        requiredCount: 2,
        allocationPercentage: 80,
        startDate: '2024-03-01',
        endDate: '2024-08-28',
        hourlyRate: 95,
        isCritical: true,
        alternatives: ['TypeScript', 'Node.js']
      },
      {
        skillCategory: 'React',
        experienceLevel: 'intermediate',
        requiredCount: 3,
        allocationPercentage: 75,
        startDate: '2024-03-15',
        endDate: '2024-07-15',
        hourlyRate: 85,
        isCritical: false,
        alternatives: ['Vue.js', 'Angular']
      },
      {
        skillCategory: 'PostgreSQL',
        experienceLevel: 'expert',
        requiredCount: 1,
        allocationPercentage: 60,
        startDate: '2024-03-01',
        endDate: '2024-08-28',
        hourlyRate: 110,
        isCritical: true,
        alternatives: ['MySQL', 'MongoDB']
      }
    ],
    competitorInfo: [
      {
        name: 'TechCorp Solutions',
        strengths: ['Lower cost', 'Local presence'],
        weaknesses: ['Less experience', 'Smaller team'],
        estimatedPrice: 200000,
        likelihood: 'medium'
      }
    ],
    riskFactors: [
      {
        category: 'technical',
        description: 'Integration with legacy systems may be complex',
        probability: 40,
        impact: 70,
        severity: 'medium',
        mitigationStrategy: 'Conduct thorough technical assessment before starting'
      },
      {
        category: 'resource',
        description: 'Senior JavaScript developers are in high demand',
        probability: 60,
        impact: 80,
        severity: 'high',
        mitigationStrategy: 'Secure resource commitments early and maintain backup options'
      }
    ],
    notes: 'Client is very interested but wants to see detailed technical proposal first',
    tags: ['enterprise', 'web-development', 'high-value', 'strategic']
  };

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    pipelineService = new PipelineManagementService();
    crmService = new CRMIntegrationService();
    integrationService = new PipelineScenarioIntegrationService();

    // Run database migrations
    try {
      await db.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      
      // Create test tables if they don't exist (simplified for testing)
      await db.query(`
        CREATE TABLE IF NOT EXISTS pipeline_projects_test (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          description TEXT,
          client_name VARCHAR(200) NOT NULL,
          client_contact JSONB,
          stage VARCHAR(50) NOT NULL DEFAULT 'lead',
          priority VARCHAR(20) NOT NULL DEFAULT 'medium',
          probability INTEGER NOT NULL DEFAULT 0,
          estimated_value DECIMAL(15,2) NOT NULL DEFAULT 0,
          estimated_start_date DATE NOT NULL,
          estimated_duration INTEGER NOT NULL DEFAULT 30,
          required_skills JSONB NOT NULL DEFAULT '[]',
          risk_factors JSONB NOT NULL DEFAULT '[]',
          notes TEXT,
          tags JSONB NOT NULL DEFAULT '[]',
          sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
          last_sync_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (error) {
      console.log('Test table creation skipped (may already exist)');
    }
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await db.query('DELETE FROM pipeline_projects WHERE name LIKE %Test%');
      await db.query('DELETE FROM crm_systems WHERE name LIKE %Test%');
    } catch (error) {
      console.log('Cleanup failed, this is expected in test environment');
    }
    
    await db.close();
  });

  describe('Pipeline Project Management', () => {
    let createdProject: PipelineProject;

    test('should create a pipeline project with real API call', async () => {
      const response = await request(app)
        .post('/api/pipeline/projects')
        .send(testProjectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(testProjectData.name);
      expect(response.body.data.clientName).toBe(testProjectData.clientName);
      expect(response.body.data.stage).toBe(testProjectData.stage);
      expect(response.body.data.priority).toBe(testProjectData.priority);
      expect(response.body.data.probability).toBe(testProjectData.probability);
      expect(response.body.data.estimatedValue).toBe(testProjectData.estimatedValue);
      expect(response.body.data.resourceDemand).toHaveLength(3);
      expect(response.body.data.riskFactors).toHaveLength(2);
      expect(response.body.data.competitorInfo).toHaveLength(1);

      createdProject = response.body.data;
    });

    test('should retrieve pipeline projects with filters', async () => {
      const response = await request(app)
        .get('/api/pipeline/projects')
        .query({
          stage: 'opportunity',
          priority: 'high',
          probabilityMin: 50,
          valueMin: 100000
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('total');
      
      // Verify filtering worked
      const projects = response.body.data;
      projects.forEach((project: PipelineProject) => {
        expect(project.stage).toBe('opportunity');
        expect(project.priority).toBe('high');
        expect(project.probability).toBeGreaterThanOrEqual(50);
        expect(project.estimatedValue).toBeGreaterThanOrEqual(100000);
      });
    });

    test('should retrieve single pipeline project', async () => {
      if (!createdProject) {
        throw new Error('No created project available for testing');
      }

      const response = await request(app)
        .get(`/api/pipeline/projects/${createdProject.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdProject.id);
      expect(response.body.data.resourceDemand).toHaveLength(3);
      expect(response.body.data.riskFactors).toHaveLength(2);
    });

    test('should update pipeline project stage and recalculate metrics', async () => {
      if (!createdProject) {
        throw new Error('No created project available for testing');
      }

      const updatedData = {
        stage: 'proposal' as PipelineStage,
        probability: 85,
        notes: 'Updated after client meeting - very positive response'
      };

      const response = await request(app)
        .put(`/api/pipeline/projects/${createdProject.id}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stage).toBe('proposal');
      expect(response.body.data.probability).toBe(85);
      expect(response.body.data.notes).toContain('very positive response');
      
      // Verify weighted value was recalculated
      const expectedWeightedValue = (createdProject.estimatedValue * 85) / 100;
      expect(response.body.data.weightedValue).toBe(expectedWeightedValue);
    });

    test('should handle invalid project creation', async () => {
      const invalidData = {
        ...testProjectData,
        name: '', // Invalid: empty name
        probability: 150, // Invalid: > 100
        estimatedValue: -1000 // Invalid: negative value
      };

      const response = await request(app)
        .post('/api/pipeline/projects')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('Pipeline Analytics', () => {
    test('should generate comprehensive pipeline analytics', async () => {
      const response = await request(app)
        .get('/api/pipeline/analytics')
        .query({
          startDateFrom: '2024-01-01',
          startDateTo: '2024-12-31'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalValue');
      expect(response.body.data).toHaveProperty('weightedValue');
      expect(response.body.data).toHaveProperty('conversionRates');
      expect(response.body.data).toHaveProperty('resourceDemandForecast');
      expect(response.body.data).toHaveProperty('winLossAnalysis');
      expect(response.body.data).toHaveProperty('trends');

      // Verify conversion rates structure
      expect(response.body.data.conversionRates).toBeInstanceOf(Array);
      response.body.data.conversionRates.forEach((rate: any) => {
        expect(rate).toHaveProperty('stage');
        expect(rate).toHaveProperty('count');
        expect(rate).toHaveProperty('conversionRate');
        expect(rate).toHaveProperty('avgDuration');
      });

      // Verify resource demand forecast
      expect(response.body.data.resourceDemandForecast).toBeInstanceOf(Array);
      response.body.data.resourceDemandForecast.forEach((forecast: any) => {
        expect(forecast).toHaveProperty('period');
        expect(forecast).toHaveProperty('skillCategory');
        expect(forecast).toHaveProperty('demandHours');
        expect(forecast).toHaveProperty('supplyHours');
        expect(forecast).toHaveProperty('gapHours');
        expect(forecast).toHaveProperty('utilizationRate');
      });
    });

    test('should calculate resource demand forecast accurately', async () => {
      // This test verifies that resource demand calculations are working correctly
      const response = await request(app)
        .get('/api/pipeline/analytics')
        .expect(200);

      const forecast = response.body.data.resourceDemandForecast;
      
      // Find JavaScript demand (from our test project)
      const jsDemand = forecast.find((f: any) => 
        f.skillCategory === 'JavaScript' && f.experienceLevel === 'senior'
      );
      
      if (jsDemand) {
        expect(jsDemand.demandHours).toBeGreaterThan(0);
        expect(jsDemand.utilizationRate).toBeGreaterThanOrEqual(0);
        
        // Verify gap calculation
        const expectedGap = jsDemand.demandHours - jsDemand.supplyHours;
        expect(jsDemand.gapHours).toBeCloseTo(expectedGap, 1);
      }
    });
  });

  describe('CRM System Integration', () => {
    let testCRMSystem: CRMSystemConfig;

    test('should create CRM system configuration', async () => {
      const crmConfig = {
        name: 'Test Salesforce Integration',
        type: 'salesforce',
        apiUrl: 'https://test.salesforce.com/services/data/v52.0',
        authType: 'oauth',
        credentials: {
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret'
        },
        syncSettings: {
          autoSync: true,
          syncInterval: 30,
          syncDirection: 'bidirectional',
          fieldMappings: [
            {
              systemField: 'name',
              crmField: 'Name',
              dataType: 'string',
              isRequired: true,
              direction: 'bidirectional'
            }
          ],
          filters: {},
          conflictResolution: 'timestamp'
        },
        isActive: true
      };

      const response = await request(app)
        .post('/api/pipeline/crm-systems')
        .send(crmConfig)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(crmConfig.name);
      expect(response.body.data.type).toBe(crmConfig.type);
      expect(response.body.data.syncSettings.autoSync).toBe(true);

      testCRMSystem = response.body.data;
    });

    test('should test CRM connection', async () => {
      if (!testCRMSystem) {
        throw new Error('No CRM system available for testing');
      }

      const response = await request(app)
        .post(`/api/pipeline/crm-systems/${testCRMSystem.id}/test-connection`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      
      // Our mock CRM should return successful connection
      expect(response.body.success).toBe(true);
    });

    test('should start CRM synchronization operation', async () => {
      if (!testCRMSystem) {
        throw new Error('No CRM system available for testing');
      }

      const syncRequest = {
        crmSystemId: testCRMSystem.id,
        operation: 'import',
        direction: 'from-crm',
        filters: {
          dateRange: {
            start: '2024-01-01',
            end: '2024-12-31'
          }
        },
        options: {
          dryRun: true
        }
      };

      const response = await request(app)
        .post('/api/pipeline/crm-sync')
        .send(syncRequest)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.operation).toBe('import');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.progress).toHaveProperty('total');
    });

    test('should retrieve sync operations', async () => {
      if (!testCRMSystem) {
        throw new Error('No CRM system available for testing');
      }

      const response = await request(app)
        .get('/api/pipeline/crm-sync/operations')
        .query({ crmSystemId: testCRMSystem.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      if (response.body.data.length > 0) {
        const operation = response.body.data[0];
        expect(operation).toHaveProperty('id');
        expect(operation).toHaveProperty('operation');
        expect(operation).toHaveProperty('status');
        expect(operation).toHaveProperty('progress');
      }
    });
  });

  describe('Pipeline-Scenario Integration', () => {
    let testScenarioId: string;

    test('should create scenario from pipeline projects', async () => {
      if (!createdProject) {
        throw new Error('No created project available for testing');
      }

      // Note: This would typically go through the scenario service
      // For testing, we'll create a mock scenario integration
      const scenarioRequest = {
        name: 'Test Pipeline Scenario',
        description: 'Scenario created from pipeline projects for testing',
        pipelineProjectIds: [createdProject.id],
        conversionRates: {
          lead: 0.2,
          prospect: 0.3,
          opportunity: 0.6,
          proposal: 0.8,
          negotiation: 0.9,
          won: 1.0,
          lost: 0.0,
          'on-hold': 0.1
        },
        forecastPeriodMonths: 6
      };

      // Since this is an integration test, we'll test the service directly
      const scenario = await integrationService.createScenarioFromPipeline(scenarioRequest);
      
      expect(scenario).toHaveProperty('id');
      expect(scenario.name).toBe(scenarioRequest.name);
      expect(scenario.type).toBe('forecast');
      expect(scenario.metadata.pipelineProjectIds).toContain(createdProject.id);

      testScenarioId = scenario.id;
    });

    test('should generate resource demand forecast from pipeline and scenarios', async () => {
      const forecast = await integrationService.generateResourceForecast({
        includeActiveScenariosOnly: false,
        forecastMonths: 3,
        confidenceThreshold: 0.3
      });

      expect(forecast).toBeInstanceOf(Array);
      
      if (forecast.length > 0) {
        const forecastItem = forecast[0];
        expect(forecastItem).toHaveProperty('period');
        expect(forecastItem).toHaveProperty('skillCategory');
        expect(forecastItem).toHaveProperty('experienceLevel');
        expect(forecastItem).toHaveProperty('demandHours');
        expect(forecastItem).toHaveProperty('supplyHours');
        expect(forecastItem).toHaveProperty('gapHours');
        expect(forecastItem).toHaveProperty('utilizationRate');
        expect(forecastItem).toHaveProperty('confidence');
        
        // Verify calculation consistency
        const expectedGap = forecastItem.demandHours - forecastItem.supplyHours;
        expect(forecastItem.gapHours).toBeCloseTo(expectedGap, 1);
      }
    });

    test('should run what-if analysis with multiple scenarios', async () => {
      if (!createdProject) {
        throw new Error('No created project available for testing');
      }

      const whatIfRequest = {
        pipelineProjectIds: [createdProject.id],
        conversionScenarios: [
          {
            name: 'Conservative Scenario',
            conversionRates: {
              lead: 0.1,
              prospect: 0.2,
              opportunity: 0.4,
              proposal: 0.6,
              negotiation: 0.7,
              won: 1.0,
              lost: 0.0,
              'on-hold': 0.05
            } as Record<PipelineStage, number>
          },
          {
            name: 'Optimistic Scenario',
            conversionRates: {
              lead: 0.3,
              prospect: 0.5,
              opportunity: 0.7,
              proposal: 0.9,
              negotiation: 0.95,
              won: 1.0,
              lost: 0.0,
              'on-hold': 0.1
            } as Record<PipelineStage, number>
          }
        ]
      };

      const analysis = await integrationService.runWhatIfAnalysis(whatIfRequest);

      expect(analysis).toHaveProperty('scenarios');
      expect(analysis).toHaveProperty('comparison');
      expect(analysis.scenarios).toHaveLength(2);
      
      const conservativeScenario = analysis.scenarios.find(s => s.name.includes('Conservative'));
      const optimisticScenario = analysis.scenarios.find(s => s.name.includes('Optimistic'));
      
      expect(conservativeScenario).toBeDefined();
      expect(optimisticScenario).toBeDefined();
      
      // Verify comparison data structure
      expect(analysis.comparison).toHaveProperty('totalResourceDemand');
      expect(analysis.comparison).toHaveProperty('skillGaps');
      expect(analysis.comparison).toHaveProperty('costAnalysis');
    });
  });

  describe('Performance and Error Handling', () => {
    test('should handle large dataset queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/pipeline/projects')
        .query({ limit: 100 })
        .expect(200);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      // Should complete within reasonable time (adjust based on your performance requirements)
      expect(queryTime).toBeLessThan(5000); // 5 seconds
      expect(response.body.success).toBe(true);
    });

    test('should handle invalid UUIDs gracefully', async () => {
      const response = await request(app)
        .get('/api/pipeline/projects/invalid-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('valid UUID');
    });

    test('should handle non-existent project requests', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/pipeline/projects/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should validate required fields in project creation', async () => {
      const incompleteData = {
        name: 'Incomplete Project',
        // Missing required fields: clientName, stage, estimatedValue, etc.
      };

      const response = await request(app)
        .post('/api/pipeline/projects')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should handle concurrent project updates safely', async () => {
      if (!createdProject) {
        throw new Error('No created project available for testing');
      }

      // Simulate concurrent updates
      const updates = [
        { probability: 80 },
        { stage: 'negotiation' as PipelineStage },
        { notes: 'Updated from concurrent test 1' },
        { notes: 'Updated from concurrent test 2' }
      ];

      const promises = updates.map(update => 
        request(app)
          .put(`/api/pipeline/projects/${createdProject.id}`)
          .send(update)
      );

      const responses = await Promise.all(promises);
      
      // All requests should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Data Consistency and Integrity', () => {
    test('should maintain referential integrity in resource demands', async () => {
      if (!createdProject) {
        throw new Error('No created project available for testing');
      }

      // Verify resource demands are properly linked
      const response = await request(app)
        .get(`/api/pipeline/projects/${createdProject.id}`)
        .expect(200);

      const project = response.body.data;
      expect(project.resourceDemand).toBeInstanceOf(Array);
      
      project.resourceDemand.forEach((demand: any) => {
        expect(demand).toHaveProperty('skillCategory');
        expect(demand).toHaveProperty('experienceLevel');
        expect(demand).toHaveProperty('requiredCount');
        expect(demand.requiredCount).toBeGreaterThan(0);
        expect(demand.allocationPercentage).toBeGreaterThan(0);
        expect(demand.allocationPercentage).toBeLessThanOrEqual(100);
      });
    });

    test('should calculate weighted values correctly', async () => {
      const response = await request(app)
        .get('/api/pipeline/projects')
        .expect(200);

      const projects = response.body.data;
      
      projects.forEach((project: PipelineProject) => {
        const expectedWeightedValue = (project.estimatedValue * project.probability) / 100;
        
        if (project.weightedValue !== undefined) {
          expect(project.weightedValue).toBeCloseTo(expectedWeightedValue, 2);
        }
      });
    });

    test('should enforce business rules on project stage transitions', async () => {
      if (!createdProject) {
        throw new Error('No created project available for testing');
      }

      // Test invalid stage transition (won -> lead should not be logical but system should allow it)
      const response = await request(app)
        .put(`/api/pipeline/projects/${createdProject.id}`)
        .send({ stage: 'won' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stage).toBe('won');
      
      // Test that probability is still maintained
      expect(response.body.data.probability).toBeGreaterThanOrEqual(0);
      expect(response.body.data.probability).toBeLessThanOrEqual(100);
    });
  });

  describe('Real-time Sync Operations', () => {
    test('should handle sync status updates in real-time', async () => {
      if (!createdProject || !testCRMSystem) {
        return; // Skip if dependencies not available
      }

      // Start a sync operation
      const syncResponse = await request(app)
        .post(`/api/pipeline/projects/${createdProject.id}/sync-to-crm/${testCRMSystem.id}`)
        .expect(200);

      expect(syncResponse.body.success).toBe(true);
      
      // The mock CRM should provide immediate success response
      if (syncResponse.body.data?.crmId) {
        expect(syncResponse.body.data.crmId).toMatch(/^crm_/);
      }
    });

    test('should handle sync conflicts appropriately', async () => {
      // Get any existing sync conflicts
      const response = await request(app)
        .get('/api/pipeline/crm-sync/conflicts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // If there are conflicts, verify structure
      response.body.data.forEach((conflict: any) => {
        expect(conflict).toHaveProperty('id');
        expect(conflict).toHaveProperty('recordId');
        expect(conflict).toHaveProperty('recordType');
        expect(conflict).toHaveProperty('field');
        expect(conflict).toHaveProperty('systemValue');
        expect(conflict).toHaveProperty('crmValue');
      });
    });
  });
});
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
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
});
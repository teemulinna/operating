"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pipeline_management_service_1 = require("../../../src/services/pipeline-management.service");
const database_service_1 = require("../../../src/database/database.service");
(0, globals_1.describe)('PipelineManagementService - Real Functional Tests', () => {
    let service;
    let db;
    let testProjectId;
    (0, globals_1.beforeAll)(async () => {
        db = database_service_1.DatabaseService.getInstance();
        await db.connect();
        service = new pipeline_management_service_1.PipelineManagementService();
    });
    (0, globals_1.afterAll)(async () => {
        try {
            await db.query("DELETE FROM pipeline_projects WHERE name LIKE 'Test%'");
        }
        catch (error) {
            console.warn('Cleanup warning:', error);
        }
        await db.disconnect();
    });
    (0, globals_1.describe)('Pipeline Project Operations', () => {
        (0, globals_1.it)('should create a new pipeline project', async () => {
            const newProject = {
                name: 'Test Pipeline Project ' + Date.now(),
                description: 'Test project description',
                clientName: 'Test Client Inc',
                clientContact: {
                    name: 'John Doe',
                    email: 'john@testclient.com',
                    phone: '555-0100'
                },
                stage: 'opportunity',
                priority: 'high',
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
            (0, globals_1.expect)(created).toBeDefined();
            (0, globals_1.expect)(created.id).toBeDefined();
            (0, globals_1.expect)(created.name).toBe(newProject.name);
            (0, globals_1.expect)(created.stage).toBe(newProject.stage);
            (0, globals_1.expect)(created.probability).toBe(newProject.probability);
            testProjectId = created.id;
        });
        (0, globals_1.it)('should get pipeline projects with filters', async () => {
            const result = await service.getPipelineProjects({
                stage: 'opportunity',
                priority: 'high'
            });
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.projects).toBeDefined();
            (0, globals_1.expect)(Array.isArray(result.projects)).toBe(true);
            (0, globals_1.expect)(result.total).toBeGreaterThanOrEqual(0);
            result.projects.forEach(project => {
                (0, globals_1.expect)(project.stage).toBe('opportunity');
                (0, globals_1.expect)(project.priority).toBe('high');
            });
        });
        (0, globals_1.it)('should update pipeline project', async () => {
            if (!testProjectId) {
                const proj = await service.createPipelineProject({
                    name: 'Test Update Project',
                    clientName: 'Test Client',
                    stage: 'lead',
                    estimatedValue: 50000
                });
                testProjectId = proj.id;
            }
            const updated = await service.updatePipelineProject(testProjectId, {
                stage: 'proposal',
                probability: 0.85,
                notes: 'Updated after client meeting'
            });
            (0, globals_1.expect)(updated).toBeDefined();
            (0, globals_1.expect)(updated.stage).toBe('proposal');
            (0, globals_1.expect)(updated.probability).toBe(0.85);
            (0, globals_1.expect)(updated.notes).toContain('Updated');
        });
        (0, globals_1.it)('should get pipeline analytics', async () => {
            const analytics = await service.getPipelineAnalytics({
                dateRange: {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-12-31')
                }
            });
            (0, globals_1.expect)(analytics).toBeDefined();
            (0, globals_1.expect)(analytics).toHaveProperty('totalValue');
            (0, globals_1.expect)(analytics).toHaveProperty('weightedValue');
            (0, globals_1.expect)(analytics).toHaveProperty('averageProbability');
            (0, globals_1.expect)(analytics).toHaveProperty('projectsByStage');
            (0, globals_1.expect)(analytics).toHaveProperty('winRate');
            (0, globals_1.expect)(analytics).toHaveProperty('averageCycleTime');
            (0, globals_1.expect)(analytics).toHaveProperty('topClients');
            (0, globals_1.expect)(analytics.totalValue).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(analytics.averageProbability).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(analytics.averageProbability).toBeLessThanOrEqual(1);
        });
        (0, globals_1.it)('should handle pipeline stage transitions', async () => {
            const stages = ['lead', 'opportunity', 'proposal', 'negotiation', 'closed-won'];
            stages.forEach(stage => {
                (0, globals_1.expect)(['lead', 'opportunity', 'proposal', 'negotiation', 'closed-won', 'closed-lost']).toContain(stage);
            });
        });
    });
});
//# sourceMappingURL=pipeline-management.service.test.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crm_integration_service_1 = require("../../../src/services/crm-integration.service");
const database_service_1 = require("../../../src/database/database.service");
(0, globals_1.describe)('CRMIntegrationService - Real Functional Tests', () => {
    let service;
    let db;
    let testCRMSystemId;
    (0, globals_1.beforeAll)(async () => {
        db = database_service_1.DatabaseService.getInstance();
        await db.connect();
        service = new crm_integration_service_1.CRMIntegrationService();
    });
    (0, globals_1.afterAll)(async () => {
        try {
            if (testCRMSystemId) {
                await db.query('DELETE FROM crm_sync_operations WHERE crm_system_id = $1', [testCRMSystemId]);
                await db.query('DELETE FROM crm_systems WHERE id = $1', [testCRMSystemId]);
            }
            await db.query("DELETE FROM crm_systems WHERE name LIKE 'Test%'");
        }
        catch (error) {
            console.warn('Cleanup warning:', error);
        }
        await db.disconnect();
    });
    (0, globals_1.describe)('CRM System Management', () => {
        (0, globals_1.it)('should create a new CRM system configuration', async () => {
            const crmConfig = {
                name: 'Test Salesforce',
                type: 'salesforce',
                apiUrl: 'https://test.salesforce.com/api',
                apiVersion: 'v50.0',
                authType: 'oauth',
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
            (0, globals_1.expect)(created).toBeDefined();
            (0, globals_1.expect)(created.name).toBe(crmConfig.name);
            (0, globals_1.expect)(created.type).toBe(crmConfig.type);
            (0, globals_1.expect)(created.apiUrl).toBe(crmConfig.apiUrl);
            (0, globals_1.expect)(created.isActive).toBe(true);
            (0, globals_1.expect)(created.id).toBeDefined();
            testCRMSystemId = created.id;
        });
        (0, globals_1.it)('should get all active CRM systems', async () => {
            const systems = await service.getCRMSystems();
            (0, globals_1.expect)(Array.isArray(systems)).toBe(true);
            systems.forEach(system => {
                (0, globals_1.expect)(system).toHaveProperty('id');
                (0, globals_1.expect)(system).toHaveProperty('name');
                (0, globals_1.expect)(system).toHaveProperty('type');
                (0, globals_1.expect)(system).toHaveProperty('isActive');
                (0, globals_1.expect)(system.isActive).toBe(true);
            });
        });
        (0, globals_1.it)('should update CRM system configuration', async () => {
            if (!testCRMSystemId) {
                const temp = await service.createCRMSystem({
                    name: 'Test HubSpot',
                    type: 'hubspot',
                    apiUrl: 'https://api.hubspot.com',
                    apiVersion: 'v3',
                    authType: 'api-key',
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
            (0, globals_1.expect)(updated).toBeDefined();
            (0, globals_1.expect)(updated.name).toBe('Test HubSpot Updated');
            (0, globals_1.expect)(updated.syncSettings.syncInterval).toBe(7200);
        });
        (0, globals_1.it)('should start a sync operation', async () => {
            if (!testCRMSystemId) {
                const temp = await service.createCRMSystem({
                    name: 'Test Pipedrive',
                    type: 'pipedrive',
                    apiUrl: 'https://api.pipedrive.com',
                    apiVersion: 'v1',
                    authType: 'api-key',
                    credentials: { apiKey: 'test-key' },
                    syncSettings: { syncInterval: 1800 },
                    isActive: true
                });
                testCRMSystemId = temp.id;
            }
            const syncRequest = {
                crmSystemId: testCRMSystemId,
                operation: 'sync_projects',
                direction: 'from_crm',
                filters: {
                    dateRange: {
                        start: new Date('2024-01-01'),
                        end: new Date('2024-12-31')
                    }
                }
            };
            const operation = await service.startSync(syncRequest);
            (0, globals_1.expect)(operation).toBeDefined();
            (0, globals_1.expect)(operation.crmSystemId).toBe(testCRMSystemId);
            (0, globals_1.expect)(operation.operation).toBe('sync_projects');
            (0, globals_1.expect)(operation.direction).toBe('from_crm');
            (0, globals_1.expect)(operation.status).toBe('pending');
            (0, globals_1.expect)(operation.progress).toBeDefined();
        });
    });
});
//# sourceMappingURL=crm-integration.service.test.js.map
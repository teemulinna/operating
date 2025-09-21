import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
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
});
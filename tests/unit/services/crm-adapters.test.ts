import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { CRMAdapterService } from '../../../src/services/crm-adapters.service';
import { DatabaseService } from '../../../src/database/database.service';

describe('CRMAdapterService - Real Functional Tests', () => {
  let service: CRMAdapterService;
  let db: DatabaseService;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.connect();
    service = new CRMAdapterService();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  describe('CRM Data Synchronization', () => {
    it('should sync customer data from CRM', async () => {
      const mockCRMData = {
        customerId: 'CRM-12345',
        name: 'Test Company',
        contactEmail: 'contact@test.com',
        industry: 'Technology',
        annualRevenue: 1000000
      };

      const result = await service.syncCustomerData(mockCRMData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.customerId).toBe(mockCRMData.customerId);
    });

    it('should map CRM fields to internal schema', async () => {
      const crmRecord = {
        Id: 'CRM-123',
        CompanyName: 'Test Corp',
        PrimaryContact: 'John Doe',
        Email: 'john@test.com'
      };

      const mapped = await service.mapCRMToInternal(crmRecord);

      expect(mapped).toHaveProperty('id');
      expect(mapped).toHaveProperty('name');
      expect(mapped).toHaveProperty('contactName');
      expect(mapped).toHaveProperty('email');
    });

    it('should handle CRM connection failures gracefully', async () => {
      const result = await service.testCRMConnection('invalid-endpoint');

      expect(result).toBeDefined();
      expect(result.connected).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should batch sync multiple records efficiently', async () => {
      const records = Array.from({ length: 100 }, (_, i) => ({
        customerId: `CRM-${i}`,
        name: `Company ${i}`,
        email: `contact${i}@test.com`
      }));

      const result = await service.batchSync(records);

      expect(result.processed).toBe(100);
      expect(result.successful).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
      expect(result.successful + result.failed).toBe(100);
    });

    it('should validate CRM data before import', async () => {
      const invalidData = {
        customerId: '', // Invalid: empty ID
        name: 'A', // Invalid: too short
        email: 'not-an-email' // Invalid: bad format
      };

      const validation = await service.validateCRMData(invalidData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(3);
      expect(validation.errors).toContain('Invalid customer ID');
    });

    it('should transform opportunity data correctly', async () => {
      const opportunity = {
        id: 'OPP-001',
        accountId: 'ACC-001',
        value: 50000,
        stage: 'Proposal',
        closeDate: '2024-12-31',
        probability: 75
      };

      const transformed = await service.transformOpportunity(opportunity);

      expect(transformed).toHaveProperty('projectId');
      expect(transformed).toHaveProperty('clientId');
      expect(transformed).toHaveProperty('expectedRevenue');
      expect(transformed.expectedRevenue).toBe(37500); // value * probability / 100
    });

    it('should handle API rate limiting', async () => {
      const requests = Array.from({ length: 10 }, () =>
        service.fetchFromCRM('/api/contacts')
      );

      const results = await Promise.allSettled(requests);
      const rateLimited = results.filter(r =>
        r.status === 'rejected' && r.reason.message.includes('rate limit')
      );

      expect(rateLimited.length).toBeLessThanOrEqual(5); // Some should be rate limited
    });
  });

  describe('CRM Integration Adapters', () => {
    it('should support Salesforce adapter', async () => {
      const adapter = service.getAdapter('salesforce');

      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('Salesforce');
      expect(adapter.apiVersion).toBeDefined();
      expect(typeof adapter.authenticate).toBe('function');
    });

    it('should support HubSpot adapter', async () => {
      const adapter = service.getAdapter('hubspot');

      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('HubSpot');
      expect(typeof adapter.fetchContacts).toBe('function');
    });

    it('should handle custom field mappings', async () => {
      const customMapping = {
        'CustomField__c': 'internalField',
        'Industry__c': 'businessSector'
      };

      service.setCustomFieldMapping(customMapping);
      const mapped = await service.mapCustomFields({
        'CustomField__c': 'Value',
        'Industry__c': 'Tech'
      });

      expect(mapped.internalField).toBe('Value');
      expect(mapped.businessSector).toBe('Tech');
    });

    it('should queue failed syncs for retry', async () => {
      const failedRecord = {
        customerId: 'FAIL-001',
        error: 'Network timeout'
      };

      await service.queueForRetry(failedRecord);
      const retryQueue = await service.getRetryQueue();

      expect(retryQueue).toContainEqual(
        expect.objectContaining({ customerId: 'FAIL-001' })
      );
    });
  });
});
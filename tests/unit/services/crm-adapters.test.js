"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crm_adapters_service_1 = require("../../../src/services/crm-adapters.service");
const database_service_1 = require("../../../src/database/database.service");
(0, globals_1.describe)('CRMAdapterService - Real Functional Tests', () => {
    let service;
    let db;
    (0, globals_1.beforeAll)(async () => {
        db = database_service_1.DatabaseService.getInstance();
        await db.connect();
        service = new crm_adapters_service_1.CRMAdapterService();
    });
    (0, globals_1.afterAll)(async () => {
        await db.disconnect();
    });
    (0, globals_1.describe)('CRM Data Synchronization', () => {
        (0, globals_1.it)('should sync customer data from CRM', async () => {
            const mockCRMData = {
                customerId: 'CRM-12345',
                name: 'Test Company',
                contactEmail: 'contact@test.com',
                industry: 'Technology',
                annualRevenue: 1000000
            };
            const result = await service.syncCustomerData(mockCRMData);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.customerId).toBe(mockCRMData.customerId);
        });
        (0, globals_1.it)('should map CRM fields to internal schema', async () => {
            const crmRecord = {
                Id: 'CRM-123',
                CompanyName: 'Test Corp',
                PrimaryContact: 'John Doe',
                Email: 'john@test.com'
            };
            const mapped = await service.mapCRMToInternal(crmRecord);
            (0, globals_1.expect)(mapped).toHaveProperty('id');
            (0, globals_1.expect)(mapped).toHaveProperty('name');
            (0, globals_1.expect)(mapped).toHaveProperty('contactName');
            (0, globals_1.expect)(mapped).toHaveProperty('email');
        });
        (0, globals_1.it)('should handle CRM connection failures gracefully', async () => {
            const result = await service.testCRMConnection('invalid-endpoint');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.connected).toBe(false);
            (0, globals_1.expect)(result.error).toBeDefined();
        });
        (0, globals_1.it)('should batch sync multiple records efficiently', async () => {
            const records = Array.from({ length: 100 }, (_, i) => ({
                customerId: `CRM-${i}`,
                name: `Company ${i}`,
                email: `contact${i}@test.com`
            }));
            const result = await service.batchSync(records);
            (0, globals_1.expect)(result.processed).toBe(100);
            (0, globals_1.expect)(result.successful).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.failed).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.successful + result.failed).toBe(100);
        });
        (0, globals_1.it)('should validate CRM data before import', async () => {
            const invalidData = {
                customerId: '',
                name: 'A',
                email: 'not-an-email'
            };
            const validation = await service.validateCRMData(invalidData);
            (0, globals_1.expect)(validation.isValid).toBe(false);
            (0, globals_1.expect)(validation.errors).toHaveLength(3);
            (0, globals_1.expect)(validation.errors).toContain('Invalid customer ID');
        });
        (0, globals_1.it)('should transform opportunity data correctly', async () => {
            const opportunity = {
                id: 'OPP-001',
                accountId: 'ACC-001',
                value: 50000,
                stage: 'Proposal',
                closeDate: '2024-12-31',
                probability: 75
            };
            const transformed = await service.transformOpportunity(opportunity);
            (0, globals_1.expect)(transformed).toHaveProperty('projectId');
            (0, globals_1.expect)(transformed).toHaveProperty('clientId');
            (0, globals_1.expect)(transformed).toHaveProperty('expectedRevenue');
            (0, globals_1.expect)(transformed.expectedRevenue).toBe(37500);
        });
        (0, globals_1.it)('should handle API rate limiting', async () => {
            const requests = Array.from({ length: 10 }, () => service.fetchFromCRM('/api/contacts'));
            const results = await Promise.allSettled(requests);
            const rateLimited = results.filter(r => r.status === 'rejected' && r.reason.message.includes('rate limit'));
            (0, globals_1.expect)(rateLimited.length).toBeLessThanOrEqual(5);
        });
    });
    (0, globals_1.describe)('CRM Integration Adapters', () => {
        (0, globals_1.it)('should support Salesforce adapter', async () => {
            const adapter = service.getAdapter('salesforce');
            (0, globals_1.expect)(adapter).toBeDefined();
            (0, globals_1.expect)(adapter.name).toBe('Salesforce');
            (0, globals_1.expect)(adapter.apiVersion).toBeDefined();
            (0, globals_1.expect)(typeof adapter.authenticate).toBe('function');
        });
        (0, globals_1.it)('should support HubSpot adapter', async () => {
            const adapter = service.getAdapter('hubspot');
            (0, globals_1.expect)(adapter).toBeDefined();
            (0, globals_1.expect)(adapter.name).toBe('HubSpot');
            (0, globals_1.expect)(typeof adapter.fetchContacts).toBe('function');
        });
        (0, globals_1.it)('should handle custom field mappings', async () => {
            const customMapping = {
                'CustomField__c': 'internalField',
                'Industry__c': 'businessSector'
            };
            service.setCustomFieldMapping(customMapping);
            const mapped = await service.mapCustomFields({
                'CustomField__c': 'Value',
                'Industry__c': 'Tech'
            });
            (0, globals_1.expect)(mapped.internalField).toBe('Value');
            (0, globals_1.expect)(mapped.businessSector).toBe('Tech');
        });
        (0, globals_1.it)('should queue failed syncs for retry', async () => {
            const failedRecord = {
                customerId: 'FAIL-001',
                error: 'Network timeout'
            };
            await service.queueForRetry(failedRecord);
            const retryQueue = await service.getRetryQueue();
            (0, globals_1.expect)(retryQueue).toContainEqual(globals_1.expect.objectContaining({ customerId: 'FAIL-001' }));
        });
    });
});
//# sourceMappingURL=crm-adapters.test.js.map
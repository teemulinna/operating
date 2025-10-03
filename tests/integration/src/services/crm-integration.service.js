"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRMIntegrationService = void 0;
const database_service_1 = require("../database/database.service");
const adapter_factory_1 = require("./crm-adapters/adapter-factory");
class CRMIntegrationService {
    constructor() {
        this.db = database_service_1.DatabaseService.getInstance();
    }
    async createCRMSystem(data) {
        const query = `
      INSERT INTO crm_systems 
      (name, type, api_url, api_version, auth_type, credentials, sync_settings, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *, created_at, updated_at
    `;
        const values = [
            data.name,
            data.type,
            data.apiUrl,
            data.apiVersion,
            data.authType,
            JSON.stringify(data.credentials),
            JSON.stringify(data.syncSettings),
            data.isActive
        ];
        const result = await this.db.query(query, values);
        return this.mapRowToCRMSystem(result.rows[0]);
    }
    async getCRMSystems(includeInactive = false) {
        let query = 'SELECT * FROM crm_systems';
        if (!includeInactive) {
            query += ' WHERE is_active = true';
        }
        query += ' ORDER BY created_at DESC';
        const result = await this.db.query(query);
        return result.rows.map(row => this.mapRowToCRMSystem(row));
    }
    async updateCRMSystem(id, data) {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                const columnName = this.camelToSnake(key);
                setClauses.push(`${columnName} = $${paramIndex}`);
                if (typeof value === 'object') {
                    values.push(JSON.stringify(value));
                }
                else {
                    values.push(value);
                }
                paramIndex++;
            }
        });
        setClauses.push(`updated_at = NOW()`);
        const query = `
      UPDATE crm_systems 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *, created_at, updated_at
    `;
        values.push(id);
        const result = await this.db.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('CRM system not found');
        }
        return this.mapRowToCRMSystem(result.rows[0]);
    }
    async startSync(request) {
        const operation = {
            crmSystemId: request.crmSystemId,
            operation: request.operation,
            direction: request.direction || 'bidirectional',
            status: 'pending',
            progress: {
                total: 0,
                processed: 0,
                successful: 0,
                failed: 0,
                skipped: 0
            },
            results: {
                created: 0,
                updated: 0,
                deleted: 0,
                conflicts: 0,
                errors: []
            },
            metadata: request.filters
        };
        const query = `
      INSERT INTO crm_sync_operations 
      (crm_system_id, operation, direction, status, progress, results, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const values = [
            operation.crmSystemId,
            operation.operation,
            operation.direction,
            operation.status,
            JSON.stringify(operation.progress),
            JSON.stringify(operation.results),
            JSON.stringify(operation.metadata)
        ];
        const result = await this.db.query(query, values);
        return this.mapRowToSyncOperation(result.rows[0]);
    }
    async getSyncOperations(crmSystemId, limit = 50) {
        let query = 'SELECT * FROM crm_sync_operations';
        const values = [];
        if (crmSystemId) {
            query += ' WHERE crm_system_id = $1';
            values.push(crmSystemId);
        }
        query += ' ORDER BY created_at DESC LIMIT $' + (values.length + 1);
        values.push(limit);
        const result = await this.db.query(query, values);
        return result.rows.map(row => this.mapRowToSyncOperation(row));
    }
    async getSyncOperation(id) {
        const query = 'SELECT * FROM crm_sync_operations WHERE id = $1';
        const result = await this.db.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToSyncOperation(result.rows[0]);
    }
    async testConnection(crmSystemId) {
        try {
            const crmSystem = await this.getCRMSystemById(crmSystemId);
            if (!crmSystem) {
                return {
                    success: false,
                    message: 'CRM system not found',
                    details: { error: 'NOT_FOUND' }
                };
            }
            // Check if the CRM type is supported
            if (!adapter_factory_1.CRMAdapterFactory.isSupported(crmSystem.type)) {
                return {
                    success: false,
                    message: `CRM type '${crmSystem.type}' is not supported. Supported types: ${adapter_factory_1.CRMAdapterFactory.getSupportedTypes().join(', ')}`,
                    details: { error: 'UNSUPPORTED_TYPE' }
                };
            }
            const adapter = adapter_factory_1.CRMAdapterFactory.getAdapter(crmSystem);
            const result = await adapter.testConnection();
            return result;
        }
        catch (error) {
            return {
                success: false,
                message: `Connection test failed: ${error.message}`,
                details: { error: error.message }
            };
        }
    }
    async getSyncConflicts(crmSystemId) {
        let query = 'SELECT * FROM crm_sync_conflicts WHERE resolution IS NULL';
        const values = [];
        if (crmSystemId) {
            query += ' AND crm_system_id = $1';
            values.push(crmSystemId);
        }
        query += ' ORDER BY created_at DESC';
        const result = await this.db.query(query, values);
        return result.rows.map(row => this.mapRowToSyncConflict(row));
    }
    async resolveSyncConflict(conflictId, resolution, customValue) {
        const query = `
      UPDATE crm_sync_conflicts 
      SET resolution = $1, resolved_at = NOW(), resolved_by = 'system'
      WHERE id = $2
    `;
        const result = await this.db.query(query, [resolution, conflictId]);
        if (result.rowCount === 0) {
            throw new Error('Sync conflict not found');
        }
    }
    async syncProjectToCRM(projectId, crmSystemId) {
        try {
            const crmSystem = await this.getCRMSystemById(crmSystemId);
            if (!crmSystem) {
                return {
                    success: false,
                    error: 'CRM system not found'
                };
            }
            const project = await this.getProjectById(projectId);
            if (!project) {
                return {
                    success: false,
                    error: 'Project not found'
                };
            }
            if (!adapter_factory_1.CRMAdapterFactory.isSupported(crmSystem.type)) {
                return {
                    success: false,
                    error: `CRM type '${crmSystem.type}' is not supported`
                };
            }
            const adapter = adapter_factory_1.CRMAdapterFactory.getAdapter(crmSystem);
            const crmProject = await adapter.createProject({
                name: project.name,
                description: project.description,
                priority: project.priority,
                dueDate: project.estimatedEndDate,
                labels: project.tags || []
            });
            // Update project with CRM ID
            await this.updateProjectCRMId(projectId, crmProject.id, crmSystemId);
            return {
                success: true,
                crmId: crmProject.id
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to sync project to CRM: ${error.message}`
            };
        }
    }
    async syncProjectFromCRM(crmId, crmSystemId) {
        try {
            const crmSystem = await this.getCRMSystemById(crmSystemId);
            if (!crmSystem) {
                return {
                    success: false,
                    error: 'CRM system not found'
                };
            }
            if (!adapter_factory_1.CRMAdapterFactory.isSupported(crmSystem.type)) {
                return {
                    success: false,
                    error: `CRM type '${crmSystem.type}' is not supported`
                };
            }
            const adapter = adapter_factory_1.CRMAdapterFactory.getAdapter(crmSystem);
            const crmProject = await adapter.getProject(crmId);
            if (!crmProject) {
                return {
                    success: false,
                    error: 'Project not found in CRM'
                };
            }
            // Create or update project in our system
            const projectId = await this.createOrUpdateProjectFromCRM(crmProject, crmSystemId);
            return {
                success: true,
                projectId
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to sync project from CRM: ${error.message}`
            };
        }
    }
    mapRowToCRMSystem(row) {
        const safeJsonParse = (value, fallback = {}) => {
            if (!value)
                return fallback;
            if (typeof value === 'object')
                return value;
            if (typeof value === 'string') {
                if (value === '[object Object]')
                    return fallback;
                try {
                    return JSON.parse(value);
                }
                catch {
                    return fallback;
                }
            }
            return fallback;
        };
        return {
            id: row.id,
            name: row.name,
            type: row.type,
            apiUrl: row.api_url,
            apiVersion: row.api_version,
            authType: row.auth_type,
            credentials: safeJsonParse(row.credentials, {}),
            syncSettings: safeJsonParse(row.sync_settings, {}),
            isActive: row.is_active,
            lastSyncAt: row.last_sync_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    mapRowToSyncOperation(row) {
        const safeJsonParse = (value, fallback = {}) => {
            if (!value)
                return fallback;
            if (typeof value === 'object')
                return value;
            if (typeof value === 'string') {
                if (value === '[object Object]')
                    return fallback;
                try {
                    return JSON.parse(value);
                }
                catch {
                    return fallback;
                }
            }
            return fallback;
        };
        return {
            id: row.id,
            crmSystemId: row.crm_system_id,
            operation: row.operation,
            direction: row.direction,
            status: row.status,
            progress: safeJsonParse(row.progress, {}),
            results: safeJsonParse(row.results, {}),
            startedAt: row.started_at,
            completedAt: row.completed_at,
            duration: row.duration,
            triggeredBy: row.triggered_by,
            metadata: safeJsonParse(row.metadata, {})
        };
    }
    mapRowToSyncConflict(row) {
        return {
            id: row.id,
            recordId: row.record_id,
            recordType: row.record_type,
            field: row.field,
            systemValue: row.system_value,
            crmValue: row.crm_value,
            lastModifiedSystem: row.last_modified_system,
            lastModifiedCRM: row.last_modified_crm,
            resolution: row.resolution,
            resolvedBy: row.resolved_by,
            resolvedAt: row.resolved_at,
            createdAt: row.created_at
        };
    }
    camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    async getCRMSystemById(id) {
        const query = 'SELECT * FROM crm_systems WHERE id = $1';
        const result = await this.db.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToCRMSystem(result.rows[0]);
    }
    async getProjectById(id) {
        const query = 'SELECT * FROM projects WHERE id = $1';
        const result = await this.db.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    async updateProjectCRMId(projectId, crmId, crmSystemId) {
        const query = `
      UPDATE projects 
      SET crm_id = $1, crm_system_id = $2, updated_at = NOW()
      WHERE id = $3
    `;
        await this.db.query(query, [crmId, crmSystemId, projectId]);
    }
    async createOrUpdateProjectFromCRM(crmProject, crmSystemId) {
        // Check if project already exists by CRM ID
        const existingQuery = 'SELECT id FROM projects WHERE crm_id = $1 AND crm_system_id = $2';
        const existing = await this.db.query(existingQuery, [crmProject.id, crmSystemId]);
        if (existing.rows.length > 0) {
            // Update existing project
            const updateQuery = `
        UPDATE projects
        SET name = $1, description = $2, status = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING id
      `;
            const result = await this.db.query(updateQuery, [
                crmProject.name,
                crmProject.description,
                crmProject.status,
                existing.rows[0].id
            ]);
            return result.rows[0].id;
        }
        else {
            // Create new project
            const insertQuery = `
        INSERT INTO projects
        (name, description, status, crm_id, crm_system_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id
      `;
            const result = await this.db.query(insertQuery, [
                crmProject.name,
                crmProject.description || '',
                crmProject.status || 'active',
                crmProject.id,
                crmSystemId
            ]);
            return result.rows[0].id;
        }
    }
    /**
     * Sync data from external CRM system to internal database
     */
    async syncFromCRM(crmSystemId, options) {
        const result = {
            success: false,
            syncedRecords: 0,
            errors: [],
            conflicts: []
        };
        try {
            const crmSystem = await this.getCRMSystemById(crmSystemId);
            if (!crmSystem) {
                result.errors.push('CRM system not found');
                return result;
            }
            if (!adapter_factory_1.CRMAdapterFactory.isSupported(crmSystem.type)) {
                result.errors.push(`CRM type '${crmSystem.type}' is not supported`);
                return result;
            }
            const adapter = adapter_factory_1.CRMAdapterFactory.getAdapter(crmSystem);
            // Test connection first
            const connectionTest = await adapter.testConnection();
            if (!connectionTest.success) {
                result.errors.push(`CRM connection failed: ${connectionTest.message}`);
                return result;
            }
            // Get projects from CRM
            const crmProjects = await adapter.listProjects({
                limit: 1000 // TODO: Implement pagination
            });
            for (const crmProject of crmProjects) {
                try {
                    // Map CRM data to internal format
                    const mappedData = await this.mapCRMData(crmProject, crmSystemId);
                    if (!options?.dryRun) {
                        // Create or update project in our system
                        await this.createOrUpdateProjectFromCRM(mappedData, crmSystemId);
                    }
                    result.syncedRecords++;
                }
                catch (error) {
                    result.errors.push(`Failed to sync project ${crmProject.id}: ${error.message}`);
                }
            }
            // Update last sync timestamp
            if (!options?.dryRun) {
                await this.updateLastSyncTimestamp(crmSystemId);
            }
            result.success = result.errors.length === 0;
            return result;
        }
        catch (error) {
            result.errors.push(`Sync failed: ${error.message}`);
            return result;
        }
    }
    /**
     * Sync data from internal database to external CRM system
     */
    async syncToCRM(crmSystemId, options) {
        const result = {
            success: false,
            syncedRecords: 0,
            errors: [],
            conflicts: []
        };
        try {
            const crmSystem = await this.getCRMSystemById(crmSystemId);
            if (!crmSystem) {
                result.errors.push('CRM system not found');
                return result;
            }
            if (!adapter_factory_1.CRMAdapterFactory.isSupported(crmSystem.type)) {
                result.errors.push(`CRM type '${crmSystem.type}' is not supported`);
                return result;
            }
            const adapter = adapter_factory_1.CRMAdapterFactory.getAdapter(crmSystem);
            // Test connection first
            const connectionTest = await adapter.testConnection();
            if (!connectionTest.success) {
                result.errors.push(`CRM connection failed: ${connectionTest.message}`);
                return result;
            }
            // Get projects to sync
            let query = 'SELECT * FROM projects WHERE 1=1';
            const params = [];
            if (options?.projectIds && options.projectIds.length > 0) {
                query += ` AND id = ANY($${params.length + 1})`;
                params.push(options.projectIds);
            }
            if (options?.since) {
                query += ` AND updated_at >= $${params.length + 1}`;
                params.push(options.since);
            }
            const projectsResult = await this.db.query(query, params);
            const projects = projectsResult.rows;
            for (const project of projects) {
                try {
                    const projectData = {
                        name: project.name,
                        description: project.description,
                        priority: project.priority,
                        dueDate: project.estimated_end_date,
                        labels: project.tags || []
                    };
                    if (!options?.dryRun) {
                        if (project.crm_id && project.crm_system_id === crmSystemId) {
                            // Update existing project in CRM
                            await adapter.updateProject(project.crm_id, projectData);
                        }
                        else {
                            // Create new project in CRM
                            const crmProject = await adapter.createProject(projectData);
                            // Update project with CRM ID
                            await this.updateProjectCRMId(project.id, crmProject.id, crmSystemId);
                        }
                    }
                    result.syncedRecords++;
                }
                catch (error) {
                    result.errors.push(`Failed to sync project ${project.id}: ${error.message}`);
                }
            }
            // Update last sync timestamp
            if (!options?.dryRun) {
                await this.updateLastSyncTimestamp(crmSystemId);
            }
            result.success = result.errors.length === 0;
            return result;
        }
        catch (error) {
            result.errors.push(`Sync failed: ${error.message}`);
            return result;
        }
    }
    /**
     * Map CRM data to internal format based on field mappings
     */
    async mapCRMData(crmData, crmSystemId) {
        try {
            const crmSystem = await this.getCRMSystemById(crmSystemId);
            if (!crmSystem) {
                throw new Error('CRM system not found');
            }
            const mappings = crmSystem.syncSettings?.fieldMappings || [];
            const mappedData = {};
            // Default mappings for common fields
            const defaultMappings = [
                { systemField: 'name', crmField: 'name', dataType: 'string' },
                { systemField: 'description', crmField: 'description', dataType: 'string' },
                { systemField: 'status', crmField: 'status', dataType: 'string' },
                { systemField: 'priority', crmField: 'priority', dataType: 'string' },
                { systemField: 'created_at', crmField: 'createdAt', dataType: 'date' },
                { systemField: 'updated_at', crmField: 'updatedAt', dataType: 'date' }
            ];
            // Apply custom mappings first, then default mappings
            const allMappings = [...mappings, ...defaultMappings];
            for (const mapping of allMappings) {
                if (crmData.hasOwnProperty(mapping.crmField)) {
                    let value = crmData[mapping.crmField];
                    // Apply data type transformations
                    switch (mapping.dataType) {
                        case 'date':
                            value = value ? new Date(value).toISOString() : null;
                            break;
                        case 'number':
                            value = value ? parseFloat(value) : null;
                            break;
                        case 'boolean':
                            value = Boolean(value);
                            break;
                        case 'array':
                            value = Array.isArray(value) ? value : (value ? [value] : []);
                            break;
                        case 'object':
                            value = typeof value === 'object' ? value : {};
                            break;
                        default:
                            value = value ? String(value) : null;
                    }
                    // Apply custom transform if specified (only for full CRMFieldMapping objects)
                    const fullMapping = mapping;
                    if (fullMapping.transform) {
                        try {
                            // Simple transform evaluation (in production, use a safer evaluator)
                            const transformFn = new Function('value', `return ${fullMapping.transform}`);
                            value = transformFn(value);
                        }
                        catch (error) {
                            console.warn(`Transform failed for field ${mapping.systemField}:`, error);
                        }
                    }
                    mappedData[mapping.systemField] = value;
                }
            }
            // Ensure we have the original CRM ID
            mappedData.id = crmData.id;
            return mappedData;
        }
        catch (error) {
            throw new Error(`Data mapping failed: ${error.message}`);
        }
    }
    /**
     * Handle incoming webhooks from CRM systems
     */
    async handleWebhook(crmSystemId, payload) {
        try {
            const crmSystem = await this.getCRMSystemById(crmSystemId);
            if (!crmSystem) {
                return {
                    success: false,
                    message: 'CRM system not found'
                };
            }
            // Log webhook received
            await this.logWebhookEvent(crmSystemId, payload);
            // Parse webhook payload based on CRM type
            const parsedEvents = await this.parseWebhookPayload(crmSystem.type, payload);
            let processedRecords = 0;
            for (const event of parsedEvents) {
                try {
                    switch (event.type) {
                        case 'project.created':
                        case 'project.updated':
                            await this.handleProjectEvent(crmSystemId, event);
                            processedRecords++;
                            break;
                        case 'project.deleted':
                            await this.handleProjectDeletion(crmSystemId, event.data.id);
                            processedRecords++;
                            break;
                        default:
                            console.log(`Unhandled webhook event type: ${event.type}`);
                    }
                }
                catch (error) {
                    console.error(`Failed to process webhook event:`, error);
                }
            }
            return {
                success: true,
                message: `Processed ${processedRecords} events`,
                processedRecords
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Webhook processing failed: ${error.message}`
            };
        }
    }
    /**
     * Get the last sync status for a CRM system
     */
    async getLastSyncStatus(crmSystemId) {
        try {
            // Get the most recent sync operation
            const query = `
        SELECT * FROM crm_sync_operations
        WHERE crm_system_id = $1
        ORDER BY started_at DESC
        LIMIT 1
      `;
            const result = await this.db.query(query, [crmSystemId]);
            if (result.rows.length === 0) {
                return {
                    lastSyncAt: null,
                    status: 'never'
                };
            }
            const operation = this.mapRowToSyncOperation(result.rows[0]);
            let status;
            switch (operation.status) {
                case 'completed':
                    status = operation.results.errors.length > 0 ? 'failed' : 'success';
                    break;
                case 'failed':
                    status = 'failed';
                    break;
                case 'pending':
                case 'running':
                    status = 'pending';
                    break;
                default:
                    status = 'failed';
            }
            return {
                lastSyncAt: operation.startedAt || null,
                status,
                details: {
                    syncedRecords: operation.results.created + operation.results.updated,
                    errors: operation.results.errors.map(e => e.error),
                    duration: operation.duration
                }
            };
        }
        catch (error) {
            console.error('Failed to get last sync status:', error);
            return {
                lastSyncAt: null,
                status: 'failed',
                details: {
                    errors: [error.message]
                }
            };
        }
    }
    // Helper methods for webhook processing
    async parseWebhookPayload(crmType, payload) {
        // Simple webhook parsing - in production, implement specific parsers for each CRM
        const events = [];
        if (payload.events && Array.isArray(payload.events)) {
            // Multiple events format
            events.push(...payload.events);
        }
        else if (payload.event_type || payload.type) {
            // Single event format
            events.push({
                type: payload.event_type || payload.type,
                data: payload.data || payload
            });
        }
        return events;
    }
    async handleProjectEvent(crmSystemId, event) {
        try {
            const crmSystem = await this.getCRMSystemById(crmSystemId);
            if (!crmSystem || !adapter_factory_1.CRMAdapterFactory.isSupported(crmSystem.type)) {
                return;
            }
            const adapter = adapter_factory_1.CRMAdapterFactory.getAdapter(crmSystem);
            const crmProject = await adapter.getProject(event.data.id);
            if (crmProject) {
                const mappedData = await this.mapCRMData(crmProject, crmSystemId);
                await this.createOrUpdateProjectFromCRM(mappedData, crmSystemId);
            }
        }
        catch (error) {
            console.error(`Failed to handle project event:`, error);
            throw error;
        }
    }
    async handleProjectDeletion(crmSystemId, crmProjectId) {
        try {
            const query = `
        UPDATE projects
        SET status = 'deleted', updated_at = NOW()
        WHERE crm_id = $1 AND crm_system_id = $2
      `;
            await this.db.query(query, [crmProjectId, crmSystemId]);
        }
        catch (error) {
            console.error(`Failed to handle project deletion:`, error);
            throw error;
        }
    }
    async logWebhookEvent(crmSystemId, payload) {
        try {
            const query = `
        INSERT INTO webhook_logs (crm_system_id, payload, received_at)
        VALUES ($1, $2, NOW())
      `;
            await this.db.query(query, [crmSystemId, JSON.stringify(payload)]);
        }
        catch (error) {
            console.error('Failed to log webhook event:', error);
        }
    }
    async updateLastSyncTimestamp(crmSystemId) {
        try {
            const query = `
        UPDATE crm_systems
        SET last_sync_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `;
            await this.db.query(query, [crmSystemId]);
        }
        catch (error) {
            console.error('Failed to update last sync timestamp:', error);
        }
    }
}
exports.CRMIntegrationService = CRMIntegrationService;

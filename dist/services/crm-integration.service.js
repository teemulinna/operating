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
}
exports.CRMIntegrationService = CRMIntegrationService;

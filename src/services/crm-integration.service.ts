// CRM Integration Service for Pipeline Management
import { DatabaseService } from '../database/database.service';
import { ApiError } from '../utils/api-error';
import {
  CRMSystemConfig,
  CRMSyncOperation,
  CRMSyncError,
  CRMSyncConflict,
  PipelineProject,
  CRMSyncRequest,
  CRMFieldMapping
} from '../types/pipeline';

export class CRMIntegrationService {
  private db: DatabaseService;
  private activeSyncs: Map<string, CRMSyncOperation> = new Map();

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // CRM System Configuration
  async createCRMSystem(config: Omit<CRMSystemConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMSystemConfig> {
    try {
      const query = `
        INSERT INTO crm_systems (
          name, type, api_url, api_version, auth_type, credentials,
          sync_settings, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        config.name,
        config.type,
        config.apiUrl,
        config.apiVersion,
        config.authType,
        JSON.stringify(config.credentials),
        JSON.stringify(config.syncSettings),
        config.isActive
      ];

      const result = await this.db.query(query, values);
      return this.transformCRMSystem(result.rows[0]);
    } catch (error) {
      console.error('Error creating CRM system:', error);
      throw new ApiError(500, 'Failed to create CRM system');
    }
  }

  async getCRMSystems(includeInactive = false): Promise<CRMSystemConfig[]> {
    try {
      const whereClause = includeInactive ? '' : 'WHERE is_active = true';
      const query = `SELECT * FROM crm_systems ${whereClause} ORDER BY name ASC`;
      
      const result = await this.db.query(query);
      return result.rows.map(row => this.transformCRMSystem(row));
    } catch (error) {
      console.error('Error fetching CRM systems:', error);
      throw new ApiError(500, 'Failed to fetch CRM systems');
    }
  }

  async updateCRMSystem(id: string, updates: Partial<CRMSystemConfig>): Promise<CRMSystemConfig> {
    try {
      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (updates.name) {
        updateFields.push(`name = $${paramIndex}`);
        queryParams.push(updates.name);
        paramIndex++;
      }

      if (updates.apiUrl) {
        updateFields.push(`api_url = $${paramIndex}`);
        queryParams.push(updates.apiUrl);
        paramIndex++;
      }

      if (updates.credentials) {
        updateFields.push(`credentials = $${paramIndex}`);
        queryParams.push(JSON.stringify(updates.credentials));
        paramIndex++;
      }

      if (updates.syncSettings) {
        updateFields.push(`sync_settings = $${paramIndex}`);
        queryParams.push(JSON.stringify(updates.syncSettings));
        paramIndex++;
      }

      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        queryParams.push(updates.isActive);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new ApiError(400, 'No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      queryParams.push(id);

      const query = `
        UPDATE crm_systems 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.db.query(query, queryParams);
      
      if (!result.rows.length) {
        throw new ApiError(404, 'CRM system not found');
      }

      return this.transformCRMSystem(result.rows[0]);
    } catch (error) {
      console.error('Error updating CRM system:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update CRM system');
    }
  }

  // CRM Data Synchronization
  async startSync(request: CRMSyncRequest): Promise<CRMSyncOperation> {
    try {
      const crmSystem = await this.getCRMSystemById(request.crmSystemId);
      if (!crmSystem || !crmSystem.isActive) {
        throw new ApiError(400, 'CRM system not found or inactive');
      }

      // Create sync operation record
      const syncOperation = await this.createSyncOperation(request);
      this.activeSyncs.set(syncOperation.id, syncOperation);

      // Start sync in background
      this.performSync(syncOperation, crmSystem).catch(error => {
        console.error(`Sync operation ${syncOperation.id} failed:`, error);
        this.updateSyncStatus(syncOperation.id, 'failed', error.message);
      });

      return syncOperation;
    } catch (error) {
      console.error('Error starting sync:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to start sync operation');
    }
  }

  async getSyncOperations(crmSystemId?: string, limit = 50): Promise<CRMSyncOperation[]> {
    try {
      let query = `
        SELECT * FROM crm_sync_operations 
        ${crmSystemId ? 'WHERE crm_system_id = $1' : ''}
        ORDER BY started_at DESC 
        LIMIT ${crmSystemId ? '$2' : '$1'}
      `;

      const params = crmSystemId ? [crmSystemId, limit] : [limit];
      const result = await this.db.query(query, params);
      
      return result.rows.map(row => this.transformSyncOperation(row));
    } catch (error) {
      console.error('Error fetching sync operations:', error);
      throw new ApiError(500, 'Failed to fetch sync operations');
    }
  }

  async getSyncOperation(id: string): Promise<CRMSyncOperation | null> {
    try {
      const query = `SELECT * FROM crm_sync_operations WHERE id = $1`;
      const result = await this.db.query(query, [id]);
      
      return result.rows.length ? this.transformSyncOperation(result.rows[0]) : null;
    } catch (error) {
      console.error('Error fetching sync operation:', error);
      throw new ApiError(500, 'Failed to fetch sync operation');
    }
  }

  // CRM API Integration Methods
  async testConnection(crmSystemId: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const crmSystem = await this.getCRMSystemById(crmSystemId);
      if (!crmSystem) {
        throw new ApiError(404, 'CRM system not found');
      }

      const result = await this.makeAPIRequest(crmSystem, 'GET', '/ping', null);
      
      return {
        success: true,
        message: 'Connection successful',
        details: result
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        message: error.message || 'Connection failed',
        details: error
      };
    }
  }

  async syncProjectToCRM(projectId: string, crmSystemId: string): Promise<{ success: boolean; crmId?: string; error?: string }> {
    try {
      const crmSystem = await this.getCRMSystemById(crmSystemId);
      if (!crmSystem) {
        throw new ApiError(404, 'CRM system not found');
      }

      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found');
      }

      const crmData = this.transformProjectToCRM(project, crmSystem);
      
      let result;
      if (project.crmId) {
        // Update existing record
        result = await this.makeAPIRequest(crmSystem, 'PUT', `/opportunities/${project.crmId}`, crmData);
      } else {
        // Create new record
        result = await this.makeAPIRequest(crmSystem, 'POST', '/opportunities', crmData);
        
        // Update project with CRM ID
        await this.updateProjectCRMId(projectId, result.id, crmSystemId);
      }

      return {
        success: true,
        crmId: result.id
      };
    } catch (error) {
      console.error('Error syncing project to CRM:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async syncProjectFromCRM(crmId: string, crmSystemId: string): Promise<{ success: boolean; projectId?: string; error?: string }> {
    try {
      const crmSystem = await this.getCRMSystemById(crmSystemId);
      if (!crmSystem) {
        throw new ApiError(404, 'CRM system not found');
      }

      const crmData = await this.makeAPIRequest(crmSystem, 'GET', `/opportunities/${crmId}`, null);
      const projectData = this.transformCRMToProject(crmData, crmSystem);
      
      // Check if project already exists
      const existingProject = await this.getProjectByCRMId(crmId, crmSystemId);
      
      let result;
      if (existingProject) {
        // Update existing project
        result = await this.updateProject(existingProject.id, projectData);
      } else {
        // Create new project
        result = await this.createProject(projectData);
      }

      return {
        success: true,
        projectId: result.id
      };
    } catch (error) {
      console.error('Error syncing project from CRM:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Conflict Resolution
  async getSyncConflicts(crmSystemId?: string): Promise<CRMSyncConflict[]> {
    try {
      let query = `
        SELECT * FROM crm_sync_conflicts 
        ${crmSystemId ? 'WHERE crm_system_id = $1' : ''}
        WHERE resolution IS NULL
        ORDER BY created_at DESC
      `;

      const params = crmSystemId ? [crmSystemId] : [];
      const result = await this.db.query(query, params);
      
      return result.rows.map(row => this.transformSyncConflict(row));
    } catch (error) {
      console.error('Error fetching sync conflicts:', error);
      throw new ApiError(500, 'Failed to fetch sync conflicts');
    }
  }

  async resolveSyncConflict(conflictId: string, resolution: 'use-system' | 'use-crm' | 'merge', customValue?: any): Promise<void> {
    try {
      const query = `
        UPDATE crm_sync_conflicts 
        SET resolution = $1, resolved_at = CURRENT_TIMESTAMP, resolved_by = $2
        WHERE id = $3
      `;

      await this.db.query(query, [resolution, 'system', conflictId]); // TODO: Get user from auth context

      // Apply resolution logic here
      // This would involve updating the actual data based on the resolution chosen
    } catch (error) {
      console.error('Error resolving sync conflict:', error);
      throw new ApiError(500, 'Failed to resolve sync conflict');
    }
  }

  // Private helper methods
  private async getCRMSystemById(id: string): Promise<CRMSystemConfig | null> {
    const query = `SELECT * FROM crm_systems WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return result.rows.length ? this.transformCRMSystem(result.rows[0]) : null;
  }

  private async createSyncOperation(request: CRMSyncRequest): Promise<CRMSyncOperation> {
    const query = `
      INSERT INTO crm_sync_operations (
        crm_system_id, operation, direction, status, progress, results, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const initialProgress = { total: 0, processed: 0, successful: 0, failed: 0, skipped: 0 };
    const initialResults = { created: 0, updated: 0, deleted: 0, conflicts: 0, errors: [] };

    const values = [
      request.crmSystemId,
      request.operation,
      request.direction || 'bidirectional',
      'pending',
      JSON.stringify(initialProgress),
      JSON.stringify(initialResults),
      JSON.stringify({ filters: request.filters, options: request.options })
    ];

    const result = await this.db.query(query, values);
    return this.transformSyncOperation(result.rows[0]);
  }

  private async performSync(syncOperation: CRMSyncOperation, crmSystem: CRMSystemConfig): Promise<void> {
    await this.updateSyncStatus(syncOperation.id, 'running');

    try {
      switch (syncOperation.operation) {
        case 'sync':
          await this.performBidirectionalSync(syncOperation, crmSystem);
          break;
        case 'import':
          await this.performImportFromCRM(syncOperation, crmSystem);
          break;
        case 'export':
          await this.performExportToCRM(syncOperation, crmSystem);
          break;
      }

      await this.updateSyncStatus(syncOperation.id, 'completed');
    } catch (error) {
      await this.updateSyncStatus(syncOperation.id, 'failed', error.message);
      throw error;
    }
  }

  private async performBidirectionalSync(syncOperation: CRMSyncOperation, crmSystem: CRMSystemConfig): Promise<void> {
    // Implementation for bidirectional sync
    // This would involve comparing data between systems and syncing changes
    console.log('Performing bidirectional sync...', syncOperation.id);
  }

  private async performImportFromCRM(syncOperation: CRMSyncOperation, crmSystem: CRMSystemConfig): Promise<void> {
    // Implementation for importing data from CRM
    console.log('Performing import from CRM...', syncOperation.id);
  }

  private async performExportToCRM(syncOperation: CRMSyncOperation, crmSystem: CRMSystemConfig): Promise<void> {
    // Implementation for exporting data to CRM
    console.log('Performing export to CRM...', syncOperation.id);
  }

  private async makeAPIRequest(crmSystem: CRMSystemConfig, method: string, endpoint: string, data: any): Promise<any> {
    // Mock CRM API implementation for testing
    // In production, this would make actual HTTP requests to CRM systems
    
    console.log(`Making ${method} request to ${crmSystem.name} at ${endpoint}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (method) {
      case 'GET':
        if (endpoint === '/ping') {
          return { status: 'OK', timestamp: new Date().toISOString() };
        }
        if (endpoint.startsWith('/opportunities/')) {
          const id = endpoint.split('/')[2];
          return {
            id,
            name: `Mock Opportunity ${id}`,
            stage: 'opportunity',
            value: 50000,
            probability: 75,
            closeDate: '2024-12-31'
          };
        }
        break;
        
      case 'POST':
        return {
          id: `crm_${Date.now()}`,
          ...data
        };
        
      case 'PUT':
        return {
          id: endpoint.split('/')[2],
          ...data,
          updatedAt: new Date().toISOString()
        };
        
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
    
    return null;
  }

  private transformProjectToCRM(project: PipelineProject, crmSystem: CRMSystemConfig): any {
    const mappings = crmSystem.syncSettings.fieldMappings;
    const crmData: any = {};

    mappings.forEach(mapping => {
      if (mapping.direction === 'to-crm' || mapping.direction === 'bidirectional') {
        const systemValue = this.getNestedValue(project, mapping.systemField);
        if (systemValue !== undefined) {
          crmData[mapping.crmField] = this.transformValue(systemValue, mapping);
        }
      }
    });

    return crmData;
  }

  private transformCRMToProject(crmData: any, crmSystem: CRMSystemConfig): Partial<PipelineProject> {
    const mappings = crmSystem.syncSettings.fieldMappings;
    const projectData: any = {};

    mappings.forEach(mapping => {
      if (mapping.direction === 'from-crm' || mapping.direction === 'bidirectional') {
        const crmValue = this.getNestedValue(crmData, mapping.crmField);
        if (crmValue !== undefined) {
          this.setNestedValue(projectData, mapping.systemField, this.transformValue(crmValue, mapping));
        }
      }
    });

    return projectData;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private transformValue(value: any, mapping: CRMFieldMapping): any {
    if (mapping.transform) {
      try {
        // Execute transformation function
        // In production, this would use a safe sandbox for custom transforms
        return eval(`(function(value) { return ${mapping.transform}; })`)(value);
      } catch (error) {
        console.warn(`Transform failed for field ${mapping.systemField}:`, error);
        return value;
      }
    }
    return value;
  }

  private async updateSyncStatus(syncId: string, status: string, errorMessage?: string): Promise<void> {
    const query = `
      UPDATE crm_sync_operations 
      SET status = $1, ${status === 'completed' ? 'completed_at = CURRENT_TIMESTAMP,' : ''} 
          ${errorMessage ? 'results = jsonb_set(results, \'{errors}\', jsonb_build_array($3))' : ''}
      WHERE id = $2
    `;

    const params = errorMessage ? [status, syncId, errorMessage] : [status, syncId];
    await this.db.query(query, params);
  }

  // Placeholder methods for project operations
  private async getProjectById(id: string): Promise<PipelineProject | null> {
    // This would integrate with existing project service
    return null;
  }

  private async updateProjectCRMId(projectId: string, crmId: string, crmSystemId: string): Promise<void> {
    // Implementation would update project with CRM information
  }

  private async getProjectByCRMId(crmId: string, crmSystemId: string): Promise<PipelineProject | null> {
    // Implementation would find project by CRM ID
    return null;
  }

  private async createProject(projectData: any): Promise<PipelineProject> {
    // Implementation would create new project
    return {} as PipelineProject;
  }

  private async updateProject(id: string, updates: any): Promise<PipelineProject> {
    // Implementation would update existing project
    return {} as PipelineProject;
  }

  // Transform database rows to domain objects
  private transformCRMSystem(row: any): CRMSystemConfig {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      apiUrl: row.api_url,
      apiVersion: row.api_version,
      authType: row.auth_type,
      credentials: row.credentials || {},
      syncSettings: row.sync_settings || {
        autoSync: false,
        syncInterval: 60,
        syncDirection: 'bidirectional',
        fieldMappings: [],
        filters: {},
        conflictResolution: 'manual'
      },
      isActive: row.is_active,
      lastSyncAt: row.last_sync_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private transformSyncOperation(row: any): CRMSyncOperation {
    return {
      id: row.id,
      crmSystemId: row.crm_system_id,
      operation: row.operation,
      direction: row.direction,
      status: row.status,
      progress: row.progress || { total: 0, processed: 0, successful: 0, failed: 0, skipped: 0 },
      results: row.results || { created: 0, updated: 0, deleted: 0, conflicts: 0, errors: [] },
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.duration,
      triggeredBy: row.triggered_by,
      metadata: row.metadata || {}
    };
  }

  private transformSyncConflict(row: any): CRMSyncConflict {
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
}
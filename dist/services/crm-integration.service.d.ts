import { CRMSystemConfig, CRMSyncOperation, CRMSyncConflict, CRMSyncRequest } from '../types/pipeline';
export declare class CRMIntegrationService {
    private db;
    constructor();
    createCRMSystem(data: Omit<CRMSystemConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMSystemConfig>;
    getCRMSystems(includeInactive?: boolean): Promise<CRMSystemConfig[]>;
    updateCRMSystem(id: string, data: Partial<Omit<CRMSystemConfig, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CRMSystemConfig>;
    startSync(request: CRMSyncRequest): Promise<CRMSyncOperation>;
    getSyncOperations(crmSystemId?: string, limit?: number): Promise<CRMSyncOperation[]>;
    getSyncOperation(id: string): Promise<CRMSyncOperation | null>;
    testConnection(crmSystemId: string): Promise<{
        success: boolean;
        message: string;
        details?: any;
    }>;
    getSyncConflicts(crmSystemId?: string): Promise<CRMSyncConflict[]>;
    resolveSyncConflict(conflictId: string, resolution: string, customValue?: any): Promise<void>;
    syncProjectToCRM(projectId: string, crmSystemId: string): Promise<{
        success: boolean;
        crmId?: string;
        error?: string;
    }>;
    syncProjectFromCRM(crmId: string, crmSystemId: string): Promise<{
        success: boolean;
        projectId?: string;
        error?: string;
    }>;
    private mapRowToCRMSystem;
    private mapRowToSyncOperation;
    private mapRowToSyncConflict;
    private camelToSnake;
    private getCRMSystemById;
    private getProjectById;
    private updateProjectCRMId;
    private createOrUpdateProjectFromCRM;
    syncFromCRM(crmSystemId: string, options?: {
        entityTypes?: string[];
        since?: Date;
        dryRun?: boolean;
    }): Promise<{
        success: boolean;
        syncedRecords: number;
        errors: string[];
        conflicts: Array<{
            recordId: string;
            field: string;
            reason: string;
        }>;
    }>;
    syncToCRM(crmSystemId: string, options?: {
        projectIds?: string[];
        since?: Date;
        dryRun?: boolean;
    }): Promise<{
        success: boolean;
        syncedRecords: number;
        errors: string[];
        conflicts: Array<{
            recordId: string;
            field: string;
            reason: string;
        }>;
    }>;
    mapCRMData(crmData: any, crmSystemId: string): Promise<any>;
    handleWebhook(crmSystemId: string, payload: any): Promise<{
        success: boolean;
        message: string;
        processedRecords?: number;
    }>;
    getLastSyncStatus(crmSystemId: string): Promise<{
        lastSyncAt: string | null;
        status: 'success' | 'failed' | 'pending' | 'never';
        details?: {
            syncedRecords?: number;
            errors?: string[];
            duration?: number;
        };
    }>;
    private parseWebhookPayload;
    private handleProjectEvent;
    private handleProjectDeletion;
    private logWebhookEvent;
    private updateLastSyncTimestamp;
}
//# sourceMappingURL=crm-integration.service.d.ts.map
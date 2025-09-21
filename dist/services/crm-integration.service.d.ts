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
}
//# sourceMappingURL=crm-integration.service.d.ts.map
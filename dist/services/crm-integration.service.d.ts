import { CRMSystemConfig, CRMSyncOperation, CRMSyncConflict, CRMSyncRequest } from '../types/pipeline';
export declare class CRMIntegrationService {
    private db;
    private activeSyncs;
    constructor();
    createCRMSystem(config: Omit<CRMSystemConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMSystemConfig>;
    getCRMSystems(includeInactive?: boolean): Promise<CRMSystemConfig[]>;
    updateCRMSystem(id: string, updates: Partial<CRMSystemConfig>): Promise<CRMSystemConfig>;
    startSync(request: CRMSyncRequest): Promise<CRMSyncOperation>;
    getSyncOperations(crmSystemId?: string, limit?: number): Promise<CRMSyncOperation[]>;
    getSyncOperation(id: string): Promise<CRMSyncOperation | null>;
    testConnection(crmSystemId: string): Promise<{
        success: boolean;
        message: string;
        details?: any;
    }>;
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
    getSyncConflicts(crmSystemId?: string): Promise<CRMSyncConflict[]>;
    resolveSyncConflict(conflictId: string, resolution: 'use-system' | 'use-crm' | 'merge', customValue?: any): Promise<void>;
    private getCRMSystemById;
    private createSyncOperation;
    private performSync;
    private performBidirectionalSync;
    private performImportFromCRM;
    private performExportToCRM;
    private makeAPIRequest;
    private transformProjectToCRM;
    private transformCRMToProject;
    private getNestedValue;
    private setNestedValue;
    private transformValue;
    private updateSyncStatus;
    private getProjectById;
    private updateProjectCRMId;
    private getProjectByCRMId;
    private createProject;
    private updateProject;
    private transformCRMSystem;
    private transformSyncOperation;
    private transformSyncConflict;
}
//# sourceMappingURL=crm-integration.service.d.ts.map
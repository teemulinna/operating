export const __esModule: boolean;
export class CRMIntegrationService {
    db: any;
    createCRMSystem(data: any): Promise<{
        id: any;
        name: any;
        type: any;
        apiUrl: any;
        apiVersion: any;
        authType: any;
        credentials: any;
        syncSettings: any;
        isActive: any;
        lastSyncAt: any;
        createdAt: any;
        updatedAt: any;
    }>;
    getCRMSystems(includeInactive?: boolean): Promise<any>;
    updateCRMSystem(id: any, data: any): Promise<{
        id: any;
        name: any;
        type: any;
        apiUrl: any;
        apiVersion: any;
        authType: any;
        credentials: any;
        syncSettings: any;
        isActive: any;
        lastSyncAt: any;
        createdAt: any;
        updatedAt: any;
    }>;
    startSync(request: any): Promise<{
        id: any;
        crmSystemId: any;
        operation: any;
        direction: any;
        status: any;
        progress: any;
        results: any;
        startedAt: any;
        completedAt: any;
        duration: any;
        triggeredBy: any;
        metadata: any;
    }>;
    getSyncOperations(crmSystemId: any, limit?: number): Promise<any>;
    getSyncOperation(id: any): Promise<{
        id: any;
        crmSystemId: any;
        operation: any;
        direction: any;
        status: any;
        progress: any;
        results: any;
        startedAt: any;
        completedAt: any;
        duration: any;
        triggeredBy: any;
        metadata: any;
    } | null>;
    testConnection(crmSystemId: any): Promise<any>;
    getSyncConflicts(crmSystemId: any): Promise<any>;
    resolveSyncConflict(conflictId: any, resolution: any, customValue: any): Promise<void>;
    syncProjectToCRM(projectId: any, crmSystemId: any): Promise<{
        success: boolean;
        error: string;
        crmId?: undefined;
    } | {
        success: boolean;
        crmId: any;
        error?: undefined;
    }>;
    syncProjectFromCRM(crmId: any, crmSystemId: any): Promise<{
        success: boolean;
        error: string;
        projectId?: undefined;
    } | {
        success: boolean;
        projectId: any;
        error?: undefined;
    }>;
    mapRowToCRMSystem(row: any): {
        id: any;
        name: any;
        type: any;
        apiUrl: any;
        apiVersion: any;
        authType: any;
        credentials: any;
        syncSettings: any;
        isActive: any;
        lastSyncAt: any;
        createdAt: any;
        updatedAt: any;
    };
    mapRowToSyncOperation(row: any): {
        id: any;
        crmSystemId: any;
        operation: any;
        direction: any;
        status: any;
        progress: any;
        results: any;
        startedAt: any;
        completedAt: any;
        duration: any;
        triggeredBy: any;
        metadata: any;
    };
    mapRowToSyncConflict(row: any): {
        id: any;
        recordId: any;
        recordType: any;
        field: any;
        systemValue: any;
        crmValue: any;
        lastModifiedSystem: any;
        lastModifiedCRM: any;
        resolution: any;
        resolvedBy: any;
        resolvedAt: any;
        createdAt: any;
    };
    camelToSnake(str: any): any;
    getCRMSystemById(id: any): Promise<{
        id: any;
        name: any;
        type: any;
        apiUrl: any;
        apiVersion: any;
        authType: any;
        credentials: any;
        syncSettings: any;
        isActive: any;
        lastSyncAt: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    getProjectById(id: any): Promise<any>;
    updateProjectCRMId(projectId: any, crmId: any, crmSystemId: any): Promise<void>;
    createOrUpdateProjectFromCRM(crmProject: any, crmSystemId: any): Promise<any>;
    syncFromCRM(crmSystemId: any, options: any): Promise<{
        success: boolean;
        syncedRecords: number;
        errors: never[];
        conflicts: never[];
    }>;
    syncToCRM(crmSystemId: any, options: any): Promise<{
        success: boolean;
        syncedRecords: number;
        errors: never[];
        conflicts: never[];
    }>;
    mapCRMData(crmData: any, crmSystemId: any): Promise<{
        id: any;
    }>;
    handleWebhook(crmSystemId: any, payload: any): Promise<{
        success: boolean;
        message: string;
        processedRecords?: undefined;
    } | {
        success: boolean;
        message: string;
        processedRecords: number;
    }>;
    getLastSyncStatus(crmSystemId: any): Promise<{
        lastSyncAt: null;
        status: string;
        details?: undefined;
    } | {
        lastSyncAt: any;
        status: string;
        details: {
            syncedRecords: any;
            errors: any;
            duration: any;
        };
    } | {
        lastSyncAt: null;
        status: string;
        details: {
            errors: any[];
            syncedRecords?: undefined;
            duration?: undefined;
        };
    }>;
    parseWebhookPayload(crmType: any, payload: any): Promise<any[]>;
    handleProjectEvent(crmSystemId: any, event: any): Promise<void>;
    handleProjectDeletion(crmSystemId: any, crmProjectId: any): Promise<void>;
    logWebhookEvent(crmSystemId: any, payload: any): Promise<void>;
    updateLastSyncTimestamp(crmSystemId: any): Promise<void>;
}
//# sourceMappingURL=crm-integration.service.d.ts.map
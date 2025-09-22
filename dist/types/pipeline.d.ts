export interface CRMSystemConfig {
    id: string;
    name: string;
    type: 'jira' | 'asana' | 'trello' | 'salesforce' | 'hubspot' | 'pipedrive' | 'dynamics' | 'custom';
    apiUrl: string;
    apiVersion?: string;
    authType: 'oauth' | 'api-key' | 'basic' | 'bearer' | 'token';
    credentials: {
        apiKey?: string;
        clientId?: string;
        clientSecret?: string;
        accessToken?: string;
        refreshToken?: string;
        token?: string;
        apiToken?: string;
        userEmail?: string;
        projectKey?: string;
        workspaceGid?: string;
        projectGid?: string;
        boardId?: string;
    };
    syncSettings: CRMSyncSettings;
    isActive: boolean;
    lastSyncAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface CRMSyncSettings {
    autoSync?: boolean;
    syncInterval: number;
    syncDirection?: 'bidirectional' | 'crm-to-system' | 'system-to-crm';
    fieldMappings?: CRMFieldMapping[];
    filters?: CRMSyncFilters;
    conflictResolution?: 'crm-wins' | 'system-wins' | 'manual' | 'timestamp';
    entities?: string[];
}
export interface CRMFieldMapping {
    systemField: string;
    crmField: string;
    dataType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
    transform?: string;
    isRequired: boolean;
    direction: 'bidirectional' | 'to-crm' | 'from-crm';
}
export interface CRMSyncFilters {
    dateRange?: {
        start?: string;
        end?: string;
    };
    stages?: string[];
    sources?: string[];
    customFilters?: Record<string, any>;
}
export type PipelineStage = 'lead' | 'prospect' | 'opportunity' | 'proposal' | 'negotiation' | 'won' | 'lost' | 'on-hold';
export type PipelinePriority = 'low' | 'medium' | 'high' | 'critical';
export interface PipelineProject {
    id: string;
    crmId?: string;
    crmSource?: string;
    name: string;
    description?: string;
    clientName: string;
    clientContact?: {
        name: string;
        email: string;
        phone?: string;
        title?: string;
    };
    stage: PipelineStage;
    priority: PipelinePriority;
    probability: number;
    estimatedValue: number;
    estimatedStartDate: string;
    estimatedDuration: number;
    requiredSkills: string[];
    resourceDemand: ResourceDemand[];
    competitorInfo?: CompetitorInfo[];
    riskFactors: RiskFactor[];
    notes?: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    lastSyncAt?: string;
    syncStatus: 'synced' | 'pending' | 'failed' | 'conflict';
    estimatedEndDate?: string;
    weightedValue?: number;
    resourceCost?: number;
    availabilityScore?: number;
}
export interface ResourceDemand {
    id: string;
    skillCategory: string;
    experienceLevel: 'junior' | 'intermediate' | 'senior' | 'expert';
    requiredCount: number;
    allocationPercentage: number;
    startDate: string;
    endDate: string;
    hourlyRate?: number;
    isCritical: boolean;
    alternatives?: string[];
}
export interface CompetitorInfo {
    name: string;
    strengths: string[];
    weaknesses: string[];
    estimatedPrice?: number;
    likelihood: 'low' | 'medium' | 'high';
}
export interface RiskFactor {
    category: 'technical' | 'commercial' | 'resource' | 'timeline' | 'external';
    description: string;
    probability: number;
    impact: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    mitigationStrategy?: string;
}
export interface PipelineAnalytics {
    totalValue: number;
    weightedValue: number;
    conversionRates: {
        stage: PipelineStage;
        count: number;
        conversionRate: number;
        avgDuration: number;
    }[];
    forecastAccuracy: {
        period: string;
        predicted: number;
        actual: number;
        accuracy: number;
    }[];
    resourceDemandForecast: ResourceDemandForecast[];
    capacityUtilization: CapacityUtilization[];
    winLossAnalysis: WinLossAnalysis;
    trends: PipelineTrend[];
}
export interface ResourceDemandForecast {
    period: string;
    skillCategory: string;
    experienceLevel: string;
    demandHours: number;
    supplyHours: number;
    gapHours: number;
    utilizationRate: number;
    hiringRecommendation: number;
    confidence: number;
}
export interface CapacityUtilization {
    period: string;
    skillCategory: string;
    experienceLevel: string;
    totalCapacity: number;
    plannedUtilization: number;
    pipelineUtilization: number;
    availableCapacity: number;
    utilizationRate: number;
}
export interface WinLossAnalysis {
    totalOpportunities: number;
    wonCount: number;
    lostCount: number;
    winRate: number;
    avgDealSize: number;
    avgSalesCycle: number;
    lossReasons: {
        reason: string;
        count: number;
        percentage: number;
    }[];
    competitorAnalysis: {
        competitor: string;
        encounterCount: number;
        winRate: number;
    }[];
}
export interface PipelineTrend {
    period: string;
    newOpportunities: number;
    closedWon: number;
    closedLost: number;
    totalValue: number;
    avgProbability: number;
    conversionRate: number;
}
export interface CRMSyncOperation {
    id: string;
    crmSystemId: string;
    operation: 'sync' | 'import' | 'export' | 'validate' | 'sync_projects';
    direction: 'bidirectional' | 'to_crm' | 'from_crm' | 'to-crm' | 'from-crm';
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: {
        total: number;
        processed: number;
        successful: number;
        failed: number;
        skipped: number;
    };
    results: {
        created: number;
        updated: number;
        deleted: number;
        conflicts: number;
        errors: CRMSyncError[];
    };
    startedAt?: string;
    completedAt?: string;
    duration?: number;
    triggeredBy?: string;
    metadata?: Record<string, any>;
}
export interface CRMSyncError {
    recordId?: string;
    recordType: string;
    error: string;
    details?: any;
    resolution?: 'manual' | 'retry' | 'skip';
    timestamp: string;
}
export interface CRMSyncConflict {
    id: string;
    recordId: string;
    recordType: string;
    field: string;
    systemValue: any;
    crmValue: any;
    lastModifiedSystem?: string;
    lastModifiedCRM?: string;
    resolution?: 'use-system' | 'use-crm' | 'merge' | 'manual';
    resolvedBy?: string;
    resolvedAt?: string;
    createdAt: string;
}
export interface CreatePipelineProjectRequest {
    name: string;
    description?: string;
    clientName: string;
    clientContact?: {
        name: string;
        email: string;
        phone?: string;
        title?: string;
    };
    stage: PipelineStage;
    priority: PipelinePriority;
    probability: number;
    estimatedValue: number;
    estimatedStartDate: string;
    estimatedDuration: number;
    requiredSkills: string[];
    resourceDemand: Omit<ResourceDemand, 'id'>[];
    competitorInfo?: CompetitorInfo[];
    riskFactors: Omit<RiskFactor, 'id'>[];
    notes?: string;
    tags: string[];
}
export interface UpdatePipelineProjectRequest extends Partial<CreatePipelineProjectRequest> {
    id: string;
}
export interface CRMSyncRequest {
    crmSystemId: string;
    operation: 'sync' | 'import' | 'export' | 'sync_projects';
    direction?: 'bidirectional' | 'to_crm' | 'from_crm' | 'to-crm' | 'from-crm';
    filters?: {
        dateRange?: {
            start: string | Date;
            end: string | Date;
        };
        stages?: PipelineStage[];
        recordIds?: string[];
    };
    options?: {
        dryRun?: boolean;
        validateOnly?: boolean;
        overwriteConflicts?: boolean;
    };
}
export interface PipelineFilters {
    stage?: PipelineStage | PipelineStage[];
    priority?: PipelinePriority | PipelinePriority[];
    clientName?: string;
    probabilityMin?: number;
    probabilityMax?: number;
    valueMin?: number;
    valueMax?: number;
    startDateFrom?: string;
    startDateTo?: string;
    skills?: string[];
    tags?: string[];
    syncStatus?: 'synced' | 'pending' | 'failed' | 'conflict';
    search?: string;
}
export interface PipelineViewState {
    selectedProject?: PipelineProject;
    viewMode: 'list' | 'board' | 'timeline' | 'forecast';
    filters: PipelineFilters;
    sortBy: keyof PipelineProject;
    sortOrder: 'asc' | 'desc';
    groupBy?: 'stage' | 'priority' | 'client' | 'skills';
    isLoading: boolean;
    error?: string;
}
export interface ForecastViewState {
    timeRange: {
        start: string;
        end: string;
    };
    granularity: 'weekly' | 'monthly' | 'quarterly';
    metrics: ('value' | 'count' | 'resources' | 'capacity')[];
    groupBy: 'stage' | 'skills' | 'client' | 'time';
    confidence: 'all' | 'high' | 'medium';
    isLoading: boolean;
    error?: string;
}
export declare const PIPELINE_STAGE_COLORS: {
    readonly lead: "bg-gray-100 text-gray-800";
    readonly prospect: "bg-blue-100 text-blue-800";
    readonly opportunity: "bg-purple-100 text-purple-800";
    readonly proposal: "bg-orange-100 text-orange-800";
    readonly negotiation: "bg-yellow-100 text-yellow-800";
    readonly won: "bg-green-100 text-green-800";
    readonly lost: "bg-red-100 text-red-800";
    readonly 'on-hold': "bg-gray-200 text-gray-700";
};
export declare const PIPELINE_PRIORITY_COLORS: {
    readonly low: "bg-gray-100 text-gray-800";
    readonly medium: "bg-blue-100 text-blue-800";
    readonly high: "bg-orange-100 text-orange-800";
    readonly critical: "bg-red-100 text-red-800";
};
export declare const SYNC_STATUS_COLORS: {
    readonly synced: "bg-green-100 text-green-800";
    readonly pending: "bg-yellow-100 text-yellow-800";
    readonly failed: "bg-red-100 text-red-800";
    readonly conflict: "bg-orange-100 text-orange-800";
};
//# sourceMappingURL=pipeline.d.ts.map
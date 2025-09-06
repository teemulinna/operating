// Project Pipeline Integration Types for CRM Integration

export interface CRMSystemConfig {
  id: string;
  name: string;
  type: 'salesforce' | 'hubspot' | 'pipedrive' | 'dynamics' | 'custom';
  apiUrl: string;
  apiVersion?: string;
  authType: 'oauth' | 'api-key' | 'basic' | 'bearer';
  credentials: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  };
  syncSettings: CRMSyncSettings;
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CRMSyncSettings {
  autoSync: boolean;
  syncInterval: number; // minutes
  syncDirection: 'bidirectional' | 'crm-to-system' | 'system-to-crm';
  fieldMappings: CRMFieldMapping[];
  filters: CRMSyncFilters;
  conflictResolution: 'crm-wins' | 'system-wins' | 'manual' | 'timestamp';
}

export interface CRMFieldMapping {
  systemField: string;
  crmField: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  transform?: string; // JavaScript expression for data transformation
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

// Pipeline Management Types
export type PipelineStage = 
  | 'lead' | 'prospect' | 'opportunity' | 'proposal' 
  | 'negotiation' | 'won' | 'lost' | 'on-hold';

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
  probability: number; // 0-100 percentage
  estimatedValue: number;
  estimatedStartDate: string;
  estimatedDuration: number; // days
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
  // Calculated fields
  estimatedEndDate?: string;
  weightedValue?: number; // estimatedValue * probability / 100
  resourceCost?: number;
  availabilityScore?: number; // 0-100 based on resource availability
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
  alternatives?: string[]; // alternative skill categories
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
  probability: number; // 0-100
  impact: number; // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigationStrategy?: string;
}

// Pipeline Analytics
export interface PipelineAnalytics {
  totalValue: number;
  weightedValue: number;
  conversionRates: {
    stage: PipelineStage;
    count: number;
    conversionRate: number;
    avgDuration: number; // days in stage
  }[];
  forecastAccuracy: {
    period: string;
    predicted: number;
    actual: number;
    accuracy: number; // percentage
  }[];
  resourceDemandForecast: ResourceDemandForecast[];
  capacityUtilization: CapacityUtilization[];
  winLossAnalysis: WinLossAnalysis;
  trends: PipelineTrend[];
}

export interface ResourceDemandForecast {
  period: string; // YYYY-MM format
  skillCategory: string;
  experienceLevel: string;
  demandHours: number;
  supplyHours: number;
  gapHours: number;
  utilizationRate: number;
  hiringRecommendation: number;
  confidence: number; // 0-100
}

export interface CapacityUtilization {
  period: string;
  skillCategory: string;
  experienceLevel: string;
  totalCapacity: number;
  plannedUtilization: number;
  pipelineUtilization: number;
  availableCapacity: number;
  utilizationRate: number; // percentage
}

export interface WinLossAnalysis {
  totalOpportunities: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
  avgDealSize: number;
  avgSalesCycle: number; // days
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

// CRM Sync Operations
export interface CRMSyncOperation {
  id: string;
  crmSystemId: string;
  operation: 'sync' | 'import' | 'export' | 'validate';
  direction: 'bidirectional' | 'to-crm' | 'from-crm';
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
  duration?: number; // milliseconds
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

// API Request/Response Types
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
  operation: 'sync' | 'import' | 'export';
  direction?: 'bidirectional' | 'to-crm' | 'from-crm';
  filters?: {
    dateRange?: {
      start: string;
      end: string;
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

// UI State Types
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

// Color mappings for UI
export const PIPELINE_STAGE_COLORS = {
  lead: 'bg-gray-100 text-gray-800',
  prospect: 'bg-blue-100 text-blue-800',
  opportunity: 'bg-purple-100 text-purple-800',
  proposal: 'bg-orange-100 text-orange-800',
  negotiation: 'bg-yellow-100 text-yellow-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  'on-hold': 'bg-gray-200 text-gray-700',
} as const;

export const PIPELINE_PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
} as const;

export const SYNC_STATUS_COLORS = {
  synced: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  conflict: 'bg-orange-100 text-orange-800',
} as const;
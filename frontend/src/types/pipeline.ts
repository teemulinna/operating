// Frontend Pipeline Types (matching backend types)
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
  syncStatus: SyncStatus;
  // Calculated fields
  estimatedEndDate?: string;
  weightedValue?: number;
  resourceCost?: number;
  availabilityScore?: number;
}

export interface ResourceDemand {
  id: string;
  skillCategory: string;
  experienceLevel: ExperienceLevel;
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

export interface CRMSystemConfig {
  id: string;
  name: string;
  type: CRMSystemType;
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
  syncInterval: number;
  syncDirection: 'bidirectional' | 'crm-to-system' | 'system-to-crm';
  fieldMappings: CRMFieldMapping[];
  filters: CRMSyncFilters;
  conflictResolution: 'crm-wins' | 'system-wins' | 'manual' | 'timestamp';
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

export interface PipelineAnalytics {
  totalValue: number;
  weightedValue: number;
  conversionRates: ConversionRate[];
  forecastAccuracy: ForecastAccuracy[];
  resourceDemandForecast: ResourceDemandForecast[];
  capacityUtilization: CapacityUtilization[];
  winLossAnalysis: WinLossAnalysis;
  trends: PipelineTrend[];
}

export interface ConversionRate {
  stage: PipelineStage;
  count: number;
  conversionRate: number;
  avgDuration: number;
}

export interface ForecastAccuracy {
  period: string;
  predicted: number;
  actual: number;
  accuracy: number;
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

// Request/Response Types
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
  syncStatus?: SyncStatus;
  search?: string;
}

// Enums and Types
export type PipelineStage = 
  | 'lead' 
  | 'prospect' 
  | 'opportunity' 
  | 'proposal' 
  | 'negotiation' 
  | 'won' 
  | 'lost' 
  | 'on-hold';

export type PipelinePriority = 'low' | 'medium' | 'high' | 'critical';

export type ExperienceLevel = 'junior' | 'intermediate' | 'senior' | 'expert';

export type CRMSystemType = 'salesforce' | 'hubspot' | 'pipedrive' | 'dynamics' | 'custom';

export type SyncStatus = 'synced' | 'pending' | 'failed' | 'conflict';

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

// Color mappings for UI components
export const PIPELINE_STAGE_COLORS = {
  lead: 'bg-gray-100 text-gray-800 border-gray-200',
  prospect: 'bg-blue-100 text-blue-800 border-blue-200',
  opportunity: 'bg-purple-100 text-purple-800 border-purple-200',
  proposal: 'bg-orange-100 text-orange-800 border-orange-200',
  negotiation: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  won: 'bg-green-100 text-green-800 border-green-200',
  lost: 'bg-red-100 text-red-800 border-red-200',
  'on-hold': 'bg-gray-200 text-gray-700 border-gray-300',
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

export const EXPERIENCE_LEVEL_COLORS = {
  junior: 'bg-blue-100 text-blue-800',
  intermediate: 'bg-purple-100 text-purple-800',
  senior: 'bg-orange-100 text-orange-800',
  expert: 'bg-red-100 text-red-800',
} as const;

// Helper functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

export const calculateWeightedValue = (project: PipelineProject): number => {
  return (project.estimatedValue * project.probability) / 100;
};

export const getDaysUntilStart = (startDate: string): number => {
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = start.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getStageOrder = (stage: PipelineStage): number => {
  const order: Record<PipelineStage, number> = {
    lead: 1,
    prospect: 2,
    opportunity: 3,
    proposal: 4,
    negotiation: 5,
    won: 6,
    lost: 7,
    'on-hold': 8,
  };
  return order[stage] || 99;
};

export const getPriorityOrder = (priority: PipelinePriority): number => {
  const order: Record<PipelinePriority, number> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };
  return order[priority] || 99;
};

export const isProjectOverdue = (project: PipelineProject): boolean => {
  if (project.stage === 'won' || project.stage === 'lost') return false;
  const startDate = new Date(project.estimatedStartDate);
  const now = new Date();
  return startDate < now;
};

export const getProjectRiskScore = (project: PipelineProject): number => {
  if (!project.riskFactors || project.riskFactors.length === 0) return 0;
  
  const totalRisk = project.riskFactors.reduce((sum, risk) => {
    return sum + (risk.probability * risk.impact) / 100;
  }, 0);
  
  return Math.min(100, totalRisk);
};

export const getAvailabilityColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
};
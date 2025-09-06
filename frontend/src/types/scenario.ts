// Scenario Planning and Forecasting Types

export type ScenarioType = 'what-if' | 'forecast' | 'template';
export type ScenarioStatus = 'draft' | 'active' | 'archived';
export type AllocationType = 'tentative' | 'probable' | 'confirmed';
export type StaffingStatus = 'understaffed' | 'overstaffed' | 'balanced';
export type ReportType = 'dashboard' | 'chart' | 'table' | 'combined';
export type ExecutionStatus = 'success' | 'error' | 'timeout';

// Core Scenario Types
export interface Scenario {
  id: string;
  name: string;
  description?: string;
  type: ScenarioType;
  status: ScenarioStatus;
  baseDate: string; // ISO date
  forecastPeriodMonths: number;
  createdBy?: string;
  metadata: Record<string, any>;
  isTemplate: boolean;
  templateCategory?: string;
  createdAt: string;
  updatedAt: string;
  // Calculated fields from view
  totalAllocations?: number;
  confirmedAllocations?: number;
  probableAllocations?: number;
  tentativeAllocations?: number;
  totalEstimatedHours?: number;
  avgAllocationPercentage?: number;
}

export interface ScenarioAllocation {
  id: string;
  scenarioId: string;
  projectId: string;
  employeeId: string;
  roleId?: string;
  allocationType: AllocationType;
  allocationPercentage: number;
  startDate: string; // ISO date
  endDate?: string; // ISO date
  estimatedHours?: number;
  hourlyRate?: number;
  confidenceLevel: number; // 1-5 scale
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  project?: {
    id: string;
    name: string;
    clientName: string;
    status: string;
  };
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    avatar?: string;
  };
  role?: {
    id: string;
    roleName: string;
    requiredSkills: string[];
    minimumExperienceLevel: string;
  };
}

export interface ResourceDemandForecast {
  id: string;
  scenarioId: string;
  skillCategory: string;
  positionLevel: string;
  forecastDate: string; // ISO date
  demandHours: number;
  supplyHours: number;
  gapHours: number; // computed: demand - supply
  utilizationRate: number; // computed: percentage
  hiringRecommendation: number;
  staffingStatus: StaffingStatus;
  createdAt: string;
}

export interface ScenarioComparison {
  id: string;
  scenarioAId: string;
  scenarioBId: string;
  comparisonMetrics: {
    totalCost: {
      scenarioA: number;
      scenarioB: number;
      difference: number;
      percentageChange: number;
    };
    resourceUtilization: {
      scenarioA: number;
      scenarioB: number;
      difference: number;
    };
    projectCoverage: {
      scenarioA: number;
      scenarioB: number;
      difference: number;
    };
    riskScore: {
      scenarioA: number;
      scenarioB: number;
      difference: number;
    };
    skillGaps: {
      scenarioA: SkillGap[];
      scenarioB: SkillGap[];
      comparison: SkillGapComparison[];
    };
    timeline: {
      scenarioA: TimelineComparison;
      scenarioB: TimelineComparison;
      conflicts: TimelineConflict[];
    };
  };
  generatedAt: string;
  expiresAt: string;
}

export interface SkillGap {
  skillCategory: string;
  positionLevel: string;
  gapHours: number;
  hiringRecommendation: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SkillGapComparison {
  skillCategory: string;
  positionLevel: string;
  scenarioAGap: number;
  scenarioBGap: number;
  improvement: number;
  recommendation: string;
}

export interface TimelineComparison {
  totalProjects: number;
  averageProjectDuration: number;
  resourceConflicts: number;
  overallocationPeriods: number;
}

export interface TimelineConflict {
  employeeId: string;
  employeeName: string;
  conflictPeriod: {
    start: string;
    end: string;
  };
  totalAllocation: number;
  conflictingProjects: {
    projectId: string;
    projectName: string;
    allocation: number;
  }[];
}

// Custom Reports Types
export interface CustomReport {
  id: string;
  name: string;
  description?: string;
  reportType: ReportType;
  config: ReportConfig;
  schedule?: ReportSchedule;
  createdBy?: string;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportConfig {
  metrics: ReportMetric[];
  filters: ReportFilters;
  layout: ReportLayout;
  visualizations: ReportVisualization[];
  exportOptions: ExportOptions;
}

export interface ReportMetric {
  id: string;
  name: string;
  type: 'count' | 'sum' | 'average' | 'percentage' | 'ratio';
  source: 'projects' | 'employees' | 'scenarios' | 'allocations' | 'forecasts';
  field: string;
  aggregation?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  calculation?: string; // Custom formula
}

export interface ReportFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  projects?: string[];
  employees?: string[];
  scenarios?: string[];
  skills?: string[];
  departments?: string[];
  customFilters?: Record<string, any>;
}

export interface ReportLayout {
  type: 'grid' | 'flow' | 'dashboard';
  columns: number;
  sections: ReportSection[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'chart' | 'table' | 'kpi' | 'text';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: Record<string, any>;
}

export interface ReportVisualization {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'gantt' | 'table';
  title: string;
  metrics: string[]; // Reference to ReportMetric IDs
  config: {
    colors?: string[];
    axis?: {
      x: string;
      y: string;
    };
    legend?: boolean;
    interactive?: boolean;
    animations?: boolean;
  };
}

export interface ExportOptions {
  formats: ('pdf' | 'excel' | 'csv' | 'png' | 'svg')[];
  includeCharts: boolean;
  includeData: boolean;
  branding: {
    logo?: string;
    companyName: string;
    colors: {
      primary: string;
      secondary: string;
    };
  };
}

export interface ReportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time: string; // HH:MM format
  dayOfWeek?: number; // 0-6, for weekly
  dayOfMonth?: number; // 1-31, for monthly
  recipients: string[]; // Email addresses
  format: 'pdf' | 'excel';
}

export interface ReportExecution {
  id: string;
  reportId: string;
  executedBy?: string;
  executionTimeMs: number;
  status: ExecutionStatus;
  resultData?: any;
  errorMessage?: string;
  executedAt: string;
}

// Request/Response Types
export interface CreateScenarioRequest {
  name: string;
  description?: string;
  type: ScenarioType;
  baseDate: string;
  forecastPeriodMonths: number;
  metadata?: Record<string, any>;
  isTemplate?: boolean;
  templateCategory?: string;
}

export interface UpdateScenarioRequest extends Partial<CreateScenarioRequest> {
  id: string;
  status?: ScenarioStatus;
}

export interface CreateScenarioAllocationRequest {
  scenarioId: string;
  projectId: string;
  employeeId: string;
  roleId?: string;
  allocationType: AllocationType;
  allocationPercentage: number;
  startDate: string;
  endDate?: string;
  estimatedHours?: number;
  hourlyRate?: number;
  confidenceLevel: number;
  notes?: string;
}

export interface UpdateScenarioAllocationRequest extends Partial<Omit<CreateScenarioAllocationRequest, 'scenarioId'>> {
  id: string;
}

export interface CreateCustomReportRequest {
  name: string;
  description?: string;
  reportType: ReportType;
  config: ReportConfig;
  schedule?: ReportSchedule;
  isPublic?: boolean;
  tags?: string[];
}

export interface UpdateCustomReportRequest extends Partial<CreateCustomReportRequest> {
  id: string;
}

// Analytics and Forecasting Types
export interface ResourceAnalytics {
  utilizationTrends: UtilizationTrend[];
  capacityForecast: CapacityForecast[];
  skillDemandAnalysis: SkillDemandAnalysis[];
  hiringRecommendations: HiringRecommendation[];
  costAnalysis: CostAnalysis;
  riskAssessment: RiskAssessment;
}

export interface UtilizationTrend {
  date: string;
  averageUtilization: number;
  maxUtilization: number;
  minUtilization: number;
  employeeCount: number;
  totalCapacityHours: number;
  totalDemandHours: number;
}

export interface CapacityForecast {
  date: string;
  skillCategory: string;
  positionLevel: string;
  currentCapacity: number;
  projectedDemand: number;
  gap: number;
  confidence: number; // 0-1
  assumptions: string[];
}

export interface SkillDemandAnalysis {
  skillCategory: string;
  positionLevel: string;
  currentDemand: number;
  projectedDemand: number;
  growthRate: number; // percentage
  marketTrend: 'increasing' | 'stable' | 'decreasing';
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

export interface HiringRecommendation {
  skillCategory: string;
  positionLevel: string;
  recommendedHires: number;
  urgency: 'immediate' | 'within-month' | 'within-quarter' | 'planned';
  estimatedCost: number;
  timeToFill: number; // days
  alternatives: string[];
  justification: string;
}

export interface CostAnalysis {
  totalProjectedCost: number;
  costByCategory: {
    category: string;
    cost: number;
    percentage: number;
  }[];
  costTrends: {
    date: string;
    cost: number;
    breakdown: Record<string, number>;
  }[];
  savings: {
    potential: number;
    realized: number;
    opportunities: string[];
  };
}

export interface RiskAssessment {
  overallRiskScore: number; // 0-100
  riskFactors: RiskFactor[];
  mitigationStrategies: MitigationStrategy[];
}

export interface RiskFactor {
  category: 'resource' | 'timeline' | 'budget' | 'skill' | 'external';
  description: string;
  probability: number; // 0-1
  impact: number; // 0-1
  riskScore: number; // probability * impact
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MitigationStrategy {
  riskCategory: string;
  strategy: string;
  cost: number;
  timeToImplement: number; // days
  effectiveness: number; // 0-1
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// UI State Types
export interface ScenarioPlannerState {
  selectedScenario?: Scenario;
  comparisonScenario?: Scenario;
  allocations: ScenarioAllocation[];
  viewMode: 'timeline' | 'grid' | 'gantt';
  timeRange: {
    start: string;
    end: string;
  };
  filters: {
    projects?: string[];
    employees?: string[];
    allocationType?: AllocationType[];
    skillCategories?: string[];
  };
  isLoading: boolean;
  error?: string;
}

export interface ForecastingDashboardState {
  selectedTimeRange: {
    start: string;
    end: string;
  };
  selectedMetrics: string[];
  selectedScenarios: string[];
  chartType: 'line' | 'bar' | 'area' | 'stacked';
  granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  isLoading: boolean;
  error?: string;
}

// Color mappings for UI
export const SCENARIO_TYPE_COLORS = {
  'what-if': 'bg-blue-100 text-blue-800',
  'forecast': 'bg-green-100 text-green-800',
  'template': 'bg-purple-100 text-purple-800',
} as const;

export const SCENARIO_STATUS_COLORS = {
  'draft': 'bg-gray-100 text-gray-800',
  'active': 'bg-green-100 text-green-800',
  'archived': 'bg-yellow-100 text-yellow-800',
} as const;

export const ALLOCATION_TYPE_COLORS = {
  'tentative': 'bg-yellow-100 text-yellow-800',
  'probable': 'bg-blue-100 text-blue-800',
  'confirmed': 'bg-green-100 text-green-800',
} as const;

export const STAFFING_STATUS_COLORS = {
  'understaffed': 'bg-red-100 text-red-800',
  'overstaffed': 'bg-orange-100 text-orange-800',
  'balanced': 'bg-green-100 text-green-800',
} as const;
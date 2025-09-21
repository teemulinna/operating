import { apiClient } from '../api';
import type { ApiError } from '@/types/employee';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ForecastingRequest {
  timeHorizon?: number;
  skills?: string[];
  aggregation?: 'daily' | 'weekly' | 'monthly';
  includePatterns?: boolean;
}

export interface ForecastingResponse {
  success: boolean;
  data: {
    totalCapacity: Array<{
      timestamp: string;
      value: number;
      metadata?: Record<string, any>;
    }>;
    availableCapacity: Array<{
      timestamp: string;
      value: number;
      metadata?: Record<string, any>;
    }>;
    utilizationRate: Array<{
      timestamp: string;
      value: number;
      metadata?: Record<string, any>;
    }>;
    skillCapacity: Record<string, Array<{
      timestamp: string;
      value: number;
      metadata?: Record<string, any>;
    }>>;
    skillDemand: Record<string, Array<{
      timestamp: string;
      value: number;
      metadata?: Record<string, any>;
    }>>;
    forecast: {
      timeHorizon: number;
      aggregation: string;
      startDate: string;
      endDate: string;
    };
    patterns?: Array<{
      id: string;
      type: string;
      description: string;
      strength: number;
      occurrences: Array<{
        timestamp: string;
        value: number;
      }>;
    }>;
  };
  metadata: {
    generatedAt: string;
    dataPoints: number;
    skills: number;
  };
}

export interface SkillMatchRequest {
  requiredSkills: Array<{
    skillId: string;
    skillName: string;
    minimumProficiency: number;
    weight: number;
    isRequired: boolean;
  }>;
  projectId?: string;
  roleTitle?: string;
  experienceLevel?: 'junior' | 'mid' | 'senior' | 'lead';
  availabilityHours?: number;
  startDate?: string;
  endDate?: string;
  minimumMatchScore?: number;
  maxResults?: number;
  departmentIds?: string[];
  excludeEmployeeIds?: string[];
  availabilityThreshold?: number;
  includeBenchWarming?: boolean;
}

export interface SkillMatchResponse {
  success: boolean;
  message: string;
  data: {
    matches: Array<{
      employeeId: string;
      firstName: string;
      lastName: string;
      position: string;
      departmentId: string;
      overallMatchScore: number;
      skillMatches: Array<{
        skillId: string;
        skillName: string;
        requiredLevel: number;
        actualLevel: number;
        matchScore: number;
        confidence: number;
      }>;
      availabilityScore: number;
      experienceMatch: number;
      overallRecommendation: 'excellent' | 'good' | 'fair' | 'poor';
      strengths: string[];
      concerns: string[];
      additionalTraining?: string[];
    }>;
    summary: {
      totalCandidates: number;
      averageMatchScore: number;
      excellentMatches: number;
      goodMatches: number;
    };
  };
}

export interface OptimizationRequest {
  projects: Array<{
    id: string;
    priority: number;
    name?: string;
    startDate?: string;
    endDate?: string;
    teamSize?: number;
    budget?: number;
    probability?: number;
  }>;
  resources?: Array<{
    employeeId: string;
    availability: number;
    skills: string[];
    hourlyRate?: number;
  }>;
  constraints?: Array<{
    type: string;
    parameters: Record<string, any>;
  }>;
  objectives?: Array<{
    type: 'maximize_utilization' | 'minimize_cost' | 'minimize_conflicts';
    weight: number;
    priority: number;
  }>;
  timeHorizon: {
    startDate: string;
    endDate: string;
  };
  options?: Record<string, any>;
}

export interface OptimizationResponse {
  success: boolean;
  data: {
    recommendations: Array<{
      employeeId: string;
      projectId: string;
      allocation: number;
      startDate: string;
      endDate: string;
      confidence: number;
      reasoning: string[];
    }>;
    metrics: {
      totalUtilization: number;
      costEfficiency: number;
      skillMatchAccuracy: number;
      conflictCount: number;
    };
    alternatives: Array<{
      name: string;
      impact: {
        cost: number;
        efficiency: number;
        risk: number;
      };
      effort: string;
      timeline: string;
    }>;
    warnings: string[];
    optimizationScore: number;
  };
  message: string;
}

export interface ScenarioRequest {
  name: string;
  description?: string;
  timeHorizon: number;
  projects: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    teamSize: number;
    budget: number;
    probability: number;
  }>;
  constraints?: Array<{
    type: string;
    parameters: Record<string, any>;
  }>;
}

export interface InsightRequest {
  category?: 'efficiency' | 'utilization' | 'planning' | 'risk';
  timeRange?: number;
  minImpact?: 'low' | 'medium' | 'high' | 'critical';
}

export interface InsightResponse {
  success: boolean;
  data: {
    insights: Array<{
      id: string;
      category: string;
      title: string;
      description: string;
      impact: 'low' | 'medium' | 'high' | 'critical';
      actionItems: string[];
      estimatedSavings?: number;
      timeToImplement?: string;
      confidence: number;
    }>;
    patterns: Array<{
      id: string;
      type: string;
      description: string;
      strength: number;
      occurrences: number;
    }>;
    recommendations: Array<{
      id: string;
      type: string;
      description: string;
      priority: number;
      impact: {
        cost?: number;
        efficiency?: number;
        risk?: number;
      };
      actionItems: string[];
    }>;
    summary: {
      totalInsights: number;
      filteredInsights: number;
      byCategory: Record<string, number>;
      byImpact: Record<string, number>;
    };
  };
  metadata: {
    generatedAt: string;
    timeRange: {
      start: string;
      end: string;
      days: number;
    };
    filters: Record<string, any>;
  };
}

// ============================================================================
// AI SERVICE CLASS
// ============================================================================

export class AIService {
  /**
   * Get capacity forecasting data - maps to scenarios/forecasting/demand
   */
  static async getForecasting(params: ForecastingRequest = {}): Promise<ForecastingResponse> {
    try {
      // Try working scenario forecasting endpoint first
      const queryParams = new URLSearchParams();
      
      if (params.timeHorizon) queryParams.append('timeHorizon', params.timeHorizon.toString());
      if (params.skills && params.skills.length > 0) queryParams.append('skills', params.skills.join(','));
      if (params.aggregation) queryParams.append('aggregation', params.aggregation);
      if (params.includePatterns !== undefined) queryParams.append('includePatterns', params.includePatterns.toString());

      const response = await apiClient.get<any>(`/scenarios/forecasting/demand?${queryParams.toString()}`);
      
      // Return the response directly
      return response.data;
    } catch (error) {
      console.error('Forecasting endpoint failed:', error);
      throw new Error(`Failed to fetch forecasting data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get demand forecasting data - maps to ml-optimization/forecasting/demand-forecast
   */
  static async getDemandForecast(params: {
    skills?: string[];
    timeRange?: 'week' | 'month' | 'quarter' | 'year';
    projects?: string[];
    includeHistorical?: boolean;
  } = {}): Promise<any> {
    try {
      // Map to ML optimization demand forecast endpoint
      const requestData = {
        timeHorizon: params.timeRange === 'week' ? 'weekly' : 
                    params.timeRange === 'month' ? 'monthly' : 
                    params.timeRange === 'quarter' ? 'quarterly' : 'yearly',
        options: {
          includeSeasonality: true,
          includeTrends: true,
          confidenceLevel: 0.9,
          skillCategories: params.skills,
          departments: []
        }
      };
      
      const response = await apiClient.post('/ml-optimization/forecasting/demand-forecast', requestData);
      return response.data;
    } catch (error) {
      console.error('Demand forecast endpoint failed:', error);
      throw new Error(`Failed to fetch demand forecast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create and run a forecasting scenario - maps to scenarios
   */
  static async createScenario(scenario: ScenarioRequest): Promise<any> {
    try {
      const response = await apiClient.post('/scenarios', scenario);
      return response.data;
    } catch (error) {
      console.error('Scenario creation endpoint failed:', error);
      throw new Error(`Failed to create scenario: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get scenario analysis results - maps to scenarios/:id
   */
  static async getScenario(id: string): Promise<any> {
    try {
      const response = await apiClient.get(`/scenarios/${id}`);
      return response.data;
    } catch (error) {
      console.error('Scenario retrieval endpoint not available, using fallback data:', error);
      throw new Error(`Failed to retrieve scenario: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Train pattern recognition models
   */
  static async trainPatterns(params: {
    timeRange?: number;
    includeAnomalyDetection?: boolean;
  } = {}): Promise<any> {
    const response = await apiClient.post('/forecasting/patterns/train', params);
    return response.data;
  }

  /**
   * Get capacity insights and recommendations - maps to ml-optimization/analytics/insights
   */
  static async getInsights(params: InsightRequest = {}): Promise<InsightResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.timeRange) {
        const timeRangeMap: Record<string, string> = {
          '7': 'week',
          '30': 'month', 
          '90': 'quarter',
          '365': 'year'
        };
        queryParams.append('timeRange', timeRangeMap[params.timeRange.toString()] || 'month');
      }

      const response = await apiClient.get<any>(`/ml-optimization/analytics/insights?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Insights endpoint not available, using fallback data:', error);
      throw new Error(`Failed to fetch insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find resources based on skill requirements - maps to matching/skill-match
   */
  static async findSkillMatches(request: SkillMatchRequest): Promise<SkillMatchResponse> {
    try {
      const response = await apiClient.post<SkillMatchResponse>('/matching/skill-match', request);
      return response.data;
    } catch (error) {
      console.error('Skill matching endpoint failed:', error);
      throw new Error(`Failed to find skill matches: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate resource recommendations
   */
  static async generateRecommendations(request: {
    projectId?: string;
    roleRequirements: Array<{
      roleTitle: string;
      skillRequirements: Array<{
        skillId: string;
        minimumLevel: number;
        weight?: number;
      }>;
      count: number;
    }>;
    projectConstraints?: {
      startDate?: string;
      endDate?: string;
      totalBudget?: number;
      maxTeamSize?: number;
      minTeamSize?: number;
    };
    preferences?: Record<string, any>;
    maxRecommendations?: number;
    minConfidence?: number;
    includeAlternatives?: boolean;
    detailedAnalysis?: boolean;
  }): Promise<any> {
    const response = await apiClient.post('/matching/recommend', request);
    return response.data;
  }

  /**
   * Get match score for specific employee
   */
  static async getEmployeeMatchScore(employeeId: string, criteria: Omit<SkillMatchRequest, 'maxResults'>): Promise<any> {
    const response = await apiClient.get(`/matching/score/${employeeId}`, {
      data: criteria
    });
    return response.data;
  }

  /**
   * Analyze team chemistry
   */
  static async analyzeTeam(team: {
    members: Array<{
      employeeId: string;
      firstName: string;
      lastName: string;
      position: string;
      departmentId: string;
      skills: Array<{
        skillId: string;
        level: number;
      }>;
    }>;
    projectId?: string;
    roleRequirements?: Array<{
      roleTitle: string;
      count: number;
      skills: string[];
    }>;
  }): Promise<any> {
    const response = await apiClient.post('/matching/analyze-team', team);
    return response.data;
  }

  /**
   * Get team optimization suggestions
   */
  static async optimizeTeam(team: {
    members: Array<{
      employeeId: string;
      firstName: string;
      lastName: string;
      position: string;
      departmentId: string;
      skills: Array<{
        skillId: string;
        level: number;
      }>;
    }>;
    projectId?: string;
    roleRequirements?: Array<{
      roleTitle: string;
      count: number;
      skills: string[];
    }>;
  }): Promise<any> {
    const response = await apiClient.post('/matching/optimize-team', team);
    return response.data;
  }

  /**
   * Get matching statistics
   */
  static async getMatchingStatistics(criteria: SkillMatchRequest, projectId?: string): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('criteria', JSON.stringify(criteria));
    if (projectId) queryParams.append('projectId', projectId);

    const response = await apiClient.get(`/matching/statistics?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Identify skill gaps
   */
  static async getSkillGaps(params: {
    departmentId?: string;
    projectType?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.departmentId) queryParams.append('departmentId', params.departmentId);
    if (params.projectType) queryParams.append('projectType', params.projectType);

    const response = await apiClient.get(`/matching/skills/gaps?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Calculate match scores for multiple employees
   */
  static async bulkMatchScore(criteria: SkillMatchRequest, employeeIds: string[]): Promise<any> {
    const request = {
      ...criteria,
      employeeIds
    };
    const response = await apiClient.post('/matching/bulk-score', request);
    return response.data;
  }

  /**
   * Balance resources across projects - maps to optimization/balance
   */
  static async balanceResources(request: OptimizationRequest): Promise<OptimizationResponse> {
    try {
      const response = await apiClient.post<OptimizationResponse>('/optimization/balance', request);
      return response.data;
    } catch (error) {
      console.error('Resource balancing endpoint not available, using fallback data:', error);
      throw new Error(`Failed to balance resources: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Level resources to minimize peaks and valleys
   */
  static async levelResources(projectIds: string[], options: {
    priorityWeights?: Record<string, number>;
    allowableDelay?: number;
    resourceSmoothing?: boolean;
  } = {}): Promise<any> {
    const request = { projectIds, options };
    const response = await apiClient.post('/optimization/level-resources', request);
    return response.data;
  }

  /**
   * Optimize resource allocation for cost efficiency
   */
  static async optimizeCosts(projectIds: string[], budgetConstraints: Array<{
    maxBudget: number;
    type: 'hard' | 'soft';
    timeframe: {
      startDate: string;
      endDate: string;
    };
  }>, options: Record<string, any> = {}): Promise<any> {
    const request = { projectIds, budgetConstraints, options };
    const response = await apiClient.post('/optimization/optimize-costs', request);
    return response.data;
  }

  /**
   * Detect and resolve resource conflicts
   */
  static async resolveConflicts(timeRange: {
    startDate: string;
    endDate: string;
  }, conflictTypes?: string[], resolutionStrategy?: 'automatic' | 'manual' | 'hybrid'): Promise<any> {
    const request = {
      timeRange,
      conflictTypes,
      resolutionStrategy
    };
    const response = await apiClient.post('/optimization/resolve-conflicts', request);
    return response.data;
  }

  /**
   * Get optimization suggestions - maps to optimization/suggestions
   */
  static async getOptimizationSuggestions(params: {
    projectIds?: string[];
    timeRange?: '7days' | '30days' | '90days';
    focus?: 'cost' | 'utilization' | 'quality' | 'timeline';
  } = {}): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      if (params.projectIds && params.projectIds.length > 0) {
        queryParams.append('projectIds', params.projectIds.join(','));
      }
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);
      if (params.focus) queryParams.append('focus', params.focus);

      const response = await apiClient.get(`/optimization/suggestions?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Optimization suggestions endpoint not available, using fallback data:', error);
      throw new Error(`Failed to get optimization suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Solve resource allocation using constraint satisfaction
   */
  static async solveConstraints(input: {
    employees: Array<{
      id: string;
      skills: string[];
      availability: number;
      hourlyRate?: number;
    }>;
    projects: Array<{
      id: string;
      requiredSkills: string[];
      timeline: {
        startDate: string;
        endDate: string;
      };
      budget?: number;
      priority: number;
    }>;
    timeWindows: Array<{
      startDate: string;
      endDate: string;
      label?: string;
    }>;
    constraints?: Array<{
      type: string;
      parameters: Record<string, any>;
    }>;
    preferences?: Array<{
      type: string;
      weight: number;
      parameters: Record<string, any>;
    }>;
  }): Promise<any> {
    const response = await apiClient.post('/optimization/constraint-solve', input);
    return response.data;
  }

  /**
   * Get detailed optimization analysis for a specific project
   */
  static async getProjectOptimizationAnalysis(projectId: string, options: {
    includeAlternatives?: boolean;
    includeRiskAnalysis?: boolean;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (options.includeAlternatives !== undefined) {
      queryParams.append('includeAlternatives', options.includeAlternatives.toString());
    }
    if (options.includeRiskAnalysis !== undefined) {
      queryParams.append('includeRiskAnalysis', options.includeRiskAnalysis.toString());
    }

    const response = await apiClient.get(`/optimization/analysis/${projectId}?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Simulate optimization scenarios
   */
  static async simulateScenario(scenario: {
    name: string;
    changes: Array<{
      type: string;
      parameters: Record<string, any>;
    }>;
  }, baselineProjectIds?: string[], options: Record<string, any> = {}): Promise<any> {
    const request = {
      scenario,
      baselineProjectIds,
      options
    };
    const response = await apiClient.post('/optimization/simulate-scenario', request);
    return response.data;
  }

  /**
   * Get optimization metrics and KPIs
   */
  static async getOptimizationMetrics(params: {
    timeRange?: '7days' | '30days' | '90days';
    groupBy?: 'project' | 'employee' | 'department' | 'skill';
    includeHistorical?: boolean;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.timeRange) queryParams.append('timeRange', params.timeRange);
    if (params.groupBy) queryParams.append('groupBy', params.groupBy);
    if (params.includeHistorical !== undefined) {
      queryParams.append('includeHistorical', params.includeHistorical.toString());
    }

    const response = await apiClient.get(`/optimization/metrics?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Generate resource recommendations using ML
   */
  static async generateMLRecommendations(params: {
    projectId: number;
    roleId: string;
    requiredSkills: string[];
    experienceLevel: 'junior' | 'intermediate' | 'senior' | 'expert';
    maxCandidates?: number;
  }): Promise<any> {
    const response = await apiClient.post('/ml-optimization/recommendations/find-matches', params);
    return response.data;
  }

  /**
   * Advanced skill-based matching with ML
   */
  static async advancedSkillMatching(params: {
    criteria: {
      projectId: number;
      requiredSkills: Array<{
        skillId: string;
        minimumLevel: number;
        weight?: number;
        mandatory?: boolean;
      }>;
      experienceLevel: 'junior' | 'intermediate' | 'senior' | 'expert';
      startDate: string;
      endDate?: string;
      projectDuration?: number;
    };
    options?: {
      maxResults?: number;
      includePartialMatches?: boolean;
      considerTraining?: boolean;
    };
  }): Promise<any> {
    const response = await apiClient.post('/ml-optimization/recommendations/skill-matching', params);
    return response.data;
  }

  /**
   * Generate demand forecast using ML
   */
  static async generateDemandForecast(params: {
    timeHorizon: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    options?: {
      includeSeasonality?: boolean;
      includeTrends?: boolean;
      confidenceLevel?: number;
      skillCategories?: string[];
      departments?: string[];
    };
  }): Promise<any> {
    const response = await apiClient.post('/ml-optimization/forecasting/demand-forecast', params);
    return response.data;
  }

  /**
   * Run resource allocation optimization using ML
   */
  static async optimizeAllocationML(params: {
    scope?: {
      projectIds?: string[];
      employeeIds?: string[];
      timeRange?: {
        startDate: string;
        endDate: string;
      };
    };
    config?: {
      objectives?: {
        maximizeUtilization?: number;
        minimizeConflicts?: number;
      };
      algorithm?: 'genetic' | 'simulated_annealing' | 'constraint_satisfaction' | 'hybrid';
    };
  } = {}): Promise<any> {
    const response = await apiClient.post('/ml-optimization/optimization/optimize-allocation', params);
    return response.data;
  }

  /**
   * Get ML-driven insights and recommendations
   */
  static async getMLInsights(params: {
    timeRange?: 'week' | 'month' | 'quarter' | 'year';
    departments?: string[];
    skillCategories?: string[];
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.timeRange) queryParams.append('timeRange', params.timeRange);
    if (params.departments) queryParams.append('departments', params.departments.join(','));
    if (params.skillCategories) queryParams.append('skillCategories', params.skillCategories.join(','));

    const response = await apiClient.get(`/ml-optimization/analytics/insights?${queryParams.toString()}`);
    return response.data;
  }
}

export default AIService;
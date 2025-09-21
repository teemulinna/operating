export interface ForecastingResponse<T = any> {
  success: boolean;
  data: T;
  metadata?: {
    generatedAt: Date;
    [key: string]: any;
  };
  message?: string;
  error?: string;
}

export interface CapacityForecast {
  totalCapacity: Array<{
    timestamp: Date;
    value: number;
    metadata?: Record<string, any>;
  }>;
  availableCapacity: Array<{
    timestamp: Date;
    value: number;
    metadata?: Record<string, any>;
  }>;
  utilizationRate: Array<{
    timestamp: Date;
    value: number;
    metadata?: Record<string, any>;
  }>;
  skillCapacity: Record<string, Array<{
    timestamp: Date;
    value: number;
    metadata?: Record<string, any>;
  }>>;
  skillDemand: Record<string, Array<{
    timestamp: Date;
    value: number;
    metadata?: Record<string, any>;
  }>>;
  forecast: {
    timeHorizon: number;
    aggregation: string;
    startDate: Date;
    endDate: Date;
    predictions?: number[];
    confidence?: number[];
  };
  patterns?: Array<{
    id: string;
    type: string;
    strength: number;
    description: string;
    occurrences: Array<{
      startDate: Date;
      endDate: Date;
      confidence: number;
    }>;
  }>;
}

export interface DemandForecast {
  demandBySkill: Record<string, Array<{
    timestamp: Date;
    value: number;
    metadata?: Record<string, any>;
  }>>;
  historicalDemand?: Record<string, Array<{
    timestamp: Date;
    value: number;
    metadata?: Record<string, any>;
  }>>;
  trends: Record<string, {
    trend: 'increasing' | 'decreasing' | 'stable';
    strength: number;
    currentDemand: number;
    avgDemand: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
    period: string;
    days: number;
  };
}

export interface ScenarioAnalysis {
  scenarioId: string;
  name: string;
  description: string;
  timeHorizon: number;
  analysis: {
    patterns: Array<{
      id: string;
      type: string;
      strength: number;
      description: string;
      occurrences: number;
    }>;
    insights: Array<{
      id: string;
      category: string;
      title: string;
      description: string;
      impact: 'low' | 'medium' | 'high' | 'critical';
      confidence: number;
      recommendations: Array<{
        action: string;
        priority: 'low' | 'medium' | 'high';
        effort: 'low' | 'medium' | 'high';
        impact: string;
      }>;
    }>;
    recommendations: Array<{
      priority: 'low' | 'medium' | 'high' | 'critical';
      category: string;
      recommendation: string;
      rationale: string;
      estimatedImpact: string;
    }>;
  };
  projects: number;
  constraints: number;
}

export interface CapacityInsight {
  insights: Array<{
    id: string;
    category: 'efficiency' | 'utilization' | 'planning' | 'risk';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    recommendations: Array<{
      action: string;
      priority: 'low' | 'medium' | 'high';
      effort: 'low' | 'medium' | 'high';
      impact: string;
    }>;
  }>;
  patterns: Array<{
    id: string;
    type: string;
    description: string;
    strength: number;
    occurrences: number;
  }>;
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    recommendation: string;
    rationale: string;
    estimatedImpact: string;
  }>;
  summary: {
    totalInsights: number;
    filteredInsights: number;
    byCategory: Record<string, number>;
    byImpact: Record<string, number>;
  };
}

export interface ModelTrainingResult {
  training: {
    dataPoints: number;
    timeRange: {
      start: Date;
      end: Date;
      days: number;
    };
    modelsUpdated: string[];
  };
  validation: {
    patternsDetected: number;
    patternTypes: string[];
    averageConfidence: number;
  };
}

/**
 * Service for interacting with the AI-powered capacity forecasting API
 */
class ForecastingService {
  private baseUrl = '/api/forecasting';

  /**
   * Get capacity forecasting data
   */
  async getCapacityForecast(params: {
    timeHorizon?: number;
    skills?: string[];
    aggregation?: 'daily' | 'weekly' | 'monthly';
    includePatterns?: boolean;
  } = {}): Promise<ForecastingResponse<CapacityForecast>> {
    const searchParams = new URLSearchParams();
    
    if (params.timeHorizon) searchParams.set('timeHorizon', params.timeHorizon.toString());
    if (params.skills && params.skills.length > 0) searchParams.set('skills', params.skills.join(','));
    if (params.aggregation) searchParams.set('aggregation', params.aggregation);
    if (params.includePatterns) searchParams.set('includePatterns', 'true');

    const response = await fetch(`${this.baseUrl}/capacity?${searchParams}`);
    return this.handleResponse(response);
  }

  /**
   * Get demand forecasting data
   */
  async getDemandForecast(params: {
    skills?: string[];
    timeRange?: 'week' | 'month' | 'quarter' | 'year';
    projects?: string[];
    includeHistorical?: boolean;
  } = {}): Promise<ForecastingResponse<DemandForecast>> {
    const searchParams = new URLSearchParams();
    
    if (params.skills && params.skills.length > 0) searchParams.set('skills', params.skills.join(','));
    if (params.timeRange) searchParams.set('timeRange', params.timeRange);
    if (params.projects && params.projects.length > 0) searchParams.set('projects', params.projects.join(','));
    if (params.includeHistorical) searchParams.set('includeHistorical', 'true');

    const response = await fetch(`${this.baseUrl}/demand?${searchParams}`);
    return this.handleResponse(response);
  }

  /**
   * Create and analyze a forecasting scenario
   */
  async createScenario(scenario: {
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
      type: 'resource_limit' | 'budget_limit' | 'timeline' | 'skill_availability';
      parameters: Record<string, any>;
      severity: 'warning' | 'error';
    }>;
  }): Promise<ForecastingResponse<ScenarioAnalysis>> {
    const response = await fetch(`${this.baseUrl}/scenario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scenario),
    });

    return this.handleResponse(response);
  }

  /**
   * Get existing scenario analysis
   */
  async getScenario(scenarioId: string): Promise<ForecastingResponse<{
    scenario: {
      id: number;
      name: string;
      description: string;
      timeHorizon: number;
      projects: any[];
      constraints: any[];
      createdAt: Date;
      updatedAt: Date;
    };
    analysis: {
      patterns: any[];
      insights: any[];
      recommendations: any[];
    };
  }>> {
    const response = await fetch(`${this.baseUrl}/scenario/${scenarioId}`);
    return this.handleResponse(response);
  }

  /**
   * Get capacity insights and recommendations
   */
  async getCapacityInsights(params: {
    category?: 'efficiency' | 'utilization' | 'planning' | 'risk';
    timeRange?: number;
    minImpact?: 'low' | 'medium' | 'high' | 'critical';
  } = {}): Promise<ForecastingResponse<CapacityInsight>> {
    const searchParams = new URLSearchParams();
    
    if (params.category) searchParams.set('category', params.category);
    if (params.timeRange) searchParams.set('timeRange', params.timeRange.toString());
    if (params.minImpact) searchParams.set('minImpact', params.minImpact);

    const response = await fetch(`${this.baseUrl}/insights?${searchParams}`);
    return this.handleResponse(response);
  }

  /**
   * Train pattern recognition models
   */
  async trainModels(params: {
    timeRange?: number;
    includeAnomalyDetection?: boolean;
  } = {}): Promise<ForecastingResponse<ModelTrainingResult>> {
    const response = await fetch(`${this.baseUrl}/patterns/train`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    return this.handleResponse(response);
  }

  /**
   * Get historical capacity trends
   */
  async getHistoricalTrends(params: {
    timeRange: { start: Date; end: Date };
    skills?: string[];
    aggregation?: 'daily' | 'weekly' | 'monthly';
  }): Promise<{
    totalCapacity: Array<{ timestamp: Date; value: number }>;
    availableCapacity: Array<{ timestamp: Date; value: number }>;
    utilizationRate: Array<{ timestamp: Date; value: number }>;
    bySkill: Record<string, Array<{ timestamp: Date; value: number }>>;
  }> {
    // This would be implemented as a separate endpoint
    // For now, using capacity forecast endpoint
    const response = await this.getCapacityForecast({
      timeHorizon: Math.ceil((params.timeRange.end.getTime() - params.timeRange.start.getTime()) / (1000 * 60 * 60 * 24)),
      skills: params.skills,
      aggregation: params.aggregation
    });

    if (response.success && response.data) {
      return {
        totalCapacity: response.data.totalCapacity,
        availableCapacity: response.data.availableCapacity,
        utilizationRate: response.data.utilizationRate,
        bySkill: response.data.skillCapacity
      };
    }

    throw new Error('Failed to load historical trends');
  }

  /**
   * Predict future pattern occurrences
   */
  async predictPatternOccurrences(
    patternId: string,
    forecastHorizon: number
  ): Promise<Array<{ date: Date; probability: number; confidence: number }>> {
    const response = await fetch(`${this.baseUrl}/patterns/${patternId}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ forecastHorizon }),
    });
    
    if (!response.ok) {
      throw new Error(`Pattern prediction API failed: ${response.status}`);
    }
    
    const data = await response.json();
    return this.transformDates(data.predictions || []);
  }

  /**
   * Compare multiple scenarios
   */
  async compareScenarios(
    scenarioIds: string[],
    metrics: string[] = ['cost', 'timeline', 'risk', 'utilization']
  ): Promise<{
    scenarios: ScenarioAnalysis[];
    comparison: Record<string, any>;
    recommendations: string[];
  }> {
    // This would be implemented as a separate endpoint
    // For now, getting individual scenarios and comparing client-side
    const scenarios = await Promise.all(
      scenarioIds.map(id => this.getScenario(id))
    );

    const validScenarios = scenarios
      .filter(s => s.success)
      .map(s => s.data);

    // Simple comparison logic
    const comparison = {
      cost: validScenarios.map(s => ({
        scenarioId: s.scenario.id,
        totalCost: s.scenario.projects.reduce((sum: number, p: any) => sum + (p.budget || 0), 0),
        budgetVariance: 0
      })),
      timeline: validScenarios.map(s => ({
        scenarioId: s.scenario.id,
        avgDelay: 0,
        criticalPathProjects: 0
      })),
      risk: validScenarios.map(s => ({
        scenarioId: s.scenario.id,
        overallRisk: 'medium',
        successProbability: 0.8
      })),
      utilization: validScenarios.map(s => ({
        scenarioId: s.scenario.id,
        avgUtilization: 0.75,
        peakUtilization: 0.95,
        overallocationDays: 0
      }))
    };

    const recommendations = [
      'Consider scenario with lowest risk profile',
      'Balance cost optimization with timeline requirements',
      'Monitor resource utilization closely in peak periods'
    ];

    return {
      scenarios: validScenarios.map(s => ({
        scenarioId: s.scenario.id.toString(),
        name: s.scenario.name,
        description: s.scenario.description,
        timeHorizon: s.scenario.timeHorizon,
        analysis: s.analysis,
        projects: s.scenario.projects.length,
        constraints: s.scenario.constraints.length
      })),
      comparison,
      recommendations
    };
  }

  /**
   * Get model performance metrics
   */
  async getModelPerformance(): Promise<{
    mae: number;
    rmse: number;
    r2: number;
    accuracy: number;
    lastUpdated: Date;
  }> {
    const response = await fetch(`${this.baseUrl}/models/performance`);
    
    if (!response.ok) {
      throw new Error(`Model performance API failed: ${response.status}`);
    }
    
    const data = await response.json();
    return this.transformDates(data);
  }

  /**
   * Export forecasting data
   */
  async exportForecastData(
    type: 'capacity' | 'demand' | 'scenarios' | 'insights',
    format: 'csv' | 'json' | 'excel' = 'csv'
  ): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/export?type=${type}&format=${format}`);
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  private async handleResponse<T>(response: Response): Promise<ForecastingResponse<T>> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Convert date strings to Date objects
    return this.transformDates(data);
  }

  private transformDates<T>(obj: any): T {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
      return new Date(obj) as any;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.transformDates(item)) as any;
    }
    
    if (typeof obj === 'object') {
      const transformed: any = {};
      for (const [key, value] of Object.entries(obj)) {
        transformed[key] = this.transformDates(value);
      }
      return transformed;
    }
    
    return obj;
  }
}

export const forecastingService = new ForecastingService();
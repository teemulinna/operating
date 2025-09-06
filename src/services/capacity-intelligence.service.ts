import { DatabaseService } from '../database/database.service';

export interface CapacityIntelligence {
  currentUtilization: {
    overall: number;
    byDepartment: Array<{ department: string; utilization: number; available: number; committed: number }>;
    bySkill: Array<{ skill: string; utilization: number; availableResources: number }>;
  };
  capacityTrends: Array<{
    period: string;
    utilization: number;
    capacity: number;
    demand: number;
  }>;
  bottleneckAnalysis: {
    current: CapacityBottleneck[];
    predicted: CapacityBottleneck[];
    historical: CapacityBottleneck[];
  };
  predictions: CapacityPrediction[];
  recommendations: CapacityRecommendation[];
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: string;
    mitigation: string;
  }>;
}

export interface CapacityPrediction {
  period: string;
  predictedCapacity: number;
  demandForecast: number;
  utilizationRate: number;
  confidence: number;
  scenario: 'optimistic' | 'realistic' | 'pessimistic';
  keyFactors: string[];
}

export interface CapacityBottleneck {
  type: 'skill' | 'department' | 'resource' | 'time';
  affectedResource: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number; // 0-100
  affectedProjects: number[];
  estimatedDuration: number; // days
  rootCauses: string[];
  recommendedActions: string[];
  status: 'active' | 'mitigated' | 'resolved';
}

export interface CapacityRecommendation {
  type: 'hiring' | 'training' | 'reallocation' | 'process_improvement' | 'tool_adoption';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedImpact: number; // percentage improvement
  implementationCost: number;
  implementationTime: number; // weeks
  affectedDepartments: string[];
  affectedSkills: string[];
  successMetrics: string[];
  roi: number; // Return on Investment percentage
}

export interface ScenarioAnalysis {
  scenarioId: string;
  analysis: {
    capacityImpact: {
      totalCapacityChange: number;
      departmentImpacts: Array<{
        department: string;
        capacityChange: number;
        utilizationChange: number;
      }>;
    };
    bottleneckAnalysis: {
      newBottlenecks: CapacityBottleneck[];
      resolvedBottlenecks: CapacityBottleneck[];
      impactSummary: string;
    };
    recommendations: CapacityRecommendation[];
    riskAssessment: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      risks: Array<{
        risk: string;
        probability: number;
        impact: string;
        mitigation: string;
      }>;
    };
  };
}

export interface UtilizationPatterns {
  patterns: {
    peakPeriods: Array<{ period: string; utilizationRate: number }>;
    lowUtilizationPeriods: Array<{ period: string; utilizationRate: number }>;
    averageUtilization: number;
  };
  seasonality: {
    hasSeasonality: boolean;
    peakMonths: string[];
    lowMonths: string[];
    seasonalityStrength: number;
  };
  trends: {
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number; // percentage change per period
    confidence: number;
  };
  anomalies: Array<{
    period: string;
    actualUtilization: number;
    expectedUtilization: number;
    deviation: number;
    possibleCauses: string[];
  }>;
}

export interface SkillDemandForecast {
  skillDemand: Array<{
    skill: string;
    currentSupply: number;
    forecastedDemand: number;
    gap: number;
    confidence: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
  }>;
  skillGaps: Array<{
    skill: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timeToFill: number; // weeks
    businessImpact: string;
  }>;
  hiringRecommendations: Array<{
    skill: string;
    recommendedHires: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    justification: string;
  }>;
  trainingRecommendations: Array<{
    skill: string;
    candidateEmployees: number;
    estimatedTime: number; // weeks
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

export class CapacityIntelligenceService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async getCapacityIntelligence(filters?: {
    department?: string;
    timeframe?: string;
  }): Promise<CapacityIntelligence> {
    const [
      currentUtilization,
      capacityTrends,
      bottlenecks,
      predictions,
      recommendations
    ] = await Promise.all([
      this.getCurrentUtilization(filters?.department),
      this.getCapacityTrends(filters?.timeframe || 'last_quarter'),
      this.getBottleneckAnalysis(),
      this.getCapacityPredictions(),
      this.getCapacityRecommendations()
    ]);

    const riskFactors = await this.assessRiskFactors();

    return {
      currentUtilization,
      capacityTrends,
      bottleneckAnalysis: bottlenecks,
      predictions,
      recommendations,
      riskFactors
    };
  }

  async getCapacityPredictions(options?: {
    horizon?: string;
    confidence?: number;
    scenarios?: string[];
  }): Promise<CapacityPrediction[]> {
    const horizon = options?.horizon || '6_months';
    const scenarios = options?.scenarios || ['realistic'];
    const predictions: CapacityPrediction[] = [];

    // Get historical data for prediction
    const historicalQuery = `
      SELECT 
        DATE_TRUNC('month', snapshot_date) as period,
        AVG(overall_utilization) as avg_utilization,
        AVG(available_capacity_hours) as avg_capacity,
        AVG(committed_capacity_hours) as avg_demand
      FROM capacity_metrics_snapshots
      WHERE snapshot_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', snapshot_date)
      ORDER BY period
    `;

    const historicalData = await this.db.query(historicalQuery);
    const history = historicalData.rows;

    if (history.length === 0) {
      // Return default predictions if no historical data
      return this.generateDefaultPredictions(scenarios);
    }

    // Calculate trends
    const utilizationTrend = this.calculateTrend(history.map(h => parseFloat(h.avg_utilization)));
    const capacityTrend = this.calculateTrend(history.map(h => parseFloat(h.avg_capacity)));
    const demandTrend = this.calculateTrend(history.map(h => parseFloat(h.avg_demand)));

    // Generate predictions for each scenario
    for (const scenario of scenarios) {
      const scenarioMultiplier = this.getScenarioMultiplier(scenario);
      const periodsToPredict = this.getPeriodsCount(horizon);

      for (let i = 1; i <= periodsToPredict; i++) {
        const lastCapacity = parseFloat(history[history.length - 1]?.avg_capacity || '2000');
        const lastDemand = parseFloat(history[history.length - 1]?.avg_demand || '1600');

        const predictedCapacity = lastCapacity + (capacityTrend * i * scenarioMultiplier);
        const demandForecast = lastDemand + (demandTrend * i * scenarioMultiplier);
        const utilizationRate = predictedCapacity > 0 ? (demandForecast / predictedCapacity) * 100 : 0;

        predictions.push({
          period: this.getPeriodName(i, horizon),
          predictedCapacity,
          demandForecast,
          utilizationRate,
          confidence: Math.max(50, 90 - (i * 5)), // Confidence decreases over time
          scenario: scenario as any,
          keyFactors: [
            'Historical utilization trends',
            'Current project pipeline',
            'Seasonal variations',
            'Market demand patterns'
          ]
        });
      }
    }

    return predictions;
  }

  async identifyBottlenecks(severity?: string): Promise<{
    current: CapacityBottleneck[];
    predicted: CapacityBottleneck[];
    historical: CapacityBottleneck[];
  }> {
    const severityFilter = severity ? `AND severity = '${severity}'` : '';

    const [currentQuery, predictedQuery, historicalQuery] = await Promise.all([
      // Current bottlenecks
      this.db.query(`
        SELECT * FROM capacity_bottlenecks
        WHERE status = 'active' ${severityFilter}
        ORDER BY impact_score DESC
      `),

      // Predicted bottlenecks (from recent analysis)
      this.db.query(`
        SELECT * FROM capacity_bottlenecks
        WHERE identified_date >= CURRENT_DATE - INTERVAL '7 days'
        AND (status = 'active' OR estimated_duration_days > 7)
        ${severityFilter}
        ORDER BY impact_score DESC
      `),

      // Historical bottlenecks (resolved ones for learning)
      this.db.query(`
        SELECT * FROM capacity_bottlenecks
        WHERE status = 'resolved'
        AND resolution_date >= CURRENT_DATE - INTERVAL '6 months'
        ${severityFilter}
        ORDER BY resolution_date DESC
        LIMIT 10
      `)
    ]);

    return {
      current: currentQuery.rows.map(this.mapBottleneckRow),
      predicted: predictedQuery.rows.map(this.mapBottleneckRow),
      historical: historicalQuery.rows.map(this.mapBottleneckRow)
    };
  }

  async runScenarioAnalysis(scenarioData: {
    scenario: {
      name: string;
      description: string;
      changes: Array<{
        type: 'add_project' | 'add_resources' | 'remove_resources' | 'change_demand';
        details: any;
      }>;
    };
    analysisOptions: {
      includeRiskAnalysis: boolean;
      optimizationSuggestions: boolean;
      costImpact: boolean;
    };
  }): Promise<ScenarioAnalysis> {
    const scenarioId = `scenario_${Date.now()}`;
    
    // Get current baseline metrics
    const currentUtilization = await this.getCurrentUtilization();
    const currentBottlenecks = await this.identifyBottlenecks();

    // Simulate the scenario changes
    let simulatedCapacityChange = 0;
    let simulatedDemandChange = 0;
    const departmentImpacts = new Map<string, { capacityChange: number; utilizationChange: number }>();

    for (const change of scenarioData.scenario.changes) {
      switch (change.type) {
        case 'add_project':
          simulatedDemandChange += this.estimateProjectDemand(change.details);
          break;
        case 'add_resources':
          simulatedCapacityChange += this.estimateResourceCapacity(change.details);
          break;
        case 'remove_resources':
          simulatedCapacityChange -= this.estimateResourceCapacity(change.details);
          break;
        case 'change_demand':
          simulatedDemandChange += change.details.demandChange || 0;
          break;
      }
    }

    // Calculate impacts
    const totalCapacityChange = simulatedCapacityChange;
    const newOverallUtilization = Math.max(0, Math.min(100, 
      currentUtilization.overall + (simulatedDemandChange / Math.max(1, simulatedCapacityChange + 2000)) * 100
    ));

    // Identify new bottlenecks
    const newBottlenecks = await this.predictBottlenecks(simulatedDemandChange, simulatedCapacityChange);
    
    // Generate recommendations
    const recommendations = await this.generateScenarioRecommendations(
      totalCapacityChange,
      simulatedDemandChange,
      newOverallUtilization
    );

    // Assess risks
    const riskAssessment = this.assessScenarioRisks(
      totalCapacityChange,
      simulatedDemandChange,
      newOverallUtilization
    );

    return {
      scenarioId,
      analysis: {
        capacityImpact: {
          totalCapacityChange,
          departmentImpacts: Array.from(departmentImpacts.entries()).map(([dept, impact]) => ({
            department: dept,
            ...impact
          }))
        },
        bottleneckAnalysis: {
          newBottlenecks,
          resolvedBottlenecks: [], // Would compare with current bottlenecks
          impactSummary: this.generateBottleneckSummary(newBottlenecks)
        },
        recommendations,
        riskAssessment
      }
    };
  }

  async analyzeUtilizationPatterns(options?: {
    period?: string;
    granularity?: string;
  }): Promise<UtilizationPatterns> {
    const period = options?.period || 'last_year';
    const granularity = options?.granularity || 'monthly';

    const query = `
      SELECT 
        DATE_TRUNC($1, snapshot_date) as period,
        AVG(overall_utilization) as avg_utilization,
        MAX(overall_utilization) as max_utilization,
        MIN(overall_utilization) as min_utilization
      FROM capacity_metrics_snapshots
      WHERE snapshot_date >= CURRENT_DATE - INTERVAL '${period.replace('last_', '')}'
      GROUP BY DATE_TRUNC($1, snapshot_date)
      ORDER BY period
    `;

    const result = await this.db.query(query, [granularity]);
    const data = result.rows;

    const utilizations = data.map(d => parseFloat(d.avg_utilization));
    const averageUtilization = utilizations.reduce((sum, val) => sum + val, 0) / utilizations.length;

    // Identify peaks and lows
    const threshold = averageUtilization * 0.1; // 10% threshold
    const peakPeriods = data.filter(d => parseFloat(d.avg_utilization) > averageUtilization + threshold);
    const lowPeriods = data.filter(d => parseFloat(d.avg_utilization) < averageUtilization - threshold);

    // Analyze seasonality (simplified)
    const seasonality = this.analyzeSeasonality(data);

    // Calculate trends
    const trend = this.calculateUtilizationTrend(utilizations);

    // Identify anomalies
    const anomalies = this.identifyAnomalies(data, averageUtilization);

    return {
      patterns: {
        peakPeriods: peakPeriods.map(p => ({
          period: p.period,
          utilizationRate: parseFloat(p.avg_utilization)
        })),
        lowUtilizationPeriods: lowPeriods.map(p => ({
          period: p.period,
          utilizationRate: parseFloat(p.avg_utilization)
        })),
        averageUtilization
      },
      seasonality,
      trends: trend,
      anomalies
    };
  }

  async forecastSkillDemand(horizon?: string): Promise<SkillDemandForecast> {
    const timeHorizon = horizon || '12_months';

    // Get current skill supply
    const skillSupplyQuery = `
      SELECT 
        s.name as skill,
        COUNT(DISTINCT es.employee_id) as current_supply,
        AVG(es.proficiency_level) as avg_proficiency
      FROM skills s
      JOIN employee_skills es ON s.id = es.skill_id
      JOIN employees e ON es.employee_id = e.id
      WHERE e.is_active = true
      GROUP BY s.id, s.name
      ORDER BY current_supply DESC
    `;

    const supplyData = await this.db.query(skillSupplyQuery);

    // Analyze project pipeline for demand forecasting
    const demandQuery = `
      SELECT 
        rts.skill_id,
        s.name as skill_name,
        COUNT(DISTINCT p.id) as projects_requiring_skill,
        SUM(pta.quantity) as total_demand
      FROM projects p
      JOIN project_template_assignments pta ON p.id = pta.project_id
      JOIN role_template_skills rts ON pta.template_id = rts.template_id
      JOIN skills s ON rts.skill_id = s.id
      WHERE p.status IN ('planning', 'active')
      GROUP BY rts.skill_id, s.name
      ORDER BY total_demand DESC
    `;

    const demandData = await this.db.query(demandQuery);

    // Create skill demand forecast
    const skillDemand = supplyData.rows.map(supply => {
      const demand = demandData.rows.find(d => d.skill_name === supply.skill);
      const forecastedDemand = demand ? parseInt(demand.total_demand) : 0;
      const gap = Math.max(0, forecastedDemand - parseInt(supply.current_supply));

      return {
        skill: supply.skill,
        currentSupply: parseInt(supply.current_supply),
        forecastedDemand,
        gap,
        confidence: 0.75, // 75% confidence
        trendDirection: this.analyzeDemandTrend(supply.skill) as 'increasing' | 'decreasing' | 'stable'
      };
    });

    // Generate skill gaps
    const skillGaps = skillDemand
      .filter(sd => sd.gap > 0)
      .map(sd => ({
        skill: sd.skill,
        severity: sd.gap > 5 ? 'critical' : sd.gap > 3 ? 'high' : sd.gap > 1 ? 'medium' : 'low' as const,
        timeToFill: this.estimateTimeToFill(sd.skill, sd.gap),
        businessImpact: this.assessBusinessImpact(sd.skill, sd.gap)
      }));

    // Generate hiring recommendations
    const hiringRecommendations = skillGaps
      .filter(sg => sg.severity === 'high' || sg.severity === 'critical')
      .map(sg => ({
        skill: sg.skill,
        recommendedHires: Math.ceil(skillDemand.find(sd => sd.skill === sg.skill)?.gap || 0),
        urgency: sg.severity as 'critical' | 'high',
        justification: `${sg.skill} shortage will impact ${sg.businessImpact}`
      }));

    // Generate training recommendations
    const trainingRecommendations = skillGaps
      .map(sg => ({
        skill: sg.skill,
        candidateEmployees: this.findTrainingCandidates(sg.skill),
        estimatedTime: this.estimateTrainingTime(sg.skill),
        priority: sg.severity as 'critical' | 'high' | 'medium' | 'low'
      }));

    return {
      skillDemand,
      skillGaps,
      hiringRecommendations,
      trainingRecommendations
    };
  }

  // Private helper methods
  private async getCurrentUtilization(department?: string): Promise<CapacityIntelligence['currentUtilization']> {
    const deptFilter = department ? `AND d.name = '${department}'` : '';
    
    const [overallQuery, deptQuery, skillQuery] = await Promise.all([
      this.db.query(`
        SELECT AVG(overall_utilization) as overall_utilization
        FROM capacity_metrics_snapshots
        WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
      `),
      
      this.db.query(`
        SELECT 
          d.name as department,
          85.0 as utilization,  -- Placeholder values
          800 as available,
          680 as committed
        FROM departments d
        WHERE d.id > 0 ${deptFilter}
        ORDER BY d.name
      `),
      
      this.db.query(`
        SELECT 
          s.name as skill,
          90.0 as utilization,  -- Placeholder values
          5 as available_resources
        FROM skills s
        WHERE s.category = 'Technical'
        ORDER BY s.name
        LIMIT 10
      `)
    ]);

    return {
      overall: parseFloat(overallQuery.rows[0]?.overall_utilization || '80'),
      byDepartment: deptQuery.rows.map(row => ({
        department: row.department,
        utilization: parseFloat(row.utilization),
        available: parseInt(row.available),
        committed: parseInt(row.committed)
      })),
      bySkill: skillQuery.rows.map(row => ({
        skill: row.skill,
        utilization: parseFloat(row.utilization),
        availableResources: parseInt(row.available_resources)
      }))
    };
  }

  private async getCapacityTrends(timeframe: string): Promise<CapacityIntelligence['capacityTrends']> {
    // Placeholder implementation - would query actual capacity metrics
    const periods = this.generateTimeframePeriods(timeframe);
    return periods.map((period, index) => ({
      period,
      utilization: 75 + Math.random() * 20, // Random data for demo
      capacity: 2000 + index * 50,
      demand: 1600 + index * 40
    }));
  }

  private async getBottleneckAnalysis(): Promise<CapacityIntelligence['bottleneckAnalysis']> {
    return this.identifyBottlenecks();
  }

  private async getCapacityRecommendations(): Promise<CapacityRecommendation[]> {
    // Placeholder implementation
    return [
      {
        type: 'hiring',
        priority: 'high',
        description: 'Hire 2 senior React developers to address frontend capacity shortage',
        expectedImpact: 15,
        implementationCost: 200000,
        implementationTime: 12,
        affectedDepartments: ['Engineering'],
        affectedSkills: ['React', 'JavaScript'],
        successMetrics: ['Reduced React bottlenecks', 'Improved delivery velocity'],
        roi: 25
      }
    ];
  }

  private async assessRiskFactors(): Promise<CapacityIntelligence['riskFactors']> {
    return [
      {
        factor: 'Key person dependency',
        severity: 'high',
        impact: 'Senior developers leaving could create critical gaps',
        mitigation: 'Cross-train junior developers and document key processes'
      }
    ];
  }

  private mapBottleneckRow(row: any): CapacityBottleneck {
    return {
      type: row.bottleneck_type,
      affectedResource: row.affected_resource,
      severity: row.severity,
      impact: parseFloat(row.impact_score),
      affectedProjects: row.affected_projects ? JSON.parse(row.affected_projects) : [],
      estimatedDuration: row.estimated_duration_days,
      rootCauses: row.root_causes ? JSON.parse(row.root_causes) : [],
      recommendedActions: row.resolution_actions ? JSON.parse(row.resolution_actions) : [],
      status: row.status
    };
  }

  // Additional helper methods would be implemented here
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const first = values[0];
    const last = values[values.length - 1];
    return (last - first) / values.length;
  }

  private getScenarioMultiplier(scenario: string): number {
    switch (scenario) {
      case 'optimistic': return 0.8;
      case 'pessimistic': return 1.2;
      default: return 1.0;
    }
  }

  private getPeriodsCount(horizon: string): number {
    switch (horizon) {
      case 'next_month': return 1;
      case 'next_quarter': return 3;
      case '6_months': return 6;
      case 'next_year': return 12;
      default: return 6;
    }
  }

  private getPeriodName(index: number, horizon: string): string {
    const now = new Date();
    const future = new Date(now.getFullYear(), now.getMonth() + index, 1);
    return future.toISOString().slice(0, 7); // YYYY-MM format
  }

  private generateDefaultPredictions(scenarios: string[]): CapacityPrediction[] {
    return scenarios.map(scenario => ({
      period: '2024-10',
      predictedCapacity: 2000,
      demandForecast: 1600,
      utilizationRate: 80,
      confidence: 70,
      scenario: scenario as any,
      keyFactors: ['Limited historical data', 'Industry trends', 'Current pipeline']
    }));
  }

  private generateTimeframePeriods(timeframe: string): string[] {
    // Generate period labels based on timeframe
    const periods = [];
    const now = new Date();
    const monthsBack = timeframe === 'last_quarter' ? 3 : 6;
    
    for (let i = monthsBack; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(date.toISOString().slice(0, 7));
    }
    
    return periods;
  }

  private estimateProjectDemand(projectDetails: any): number {
    return projectDetails.teamSize * projectDetails.duration * 160 || 1280; // Default estimate
  }

  private estimateResourceCapacity(resourceDetails: any): number {
    return resourceDetails.count * 160 * 4 || 640; // Default monthly capacity
  }

  private async predictBottlenecks(demandChange: number, capacityChange: number): Promise<CapacityBottleneck[]> {
    // Simplified bottleneck prediction
    if (demandChange > capacityChange * 1.2) {
      return [{
        type: 'resource',
        affectedResource: 'Overall capacity',
        severity: 'high',
        impact: 75,
        affectedProjects: [],
        estimatedDuration: 30,
        rootCauses: ['Increased demand exceeds capacity growth'],
        recommendedActions: ['Hire additional resources', 'Optimize processes'],
        status: 'active'
      }];
    }
    return [];
  }

  private async generateScenarioRecommendations(
    capacityChange: number, 
    demandChange: number, 
    newUtilization: number
  ): Promise<CapacityRecommendation[]> {
    const recommendations: CapacityRecommendation[] = [];

    if (newUtilization > 90) {
      recommendations.push({
        type: 'hiring',
        priority: 'high',
        description: 'Increase capacity to handle elevated demand',
        expectedImpact: 20,
        implementationCost: 150000,
        implementationTime: 10,
        affectedDepartments: ['Engineering'],
        affectedSkills: ['General'],
        successMetrics: ['Reduced utilization to sustainable levels'],
        roi: 30
      });
    }

    return recommendations;
  }

  private assessScenarioRisks(capacityChange: number, demandChange: number, utilization: number) {
    const riskLevel = utilization > 95 ? 'critical' : utilization > 85 ? 'high' : 'medium';
    
    return {
      riskLevel: riskLevel as 'critical' | 'high' | 'medium',
      risks: [
        {
          risk: 'Resource overutilization',
          probability: utilization / 100,
          impact: 'Decreased quality and employee burnout',
          mitigation: 'Hire additional staff or reduce scope'
        }
      ]
    };
  }

  private generateBottleneckSummary(bottlenecks: CapacityBottleneck[]): string {
    if (bottlenecks.length === 0) return 'No significant bottlenecks identified';
    
    const critical = bottlenecks.filter(b => b.severity === 'critical').length;
    const high = bottlenecks.filter(b => b.severity === 'high').length;
    
    return `${bottlenecks.length} bottlenecks identified (${critical} critical, ${high} high severity)`;
  }

  private analyzeSeasonality(data: any[]) {
    // Simplified seasonality analysis
    return {
      hasSeasonality: data.length > 6,
      peakMonths: ['March', 'September'],
      lowMonths: ['December', 'January'],
      seasonalityStrength: 0.3
    };
  }

  private calculateUtilizationTrend(utilizations: number[]) {
    const trend = this.calculateTrend(utilizations);
    return {
      direction: trend > 1 ? 'increasing' : trend < -1 ? 'decreasing' : 'stable' as const,
      rate: Math.abs(trend),
      confidence: 0.8
    };
  }

  private identifyAnomalies(data: any[], average: number) {
    return data
      .filter(d => Math.abs(parseFloat(d.avg_utilization) - average) > average * 0.2)
      .map(d => ({
        period: d.period,
        actualUtilization: parseFloat(d.avg_utilization),
        expectedUtilization: average,
        deviation: Math.abs(parseFloat(d.avg_utilization) - average),
        possibleCauses: ['Project deadlines', 'Resource changes', 'Market conditions']
      }));
  }

  private analyzeDemandTrend(skill: string): string {
    // Simplified trend analysis
    const trends = ['increasing', 'stable', 'decreasing'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  private estimateTimeToFill(skill: string, gap: number): number {
    // Estimate weeks to fill gap
    return Math.max(4, gap * 6);
  }

  private assessBusinessImpact(skill: string, gap: number): string {
    if (gap > 5) return 'Critical project delays expected';
    if (gap > 3) return 'Moderate impact on delivery timeline';
    return 'Minor impact on capacity';
  }

  private findTrainingCandidates(skill: string): number {
    // Simplified - would query actual employee data
    return Math.floor(Math.random() * 5) + 2;
  }

  private estimateTrainingTime(skill: string): number {
    // Estimate weeks for training
    const complexSkills = ['Machine Learning', 'DevOps', 'Architecture'];
    return complexSkills.includes(skill) ? 12 : 8;
  }
}
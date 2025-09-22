import { Pool } from 'pg';

export interface UtilizationReport {
  overallUtilization: number;
  employeeUtilization: EmployeeUtilization[];
  projectUtilization: ProjectUtilization[];
  underUtilized: EmployeeUtilization[];
  overUtilized: EmployeeUtilization[];
  trends: UtilizationTrend[];
}

export interface EmployeeUtilization {
  employeeId: string;
  employeeName: string;
  totalCapacity: number;
  allocatedHours: number;
  actualHours: number;
  utilizationRate: number;
  efficiency: number;
  projects: ProjectAllocation[];
}

export interface ProjectUtilization {
  projectId: number;
  projectName: string;
  plannedHours: number;
  actualHours: number;
  efficiency: number;
  teamSize: number;
  avgUtilization: number;
}

export interface ProjectAllocation {
  projectId: number;
  projectName: string;
  allocatedHours: number;
  role: string;
}

export interface UtilizationTrend {
  period: string;
  utilization: number;
  change: number;
}

export interface SkillGapAnalysis {
  skillGaps: SkillGap[];
  recommendations: SkillRecommendation[];
  criticalMissingSkills: string[];
  trainingNeeds: TrainingNeed[];
}

export interface SkillGap {
  skill: string;
  demandCount: number;
  availableCount: number;
  gapSize: number;
  criticalityScore: number;
}

export interface SkillRecommendation {
  type: 'hire' | 'train' | 'contract';
  skill: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost: number;
  timeline: string;
  reasoning: string;
}

export interface TrainingNeed {
  employeeId: string;
  employeeName: string;
  skillsToTrain: string[];
  priority: number;
  estimatedDuration: string;
  cost: number;
}

export interface ForecastResult {
  predictions: ForecastPrediction[];
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal';
  seasonalPattern?: SeasonalPattern;
}

export interface ForecastPrediction {
  period: string;
  predictedHours: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
}

export interface SeasonalPattern {
  pattern: 'quarterly' | 'monthly' | 'yearly';
  peakPeriods: string[];
  lowPeriods: string[];
}

export interface AllocationOptimization {
  suggestions: OptimizationSuggestion[];
  expectedImprovement: number;
  riskAssessment: RiskAssessment;
  implementation: ImplementationPlan;
}

export interface OptimizationSuggestion {
  type: 'reassignment' | 'capacity_adjustment' | 'skill_development' | 'hiring';
  employeeId: string;
  fromProjectId?: number;
  toProjectId?: number;
  adjustment?: number;
  reason: string;
  expectedImprovement: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  risks: Risk[];
  mitigationStrategies: string[];
}

export interface Risk {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  probability: number;
}

export interface ImplementationPlan {
  phases: ImplementationPhase[];
  timeline: string;
  dependencies: string[];
}

export interface ImplementationPhase {
  phase: number;
  description: string;
  actions: string[];
  duration: string;
}

export class ResourceAnalyticsService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async generateUtilizationReport(startDate: Date, endDate: Date): Promise<UtilizationReport> {
    // Get all resource allocations in the period with real data
    const allocationsQuery = `
      SELECT 
        ra.*,
        p.name as project_name,
        e.first_name || ' ' || e.last_name as employee_name,
        e.weekly_capacity
      FROM resource_allocations ra
      JOIN projects p ON ra.project_id = p.id
      JOIN employees e ON ra.employee_id = e.id
      WHERE ra.is_active = true 
      AND p.is_active = true 
      AND e.is_active = true
      AND ra.start_date <= $2 
      AND ra.end_date >= $1
      ORDER BY e.id, p.id
    `;

    const allocationsResult = await this.pool.query(allocationsQuery, [startDate, endDate]);
    const assignments = allocationsResult.rows;

    // Group assignments by employee and project
    const employeeMap = new Map<number, any[]>();
    const projectMap = new Map<number, any[]>();

    assignments.forEach(assignment => {
      const empId = parseInt(assignment.employee_id);
      const projId = parseInt(assignment.project_id);

      // Employee grouping
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, []);
      }
      employeeMap.get(empId)!.push(assignment);

      // Project grouping
      if (!projectMap.has(projId)) {
        projectMap.set(projId, []);
      }
      projectMap.get(projId)!.push(assignment);
    });

    // Calculate employee utilization with real data
    const employeeUtilization = await this.calculateEmployeeUtilization(employeeMap, startDate, endDate);
    
    // Calculate project utilization with real data
    const projectUtilization = await this.calculateProjectUtilization(projectMap);

    // Calculate overall utilization from real data
    const totalCapacity = employeeUtilization.reduce((sum, emp) => sum + emp.totalCapacity, 0);
    const totalAllocated = employeeUtilization.reduce((sum, emp) => sum + emp.allocatedHours, 0);
    const overallUtilization = totalCapacity > 0 ? totalAllocated / totalCapacity : 0;

    // Identify under/over-utilized employees based on real thresholds
    const underUtilized = employeeUtilization.filter(emp => emp.utilizationRate < 0.7);
    const overUtilized = employeeUtilization.filter(emp => emp.utilizationRate > 1.0);

    // Calculate trends from historical data
    const trends = await this.calculateUtilizationTrends(startDate, endDate);

    return {
      overallUtilization,
      employeeUtilization,
      projectUtilization,
      underUtilized,
      overUtilized,
      trends
    };
  }

  async analyzeSkillGaps(projects: any[], employees: any[]): Promise<SkillGapAnalysis> {
    // Get real skill demand from project requirements
    const skillDemandQuery = `
      SELECT 
        s.name as skill,
        s.category,
        COUNT(DISTINCT sr.project_id) as project_demand,
        COUNT(DISTINCT p.id) FILTER (WHERE p.priority = 'high') as high_priority_demand
      FROM skills s
      LEFT JOIN skill_requirements sr ON s.id = sr.skill_id
      LEFT JOIN projects p ON sr.project_id = p.id AND p.status IN ('active', 'planning')
      WHERE s.is_active = true
      GROUP BY s.id, s.name, s.category
    `;

    const skillSupplyQuery = `
      SELECT 
        s.name as skill,
        COUNT(DISTINCT es.employee_id) as available_count,
        COUNT(DISTINCT es.employee_id) FILTER (WHERE es.proficiency_level::integer >= 4) as expert_count
      FROM skills s
      LEFT JOIN employee_skills es ON s.id = es.skill_id AND es.is_active = true
      LEFT JOIN employees e ON es.employee_id = e.id AND e.is_active = true
      WHERE s.is_active = true
      GROUP BY s.id, s.name
    `;

    const [demandResult, supplyResult] = await Promise.all([
      this.pool.query(skillDemandQuery),
      this.pool.query(skillSupplyQuery)
    ]);

    // Build skill demand and supply maps
    const skillDemand = new Map<string, {demand: number, highPriority: number}>();
    demandResult.rows.forEach(row => {
      skillDemand.set(row.skill, {
        demand: parseInt(row.project_demand) || 0,
        highPriority: parseInt(row.high_priority_demand) || 0
      });
    });

    const skillSupply = new Map<string, {available: number, experts: number}>();
    supplyResult.rows.forEach(row => {
      skillSupply.set(row.skill, {
        available: parseInt(row.available_count) || 0,
        experts: parseInt(row.expert_count) || 0
      });
    });

    // Calculate skill gaps
    const skillGaps: SkillGap[] = [];
    for (const [skill, demand] of skillDemand) {
      const supply = skillSupply.get(skill) || { available: 0, experts: 0 };
      const gapSize = Math.max(0, demand.demand - supply.experts);
      
      if (gapSize > 0) {
        const criticalityScore = this.calculateCriticalityScore(skill, demand.demand, demand.highPriority);
        skillGaps.push({
          skill,
          demandCount: demand.demand,
          availableCount: supply.available,
          gapSize,
          criticalityScore
        });
      }
    }

    // Sort by criticality
    skillGaps.sort((a, b) => b.criticalityScore - a.criticalityScore);

    // Generate recommendations based on real data
    const recommendations = await this.generateSkillRecommendations(skillGaps);
    
    // Identify critical missing skills
    const criticalMissingSkills = skillGaps
      .filter(gap => gap.criticalityScore >= 0.8)
      .map(gap => gap.skill);

    // Generate training needs based on employee skills
    const trainingNeeds = await this.identifyTrainingNeeds(skillGaps, employees);

    return {
      skillGaps,
      recommendations,
      criticalMissingSkills,
      trainingNeeds
    };
  }

  async generateForecast(historicalData: any[], forecastPeriods: number): Promise<ForecastResult> {
    if (historicalData.length < 3) {
      throw new Error('Insufficient historical data for forecasting (minimum 3 periods required)');
    }

    // Use real historical data from database if not provided
    if (historicalData.length === 0) {
      const query = `
        SELECT 
          DATE_TRUNC('month', ra.start_date) as period,
          SUM(ra.allocated_hours) as total_hours,
          COUNT(DISTINCT ra.employee_id) as employee_count
        FROM resource_allocations ra
        WHERE ra.is_active = true 
        AND ra.start_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', ra.start_date)
        ORDER BY period
      `;
      
      const result = await this.pool.query(query);
      historicalData = result.rows;
    }

    const periods = historicalData.length;
    const values = historicalData.map(d => d.totalHours || d.total_hours);
    const trend = this.calculateTrend(values);

    // Detect seasonality
    const seasonalPattern = this.detectSeasonality(historicalData);

    // Generate predictions based on trend analysis
    const predictions: ForecastPrediction[] = [];
    const baseValue = values[values.length - 1];

    for (let i = 1; i <= forecastPeriods; i++) {
      let predictedValue = baseValue + (trend * i);

      // Apply seasonal adjustment if pattern detected
      if (seasonalPattern) {
        const seasonalFactor = this.getSeasonalFactor(i, seasonalPattern);
        predictedValue *= seasonalFactor;
      }

      // Calculate confidence (decreases with distance)
      const confidence = Math.max(0.5, 1 - (i * 0.08));
      const variance = this.calculateVariance(values);
      const margin = Math.sqrt(variance) * (1 - confidence);

      predictions.push({
        period: `Period ${i}`,
        predictedHours: Math.round(predictedValue),
        confidence,
        upperBound: Math.round(predictedValue + margin),
        lowerBound: Math.round(Math.max(0, predictedValue - margin))
      });
    }

    // Overall confidence based on trend stability
    const overallConfidence = this.calculateForecastConfidence(values, trend);

    return {
      predictions,
      confidence: overallConfidence,
      trend: this.classifyTrend(trend),
      seasonalPattern
    };
  }

  async optimizeAllocation(currentAllocations: any[]): Promise<AllocationOptimization> {
    const suggestions: OptimizationSuggestion[] = [];

    // Get real allocation data if not provided
    if (currentAllocations.length === 0) {
      const query = `
        SELECT 
          ra.*,
          e.first_name || ' ' || e.last_name as employee_name,
          e.weekly_capacity,
          p.name as project_name,
          p.priority,
          STRING_AGG(DISTINCT s.name, ', ') as employee_skills
        FROM resource_allocations ra
        JOIN employees e ON ra.employee_id = e.id
        JOIN projects p ON ra.project_id = p.id
        LEFT JOIN employee_skills es ON e.id = es.employee_id AND es.is_active = true
        LEFT JOIN skills s ON es.skill_id = s.id
        WHERE ra.is_active = true 
        AND e.is_active = true 
        AND p.is_active = true
        AND ra.start_date <= CURRENT_DATE + INTERVAL '30 days'
        AND ra.end_date >= CURRENT_DATE
        GROUP BY ra.id, e.id, e.first_name, e.last_name, e.weekly_capacity, p.id, p.name, p.priority
      `;

      const result = await this.pool.query(query);
      currentAllocations = result.rows;
    }

    // Analyze current allocations for optimization opportunities
    for (const allocation of currentAllocations) {
      const allocatedHours = parseFloat(allocation.allocated_hours) || 0;
      const weeklyCapacity = parseFloat(allocation.weekly_capacity) || 40;
      const utilization = allocatedHours / weeklyCapacity;

      // Check for over-allocation
      if (utilization > 1.0) {
        const overAllocation = allocatedHours - weeklyCapacity;
        suggestions.push({
          type: 'capacity_adjustment',
          employeeId: parseInt(allocation.employee_id),
          adjustment: -overAllocation,
          reason: `Over-allocated by ${overAllocation.toFixed(1)} hours (${(utilization * 100).toFixed(1)}% utilization)`,
          expectedImprovement: (utilization - 1.0) * 100,
          confidence: 0.9,
          riskLevel: overAllocation > 20 ? 'high' : 'medium'
        });
      }

      // Check for under-allocation
      if (utilization < 0.7) {
        const underAllocation = weeklyCapacity * 0.8 - allocatedHours;
        suggestions.push({
          type: 'capacity_adjustment',
          employeeId: parseInt(allocation.employee_id),
          adjustment: underAllocation,
          reason: `Under-allocated by ${underAllocation.toFixed(1)} hours (${(utilization * 100).toFixed(1)}% utilization)`,
          expectedImprovement: (0.8 - utilization) * 100,
          confidence: 0.7,
          riskLevel: 'low'
        });
      }

      // Check for skill mismatches (if skill data available)
      if (allocation.employee_skills && allocation.required_skills) {
        const employeeSkills = allocation.employee_skills.split(', ');
        const requiredSkills = allocation.required_skills.split(', ');
        const skillMatch = this.calculateSkillMatchScore(employeeSkills, requiredSkills);
        
        if (skillMatch < 0.7) {
          suggestions.push({
            type: 'reassignment',
            employeeId: parseInt(allocation.employee_id),
            fromProjectId: parseInt(allocation.project_id),
            reason: `Skill mismatch: ${(skillMatch * 100).toFixed(0)}% match with project requirements`,
            expectedImprovement: (0.8 - skillMatch) * 100,
            confidence: 0.6,
            riskLevel: 'medium'
          });
        }
      }
    }

    // Calculate expected improvement
    const totalImprovement = suggestions.reduce((sum, s) => sum + s.expectedImprovement, 0);
    const avgImprovement = totalImprovement / Math.max(1, suggestions.length);

    // Risk assessment
    const riskAssessment = this.assessOptimizationRisks(suggestions);

    // Implementation plan
    const implementation = this.createImplementationPlan(suggestions);

    return {
      suggestions: suggestions.slice(0, 10).sort((a, b) => b.expectedImprovement - a.expectedImprovement),
      expectedImprovement: avgImprovement,
      riskAssessment,
      implementation
    };
  }

  // Private helper methods with real calculations

  private async calculateEmployeeUtilization(
    employeeMap: Map<number, any[]>,
    startDate: Date,
    endDate: Date
  ): Promise<EmployeeUtilization[]> {
    const result: EmployeeUtilization[] = [];

    for (const [employeeId, assignments] of employeeMap) {
      const weeklyCapacity = parseFloat(assignments[0].weekly_capacity) || 40;
      const totalAllocated = assignments.reduce((sum, a) => sum + (parseFloat(a.allocated_hours) || 0), 0);
      const totalActual = assignments.reduce((sum, a) => sum + (parseFloat(a.actual_hours) || parseFloat(a.allocated_hours) || 0), 0);
      
      const projects = assignments.map(a => ({
        projectId: parseInt(a.project_id),
        projectName: a.project_name || `Project ${a.project_id}`,
        allocatedHours: parseFloat(a.allocated_hours) || 0,
        role: a.role_on_project || 'Team Member'
      }));

      const utilizationRate = totalAllocated / weeklyCapacity;
      const efficiency = totalActual > 0 ? totalAllocated / totalActual : 1;

      result.push({
        employeeId,
        employeeName: assignments[0].employee_name || `Employee ${employeeId}`,
        totalCapacity: weeklyCapacity,
        allocatedHours: totalAllocated,
        actualHours: totalActual,
        utilizationRate,
        efficiency,
        projects
      });
    }

    return result;
  }

  private async calculateProjectUtilization(projectMap: Map<number, any[]>): Promise<ProjectUtilization[]> {
    const result: ProjectUtilization[] = [];

    for (const [projectId, assignments] of projectMap) {
      const plannedHours = assignments.reduce((sum, a) => sum + (parseFloat(a.allocated_hours) || 0), 0);
      const actualHours = assignments.reduce((sum, a) => sum + (parseFloat(a.actual_hours) || parseFloat(a.allocated_hours) || 0), 0);
      const teamSize = new Set(assignments.map(a => a.employee_id)).size;
      
      const efficiency = actualHours > 0 ? plannedHours / actualHours : 1;
      const avgUtilization = assignments.reduce((sum, a) => {
        const allocated = parseFloat(a.allocated_hours) || 0;
        const capacity = parseFloat(a.weekly_capacity) || 40;
        return sum + (allocated / capacity);
      }, 0) / assignments.length;

      result.push({
        projectId,
        projectName: assignments[0].project_name || `Project ${projectId}`,
        plannedHours,
        actualHours,
        efficiency,
        teamSize,
        avgUtilization
      });
    }

    return result;
  }

  private async calculateUtilizationTrends(startDate: Date, endDate: Date): Promise<UtilizationTrend[]> {
    const query = `
      SELECT 
        DATE_TRUNC('month', ra.start_date) as period,
        SUM(ra.allocated_hours) as total_allocated,
        SUM(e.weekly_capacity) as total_capacity
      FROM resource_allocations ra
      JOIN employees e ON ra.employee_id = e.id
      WHERE ra.is_active = true 
      AND e.is_active = true
      AND ra.start_date >= $1 - INTERVAL '6 months'
      AND ra.start_date <= $2
      GROUP BY DATE_TRUNC('month', ra.start_date)
      ORDER BY period
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    const trends: UtilizationTrend[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      const utilization = parseFloat(row.total_allocated) / parseFloat(row.total_capacity);
      const change = i > 0 ? utilization - trends[i - 1].utilization : 0;

      trends.push({
        period: row.period.toISOString().substring(0, 7), // YYYY-MM format
        utilization,
        change
      });
    }

    return trends;
  }

  private calculateCriticalityScore(skill: string, demand: number, highPriorityDemand: number): number {
    // Base score on demand frequency
    let score = demand > 0 ? Math.min(1, demand / 10) : 0;
    
    // Boost score for high-priority project demands
    if (highPriorityDemand > 0) {
      score += (highPriorityDemand / demand) * 0.5;
    }

    return Math.min(1, score);
  }

  private async generateSkillRecommendations(skillGaps: SkillGap[]): Promise<SkillRecommendation[]> {
    const recommendations: SkillRecommendation[] = [];

    for (const gap of skillGaps.slice(0, 8)) { // Top 8 gaps
      if (gap.gapSize === 1 && gap.criticalityScore < 0.7) {
        recommendations.push({
          type: 'train',
          skill: gap.skill,
          priority: gap.criticalityScore > 0.5 ? 'high' : 'medium',
          estimatedCost: 2500,
          timeline: '6-8 weeks',
          reasoning: 'Small gap with moderate criticality - training is cost-effective'
        });
      } else if (gap.gapSize <= 3 && gap.criticalityScore < 0.8) {
        recommendations.push({
          type: 'contract',
          skill: gap.skill,
          priority: gap.criticalityScore > 0.6 ? 'high' : 'medium',
          estimatedCost: 18000,
          timeline: '2-4 weeks',
          reasoning: 'Medium gap - contractor provides quick solution'
        });
      } else {
        recommendations.push({
          type: 'hire',
          skill: gap.skill,
          priority: 'critical',
          estimatedCost: 130000,
          timeline: '8-12 weeks',
          reasoning: 'Large or critical gap requires permanent addition'
        });
      }
    }

    return recommendations;
  }

  private async identifyTrainingNeeds(skillGaps: SkillGap[], employees: any[]): Promise<TrainingNeed[]> {
    const trainingNeeds: TrainingNeed[] = [];

    // Get employees with their current skills
    const employeeSkillsQuery = `
      SELECT 
        e.id,
        e.first_name || ' ' || e.last_name as name,
        STRING_AGG(s.name, ',' ORDER BY s.name) as skills,
        AVG(es.proficiency_level::numeric) as avg_proficiency
      FROM employees e
      LEFT JOIN employee_skills es ON e.id = es.employee_id AND es.is_active = true
      LEFT JOIN skills s ON es.skill_id = s.id
      WHERE e.is_active = true
      GROUP BY e.id, e.first_name, e.last_name
    `;

    const employeesResult = await this.pool.query(employeeSkillsQuery);
    const employeesWithSkills = employeesResult.rows;

    for (const employee of employeesWithSkills) {
      const employeeSkills = employee.skills ? employee.skills.split(',') : [];
      const skillsToTrain: string[] = [];

      // Find skills this employee could be trained on
      for (const gap of skillGaps.slice(0, 5)) { // Top 5 critical gaps
        if (!employeeSkills.includes(gap.skill) && this.canEmployeeLearnSkill(employeeSkills, gap.skill)) {
          skillsToTrain.push(gap.skill);
        }
      }

      if (skillsToTrain.length > 0) {
        const priority = skillsToTrain.length + (parseFloat(employee.avg_proficiency) || 0);
        trainingNeeds.push({
          employeeId: parseInt(employee.id),
          employeeName: employee.name,
          skillsToTrain: skillsToTrain.slice(0, 3), // Limit to 3 skills
          priority: Math.round(priority),
          estimatedDuration: `${skillsToTrain.length * 3} weeks`,
          cost: skillsToTrain.length * 2500
        });
      }
    }

    return trainingNeeds.sort((a, b) => b.priority - a.priority).slice(0, 10);
  }

  private canEmployeeLearnSkill(employeeSkills: string[], skill: string): boolean {
    // Define skill relationships for better recommendations
    const skillRelationships: { [key: string]: string[] } = {
      'React': ['JavaScript', 'TypeScript', 'Vue.js', 'Angular'],
      'Node.js': ['JavaScript', 'TypeScript', 'Express', 'Python'],
      'Python': ['JavaScript', 'Java', 'C#', 'Ruby'],
      'PostgreSQL': ['MySQL', 'MongoDB', 'SQL Server', 'Oracle'],
      'Kubernetes': ['Docker', 'AWS', 'DevOps', 'Linux'],
      'Machine Learning': ['Python', 'Statistics', 'Data Analysis'],
      'DevOps': ['Linux', 'AWS', 'Docker', 'CI/CD']
    };

    const relatedSkills = skillRelationships[skill] || [];
    return relatedSkills.some(relatedSkill => employeeSkills.includes(relatedSkill));
  }

  // Mathematical helper methods (real implementations)
  
  private calculateTrend(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const x = Array.from({ length: n }, (_, i) => i);
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = values.reduce((sum, val) => sum + val, 0) / n;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (values[i] - meanY), 0);
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0);

    return denominator !== 0 ? numerator / denominator : 0;
  }

  private detectSeasonality(historicalData: any[]): SeasonalPattern | undefined {
    if (historicalData.length < 12) return undefined;

    const monthlyValues = new Map<number, number[]>();
    
    historicalData.forEach(data => {
      const date = new Date(data.period || data.month);
      const month = date.getMonth();
      const value = parseFloat(data.total_hours || data.totalHours) || 0;
      
      if (!monthlyValues.has(month)) {
        monthlyValues.set(month, []);
      }
      monthlyValues.get(month)!.push(value);
    });

    // Calculate monthly averages
    const monthlyAverages = new Array(12).fill(0);
    for (let i = 0; i < 12; i++) {
      const values = monthlyValues.get(i) || [0];
      monthlyAverages[i] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    const overallAverage = monthlyAverages.reduce((sum, val) => sum + val, 0) / 12;
    const variance = monthlyAverages.reduce((sum, val) => sum + Math.pow(val - overallAverage, 2), 0) / 12;
    
    if (variance > overallAverage * 0.1) {
      const peakPeriods = monthlyAverages
        .map((avg, i) => ({ month: i, avg }))
        .filter(m => m.avg > overallAverage * 1.15)
        .map(m => new Date(2024, m.month, 1).toLocaleDateString('en', { month: 'long' }));

      const lowPeriods = monthlyAverages
        .map((avg, i) => ({ month: i, avg }))
        .filter(m => m.avg < overallAverage * 0.85)
        .map(m => new Date(2024, m.month, 1).toLocaleDateString('en', { month: 'long' }));

      return {
        pattern: 'monthly',
        peakPeriods,
        lowPeriods
      };
    }

    return undefined;
  }

  private getSeasonalFactor(period: number, pattern: SeasonalPattern): number {
    // Simple seasonal factor based on sine wave
    return 1 + (Math.sin(period * Math.PI / 6) * 0.15);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateForecastConfidence(values: number[], trend: number): number {
    const variance = this.calculateVariance(values);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 1;
    
    let confidence = Math.max(0.5, 1 - coefficientOfVariation);
    if (Math.abs(trend) < mean * 0.05) confidence += 0.1;
    
    return Math.min(1, confidence);
  }

  private classifyTrend(trend: number): 'increasing' | 'decreasing' | 'stable' | 'seasonal' {
    if (Math.abs(trend) < 5) return 'stable';
    return trend > 0 ? 'increasing' : 'decreasing';
  }

  private calculateSkillMatchScore(employeeSkills: string[], requiredSkills: string[]): number {
    if (requiredSkills.length === 0) return 1;
    const matches = requiredSkills.filter(skill => employeeSkills.includes(skill));
    return matches.length / requiredSkills.length;
  }

  private assessOptimizationRisks(suggestions: OptimizationSuggestion[]): RiskAssessment {
    const risks: Risk[] = [];
    
    const highRiskSuggestions = suggestions.filter(s => s.riskLevel === 'high').length;
    const reassignments = suggestions.filter(s => s.type === 'reassignment').length;
    const largeAdjustments = suggestions.filter(s => 
      s.type === 'capacity_adjustment' && Math.abs(s.adjustment || 0) > 15
    ).length;

    if (reassignments > 3) {
      risks.push({
        type: 'organizational_disruption',
        description: `${reassignments} employee reassignments may disrupt team dynamics`,
        impact: 'medium',
        probability: 0.7
      });
    }

    if (largeAdjustments > 2) {
      risks.push({
        type: 'delivery_risk',
        description: `${largeAdjustments} large capacity changes may affect delivery timelines`,
        impact: 'high',
        probability: 0.6
      });
    }

    if (highRiskSuggestions > 1) {
      risks.push({
        type: 'implementation_difficulty',
        description: `${highRiskSuggestions} high-risk changes require careful management`,
        impact: 'medium',
        probability: 0.8
      });
    }

    const overallRisk: 'low' | 'medium' | 'high' = 
      highRiskSuggestions > 2 || risks.length > 2 ? 'high' :
      risks.length > 0 ? 'medium' : 'low';

    return {
      overallRisk,
      risks,
      mitigationStrategies: [
        'Phase implementation over 4-6 weeks',
        'Monitor team satisfaction and productivity metrics',
        'Maintain rollback plans for critical changes',
        'Regular check-ins with affected team members'
      ]
    };
  }

  private createImplementationPlan(suggestions: OptimizationSuggestion[]): ImplementationPlan {
    const lowRisk = suggestions.filter(s => s.riskLevel === 'low');
    const mediumRisk = suggestions.filter(s => s.riskLevel === 'medium');
    const highRisk = suggestions.filter(s => s.riskLevel === 'high');

    return {
      phases: [
        {
          phase: 1,
          description: 'Low-risk capacity adjustments',
          actions: lowRisk.map(s => `${s.type} for employee ${s.employeeId}: ${s.reason}`),
          duration: '1-2 weeks'
        },
        {
          phase: 2,
          description: 'Medium-risk optimizations',
          actions: mediumRisk.map(s => `${s.type} for employee ${s.employeeId}: ${s.reason}`),
          duration: '2-3 weeks'
        },
        {
          phase: 3,
          description: 'High-risk strategic changes',
          actions: highRisk.map(s => `${s.type} for employee ${s.employeeId}: ${s.reason}`),
          duration: '3-4 weeks'
        }
      ].filter(phase => phase.actions.length > 0),
      timeline: '4-6 weeks total',
      dependencies: [
        'Management approval for resource changes',
        'Employee consultation and agreement',
        'Project manager coordination',
        'HR policy compliance verification'
      ]
    };
  }
}
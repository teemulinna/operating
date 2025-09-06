import { ResourceAssignmentService } from './resource-assignment.service';
import { CapacityEngineService } from './capacity-engine.service';

export interface UtilizationReport {
  overallUtilization: number;
  employeeUtilization: EmployeeUtilization[];
  projectUtilization: ProjectUtilization[];
  underUtilized: EmployeeUtilization[];
  overUtilized: EmployeeUtilization[];
  trends: UtilizationTrend[];
}

export interface EmployeeUtilization {
  employeeId: number;
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
  employeeId: number;
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
  employeeId: number;
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
  constructor(
    private resourceAssignmentService: ResourceAssignmentService,
    private capacityEngine: CapacityEngineService
  ) {}

  async generateUtilizationReport(startDate: Date, endDate: Date): Promise<UtilizationReport> {
    const assignments = await this.resourceAssignmentService.getAssignmentsInPeriod(startDate, endDate);
    
    // Group assignments by employee and project
    const employeeMap = new Map<number, any[]>();
    const projectMap = new Map<number, any[]>();

    assignments.forEach(assignment => {
      // Employee grouping
      if (!employeeMap.has(assignment.employeeId)) {
        employeeMap.set(assignment.employeeId, []);
      }
      employeeMap.get(assignment.employeeId)!.push(assignment);

      // Project grouping
      if (!projectMap.has(assignment.projectId)) {
        projectMap.set(assignment.projectId, []);
      }
      projectMap.get(assignment.projectId)!.push(assignment);
    });

    // Calculate employee utilization
    const employeeUtilization = await this.calculateEmployeeUtilization(employeeMap, startDate, endDate);
    
    // Calculate project utilization
    const projectUtilization = await this.calculateProjectUtilization(projectMap);

    // Calculate overall utilization
    const totalCapacity = employeeUtilization.reduce((sum, emp) => sum + emp.totalCapacity, 0);
    const totalAllocated = employeeUtilization.reduce((sum, emp) => sum + emp.allocatedHours, 0);
    const overallUtilization = totalAllocated / totalCapacity;

    // Identify under/over-utilized employees
    const underUtilized = employeeUtilization.filter(emp => emp.utilizationRate < 0.7);
    const overUtilized = employeeUtilization.filter(emp => emp.utilizationRate > 1.0);

    // Calculate trends (simplified - would need historical data)
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
    // Collect all required skills from projects
    const skillDemand = new Map<string, number>();
    const skillSupply = new Map<string, number>();

    projects.forEach(project => {
      const requiredSkills = project.requiredSkills || [];
      requiredSkills.forEach(skill => {
        skillDemand.set(skill, (skillDemand.get(skill) || 0) + 1);
      });
    });

    // Count available skills from employees
    employees.forEach(employee => {
      const skills = employee.skills || [];
      skills.forEach(skill => {
        skillSupply.set(skill, (skillSupply.get(skill) || 0) + 1);
      });
    });

    // Calculate skill gaps
    const skillGaps: SkillGap[] = [];
    skillDemand.forEach((demand, skill) => {
      const available = skillSupply.get(skill) || 0;
      const gapSize = Math.max(0, demand - available);
      
      if (gapSize > 0) {
        skillGaps.push({
          skill,
          demandCount: demand,
          availableCount: available,
          gapSize,
          criticalityScore: this.calculateCriticalityScore(skill, demand, projects)
        });
      }
    });

    // Sort by criticality
    skillGaps.sort((a, b) => b.criticalityScore - a.criticalityScore);

    // Generate recommendations
    const recommendations = await this.generateSkillRecommendations(skillGaps);
    
    // Identify critical missing skills
    const criticalMissingSkills = skillGaps
      .filter(gap => gap.criticalityScore >= 0.8)
      .map(gap => gap.skill);

    // Generate training needs
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

    // Simple linear regression for trend analysis
    const periods = historicalData.length;
    const values = historicalData.map(d => d.totalHours);
    const trend = this.calculateTrend(values);

    // Detect seasonality
    const seasonalPattern = this.detectSeasonality(historicalData);

    // Generate predictions
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
      const confidence = Math.max(0.5, 1 - (i * 0.1));
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

    // Analyze current allocations for optimization opportunities
    for (const allocation of currentAllocations) {
      // Check for skill mismatches
      if (allocation.skills && allocation.requiredSkills) {
        const skillMatch = this.calculateSkillMatchScore(allocation.skills, allocation.requiredSkills);
        if (skillMatch < 0.7) {
          suggestions.push({
            type: 'reassignment',
            employeeId: allocation.employeeId,
            fromProjectId: allocation.projectId,
            toProjectId: await this.findBetterSkillMatch(allocation.employeeId, allocation.skills),
            reason: `skill mismatch (${Math.round(skillMatch * 100)}% match)`,
            expectedImprovement: (0.7 - skillMatch) * 100,
            confidence: 0.8,
            riskLevel: 'low'
          });
        }
      }

      // Check for over/under-allocation
      if (allocation.efficiency < 0.8) {
        const adjustment = this.calculateOptimalAdjustment(allocation);
        suggestions.push({
          type: 'capacity_adjustment',
          employeeId: allocation.employeeId,
          adjustment,
          reason: `low efficiency (${Math.round(allocation.efficiency * 100)}%)`,
          expectedImprovement: (0.8 - allocation.efficiency) * 100,
          confidence: 0.7,
          riskLevel: adjustment > 10 ? 'medium' : 'low'
        });
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
      suggestions: suggestions.slice(0, 10), // Limit to top 10 suggestions
      expectedImprovement: avgImprovement,
      riskAssessment,
      implementation
    };
  }

  private async calculateEmployeeUtilization(
    employeeMap: Map<number, any[]>,
    startDate: Date,
    endDate: Date
  ): Promise<EmployeeUtilization[]> {
    const result: EmployeeUtilization[] = [];

    for (const [employeeId, assignments] of employeeMap) {
      const availability = await this.capacityEngine.calculateEmployeeAvailability(
        employeeId,
        startDate,
        endDate
      );

      const totalAllocated = assignments.reduce((sum, a) => sum + (a.allocatedHours || 0), 0);
      const totalActual = assignments.reduce((sum, a) => sum + (a.actualHours || a.allocatedHours || 0), 0);
      
      const projects = assignments.map(a => ({
        projectId: a.projectId,
        projectName: a.projectName || `Project ${a.projectId}`,
        allocatedHours: a.allocatedHours || 0,
        role: a.role || 'Developer'
      }));

      result.push({
        employeeId,
        employeeName: assignments[0].employeeName || `Employee ${employeeId}`,
        totalCapacity: availability.totalHours,
        allocatedHours: totalAllocated,
        actualHours: totalActual,
        utilizationRate: availability.utilizationRate,
        efficiency: totalActual > 0 ? totalAllocated / totalActual : 1,
        projects
      });
    }

    return result;
  }

  private async calculateProjectUtilization(projectMap: Map<number, any[]>): Promise<ProjectUtilization[]> {
    const result: ProjectUtilization[] = [];

    for (const [projectId, assignments] of projectMap) {
      const plannedHours = assignments.reduce((sum, a) => sum + (a.allocatedHours || 0), 0);
      const actualHours = assignments.reduce((sum, a) => sum + (a.actualHours || a.allocatedHours || 0), 0);
      const teamSize = new Set(assignments.map(a => a.employeeId)).size;
      
      const avgUtilization = assignments.reduce((sum, a) => {
        const util = a.actualHours ? a.allocatedHours / a.actualHours : 1;
        return sum + util;
      }, 0) / assignments.length;

      result.push({
        projectId,
        projectName: assignments[0].projectName || `Project ${projectId}`,
        plannedHours,
        actualHours,
        efficiency: actualHours > 0 ? plannedHours / actualHours : 1,
        teamSize,
        avgUtilization
      });
    }

    return result;
  }

  private async calculateUtilizationTrends(startDate: Date, endDate: Date): Promise<UtilizationTrend[]> {
    // Simplified trend calculation - would need more sophisticated time series analysis
    const trends: UtilizationTrend[] = [];
    const current = new Date(startDate);
    const monthMs = 30 * 24 * 60 * 60 * 1000;

    while (current < endDate) {
      const periodEnd = new Date(Math.min(current.getTime() + monthMs, endDate.getTime()));
      const periodAssignments = await this.resourceAssignmentService.getAssignmentsInPeriod(current, periodEnd);
      
      const totalHours = periodAssignments.reduce((sum, a) => sum + (a.allocatedHours || 0), 0);
      const utilization = totalHours / (160 * 10); // Assuming 10 employees at 160h/month

      trends.push({
        period: current.toISOString().substring(0, 7),
        utilization,
        change: 0 // Would calculate based on previous period
      });

      current.setTime(current.getTime() + monthMs);
    }

    // Calculate changes
    for (let i = 1; i < trends.length; i++) {
      trends[i].change = trends[i].utilization - trends[i - 1].utilization;
    }

    return trends;
  }

  private calculateCriticalityScore(skill: string, demand: number, projects: any[]): number {
    let score = demand / projects.length; // Base score on demand frequency
    
    // Adjust based on project priority
    const highPriorityProjects = projects.filter(p => 
      (p.requiredSkills || []).includes(skill) && p.priority === 'high'
    ).length;
    
    score += (highPriorityProjects / projects.length) * 0.5;

    return Math.min(1, score);
  }

  private async generateSkillRecommendations(skillGaps: SkillGap[]): Promise<SkillRecommendation[]> {
    const recommendations: SkillRecommendation[] = [];

    for (const gap of skillGaps.slice(0, 5)) { // Top 5 gaps
      if (gap.gapSize === 1 && gap.criticalityScore < 0.7) {
        // Training existing employee
        recommendations.push({
          type: 'train',
          skill: gap.skill,
          priority: gap.criticalityScore > 0.5 ? 'high' : 'medium',
          estimatedCost: 2000,
          timeline: '2-3 months',
          reasoning: 'Small gap, training existing staff is cost-effective'
        });
      } else if (gap.gapSize <= 2) {
        // Contract worker
        recommendations.push({
          type: 'contract',
          skill: gap.skill,
          priority: gap.criticalityScore > 0.7 ? 'critical' : 'high',
          estimatedCost: 15000,
          timeline: '1-2 weeks',
          reasoning: 'Medium gap, contractor for quick solution'
        });
      } else {
        // Full-time hire
        recommendations.push({
          type: 'hire',
          skill: gap.skill,
          priority: 'critical',
          estimatedCost: 120000,
          timeline: '2-3 months',
          reasoning: 'Large gap, requires permanent addition'
        });
      }
    }

    return recommendations;
  }

  private async identifyTrainingNeeds(skillGaps: SkillGap[], employees: any[]): Promise<TrainingNeed[]> {
    const trainingNeeds: TrainingNeed[] = [];

    for (const employee of employees) {
      const employeeSkills = employee.skills || [];
      const skillsToTrain: string[] = [];

      // Find skills this employee could be trained on
      for (const gap of skillGaps) {
        if (!employeeSkills.includes(gap.skill) && this.canEmployeeLearnSkill(employee, gap.skill)) {
          skillsToTrain.push(gap.skill);
        }
      }

      if (skillsToTrain.length > 0) {
        trainingNeeds.push({
          employeeId: employee.id,
          employeeName: employee.name,
          skillsToTrain: skillsToTrain.slice(0, 3), // Limit to 3 skills
          priority: skillsToTrain.length,
          estimatedDuration: `${skillsToTrain.length * 2} weeks`,
          cost: skillsToTrain.length * 2000
        });
      }
    }

    return trainingNeeds.sort((a, b) => b.priority - a.priority);
  }

  private canEmployeeLearnSkill(employee: any, skill: string): boolean {
    // Simplified logic - in reality would consider employee's background, role, etc.
    const employeeSkills = employee.skills || [];
    
    // Check if employee has related skills
    const relatedSkills = {
      'React': ['JavaScript', 'TypeScript', 'Vue.js'],
      'Node.js': ['JavaScript', 'TypeScript', 'Express'],
      'Python': ['JavaScript', 'Java', 'C#'],
      'PostgreSQL': ['MySQL', 'MongoDB', 'SQL Server'],
      'Kubernetes': ['Docker', 'AWS', 'DevOps']
    };

    const related = relatedSkills[skill] || [];
    return related.some(relatedSkill => employeeSkills.includes(relatedSkill));
  }

  private calculateTrend(values: number[]): number {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = values.reduce((sum, val) => sum + val, 0) / n;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (values[i] - meanY), 0);
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0);

    return denominator !== 0 ? numerator / denominator : 0;
  }

  private detectSeasonality(historicalData: any[]): SeasonalPattern | undefined {
    if (historicalData.length < 12) return undefined;

    // Simple seasonality detection - would use more sophisticated algorithms in practice
    const monthlyAverages = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);

    historicalData.forEach(data => {
      const month = new Date(data.month + '-01').getMonth();
      monthlyAverages[month] += data.totalHours;
      monthlyCounts[month]++;
    });

    for (let i = 0; i < 12; i++) {
      if (monthlyCounts[i] > 0) {
        monthlyAverages[i] /= monthlyCounts[i];
      }
    }

    const overallAverage = monthlyAverages.reduce((sum, val) => sum + val, 0) / 12;
    const variance = monthlyAverages.reduce((sum, val) => sum + Math.pow(val - overallAverage, 2), 0) / 12;
    
    if (variance > overallAverage * 0.1) { // Significant seasonal variation
      const peakPeriods = monthlyAverages
        .map((avg, i) => ({ month: i, avg }))
        .filter(m => m.avg > overallAverage * 1.1)
        .map(m => new Date(2024, m.month, 1).toLocaleDateString('en', { month: 'long' }));

      const lowPeriods = monthlyAverages
        .map((avg, i) => ({ month: i, avg }))
        .filter(m => m.avg < overallAverage * 0.9)
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
    // Simplified seasonal factor calculation
    return 1 + (Math.sin(period * Math.PI / 6) * 0.1); // 10% seasonal variation
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateForecastConfidence(values: number[], trend: number): number {
    const variance = this.calculateVariance(values);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    // Higher confidence for lower variation and stable trends
    let confidence = Math.max(0.5, 1 - coefficientOfVariation);
    if (Math.abs(trend) < mean * 0.05) confidence += 0.1; // Bonus for stable trend
    
    return Math.min(1, confidence);
  }

  private classifyTrend(trend: number): 'increasing' | 'decreasing' | 'stable' | 'seasonal' {
    if (Math.abs(trend) < 5) return 'stable';
    return trend > 0 ? 'increasing' : 'decreasing';
  }

  private calculateSkillMatchScore(skills: string[], requiredSkills: string[]): number {
    const matches = requiredSkills.filter(skill => skills.includes(skill));
    return matches.length / requiredSkills.length;
  }

  private async findBetterSkillMatch(employeeId: number, skills: string[]): Promise<number> {
    // Simplified - would query projects that better match the employee's skills
    return Math.floor(Math.random() * 10) + 1; // Placeholder
  }

  private calculateOptimalAdjustment(allocation: any): number {
    // Calculate how much to adjust allocation based on efficiency
    const targetEfficiency = 0.8;
    const currentEfficiency = allocation.efficiency;
    const currentHours = allocation.allocatedHours || 40;
    
    return Math.round((targetEfficiency - currentEfficiency) * currentHours);
  }

  private assessOptimizationRisks(suggestions: OptimizationSuggestion[]): RiskAssessment {
    const risks: Risk[] = [];
    
    // High-impact reassignments
    const reassignments = suggestions.filter(s => s.type === 'reassignment');
    if (reassignments.length > 3) {
      risks.push({
        type: 'organizational_disruption',
        description: 'Multiple reassignments may disrupt team dynamics',
        impact: 'medium',
        probability: 0.7
      });
    }

    // Large capacity adjustments
    const largeAdjustments = suggestions.filter(s => 
      s.type === 'capacity_adjustment' && Math.abs(s.adjustment || 0) > 10
    );
    if (largeAdjustments.length > 0) {
      risks.push({
        type: 'delivery_risk',
        description: 'Large capacity changes may affect delivery timelines',
        impact: 'high',
        probability: 0.5
      });
    }

    const overallRisk = risks.length > 2 ? 'high' : risks.length > 0 ? 'medium' : 'low';

    return {
      overallRisk,
      risks,
      mitigationStrategies: [
        'Implement changes gradually over 2-4 weeks',
        'Monitor team satisfaction and productivity closely',
        'Have rollback plan ready for critical changes'
      ]
    };
  }

  private createImplementationPlan(suggestions: OptimizationSuggestion[]): ImplementationPlan {
    return {
      phases: [
        {
          phase: 1,
          description: 'Low-risk adjustments',
          actions: suggestions
            .filter(s => s.riskLevel === 'low')
            .map(s => `Implement ${s.type} for employee ${s.employeeId}`),
          duration: '1 week'
        },
        {
          phase: 2,
          description: 'Medium-risk changes',
          actions: suggestions
            .filter(s => s.riskLevel === 'medium')
            .map(s => `Implement ${s.type} for employee ${s.employeeId}`),
          duration: '2 weeks'
        }
      ],
      timeline: '3 weeks',
      dependencies: ['Team lead approval', 'Employee consent', 'Project manager coordination']
    };
  }
}
import { DemandPredictor, ProjectPhase, DemandPrediction } from './demand-predictor';
import { ARIMAForecaster, TimeSeriesData } from './time-series-models';

export interface ScenarioParameter {
  id: string;
  name: string;
  type: 'number' | 'percentage' | 'date' | 'boolean' | 'selection';
  value: any;
  min?: number;
  max?: number;
  options?: string[];
  description: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  parameters: ScenarioParameter[];
  projects: ScenarioProject[];
  constraints: ScenarioConstraint[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioProject {
  id: string;
  name: string;
  phases: ProjectPhase[];
  startDate: Date;
  endDate: Date;
  teamSize: number;
  budget: number;
  probability: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[]; // Other project IDs
}

export interface ScenarioConstraint {
  id: string;
  type: 'resource_limit' | 'budget_limit' | 'timeline' | 'skill_availability';
  parameters: Record<string, any>;
  severity: 'warning' | 'error';
}

export interface ScenarioResult {
  scenarioId: string;
  demandPrediction: DemandPrediction;
  resourceUtilization: UtilizationMetrics;
  constraints: ConstraintViolation[];
  recommendations: Recommendation[];
  riskAssessment: RiskAssessment;
  costAnalysis: CostAnalysis;
  timeline: TimelineAnalysis;
}

export interface UtilizationMetrics {
  overall: number[];
  bySkill: Record<string, number[]>;
  peaks: Array<{ date: Date; utilization: number; severity: 'low' | 'medium' | 'high' }>;
  underutilized: Array<{ skill: string; percentage: number; days: number }>;
  overallocated: Array<{ skill: string; percentage: number; days: number }>;
}

export interface ConstraintViolation {
  constraintId: string;
  severity: 'warning' | 'error';
  description: string;
  impactedProjects: string[];
  suggestedActions: string[];
  estimatedCost?: number;
}

export interface Recommendation {
  id: string;
  type: 'resource_adjustment' | 'timeline_change' | 'budget_reallocation' | 'skill_development';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  expectedBenefit: string;
  implementation: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: Array<{
    category: string;
    description: string;
    probability: number;
    impact: number;
    mitigation: string[];
  }>;
  monteCarlo: MonteCarloResult;
}

export interface MonteCarloResult {
  iterations: number;
  successProbability: number;
  estimatedDuration: { min: number; max: number; mean: number; std: number };
  estimatedCost: { min: number; max: number; mean: number; std: number };
  criticalPath: string[];
}

export interface CostAnalysis {
  totalBudget: number;
  projectedCost: number[];
  budgetVariance: number;
  costByProject: Record<string, number>;
  costBySkill: Record<string, number>;
  riskBuffer: number;
}

export interface TimelineAnalysis {
  projectTimelines: Array<{
    projectId: string;
    plannedStart: Date;
    plannedEnd: Date;
    estimatedStart: Date;
    estimatedEnd: Date;
    delays: number;
    criticalPath: boolean;
  }>;
  milestones: Array<{
    id: string;
    name: string;
    date: Date;
    dependencies: string[];
    risk: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Advanced What-If Scenario Simulator
 * Provides interactive modeling and analysis of different capacity scenarios
 */
export class ScenarioSimulator {
  private demandPredictor: DemandPredictor;
  private forecastModel: ARIMAForecaster;
  private baselineCapacity: Record<string, number> = {};
  private scenarios: Map<string, Scenario> = new Map();

  constructor(demandPredictor: DemandPredictor) {
    this.demandPredictor = demandPredictor;
    this.forecastModel = new ARIMAForecaster();
  }

  /**
   * Set baseline capacity constraints
   */
  setBaselineCapacity(capacity: Record<string, number>): void {
    this.baselineCapacity = { ...capacity };
  }

  /**
   * Create a new scenario
   */
  createScenario(
    name: string,
    description: string,
    projects: ScenarioProject[],
    constraints: ScenarioConstraint[] = []
  ): Scenario {
    const scenario: Scenario = {
      id: this.generateId(),
      name,
      description,
      parameters: this.generateDefaultParameters(projects),
      projects: [...projects],
      constraints: [...constraints],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.scenarios.set(scenario.id, scenario);
    return scenario;
  }

  /**
   * Update scenario parameters
   */
  updateScenario(scenarioId: string, updates: Partial<Scenario>): Scenario {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    Object.assign(scenario, updates, { updatedAt: new Date() });
    this.scenarios.set(scenarioId, scenario);
    return scenario;
  }

  /**
   * Run comprehensive scenario simulation
   */
  async runScenario(scenarioId: string, timeHorizon: number = 365): Promise<ScenarioResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    // Apply parameter modifications to projects
    const modifiedProjects = this.applyParameterChanges(scenario);

    // Generate demand prediction
    const demandPrediction = await this.demandPredictor.predictDemand(
      modifiedProjects.map(p => ({
        id: p.id,
        phases: p.phases,
        startDate: p.startDate,
        teamSize: p.teamSize,
        budget: p.budget,
        probability: p.probability
      })),
      timeHorizon
    );

    // Calculate resource utilization
    const resourceUtilization = this.calculateUtilization(demandPrediction, timeHorizon);

    // Check constraint violations
    const constraintViolations = this.checkConstraints(scenario, demandPrediction, resourceUtilization);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      scenario, 
      demandPrediction, 
      resourceUtilization, 
      constraintViolations
    );

    // Perform risk assessment with Monte Carlo simulation
    const riskAssessment = await this.performRiskAssessment(scenario, modifiedProjects);

    // Analyze costs
    const costAnalysis = this.analyzeCosts(scenario, modifiedProjects, demandPrediction);

    // Analyze timeline
    const timelineAnalysis = this.analyzeTimeline(modifiedProjects, demandPrediction);

    return {
      scenarioId,
      demandPrediction,
      resourceUtilization,
      constraints: constraintViolations,
      recommendations,
      riskAssessment,
      costAnalysis,
      timeline: timelineAnalysis
    };
  }

  /**
   * Compare multiple scenarios
   */
  async compareScenarios(
    scenarioIds: string[], 
    metrics: string[] = ['cost', 'timeline', 'risk', 'utilization']
  ): Promise<{
    scenarios: ScenarioResult[];
    comparison: Record<string, any>;
    recommendations: string[];
  }> {
    const results = await Promise.all(
      scenarioIds.map(id => this.runScenario(id))
    );

    const comparison: Record<string, any> = {};

    // Compare costs
    if (metrics.includes('cost')) {
      comparison.cost = results.map(r => ({
        scenarioId: r.scenarioId,
        totalCost: r.costAnalysis.projectedCost.reduce((sum, cost) => sum + cost, 0),
        budgetVariance: r.costAnalysis.budgetVariance
      }));
    }

    // Compare timelines
    if (metrics.includes('timeline')) {
      comparison.timeline = results.map(r => ({
        scenarioId: r.scenarioId,
        avgDelay: r.timeline.projectTimelines.reduce((sum, p) => sum + p.delays, 0) / 
                  r.timeline.projectTimelines.length,
        criticalPathProjects: r.timeline.projectTimelines.filter(p => p.criticalPath).length
      }));
    }

    // Compare risk
    if (metrics.includes('risk')) {
      comparison.risk = results.map(r => ({
        scenarioId: r.scenarioId,
        overallRisk: r.riskAssessment.overallRisk,
        successProbability: r.riskAssessment.monteCarlo.successProbability
      }));
    }

    // Compare utilization
    if (metrics.includes('utilization')) {
      comparison.utilization = results.map(r => ({
        scenarioId: r.scenarioId,
        avgUtilization: r.resourceUtilization.overall.reduce((sum, u) => sum + u, 0) / 
                       r.resourceUtilization.overall.length,
        peakUtilization: Math.max(...r.resourceUtilization.overall),
        overallocationDays: r.resourceUtilization.overallocated.reduce((sum, o) => sum + o.days, 0)
      }));
    }

    const recommendations = this.generateComparisonRecommendations(results, comparison);

    return {
      scenarios: results,
      comparison,
      recommendations
    };
  }

  /**
   * Generate sensitivity analysis for scenario parameters
   */
  async runSensitivityAnalysis(
    scenarioId: string,
    parameterIds: string[],
    variations: number[] = [-0.2, -0.1, 0, 0.1, 0.2]
  ): Promise<{
    parameter: string;
    variations: Array<{
      change: number;
      result: Partial<ScenarioResult>;
    }>;
    sensitivity: number; // How much output changes per unit input change
  }[]> {
    const baseResult = await this.runScenario(scenarioId);
    const sensitivityResults: any[] = [];

    for (const paramId of parameterIds) {
      const paramVariations = [];
      let totalVariation = 0;

      for (const variation of variations) {
        const modifiedScenario = this.createParameterVariation(scenarioId, paramId, variation);
        const result = await this.runScenario(modifiedScenario.id);
        
        // Calculate key metric changes
        const metricChange = this.calculateMetricChange(baseResult, result);
        totalVariation += Math.abs(metricChange);
        
        paramVariations.push({
          change: variation,
          result: {
            demandPrediction: result.demandPrediction,
            resourceUtilization: result.resourceUtilization,
            costAnalysis: result.costAnalysis
          }
        });

        // Clean up temporary scenario
        this.scenarios.delete(modifiedScenario.id);
      }

      sensitivityResults.push({
        parameter: paramId,
        variations: paramVariations,
        sensitivity: totalVariation / variations.length
      });
    }

    return sensitivityResults;
  }

  /**
   * Optimize scenario parameters using genetic algorithm
   */
  async optimizeScenario(
    scenarioId: string,
    objectives: string[] = ['minimize_cost', 'minimize_timeline', 'minimize_risk'],
    constraints: string[] = [],
    generations: number = 50
  ): Promise<{
    optimizedScenario: Scenario;
    improvements: Record<string, number>;
    convergenceHistory: number[][];
  }> {
    const originalScenario = this.scenarios.get(scenarioId);
    if (!originalScenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    // Initialize population
    const populationSize = 20;
    const population = this.initializePopulation(originalScenario, populationSize);
    const convergenceHistory: number[][] = [];

    for (let generation = 0; generation < generations; generation++) {
      // Evaluate fitness for each individual
      const fitness = await Promise.all(
        population.map(individual => this.evaluateFitness(individual, objectives, constraints))
      );

      // Track convergence
      const bestFitness = Math.max(...fitness);
      const avgFitness = fitness.reduce((sum, f) => sum + f, 0) / fitness.length;
      convergenceHistory.push([generation, bestFitness, avgFitness]);

      // Selection and reproduction
      const newPopulation = this.geneticOperations(population, fitness);
      population.splice(0, population.length, ...newPopulation);

      // Early termination if converged
      if (generation > 10 && this.hasConverged(convergenceHistory.slice(-10))) {
        break;
      }
    }

    // Select best individual
    const finalFitness = await Promise.all(
      population.map(individual => this.evaluateFitness(individual, objectives, constraints))
    );
    const bestIndex = finalFitness.indexOf(Math.max(...finalFitness));
    const optimizedScenario = population[bestIndex];

    // Calculate improvements
    const originalResult = await this.runScenario(scenarioId);
    const optimizedResult = await this.runScenario(optimizedScenario.id);
    const improvements = this.calculateImprovements(originalResult, optimizedResult);

    return {
      optimizedScenario,
      improvements,
      convergenceHistory
    };
  }

  // Private helper methods

  private generateDefaultParameters(projects: ScenarioProject[]): ScenarioParameter[] {
    const parameters: ScenarioParameter[] = [
      {
        id: 'team_size_multiplier',
        name: 'Team Size Multiplier',
        type: 'percentage',
        value: 1.0,
        min: 0.5,
        max: 2.0,
        description: 'Multiply all project team sizes by this factor'
      },
      {
        id: 'timeline_buffer',
        name: 'Timeline Buffer',
        type: 'percentage',
        value: 0.0,
        min: 0.0,
        max: 0.5,
        description: 'Add buffer time to all project phases'
      },
      {
        id: 'budget_constraint',
        name: 'Budget Constraint',
        type: 'percentage',
        value: 1.0,
        min: 0.5,
        max: 1.5,
        description: 'Available budget as percentage of total project budgets'
      },
      {
        id: 'skill_availability',
        name: 'Skill Availability',
        type: 'percentage',
        value: 1.0,
        min: 0.5,
        max: 2.0,
        description: 'Skill availability multiplier'
      }
    ];

    // Add project-specific parameters
    projects.forEach(project => {
      parameters.push({
        id: `project_${project.id}_probability`,
        name: `${project.name} Probability`,
        type: 'percentage',
        value: project.probability,
        min: 0.0,
        max: 1.0,
        description: `Probability that ${project.name} will proceed`
      });
    });

    return parameters;
  }

  private applyParameterChanges(scenario: Scenario): ScenarioProject[] {
    const projects = [...scenario.projects];
    
    for (const param of scenario.parameters) {
      switch (param.id) {
        case 'team_size_multiplier':
          projects.forEach(p => p.teamSize = Math.round(p.teamSize * param.value));
          break;
        case 'timeline_buffer':
          projects.forEach(p => {
            p.phases.forEach(phase => {
              phase.duration = Math.round(phase.duration * (1 + param.value));
            });
          });
          break;
        default:
          if (param.id.startsWith('project_') && param.id.endsWith('_probability')) {
            const projectId = param.id.replace('project_', '').replace('_probability', '');
            const project = projects.find(p => p.id === projectId);
            if (project) {
              project.probability = param.value;
            }
          }
      }
    }

    return projects;
  }

  private calculateUtilization(prediction: DemandPrediction, timeHorizon: number): UtilizationMetrics {
    const utilization: UtilizationMetrics = {
      overall: [],
      bySkill: {},
      peaks: [],
      underutilized: [],
      overallocated: []
    };

    // Calculate overall utilization
    for (let day = 0; day < timeHorizon; day++) {
      const totalCapacity = Object.values(this.baselineCapacity).reduce((sum, cap) => sum + cap, 0);
      const totalDemand = prediction.totalDemand[day];
      utilization.overall.push(totalCapacity > 0 ? totalDemand / totalCapacity : 0);
    }

    // Calculate by-skill utilization
    for (const [skill, demand] of Object.entries(prediction.bySkill)) {
      const skillCapacity = this.baselineCapacity[skill] || 0;
      utilization.bySkill[skill] = demand.map(d => skillCapacity > 0 ? d / skillCapacity : 0);
    }

    // Identify peaks, underutilization, and overallocation
    this.identifyUtilizationIssues(utilization);

    return utilization;
  }

  private identifyUtilizationIssues(utilization: UtilizationMetrics): void {
    // Identify utilization peaks
    const peakThreshold = 0.9;
    utilization.overall.forEach((util, day) => {
      if (util > peakThreshold) {
        const severity = util > 1.2 ? 'high' : util > 1.0 ? 'medium' : 'low';
        utilization.peaks.push({
          date: new Date(Date.now() + day * 24 * 60 * 60 * 1000),
          utilization: util,
          severity: severity as 'low' | 'medium' | 'high'
        });
      }
    });

    // Identify underutilized skills
    for (const [skill, skillUtil] of Object.entries(utilization.bySkill)) {
      const avgUtil = skillUtil.reduce((sum, u) => sum + u, 0) / skillUtil.length;
      if (avgUtil < 0.5) {
        const underutilizedDays = skillUtil.filter(u => u < 0.5).length;
        utilization.underutilized.push({
          skill,
          percentage: (1 - avgUtil) * 100,
          days: underutilizedDays
        });
      }
    }

    // Identify overallocated skills
    for (const [skill, skillUtil] of Object.entries(utilization.bySkill)) {
      const overallocatedDays = skillUtil.filter(u => u > 1.0).length;
      if (overallocatedDays > 0) {
        const avgOverallocation = skillUtil
          .filter(u => u > 1.0)
          .reduce((sum, u) => sum + (u - 1.0), 0) / overallocatedDays;
        
        utilization.overallocated.push({
          skill,
          percentage: avgOverallocation * 100,
          days: overallocatedDays
        });
      }
    }
  }

  private checkConstraints(
    scenario: Scenario,
    prediction: DemandPrediction,
    utilization: UtilizationMetrics
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const constraint of scenario.constraints) {
      switch (constraint.type) {
        case 'resource_limit':
          const resourceViolations = this.checkResourceConstraints(constraint, utilization);
          violations.push(...resourceViolations);
          break;
        case 'budget_limit':
          // Implementation for budget constraints
          break;
        case 'timeline':
          // Implementation for timeline constraints
          break;
        case 'skill_availability':
          // Implementation for skill availability constraints
          break;
      }
    }

    return violations;
  }

  private checkResourceConstraints(
    constraint: ScenarioConstraint,
    utilization: UtilizationMetrics
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    // Check if any skill exceeds capacity limits
    for (const [skill, skillUtil] of Object.entries(utilization.bySkill)) {
      const maxUtil = Math.max(...skillUtil);
      if (maxUtil > 1.0) {
        violations.push({
          constraintId: constraint.id,
          severity: maxUtil > 1.2 ? 'error' : 'warning',
          description: `${skill} overallocated by ${((maxUtil - 1) * 100).toFixed(1)}%`,
          impactedProjects: [], // Would identify specific projects
          suggestedActions: [
            'Hire additional resources',
            'Extend project timelines',
            'Redistribute workload'
          ]
        });
      }
    }

    return violations;
  }

  private generateRecommendations(
    scenario: Scenario,
    prediction: DemandPrediction,
    utilization: UtilizationMetrics,
    violations: ConstraintViolation[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Resource optimization recommendations
    if (utilization.overallocated.length > 0) {
      recommendations.push({
        id: 'resource_rebalancing',
        type: 'resource_adjustment',
        description: 'Rebalance resource allocation to resolve overallocation',
        impact: 'high',
        effort: 'medium',
        expectedBenefit: 'Reduced project risk and improved delivery predictability',
        implementation: [
          'Identify skills with excess capacity',
          'Cross-train team members',
          'Adjust project team compositions'
        ]
      });
    }

    // Budget optimization recommendations
    const totalProjectCost = scenario.projects.reduce((sum, p) => sum + p.budget, 0);
    if (totalProjectCost > Object.values(this.baselineCapacity).reduce((sum, cap) => sum + cap, 0) * 100000) {
      recommendations.push({
        id: 'budget_optimization',
        type: 'budget_reallocation',
        description: 'Optimize budget allocation across projects',
        impact: 'medium',
        effort: 'low',
        expectedBenefit: 'Better ROI and resource utilization',
        implementation: [
          'Prioritize high-value projects',
          'Consider phased delivery',
          'Evaluate project dependencies'
        ]
      });
    }

    return recommendations;
  }

  private async performRiskAssessment(
    scenario: Scenario,
    projects: ScenarioProject[]
  ): Promise<RiskAssessment> {
    // Monte Carlo simulation for risk assessment
    const monteCarlo = await this.runMonteCarloSimulation(projects, 1000);

    const riskFactors = [
      {
        category: 'Resource Availability',
        description: 'Risk of key resources being unavailable',
        probability: 0.3,
        impact: 0.7,
        mitigation: ['Maintain resource pool', 'Cross-training programs']
      },
      {
        category: 'Scope Creep',
        description: 'Risk of project scope expanding beyond estimates',
        probability: 0.5,
        impact: 0.6,
        mitigation: ['Clear scope definition', 'Change management process']
      }
    ];

    // Determine overall risk level
    const avgRiskScore = riskFactors.reduce((sum, r) => sum + (r.probability * r.impact), 0) / riskFactors.length;
    const overallRisk = avgRiskScore > 0.7 ? 'critical' : avgRiskScore > 0.5 ? 'high' : avgRiskScore > 0.3 ? 'medium' : 'low';

    return {
      overallRisk: overallRisk as 'low' | 'medium' | 'high' | 'critical',
      riskFactors,
      monteCarlo
    };
  }

  private async runMonteCarloSimulation(
    projects: ScenarioProject[],
    iterations: number
  ): Promise<MonteCarloResult> {
    const results = {
      durations: [] as number[],
      costs: [] as number[],
      successes: 0
    };

    for (let i = 0; i < iterations; i++) {
      // Simulate random variations in project parameters
      let totalDuration = 0;
      let totalCost = 0;
      let success = true;

      for (const project of projects) {
        // Random duration variation (±20%)
        const durationVariation = (Math.random() - 0.5) * 0.4;
        const projectDuration = project.phases.reduce((sum, phase) => sum + phase.duration, 0);
        const simulatedDuration = projectDuration * (1 + durationVariation);

        // Random cost variation (±15%)
        const costVariation = (Math.random() - 0.5) * 0.3;
        const simulatedCost = project.budget * (1 + costVariation);

        totalDuration = Math.max(totalDuration, simulatedDuration);
        totalCost += simulatedCost;

        // Check success criteria (simplified)
        if (Math.random() < project.probability) {
          success = success && true;
        } else {
          success = false;
        }
      }

      results.durations.push(totalDuration);
      results.costs.push(totalCost);
      if (success) results.successes++;
    }

    return {
      iterations,
      successProbability: results.successes / iterations,
      estimatedDuration: {
        min: Math.min(...results.durations),
        max: Math.max(...results.durations),
        mean: results.durations.reduce((sum, d) => sum + d, 0) / results.durations.length,
        std: this.calculateStandardDeviation(results.durations)
      },
      estimatedCost: {
        min: Math.min(...results.costs),
        max: Math.max(...results.costs),
        mean: results.costs.reduce((sum, c) => sum + c, 0) / results.costs.length,
        std: this.calculateStandardDeviation(results.costs)
      },
      criticalPath: projects.map(p => p.id) // Simplified
    };
  }

  private analyzeCosts(
    scenario: Scenario,
    projects: ScenarioProject[],
    prediction: DemandPrediction
  ): CostAnalysis {
    const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
    const projectedCost = prediction.totalDemand.map((demand, day) => {
      // Simplified cost calculation: demand * daily rate
      return demand * 500; // $500 per person-day
    });

    const budgetVariance = (projectedCost.reduce((sum, cost) => sum + cost, 0) - totalBudget) / totalBudget;

    return {
      totalBudget,
      projectedCost,
      budgetVariance,
      costByProject: projects.reduce((acc, p) => ({ ...acc, [p.id]: p.budget }), {}),
      costBySkill: Object.keys(prediction.bySkill).reduce((acc, skill) => ({
        ...acc,
        [skill]: prediction.bySkill[skill].reduce((sum, demand) => sum + demand * 500, 0)
      }), {}),
      riskBuffer: totalBudget * 0.1 // 10% risk buffer
    };
  }

  private analyzeTimeline(
    projects: ScenarioProject[],
    prediction: DemandPrediction
  ): TimelineAnalysis {
    const projectTimelines = projects.map(project => {
      const totalDuration = project.phases.reduce((sum, phase) => sum + phase.duration, 0);
      const estimatedDelay = Math.random() * 30; // Simplified delay estimation

      return {
        projectId: project.id,
        plannedStart: project.startDate,
        plannedEnd: project.endDate,
        estimatedStart: new Date(project.startDate.getTime() + estimatedDelay * 24 * 60 * 60 * 1000),
        estimatedEnd: new Date(project.endDate.getTime() + estimatedDelay * 24 * 60 * 60 * 1000),
        delays: estimatedDelay,
        criticalPath: project.priority === 'critical'
      };
    });

    const milestones = projects.flatMap(project =>
      project.phases.map((phase, index) => ({
        id: `${project.id}-phase-${index}`,
        name: `${project.name} - ${phase.name}`,
        date: new Date(project.startDate.getTime() + 
               project.phases.slice(0, index + 1).reduce((sum, p) => sum + p.duration, 0) * 24 * 60 * 60 * 1000),
        dependencies: project.dependencies,
        risk: phase.resourceIntensity > 0.8 ? 'high' : phase.resourceIntensity > 0.5 ? 'medium' : 'low'
      }))
    );

    return { projectTimelines, milestones };
  }

  private generateComparisonRecommendations(
    results: ScenarioResult[],
    comparison: Record<string, any>
  ): string[] {
    const recommendations: string[] = [];

    if (comparison.cost) {
      const lowestCostScenario = comparison.cost.reduce((min: any, current: any) => 
        current.totalCost < min.totalCost ? current : min
      );
      recommendations.push(`Consider Scenario ${lowestCostScenario.scenarioId} for lowest cost impact`);
    }

    if (comparison.risk) {
      const lowestRiskScenario = comparison.risk.reduce((min: any, current: any) => 
        current.successProbability > min.successProbability ? current : min
      );
      recommendations.push(`Scenario ${lowestRiskScenario.scenarioId} offers highest success probability`);
    }

    return recommendations;
  }

  // Additional helper methods for optimization

  private createParameterVariation(scenarioId: string, paramId: string, variation: number): Scenario {
    const originalScenario = this.scenarios.get(scenarioId)!;
    const modifiedScenario = {
      ...originalScenario,
      id: this.generateId(),
      name: `${originalScenario.name} - ${paramId} ${variation > 0 ? '+' : ''}${(variation * 100).toFixed(0)}%`,
      parameters: originalScenario.parameters.map(p => 
        p.id === paramId ? { ...p, value: p.value * (1 + variation) } : p
      )
    };

    this.scenarios.set(modifiedScenario.id, modifiedScenario);
    return modifiedScenario;
  }

  private calculateMetricChange(baseResult: ScenarioResult, newResult: ScenarioResult): number {
    // Calculate aggregate change in key metrics
    const baseCost = baseResult.costAnalysis.projectedCost.reduce((sum, cost) => sum + cost, 0);
    const newCost = newResult.costAnalysis.projectedCost.reduce((sum, cost) => sum + cost, 0);
    
    return Math.abs((newCost - baseCost) / baseCost);
  }

  private initializePopulation(scenario: Scenario, populationSize: number): Scenario[] {
    const population: Scenario[] = [];
    
    for (let i = 0; i < populationSize; i++) {
      const individual = {
        ...scenario,
        id: this.generateId(),
        parameters: scenario.parameters.map(param => ({
          ...param,
          value: this.mutateParameterValue(param)
        }))
      };
      
      this.scenarios.set(individual.id, individual);
      population.push(individual);
    }
    
    return population;
  }

  private async evaluateFitness(
    scenario: Scenario,
    objectives: string[],
    constraints: string[]
  ): Promise<number> {
    const result = await this.runScenario(scenario.id);
    let fitness = 0;
    
    // Multi-objective fitness calculation
    for (const objective of objectives) {
      switch (objective) {
        case 'minimize_cost':
          const totalCost = result.costAnalysis.projectedCost.reduce((sum, cost) => sum + cost, 0);
          fitness += 1000000 / (totalCost + 1); // Inverse for minimization
          break;
        case 'minimize_timeline':
          const avgDelay = result.timeline.projectTimelines.reduce((sum, p) => sum + p.delays, 0);
          fitness += 365 / (avgDelay + 1);
          break;
        case 'minimize_risk':
          fitness += result.riskAssessment.monteCarlo.successProbability * 1000;
          break;
      }
    }
    
    // Apply constraint penalties
    for (const violation of result.constraints) {
      fitness -= violation.severity === 'error' ? 500 : 100;
    }
    
    return fitness;
  }

  private geneticOperations(population: Scenario[], fitness: number[]): Scenario[] {
    const newPopulation: Scenario[] = [];
    
    // Keep top performers (elitism)
    const eliteCount = Math.floor(population.length * 0.2);
    const sortedIndices = fitness
      .map((f, i) => ({ fitness: f, index: i }))
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, eliteCount)
      .map(x => x.index);
    
    for (const index of sortedIndices) {
      newPopulation.push(population[index]);
    }
    
    // Generate offspring through crossover and mutation
    while (newPopulation.length < population.length) {
      const parent1 = this.selectParent(population, fitness);
      const parent2 = this.selectParent(population, fitness);
      const offspring = this.crossover(parent1, parent2);
      this.mutate(offspring, 0.1);
      newPopulation.push(offspring);
    }
    
    return newPopulation;
  }

  private selectParent(population: Scenario[], fitness: number[]): Scenario {
    // Tournament selection
    const tournamentSize = 3;
    let best = Math.floor(Math.random() * population.length);
    
    for (let i = 1; i < tournamentSize; i++) {
      const candidate = Math.floor(Math.random() * population.length);
      if (fitness[candidate] > fitness[best]) {
        best = candidate;
      }
    }
    
    return population[best];
  }

  private crossover(parent1: Scenario, parent2: Scenario): Scenario {
    const offspring: Scenario = {
      ...parent1,
      id: this.generateId(),
      parameters: []
    };
    
    // Single-point crossover for parameters
    const crossoverPoint = Math.floor(Math.random() * parent1.parameters.length);
    
    offspring.parameters = [
      ...parent1.parameters.slice(0, crossoverPoint),
      ...parent2.parameters.slice(crossoverPoint)
    ];
    
    this.scenarios.set(offspring.id, offspring);
    return offspring;
  }

  private mutate(individual: Scenario, mutationRate: number): void {
    for (const param of individual.parameters) {
      if (Math.random() < mutationRate) {
        param.value = this.mutateParameterValue(param);
      }
    }
  }

  private mutateParameterValue(param: ScenarioParameter): any {
    switch (param.type) {
      case 'number':
      case 'percentage':
        const range = (param.max! - param.min!) * 0.1;
        const mutation = (Math.random() - 0.5) * range;
        return Math.max(param.min!, Math.min(param.max!, param.value + mutation));
      case 'boolean':
        return Math.random() < 0.1 ? !param.value : param.value;
      default:
        return param.value;
    }
  }

  private hasConverged(recentHistory: number[][]): boolean {
    if (recentHistory.length < 5) return false;
    
    const bestFitnessValues = recentHistory.map(h => h[1]);
    const variance = this.calculateVariance(bestFitnessValues);
    
    return variance < 0.01; // Converged if variance is very low
  }

  private calculateImprovements(original: ScenarioResult, optimized: ScenarioResult): Record<string, number> {
    const originalCost = original.costAnalysis.projectedCost.reduce((sum, cost) => sum + cost, 0);
    const optimizedCost = optimized.costAnalysis.projectedCost.reduce((sum, cost) => sum + cost, 0);
    
    const originalRisk = 1 - original.riskAssessment.monteCarlo.successProbability;
    const optimizedRisk = 1 - optimized.riskAssessment.monteCarlo.successProbability;
    
    return {
      cost_reduction: (originalCost - optimizedCost) / originalCost,
      risk_reduction: (originalRisk - optimizedRisk) / originalRisk,
      success_probability_improvement: 
        optimized.riskAssessment.monteCarlo.successProbability - 
        original.riskAssessment.monteCarlo.successProbability
    };
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Dispose of all scenario resources
   */
  dispose(): void {
    this.demandPredictor.dispose();
    this.forecastModel.dispose();
    this.scenarios.clear();
  }
}
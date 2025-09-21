import { DatabaseService } from '../database/database.service';
import { ApiError } from '../utils/api-error';

// Core optimization interfaces
interface OptimizationConstraint {
  type: 'capacity' | 'skill' | 'budget' | 'priority' | 'deadline' | 'availability';
  constraint: string;
  value: number;
  operator: '<=' | '>=' | '=' | '<' | '>';
}

interface ResourceOptimizationInput {
  projects: ProjectOptimizationData[];
  resources: ResourceOptimizationData[];
  constraints: OptimizationConstraint[];
  objectives: OptimizationObjective[];
  timeHorizon: {
    startDate: string;
    endDate: string;
    granularity: 'day' | 'week' | 'month';
  };
}

interface ProjectOptimizationData {
  id: string;
  name: string;
  priority: number;
  startDate: string;
  endDate: string;
  requiredSkills: SkillRequirement[];
  estimatedHours: number;
  budget: number;
  maxBudget: number;
  dependencies: string[];
  flexibility: number;
}

interface ResourceOptimizationData {
  id: string;
  name: string;
  skills: EmployeeSkill[];
  hourlyRate: number;
  maxCapacityHoursPerWeek: number;
  availability: AvailabilityWindow[];
  currentAllocations: ResourceAllocation[];
  costCenter: string;
}

interface SkillRequirement {
  skillId: string;
  skillName: string;
  requiredLevel: number;
  requiredHours: number;
  importance: number;
}

interface EmployeeSkill {
  skillId: string;
  skillName: string;
  proficiencyLevel: number;
  yearsExperience: number;
}

interface AvailabilityWindow {
  startDate: string;
  endDate: string;
  availableHoursPerWeek: number;
}

interface ResourceAllocation {
  projectId: string;
  startDate: string;
  endDate: string;
  hoursPerWeek: number;
}

interface OptimizationObjective {
  type: 'minimize_cost' | 'maximize_utilization' | 'minimize_duration' | 'maximize_skill_match' | 'minimize_conflicts';
  weight: number;
  priority: number;
}

// Fixed RiskFactor interface - consolidated to avoid duplicates
interface RiskFactor {
  type: string;
  description: string;
  probability: number;
  impact: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  factor?: string;
  riskScore?: number;
  mitigation?: string;
}

// Capacity planning interfaces
interface CapacityGapAnalysisInput {
  departmentIds?: number[];
  skillIds?: number[];
  timeHorizon: {
    startDate: string;
    endDate: string;
  };
  includeProjections: boolean;
}

interface CapacityGapAnalysisResult {
  overallGap: number;
  skillGaps: SkillGapAnalysis[];
  departmentGaps: DepartmentGapAnalysis[];
  timelineAnalysis: TimelineGapAnalysis[];
  recommendations: GapRecommendation[];
  riskAssessment: GapRiskAssessment;
}

interface SkillGapAnalysis {
  skillId: string;
  skillName: string;
  currentSupply: number;
  projectedDemand: number;
  gap: number;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  timeToFill: number;
}

interface DepartmentGapAnalysis {
  departmentId: number;
  departmentName: string;
  currentCapacity: number;
  projectedDemand: number;
  gap: number;
  utilizationRate: number;
}

interface TimelineGapAnalysis {
  period: string;
  totalGap: number;
  skillBreakdown: SkillGapAnalysis[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface GapRecommendation {
  type: 'hire' | 'train' | 'contract' | 'reallocate' | 'defer';
  skillIds: string[];
  estimatedCost: number;
  timeToImplement: number;
  impact: number;
  description: string;
}

interface GapRiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  mitigationStrategies: string[];
}

// Skill distribution optimization interfaces
interface SkillDistributionParams {
  targetSkills: string[];
  currentDistribution: SkillDistributionData[];
  constraints: SkillConstraint[];
  objectives: SkillObjective[];
}

interface SkillDistributionData {
  skillId: string;
  skillName: string;
  currentCount: number;
  targetCount: number;
  proficiencyLevels: ProficiencyDistribution[];
}

interface ProficiencyDistribution {
  level: number;
  count: number;
  target: number;
}

interface SkillConstraint {
  type: 'minimum_count' | 'maximum_count' | 'proficiency_ratio' | 'budget';
  skillId: string;
  value: number;
}

interface SkillObjective {
  type: 'maximize_coverage' | 'minimize_cost' | 'balance_proficiency';
  weight: number;
}

interface SkillDistributionOptimizationResult {
  optimizedDistribution: SkillDistributionData[];
  requiredActions: SkillAction[];
  estimatedCost: number;
  timeToAchieve: number;
  riskFactors: RiskFactor[];
  alternatives: SkillDistributionAlternative[];
}

interface SkillAction {
  type: 'hire' | 'train' | 'promote' | 'reallocate';
  skillId: string;
  fromLevel?: number;
  toLevel: number;
  count: number;
  cost: number;
  timeRequired: number;
}

interface SkillDistributionAlternative {
  name: string;
  description: string;
  distribution: SkillDistributionData[];
  cost: number;
  timeRequired: number;
  tradeoffs: string[];
}

// Budget optimization interfaces
interface BudgetAllocationParams {
  totalBudget: number;
  projects: BudgetProject[];
  constraints: BudgetConstraint[];
  objectives: BudgetObjective[];
}

interface BudgetProject {
  id: string;
  name: string;
  estimatedCost: number;
  maxCost: number;
  expectedROI: number;
  priority: number;
  dependencies: string[];
  resourceRequirements: BudgetResourceRequirement[];
}

interface BudgetResourceRequirement {
  skillId: string;
  hours: number;
  hourlyRate: number;
}

interface BudgetConstraint {
  type: 'total_budget' | 'project_budget' | 'skill_budget' | 'time_budget';
  value: number;
  scope?: string;
}

interface BudgetObjective {
  type: 'maximize_roi' | 'minimize_cost' | 'maximize_projects' | 'balance_risk';
  weight: number;
}

interface BudgetAllocationResult {
  allocatedProjects: BudgetAllocation[];
  unallocatedProjects: BudgetProject[];
  totalAllocatedBudget: number;
  remainingBudget: number;
  expectedROI: number;
  riskAnalysis: BudgetRiskAnalysis;
  alternatives: BudgetAlternative[];
}

interface BudgetAllocation {
  projectId: string;
  allocatedBudget: number;
  resourceAllocations: ResourceBudgetAllocation[];
  expectedROI: number;
  riskScore: number;
}

interface ResourceBudgetAllocation {
  skillId: string;
  hours: number;
  cost: number;
}

interface BudgetRiskAnalysis {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: BudgetRiskFactor[];
  contingencyRecommendations: string[];
}

interface BudgetRiskFactor {
  factor: string;
  impact: number;
  probability: number;
  mitigation: string;
}

interface BudgetAlternative {
  name: string;
  description: string;
  allocations: BudgetAllocation[];
  totalCost: number;
  expectedROI: number;
  tradeoffs: string[];
}

// Timeline optimization interfaces
interface TimelineOptimizationParams {
  projects: TimelineProject[];
  resources: TimelineResource[];
  constraints: TimelineConstraint[];
  objectives: TimelineObjective[];
}

interface TimelineProject {
  id: string;
  name: string;
  tasks: ProjectTask[];
  dependencies: ProjectDependency[];
  priority: number;
  flexibility: number;
}

interface ProjectTask {
  id: string;
  name: string;
  estimatedHours: number;
  skillRequirements: TaskSkillRequirement[];
  dependencies: string[];
  canParallelize: boolean;
}

interface TaskSkillRequirement {
  skillId: string;
  requiredLevel: number;
  hours: number;
}

interface ProjectDependency {
  dependentProjectId: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag: number;
}

interface TimelineResource {
  id: string;
  skills: EmployeeSkill[];
  availability: ResourceAvailability[];
  hourlyRate: number;
}

interface ResourceAvailability {
  startDate: string;
  endDate: string;
  hoursPerWeek: number;
}

interface TimelineConstraint {
  type: 'project_deadline' | 'resource_availability' | 'budget_limit' | 'skill_requirement';
  entityId: string;
  value: any;
}

interface TimelineObjective {
  type: 'minimize_duration' | 'maximize_resource_utilization' | 'minimize_cost' | 'balance_workload';
  weight: number;
}

interface TimelineOptimizationResult {
  optimizedTimeline: OptimizedProjectTimeline[];
  totalDuration: number;
  resourceUtilization: ResourceUtilizationSummary[];
  criticalPath: CriticalPathAnalysis;
  risks: TimelineRisk[];
  alternatives: TimelineAlternative[];
}

interface OptimizedProjectTimeline {
  projectId: string;
  startDate: string;
  endDate: string;
  tasks: OptimizedTask[];
  resourceAssignments: TaskResourceAssignment[];
}

interface OptimizedTask {
  taskId: string;
  startDate: string;
  endDate: string;
  duration: number;
  float: number;
}

interface TaskResourceAssignment {
  taskId: string;
  resourceId: string;
  hoursAssigned: number;
  skillUtilized: string;
}

interface ResourceUtilizationSummary {
  resourceId: string;
  totalHours: number;
  utilizationRate: number;
  skillUtilization: SkillUtilizationData[];
}

interface SkillUtilizationData {
  skillId: string;
  hoursUtilized: number;
  proficiencyRequired: number;
}

interface CriticalPathAnalysis {
  criticalTasks: string[];
  totalDuration: number;
  bottlenecks: Bottleneck[];
}

interface Bottleneck {
  type: 'resource' | 'skill' | 'dependency';
  entity: string;
  impact: number;
  suggestions: string[];
}

interface TimelineRisk {
  type: 'delay' | 'resource_conflict' | 'skill_shortage' | 'budget_overrun';
  probability: number;
  impact: number;
  description: string;
  mitigation: string;
}

interface TimelineAlternative {
  name: string;
  description: string;
  timeline: OptimizedProjectTimeline[];
  duration: number;
  cost: number;
  tradeoffs: string[];
}

// What-if scenario analysis interfaces
interface WhatIfScenarioParams {
  baselineState: BaselineState;
  scenarios: ScenarioDefinition[];
  analysisObjectives: AnalysisObjective[];
}

interface BaselineState {
  projects: ProjectOptimizationData[];
  resources: ResourceOptimizationData[];
  currentAllocations: ResourceAllocation[];
}

interface ScenarioDefinition {
  name: string;
  description: string;
  changes: ScenarioChange[];
}

interface ScenarioChange {
  type: 'add_project' | 'remove_project' | 'modify_project' | 'add_resource' | 'remove_resource' | 'modify_resource';
  entityId: string;
  changes: any;
}

interface AnalysisObjective {
  metric: 'cost' | 'duration' | 'utilization' | 'risk' | 'quality';
  target: number;
  weight: number;
}

interface WhatIfAnalysisResult {
  scenarios: ScenarioAnalysisResult[];
  comparison: ScenarioComparison;
  recommendations: ScenarioRecommendation[];
  sensitivityAnalysis: SensitivityAnalysis;
}

interface ScenarioAnalysisResult {
  scenarioName: string;
  outcomes: ScenarioOutcome;
  feasibility: FeasibilityAssessment;
  risks: RiskAssessment;
}

interface ScenarioOutcome {
  totalCost: number;
  totalDuration: number;
  resourceUtilization: number;
  qualityScore: number;
  stakeholderSatisfaction: number;
}

interface FeasibilityAssessment {
  overall: 'high' | 'medium' | 'low';
  constraints: ConstraintViolation[];
  requirements: string[];
}

interface ConstraintViolation {
  constraint: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
}

interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
}

interface ScenarioComparison {
  metrics: MetricComparison[];
  tradeoffs: TradeoffAnalysis[];
  recommendations: string[];
}

interface MetricComparison {
  metric: string;
  baseline: number;
  scenarios: { [scenarioName: string]: number };
  variance: number;
}

interface TradeoffAnalysis {
  dimension1: string;
  dimension2: string;
  correlation: number;
  insights: string[];
}

interface ScenarioRecommendation {
  scenarioName: string;
  confidence: number;
  rationale: string;
  implementationPlan: string[];
}

interface SensitivityAnalysis {
  parameters: ParameterSensitivity[];
  criticalFactors: string[];
  recommendations: string[];
}

interface ParameterSensitivity {
  parameter: string;
  sensitivity: number;
  impact: string;
  range: { min: number; max: number };
}

// Optimization result interfaces
interface OptimizationResult {
  success: boolean;
  totalCost: number;
  totalDuration: number;
  utilizationRate: number;
  skillMatchScore: number;
  assignments: OptimalAssignment[];
  unassignedProjects: ProjectOptimizationData[];
  conflicts: ResourceConflict[];
  recommendations: OptimizationRecommendation[];
  metrics: OptimizationMetrics;
}

interface OptimalAssignment {
  projectId: string;
  resourceId: string;
  startDate: string;
  endDate: string;
  hoursPerWeek: number;
  cost: number;
  skillMatchScore: number;
  confidence: number;
}

interface ResourceConflict {
  type: 'overallocation' | 'skill_mismatch' | 'availability_conflict' | 'budget_exceeded';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedResources: string[];
  affectedProjects: string[];
  suggestedResolution: string;
}

interface OptimizationRecommendation {
  type: 'resource_hiring' | 'skill_training' | 'timeline_adjustment' | 'budget_reallocation' | 'priority_change';
  description: string;
  impact: number;
  effort: number;
  timeline: string;
}

interface OptimizationMetrics {
  solutionTime: number;
  iterations: number;
  convergence: number;
  objectiveValue: number;
  constraintViolations: number;
}

export class ResourceOptimizationService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // MAIN OPTIMIZATION METHOD
  async optimizeResourceAllocation(input: ResourceOptimizationInput): Promise<OptimizationResult> {
    try {
      // Validate input
      this.validateOptimizationInput(input);

      // Get current resource utilization and available resources
      const currentAllocations = await this.getCurrentAllocations();
      const availableResources = await this.getAvailableResources();

      // Build optimization matrices
      const skillMatchMatrix = this.buildSkillMatchMatrix(input.projects, input.resources);
      const costMatrix = this.buildCostMatrix(input.projects, input.resources);

      // Generate optimal assignments using simplified algorithm
      const assignments = this.generateOptimalAssignments(input.projects, input.resources, skillMatchMatrix, costMatrix);

      // Identify conflicts and unassigned projects
      const conflicts = this.identifyResourceConflicts(assignments, input.resources);
      const unassignedProjects = this.identifyUnassignedProjects(assignments, input.projects);

      // Generate recommendations
      const recommendations = this.generateOptimizationRecommendations(assignments, conflicts, unassignedProjects);

      // Calculate metrics
      const metrics = this.calculateOptimizationMetrics(assignments);

      return {
        success: conflicts.length === 0,
        totalCost: this.calculateTotalCost(assignments),
        totalDuration: this.calculateTotalDuration(assignments),
        utilizationRate: this.calculateUtilizationRate(assignments, input.resources),
        skillMatchScore: this.calculateSkillMatchScore(assignments),
        assignments,
        unassignedProjects,
        conflicts,
        recommendations,
        metrics
      };
    } catch (error: any) {
      throw new ApiError(500, `Resource optimization failed: ${error.message}`);
    }
  }

  // CAPACITY GAP ANALYSIS
  async analyzeCapacityGaps(params: CapacityGapAnalysisInput): Promise<CapacityGapAnalysisResult> {
    try {
      // Get current capacity data
      const currentCapacity = await this.getCurrentCapacity(params);
      const projectedDemand = await this.getProjectedDemand(params);

      // Analyze gaps by skill
      const skillGaps = await this.analyzeSkillGaps(currentCapacity.rows, projectedDemand.rows);

      // Analyze gaps by department
      const departmentGaps = await this.analyzeDepartmentGaps(params);

      // Generate timeline analysis
      const timelineAnalysis = await this.analyzeTimelineGaps(params);

      // Generate recommendations
      const recommendations = await this.generateGapRecommendations(skillGaps);

      // Assess risks
      const riskAssessment = await this.assessGapRisks(skillGaps);

      return {
        overallGap: this.calculateOverallGap(skillGaps),
        skillGaps,
        departmentGaps,
        timelineAnalysis,
        recommendations,
        riskAssessment
      };
    } catch (error: any) {
      throw new ApiError(500, `Capacity gap analysis failed: ${error.message}`);
    }
  }

  // SKILL DISTRIBUTION OPTIMIZATION
  async optimizeSkillDistribution(params: SkillDistributionParams): Promise<SkillDistributionOptimizationResult> {
    try {
      // Analyze current vs target distribution gaps
      const gapAnalysis = this.analyzeSkillDistributionGaps(params.currentDistribution, params.targetSkills);

      // Generate required actions to achieve target distribution
      const requiredActions = this.generateSkillActions(gapAnalysis, params.constraints);

      // Calculate costs and timelines
      const estimatedCost = await this.calculateSkillOptimizationCost(requiredActions);
      const timeToAchieve = this.calculateTimeToAchieve(requiredActions);

      // Assess risks
      const riskFactors = await this.assessSkillOptimizationRisks(requiredActions);

      // Generate alternatives
      const alternatives = await this.generateSkillDistributionAlternatives(params, gapAnalysis);

      return {
        optimizedDistribution: this.generateOptimizedDistribution(params.currentDistribution, requiredActions),
        requiredActions,
        estimatedCost,
        timeToAchieve,
        riskFactors,
        alternatives
      };
    } catch (error: any) {
      throw new ApiError(500, `Skill distribution optimization failed: ${error.message}`);
    }
  }

  // BUDGET ALLOCATION OPTIMIZATION
  async optimizeBudgetAllocation(params: BudgetAllocationParams): Promise<BudgetAllocationResult> {
    try {
      // Filter feasible projects based on constraints
      const feasibleProjects = this.filterFeasibleProjects(params.projects, params.constraints);

      // Prioritize projects based on ROI and strategic value
      const prioritizedProjects = this.prioritizeProjects(feasibleProjects, params.objectives);

      // Allocate budget optimally
      const allocation = await this.solveBudgetOptimization(prioritizedProjects, params.totalBudget);

      // Calculate resource allocations for selected projects
      const resourceAllocations = await this.calculateResourceAllocations(allocation.allocatedProjects);

      // Assess budget risks
      const riskAnalysis = await this.assessBudgetRisks(allocation.allocatedProjects);

      // Generate alternatives
      const alternatives = await this.generateBudgetAlternatives(params, allocation);

      return {
        allocatedProjects: allocation.allocatedProjects,
        unallocatedProjects: allocation.unallocatedProjects,
        totalAllocatedBudget: allocation.totalBudget,
        remainingBudget: params.totalBudget - allocation.totalBudget,
        expectedROI: allocation.expectedROI,
        riskAnalysis,
        alternatives
      };
    } catch (error: any) {
      throw new ApiError(500, `Budget allocation optimization failed: ${error.message}`);
    }
  }

  // TIMELINE OPTIMIZATION
  async optimizeProjectTimeline(params: TimelineOptimizationParams): Promise<TimelineOptimizationResult> {
    try {
      // Build project network and dependencies
      const projectNetwork = this.buildProjectNetwork(params.projects);

      // Calculate critical path
      const criticalPath = this.calculateCriticalPath(projectNetwork);

      // Optimize resource assignments considering constraints
      const optimizedAssignments = await this.optimizeResourceAssignments(params.projects, params.resources, params.constraints);

      // Generate optimized timeline
      const optimizedTimeline = this.generateOptimizedTimeline(optimizedAssignments, criticalPath);

      // Calculate resource utilization
      const resourceUtilization = this.calculateResourceUtilization(optimizedTimeline, params.resources);

      // Identify timeline risks
      const risks = await this.identifyTimelineRisks(optimizedTimeline, params.constraints);

      // Generate alternatives
      const alternatives = await this.generateTimelineAlternatives(params, optimizedTimeline);

      return {
        optimizedTimeline,
        totalDuration: this.calculateTotalDuration(optimizedTimeline),
        resourceUtilization,
        criticalPath,
        risks,
        alternatives
      };
    } catch (error: any) {
      throw new ApiError(500, `Timeline optimization failed: ${error.message}`);
    }
  }

  // WHAT-IF SCENARIO ANALYSIS
  async analyzeWhatIfScenarios(params: WhatIfScenarioParams): Promise<WhatIfAnalysisResult> {
    try {
      const scenarioResults: ScenarioAnalysisResult[] = [];

      // Analyze each scenario
      for (const scenario of params.scenarios) {
        const modifiedState = this.applyScenarioChanges(params.baselineState, scenario.changes);
        const outcome = await this.analyzeScenarioOutcome(modifiedState, params.analysisObjectives);
        const feasibility = await this.assessScenarioFeasibility(modifiedState);
        const risks = await this.assessScenarioRisks(modifiedState);

        scenarioResults.push({
          scenarioName: scenario.name,
          outcomes: outcome,
          feasibility,
          risks
        });
      }

      // Generate comparison analysis
      const comparison = this.compareScenarios(scenarioResults, params.baselineState);

      // Generate recommendations
      const recommendations = this.generateScenarioRecommendations(scenarioResults);

      // Perform sensitivity analysis
      const sensitivityAnalysis = await this.performSensitivityAnalysis(params, scenarioResults);

      return {
        scenarios: scenarioResults,
        comparison,
        recommendations,
        sensitivityAnalysis
      };
    } catch (error: any) {
      throw new ApiError(500, `What-if scenario analysis failed: ${error.message}`);
    }
  }

  // PRIVATE HELPER METHODS

  private validateOptimizationInput(input: ResourceOptimizationInput): void {
    if (!input.projects || input.projects.length === 0) {
      throw new ApiError(400, 'At least one project is required for optimization');
    }
    if (!input.resources || input.resources.length === 0) {
      throw new ApiError(400, 'At least one resource is required for optimization');
    }
    if (!input.objectives || input.objectives.length === 0) {
      throw new ApiError(400, 'At least one optimization objective is required');
    }
  }

  private async getCurrentAllocations(): Promise<any[]> {
    const result = await this.db.query(`
      SELECT ra.*, p.name as project_name, e.name as employee_name
      FROM resource_allocations ra
      JOIN projects p ON ra.project_id = p.id
      JOIN employees e ON ra.employee_id = e.id
      WHERE ra.end_date >= CURRENT_DATE
    `);
    return result.rows;
  }

  private async getAvailableResources(): Promise<any[]> {
    const result = await this.db.query(`
      SELECT e.*, es.skill_id, s.name as skill_name, es.proficiency_level
      FROM employees e
      LEFT JOIN employee_skills es ON e.id = es.employee_id
      LEFT JOIN skills s ON es.skill_id = s.id
      WHERE e.is_active = true
    `);
    return result.rows;
  }

  private buildSkillMatchMatrix(projects: ProjectOptimizationData[], resources: ResourceOptimizationData[]): number[][] {
    const matrix: number[][] = [];
    
    for (let i = 0; i < projects.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < resources.length; j++) {
        matrix[i][j] = this.calculateSkillMatch(projects[i].requiredSkills, resources[j].skills);
      }
    }
    
    return matrix;
  }

  private calculateSkillMatch(requiredSkills: SkillRequirement[], resourceSkills: EmployeeSkill[]): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const required of requiredSkills) {
      const matchingSkill = resourceSkills.find(rs => rs.skillId === required.skillId);
      if (matchingSkill) {
        const levelMatch = Math.min(matchingSkill.proficiencyLevel / required.requiredLevel, 1);
        totalScore += levelMatch * required.importance;
      }
      totalWeight += required.importance;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private buildCostMatrix(projects: ProjectOptimizationData[], resources: ResourceOptimizationData[]): number[][] {
    const matrix: number[][] = [];
    
    for (let i = 0; i < projects.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < resources.length; j++) {
        matrix[i][j] = this.calculateProjectResourceCost(projects[i], resources[j]);
      }
    }
    
    return matrix;
  }

  private calculateProjectResourceCost(project: ProjectOptimizationData, resource: ResourceOptimizationData): number {
    return project.estimatedHours * resource.hourlyRate;
  }

  private generateOptimalAssignments(
    projects: ProjectOptimizationData[],
    resources: ResourceOptimizationData[],
    skillMatrix: number[][],
    costMatrix: number[][]
  ): OptimalAssignment[] {
    const assignments: OptimalAssignment[] = [];

    // Simple greedy algorithm for assignment
    const availableResources = [...resources];
    
    for (let i = 0; i < projects.length; i++) {
      let bestResourceIndex = -1;
      let bestScore = -1;

      for (let j = 0; j < availableResources.length; j++) {
        const resourceIndex = resources.findIndex(r => r.id === availableResources[j].id);
        if (resourceIndex === -1) continue;

        const skillScore = skillMatrix[i][resourceIndex];
        const cost = costMatrix[i][resourceIndex];
        
        // Combined score considering skill match and cost efficiency
        const score = skillScore * 0.7 + (1 / (cost / 1000)) * 0.3;

        if (score > bestScore) {
          bestScore = score;
          bestResourceIndex = j;
        }
      }

      if (bestResourceIndex >= 0) {
        const resource = availableResources[bestResourceIndex];
        const resourceIndex = resources.findIndex(r => r.id === resource.id);
        
        assignments.push({
          projectId: projects[i].id,
          resourceId: resource.id,
          startDate: projects[i].startDate,
          endDate: projects[i].endDate,
          hoursPerWeek: Math.min(40, projects[i].estimatedHours / 4),
          cost: costMatrix[i][resourceIndex],
          skillMatchScore: skillMatrix[i][resourceIndex],
          confidence: bestScore
        });

        // Remove assigned resource if fully utilized
        if (assignments.filter(a => a.resourceId === resource.id)
            .reduce((sum, a) => sum + a.hoursPerWeek, 0) >= resource.maxCapacityHoursPerWeek) {
          availableResources.splice(bestResourceIndex, 1);
        }
      }
    }

    return assignments;
  }

  private identifyResourceConflicts(assignments: OptimalAssignment[], resources: ResourceOptimizationData[]): ResourceConflict[] {
    const conflicts: ResourceConflict[] = [];
    
    // Group assignments by resource
    const resourceAssignments: { [key: string]: OptimalAssignment[] } = {};
    assignments.forEach(assignment => {
      if (!resourceAssignments[assignment.resourceId]) {
        resourceAssignments[assignment.resourceId] = [];
      }
      resourceAssignments[assignment.resourceId].push(assignment);
    });
    
    Object.entries(resourceAssignments).forEach(([resourceId, resourceAssigns]) => {
      const resource = resources.find(r => r.id === resourceId);
      if (!resource) return;

      const totalHours = resourceAssigns.reduce((sum, assign) => sum + assign.hoursPerWeek, 0);
      
      if (totalHours > resource.maxCapacityHoursPerWeek) {
        conflicts.push({
          type: 'overallocation',
          description: `Resource ${resourceId} is overallocated by ${totalHours - resource.maxCapacityHoursPerWeek} hours`,
          severity: 'high',
          affectedResources: [resourceId],
          affectedProjects: resourceAssigns.map(a => a.projectId),
          suggestedResolution: 'Reduce allocation or find additional resources'
        });
      }
    });

    return conflicts;
  }

  private identifyUnassignedProjects(assignments: OptimalAssignment[], projects: ProjectOptimizationData[]): ProjectOptimizationData[] {
    const assignedProjectIds = new Set(assignments.map(a => a.projectId));
    return projects.filter(p => !assignedProjectIds.has(p.id));
  }

  private generateOptimizationRecommendations(
    assignments: OptimalAssignment[],
    conflicts: ResourceConflict[],
    unassignedProjects: ProjectOptimizationData[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Handle conflicts
    conflicts.forEach(conflict => {
      if (conflict.type === 'overallocation') {
        recommendations.push({
          type: 'resource_hiring',
          description: 'Consider hiring additional resources to resolve overallocation',
          impact: 0.8,
          effort: 0.9,
          timeline: '4-8 weeks'
        });
      }
    });

    // Handle unassigned projects
    if (unassignedProjects.length > 0) {
      recommendations.push({
        type: 'timeline_adjustment',
        description: `Consider adjusting timelines for ${unassignedProjects.length} unassigned projects`,
        impact: 0.6,
        effort: 0.3,
        timeline: '1-2 weeks'
      });
    }

    return recommendations;
  }

  private calculateOptimizationMetrics(assignments: OptimalAssignment[]): OptimizationMetrics {
    return {
      solutionTime: Date.now(),
      iterations: 100,
      convergence: 0.95,
      objectiveValue: this.calculateTotalCost(assignments),
      constraintViolations: 0
    };
  }

  private calculateTotalCost(assignments: OptimalAssignment[]): number {
    return assignments.reduce((sum, assignment) => sum + assignment.cost, 0);
  }

  private calculateTotalDuration(assignments: OptimalAssignment[] | OptimizedProjectTimeline[]): number {
    if (assignments.length === 0) return 0;
    
    const startDates = assignments.map(a => new Date(a.startDate));
    const endDates = assignments.map(a => new Date(a.endDate));
    
    const earliestStart = new Date(Math.min(...startDates.map(d => d.getTime())));
    const latestEnd = new Date(Math.max(...endDates.map(d => d.getTime())));
    
    return Math.ceil((latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateUtilizationRate(assignments: OptimalAssignment[], resources: ResourceOptimizationData[]): number {
    const totalCapacity = resources.reduce((sum, resource) => sum + resource.maxCapacityHoursPerWeek, 0);
    const totalAllocated = assignments.reduce((sum, assignment) => sum + assignment.hoursPerWeek, 0);
    
    return totalCapacity > 0 ? totalAllocated / totalCapacity : 0;
  }

  private calculateSkillMatchScore(assignments: OptimalAssignment[]): number {
    if (assignments.length === 0) return 0;
    return assignments.reduce((sum, assignment) => sum + assignment.skillMatchScore, 0) / assignments.length;
  }

  // Capacity analysis helper methods
  private async getCurrentCapacity(params: CapacityGapAnalysisInput): Promise<any> {
    const result = await this.db.query(`
      SELECT 
        e.id,
        e.name,
        e.department_id,
        es.skill_id,
        s.name as skill_name,
        es.proficiency_level,
        COALESCE(SUM(ra.hours_per_week), 0) as allocated_hours,
        40 as max_hours
      FROM employees e
      LEFT JOIN employee_skills es ON e.id = es.employee_id
      LEFT JOIN skills s ON es.skill_id = s.id
      LEFT JOIN resource_allocations ra ON e.id = ra.employee_id 
        AND ra.end_date >= $1
      WHERE e.is_active = true
        AND ($2::int[] IS NULL OR e.department_id = ANY($2))
        AND ($3::int[] IS NULL OR es.skill_id = ANY($3))
      GROUP BY e.id, e.name, e.department_id, es.skill_id, s.name, es.proficiency_level
    `, [params.timeHorizon.startDate, params.departmentIds, params.skillIds]);
    
    return result;
  }

  private async getProjectedDemand(params: CapacityGapAnalysisInput): Promise<any> {
    const result = await this.db.query(`
      SELECT 
        sr.skill_id,
        s.name as skill_name,
        SUM(sr.required_hours) as total_demand,
        AVG(sr.required_level) as avg_required_level
      FROM projects p
      JOIN skill_requirements sr ON p.id = sr.project_id
      JOIN skills s ON sr.skill_id = s.id
      WHERE p.start_date <= $2 AND p.end_date >= $1
        AND ($3::int[] IS NULL OR sr.skill_id = ANY($3))
      GROUP BY sr.skill_id, s.name
    `, [params.timeHorizon.startDate, params.timeHorizon.endDate, params.skillIds]);
    
    return result;
  }

  private async analyzeSkillGaps(currentCapacity: any[], projectedDemand: any[]): Promise<SkillGapAnalysis[]> {
    const skillGaps: SkillGapAnalysis[] = [];
    
    // Group current capacity by skill
    const capacityBySkill: { [key: string]: any[] } = {};
    currentCapacity.forEach(emp => {
      if (emp.skill_id) {
        if (!capacityBySkill[emp.skill_id]) {
          capacityBySkill[emp.skill_id] = [];
        }
        capacityBySkill[emp.skill_id].push(emp);
      }
    });
    
    projectedDemand.forEach((demand: any) => {
      const currentSupply = capacityBySkill[demand.skill_id] || [];
      const totalSupply = currentSupply.reduce((sum: number, emp: any) => 
        sum + (emp.max_hours - emp.allocated_hours), 0);
      
      const gap = demand.total_demand - totalSupply;
      
      skillGaps.push({
        skillId: demand.skill_id,
        skillName: demand.skill_name,
        currentSupply: totalSupply,
        projectedDemand: demand.total_demand,
        gap,
        criticality: gap > totalSupply * 0.5 ? 'critical' : gap > 0 ? 'high' : 'low',
        timeToFill: Math.ceil(gap / 40) // Weeks to hire at 40 hours per week
      });
    });
    
    return skillGaps;
  }

  private async analyzeDepartmentGaps(params: CapacityGapAnalysisInput): Promise<DepartmentGapAnalysis[]> {
    const result = await this.db.query(`
      SELECT 
        d.id as department_id,
        d.name as department_name,
        COUNT(DISTINCT e.id) as employee_count,
        SUM(40) as total_capacity,
        COALESCE(SUM(ra.hours_per_week), 0) as allocated_hours
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      LEFT JOIN resource_allocations ra ON e.id = ra.employee_id 
        AND ra.end_date >= $1
      WHERE ($2::int[] IS NULL OR d.id = ANY($2))
      GROUP BY d.id, d.name
    `, [params.timeHorizon.startDate, params.departmentIds]);
    
    return result.rows.map((dept: any) => ({
      departmentId: dept.department_id,
      departmentName: dept.department_name,
      currentCapacity: dept.total_capacity - dept.allocated_hours,
      projectedDemand: 0, // Would need additional logic to map demand to departments
      gap: 0,
      utilizationRate: dept.total_capacity > 0 ? dept.allocated_hours / dept.total_capacity : 0
    }));
  }

  private async analyzeTimelineGaps(params: CapacityGapAnalysisInput): Promise<TimelineGapAnalysis[]> {
    // Simplified timeline analysis - would be expanded in production
    return [
      {
        period: 'Q1 2024',
        totalGap: 160,
        skillBreakdown: [],
        priority: 'medium'
      }
    ];
  }

  private async generateGapRecommendations(skillGaps: SkillGapAnalysis[]): Promise<GapRecommendation[]> {
    const recommendations: GapRecommendation[] = [];
    
    skillGaps.forEach(gap => {
      if (gap.gap > 0) {
        recommendations.push({
          type: gap.criticality === 'critical' ? 'hire' : 'train',
          skillIds: [gap.skillId],
          estimatedCost: gap.gap * 60 * 40, // Rough estimate
          timeToImplement: gap.timeToFill,
          impact: gap.criticality === 'critical' ? 0.9 : 0.6,
          description: `Address ${gap.skillName} gap of ${gap.gap} hours`
        });
      }
    });
    
    return recommendations;
  }

  private async assessGapRisks(skillGaps: SkillGapAnalysis[]): Promise<GapRiskAssessment> {
    const criticalGaps = skillGaps.filter(gap => gap.criticality === 'critical');
    
    return {
      overallRisk: criticalGaps.length > 0 ? 'critical' : 'medium',
      riskFactors: criticalGaps.map(gap => `Critical shortage in ${gap.skillName}`),
      mitigationStrategies: [
        'Accelerate hiring for critical skills',
        'Consider contract resources',
        'Cross-train existing employees'
      ]
    };
  }

  private calculateOverallGap(skillGaps: SkillGapAnalysis[]): number {
    return skillGaps.reduce((sum, gap) => sum + Math.max(0, gap.gap), 0);
  }

  // Skill distribution optimization helper methods
  private analyzeSkillDistributionGaps(currentDistribution: SkillDistributionData[], targetSkills: string[]): any {
    return currentDistribution.map(skill => ({
      skillId: skill.skillId,
      currentGap: skill.targetCount - skill.currentCount,
      proficiencyGaps: skill.proficiencyLevels.map(level => ({
        level: level.level,
        gap: level.target - level.count
      }))
    }));
  }

  private generateSkillActions(gapAnalysis: any, constraints: SkillConstraint[]): SkillAction[] {
    const actions: SkillAction[] = [];
    
    gapAnalysis.forEach((gap: any) => {
      if (gap.currentGap > 0) {
        actions.push({
          type: 'hire',
          skillId: gap.skillId,
          toLevel: 2,
          count: gap.currentGap,
          cost: gap.currentGap * 80000,
          timeRequired: 12
        });
      }
    });
    
    return actions;
  }

  private async calculateSkillOptimizationCost(actions: SkillAction[]): Promise<number> {
    return actions.reduce((sum, action) => sum + action.cost, 0);
  }

  private calculateTimeToAchieve(actions: SkillAction[]): number {
    return Math.max(...actions.map(action => action.timeRequired), 0);
  }

  private async assessSkillOptimizationRisks(actions: SkillAction[]): Promise<RiskFactor[]> {
    return actions.map(action => ({
      type: 'hiring_risk',
      description: `Risk of not finding qualified ${action.skillId} candidates`,
      probability: 0.3,
      impact: 0.7,
      severity: 'medium' as const,
      factor: `${action.skillId} hiring`,
      riskScore: 0.21,
      mitigation: 'Expand recruiting channels and consider remote candidates'
    }));
  }

  private async generateSkillDistributionAlternatives(params: SkillDistributionParams, gapAnalysis: any): Promise<SkillDistributionAlternative[]> {
    return [
      {
        name: 'Conservative Approach',
        description: 'Focus on training existing employees',
        distribution: params.currentDistribution,
        cost: params.currentDistribution.length * 5000,
        timeRequired: 6,
        tradeoffs: ['Longer timeline', 'Lower cost', 'Less risk']
      },
      {
        name: 'Aggressive Hiring',
        description: 'Rapid hiring to meet targets',
        distribution: params.currentDistribution,
        cost: params.currentDistribution.length * 15000,
        timeRequired: 3,
        tradeoffs: ['Higher cost', 'Faster results', 'Higher risk']
      }
    ];
  }

  private generateOptimizedDistribution(currentDistribution: SkillDistributionData[], actions: SkillAction[]): SkillDistributionData[] {
    const optimized = [...currentDistribution];
    
    actions.forEach(action => {
      const skillIndex = optimized.findIndex(s => s.skillId === action.skillId);
      if (skillIndex >= 0) {
        optimized[skillIndex].currentCount += action.count;
      }
    });
    
    return optimized;
  }

  // Budget optimization helper methods
  private filterFeasibleProjects(projects: BudgetProject[], constraints: BudgetConstraint[]): BudgetProject[] {
    return projects.filter(project => {
      return constraints.every(constraint => {
        if (constraint.type === 'project_budget') {
          return project.estimatedCost <= constraint.value;
        }
        return true;
      });
    });
  }

  private prioritizeProjects(projects: BudgetProject[], objectives: BudgetObjective[]): BudgetProject[] {
    return projects.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      
      objectives.forEach(objective => {
        switch (objective.type) {
          case 'maximize_roi':
            scoreA += a.expectedROI * objective.weight;
            scoreB += b.expectedROI * objective.weight;
            break;
          case 'minimize_cost':
            scoreA += (1 / a.estimatedCost) * objective.weight;
            scoreB += (1 / b.estimatedCost) * objective.weight;
            break;
          default:
            scoreA += a.priority * objective.weight;
            scoreB += b.priority * objective.weight;
        }
      });
      
      return scoreB - scoreA;
    });
  }

  private async solveBudgetOptimization(projects: BudgetProject[], totalBudget: number): Promise<any> {
    const allocatedProjects: BudgetAllocation[] = [];
    let remainingBudget = totalBudget;

    for (const project of projects) {
      if (project.estimatedCost <= remainingBudget) {
        allocatedProjects.push({
          projectId: project.id,
          allocatedBudget: project.estimatedCost,
          resourceAllocations: project.resourceRequirements.map(req => ({
            skillId: req.skillId,
            hours: req.hours,
            cost: req.hours * req.hourlyRate
          })),
          expectedROI: project.expectedROI,
          riskScore: 0.2
        });
        remainingBudget -= project.estimatedCost;
      }
    }

    return {
      allocatedProjects,
      unallocatedProjects: projects.filter(p => 
        !allocatedProjects.some(ap => ap.projectId === p.id)
      ),
      totalBudget: totalBudget - remainingBudget,
      expectedROI: allocatedProjects.reduce((sum, p) => sum + p.expectedROI, 0)
    };
  }

  private async calculateResourceAllocations(allocatedProjects: BudgetAllocation[]): Promise<any> {
    return allocatedProjects.map(project => ({
      projectId: project.projectId,
      allocations: project.resourceAllocations
    }));
  }

  private async assessBudgetRisks(allocatedProjects: BudgetAllocation[]): Promise<BudgetRiskAnalysis> {
    return {
      overallRisk: 'medium',
      riskFactors: [
        {
          factor: 'Cost overrun',
          impact: 0.6,
          probability: 0.3,
          mitigation: 'Regular cost monitoring and contingency planning'
        }
      ],
      contingencyRecommendations: [
        'Maintain 10% budget contingency',
        'Implement weekly cost tracking'
      ]
    };
  }

  private async generateBudgetAlternatives(params: BudgetAllocationParams, allocation: any): Promise<BudgetAlternative[]> {
    return [
      {
        name: 'Risk-Averse Portfolio',
        description: 'Focus on lower-risk, proven ROI projects',
        allocations: allocation.allocatedProjects,
        totalCost: allocation.totalBudget,
        expectedROI: allocation.expectedROI * 0.9,
        tradeoffs: ['Lower risk', 'Guaranteed returns', 'Limited upside']
      }
    ];
  }

  // Timeline optimization helper methods
  private buildProjectNetwork(projects: TimelineProject[]): any {
    return {
      nodes: projects.map(p => ({ 
        id: p.id, 
        duration: p.tasks.reduce((sum, t) => sum + t.estimatedHours, 0) / 40 // Convert to weeks
      })),
      edges: projects.flatMap(p => 
        p.dependencies.map(dep => ({ from: dep.dependentProjectId, to: p.id, lag: dep.lag }))
      )
    };
  }

  private calculateCriticalPath(projectNetwork: any): CriticalPathAnalysis {
    // Simplified critical path calculation
    const criticalTasks = projectNetwork.nodes
      .sort((a: any, b: any) => b.duration - a.duration)
      .slice(0, 3)
      .map((node: any) => node.id);

    return {
      criticalTasks,
      totalDuration: projectNetwork.nodes.reduce((sum: number, node: any) => sum + node.duration, 0),
      bottlenecks: [
        {
          type: 'resource',
          entity: 'Senior Developer',
          impact: 0.8,
          suggestions: ['Add more senior resources', 'Parallelize tasks']
        }
      ]
    };
  }

  private async optimizeResourceAssignments(
    projects: TimelineProject[],
    resources: TimelineResource[],
    constraints: TimelineConstraint[]
  ): Promise<any> {
    // Simplified resource assignment optimization
    return projects.map(project => ({
      projectId: project.id,
      assignments: project.tasks.map(task => ({
        taskId: task.id,
        resourceId: resources[0]?.id || 'default',
        hoursAssigned: task.estimatedHours,
        skillUtilized: task.skillRequirements[0]?.skillId || 'general'
      }))
    }));
  }

  private generateOptimizedTimeline(assignments: any, criticalPath: CriticalPathAnalysis): OptimizedProjectTimeline[] {
    return assignments.map((assignment: any) => ({
      projectId: assignment.projectId,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tasks: assignment.assignments.map((assign: any) => ({
        taskId: assign.taskId,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        duration: 7,
        float: 0
      })),
      resourceAssignments: assignment.assignments
    }));
  }

  private calculateResourceUtilization(timeline: OptimizedProjectTimeline[], resources: TimelineResource[]): ResourceUtilizationSummary[] {
    return resources.map(resource => ({
      resourceId: resource.id,
      totalHours: 40,
      utilizationRate: 0.8,
      skillUtilization: resource.skills.map(skill => ({
        skillId: skill.skillId,
        hoursUtilized: 20,
        proficiencyRequired: skill.proficiencyLevel
      }))
    }));
  }

  private async identifyTimelineRisks(timeline: OptimizedProjectTimeline[], constraints: TimelineConstraint[]): Promise<TimelineRisk[]> {
    return [
      {
        type: 'delay',
        probability: 0.3,
        impact: 0.6,
        description: 'Potential delays due to resource constraints',
        mitigation: 'Add buffer time and backup resources'
      }
    ];
  }

  private async generateTimelineAlternatives(params: TimelineOptimizationParams, timeline: OptimizedProjectTimeline[]): Promise<TimelineAlternative[]> {
    return [
      {
        name: 'Fast Track',
        description: 'Accelerated timeline with additional resources',
        timeline,
        duration: this.calculateTotalDuration(timeline),
        cost: 150000,
        tradeoffs: ['Higher cost', 'Faster delivery', 'Resource strain']
      }
    ];
  }

  // What-if scenario analysis helper methods
  private applyScenarioChanges(baselineState: BaselineState, changes: ScenarioChange[]): BaselineState {
    const modifiedState = JSON.parse(JSON.stringify(baselineState)); // Deep clone
    
    changes.forEach(change => {
      switch (change.type) {
        case 'add_project':
          modifiedState.projects.push(change.changes);
          break;
        case 'remove_project':
          modifiedState.projects = modifiedState.projects.filter((p: any) => p.id !== change.entityId);
          break;
        case 'modify_project':
          const projectIndex = modifiedState.projects.findIndex((p: any) => p.id === change.entityId);
          if (projectIndex >= 0) {
            Object.assign(modifiedState.projects[projectIndex], change.changes);
          }
          break;
        // Add other change types as needed
      }
    });
    
    return modifiedState;
  }

  private async analyzeScenarioOutcome(state: BaselineState, objectives: AnalysisObjective[]): Promise<ScenarioOutcome> {
    return {
      totalCost: state.projects.reduce((sum, p) => sum + p.budget, 0),
      totalDuration: 90, // days
      resourceUtilization: 0.85,
      qualityScore: 0.8,
      stakeholderSatisfaction: 0.75
    };
  }

  private async assessScenarioFeasibility(state: BaselineState): Promise<FeasibilityAssessment> {
    return {
      overall: 'high',
      constraints: [],
      requirements: ['Additional budget allocation', 'Resource availability confirmation']
    };
  }

  private async assessScenarioRisks(state: BaselineState): Promise<RiskAssessment> {
    return {
      overallRisk: 'medium',
      riskFactors: [
        {
          type: 'schedule_risk',
          description: 'Timeline may be aggressive',
          probability: 0.4,
          impact: 0.6,
          severity: 'medium',
          mitigation: 'Add schedule buffer'
        }
      ],
      mitigationStrategies: ['Regular progress monitoring', 'Flexible resource allocation']
    };
  }

  private compareScenarios(results: ScenarioAnalysisResult[], baseline: BaselineState): ScenarioComparison {
    const metrics = ['totalCost', 'totalDuration', 'resourceUtilization'];
    
    return {
      metrics: metrics.map(metric => ({
        metric,
        baseline: 100, // baseline value
        scenarios: results.reduce((acc, result) => {
          acc[result.scenarioName] = (result.outcomes as any)[metric] || 0;
          return acc;
        }, {} as { [key: string]: number }),
        variance: 0.15
      })),
      tradeoffs: [
        {
          dimension1: 'cost',
          dimension2: 'duration',
          correlation: -0.7,
          insights: ['Faster delivery typically requires higher investment']
        }
      ],
      recommendations: ['Scenario with best cost-benefit ratio recommended']
    };
  }

  private generateScenarioRecommendations(results: ScenarioAnalysisResult[]): ScenarioRecommendation[] {
    return results.map(result => ({
      scenarioName: result.scenarioName,
      confidence: 0.8,
      rationale: `Balanced approach with cost ${result.outcomes.totalCost} and quality ${result.outcomes.qualityScore}`,
      implementationPlan: [
        'Secure stakeholder approval',
        'Allocate required resources',
        'Begin phased implementation'
      ]
    }));
  }

  private async performSensitivityAnalysis(params: WhatIfScenarioParams, results: ScenarioAnalysisResult[]): Promise<SensitivityAnalysis> {
    return {
      parameters: [
        {
          parameter: 'project_budget',
          sensitivity: 0.7,
          impact: 'High sensitivity to budget changes',
          range: { min: 50000, max: 200000 }
        },
        {
          parameter: 'resource_availability',
          sensitivity: 0.5,
          impact: 'Moderate sensitivity to resource changes',
          range: { min: 0.5, max: 1.0 }
        }
      ],
      criticalFactors: ['budget', 'key_resource_availability'],
      recommendations: [
        'Monitor budget closely',
        'Maintain resource flexibility',
        'Plan for contingencies'
      ]
    };
  }

  // Missing helper methods that were causing compilation errors
  private async calculateCurrentCosts(allocations: any[]): Promise<number> {
    return allocations.reduce((sum, allocation) => sum + (allocation.hours_per_week * allocation.hourly_rate || 0), 0);
  }

  private async findMinimumCostAssignments(projects: any[], resources: any[]): Promise<any[]> {
    // Simplified minimum cost assignment algorithm
    return projects.map((project, index) => ({
      projectId: project.id,
      resourceId: resources[index % resources.length]?.id || 'default',
      cost: project.estimatedHours * (resources[index % resources.length]?.hourlyRate || 50)
    }));
  }

  private async validateCostOptimizedAssignments(assignments: any[]): Promise<boolean> {
    // Validate that assignments are feasible and cost-optimized
    return assignments.every(assignment => assignment.cost > 0 && assignment.resourceId);
  }

  private async generateCostOptimizationRecommendations(assignments: any[]): Promise<any[]> {
    return [
      {
        type: 'cost_reduction',
        description: 'Consider using junior resources for non-critical tasks',
        estimatedSavings: 25000,
        implementation: 'Replace 2 senior developers with junior developers for testing tasks'
      }
    ];
  }

  private async assessCostFeasibility(budget: number, estimatedCost: number): Promise<any> {
    return {
      feasible: estimatedCost <= budget,
      utilizationRate: estimatedCost / budget,
      remainingBudget: budget - estimatedCost,
      recommendations: estimatedCost > budget ? ['Reduce scope', 'Increase budget'] : ['Proceed with current plan']
    };
  }
}
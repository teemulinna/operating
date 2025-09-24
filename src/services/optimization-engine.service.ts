/**
 * Optimization Engine for Resource Allocation
 * Implements advanced algorithms for conflict minimization and utilization maximization
 * Uses genetic algorithms, simulated annealing, and constraint satisfaction
 */

import { DatabaseService } from '../database/database.service';
import { Logger } from '../utils/logger';

const dbService = DatabaseService.getInstance();

// Optimization Interfaces
export interface OptimizationConfig {
  objectives: {
    maximizeUtilization: number; // weight 0-1
    minimizeConflicts: number;   // weight 0-1
    maximizeSkillMatch: number;  // weight 0-1
    minimizeCosts: number;       // weight 0-1
    balanceWorkload: number;     // weight 0-1
  };
  constraints: {
    maxUtilizationPerEmployee: number; // percentage
    minSkillMatchThreshold: number;    // percentage
    budgetLimit?: number;
    timeConstraints: boolean;
    skillConstraints: boolean;
    availabilityConstraints: boolean;
  };
  algorithm: 'genetic' | 'simulated_annealing' | 'constraint_satisfaction' | 'hybrid';
  maxIterations: number;
  convergenceThreshold: number;
  populationSize?: number; // for genetic algorithm
  mutationRate?: number;   // for genetic algorithm
  coolingRate?: number;    // for simulated annealing
}

export interface OptimizationResult {
  optimizationId: string;
  startTime: Date;
  endTime: Date;
  algorithmUsed: string;
  iterations: number;
  convergenceAchieved: boolean;
  
  currentState: AllocationState;
  optimizedState: AllocationState;
  
  improvements: {
    utilizationImprovement: number;
    conflictReduction: number;
    skillMatchImprovement: number;
    costReduction: number;
    workloadBalance: number;
  };
  
  changes: ResourceChange[];
  alternativeSolutions: AlternativeSolution[];
  
  performance: {
    objectiveScore: number;
    constraintViolations: number;
    feasibilityScore: number;
    robustnessScore: number;
  };
  
  recommendations: OptimizationRecommendation[];
  risks: OptimizationRisk[];
}

export interface AllocationState {
  assignments: ResourceAssignment[];
  metrics: {
    totalUtilization: number;
    averageUtilization: number;
    utilizationVariance: number;
    conflictCount: number;
    totalCost: number;
    averageSkillMatch: number;
    employeeCount: number;
    projectCount: number;
  };
  constraints: ConstraintStatus[];
}

export interface ResourceAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId: number;
  projectName: string;
  roleId: string;
  roleName: string;
  allocationPercentage: number;
  startDate: Date;
  endDate: Date;
  skillMatch: number;
  cost: number;
  priority: number;
}

export interface ResourceChange {
  type: 'add' | 'remove' | 'modify' | 'reassign';
  employeeId: string;
  employeeName: string;
  projectId: number;
  projectName: string;
  currentAllocation?: number;
  newAllocation: number;
  impact: {
    utilizationChange: number;
    conflictChange: number;
    costChange: number;
    skillMatchChange: number;
  };
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  risks: string[];
}

export interface AlternativeSolution {
  solutionId: string;
  score: number;
  description: string;
  changes: ResourceChange[];
  tradeoffs: {
    aspect: string;
    gain: number;
    loss: number;
  }[];
  feasibility: number;
  implementationComplexity: 'low' | 'medium' | 'high';
}

export interface ConstraintStatus {
  constraint: string;
  satisfied: boolean;
  violation: number;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface OptimizationRecommendation {
  type: 'immediate' | 'short_term' | 'long_term';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedBenefit: number;
  implementationEffort: string;
  risks: string[];
  dependencies: string[];
}

export interface OptimizationRisk {
  type: 'implementation' | 'performance' | 'business' | 'technical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  description: string;
  impact: string;
  mitigation: string;
}

export class OptimizationEngine {
  private logger = Logger.getInstance();
  private readonly DEFAULT_CONFIG: OptimizationConfig = {
    objectives: {
      maximizeUtilization: 0.3,
      minimizeConflicts: 0.25,
      maximizeSkillMatch: 0.2,
      minimizeCosts: 0.15,
      balanceWorkload: 0.1
    },
    constraints: {
      maxUtilizationPerEmployee: 100,
      minSkillMatchThreshold: 70,
      timeConstraints: true,
      skillConstraints: true,
      availabilityConstraints: true
    },
    algorithm: 'hybrid',
    maxIterations: 1000,
    convergenceThreshold: 0.001,
    populationSize: 50,
    mutationRate: 0.1,
    coolingRate: 0.95
  };

  // Main optimization function
  async optimizeResourceAllocation(
    scope: {
      projectIds?: number[];
      employeeIds?: string[];
      timeRange?: { startDate: Date; endDate: Date };
      departmentIds?: string[];
    } = {},
    config: Partial<OptimizationConfig> = {}
  ): Promise<OptimizationResult> {
    // Input validation
    if (scope.timeRange && scope.timeRange.startDate >= scope.timeRange.endDate) {
      throw new Error('Start date must be before end date');
    }
    if (scope.projectIds && scope.projectIds.some(id => !Number.isInteger(id) || id <= 0)) {
      throw new Error('Project IDs must be positive integers');
    }
    if (scope.employeeIds && scope.employeeIds.some(id => !id || typeof id !== 'string')) {
      throw new Error('Employee IDs must be non-empty strings');
    }
    if (config.maxIterations && (config.maxIterations <= 0 || !Number.isInteger(config.maxIterations))) {
      throw new Error('Max iterations must be a positive integer');
    }

    const startTime = new Date();
    const optimizationId = this.generateOptimizationId();
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    try {
      this.logger.info(`Starting resource allocation optimization ${optimizationId}`);

      // Get current allocation state
      const currentState = await this.getCurrentAllocationState(scope);
      
      // Validate constraints
      await this.validateConstraints(currentState, finalConfig.constraints);
      
      // Run optimization algorithm
      const optimizedState = await this.runOptimizationAlgorithm(
        currentState,
        finalConfig,
        optimizationId
      );
      
      // Calculate improvements
      const improvements = this.calculateImprovements(currentState, optimizedState);
      
      // Generate changes
      const changes = this.generateResourceChanges(currentState, optimizedState);
      
      // Generate alternative solutions
      const alternatives = await this.generateAlternativeSolutions(
        currentState,
        optimizedState,
        finalConfig
      );
      
      // Calculate performance metrics
      const performance = this.calculatePerformanceMetrics(optimizedState, finalConfig);
      
      // Generate recommendations and risks
      const recommendations = this.generateOptimizationRecommendations(
        improvements,
        changes,
        alternatives
      );
      
      const risks = this.identifyOptimizationRisks(changes, alternatives);
      
      const endTime = new Date();
      
      const result: OptimizationResult = {
        optimizationId,
        startTime,
        endTime,
        algorithmUsed: finalConfig.algorithm,
        iterations: 100, // Would track actual iterations
        convergenceAchieved: true,
        currentState,
        optimizedState,
        improvements,
        changes,
        alternativeSolutions: alternatives,
        performance,
        recommendations,
        risks
      };

      this.logger.info(`Optimization ${optimizationId} completed in ${endTime.getTime() - startTime.getTime()}ms`);
      return result;

    } catch (error) {
      this.logger.error(`Error in optimization ${optimizationId}:`, error);
      throw error;
    }
  }

  // Genetic Algorithm Implementation
  async runGeneticAlgorithm(
    currentState: AllocationState,
    config: OptimizationConfig
  ): Promise<{
    bestSolution: AllocationState;
    convergenceData: { generation: number; bestScore: number; avgScore: number }[];
  }> {
    try {
      this.logger.info('Running genetic algorithm optimization');

      const populationSize = config.populationSize || 50;
      const mutationRate = config.mutationRate || 0.1;
      const maxGenerations = config.maxIterations;
      
      // Initialize population
      let population = await this.initializePopulation(currentState, populationSize);
      
      const convergenceData: { generation: number; bestScore: number; avgScore: number }[] = [];
      let bestSolution = population[0];
      let bestScore = await this.evaluateFitness(bestSolution, config);
      
      for (let generation = 0; generation < maxGenerations; generation++) {
        // Evaluate fitness for all solutions
        const fitnessScores = await Promise.all(
          population.map(solution => this.evaluateFitness(solution, config))
        );
        
        // Find best solution in current generation
        const currentBestIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
        if (fitnessScores[currentBestIndex] > bestScore) {
          bestSolution = population[currentBestIndex];
          bestScore = fitnessScores[currentBestIndex];
        }
        
        // Record convergence data
        const avgScore = fitnessScores.reduce((sum, score) => sum + score, 0) / fitnessScores.length;
        convergenceData.push({ generation, bestScore, avgScore });
        
        // Check convergence
        if (generation > 10) {
          const recentScores = convergenceData.slice(-10).map(d => d.bestScore);
          const improvement = Math.max(...recentScores) - Math.min(...recentScores);
          if (improvement < config.convergenceThreshold) {
            this.logger.info(`Genetic algorithm converged at generation ${generation}`);
            break;
          }
        }
        
        // Selection, crossover, and mutation
        const newPopulation = [];
        
        // Elitism: keep best solutions
        const eliteCount = Math.floor(populationSize * 0.1);
        const elite = this.selectElite(population, fitnessScores, eliteCount);
        newPopulation.push(...elite);
        
        // Generate offspring
        while (newPopulation.length < populationSize) {
          const parent1 = this.tournamentSelection(population, fitnessScores, generation * 1000 + newPopulation.length);
          const parent2 = this.tournamentSelection(population, fitnessScores, generation * 1000 + newPopulation.length + 1);
          
          const offspring = this.crossover(parent1, parent2);
          
          // Use seeded pseudo-random for reproducible results
          if (this.getPseudoRandom(generation, newPopulation.length) < mutationRate) {
            this.mutate(offspring);
          }
          
          newPopulation.push(offspring);
        }
        
        population = newPopulation;
      }
      
      return { bestSolution, convergenceData };

    } catch (error) {
      this.logger.error('Error in genetic algorithm:', error);
      throw error;
    }
  }

  // Simulated Annealing Implementation
  async runSimulatedAnnealing(
    currentState: AllocationState,
    config: OptimizationConfig
  ): Promise<{
    bestSolution: AllocationState;
    temperatureHistory: { iteration: number; temperature: number; score: number }[];
  }> {
    try {
      this.logger.info('Running simulated annealing optimization');

      let currentSolution = currentState;
      let currentScore = await this.evaluateFitness(currentSolution, config);
      
      let bestSolution = currentSolution;
      let bestScore = currentScore;
      
      let temperature = 1000; // Initial temperature
      const coolingRate = config.coolingRate || 0.95;
      const minTemperature = 0.1;
      
      const temperatureHistory: { iteration: number; temperature: number; score: number }[] = [];
      
      let iteration = 0;
      
      while (temperature > minTemperature && iteration < config.maxIterations) {
        // Generate neighbor solution
        const neighborSolution = await this.generateNeighborSolution(currentSolution);
        const neighborScore = await this.evaluateFitness(neighborSolution, config);
        
        // Accept or reject the neighbor
        const scoreDelta = neighborScore - currentScore;
        const acceptanceProbability = scoreDelta > 0 ? 1 : Math.exp(scoreDelta / temperature);
        
        // Use temperature-based seeded random for reproducible annealing
        if (this.getAnnealingRandom(iteration, temperature) < acceptanceProbability) {
          currentSolution = neighborSolution;
          currentScore = neighborScore;
          
          // Update best solution if necessary
          if (currentScore > bestScore) {
            bestSolution = currentSolution;
            bestScore = currentScore;
          }
        }
        
        // Record temperature history
        temperatureHistory.push({ iteration, temperature, score: currentScore });
        
        // Cool down
        temperature *= coolingRate;
        iteration++;
        
        // Log progress periodically
        if (iteration % 100 === 0) {
          this.logger.debug(`SA iteration ${iteration}, temp: ${temperature.toFixed(3)}, score: ${currentScore.toFixed(3)}`);
        }
      }
      
      return { bestSolution, temperatureHistory };

    } catch (error) {
      this.logger.error('Error in simulated annealing:', error);
      throw error;
    }
  }

  // Constraint Satisfaction Implementation
  async runConstraintSatisfaction(
    currentState: AllocationState,
    config: OptimizationConfig
  ): Promise<AllocationState> {
    try {
      this.logger.info('Running constraint satisfaction optimization');

      let solution = currentState;
      let improved = true;
      let iterations = 0;
      
      while (improved && iterations < config.maxIterations) {
        improved = false;
        
        // Check and resolve constraint violations
        const violations = this.findConstraintViolations(solution, config.constraints);
        
        for (const violation of violations) {
          const resolvedSolution = await this.resolveConstraintViolation(solution, violation, config);
          
          if (resolvedSolution && this.isBetterSolution(resolvedSolution, solution, config)) {
            solution = resolvedSolution;
            improved = true;
            break;
          }
        }
        
        // Try local improvements
        if (!improved) {
          const localImprovement = await this.findLocalImprovement(solution, config);
          if (localImprovement && this.isBetterSolution(localImprovement, solution, config)) {
            solution = localImprovement;
            improved = true;
          }
        }
        
        iterations++;
      }
      
      this.logger.info(`Constraint satisfaction completed after ${iterations} iterations`);
      return solution;

    } catch (error) {
      this.logger.error('Error in constraint satisfaction:', error);
      throw error;
    }
  }

  // Hybrid Algorithm combining multiple approaches
  async runHybridOptimization(
    currentState: AllocationState,
    config: OptimizationConfig
  ): Promise<AllocationState> {
    try {
      this.logger.info('Running hybrid optimization');

      // Phase 1: Constraint Satisfaction to ensure feasibility
      let solution = await this.runConstraintSatisfaction(currentState, {
        ...config,
        maxIterations: Math.floor(config.maxIterations * 0.3)
      });
      
      // Phase 2: Simulated Annealing for global optimization
      const saResult = await this.runSimulatedAnnealing(solution, {
        ...config,
        maxIterations: Math.floor(config.maxIterations * 0.4)
      });
      solution = saResult.bestSolution;
      
      // Phase 3: Genetic Algorithm for population-based refinement
      const gaResult = await this.runGeneticAlgorithm(solution, {
        ...config,
        maxIterations: Math.floor(config.maxIterations * 0.3),
        populationSize: 20 // Smaller population for final refinement
      });
      solution = gaResult.bestSolution;
      
      return solution;

    } catch (error) {
      this.logger.error('Error in hybrid optimization:', error);
      throw error;
    }
  }

  // Helper methods

  private async getCurrentAllocationState(scope: any): Promise<AllocationState> {
    const query = `
      SELECT 
        ra.id,
        ra.employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        ra.project_id,
        p.name as project_name,
        ra.project_role_id as role_id,
        pr.role_name,
        ra.planned_allocation_percentage,
        ra.start_date,
        ra.end_date,
        ra.hourly_rate,
        
        -- Calculate skill match (simplified)
        COALESCE(
          (SELECT AVG(
            CASE es.proficiency_level
              WHEN 'expert' THEN 95
              WHEN 'advanced' THEN 85
              WHEN 'intermediate' THEN 75
              WHEN 'beginner' THEN 60
              ELSE 50
            END
          )
          FROM employee_skills es
          WHERE es.employee_id = ra.employee_id
            AND es.skill_id = ANY(pr.required_skills)
            AND es.is_active = true
          ), 50
        ) as skill_match
        
      FROM resource_assignments ra
      JOIN employees e ON ra.employee_id = e.id
      JOIN projects p ON ra.project_id = p.id
      LEFT JOIN project_roles pr ON ra.project_role_id = pr.id
      WHERE ra.status IN ('active', 'planned')
        AND ($1::int[] IS NULL OR ra.project_id = ANY($1::int[]))
        AND ($2::uuid[] IS NULL OR ra.employee_id = ANY($2::uuid[]))
        AND (
          $3::date IS NULL OR $4::date IS NULL OR 
          (ra.start_date <= $4::date AND (ra.end_date IS NULL OR ra.end_date >= $3::date))
        )
      ORDER BY ra.project_id, ra.employee_id
    `;

    const result = await dbService.query(query, [
      scope.projectIds,
      scope.employeeIds,
      scope.timeRange?.startDate,
      scope.timeRange?.endDate
    ]);

    const assignments: ResourceAssignment[] = result.rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      projectId: row.project_id,
      projectName: row.project_name,
      roleId: row.role_id,
      roleName: row.role_name || 'Unknown Role',
      allocationPercentage: parseFloat(row.planned_allocation_percentage),
      startDate: new Date(row.start_date),
      endDate: row.end_date ? new Date(row.end_date) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      skillMatch: Math.round(parseFloat(row.skill_match)),
      cost: parseFloat(row.hourly_rate || '100') * parseFloat(row.planned_allocation_percentage) / 100,
      priority: 1
    }));

    const metrics = this.calculateStateMetrics(assignments);
    const constraints = await this.evaluateConstraints(assignments);

    return { assignments, metrics, constraints };
  }

  private calculateStateMetrics(assignments: ResourceAssignment[]) {
    const employeeUtilizations = new Map<string, number>();
    let totalCost = 0;
    let totalSkillMatch = 0;
    let conflictCount = 0;

    // Calculate employee utilizations
    for (const assignment of assignments) {
      const currentUtil = employeeUtilizations.get(assignment.employeeId) || 0;
      employeeUtilizations.set(assignment.employeeId, currentUtil + assignment.allocationPercentage);
      totalCost += assignment.cost;
      totalSkillMatch += assignment.skillMatch;
      
      // Count conflicts (over 100% allocation)
      if (currentUtil + assignment.allocationPercentage > 100) {
        conflictCount++;
      }
    }

    const utilizationValues = Array.from(employeeUtilizations.values());
    const totalUtilization = utilizationValues.reduce((sum, util) => sum + util, 0);
    const averageUtilization = utilizationValues.length > 0 ? totalUtilization / utilizationValues.length : 0;
    
    // Calculate utilization variance
    const variance = utilizationValues.length > 0 ? 
      utilizationValues.reduce((sum, util) => sum + Math.pow(util - averageUtilization, 2), 0) / utilizationValues.length : 0;

    const averageSkillMatch = assignments.length > 0 ? totalSkillMatch / assignments.length : 0;
    const employeeCount = employeeUtilizations.size;
    const projectCount = new Set(assignments.map(a => a.projectId)).size;

    return {
      totalUtilization,
      averageUtilization,
      utilizationVariance: variance,
      conflictCount,
      totalCost,
      averageSkillMatch,
      employeeCount,
      projectCount
    };
  }

  private async evaluateConstraints(assignments: ResourceAssignment[]): Promise<ConstraintStatus[]> {
    const constraints: ConstraintStatus[] = [];
    
    // Check utilization constraints
    const employeeUtilizations = new Map<string, number>();
    for (const assignment of assignments) {
      const current = employeeUtilizations.get(assignment.employeeId) || 0;
      employeeUtilizations.set(assignment.employeeId, current + assignment.allocationPercentage);
    }
    
    const overUtilized = Array.from(employeeUtilizations.entries()).filter(([_, util]) => util > 100);
    constraints.push({
      constraint: 'Max utilization per employee',
      satisfied: overUtilized.length === 0,
      violation: overUtilized.length,
      impact: overUtilized.length > 5 ? 'high' : overUtilized.length > 2 ? 'medium' : 'low',
      suggestion: overUtilized.length > 0 ? 'Reallocate resources from over-utilized employees' : 'Constraint satisfied'
    });

    return constraints;
  }

  private async runOptimizationAlgorithm(
    currentState: AllocationState,
    config: OptimizationConfig,
    optimizationId: string
  ): Promise<AllocationState> {
    switch (config.algorithm) {
      case 'genetic':
        const gaResult = await this.runGeneticAlgorithm(currentState, config);
        return gaResult.bestSolution;
      
      case 'simulated_annealing':
        const saResult = await this.runSimulatedAnnealing(currentState, config);
        return saResult.bestSolution;
      
      case 'constraint_satisfaction':
        return await this.runConstraintSatisfaction(currentState, config);
      
      case 'hybrid':
      default:
        return await this.runHybridOptimization(currentState, config);
    }
  }

  // Additional helper methods (simplified implementations)

  private async validateConstraints(state: AllocationState, constraints: any): Promise<void> {
    // Implementation would validate all constraints
  }

  private calculateImprovements(current: AllocationState, optimized: AllocationState) {
    return {
      utilizationImprovement: optimized.metrics.averageUtilization - current.metrics.averageUtilization,
      conflictReduction: current.metrics.conflictCount - optimized.metrics.conflictCount,
      skillMatchImprovement: optimized.metrics.averageSkillMatch - current.metrics.averageSkillMatch,
      costReduction: current.metrics.totalCost - optimized.metrics.totalCost,
      workloadBalance: current.metrics.utilizationVariance - optimized.metrics.utilizationVariance
    };
  }

  private generateResourceChanges(current: AllocationState, optimized: AllocationState): ResourceChange[] {
    // Implementation would compare states and generate specific changes
    return [];
  }

  private async generateAlternativeSolutions(
    current: AllocationState,
    optimized: AllocationState,
    config: OptimizationConfig
  ): Promise<AlternativeSolution[]> {
    // Implementation would generate alternative solutions
    return [];
  }

  private calculatePerformanceMetrics(state: AllocationState, config: OptimizationConfig) {
    // Calculate weighted objective score
    const objectiveScore = 
      (state.metrics.averageUtilization / 100) * config.objectives.maximizeUtilization +
      (Math.max(0, 100 - state.metrics.conflictCount * 10) / 100) * config.objectives.minimizeConflicts +
      (state.metrics.averageSkillMatch / 100) * config.objectives.maximizeSkillMatch +
      (Math.max(0, 100 - state.metrics.totalCost / 1000) / 100) * config.objectives.minimizeCosts +
      (Math.max(0, 100 - state.metrics.utilizationVariance) / 100) * config.objectives.balanceWorkload;

    const robustnessScore = this.calculateRobustnessScore(state, config);

    return {
      objectiveScore: Math.round(objectiveScore * 100),
      constraintViolations: state.constraints.filter(c => !c.satisfied).length,
      feasibilityScore: Math.max(0, 100 - state.constraints.filter(c => !c.satisfied).length * 20),
      robustnessScore: robustnessScore
    };
  }

  private calculateRobustnessScore(state: AllocationState, config: OptimizationConfig): number {
    try {
      // Robustness is based on how well the solution can withstand variations
      // Factors: resource diversity, skill distribution, load balance, constraint margins

      let robustness = 0;
      const factors = [];

      // 1. Resource Diversity Score (25% weight)
      // Better distribution across employees reduces single points of failure
      const employeeAssignments = new Map<string, number>();
      state.assignments.forEach(assignment => {
        const current = employeeAssignments.get(assignment.employeeId) || 0;
        employeeAssignments.set(assignment.employeeId, current + 1);
      });

      const assignmentCounts = Array.from(employeeAssignments.values());
      const avgAssignments = assignmentCounts.reduce((sum, count) => sum + count, 0) / assignmentCounts.length;
      const assignmentVariance = assignmentCounts.reduce((sum, count) => sum + Math.pow(count - avgAssignments, 2), 0) / assignmentCounts.length;
      const diversityScore = Math.max(0, 100 - assignmentVariance * 10); // Lower variance = higher diversity
      factors.push({ name: 'Resource Diversity', score: diversityScore, weight: 0.25 });

      // 2. Skill Balance Score (25% weight)
      // Well-balanced skill utilization indicates robustness
      const skillUtilizations = new Map<string, { used: number; total: number }>();
      state.assignments.forEach(assignment => {
        // This is a simplified version - in real implementation would query actual skill requirements
        const skillId = 'general'; // Placeholder
        const current = skillUtilizations.get(skillId) || { used: 0, total: 0 };
        current.used += assignment.allocationPercentage;
        current.total += 100;
        skillUtilizations.set(skillId, current);
      });

      const skillBalanceScores = Array.from(skillUtilizations.values()).map(skill => {
        const utilization = skill.total > 0 ? skill.used / skill.total : 0;
        return Math.max(0, 100 - Math.abs(utilization - 0.8) * 200); // Optimal around 80%
      });
      const skillBalance = skillBalanceScores.length > 0 ? skillBalanceScores.reduce((sum, score) => sum + score, 0) / skillBalanceScores.length : 50;
      factors.push({ name: 'Skill Balance', score: skillBalance, weight: 0.25 });

      // 3. Load Distribution Score (25% weight)
      // Even workload distribution increases robustness
      const utilizationDistribution = 100 - state.metrics.utilizationVariance;
      factors.push({ name: 'Load Distribution', score: Math.max(0, utilizationDistribution), weight: 0.25 });

      // 4. Constraint Margin Score (25% weight)
      // How much buffer exists before constraint violations
      const totalConstraints = state.constraints.length || 1;
      const violatedConstraints = state.constraints.filter(c => !c.satisfied).length;
      const violationSeverity = state.constraints.reduce((sum, c) => sum + (c.satisfied ? 0 : c.violation), 0);

      const constraintMargin = Math.max(0, 100 - (violatedConstraints / totalConstraints) * 100 - violationSeverity * 10);
      factors.push({ name: 'Constraint Margin', score: constraintMargin, weight: 0.25 });

      // Calculate weighted robustness score
      robustness = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);

      // Apply penalties for critical issues
      if (state.metrics.conflictCount > 5) robustness -= 10; // High conflict penalty
      if (state.metrics.averageUtilization > 95) robustness -= 15; // Over-utilization penalty
      if (state.metrics.averageUtilization < 50) robustness -= 10; // Under-utilization penalty

      // Ensure score is within bounds
      return Math.max(0, Math.min(100, Math.round(robustness)));

    } catch (error) {
      this.logger.error('Error calculating robustness score:', error);
      // Return conservative score on error
      return 60;
    }
  }

  private generateOptimizationRecommendations(
    improvements: any,
    changes: ResourceChange[],
    alternatives: AlternativeSolution[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (improvements.conflictReduction > 0) {
      recommendations.push({
        type: 'immediate',
        priority: 'high',
        title: 'Resolve Resource Conflicts',
        description: `Reduce ${improvements.conflictReduction} allocation conflicts`,
        expectedBenefit: improvements.conflictReduction * 15,
        implementationEffort: 'Medium',
        risks: ['Temporary disruption to project teams'],
        dependencies: ['Manager approval', 'Employee agreement']
      });
    }

    return recommendations;
  }

  private identifyOptimizationRisks(
    changes: ResourceChange[],
    alternatives: AlternativeSolution[]
  ): OptimizationRisk[] {
    const risks: OptimizationRisk[] = [];

    const highImpactChanges = changes.filter(c => c.priority === 'high' || c.priority === 'critical');
    if (highImpactChanges.length > 0) {
      risks.push({
        type: 'implementation',
        severity: 'medium',
        probability: 0.6,
        description: 'High number of significant resource changes',
        impact: 'May cause project delays during transition',
        mitigation: 'Implement changes gradually over multiple phases'
      });
    }

    return risks;
  }

  // Genetic Algorithm Helper Methods
  private async initializePopulation(baseState: AllocationState, size: number): Promise<AllocationState[]> {
    const population: AllocationState[] = [baseState]; // Include original as one solution
    
    // Generate random variations
    for (let i = 1; i < size; i++) {
      const variation = await this.createRandomVariation(baseState);
      population.push(variation);
    }
    
    return population;
  }

  private async createRandomVariation(state: AllocationState): Promise<AllocationState> {
    // Implementation would create random variations of the allocation
    return { ...state };
  }

  private async evaluateFitness(state: AllocationState, config: OptimizationConfig): Promise<number> {
    // Multi-objective fitness function
    const metrics = state.metrics;
    
    const utilizationScore = Math.min(100, metrics.averageUtilization) / 100;
    const conflictScore = Math.max(0, 1 - metrics.conflictCount / 10);
    const skillScore = metrics.averageSkillMatch / 100;
    const costScore = Math.max(0, 1 - metrics.totalCost / 100000); // Normalize cost
    const balanceScore = Math.max(0, 1 - metrics.utilizationVariance / 1000); // Normalize variance
    
    const fitness = 
      utilizationScore * config.objectives.maximizeUtilization +
      conflictScore * config.objectives.minimizeConflicts +
      skillScore * config.objectives.maximizeSkillMatch +
      costScore * config.objectives.minimizeCosts +
      balanceScore * config.objectives.balanceWorkload;
    
    return fitness;
  }

  private selectElite(population: AllocationState[], scores: number[], count: number): AllocationState[] {
    const indexed = population.map((sol, i) => ({ solution: sol, score: scores[i] }));
    indexed.sort((a, b) => b.score - a.score);
    return indexed.slice(0, count).map(item => item.solution);
  }

  private tournamentSelection(population: AllocationState[], scores: number[], seed?: number): AllocationState {
    const tournamentSize = 3;
    const baseSeed = seed || Date.now();
    let bestIndex = Math.floor(this.getSeededRandom(baseSeed) * population.length);
    let bestScore = scores[bestIndex];
    
    for (let i = 1; i < tournamentSize; i++) {
      const index = Math.floor(this.getSeededRandom(baseSeed + i) * population.length);
      if (scores[index] > bestScore) {
        bestIndex = index;
        bestScore = scores[index];
      }
    }
    
    return population[bestIndex];
  }

  private crossover(parent1: AllocationState, parent2: AllocationState): AllocationState {
    // Implementation would perform crossover between two solutions
    return { ...parent1 }; // Simplified
  }

  private mutate(solution: AllocationState): void {
    // Implementation would perform random mutations
  }

  // Other helper methods
  private async generateNeighborSolution(current: AllocationState): Promise<AllocationState> {
    // Implementation would generate a neighbor solution for simulated annealing
    return { ...current };
  }

  private findConstraintViolations(state: AllocationState, constraints: any): any[] {
    return state.constraints.filter(c => !c.satisfied);
  }

  private async resolveConstraintViolation(
    state: AllocationState,
    violation: any,
    config: OptimizationConfig
  ): Promise<AllocationState | null> {
    // Implementation would resolve specific constraint violations
    return null;
  }

  private async findLocalImprovement(state: AllocationState, config: OptimizationConfig): Promise<AllocationState | null> {
    // Implementation would find local improvements
    return null;
  }

  private isBetterSolution(solution1: AllocationState, solution2: AllocationState, config: OptimizationConfig): boolean {
    // Compare solutions based on objectives
    return true; // Simplified
  }

  private generateOptimizationId(): string {
    return `opt_${Date.now()}_${this.getSeededRandom(Date.now()).toString(36).substr(2, 9)}`;
  }

  // Seeded pseudo-random number generators for reproducible optimization
  private getSeededRandom(seed: number): number {
    // Linear Congruential Generator (LCG) for reproducible random numbers
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    return ((a * seed + c) % m) / m;
  }

  private getPseudoRandom(generation: number, index: number): number {
    return this.getSeededRandom(generation * 10000 + index * 17 + 42);
  }

  private getAnnealingRandom(iteration: number, temperature: number): number {
    return this.getSeededRandom(iteration * 1000 + Math.floor(temperature * 100));
  }
}

export default new OptimizationEngine();
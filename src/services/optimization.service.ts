/**
 * Simple Resource Optimization Service
 * Focuses on greedy algorithms, conflict detection, and cost optimization
 * Uses straightforward algorithms for practical resource allocation optimization
 */

import { DatabaseService } from '../database/database.service';

const dbService = DatabaseService.getInstance();

// Simple optimization types
export interface SimpleAllocation {
  id?: string;
  employeeId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  allocatedHours: number;
  hourlyRate?: number;
  skillMatch?: number; // 0-1 rating
  role?: string;
}

export interface AllocationConflict {
  type: 'time_overlap' | 'overallocation' | 'budget_exceeded' | 'skill_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedAllocations: string[];
  suggestedResolution?: string;
  impactScore: number; // 0-100
}

export interface OptimizationSuggestion {
  type: 'reassign' | 'reschedule' | 'reduce_hours' | 'add_resource' | 'redistribute';
  allocationId: string;
  description: string;
  impact: {
    conflictReduction: number;
    costSaving: number;
    utilizationImprovement: number;
    skillMatchImprovement: number;
  };
  suggestedChanges: Partial<SimpleAllocation>;
}

export interface OptimizationAnalysis {
  currentState: {
    totalAllocations: number;
    conflicts: AllocationConflict[];
    totalCost: number;
    averageUtilization: number;
    budgetUtilization: number;
  };
  suggestions: OptimizationSuggestion[];
  metrics: {
    conflictScore: number; // 0-100 (0 = no conflicts)
    costEfficiency: number; // 0-100
    utilizationBalance: number; // 0-100 (100 = perfectly balanced)
    skillAlignment: number; // 0-100
  };
}

export class SimpleOptimizationService {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = new DatabaseService();
  }

  /**
   * Analyze current allocations and detect conflicts
   */
  async analyzeAllocations(projectIds?: string[]): Promise<OptimizationAnalysis> {
    const allocations = await this.getAllocations(projectIds);
    const employees = await this.getEmployees();
    const projects = await this.getProjects(projectIds);

    // Detect conflicts
    const conflicts = await this.detectConflicts(allocations);
    
    // Calculate current metrics
    const currentState = {
      totalAllocations: allocations.length,
      conflicts,
      totalCost: this.calculateTotalCost(allocations),
      averageUtilization: await this.calculateAverageUtilization(allocations, employees),
      budgetUtilization: this.calculateBudgetUtilization(allocations, projects)
    };

    // Generate optimization suggestions
    const suggestions = await this.generateSuggestions(allocations, conflicts, employees, projects);

    // Calculate overall metrics
    const metrics = this.calculateMetrics(allocations, conflicts, employees, projects);

    return {
      currentState,
      suggestions,
      metrics
    };
  }

  /**
   * Generate optimization suggestions using greedy algorithms
   */
  async generateSuggestions(
    allocations: SimpleAllocation[],
    conflicts: AllocationConflict[],
    employees: any[],
    projects: any[]
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // 1. Resolve high-impact conflicts first (greedy approach)
    const criticalConflicts = conflicts
      .filter(c => c.severity === 'critical' || c.severity === 'high')
      .sort((a, b) => b.impactScore - a.impactScore);

    for (const conflict of criticalConflicts) {
      const suggestion = await this.resolveConflict(conflict, allocations, employees, projects);
      if (suggestion) suggestions.push(suggestion);
    }

    // 2. Optimize for cost efficiency
    const costOptimizations = await this.optimizeCosts(allocations, employees, projects);
    suggestions.push(...costOptimizations);

    // 3. Balance utilization
    const utilizationOptimizations = await this.balanceUtilization(allocations, employees);
    suggestions.push(...utilizationOptimizations);

    // 4. Improve skill matching
    const skillOptimizations = await this.optimizeSkillMatching(allocations, employees, projects);
    suggestions.push(...skillOptimizations);

    // Sort by impact score
    return suggestions.sort((a, b) => 
      (b.impact.conflictReduction + b.impact.costSaving + b.impact.utilizationImprovement) - 
      (a.impact.conflictReduction + a.impact.costSaving + a.impact.utilizationImprovement)
    );
  }

  /**
   * Detect conflicts across projects using simple overlap detection
   */
  async detectConflicts(allocations: SimpleAllocation[]): Promise<AllocationConflict[]> {
    const conflicts: AllocationConflict[] = [];

    // Group by employee for easier conflict detection
    const allocationsByEmployee = allocations.reduce((acc, allocation) => {
      if (!acc[allocation.employeeId]) acc[allocation.employeeId] = [];
      acc[allocation.employeeId].push(allocation);
      return acc;
    }, {} as Record<string, SimpleAllocation[]>);

    // Check for time overlaps and overallocations
    for (const [employeeId, empAllocations] of Object.entries(allocationsByEmployee)) {
      const sortedAllocations = empAllocations.sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

      for (let i = 0; i < sortedAllocations.length; i++) {
        for (let j = i + 1; j < sortedAllocations.length; j++) {
          const conflict = this.checkAllocationConflict(sortedAllocations[i], sortedAllocations[j]);
          if (conflict) conflicts.push(conflict);
        }

        // Check for weekly overallocation
        const weeklyHours = await this.calculateWeeklyHours(sortedAllocations[i], empAllocations);
        if (weeklyHours > 40) {
          conflicts.push({
            type: 'overallocation',
            severity: weeklyHours > 50 ? 'critical' : 'high',
            description: `Employee ${employeeId} allocated ${weeklyHours} hours/week (exceeds 40h limit)`,
            affectedAllocations: [sortedAllocations[i].id || ''],
            suggestedResolution: 'Reduce hours or redistribute to other employees',
            impactScore: Math.min(100, (weeklyHours - 40) * 5)
          });
        }
      }
    }

    // Check budget constraints
    const budgetConflicts = await this.checkBudgetConflicts(allocations);
    conflicts.push(...budgetConflicts);

    return conflicts;
  }

  /**
   * Check if two allocations conflict (time overlap)
   */
  private checkAllocationConflict(a1: SimpleAllocation, a2: SimpleAllocation): AllocationConflict | null {
    const start1 = new Date(a1.startDate);
    const end1 = new Date(a1.endDate);
    const start2 = new Date(a2.startDate);
    const end2 = new Date(a2.endDate);

    // Check for time overlap
    const hasOverlap = start1 <= end2 && start2 <= end1;
    
    if (hasOverlap) {
      const overlapDays = Math.min(end1.getTime(), end2.getTime()) - Math.max(start1.getTime(), start2.getTime());
      const overlapHours = (overlapDays / (1000 * 60 * 60 * 24)) * ((a1.allocatedHours + a2.allocatedHours) / 7);
      
      return {
        type: 'time_overlap',
        severity: overlapHours > 20 ? 'critical' : overlapHours > 10 ? 'high' : 'medium',
        description: `Time overlap between projects ${a1.projectId} and ${a2.projectId}`,
        affectedAllocations: [a1.id || '', a2.id || ''].filter(Boolean),
        suggestedResolution: 'Reschedule one allocation or reduce hours',
        impactScore: Math.min(100, overlapHours * 2)
      };
    }

    return null;
  }

  /**
   * Optimize costs using greedy algorithm (assign cheapest suitable resources first)
   */
  private async optimizeCosts(
    allocations: SimpleAllocation[],
    employees: any[],
    projects: any[]
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // Group allocations by project
    const allocationsByProject = allocations.reduce((acc, allocation) => {
      if (!acc[allocation.projectId]) acc[allocation.projectId] = [];
      acc[allocation.projectId].push(allocation);
      return acc;
    }, {} as Record<string, SimpleAllocation[]>);

    for (const [projectId, projectAllocations] of Object.entries(allocationsByProject)) {
      const project = projects.find(p => p.id === projectId);
      if (!project || !project.budget) continue;

      // Sort employees by hourly rate for this project's requirements
      const suitableEmployees = employees
        .filter(emp => this.hasRequiredSkills(emp, project))
        .sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));

      // Look for cost reduction opportunities
      for (const allocation of projectAllocations) {
        const currentEmployee = employees.find(e => e.id === allocation.employeeId);
        const cheaperAlternatives = suitableEmployees.filter(emp => 
          emp.id !== allocation.employeeId && 
          (emp.hourlyRate || 0) < (currentEmployee?.hourlyRate || 0)
        );

        if (cheaperAlternatives.length > 0) {
          const cheapest = cheaperAlternatives[0];
          const costSaving = ((currentEmployee?.hourlyRate || 0) - (cheapest.hourlyRate || 0)) * 
            allocation.allocatedHours * this.calculateDurationInWeeks(allocation);

          if (costSaving > 100) { // Only suggest if saving > $100
            suggestions.push({
              type: 'reassign',
              allocationId: allocation.id || '',
              description: `Reassign from ${currentEmployee?.name} to ${cheapest.name} to save $${costSaving.toFixed(2)}`,
              impact: {
                conflictReduction: 0,
                costSaving: costSaving,
                utilizationImprovement: 0,
                skillMatchImprovement: this.calculateSkillMatch(cheapest, project) - 
                  this.calculateSkillMatch(currentEmployee, project)
              },
              suggestedChanges: { employeeId: cheapest.id }
            });
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Balance utilization using simple redistribution
   */
  private async balanceUtilization(
    allocations: SimpleAllocation[],
    employees: any[]
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    const utilizationByEmployee = await this.calculateUtilizationByEmployee(allocations, employees);

    // Find over-utilized and under-utilized employees
    const overUtilized = Object.entries(utilizationByEmployee)
      .filter(([_, util]) => util > 80)
      .sort(([_, a], [__, b]) => b - a);

    const underUtilized = Object.entries(utilizationByEmployee)
      .filter(([_, util]) => util < 60)
      .sort(([_, a], [__, b]) => a - b);

    // Suggest redistributions
    for (const [overEmpId, overUtil] of overUtilized) {
      const overEmpAllocations = allocations.filter(a => a.employeeId === overEmpId);
      
      for (const [underEmpId, underUtil] of underUtilized) {
        const underEmployee = employees.find(e => e.id === underEmpId);
        
        // Find allocations that could be partially transferred
        for (const allocation of overEmpAllocations) {
          const project = await this.getProject(allocation.projectId);
          if (this.hasRequiredSkills(underEmployee, project)) {
            const transferHours = Math.min(
              allocation.allocatedHours * 0.5, // Transfer up to 50% of hours
              (80 - underUtil) / 100 * 40 // Don't exceed 80% utilization for under-utilized employee
            );

            if (transferHours >= 4) { // Minimum 4 hours transfer
              suggestions.push({
                type: 'redistribute',
                allocationId: allocation.id || '',
                description: `Transfer ${transferHours}h/week from ${overEmpId} to ${underEmpId}`,
                impact: {
                  conflictReduction: overUtil > 100 ? 20 : 0,
                  costSaving: 0,
                  utilizationImprovement: Math.abs(overUtil - 80) + Math.abs(underUtil - 70),
                  skillMatchImprovement: 0
                },
                suggestedChanges: { 
                  allocatedHours: allocation.allocatedHours - transferHours 
                }
              });
            }
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Optimize skill matching using greedy assignment
   */
  private async optimizeSkillMatching(
    allocations: SimpleAllocation[],
    employees: any[],
    projects: any[]
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    for (const allocation of allocations) {
      const currentEmployee = employees.find(e => e.id === allocation.employeeId);
      const project = projects.find(p => p.id === allocation.projectId);
      
      if (!currentEmployee || !project) continue;

      const currentSkillMatch = this.calculateSkillMatch(currentEmployee, project);
      
      // Find employees with better skill matches
      const betterMatches = employees
        .filter(emp => emp.id !== allocation.employeeId)
        .map(emp => ({
          employee: emp,
          skillMatch: this.calculateSkillMatch(emp, project)
        }))
        .filter(match => match.skillMatch > currentSkillMatch + 0.1) // At least 10% better
        .sort((a, b) => b.skillMatch - a.skillMatch);

      if (betterMatches.length > 0) {
        const bestMatch = betterMatches[0];
        suggestions.push({
          type: 'reassign',
          allocationId: allocation.id || '',
          description: `Reassign to ${bestMatch.employee.name} for better skill match (${(bestMatch.skillMatch * 100).toFixed(1)}% vs ${(currentSkillMatch * 100).toFixed(1)}%)`,
          impact: {
            conflictReduction: 0,
            costSaving: 0,
            utilizationImprovement: 0,
            skillMatchImprovement: (bestMatch.skillMatch - currentSkillMatch) * 100
          },
          suggestedChanges: { employeeId: bestMatch.employee.id }
        });
      }
    }

    return suggestions;
  }

  /**
   * Resolve a specific conflict
   */
  private async resolveConflict(
    conflict: AllocationConflict,
    allocations: SimpleAllocation[],
    employees: any[],
    projects: any[]
  ): Promise<OptimizationSuggestion | null> {
    const affectedAllocations = allocations.filter(a => 
      conflict.affectedAllocations.includes(a.id || '')
    );

    switch (conflict.type) {
      case 'time_overlap':
        return this.resolveTimeOverlap(conflict, affectedAllocations, employees);
      case 'overallocation':
        return this.resolveOverallocation(conflict, affectedAllocations, employees);
      case 'budget_exceeded':
        return this.resolveBudgetExceeded(conflict, affectedAllocations, projects);
      default:
        return null;
    }
  }

  // Helper methods for conflict resolution
  private resolveTimeOverlap(
    conflict: AllocationConflict,
    allocations: SimpleAllocation[],
    employees: any[]
  ): OptimizationSuggestion | null {
    if (allocations.length !== 2) return null;

    const [a1, a2] = allocations;
    // Simple strategy: reschedule the lower priority allocation
    const allocationToReschedule = new Date(a1.startDate) < new Date(a2.startDate) ? a2 : a1;
    const otherAllocation = allocationToReschedule === a1 ? a2 : a1;

    const newStartDate = new Date(otherAllocation.endDate);
    newStartDate.setDate(newStartDate.getDate() + 1);

    return {
      type: 'reschedule',
      allocationId: allocationToReschedule.id || '',
      description: `Reschedule to start after conflicting allocation ends`,
      impact: {
        conflictReduction: conflict.impactScore,
        costSaving: 0,
        utilizationImprovement: 0,
        skillMatchImprovement: 0
      },
      suggestedChanges: {
        startDate: newStartDate.toISOString().split('T')[0]
      }
    };
  }

  private resolveOverallocation(
    conflict: AllocationConflict,
    allocations: SimpleAllocation[],
    employees: any[]
  ): OptimizationSuggestion | null {
    if (allocations.length === 0) return null;

    const allocation = allocations[0];
    const newHours = Math.min(allocation.allocatedHours, 32); // Reduce to max 32 hours/week

    return {
      type: 'reduce_hours',
      allocationId: allocation.id || '',
      description: `Reduce hours from ${allocation.allocatedHours} to ${newHours} per week`,
      impact: {
        conflictReduction: conflict.impactScore,
        costSaving: 0,
        utilizationImprovement: 0,
        skillMatchImprovement: 0
      },
      suggestedChanges: {
        allocatedHours: newHours
      }
    };
  }

  private resolveBudgetExceeded(
    conflict: AllocationConflict,
    allocations: SimpleAllocation[],
    projects: any[]
  ): OptimizationSuggestion | null {
    // Find the most expensive allocation to reduce or replace
    const mostExpensive = allocations.reduce((max, allocation) => 
      (allocation.hourlyRate || 0) > (max.hourlyRate || 0) ? allocation : max
    );

    return {
      type: 'reduce_hours',
      allocationId: mostExpensive.id || '',
      description: `Reduce hours on most expensive allocation to stay within budget`,
      impact: {
        conflictReduction: conflict.impactScore,
        costSaving: (mostExpensive.hourlyRate || 0) * 4 * this.calculateDurationInWeeks(mostExpensive),
        utilizationImprovement: 0,
        skillMatchImprovement: 0
      },
      suggestedChanges: {
        allocatedHours: mostExpensive.allocatedHours - 4
      }
    };
  }

  // Utility methods
  private calculateTotalCost(allocations: SimpleAllocation[]): number {
    return allocations.reduce((total, allocation) => {
      const duration = this.calculateDurationInWeeks(allocation);
      return total + (allocation.hourlyRate || 0) * allocation.allocatedHours * duration;
    }, 0);
  }

  private calculateDurationInWeeks(allocation: SimpleAllocation): number {
    const start = new Date(allocation.startDate);
    const end = new Date(allocation.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays / 7;
  }

  private async calculateAverageUtilization(allocations: SimpleAllocation[], employees: any[]): Promise<number> {
    const utilizationByEmployee = await this.calculateUtilizationByEmployee(allocations, employees);
    const utilizations = Object.values(utilizationByEmployee);
    return utilizations.reduce((sum, util) => sum + util, 0) / utilizations.length;
  }

  private calculateBudgetUtilization(allocations: SimpleAllocation[], projects: any[]): number {
    const projectCosts: Record<string, number> = {};
    
    allocations.forEach(allocation => {
      const cost = (allocation.hourlyRate || 0) * allocation.allocatedHours * 
        this.calculateDurationInWeeks(allocation);
      projectCosts[allocation.projectId] = (projectCosts[allocation.projectId] || 0) + cost;
    });

    let totalBudget = 0;
    let totalSpent = 0;

    Object.entries(projectCosts).forEach(([projectId, spent]) => {
      const project = projects.find(p => p.id === projectId);
      if (project && project.budget) {
        totalBudget += project.budget;
        totalSpent += spent;
      }
    });

    return totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  }

  private async calculateUtilizationByEmployee(
    allocations: SimpleAllocation[], 
    employees: any[]
  ): Promise<Record<string, number>> {
    const utilization: Record<string, number> = {};

    employees.forEach(employee => {
      const empAllocations = allocations.filter(a => a.employeeId === employee.id);
      const totalHours = empAllocations.reduce((sum, allocation) => sum + allocation.allocatedHours, 0);
      utilization[employee.id] = (totalHours / 40) * 100; // Assuming 40h/week capacity
    });

    return utilization;
  }

  private async calculateWeeklyHours(
    allocation: SimpleAllocation, 
    allAllocations: SimpleAllocation[]
  ): Promise<number> {
    // Find overlapping allocations for the same employee
    const overlapping = allAllocations.filter(a => 
      a.employeeId === allocation.employeeId && 
      this.hasTimeOverlap(allocation, a)
    );

    return overlapping.reduce((total, a) => total + a.allocatedHours, 0);
  }

  private hasTimeOverlap(a1: SimpleAllocation, a2: SimpleAllocation): boolean {
    const start1 = new Date(a1.startDate);
    const end1 = new Date(a1.endDate);
    const start2 = new Date(a2.startDate);
    const end2 = new Date(a2.endDate);

    return start1 <= end2 && start2 <= end1;
  }

  private async checkBudgetConflicts(allocations: SimpleAllocation[]): Promise<AllocationConflict[]> {
    const conflicts: AllocationConflict[] = [];
    const projectCosts: Record<string, { cost: number; allocations: string[] }> = {};

    // Calculate costs by project
    allocations.forEach(allocation => {
      const cost = (allocation.hourlyRate || 0) * allocation.allocatedHours * 
        this.calculateDurationInWeeks(allocation);
      
      if (!projectCosts[allocation.projectId]) {
        projectCosts[allocation.projectId] = { cost: 0, allocations: [] };
      }
      
      projectCosts[allocation.projectId].cost += cost;
      projectCosts[allocation.projectId].allocations.push(allocation.id || '');
    });

    // Check against project budgets
    const projects = await this.getProjects();
    Object.entries(projectCosts).forEach(([projectId, data]) => {
      const project = projects.find(p => p.id === projectId);
      if (project && project.budget && data.cost > project.budget) {
        const overage = data.cost - project.budget;
        conflicts.push({
          type: 'budget_exceeded',
          severity: overage > project.budget * 0.2 ? 'critical' : 'high',
          description: `Project ${projectId} exceeds budget by $${overage.toFixed(2)}`,
          affectedAllocations: data.allocations,
          suggestedResolution: 'Reduce hours or reassign to lower-cost resources',
          impactScore: Math.min(100, (overage / project.budget) * 50)
        });
      }
    });

    return conflicts;
  }

  private calculateSkillMatch(employee: any, project: any): number {
    if (!employee.skills || !project.requiredSkills) return 0.5; // Default neutral score

    const empSkills = employee.skills.map((s: any) => s.name || s).map((s: string) => s.toLowerCase());
    const reqSkills = project.requiredSkills.map((s: any) => s.name || s).map((s: string) => s.toLowerCase());

    const matchedSkills = empSkills.filter((skill: string) => reqSkills.includes(skill));
    return reqSkills.length > 0 ? matchedSkills.length / reqSkills.length : 0.5;
  }

  private hasRequiredSkills(employee: any, project: any): boolean {
    return this.calculateSkillMatch(employee, project) >= 0.5; // At least 50% skill match
  }

  private calculateMetrics(
    allocations: SimpleAllocation[],
    conflicts: AllocationConflict[],
    employees: any[],
    projects: any[]
  ) {
    const conflictScore = Math.max(0, 100 - conflicts.reduce((sum, c) => sum + c.impactScore, 0) / 10);
    
    const totalCost = this.calculateTotalCost(allocations);
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const costEfficiency = totalBudget > 0 ? Math.max(0, 100 - (totalCost / totalBudget) * 100) : 50;

    const utilizationValues = Object.values(this.calculateUtilizationByEmployee(allocations, employees));
    const avgUtilization = utilizationValues.reduce((sum, util) => sum + util, 0) / utilizationValues.length;
    const utilizationVariance = utilizationValues.reduce((sum, util) => sum + Math.pow(util - avgUtilization, 2), 0) / utilizationValues.length;
    const utilizationBalance = Math.max(0, 100 - Math.sqrt(utilizationVariance));

    const skillMatches = allocations.map(allocation => {
      const employee = employees.find(e => e.id === allocation.employeeId);
      const project = projects.find(p => p.id === allocation.projectId);
      return this.calculateSkillMatch(employee, project);
    });
    const skillAlignment = (skillMatches.reduce((sum, match) => sum + match, 0) / skillMatches.length) * 100;

    return {
      conflictScore,
      costEfficiency,
      utilizationBalance,
      skillAlignment
    };
  }

  // Database helper methods
  private async getAllocations(projectIds?: string[]): Promise<SimpleAllocation[]> {
    let query = `
      SELECT a.*, e.hourly_rate, e.first_name || ' ' || e.last_name as employee_name,
             p.name as project_name
      FROM allocations a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.is_active = true
    `;

    const params: any[] = [];
    if (projectIds && projectIds.length > 0) {
      query += ` AND a.project_id = ANY($1)`;
      params.push(projectIds);
    }

    const result = await dbService.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      projectId: row.project_id,
      startDate: row.start_date,
      endDate: row.end_date,
      allocatedHours: row.allocated_hours,
      hourlyRate: row.hourly_rate || 0,
      role: row.role
    }));
  }

  private async getEmployees(): Promise<any[]> {
    const result = await dbService.query(`
      SELECT e.*, 
             json_agg(DISTINCT jsonb_build_object('name', s.name, 'level', es.proficiency_level)) as skills
      FROM employees e
      LEFT JOIN employee_skills es ON e.id = es.employee_id
      LEFT JOIN skills s ON es.skill_id = s.id
      WHERE e.is_active = true
      GROUP BY e.id
    `);
    
    return result.rows.map(row => ({
      ...row,
      skills: row.skills?.filter((s: any) => s.name) || []
    }));
  }

  private async getProjects(projectIds?: string[]): Promise<any[]> {
    let query = `
      SELECT p.*,
             json_agg(DISTINCT s.name) as required_skills
      FROM projects p
      LEFT JOIN project_skills ps ON p.id = ps.project_id
      LEFT JOIN skills s ON ps.skill_id = s.id
      WHERE p.is_active = true
    `;

    const params: any[] = [];
    if (projectIds && projectIds.length > 0) {
      query += ` AND p.id = ANY($1)`;
      params.push(projectIds);
    }

    query += ` GROUP BY p.id`;

    const result = await dbService.query(query, params);
    return result.rows.map(row => ({
      ...row,
      requiredSkills: row.required_skills?.filter((s: string) => s) || []
    }));
  }

  private async getProject(projectId: string): Promise<any> {
    const projects = await this.getProjects([projectId]);
    return projects[0] || null;
  }
}
import { DatabaseService } from '../database/database.service';
import { ApiError } from '../utils/api-error';
import * as _ from 'lodash';

// Constraint Satisfaction Problem types
interface CSPVariable {
  id: string;
  name: string;
  domain: any[];
  currentValue?: any;
  constraints: string[];
}

interface CSPConstraint {
  id: string;
  name: string;
  type: 'unary' | 'binary' | 'n-ary' | 'global';
  scope: string[]; // Variable IDs involved
  predicate: (values: any[]) => boolean;
  weight: number; // For soft constraints
  priority: number;
  description: string;
}

interface CSPSolution {
  variables: Map<string, any>;
  satisfied: boolean;
  violations: ConstraintViolation[];
  objectiveValue: number;
  searchStats: SearchStatistics;
}

interface ConstraintViolation {
  constraintId: string;
  constraintName: string;
  violatingVariables: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedFix?: string;
}

interface SearchStatistics {
  backtracks: number;
  constraintChecks: number;
  timeElapsed: number;
  nodesExplored: number;
  prunings: number;
}

interface ResourceConstraintInput {
  employees: EmployeeConstraintData[];
  projects: ProjectConstraintData[];
  timeWindows: TimeWindow[];
  constraints: ConstraintDefinition[];
  preferences: PreferenceDefinition[];
}

interface EmployeeConstraintData {
  id: string;
  name: string;
  skills: SkillLevel[];
  availability: AvailabilitySlot[];
  maxHoursPerWeek: number;
  hourlyRate: number;
  preferences: EmployeePreference[];
  constraints: string[];
}

interface ProjectConstraintData {
  id: string;
  name: string;
  priority: number;
  startDate: Date;
  endDate: Date;
  requiredSkills: SkillRequirement[];
  estimatedHours: number;
  maxBudget: number;
  flexibility: number;
  dependencies: string[];
}

interface TimeWindow {
  id: string;
  startDate: Date;
  endDate: Date;
  granularity: 'day' | 'week' | 'month';
}

interface ConstraintDefinition {
  id: string;
  type: 'capacity' | 'skill_match' | 'availability' | 'budget' | 'deadline' | 'preference' | 'dependency';
  scope: string[];
  expression: string;
  priority: 'hard' | 'soft';
  weight: number;
  parameters: any;
}

interface PreferenceDefinition {
  id: string;
  type: 'employee_project_preference' | 'skill_development' | 'workload_balance' | 'team_composition';
  weight: number;
  description: string;
  parameters: any;
}

interface SkillLevel {
  skillId: string;
  level: number;
  certified: boolean;
}

interface AvailabilitySlot {
  startDate: Date;
  endDate: Date;
  hoursPerWeek: number;
  notes?: string;
}

interface EmployeePreference {
  type: 'project_type' | 'team_size' | 'client' | 'technology' | 'schedule';
  value: any;
  weight: number;
}

interface SkillRequirement {
  skillId: string;
  minimumLevel: number;
  required: boolean;
  weight: number;
}

export class ConstraintSolverService {
  private db: DatabaseService;
  private variables: Map<string, CSPVariable> = new Map();
  private constraints: Map<string, CSPConstraint> = new Map();

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Main constraint satisfaction solver
   */
  async solveResourceConstraints(input: ResourceConstraintInput): Promise<CSPSolution> {
    try {
      const startTime = Date.now();
      
      // Initialize CSP from input
      await this.initializeCSP(input);
      
      // Apply constraint propagation
      await this.propagateConstraints();
      
      // Solve using backtracking with intelligent heuristics
      const solution = await this.backtrackingSearch();
      
      // Validate and optimize solution
      const optimizedSolution = await this.optimizeSolution(solution);
      
      const endTime = Date.now();
      
      return {
        ...optimizedSolution,
        searchStats: {
          ...optimizedSolution.searchStats,
          timeElapsed: endTime - startTime
        }
      };

    } catch (error) {
      console.error('Error in constraint solving:', error);
      throw new ApiError(500, 'Failed to solve resource constraints');
    }
  }

  /**
   * Initialize CSP variables and constraints from input data
   */
  private async initializeCSP(input: ResourceConstraintInput): Promise<void> {
    this.variables.clear();
    this.constraints.clear();
    
    // Create assignment variables: x[employee][project][timeWindow]
    for (const employee of input.employees) {
      for (const project of input.projects) {
        for (const timeWindow of input.timeWindows) {
          const variableId = `assign_${employee.id}_${project.id}_${timeWindow.id}`;
          
          // Domain: possible hour allocations (0 to max hours)
          const maxHours = Math.min(
            employee.maxHoursPerWeek,
            this.calculateMaxProjectHours(project, timeWindow)
          );
          
          const domain = [];
          for (let h = 0; h <= maxHours; h += 0.5) { // 0.5 hour increments
            domain.push(h);
          }
          
          this.variables.set(variableId, {
            id: variableId,
            name: `${employee.name} -> ${project.name} (${timeWindow.id})`,
            domain,
            constraints: []
          });
        }
      }
    }
    
    // Initialize constraints
    await this.initializeConstraints(input);
  }

  /**
   * Initialize all types of constraints
   */
  private async initializeConstraints(input: ResourceConstraintInput): Promise<void> {
    // Capacity constraints
    this.addCapacityConstraints(input.employees, input.timeWindows);
    
    // Skill matching constraints
    this.addSkillMatchingConstraints(input.employees, input.projects);
    
    // Availability constraints
    this.addAvailabilityConstraints(input.employees, input.timeWindows);
    
    // Budget constraints
    this.addBudgetConstraints(input.projects);
    
    // Project requirement constraints
    this.addProjectRequirementConstraints(input.projects, input.timeWindows);
    
    // Dependency constraints
    this.addDependencyConstraints(input.projects);
    
    // Preference constraints (soft)
    this.addPreferenceConstraints(input.preferences);
    
    // Custom constraints from input
    this.addCustomConstraints(input.constraints);
  }

  /**
   * Add capacity constraints: sum of allocations <= employee capacity
   */
  private addCapacityConstraints(employees: EmployeeConstraintData[], timeWindows: TimeWindow[]): void {
    for (const employee of employees) {
      for (const timeWindow of timeWindows) {
        const constraintId = `capacity_${employee.id}_${timeWindow.id}`;
        
        // Get all assignment variables for this employee in this time window
        const relevantVarIds = Array.from(this.variables.keys())
          .filter(varId => 
            varId.includes(`assign_${employee.id}_`) && 
            varId.endsWith(`_${timeWindow.id}`)
          );
        
        this.constraints.set(constraintId, {
          id: constraintId,
          name: `Capacity constraint for ${employee.name} in ${timeWindow.id}`,
          type: 'n-ary',
          scope: relevantVarIds,
          predicate: (values: number[]) => {
            const totalHours = values.reduce((sum, hours) => sum + hours, 0);
            return totalHours <= employee.maxHoursPerWeek;
          },
          weight: 1.0,
          priority: 1,
          description: `Employee ${employee.name} cannot exceed ${employee.maxHoursPerWeek} hours per week`
        });
        
        // Update variable constraints
        relevantVarIds.forEach(varId => {
          const variable = this.variables.get(varId);
          if (variable) {
            variable.constraints.push(constraintId);
          }
        });
      }
    }
  }

  /**
   * Add skill matching constraints
   */
  private addSkillMatchingConstraints(employees: EmployeeConstraintData[], projects: ProjectConstraintData[]): void {
    for (const project of projects) {
      for (const skillReq of project.requiredSkills) {
        if (skillReq.required) {
          const constraintId = `skill_${project.id}_${skillReq.skillId}`;
          
          // Find employees who have this skill at required level
          const qualifiedEmployees = employees.filter(emp =>
            emp.skills.some(skill => 
              skill.skillId === skillReq.skillId && 
              skill.level >= skillReq.minimumLevel
            )
          );
          
          if (qualifiedEmployees.length === 0) {
            console.warn(`No qualified employees for skill ${skillReq.skillId} in project ${project.id}`);
            continue;
          }
          
          // Get assignment variables for qualified employees
          const relevantVarIds = Array.from(this.variables.keys())
            .filter(varId => 
              varId.includes(`_${project.id}_`) &&
              qualifiedEmployees.some(emp => varId.includes(`assign_${emp.id}_`))
            );
          
          this.constraints.set(constraintId, {
            id: constraintId,
            name: `Skill requirement: ${skillReq.skillId} for project ${project.name}`,
            type: 'n-ary',
            scope: relevantVarIds,
            predicate: (values: number[]) => {
              // At least one qualified employee must be assigned
              return values.some(hours => hours > 0);
            },
            weight: skillReq.weight,
            priority: 1,
            description: `Project ${project.name} requires skill ${skillReq.skillId} at level ${skillReq.minimumLevel}`
          });
          
          relevantVarIds.forEach(varId => {
            const variable = this.variables.get(varId);
            if (variable) {
              variable.constraints.push(constraintId);
            }
          });
        }
      }
    }
  }

  /**
   * Add availability constraints
   */
  private addAvailabilityConstraints(employees: EmployeeConstraintData[], timeWindows: TimeWindow[]): void {
    for (const employee of employees) {
      for (const timeWindow of timeWindows) {
        // Check if employee is available during this time window
        const isAvailable = employee.availability.some(slot =>
          this.timeWindowOverlaps(slot, timeWindow)
        );
        
        if (!isAvailable) {
          const constraintId = `availability_${employee.id}_${timeWindow.id}`;
          
          const relevantVarIds = Array.from(this.variables.keys())
            .filter(varId => 
              varId.includes(`assign_${employee.id}_`) && 
              varId.endsWith(`_${timeWindow.id}`)
            );
          
          this.constraints.set(constraintId, {
            id: constraintId,
            name: `Availability constraint for ${employee.name} in ${timeWindow.id}`,
            type: 'n-ary',
            scope: relevantVarIds,
            predicate: (values: number[]) => {
              // All assignments must be 0 when employee is not available
              return values.every(hours => hours === 0);
            },
            weight: 1.0,
            priority: 1,
            description: `Employee ${employee.name} is not available during ${timeWindow.id}`
          });
          
          relevantVarIds.forEach(varId => {
            const variable = this.variables.get(varId);
            if (variable) {
              variable.constraints.push(constraintId);
            }
          });
        }
      }
    }
  }

  /**
   * Add budget constraints
   */
  private addBudgetConstraints(projects: ProjectConstraintData[]): void {
    for (const project of projects) {
      const constraintId = `budget_${project.id}`;
      
      const relevantVarIds = Array.from(this.variables.keys())
        .filter(varId => varId.includes(`_${project.id}_`));
      
      this.constraints.set(constraintId, {
        id: constraintId,
        name: `Budget constraint for project ${project.name}`,
        type: 'n-ary',
        scope: relevantVarIds,
        predicate: (values: number[]) => {
          // Calculate total cost based on assignments
          let totalCost = 0;
          
          relevantVarIds.forEach((varId, index) => {
            const employeeId = this.extractEmployeeIdFromVariable(varId);
            const employee = this.getEmployeeById(employeeId);
            if (employee) {
              totalCost += values[index] * employee.hourlyRate;
            }
          });
          
          return totalCost <= project.maxBudget;
        },
        weight: 1.0,
        priority: 1,
        description: `Project ${project.name} budget cannot exceed ${project.maxBudget}`
      });
      
      relevantVarIds.forEach(varId => {
        const variable = this.variables.get(varId);
        if (variable) {
          variable.constraints.push(constraintId);
        }
      });
    }
  }

  /**
   * Add project requirement constraints
   */
  private addProjectRequirementConstraints(projects: ProjectConstraintData[], timeWindows: TimeWindow[]): void {
    for (const project of projects) {
      const constraintId = `requirement_${project.id}`;
      
      const relevantVarIds = Array.from(this.variables.keys())
        .filter(varId => varId.includes(`_${project.id}_`));
      
      this.constraints.set(constraintId, {
        id: constraintId,
        name: `Requirement constraint for project ${project.name}`,
        type: 'n-ary',
        scope: relevantVarIds,
        predicate: (values: number[]) => {
          // Total assigned hours should meet project requirements
          const totalAssignedHours = values.reduce((sum, hours) => sum + hours, 0);
          
          // Allow some flexibility based on project flexibility factor
          const minRequired = project.estimatedHours * (1 - project.flexibility);
          const maxAllowed = project.estimatedHours * (1 + project.flexibility);
          
          return totalAssignedHours >= minRequired && totalAssignedHours <= maxAllowed;
        },
        weight: 1.0,
        priority: 1,
        description: `Project ${project.name} requires approximately ${project.estimatedHours} hours`
      });
      
      relevantVarIds.forEach(varId => {
        const variable = this.variables.get(varId);
        if (variable) {
          variable.constraints.push(constraintId);
        }
      });
    }
  }

  /**
   * Add dependency constraints
   */
  private addDependencyConstraints(projects: ProjectConstraintData[]): void {
    for (const project of projects) {
      for (const dependencyId of project.dependencies) {
        const constraintId = `dependency_${project.id}_${dependencyId}`;
        
        // Implementation depends on how dependencies are modeled
        // This is a simplified version
        this.constraints.set(constraintId, {
          id: constraintId,
          name: `Dependency: ${project.name} depends on ${dependencyId}`,
          type: 'binary',
          scope: [project.id, dependencyId],
          predicate: (values: any[]) => {
            // Ensure dependency project is completed before dependent project starts
            return true; // Simplified implementation
          },
          weight: 1.0,
          priority: 1,
          description: `Project ${project.name} cannot start until ${dependencyId} is completed`
        });
      }
    }
  }

  /**
   * Add preference constraints (soft constraints)
   */
  private addPreferenceConstraints(preferences: PreferenceDefinition[]): void {
    for (const preference of preferences) {
      const constraintId = `preference_${preference.id}`;
      
      this.constraints.set(constraintId, {
        id: constraintId,
        name: `Preference: ${preference.description}`,
        type: 'global',
        scope: [], // Will be determined based on preference type
        predicate: (values: any[]) => {
          // Implementation varies by preference type
          return this.evaluatePreference(preference, values);
        },
        weight: preference.weight,
        priority: 2, // Lower priority than hard constraints
        description: preference.description
      });
    }
  }

  /**
   * Add custom constraints from input
   */
  private addCustomConstraints(constraints: ConstraintDefinition[]): void {
    for (const constraint of constraints) {
      this.constraints.set(constraint.id, {
        id: constraint.id,
        name: `Custom: ${constraint.id}`,
        type: constraint.scope.length <= 1 ? 'unary' : constraint.scope.length === 2 ? 'binary' : 'n-ary',
        scope: constraint.scope,
        predicate: (values: any[]) => {
          // Evaluate custom constraint expression
          return this.evaluateConstraintExpression(constraint.expression, values, constraint.parameters);
        },
        weight: constraint.weight,
        priority: constraint.priority === 'hard' ? 1 : 2,
        description: `Custom constraint: ${constraint.expression}`
      });
    }
  }

  /**
   * Apply constraint propagation techniques
   */
  private async propagateConstraints(): Promise<void> {
    let changed = true;
    let iterations = 0;
    const maxIterations = 100;
    
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      
      // Apply arc consistency (AC-3)
      const arcConsistencyResult = await this.applyArcConsistency();
      if (arcConsistencyResult.changed) {
        changed = true;
      }
      
      // Apply forward checking
      const forwardCheckingResult = await this.applyForwardChecking();
      if (forwardCheckingResult.changed) {
        changed = true;
      }
      
      // Apply constraint propagation for global constraints
      const globalPropagationResult = await this.applyGlobalConstraintPropagation();
      if (globalPropagationResult.changed) {
        changed = true;
      }
    }
  }

  /**
   * Apply Arc Consistency (AC-3 algorithm)
   */
  private async applyArcConsistency(): Promise<{ changed: boolean; prunings: number }> {
    let changed = false;
    let prunings = 0;
    
    // Create queue of arcs to check
    const arcs: Array<[string, string, string]> = []; // [var1, var2, constraint]
    
    for (const [constraintId, constraint] of this.constraints) {
      if (constraint.type === 'binary') {
        const [var1, var2] = constraint.scope;
        arcs.push([var1, var2, constraintId]);
        arcs.push([var2, var1, constraintId]);
      }
    }
    
    while (arcs.length > 0) {
      const [xi, xj, constraintId] = arcs.shift()!;
      
      if (await this.makeArcConsistent(xi, xj, constraintId)) {
        changed = true;
        prunings++;
        
        const xiVariable = this.variables.get(xi);
        if (!xiVariable || xiVariable.domain.length === 0) {
          // Domain wiped out - inconsistency detected
          throw new Error(`Domain wiped out for variable ${xi}`);
        }
        
        // Add all arcs (xk, xi) for each constraint involving xi
        for (const otherConstraintId of xiVariable.constraints) {
          if (otherConstraintId !== constraintId) {
            const otherConstraint = this.constraints.get(otherConstraintId);
            if (otherConstraint && otherConstraint.type === 'binary') {
              const otherVar = otherConstraint.scope.find(v => v !== xi);
              if (otherVar) {
                arcs.push([otherVar, xi, otherConstraintId]);
              }
            }
          }
        }
      }
    }
    
    return { changed, prunings };
  }

  /**
   * Make arc (xi, xj) consistent with respect to constraint
   */
  private async makeArcConsistent(xi: string, xj: string, constraintId: string): Promise<boolean> {
    const xiVariable = this.variables.get(xi);
    const xjVariable = this.variables.get(xj);
    const constraint = this.constraints.get(constraintId);
    
    if (!xiVariable || !xjVariable || !constraint) {
      return false;
    }
    
    let changed = false;
    const newDomain = [];
    
    for (const xiValue of xiVariable.domain) {
      let hasSupport = false;
      
      for (const xjValue of xjVariable.domain) {
        // Test if this combination satisfies the constraint
        const values = constraint.scope.map(varId => {
          if (varId === xi) return xiValue;
          if (varId === xj) return xjValue;
          return null; // Other variables not involved in binary constraint
        });
        
        if (constraint.predicate(values.filter(v => v !== null))) {
          hasSupport = true;
          break;
        }
      }
      
      if (hasSupport) {
        newDomain.push(xiValue);
      } else {
        changed = true;
      }
    }
    
    xiVariable.domain = newDomain;
    return changed;
  }

  /**
   * Apply forward checking
   */
  private async applyForwardChecking(): Promise<{ changed: boolean; prunings: number }> {
    // Simplified forward checking implementation
    return { changed: false, prunings: 0 };
  }

  /**
   * Apply global constraint propagation
   */
  private async applyGlobalConstraintPropagation(): Promise<{ changed: boolean; prunings: number }> {
    // Apply specific propagation for global constraints like capacity constraints
    return { changed: false, prunings: 0 };
  }

  /**
   * Backtracking search with intelligent heuristics
   */
  private async backtrackingSearch(): Promise<CSPSolution> {
    const assignment = new Map<string, any>();
    const searchStats: SearchStatistics = {
      backtracks: 0,
      constraintChecks: 0,
      timeElapsed: 0,
      nodesExplored: 0,
      prunings: 0
    };
    
    const result = await this.backtrack(assignment, searchStats);
    
    if (result.satisfied) {
      return {
        variables: result.variables,
        satisfied: true,
        violations: [],
        objectiveValue: this.calculateObjectiveValue(result.variables),
        searchStats
      };
    } else {
      // Find best partial solution
      const violations = this.identifyViolations(result.variables);
      
      return {
        variables: result.variables,
        satisfied: false,
        violations,
        objectiveValue: this.calculateObjectiveValue(result.variables),
        searchStats
      };
    }
  }

  /**
   * Recursive backtracking with constraint propagation
   */
  private async backtrack(assignment: Map<string, any>, stats: SearchStatistics): Promise<{ satisfied: boolean; variables: Map<string, any> }> {
    stats.nodesExplored++;
    
    // Check if assignment is complete
    if (assignment.size === this.variables.size) {
      return { satisfied: this.isConsistent(assignment), variables: assignment };
    }
    
    // Select next variable using MRV heuristic
    const variable = this.selectVariable(assignment);
    if (!variable) {
      return { satisfied: false, variables: assignment };
    }
    
    // Order domain values using LCV heuristic
    const orderedValues = this.orderDomainValues(variable, assignment);
    
    for (const value of orderedValues) {
      assignment.set(variable.id, value);
      stats.constraintChecks++;
      
      if (this.isConsistentAssignment(variable.id, value, assignment)) {
        // Apply constraint propagation
        const savedDomains = this.saveDomains();
        const propagationResult = await this.forwardCheck(variable.id, value);
        
        if (propagationResult.consistent) {
          const result = await this.backtrack(assignment, stats);
          
          if (result.satisfied) {
            return result;
          }
        }
        
        // Restore domains
        this.restoreDomains(savedDomains);
        stats.prunings += propagationResult.prunings;
      }
      
      assignment.delete(variable.id);
      stats.backtracks++;
    }
    
    return { satisfied: false, variables: assignment };
  }

  /**
   * Select next variable using Minimum Remaining Values (MRV) heuristic
   */
  private selectVariable(assignment: Map<string, any>): CSPVariable | null {
    let bestVariable: CSPVariable | null = null;
    let minRemainingValues = Infinity;
    
    for (const [varId, variable] of this.variables) {
      if (!assignment.has(varId)) {
        const remainingValues = variable.domain.length;
        
        if (remainingValues < minRemainingValues) {
          minRemainingValues = remainingValues;
          bestVariable = variable;
        }
      }
    }
    
    return bestVariable;
  }

  /**
   * Order domain values using Least Constraining Value (LCV) heuristic
   */
  private orderDomainValues(variable: CSPVariable, assignment: Map<string, any>): any[] {
    // Sort values by how many choices they eliminate for other variables
    return variable.domain.slice().sort((a, b) => {
      const constraintsA = this.countConstraints(variable.id, a, assignment);
      const constraintsB = this.countConstraints(variable.id, b, assignment);
      return constraintsA - constraintsB;
    });
  }

  /**
   * Count how many constraints a value assignment would create
   */
  private countConstraints(variableId: string, value: any, assignment: Map<string, any>): number {
    let count = 0;
    
    const variable = this.variables.get(variableId);
    if (!variable) return 0;
    
    for (const constraintId of variable.constraints) {
      const constraint = this.constraints.get(constraintId);
      if (!constraint) continue;
      
      // Count how many other variables this constraint affects
      for (const otherVarId of constraint.scope) {
        if (otherVarId !== variableId && !assignment.has(otherVarId)) {
          const otherVariable = this.variables.get(otherVarId);
          if (otherVariable) {
            // Count values that would be eliminated
            for (const otherValue of otherVariable.domain) {
              const testAssignment = new Map(assignment);
              testAssignment.set(variableId, value);
              testAssignment.set(otherVarId, otherValue);
              
              if (!this.isConsistentAssignment(otherVarId, otherValue, testAssignment)) {
                count++;
              }
            }
          }
        }
      }
    }
    
    return count;
  }

  /**
   * Check if current assignment is consistent
   */
  private isConsistent(assignment: Map<string, any>): boolean {
    for (const [constraintId, constraint] of this.constraints) {
      if (!this.satisfiesConstraint(constraint, assignment)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if a specific variable assignment is consistent
   */
  private isConsistentAssignment(variableId: string, value: any, assignment: Map<string, any>): boolean {
    const variable = this.variables.get(variableId);
    if (!variable) return false;
    
    for (const constraintId of variable.constraints) {
      const constraint = this.constraints.get(constraintId);
      if (!constraint) continue;
      
      // Check if all variables in constraint scope are assigned
      const allAssigned = constraint.scope.every(varId => 
        assignment.has(varId) || varId === variableId
      );
      
      if (allAssigned) {
        const values = constraint.scope.map(varId => 
          varId === variableId ? value : assignment.get(varId)
        );
        
        if (!constraint.predicate(values)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Check if constraint is satisfied by current assignment
   */
  private satisfiesConstraint(constraint: CSPConstraint, assignment: Map<string, any>): boolean {
    // Check if all variables in scope are assigned
    const values = constraint.scope.map(varId => assignment.get(varId));
    
    if (values.some(v => v === undefined)) {
      return true; // Constraint not fully instantiated yet
    }
    
    return constraint.predicate(values);
  }

  /**
   * Forward checking after variable assignment
   */
  private async forwardCheck(variableId: string, value: any): Promise<{ consistent: boolean; prunings: number }> {
    let prunings = 0;
    const variable = this.variables.get(variableId);
    
    if (!variable) {
      return { consistent: false, prunings: 0 };
    }
    
    // Check constraints involving this variable
    for (const constraintId of variable.constraints) {
      const constraint = this.constraints.get(constraintId);
      if (!constraint) continue;
      
      // For each other variable in this constraint
      for (const otherVarId of constraint.scope) {
        if (otherVarId === variableId) continue;
        
        const otherVariable = this.variables.get(otherVarId);
        if (!otherVariable) continue;
        
        // Filter domain values that are inconsistent with new assignment
        const newDomain = otherVariable.domain.filter(otherValue => {
          const values = constraint.scope.map(varId => {
            if (varId === variableId) return value;
            if (varId === otherVarId) return otherValue;
            return null; // Other variables in constraint
          });
          
          return constraint.predicate(values.filter(v => v !== null));
        });
        
        if (newDomain.length === 0) {
          return { consistent: false, prunings };
        }
        
        if (newDomain.length < otherVariable.domain.length) {
          otherVariable.domain = newDomain;
          prunings++;
        }
      }
    }
    
    return { consistent: true, prunings };
  }

  /**
   * Save current domains
   */
  private saveDomains(): Map<string, any[]> {
    const savedDomains = new Map<string, any[]>();
    
    for (const [varId, variable] of this.variables) {
      savedDomains.set(varId, [...variable.domain]);
    }
    
    return savedDomains;
  }

  /**
   * Restore saved domains
   */
  private restoreDomains(savedDomains: Map<string, any[]>): void {
    for (const [varId, domain] of savedDomains) {
      const variable = this.variables.get(varId);
      if (variable) {
        variable.domain = domain;
      }
    }
  }

  /**
   * Calculate objective value for solution
   */
  private calculateObjectiveValue(assignment: Map<string, any>): number {
    let objectiveValue = 0;
    
    // Add soft constraint violations
    for (const [constraintId, constraint] of this.constraints) {
      if (constraint.priority > 1) { // Soft constraint
        const values = constraint.scope.map(varId => assignment.get(varId));
        
        if (values.every(v => v !== undefined)) {
          if (!constraint.predicate(values)) {
            objectiveValue += constraint.weight;
          }
        }
      }
    }
    
    return objectiveValue;
  }

  /**
   * Identify constraint violations
   */
  private identifyViolations(assignment: Map<string, any>): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    for (const [constraintId, constraint] of this.constraints) {
      const values = constraint.scope.map(varId => assignment.get(varId));
      
      if (values.every(v => v !== undefined)) {
        if (!constraint.predicate(values)) {
          violations.push({
            constraintId,
            constraintName: constraint.name,
            violatingVariables: constraint.scope,
            severity: constraint.priority === 1 ? 'critical' : 'medium',
            description: constraint.description,
            suggestedFix: this.generateConstraintFix(constraint, values)
          });
        }
      }
    }
    
    return violations;
  }

  /**
   * Optimize solution using local search
   */
  private async optimizeSolution(solution: CSPSolution): Promise<CSPSolution> {
    if (!solution.satisfied || solution.violations.length === 0) {
      return solution;
    }
    
    // Apply local search techniques like hill climbing or simulated annealing
    let currentSolution = { ...solution };
    let improved = true;
    let iterations = 0;
    const maxIterations = 100;
    
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      // Try to improve by modifying variable assignments
      for (const [varId, currentValue] of currentSolution.variables) {
        const variable = this.variables.get(varId);
        if (!variable) continue;
        
        for (const newValue of variable.domain) {
          if (newValue === currentValue) continue;
          
          // Test new assignment
          const testAssignment = new Map(currentSolution.variables);
          testAssignment.set(varId, newValue);
          
          const testObjective = this.calculateObjectiveValue(testAssignment);
          
          if (testObjective < currentSolution.objectiveValue) {
            currentSolution.variables.set(varId, newValue);
            currentSolution.objectiveValue = testObjective;
            currentSolution.violations = this.identifyViolations(testAssignment);
            improved = true;
            break;
          }
        }
        
        if (improved) break;
      }
    }
    
    return currentSolution;
  }

  // Helper methods

  private calculateMaxProjectHours(project: ProjectConstraintData, timeWindow: TimeWindow): number {
    // Calculate maximum hours that can be allocated to this project in this time window
    const projectDuration = project.endDate.getTime() - project.startDate.getTime();
    const timeWindowDuration = timeWindow.endDate.getTime() - timeWindow.startDate.getTime();
    
    const overlapDuration = Math.min(
      project.endDate.getTime(),
      timeWindow.endDate.getTime()
    ) - Math.max(
      project.startDate.getTime(),
      timeWindow.startDate.getTime()
    );
    
    if (overlapDuration <= 0) return 0;
    
    // Calculate based on overlap and project requirements
    const weeksInOverlap = overlapDuration / (1000 * 60 * 60 * 24 * 7);
    return Math.min(40, project.estimatedHours / weeksInOverlap); // Max 40 hours per week
  }

  private timeWindowOverlaps(availability: AvailabilitySlot, timeWindow: TimeWindow): boolean {
    return availability.startDate <= timeWindow.endDate && 
           availability.endDate >= timeWindow.startDate;
  }

  private extractEmployeeIdFromVariable(variableId: string): string {
    const parts = variableId.split('_');
    return parts[1]; // Format: assign_{employeeId}_{projectId}_{timeWindow}
  }

  private getEmployeeById(employeeId: string): EmployeeConstraintData | null {
    // This would be populated during initialization
    return null; // Placeholder
  }

  private evaluatePreference(preference: PreferenceDefinition, values: any[]): boolean {
    // Implement preference evaluation based on type
    switch (preference.type) {
      case 'employee_project_preference':
        return this.evaluateEmployeeProjectPreference(preference, values);
      case 'skill_development':
        return this.evaluateSkillDevelopmentPreference(preference, values);
      case 'workload_balance':
        return this.evaluateWorkloadBalancePreference(preference, values);
      case 'team_composition':
        return this.evaluateTeamCompositionPreference(preference, values);
      default:
        return true;
    }
  }

  private evaluateConstraintExpression(expression: string, values: any[], parameters: any): boolean {
    // Implement custom constraint expression evaluation
    // This would use a simple expression parser
    try {
      // Placeholder implementation - would use a proper expression evaluator
      return true;
    } catch (error) {
      console.error('Error evaluating constraint expression:', error);
      return false;
    }
  }

  private generateConstraintFix(constraint: CSPConstraint, values: any[]): string {
    // Generate suggested fix for constraint violation
    switch (constraint.type) {
      case 'unary':
        return `Adjust value for variable ${constraint.scope[0]}`;
      case 'binary':
        return `Adjust values for variables ${constraint.scope.join(' and ')}`;
      default:
        return `Review assignments for variables: ${constraint.scope.join(', ')}`;
    }
  }

  private evaluateEmployeeProjectPreference(preference: PreferenceDefinition, values: any[]): boolean {
    // Implementation for employee project preference evaluation
    return true;
  }

  private evaluateSkillDevelopmentPreference(preference: PreferenceDefinition, values: any[]): boolean {
    // Implementation for skill development preference evaluation
    return true;
  }

  private evaluateWorkloadBalancePreference(preference: PreferenceDefinition, values: any[]): boolean {
    // Implementation for workload balance preference evaluation
    return true;
  }

  private evaluateTeamCompositionPreference(preference: PreferenceDefinition, values: any[]): boolean {
    // Implementation for team composition preference evaluation
    return true;
  }
}
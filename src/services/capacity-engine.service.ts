import { ResourceAssignmentService } from './resource-assignment.service';
import { ProjectService } from './project.service';

export interface EmployeeAvailability {
  employeeId: number;
  totalHours: number;
  allocatedHours: number;
  availableHours: number;
  utilizationRate: number;
  conflicts: ResourceConflict[];
}

export interface ResourceConflict {
  conflictType: 'overlap' | 'overallocation';
  assignmentIds: number[];
  overlapDays: number;
  overAllocationHours: number;
  severity: 'low' | 'medium' | 'high';
}

export interface SkillMatch {
  employee: any;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  confidence: number;
}

export interface OptimizationResult {
  recommendations: ResourceRecommendation[];
  totalCost: number;
  completionTime: number;
  feasible: boolean;
  conflicts: ResourceConflict[];
  efficiency: number;
}

export interface ResourceRecommendation {
  employeeId: number;
  projectId: number;
  role: string;
  allocatedHours: number;
  confidence: number;
  reasoning: string;
}

export interface ProjectRequirements {
  projectId: number;
  requiredSkills: string[];
  duration: number;
  effortHours: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  startDate?: Date;
  endDate?: Date;
}

export class CapacityEngineService {
  constructor(
    private resourceAssignmentService: ResourceAssignmentService,
    private projectService: ProjectService
  ) {}

  async calculateEmployeeAvailability(
    employeeId: number,
    startDate: Date,
    endDate: Date
  ): Promise<EmployeeAvailability> {
    const assignments = await this.resourceAssignmentService.getAssignmentsByEmployee(
      employeeId,
      startDate,
      endDate
    );

    // Calculate total working hours in the period (assuming 8 hours/day, 5 days/week)
    const workingDays = this.calculateWorkingDays(startDate, endDate);
    const totalHours = workingDays * 8;

    // Calculate allocated hours and detect conflicts
    let allocatedHours = 0;
    const conflicts = await this.detectConflicts(assignments);

    // Sum up allocated hours, handling overlaps
    const timeSlots = this.createTimeSlots(startDate, endDate);
    assignments.forEach(assignment => {
      const assignmentSlots = this.getAssignmentTimeSlots(assignment, timeSlots);
      assignmentSlots.forEach(slot => {
        slot.allocatedHours = (slot.allocatedHours || 0) + assignment.allocatedHours / workingDays;
      });
    });

    allocatedHours = timeSlots.reduce((total, slot) => total + (slot.allocatedHours || 0), 0);

    return {
      employeeId,
      totalHours,
      allocatedHours: Math.round(allocatedHours),
      availableHours: Math.round(totalHours - allocatedHours),
      utilizationRate: allocatedHours / totalHours,
      conflicts
    };
  }

  async findSkillMatches(requiredSkills: string[], employees: any[]): Promise<SkillMatch[]> {
    const matches: SkillMatch[] = [];

    for (const employee of employees) {
      const employeeSkills = employee.skills || [];
      const matchedSkills = requiredSkills.filter(skill => employeeSkills.includes(skill));
      const missingSkills = requiredSkills.filter(skill => !employeeSkills.includes(skill));
      
      const matchScore = matchedSkills.length / requiredSkills.length;
      const confidence = this.calculateSkillMatchConfidence(matchedSkills, missingSkills, employee);

      matches.push({
        employee,
        matchScore,
        matchedSkills,
        missingSkills,
        confidence
      });
    }

    // Sort by match score descending
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  async optimizeResourceAllocation(requirements: ProjectRequirements): Promise<OptimizationResult> {
    const availableEmployees = await this.resourceAssignmentService.getAvailableEmployees(
      requirements.startDate || new Date(),
      requirements.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );

    // Find skill matches
    const skillMatches = await this.findSkillMatches(requirements.requiredSkills, availableEmployees);

    // Calculate optimal allocation using greedy algorithm with constraints
    const recommendations: ResourceRecommendation[] = [];
    let remainingEffort = requirements.effortHours;
    let totalCost = 0;
    let estimatedCompletionTime = 0;

    for (const match of skillMatches) {
      if (remainingEffort <= 0) break;

      const employee = match.employee;
      const weeklyCapacity = employee.weeklyCapacity || 40;
      const maxAllocation = Math.min(remainingEffort, weeklyCapacity * (requirements.duration / 7));
      
      if (maxAllocation > 0) {
        const allocation = Math.min(maxAllocation, remainingEffort);
        const hourlyCost = employee.hourlyCost || 75; // Default rate

        recommendations.push({
          employeeId: employee.id,
          projectId: requirements.projectId,
          role: this.suggestRole(match.matchedSkills, requirements.requiredSkills),
          allocatedHours: allocation,
          confidence: match.confidence,
          reasoning: `${Math.round(match.matchScore * 100)}% skill match, ${match.matchedSkills.join(', ')}`
        });

        remainingEffort -= allocation;
        totalCost += allocation * hourlyCost;
        estimatedCompletionTime = Math.max(estimatedCompletionTime, allocation / weeklyCapacity);
      }
    }

    // Check feasibility
    const feasible = remainingEffort <= 0;
    const conflicts = feasible ? [] : await this.identifyPotentialConflicts(recommendations);

    return {
      recommendations,
      totalCost,
      completionTime: estimatedCompletionTime,
      feasible,
      conflicts,
      efficiency: feasible ? 1 - (remainingEffort / requirements.effortHours) : 0
    };
  }

  async detectConflicts(assignments: any[]): Promise<ResourceConflict[]> {
    const conflicts: ResourceConflict[] = [];
    const employeeAssignments = new Map<number, any[]>();

    // Group assignments by employee
    assignments.forEach(assignment => {
      const employeeId = assignment.employeeId;
      if (!employeeAssignments.has(employeeId)) {
        employeeAssignments.set(employeeId, []);
      }
      employeeAssignments.get(employeeId)!.push(assignment);
    });

    // Check for conflicts per employee
    for (const [employeeId, empAssignments] of employeeAssignments) {
      for (let i = 0; i < empAssignments.length; i++) {
        for (let j = i + 1; j < empAssignments.length; j++) {
          const assignment1 = empAssignments[i];
          const assignment2 = empAssignments[j];

          const overlap = this.calculateOverlap(assignment1, assignment2);
          if (overlap.days > 0) {
            const overAllocation = this.calculateOverAllocation(assignment1, assignment2, overlap.days);
            
            conflicts.push({
              conflictType: overAllocation > 40 ? 'overallocation' : 'overlap',
              assignmentIds: [assignment1.id, assignment2.id],
              overlapDays: overlap.days,
              overAllocationHours: overAllocation,
              severity: this.assessConflictSeverity(overAllocation, overlap.days)
            });
          }
        }
      }

      // Check individual assignment over-allocation
      empAssignments.forEach(assignment => {
        const weeklyHours = assignment.allocatedHours;
        if (weeklyHours > 40) {
          conflicts.push({
            conflictType: 'overallocation',
            assignmentIds: [assignment.id],
            overlapDays: 0,
            overAllocationHours: weeklyHours - 40,
            severity: this.assessConflictSeverity(weeklyHours - 40, 0)
          });
        }
      });
    }

    return conflicts;
  }

  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let workingDays = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  }

  private createTimeSlots(startDate: Date, endDate: Date): any[] {
    const slots: any[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      if (current.getDay() !== 0 && current.getDay() !== 6) { // Working days only
        slots.push({
          date: new Date(current),
          allocatedHours: 0
        });
      }
      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  private getAssignmentTimeSlots(assignment: any, timeSlots: any[]): any[] {
    const assignmentStart = new Date(assignment.startDate);
    const assignmentEnd = new Date(assignment.endDate);

    return timeSlots.filter(slot => 
      slot.date >= assignmentStart && slot.date <= assignmentEnd
    );
  }

  private calculateSkillMatchConfidence(
    matchedSkills: string[],
    missingSkills: string[],
    employee: any
  ): number {
    // Base confidence on skill match ratio
    let confidence = matchedSkills.length / (matchedSkills.length + missingSkills.length);

    // Adjust based on employee experience or seniority
    if (employee.seniority === 'senior') confidence += 0.1;
    if (employee.seniority === 'junior') confidence -= 0.05;

    // Adjust based on previous project success
    if (employee.successRate && employee.successRate > 0.9) confidence += 0.05;

    return Math.min(1, Math.max(0, confidence));
  }

  private suggestRole(matchedSkills: string[], requiredSkills: string[]): string {
    // Simple role suggestion based on skills
    if (matchedSkills.includes('React') || matchedSkills.includes('Vue.js') || matchedSkills.includes('Angular')) {
      return 'Frontend Developer';
    }
    if (matchedSkills.includes('Node.js') || matchedSkills.includes('Python') || matchedSkills.includes('Java')) {
      return 'Backend Developer';
    }
    if (matchedSkills.includes('PostgreSQL') || matchedSkills.includes('MongoDB') || matchedSkills.includes('MySQL')) {
      return 'Database Developer';
    }
    if (matchedSkills.includes('Docker') || matchedSkills.includes('Kubernetes') || matchedSkills.includes('AWS')) {
      return 'DevOps Engineer';
    }
    
    return 'Developer';
  }

  private async identifyPotentialConflicts(recommendations: ResourceRecommendation[]): Promise<ResourceConflict[]> {
    // Check if recommended allocations create conflicts
    const conflicts: ResourceConflict[] = [];
    
    // Simple conflict detection based on total hours per employee
    const employeeHours = new Map<number, number>();
    
    recommendations.forEach(rec => {
      const current = employeeHours.get(rec.employeeId) || 0;
      employeeHours.set(rec.employeeId, current + rec.allocatedHours);
    });

    employeeHours.forEach((hours, employeeId) => {
      if (hours > 40) { // Weekly over-allocation
        conflicts.push({
          conflictType: 'overallocation',
          assignmentIds: recommendations
            .filter(r => r.employeeId === employeeId)
            .map(r => r.projectId), // Using projectId as proxy
          overlapDays: 0,
          overAllocationHours: hours - 40,
          severity: hours > 50 ? 'high' : 'medium'
        });
      }
    });

    return conflicts;
  }

  private calculateOverlap(assignment1: any, assignment2: any): { days: number } {
    const start1 = new Date(assignment1.startDate);
    const end1 = new Date(assignment1.endDate);
    const start2 = new Date(assignment2.startDate);
    const end2 = new Date(assignment2.endDate);

    const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
    const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));

    if (overlapStart <= overlapEnd) {
      const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
      const overlapDays = Math.ceil(overlapMs / (1000 * 60 * 60 * 24));
      return { days: overlapDays };
    }

    return { days: 0 };
  }

  private calculateOverAllocation(assignment1: any, assignment2: any, overlapDays: number): number {
    if (overlapDays === 0) return 0;

    const totalHours1 = assignment1.allocatedHours || 0;
    const totalHours2 = assignment2.allocatedHours || 0;
    
    // Estimate weekly hours based on assignment duration
    const duration1 = this.calculateWorkingDays(
      new Date(assignment1.startDate),
      new Date(assignment1.endDate)
    );
    const duration2 = this.calculateWorkingDays(
      new Date(assignment2.startDate),
      new Date(assignment2.endDate)
    );

    const weeklyHours1 = (totalHours1 / duration1) * 5;
    const weeklyHours2 = (totalHours2 / duration2) * 5;

    return Math.max(0, (weeklyHours1 + weeklyHours2) - 40);
  }

  private assessConflictSeverity(overAllocationHours: number, overlapDays: number): 'low' | 'medium' | 'high' {
    if (overAllocationHours > 15 || overlapDays > 10) return 'high';
    if (overAllocationHours > 5 || overlapDays > 5) return 'medium';
    return 'low';
  }
}
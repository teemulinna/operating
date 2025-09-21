import { DatabaseService } from '../database/database.service';
import { DatabaseFactory } from '../database/database-factory';
import { ApiError } from '../utils/api-error';
import { SkillMatcherService, SkillMatchCriteria } from './skill-matcher.service';
import { ResourceRecommendationEngine } from './resource-recommendation-engine.service';
import { CreateResourceAllocationInput, ResourceAllocation, EmployeeSkillMatch } from '../types';

export interface AllocationWithSkillMatch extends ResourceAllocation {
  skillMatchScore?: number;
  skillMatchDetails?: EmployeeSkillMatch;
  recommendationReasoning?: string[];
  alternativeEmployees?: Array<{
    employeeId: string;
    name: string;
    matchScore: number;
    reasoning: string;
  }>;
}

export interface SkillEnhancedAllocationInput extends CreateResourceAllocationInput {
  requireSkillMatch?: boolean;
  minimumSkillMatchScore?: number;
  includeRecommendations?: boolean;
  allowOverrideSkillMismatch?: boolean;
}

export interface AllocationRecommendations {
  primaryRecommendations: EmployeeSkillMatch[];
  alternativeRecommendations: EmployeeSkillMatch[];
  skillGaps: Array<{
    skillName: string;
    category: string;
    requiredLevel: number;
    currentBestLevel: number;
    gap: number;
  }>;
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  };
}

export class AllocationSkillIntegrationService {
  private db: DatabaseService;
  private skillMatcher: SkillMatcherService;
  private recommendationEngine: any; // TODO: Implement ResourceRecommendationEngine type

  constructor(db?: DatabaseService) {
    this.db = db || DatabaseService.getInstance();
    this.skillMatcher = new SkillMatcherService(this.db);
    // this.recommendationEngine = new ResourceRecommendationEngine(this.db); // TODO: Implement
  }

  static async create(): Promise<AllocationSkillIntegrationService> {
    const db = await DatabaseFactory.getDatabaseService();
    return new AllocationSkillIntegrationService(db);
  }

  /**
   * Create allocation with skill matching validation and recommendations
   */
  async createSkillAwareAllocation(
    input: SkillEnhancedAllocationInput
  ): Promise<{
    allocation: AllocationWithSkillMatch;
    recommendations: AllocationRecommendations;
    warnings: string[];
  }> {
    try {
      const warnings: string[] = [];
      
      // Get project and role requirements
      const projectSkillRequirements = await this.getProjectSkillRequirements(input.projectId);
      
      if (projectSkillRequirements.length === 0 && input.requireSkillMatch) {
        warnings.push('No skill requirements defined for this project role');
      }

      // Calculate skill match score for the proposed employee
      let skillMatchDetails: EmployeeSkillMatch | undefined;
      let recommendationData: AllocationRecommendations | undefined;

      if (projectSkillRequirements.length > 0) {
        const criteria: SkillMatchCriteria = {
          requiredSkills: projectSkillRequirements,
          projectId: input.projectId,
          roleTitle: input.roleOnProject,
          startDate: input.startDate,
          endDate: input.endDate,
          availabilityHours: input.allocatedHours
        };

        // Get skill match for the specific employee
        const allMatches = await this.skillMatcher.findResourceMatches(criteria, {
          maxResults: 100
        });

        skillMatchDetails = allMatches.find(match => match.employeeId === input.employeeId);

        // Generate comprehensive recommendations
        recommendationData = await this.generateAllocationRecommendations(
          criteria,
          input.employeeId,
          allMatches
        );

        // Validate minimum skill match requirements
        if (input.requireSkillMatch && skillMatchDetails) {
          const minimumScore = input.minimumSkillMatchScore || 60;
          if (skillMatchDetails.overallMatchScore < minimumScore) {
            if (!input.allowOverrideSkillMismatch) {
              throw new ApiError(
                400,
                `Employee skill match score (${skillMatchDetails.overallMatchScore}%) is below minimum requirement (${minimumScore}%)`
              );
            } else {
              warnings.push(
                `Employee skill match score (${skillMatchDetails.overallMatchScore}%) is below minimum requirement (${minimumScore}%) but override is allowed`
              );
            }
          }
        }
      }

      // Create the allocation (using existing allocation service logic)
      const allocationData = await this.createBasicAllocation(input);

      // Enhance allocation with skill match data
      const enhancedAllocation: AllocationWithSkillMatch = {
        ...allocationData
      };

      // Only add optional properties if they have values
      if (skillMatchDetails?.overallMatchScore !== undefined) {
        enhancedAllocation.skillMatchScore = skillMatchDetails.overallMatchScore;
      }
      if (skillMatchDetails) {
        enhancedAllocation.skillMatchDetails = skillMatchDetails;
      }
      if (skillMatchDetails?.reasoningNotes) {
        enhancedAllocation.recommendationReasoning = skillMatchDetails.reasoningNotes;
      }
      if (recommendationData?.alternativeRecommendations?.length && recommendationData.alternativeRecommendations.length > 0) {
        enhancedAllocation.alternativeEmployees = recommendationData?.alternativeRecommendations?.slice(0, 3).map(alt => ({
          employeeId: alt.employeeId,
          name: `${alt.employee.firstName} ${alt.employee.lastName}`,
          matchScore: alt.overallMatchScore,
          reasoning: alt.reasoningNotes[0] || 'Alternative resource match'
        }));
      }

      return {
        allocation: enhancedAllocation,
        recommendations: recommendationData || {
          primaryRecommendations: [],
          alternativeRecommendations: [],
          skillGaps: [],
          riskAssessment: { level: 'low', factors: [], recommendations: [] }
        },
        warnings
      };

    } catch (error) {
      console.error('Error creating skill-aware allocation:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to create skill-aware allocation');
    }
  }

  /**
   * Get skill match enhancement for existing allocation
   */
  async enhanceExistingAllocation(allocationId: string): Promise<AllocationWithSkillMatch> {
    try {
      // Get existing allocation
      const allocation = await this.getAllocationById(allocationId);
      if (!allocation) {
        throw new ApiError(404, 'Allocation not found');
      }

      // Get project skill requirements
      const projectSkillRequirements = await this.getProjectSkillRequirements(allocation.projectId);
      
      if (projectSkillRequirements.length === 0) {
        // Return allocation without skill enhancement if no requirements
        return allocation as AllocationWithSkillMatch;
      }

      // Calculate skill match
      const criteria: SkillMatchCriteria = {
        requiredSkills: projectSkillRequirements,
        projectId: allocation.projectId,
        roleTitle: allocation.roleOnProject,
        startDate: allocation.startDate,
        endDate: allocation.endDate,
        availabilityHours: allocation.allocatedHours
      };

      const matches = await this.skillMatcher.findResourceMatches(criteria, {
        maxResults: 50
      });

      const skillMatchDetails = matches.find(match => match.employeeId === allocation.employeeId);
      
      // Find alternatives
      const alternatives = matches
        .filter(match => match.employeeId !== allocation.employeeId)
        .slice(0, 3)
        .map(alt => ({
          employeeId: alt.employeeId,
          name: `${alt.employee.firstName} ${alt.employee.lastName}`,
          matchScore: alt.overallMatchScore,
          reasoning: alt.reasoningNotes[0] || 'Alternative resource match'
        }));

      return {
        ...allocation,
        skillMatchScore: skillMatchDetails?.overallMatchScore,
        skillMatchDetails: skillMatchDetails,
        recommendationReasoning: skillMatchDetails?.reasoningNotes,
        alternativeEmployees: alternatives
      } as AllocationWithSkillMatch;

    } catch (error) {
      console.error('Error enhancing allocation with skill match:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to enhance allocation with skill matching');
    }
  }

  /**
   * Get recommendations for improving allocation skill matches
   */
  async getSkillImprovementRecommendations(
    projectId: string,
    options: {
      includeTotalRestructure?: boolean;
      focusOnGaps?: boolean;
      budgetConstraints?: number;
    } = {}
  ): Promise<{
    currentAllocations: AllocationWithSkillMatch[];
    improvements: Array<{
      type: 'replacement' | 'addition' | 'training' | 'role_adjustment';
      description: string;
      impact: number;
      cost?: number;
      timeline?: string;
      affectedAllocations: string[];
    }>;
    overallProjectHealth: {
      skillCoverageScore: number;
      teamChemistryScore: number;
      riskLevel: 'low' | 'medium' | 'high';
      recommendations: string[];
    };
  }> {
    try {
      // Get all current allocations for the project
      const allocations = await this.getProjectAllocations(projectId);
      
      // Enhance each allocation with skill match data
      const enhancedAllocations = await Promise.all(
        allocations.map(allocation => this.enhanceExistingAllocation(allocation.id))
      );

      // Analyze overall project skill coverage
      const projectSkillRequirements = await this.getProjectSkillRequirements(projectId);
      const projectTeamAnalysis = await this.analyzeProjectTeamSkills(
        enhancedAllocations,
        projectSkillRequirements
      );

      // Generate improvement recommendations
      const improvements = await this.generateImprovementRecommendations(
        enhancedAllocations,
        projectSkillRequirements,
        options
      );

      return {
        currentAllocations: enhancedAllocations,
        improvements,
        overallProjectHealth: projectTeamAnalysis
      };

    } catch (error) {
      console.error('Error getting skill improvement recommendations:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to generate skill improvement recommendations');
    }
  }

  // Private helper methods

  private async getProjectSkillRequirements(projectId: string): Promise<SkillMatchCriteria['requiredSkills']> {
    try {
      const query = `
        SELECT DISTINCT
          s.id as skill_id,
          s.name as skill_name,
          s.category,
          pr.minimum_experience_level,
          pr.role_name,
          COALESCE(sr.minimum_proficiency, 3) as minimum_proficiency,
          COALESCE(sr.priority, 'required') as priority
        FROM projects p
        JOIN project_roles pr ON p.id = pr.project_id
        JOIN unnest(pr.required_skills) as skill_id ON true
        JOIN skills s ON s.id = skill_id
        LEFT JOIN skill_requirements sr ON sr.skill_id = s.id AND sr.project_id = p.id
        WHERE p.id = $1
        AND s.is_active = true
      `;

      const result = await this.db.query(query, [projectId]);
      
      return result.rows.map(row => ({
        skillId: row.skill_id,
        skillName: row.skill_name,
        category: row.category,
        minimumProficiency: parseInt(row.minimum_proficiency),
        weight: row.priority === 'critical' ? 10 : row.priority === 'required' ? 8 : 6,
        isRequired: row.priority !== 'optional'
      }));

    } catch (error) {
      console.error('Error getting project skill requirements:', error);
      return [];
    }
  }

  private async createBasicAllocation(input: CreateResourceAllocationInput): Promise<ResourceAllocation> {
    // This would integrate with the existing AllocationService
    // For now, return a mock allocation structure
    const allocationId = `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const allocation: ResourceAllocation = {
      id: allocationId,
      projectId: input.projectId,
      employeeId: input.employeeId,
      allocatedHours: input.allocatedHours,
      roleOnProject: input.roleOnProject,
      startDate: input.startDate,
      endDate: input.endDate,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Only add optional properties if they have values
    if (input.hourlyRate !== undefined) {
      allocation.hourlyRate = input.hourlyRate;
    }
    if (input.notes !== undefined) {
      allocation.notes = input.notes;
    }

    return allocation;
  }

  private async getAllocationById(allocationId: string): Promise<ResourceAllocation | null> {
    try {
      const query = `
        SELECT * FROM resource_allocations 
        WHERE id = $1 AND is_active = true
      `;

      const result = await this.db.query(query, [allocationId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const allocation: ResourceAllocation = {
        id: row.id,
        projectId: row.project_id,
        employeeId: row.employee_id,
        allocatedHours: parseFloat(row.allocated_hours),
        roleOnProject: row.role_on_project,
        startDate: new Date(row.start_date),
        endDate: new Date(row.end_date),
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };

      // Only add optional properties if they have values
      if (row.hourly_rate !== null && row.hourly_rate !== undefined) {
        allocation.hourlyRate = parseFloat(row.hourly_rate);
      }
      if (row.actual_hours !== null && row.actual_hours !== undefined) {
        allocation.actualHours = parseFloat(row.actual_hours);
      }
      if (row.notes !== null && row.notes !== undefined) {
        allocation.notes = row.notes;
      }

      return allocation;

    } catch (error) {
      console.error('Error getting allocation by ID:', error);
      return null;
    }
  }

  private async getProjectAllocations(projectId: string): Promise<ResourceAllocation[]> {
    try {
      const query = `
        SELECT * FROM resource_allocations 
        WHERE project_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `;

      const result = await this.db.query(query, [projectId]);
      
      return result.rows.map(row => {
        const allocation: ResourceAllocation = {
          id: row.id,
          projectId: row.project_id,
          employeeId: row.employee_id,
          allocatedHours: parseFloat(row.allocated_hours),
          roleOnProject: row.role_on_project,
          startDate: new Date(row.start_date),
          endDate: new Date(row.end_date),
          isActive: row.is_active,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        };

        // Only add optional properties if they have values
        if (row.hourly_rate !== null && row.hourly_rate !== undefined) {
          allocation.hourlyRate = parseFloat(row.hourly_rate);
        }
        if (row.actual_hours !== null && row.actual_hours !== undefined) {
          allocation.actualHours = parseFloat(row.actual_hours);
        }
        if (row.notes !== null && row.notes !== undefined) {
          allocation.notes = row.notes;
        }

        return allocation;
      });

    } catch (error) {
      console.error('Error getting project allocations:', error);
      return [];
    }
  }

  private async generateAllocationRecommendations(
    criteria: SkillMatchCriteria,
    selectedEmployeeId: string,
    allMatches: EmployeeSkillMatch[]
  ): Promise<AllocationRecommendations> {
    // Get top recommendations (excluding selected employee)
    const primaryRecommendations = allMatches
      .filter(match => match.employeeId !== selectedEmployeeId)
      .slice(0, 5);

    const alternativeRecommendations = allMatches
      .filter(match => match.employeeId !== selectedEmployeeId)
      .slice(5, 10);

    // Identify skill gaps
    const skillGaps: AllocationRecommendations['skillGaps'] = [];
    
    for (const requiredSkill of criteria.requiredSkills) {
      const bestMatch = allMatches.reduce((best, current) => {
        const currentSkillMatch = current.skillMatches.find(sm => sm.skillId === requiredSkill.skillId);
        const bestSkillMatch = best?.skillMatches.find(sm => sm.skillId === requiredSkill.skillId);
        
        const currentLevel = currentSkillMatch?.employeeProficiency || 0;
        const bestLevel = bestSkillMatch?.employeeProficiency || 0;
        
        return currentLevel > bestLevel ? current : best;
      });

      const bestSkillMatch = bestMatch?.skillMatches.find(sm => sm.skillId === requiredSkill.skillId);
      const bestLevel = bestSkillMatch?.employeeProficiency || 0;
      
      if (bestLevel < requiredSkill.minimumProficiency) {
        skillGaps.push({
          skillName: requiredSkill.skillName,
          category: requiredSkill.category,
          requiredLevel: requiredSkill.minimumProficiency,
          currentBestLevel: bestLevel,
          gap: requiredSkill.minimumProficiency - bestLevel
        });
      }
    }

    // Risk assessment
    const riskLevel: 'low' | 'medium' | 'high' = 
      skillGaps.filter(gap => gap.gap >= 2).length >= 2 ? 'high' :
      skillGaps.filter(gap => gap.gap >= 1).length >= 1 ? 'medium' : 'low';

    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (skillGaps.length > 0) {
      riskFactors.push(`${skillGaps.length} skill gaps identified`);
      recommendations.push('Consider additional training or alternative resources');
    }

    if (primaryRecommendations.length === 0) {
      riskFactors.push('No alternative resources available');
      recommendations.push('Expand search criteria or consider external hiring');
    }

    return {
      primaryRecommendations,
      alternativeRecommendations,
      skillGaps,
      riskAssessment: {
        level: riskLevel,
        factors: riskFactors,
        recommendations
      }
    };
  }

  private async analyzeProjectTeamSkills(
    allocations: AllocationWithSkillMatch[],
    skillRequirements: SkillMatchCriteria['requiredSkills']
  ): Promise<{
    skillCoverageScore: number;
    teamChemistryScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  }> {
    const skillCoverageScores = allocations
      .filter(alloc => alloc.skillMatchScore !== undefined)
      .map(alloc => alloc.skillMatchScore!);

    const averageSkillCoverage = skillCoverageScores.length > 0 
      ? Math.round(skillCoverageScores.reduce((sum, score) => sum + score, 0) / skillCoverageScores.length)
      : 0;

    // Simplified team chemistry analysis
    const teamChemistryScore = 75; // Would be calculated using team chemistry analyzer

    const riskLevel: 'low' | 'medium' | 'high' = 
      averageSkillCoverage < 60 ? 'high' :
      averageSkillCoverage < 75 ? 'medium' : 'low';

    const recommendations: string[] = [];
    
    if (averageSkillCoverage < 70) {
      recommendations.push('Consider skill development training for team members');
    }
    
    if (allocations.length < 3) {
      recommendations.push('Small team size may impact delivery - consider adding resources');
    }

    return {
      skillCoverageScore: averageSkillCoverage,
      teamChemistryScore,
      riskLevel,
      recommendations
    };
  }

  private async generateImprovementRecommendations(
    allocations: AllocationWithSkillMatch[],
    skillRequirements: SkillMatchCriteria['requiredSkills'],
    options: any
  ): Promise<Array<{
    type: 'replacement' | 'addition' | 'training' | 'role_adjustment';
    description: string;
    impact: number;
    cost?: number;
    timeline?: string;
    affectedAllocations: string[];
  }>> {
    const improvements: any[] = [];

    // Find low-performing allocations
    const lowPerformingAllocations = allocations.filter(
      alloc => (alloc.skillMatchScore || 0) < 60
    );

    for (const allocation of lowPerformingAllocations) {
      if (allocation.alternativeEmployees && allocation.alternativeEmployees.length > 0) {
        const bestAlternative = allocation.alternativeEmployees[0];
        improvements.push({
          type: 'replacement',
          description: `Replace ${allocation.employeeId} with ${bestAlternative.name} for better skill match`,
          impact: bestAlternative.matchScore - (allocation.skillMatchScore || 0),
          timeline: '2-4 weeks',
          affectedAllocations: [allocation.id]
        });
      } else {
        improvements.push({
          type: 'training',
          description: `Provide skill training for ${allocation.employeeId}`,
          impact: 20,
          cost: 3000,
          timeline: '4-6 weeks',
          affectedAllocations: [allocation.id]
        });
      }
    }

    return improvements;
  }
}
import { DatabaseService } from '../database/database.service';
import { DatabaseFactory } from '../database/database-factory';
import { ApiError } from '../utils/api-error';

export interface TeamMember {
  employeeId: string;
  firstName: string;
  lastName: string;
  position: string;
  departmentId: string;
  skills: Array<{
    skillId: string;
    skillName: string;
    category: string;
    proficiencyLevel: number;
  }>;
}

export interface TeamComposition {
  members: TeamMember[];
  projectId?: string;
  roleRequirements?: Array<{
    role: string;
    skillRequirements: string[];
    count: number;
  }>;
}

export interface TeamChemistryAnalysis {
  overallChemistryScore: number; // 0-100
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  
  // Detailed analysis components
  skillComplementarity: {
    score: number;
    overlapAreas: string[];
    gapAreas: string[];
    redundantSkills: string[];
    uniqueContributions: Array<{
      employeeId: string;
      uniqueSkills: string[];
    }>;
  };
  
  experienceDiversity: {
    score: number;
    seniorityBalance: {
      junior: number;
      mid: number;
      senior: number;
      lead: number;
    };
    domainExpertise: Array<{
      domain: string;
      experts: string[];
      novices: string[];
    }>;
  };
  
  collaborationHistory: {
    score: number;
    successfulCollaborations: Array<{
      projectName: string;
      participants: string[];
      successScore: number;
      duration: number;
    }>;
    potentialConflicts: Array<{
      members: string[];
      reason: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  };
  
  communicationDynamics: {
    score: number;
    workingStyles: Array<{
      employeeId: string;
      style: 'collaborative' | 'independent' | 'directive' | 'supportive';
      traits: string[];
    }>;
    departmentDiversity: number; // Cross-functional strength
    timeZoneCompatibility: number;
  };
  
  riskFactors: Array<{
    type: 'skill_gap' | 'personality_clash' | 'over_qualification' | 'under_qualification' | 'workload_imbalance';
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedMembers: string[];
    mitigation: string;
  }>;
  
  predictedPerformance: {
    velocityScore: number; // Expected team velocity
    qualityScore: number; // Expected deliverable quality
    innovationScore: number; // Expected innovation/creativity
    stabilityScore: number; // Team cohesion and retention
  };
}

export interface TeamOptimizationSuggestion {
  type: 'add_member' | 'remove_member' | 'swap_member' | 'adjust_roles';
  description: string;
  expectedImpact: number; // Score improvement estimate
  implementation: string;
  suggestedMembers?: Array<{
    employeeId: string;
    name: string;
    reason: string;
    matchScore: number;
  }>;
}

export class TeamChemistryAnalyzerService {
  private db: DatabaseService;

  constructor(db?: DatabaseService) {
    this.db = db || DatabaseService.getInstance();
  }

  static async create(): Promise<TeamChemistryAnalyzerService> {
    const db = await DatabaseFactory.getDatabaseService();
    return new TeamChemistryAnalyzerService(db);
  }

  /**
   * Analyze team chemistry and dynamics
   */
  async analyzeTeamChemistry(teamComposition: TeamComposition): Promise<TeamChemistryAnalysis> {
    try {
      const analysis: TeamChemistryAnalysis = {
        overallChemistryScore: 0,
        strengths: [],
        concerns: [],
        recommendations: [],
        skillComplementarity: await this.analyzeSkillComplementarity(teamComposition),
        experienceDiversity: await this.analyzeExperienceDiversity(teamComposition),
        collaborationHistory: await this.analyzeCollaborationHistory(teamComposition),
        communicationDynamics: await this.analyzeCommunicationDynamics(teamComposition),
        riskFactors: await this.identifyRiskFactors(teamComposition),
        predictedPerformance: await this.predictTeamPerformance(teamComposition)
      };

      // Calculate overall chemistry score
      analysis.overallChemistryScore = this.calculateOverallScore(analysis);

      // Generate insights
      this.generateInsights(analysis);

      return analysis;
    } catch (error) {
      console.error('Error analyzing team chemistry:', error);
      throw new ApiError(500, 'Failed to analyze team chemistry');
    }
  }

  /**
   * Analyze skill complementarity within the team
   */
  private async analyzeSkillComplementarity(team: TeamComposition): Promise<TeamChemistryAnalysis['skillComplementarity']> {
    const allSkills = new Map<string, Set<string>>(); // skillId -> Set of employeeIds
    const employeeSkills = new Map<string, Set<string>>(); // employeeId -> Set of skillIds
    
    // Map skills and employees
    for (const member of team.members) {
      employeeSkills.set(member.employeeId, new Set());
      
      for (const skill of member.skills) {
        if (!allSkills.has(skill.skillId)) {
          allSkills.set(skill.skillId, new Set());
        }
        allSkills.get(skill.skillId)!.add(member.employeeId);
        employeeSkills.get(member.employeeId)!.add(skill.skillId);
      }
    }

    // Identify overlaps, gaps, and unique contributions
    const overlapAreas: string[] = [];
    const redundantSkills: string[] = [];
    const uniqueContributions: Array<{ employeeId: string; uniqueSkills: string[] }> = [];

    // Check for skill overlaps
    for (const [skillId, employees] of allSkills.entries()) {
      const skillName = this.getSkillName(team, skillId);
      
      if (employees.size > 1) {
        overlapAreas.push(skillName);
        if (employees.size > 2) {
          redundantSkills.push(skillName);
        }
      }
    }

    // Find unique contributions
    for (const member of team.members) {
      const uniqueSkills: string[] = [];
      
      for (const skill of member.skills) {
        const employeesWithSkill = allSkills.get(skill.skillId);
        if (employeesWithSkill && employeesWithSkill.size === 1) {
          uniqueSkills.push(skill.skillName);
        }
      }
      
      if (uniqueSkills.length > 0) {
        uniqueContributions.push({
          employeeId: member.employeeId,
          uniqueSkills
        });
      }
    }

    // Identify gap areas (required but not covered)
    const gapAreas: string[] = [];
    if (team.roleRequirements) {
      for (const role of team.roleRequirements) {
        for (const requiredSkill of role.skillRequirements) {
          const hasSkill = team.members.some(member =>
            member.skills.some(skill => skill.skillName.toLowerCase() === requiredSkill.toLowerCase())
          );
          if (!hasSkill) {
            gapAreas.push(requiredSkill);
          }
        }
      }
    }

    // Calculate complementarity score
    const overlapPenalty = Math.min(20, redundantSkills.length * 5);
    const gapPenalty = Math.min(30, gapAreas.length * 10);
    const uniqueBonus = Math.min(20, uniqueContributions.length * 5);
    const score = Math.max(0, 100 - overlapPenalty - gapPenalty + uniqueBonus);

    return {
      score,
      overlapAreas,
      gapAreas,
      redundantSkills,
      uniqueContributions
    };
  }

  /**
   * Analyze experience and seniority diversity
   */
  private async analyzeExperienceDiversity(team: TeamComposition): Promise<TeamChemistryAnalysis['experienceDiversity']> {
    const seniorityBalance = { junior: 0, mid: 0, senior: 0, lead: 0 };
    const domainExpertise = new Map<string, { experts: string[], novices: string[] }>();

    // Analyze seniority levels based on position titles and experience
    for (const member of team.members) {
      const position = member.position.toLowerCase();
      
      if (position.includes('junior') || position.includes('associate') || position.includes('entry')) {
        seniorityBalance.junior++;
      } else if (position.includes('senior') || position.includes('principal')) {
        seniorityBalance.senior++;
      } else if (position.includes('lead') || position.includes('manager') || position.includes('director')) {
        seniorityBalance.lead++;
      } else {
        seniorityBalance.mid++;
      }

      // Analyze domain expertise
      for (const skill of member.skills) {
        if (!domainExpertise.has(skill.category)) {
          domainExpertise.set(skill.category, { experts: [], novices: [] });
        }
        
        const domain = domainExpertise.get(skill.category)!;
        if (skill.proficiencyLevel >= 4) {
          domain.experts.push(member.employeeId);
        } else if (skill.proficiencyLevel <= 2) {
          domain.novices.push(member.employeeId);
        }
      }
    }

    // Calculate diversity score
    const totalMembers = team.members.length;
    const seniorityDistribution = [
      seniorityBalance.junior / totalMembers,
      seniorityBalance.mid / totalMembers,
      seniorityBalance.senior / totalMembers,
      seniorityBalance.lead / totalMembers
    ];

    // Ideal distribution might be balanced or pyramid-shaped
    const idealBalance = totalMembers <= 3 ? 0.8 : 0.6; // Allow more imbalance in small teams
    const seniorityScore = seniorityDistribution.some(ratio => ratio <= idealBalance) ? 80 : 100;
    
    // Domain expertise score based on coverage
    const domainScore = Math.min(100, domainExpertise.size * 20);
    
    const score = Math.round((seniorityScore + domainScore) / 2);

    return {
      score,
      seniorityBalance,
      domainExpertise: Array.from(domainExpertise.entries()).map(([domain, data]) => ({
        domain,
        experts: data.experts,
        novices: data.novices
      }))
    };
  }

  /**
   * Analyze collaboration history between team members
   */
  private async analyzeCollaborationHistory(team: TeamComposition): Promise<TeamChemistryAnalysis['collaborationHistory']> {
    const employeeIds = team.members.map(m => m.employeeId);
    
    try {
      // Get past collaborations
      const collaborationQuery = `
        WITH employee_projects AS (
          SELECT 
            ra.employee_id,
            ra.project_id,
            p.name as project_name,
            p.status,
            p.end_date,
            ra.actual_hours,
            EXTRACT(days FROM (p.end_date - p.start_date)) as duration
          FROM resource_allocations ra
          JOIN projects p ON ra.project_id = p.id
          WHERE ra.employee_id = ANY($1)
          AND p.status = 'completed'
          AND ra.actual_hours > 0
        ),
        collaborations AS (
          SELECT 
            ep1.project_id,
            ep1.project_name,
            ep1.duration,
            array_agg(DISTINCT ep1.employee_id) as participants,
            COUNT(DISTINCT ep1.employee_id) as team_size,
            AVG(ep1.actual_hours) as avg_hours
          FROM employee_projects ep1
          GROUP BY ep1.project_id, ep1.project_name, ep1.duration
          HAVING COUNT(DISTINCT ep1.employee_id) >= 2
        )
        SELECT * FROM collaborations
        ORDER BY duration DESC
        LIMIT 10
      `;

      const result = await this.db.query(collaborationQuery, [employeeIds]);
      const successfulCollaborations = result.rows.map(row => ({
        projectName: row.project_name,
        participants: row.participants,
        successScore: this.calculateProjectSuccessScore(row.avg_hours, row.duration),
        duration: parseFloat(row.duration)
      }));

      // Identify potential conflicts (simplified - in real system would analyze feedback, ratings, etc.)
      const potentialConflicts = await this.identifyPotentialConflicts(team);

      const score = successfulCollaborations.length > 0 
        ? Math.min(100, successfulCollaborations.length * 20 + 
                   (successfulCollaborations.reduce((sum, c) => sum + c.successScore, 0) / successfulCollaborations.length))
        : 60; // Neutral score for teams without history

      return {
        score,
        successfulCollaborations,
        potentialConflicts
      };
    } catch (error) {
      console.error('Error analyzing collaboration history:', error);
      return {
        score: 60,
        successfulCollaborations: [],
        potentialConflicts: []
      };
    }
  }

  /**
   * Analyze communication dynamics
   */
  private async analyzeCommunicationDynamics(team: TeamComposition): Promise<TeamChemistryAnalysis['communicationDynamics']> {
    const workingStyles: TeamChemistryAnalysis['communicationDynamics']['workingStyles'] = [];
    const departments = new Set<string>();
    
    for (const member of team.members) {
      departments.add(member.departmentId);
      
      // Determine working style based on position and skills (simplified)
      const position = member.position.toLowerCase();
      let style: 'collaborative' | 'independent' | 'directive' | 'supportive' = 'collaborative';
      const traits: string[] = [];
      
      if (position.includes('lead') || position.includes('manager')) {
        style = 'directive';
        traits.push('Leadership oriented', 'Decision maker');
      } else if (position.includes('senior')) {
        style = 'independent';
        traits.push('Self-directed', 'Mentoring capable');
      } else if (position.includes('support') || position.includes('associate')) {
        style = 'supportive';
        traits.push('Team player', 'Learning focused');
      }
      
      // Add skill-based traits
      const technicalSkills = member.skills.filter(s => s.category === 'Technical').length;
      const softSkills = member.skills.filter(s => s.category === 'Soft').length;
      
      if (technicalSkills > softSkills) {
        traits.push('Technical expert');
      } else if (softSkills > technicalSkills) {
        traits.push('People focused');
      }
      
      workingStyles.push({
        employeeId: member.employeeId,
        style,
        traits
      });
    }

    const departmentDiversity = Math.min(100, departments.size * 25);
    const timeZoneCompatibility = 100; // Assume same timezone for now
    
    // Calculate overall communication score
    const styleBalance = this.calculateStyleBalance(workingStyles);
    const score = Math.round((styleBalance + departmentDiversity + timeZoneCompatibility) / 3);

    return {
      score,
      workingStyles,
      departmentDiversity,
      timeZoneCompatibility
    };
  }

  /**
   * Identify potential risk factors
   */
  private async identifyRiskFactors(team: TeamComposition): Promise<TeamChemistryAnalysis['riskFactors']> {
    const riskFactors: TeamChemistryAnalysis['riskFactors'] = [];

    // Check for skill gaps
    if (team.roleRequirements) {
      for (const role of team.roleRequirements) {
        const missingSkills = role.skillRequirements.filter(requiredSkill =>
          !team.members.some(member =>
            member.skills.some(skill => 
              skill.skillName.toLowerCase() === requiredSkill.toLowerCase() && 
              skill.proficiencyLevel >= 3
            )
          )
        );

        if (missingSkills.length > 0) {
          riskFactors.push({
            type: 'skill_gap',
            severity: missingSkills.length > 2 ? 'high' : missingSkills.length > 1 ? 'medium' : 'low',
            description: `Missing critical skills: ${missingSkills.join(', ')}`,
            affectedMembers: [],
            mitigation: 'Consider adding team members with these skills or provide training'
          });
        }
      }
    }

    // Check for over/under qualification
    const seniorityLevels = team.members.map(m => this.getSeniorityLevel(m.position));
    const avgSeniority = seniorityLevels.reduce((sum, level) => sum + level, 0) / seniorityLevels.length;
    
    if (avgSeniority > 3.5) {
      riskFactors.push({
        type: 'over_qualification',
        severity: 'medium',
        description: 'Team may be over-qualified, leading to higher costs and potential boredom',
        affectedMembers: team.members.filter(m => this.getSeniorityLevel(m.position) >= 4).map(m => m.employeeId),
        mitigation: 'Consider adjusting project scope or adding more challenging components'
      });
    } else if (avgSeniority < 2) {
      riskFactors.push({
        type: 'under_qualification',
        severity: 'high',
        description: 'Team may lack sufficient experience for complex deliverables',
        affectedMembers: team.members.map(m => m.employeeId),
        mitigation: 'Add a senior mentor or provide additional oversight and training'
      });
    }

    // Check team size balance
    if (team.members.length > 8) {
      riskFactors.push({
        type: 'workload_imbalance',
        severity: 'medium',
        description: 'Large team size may lead to communication overhead and coordination challenges',
        affectedMembers: team.members.map(m => m.employeeId),
        mitigation: 'Consider splitting into smaller sub-teams or implementing structured communication processes'
      });
    }

    return riskFactors;
  }

  /**
   * Predict team performance metrics
   */
  private async predictTeamPerformance(team: TeamComposition): Promise<TeamChemistryAnalysis['predictedPerformance']> {
    // This is a simplified prediction model
    // In a real system, you'd use historical data and ML models
    
    const teamSize = team.members.length;
    const avgSeniority = team.members.reduce((sum, m) => sum + this.getSeniorityLevel(m.position), 0) / teamSize;
    const skillDiversity = new Set(team.members.flatMap(m => m.skills.map(s => s.category))).size;
    
    // Velocity score based on experience and size
    const velocityScore = Math.min(100, 
      (avgSeniority * 20) + 
      (teamSize <= 6 ? 20 : Math.max(0, 20 - (teamSize - 6) * 3)) +
      (skillDiversity * 10)
    );
    
    // Quality score based on senior members and skill depth
    const seniorMembers = team.members.filter(m => this.getSeniorityLevel(m.position) >= 3).length;
    const avgSkillLevel = team.members.reduce((sum, m) => 
      sum + (m.skills.reduce((skillSum, s) => skillSum + s.proficiencyLevel, 0) / Math.max(1, m.skills.length))
    , 0) / teamSize;
    
    const qualityScore = Math.min(100, (seniorMembers / teamSize) * 40 + (avgSkillLevel * 15) + 20);
    
    // Innovation score based on diversity and senior expertise
    const innovationScore = Math.min(100, skillDiversity * 15 + (avgSeniority >= 3 ? 30 : 15) + 20);
    
    // Stability score based on team size and experience balance
    const stabilityScore = Math.min(100, 
      (teamSize >= 3 && teamSize <= 7 ? 30 : 15) +
      (avgSeniority >= 2 && avgSeniority <= 4 ? 40 : 20) +
      30 // Base stability
    );

    return {
      velocityScore: Math.round(velocityScore),
      qualityScore: Math.round(qualityScore),
      innovationScore: Math.round(innovationScore),
      stabilityScore: Math.round(stabilityScore)
    };
  }

  /**
   * Generate optimization suggestions
   */
  async generateOptimizationSuggestions(
    analysis: TeamChemistryAnalysis,
    team: TeamComposition
  ): Promise<TeamOptimizationSuggestion[]> {
    const suggestions: TeamOptimizationSuggestion[] = [];

    // Suggest adding members for skill gaps
    if (analysis.skillComplementarity.gapAreas.length > 0) {
      suggestions.push({
        type: 'add_member',
        description: `Add team member with expertise in: ${analysis.skillComplementarity.gapAreas.join(', ')}`,
        expectedImpact: 15,
        implementation: 'Recruit or assign existing employee with required skills'
      });
    }

    // Suggest removing redundant members
    if (analysis.skillComplementarity.redundantSkills.length > 2) {
      suggestions.push({
        type: 'remove_member',
        description: 'Consider reducing team size to eliminate skill redundancy',
        expectedImpact: 10,
        implementation: 'Reassign members with redundant skills to other projects'
      });
    }

    // Suggest role adjustments for better balance
    const highRiskFactors = analysis.riskFactors.filter(rf => rf.severity === 'high');
    if (highRiskFactors.length > 0) {
      suggestions.push({
        type: 'adjust_roles',
        description: 'Adjust team roles to mitigate high-severity risks',
        expectedImpact: 20,
        implementation: 'Redistribute responsibilities based on individual strengths'
      });
    }

    return suggestions;
  }

  // Helper methods
  private getSkillName(team: TeamComposition, skillId: string): string {
    for (const member of team.members) {
      const skill = member.skills.find(s => s.skillId === skillId);
      if (skill) return skill.skillName;
    }
    return `Skill ${skillId}`;
  }

  private getSeniorityLevel(position: string): number {
    const pos = position.toLowerCase();
    if (pos.includes('junior') || pos.includes('associate') || pos.includes('entry')) return 1;
    if (pos.includes('senior') || pos.includes('principal')) return 4;
    if (pos.includes('lead') || pos.includes('manager') || pos.includes('director')) return 5;
    return 2; // mid-level default
  }

  private calculateProjectSuccessScore(avgHours: number, duration: number): number {
    // Simplified success calculation based on completion
    const expectedHours = duration * 8; // Assume 8 hours per day
    const efficiency = Math.min(1, expectedHours / (avgHours || 1));
    return Math.round(efficiency * 100);
  }

  private calculateStyleBalance(workingStyles: TeamChemistryAnalysis['communicationDynamics']['workingStyles']): number {
    const styleCounts = workingStyles.reduce((counts, ws) => {
      counts[ws.style] = (counts[ws.style] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Ideal team has a mix of styles
    const totalMembers = workingStyles.length;
    const hasDirective = (styleCounts.directive || 0) > 0;
    const hasCollaborative = (styleCounts.collaborative || 0) >= Math.ceil(totalMembers / 2);
    const hasSupport = (styleCounts.supportive || 0) > 0;

    return (hasDirective ? 30 : 0) + (hasCollaborative ? 50 : 20) + (hasSupport ? 20 : 0);
  }

  private calculateOverallScore(analysis: TeamChemistryAnalysis): number {
    const weights = {
      skillComplementarity: 0.3,
      experienceDiversity: 0.2,
      collaborationHistory: 0.2,
      communicationDynamics: 0.15,
      predictedPerformance: 0.15
    };

    const avgPerformance = (
      analysis.predictedPerformance.velocityScore +
      analysis.predictedPerformance.qualityScore +
      analysis.predictedPerformance.innovationScore +
      analysis.predictedPerformance.stabilityScore
    ) / 4;

    return Math.round(
      analysis.skillComplementarity.score * weights.skillComplementarity +
      analysis.experienceDiversity.score * weights.experienceDiversity +
      analysis.collaborationHistory.score * weights.collaborationHistory +
      analysis.communicationDynamics.score * weights.communicationDynamics +
      avgPerformance * weights.predictedPerformance
    );
  }

  private generateInsights(analysis: TeamChemistryAnalysis): void {
    // Generate strengths
    if (analysis.skillComplementarity.score >= 80) {
      analysis.strengths.push('Excellent skill complementarity with minimal overlap');
    }
    if (analysis.collaborationHistory.score >= 80) {
      analysis.strengths.push('Strong collaboration history among team members');
    }
    if (analysis.experienceDiversity.score >= 80) {
      analysis.strengths.push('Well-balanced experience levels across the team');
    }

    // Generate concerns
    if (analysis.riskFactors.some(rf => rf.severity === 'high')) {
      analysis.concerns.push('High-severity risk factors identified');
    }
    if (analysis.skillComplementarity.gapAreas.length > 2) {
      analysis.concerns.push('Multiple skill gaps may impact project delivery');
    }
    if (analysis.communicationDynamics.score < 60) {
      analysis.concerns.push('Communication dynamics may need improvement');
    }

    // Generate recommendations
    if (analysis.skillComplementarity.gapAreas.length > 0) {
      analysis.recommendations.push('Address skill gaps through training or additional team members');
    }
    if (analysis.collaborationHistory.score < 60) {
      analysis.recommendations.push('Implement team building activities to improve collaboration');
    }
    if (analysis.experienceDiversity.seniorityBalance.lead === 0) {
      analysis.recommendations.push('Consider adding senior leadership to guide the team');
    }
  }

  private async identifyPotentialConflicts(team: TeamComposition): Promise<TeamChemistryAnalysis['collaborationHistory']['potentialConflicts']> {
    // This is a placeholder - in a real system you'd analyze:
    // - Past project feedback and ratings
    // - Personality assessments
    // - Performance review comments
    // - Conflict resolution history
    
    return []; // Return empty for now
  }
}
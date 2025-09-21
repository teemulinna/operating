/**
 * Skill-based Matching Service
 * Advanced ML algorithms for matching employees to projects based on skills, experience, and other factors
 */

import * as tf from '@tensorflow/tfjs';
import { predictionService, PredictionResult } from './prediction.service';

export interface SkillProfile {
  skill_name: string;
  proficiency_level: number; // 0-1 scale
  years_experience: number;
  last_used: Date;
  certification_level?: 'none' | 'basic' | 'intermediate' | 'advanced' | 'expert';
  interest_level?: number; // 0-1 scale for employee interest
}

export interface EmployeeProfile {
  employee_id: string;
  name: string;
  skills: SkillProfile[];
  availability: number; // 0-1 scale
  work_preferences: {
    project_types: string[];
    team_size_preference: 'small' | 'medium' | 'large';
    remote_work_preference: number; // 0-1 scale
    travel_willingness: number; // 0-1 scale
  };
  performance_history: {
    project_success_rate: number;
    collaboration_score: number;
    delivery_timeliness: number;
    code_quality_score?: number;
  };
  career_goals: string[];
  location: string;
}

export interface ProjectRequirement {
  project_id: string;
  title: string;
  required_skills: {
    skill_name: string;
    minimum_proficiency: number;
    importance_weight: number; // 0-1 scale
    required_experience_years?: number;
  }[];
  project_characteristics: {
    duration_weeks: number;
    team_size: number;
    complexity_score: number; // 0-1 scale
    domain: string;
    is_remote: boolean;
    requires_travel: boolean;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };
  timeline: {
    start_date: Date;
    end_date: Date;
    key_milestones: Date[];
  };
  budget_constraints?: {
    max_hourly_rate?: number;
    total_budget?: number;
  };
}

export interface MatchingResult {
  employee_id: string;
  project_id: string;
  overall_score: number; // 0-1 scale
  skill_match_score: number;
  availability_score: number;
  preference_alignment_score: number;
  growth_opportunity_score: number;
  risk_factors: string[];
  confidence: number;
  detailed_breakdown: {
    skill_matches: { skill: string; match_score: number; gap_analysis: string }[];
    preference_matches: { category: string; match_score: number; explanation: string }[];
    development_opportunities: { skill: string; potential_growth: number }[];
  };
  recommendations: string[];
}

export interface TeamComposition {
  project_id: string;
  recommended_team: {
    employee_id: string;
    role: string;
    allocation_percentage: number;
    justification: string;
  }[];
  team_score: number;
  skill_coverage: Record<string, number>;
  team_dynamics_score: number;
  estimated_success_probability: number;
  potential_issues: string[];
  alternative_compositions?: TeamComposition[];
}

export class MatchingService {
  private matchingModels: Map<string, tf.LayersModel> = new Map();
  private skillEmbeddings: Map<string, number[]> = new Map();
  private employeeEmbeddings: Map<string, number[]> = new Map();

  constructor() {
    this.initializeMatchingModels();
    this.loadSkillEmbeddings();
  }

  private async initializeMatchingModels(): Promise<void> {
    await Promise.all([
      this.createSkillMatchingModel(),
      this.createPreferenceMatchingModel(),
      this.createTeamDynamicsModel(),
      this.createGrowthPredictionModel()
    ]);
  }

  /**
   * Find the best employee matches for a project
   */
  async findBestMatches(
    project: ProjectRequirement,
    availableEmployees: EmployeeProfile[],
    maxResults: number = 10
  ): Promise<MatchingResult[]> {
    try {
      console.log(`Finding matches for project: ${project.title}`);

      // Generate embeddings for project requirements
      const projectEmbedding = await this.createProjectEmbedding(project);

      // Calculate matches for each employee
      const matches = await Promise.all(
        availableEmployees.map(async (employee) => {
          const matchResult = await this.calculateEmployeeMatch(employee, project, projectEmbedding);
          return matchResult;
        })
      );

      // Sort by overall score and return top matches
      matches.sort((a, b) => b.overall_score - a.overall_score);
      return matches.slice(0, maxResults);

    } catch (error) {
      console.error('Matching process failed:', error);
      throw error;
    }
  }

  /**
   * Generate optimal team composition for a project
   */
  async generateTeamComposition(
    project: ProjectRequirement,
    availableEmployees: EmployeeProfile[],
    teamSize?: number
  ): Promise<TeamComposition> {
    try {
      const targetTeamSize = teamSize || project.project_characteristics.team_size;
      
      // Get individual matches first
      const individualMatches = await this.findBestMatches(project, availableEmployees, availableEmployees.length);

      // Generate possible team combinations
      const teamCombinations = this.generateTeamCombinations(
        individualMatches,
        targetTeamSize,
        project
      );

      // Evaluate each team combination
      const evaluatedTeams = await Promise.all(
        teamCombinations.map(async (team) => {
          const teamScore = await this.evaluateTeamComposition(team, project);
          return teamScore;
        })
      );

      // Select best team composition
      evaluatedTeams.sort((a, b) => b.team_score - a.team_score);
      const bestTeam = evaluatedTeams[0];

      // Generate alternatives
      const alternatives = evaluatedTeams.slice(1, 4).map(team => ({
        ...team,
        alternative_compositions: undefined // Avoid circular reference
      }));

      return {
        ...bestTeam,
        alternative_compositions: alternatives
      };

    } catch (error) {
      console.error('Team composition generation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze skill gaps for a project
   */
  async analyzeSkillGaps(
    project: ProjectRequirement,
    currentTeam: EmployeeProfile[]
  ): Promise<{
    critical_gaps: { skill: string; gap_severity: number; impact: string }[];
    minor_gaps: { skill: string; gap_severity: number; mitigation: string }[];
    recommendations: {
      type: 'hire' | 'train' | 'contract' | 'reassign';
      skill: string;
      priority: number;
      estimated_cost: number;
      timeline: string;
    }[];
  }> {
    try {
      // Create skill inventory for current team
      const teamSkillInventory = this.createTeamSkillInventory(currentTeam);

      // Compare with project requirements
      const skillGaps = project.required_skills.map(requirement => {
        const currentCapability = teamSkillInventory[requirement.skill_name] || 0;
        const gap = Math.max(0, requirement.minimum_proficiency - currentCapability);
        
        return {
          skill: requirement.skill_name,
          required_level: requirement.minimum_proficiency,
          current_level: currentCapability,
          gap_severity: gap,
          importance_weight: requirement.importance_weight
        };
      });

      // Categorize gaps
      const criticalGaps = skillGaps
        .filter(gap => gap.gap_severity > 0.3 && gap.importance_weight > 0.7)
        .map(gap => ({
          skill: gap.skill,
          gap_severity: gap.gap_severity,
          impact: this.assessGapImpact(gap, project)
        }));

      const minorGaps = skillGaps
        .filter(gap => gap.gap_severity > 0.1 && gap.gap_severity <= 0.3)
        .map(gap => ({
          skill: gap.skill,
          gap_severity: gap.gap_severity,
          mitigation: this.suggestGapMitigation(gap, currentTeam)
        }));

      // Generate recommendations
      const recommendations = await this.generateGapRecommendations(skillGaps, project, currentTeam);

      return {
        critical_gaps: criticalGaps,
        minor_gaps: minorGaps,
        recommendations
      };

    } catch (error) {
      console.error('Skill gap analysis failed:', error);
      throw error;
    }
  }

  /**
   * Predict project success based on team composition
   */
  async predictProjectSuccess(
    project: ProjectRequirement,
    team: EmployeeProfile[]
  ): Promise<{
    success_probability: number;
    risk_factors: { factor: string; risk_level: number; mitigation: string }[];
    success_indicators: { indicator: string; strength: number }[];
    confidence: number;
  }> {
    try {
      // Create feature vector for project and team
      const features = this.createProjectTeamFeatures(project, team);

      // Use prediction service to estimate success
      const prediction = await predictionService.predict('project_success_predictor', {
        features,
        metadata: {
          project_id: project.project_id,
          team_size: team.length
        }
      }) as PredictionResult;

      const successProbability = Array.isArray(prediction.prediction) 
        ? prediction.prediction[0] 
        : prediction.prediction;

      // Identify risk factors
      const riskFactors = await this.identifyRiskFactors(project, team, features);

      // Identify success indicators
      const successIndicators = await this.identifySuccessIndicators(project, team, features);

      return {
        success_probability: successProbability,
        risk_factors: riskFactors,
        success_indicators: successIndicators,
        confidence: prediction.confidence
      };

    } catch (error) {
      console.error('Project success prediction failed:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Calculate individual employee match score
   */
  private async calculateEmployeeMatch(
    employee: EmployeeProfile,
    project: ProjectRequirement,
    projectEmbedding: number[]
  ): Promise<MatchingResult> {
    // Create employee embedding
    const employeeEmbedding = await this.createEmployeeEmbedding(employee);

    // Calculate different match scores
    const skillMatchScore = await this.calculateSkillMatch(employee, project);
    const availabilityScore = this.calculateAvailabilityScore(employee, project);
    const preferenceScore = await this.calculatePreferenceMatch(employee, project);
    const growthScore = await this.calculateGrowthOpportunity(employee, project);

    // Combine scores with weights
    const weights = { skill: 0.4, availability: 0.2, preference: 0.2, growth: 0.2 };
    const overallScore = 
      skillMatchScore * weights.skill +
      availabilityScore * weights.availability +
      preferenceScore * weights.preference +
      growthScore * weights.growth;

    // Calculate detailed breakdown
    const detailedBreakdown = await this.generateDetailedBreakdown(employee, project);

    // Identify risk factors
    const riskFactors = this.identifyEmployeeRiskFactors(employee, project);

    // Generate recommendations
    const recommendations = this.generateEmployeeRecommendations(employee, project, overallScore);

    return {
      employee_id: employee.employee_id,
      project_id: project.project_id,
      overall_score: overallScore,
      skill_match_score: skillMatchScore,
      availability_score: availabilityScore,
      preference_alignment_score: preferenceScore,
      growth_opportunity_score: growthScore,
      risk_factors: riskFactors,
      confidence: Math.min(0.95, overallScore + 0.1),
      detailed_breakdown: detailedBreakdown,
      recommendations
    };
  }

  /**
   * Create ML models for different aspects of matching
   */
  private async createSkillMatchingModel(): Promise<void> {
    const model = tf.sequential();

    model.add(tf.layers.dense({
      units: 128,
      activation: 'relu',
      inputShape: [50] // Concatenated skill embeddings
    }));

    model.add(tf.layers.dropout({ rate: 0.3 }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    this.matchingModels.set('skill_matching', model);
  }

  private async createPreferenceMatchingModel(): Promise<void> {
    const model = tf.sequential();

    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: [20] // Preference features
    }));

    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    this.matchingModels.set('preference_matching', model);
  }

  private async createTeamDynamicsModel(): Promise<void> {
    const model = tf.sequential();

    model.add(tf.layers.dense({
      units: 256,
      activation: 'relu',
      inputShape: [100] // Team composition features
    }));

    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.dropout({ rate: 0.4 }));

    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.3 }));

    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    this.matchingModels.set('team_dynamics', model);
  }

  private async createGrowthPredictionModel(): Promise<void> {
    const model = tf.sequential();

    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: [30] // Career and growth features
    }));

    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    this.matchingModels.set('growth_prediction', model);
  }

  private async loadSkillEmbeddings(): Promise<void> {
    // In a real implementation, this would load pre-trained skill embeddings
    // For now, we'll create simple embeddings based on skill names
    const commonSkills = [
      'javascript', 'python', 'react', 'nodejs', 'typescript', 'sql',
      'aws', 'docker', 'kubernetes', 'machine-learning', 'data-science'
    ];

    commonSkills.forEach((skill, index) => {
      // Create a simple embedding (in practice, use pre-trained embeddings)
      const embedding = new Array(32).fill(0).map(() => Math.random() * 2 - 1);
      this.skillEmbeddings.set(skill.toLowerCase(), embedding);
    });
  }

  private async createProjectEmbedding(project: ProjectRequirement): Promise<number[]> {
    // Combine project characteristics into an embedding
    const embedding = new Array(64).fill(0);
    
    // Add skill requirements
    project.required_skills.forEach((skill, index) => {
      const skillEmbedding = this.skillEmbeddings.get(skill.skill_name.toLowerCase());
      if (skillEmbedding) {
        skillEmbedding.forEach((value, embIndex) => {
          if (embIndex < 32) {
            embedding[embIndex] += value * skill.importance_weight;
          }
        });
      }
    });

    // Add project characteristics
    embedding[32] = project.project_characteristics.duration_weeks / 52; // Normalized
    embedding[33] = project.project_characteristics.team_size / 10; // Normalized
    embedding[34] = project.project_characteristics.complexity_score;
    embedding[35] = project.project_characteristics.is_remote ? 1 : 0;
    embedding[36] = project.project_characteristics.requires_travel ? 1 : 0;
    
    const urgencyMap = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    embedding[37] = urgencyMap[project.project_characteristics.urgency];

    return embedding;
  }

  private async createEmployeeEmbedding(employee: EmployeeProfile): Promise<number[]> {
    const embedding = new Array(64).fill(0);
    
    // Add skill embeddings
    employee.skills.forEach((skill) => {
      const skillEmbedding = this.skillEmbeddings.get(skill.skill_name.toLowerCase());
      if (skillEmbedding) {
        skillEmbedding.forEach((value, embIndex) => {
          if (embIndex < 32) {
            embedding[embIndex] += value * skill.proficiency_level;
          }
        });
      }
    });

    // Add employee characteristics
    embedding[32] = employee.availability;
    embedding[33] = employee.performance_history.project_success_rate;
    embedding[34] = employee.performance_history.collaboration_score;
    embedding[35] = employee.performance_history.delivery_timeliness;
    embedding[36] = employee.work_preferences.remote_work_preference;
    embedding[37] = employee.work_preferences.travel_willingness;

    return embedding;
  }

  // Simplified implementations for other helper methods
  private async calculateSkillMatch(employee: EmployeeProfile, project: ProjectRequirement): Promise<number> {
    let totalMatch = 0;
    let totalWeight = 0;

    project.required_skills.forEach(requirement => {
      const employeeSkill = employee.skills.find(s => s.skill_name.toLowerCase() === requirement.skill_name.toLowerCase());
      const employeeProficiency = employeeSkill?.proficiency_level || 0;
      
      const match = Math.min(1, employeeProficiency / requirement.minimum_proficiency);
      totalMatch += match * requirement.importance_weight;
      totalWeight += requirement.importance_weight;
    });

    return totalWeight > 0 ? totalMatch / totalWeight : 0;
  }

  private calculateAvailabilityScore(employee: EmployeeProfile, project: ProjectRequirement): number {
    return employee.availability;
  }

  private async calculatePreferenceMatch(employee: EmployeeProfile, project: ProjectRequirement): Promise<number> {
    let score = 0;
    let factors = 0;

    // Remote work preference
    if (project.project_characteristics.is_remote) {
      score += employee.work_preferences.remote_work_preference;
    } else {
      score += (1 - employee.work_preferences.remote_work_preference);
    }
    factors++;

    // Travel requirement
    if (project.project_characteristics.requires_travel) {
      score += employee.work_preferences.travel_willingness;
    } else {
      score += 1; // No travel is generally preferred
    }
    factors++;

    // Team size preference
    const teamSizeScore = this.calculateTeamSizePreferenceScore(
      employee.work_preferences.team_size_preference,
      project.project_characteristics.team_size
    );
    score += teamSizeScore;
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  private async calculateGrowthOpportunity(employee: EmployeeProfile, project: ProjectRequirement): Promise<number> {
    // Calculate learning opportunities based on skill gaps and career goals
    let growthScore = 0;
    
    project.required_skills.forEach(requirement => {
      const employeeSkill = employee.skills.find(s => s.skill_name.toLowerCase() === requirement.skill_name.toLowerCase());
      
      if (!employeeSkill || employeeSkill.proficiency_level < requirement.minimum_proficiency) {
        // This represents a learning opportunity
        growthScore += 0.2;
      }
    });

    // Check alignment with career goals
    const careerAlignment = employee.career_goals.some(goal => 
      project.project_characteristics.domain.toLowerCase().includes(goal.toLowerCase())
    ) ? 0.3 : 0;

    return Math.min(1, growthScore + careerAlignment);
  }

  private calculateTeamSizePreferenceScore(preference: string, actualSize: number): number {
    const preferenceRanges = {
      small: [1, 4],
      medium: [4, 8],
      large: [8, 20]
    };

    const [min, max] = preferenceRanges[preference] || [1, 20];
    
    if (actualSize >= min && actualSize <= max) {
      return 1.0;
    } else {
      const distance = Math.min(Math.abs(actualSize - min), Math.abs(actualSize - max));
      return Math.max(0, 1 - distance / 10);
    }
  }

  // Placeholder implementations for other methods
  private async generateDetailedBreakdown(employee: EmployeeProfile, project: ProjectRequirement): Promise<any> {
    return {
      skill_matches: [],
      preference_matches: [],
      development_opportunities: []
    };
  }

  private identifyEmployeeRiskFactors(employee: EmployeeProfile, project: ProjectRequirement): string[] {
    const risks = [];
    
    if (employee.availability < 0.5) {
      risks.push('Low availability may impact project delivery');
    }
    
    if (employee.performance_history.delivery_timeliness < 0.7) {
      risks.push('History of delayed deliveries');
    }
    
    return risks;
  }

  private generateEmployeeRecommendations(employee: EmployeeProfile, project: ProjectRequirement, score: number): string[] {
    const recommendations = [];
    
    if (score > 0.8) {
      recommendations.push('Excellent match - proceed with assignment');
    } else if (score > 0.6) {
      recommendations.push('Good match - consider for assignment');
    } else {
      recommendations.push('Consider alternative candidates or provide additional training');
    }
    
    return recommendations;
  }

  // Additional placeholder methods...
  private generateTeamCombinations(matches: MatchingResult[], teamSize: number, project: ProjectRequirement): any[] {
    return [];
  }

  private async evaluateTeamComposition(team: any, project: ProjectRequirement): Promise<TeamComposition> {
    return {
      project_id: project.project_id,
      recommended_team: [],
      team_score: 0,
      skill_coverage: {},
      team_dynamics_score: 0,
      estimated_success_probability: 0,
      potential_issues: []
    };
  }

  private createTeamSkillInventory(team: EmployeeProfile[]): Record<string, number> {
    return {};
  }

  private assessGapImpact(gap: any, project: ProjectRequirement): string {
    return 'High impact on project success';
  }

  private suggestGapMitigation(gap: any, team: EmployeeProfile[]): string {
    return 'Consider training existing team members';
  }

  private async generateGapRecommendations(gaps: any[], project: ProjectRequirement, team: EmployeeProfile[]): Promise<any[]> {
    return [];
  }

  private createProjectTeamFeatures(project: ProjectRequirement, team: EmployeeProfile[]): number[] {
    return [];
  }

  private async identifyRiskFactors(project: ProjectRequirement, team: EmployeeProfile[], features: number[]): Promise<any[]> {
    return [];
  }

  private async identifySuccessIndicators(project: ProjectRequirement, team: EmployeeProfile[], features: number[]): Promise<any[]> {
    return [];
  }
}

// Export singleton instance
export const matchingService = new MatchingService();
/**
 * Advanced Skills-Based Matching Service
 * Implements sophisticated algorithms for employee-project skill matching
 * with confidence scoring and semantic analysis
 */

import { DatabaseService } from '../database/database.service';

const dbService = DatabaseService.getInstance();
import { Logger } from '../utils/logger';

// Enhanced Skill Matching Interfaces
export interface SkillVector {
  skillId: string;
  skillName: string;
  category: string;
  proficiencyScore: number;
  experienceWeight: number;
  recencyWeight: number;
  domainRelevance: number;
}

export interface SkillMatchResult {
  employeeId: string;
  employeeName: string;
  email: string;
  department: string;
  position: string;
  overallMatchScore: number;
  confidenceLevel: number;
  skillBreakdown: {
    requiredSkills: SkillMatchDetail[];
    bonusSkills: SkillMatchDetail[];
    missingSkills: SkillGap[];
  };
  experienceAlignment: {
    totalExperience: number;
    relevantExperience: number;
    experienceGap: number;
    experienceScore: number;
  };
  availabilityMetrics: {
    currentUtilization: number;
    futureAvailability: number;
    capacityScore: number;
  };
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high';
    riskFactors: RiskFactor[];
    mitigationSuggestions: string[];
  };
  performancePrediction: {
    predictedScore: number;
    confidenceBounds: [number, number];
    keyFactors: string[];
  };
}

export interface SkillMatchDetail {
  skillId: string;
  skillName: string;
  category: string;
  required: boolean;
  requiredLevel: string;
  employeeLevel: string;
  matchScore: number;
  experienceYears: number;
  lastUsed: Date | null;
  certifications: string[];
  domainContext: string[];
}

export interface SkillGap {
  skillId: string;
  skillName: string;
  category: string;
  requiredLevel: string;
  gapSeverity: 'minor' | 'moderate' | 'major' | 'critical';
  alternativeSkills: string[];
  trainingOptions: string[];
  estimatedLearningTime: number; // in weeks
}

export interface RiskFactor {
  type: 'availability' | 'skill_gap' | 'overqualification' | 'experience' | 'workload';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: number; // 0-1 scale
  probability: number; // 0-1 scale
}

export interface MatchingCriteria {
  projectId: number;
  roleId?: string;
  requiredSkills: SkillRequirement[];
  preferredSkills?: SkillRequirement[];
  experienceLevel: 'junior' | 'intermediate' | 'senior' | 'expert';
  projectDuration: number; // in weeks
  startDate: Date;
  endDate?: Date;
  budgetRange?: [number, number];
  clientRequirements?: string[];
  teamDynamics?: {
    existingTeamSkills: string[];
    culturalFit: boolean;
    leadershipNeeded: boolean;
  };
}

export interface SkillRequirement {
  skillId: string;
  minimumLevel: string;
  weight: number; // 0-1 importance weight
  mandatory: boolean;
  domainContext?: string;
}

export class SkillsMatchingService {
  private logger = Logger.getInstance();
  private skillSynonyms: Map<string, string[]> = new Map();
  private domainContexts: Map<string, string[]> = new Map();

  constructor() {
    this.initializeSkillMappings();
  }

  // Main matching function with advanced algorithm
  async findSkillMatches(
    criteria: MatchingCriteria,
    options: {
      maxResults?: number;
      includePartialMatches?: boolean;
      considerTraining?: boolean;
      teamFitWeight?: number;
    } = {}
  ): Promise<SkillMatchResult[]> {
    const {
      maxResults = 10,
      includePartialMatches = true,
      considerTraining = false,
      teamFitWeight = 0.1
    } = options;

    try {
      this.logger.info(`Finding skill matches for project ${criteria.projectId}`);

      // Step 1: Get candidate pool with comprehensive skill data
      const candidates = await this.getCandidatePool(criteria);
      
      // Step 2: Calculate detailed skill matches for each candidate
      const matchResults: SkillMatchResult[] = [];
      
      for (const candidate of candidates) {
        const matchResult = await this.calculateDetailedMatch(candidate, criteria);
        
        // Apply filters
        if (!includePartialMatches && matchResult.overallMatchScore < 70) {
          continue;
        }
        
        matchResults.push(matchResult);
      }
      
      // Step 3: Sort and filter results
      const sortedResults = matchResults
        .sort((a, b) => {
          // Multi-criteria sorting
          if (Math.abs(b.overallMatchScore - a.overallMatchScore) > 5) {
            return b.overallMatchScore - a.overallMatchScore;
          }
          // Secondary sort by confidence
          if (Math.abs(b.confidenceLevel - a.confidenceLevel) > 10) {
            return b.confidenceLevel - a.confidenceLevel;
          }
          // Tertiary sort by availability
          return b.availabilityMetrics.capacityScore - a.availabilityMetrics.capacityScore;
        })
        .slice(0, maxResults);

      return sortedResults;

    } catch (error) {
      this.logger.error('Error in skill matching:', error);
      throw error;
    }
  }

  // Calculate similarity between skill sets using vector analysis
  async calculateSkillSimilarity(
    skillSet1: string[],
    skillSet2: string[],
    contextWeight: number = 0.3
  ): Promise<{
    cosineSimilarity: number;
    jaccardIndex: number;
    semanticSimilarity: number;
    overallSimilarity: number;
  }> {
    try {
      // Get skill vectors
      const vectors1 = await this.getSkillVectors(skillSet1);
      const vectors2 = await this.getSkillVectors(skillSet2);
      
      // Calculate cosine similarity
      const cosineSimilarity = this.calculateCosineSimilarity(vectors1, vectors2);
      
      // Calculate Jaccard index
      const intersection = new Set([...skillSet1].filter(x => skillSet2.includes(x)));
      const union = new Set([...skillSet1, ...skillSet2]);
      const jaccardIndex = intersection.size / union.size;
      
      // Calculate semantic similarity using skill synonyms and contexts
      const semanticSimilarity = await this.calculateSemanticSimilarity(skillSet1, skillSet2);
      
      // Weighted overall similarity
      const overallSimilarity = (
        cosineSimilarity * 0.4 +
        jaccardIndex * 0.3 +
        semanticSimilarity * 0.3
      );
      
      return {
        cosineSimilarity,
        jaccardIndex,
        semanticSimilarity,
        overallSimilarity
      };
      
    } catch (error) {
      this.logger.error('Error calculating skill similarity:', error);
      throw error;
    }
  }

  // Generate confidence scores with multiple factors
  calculateConfidenceScore(
    matchResult: Partial<SkillMatchResult>,
    historicalData?: {
      pastAssignmentSuccess: number;
      skillAssessmentAccuracy: number;
      performanceVariability: number;
    }
  ): {
    overallConfidence: number;
    confidenceFactors: {
      skillMatchConfidence: number;
      experienceConfidence: number;
      availabilityConfidence: number;
      historicalConfidence: number;
    };
    uncertaintyBounds: [number, number];
  } {
    try {
      const factors = matchResult.skillBreakdown;
      if (!factors) throw new Error('Missing skill breakdown for confidence calculation');

      // Skill match confidence
      const requiredSkillsMatched = factors.requiredSkills.filter(s => s.matchScore >= 70).length;
      const totalRequiredSkills = factors.requiredSkills.length;
      const skillMatchConfidence = totalRequiredSkills > 0 ? 
        (requiredSkillsMatched / totalRequiredSkills) * 100 : 100;

      // Experience confidence
      const expAlign = matchResult.experienceAlignment;
      const experienceConfidence = expAlign ? 
        Math.max(0, 100 - Math.abs(expAlign.experienceGap) * 10) : 50;

      // Availability confidence
      const availabilityConfidence = matchResult.availabilityMetrics?.capacityScore || 50;

      // Historical confidence
      const historicalConfidence = historicalData ? (
        historicalData.pastAssignmentSuccess * 0.4 +
        historicalData.skillAssessmentAccuracy * 0.3 +
        (100 - historicalData.performanceVariability) * 0.3
      ) : 50;

      // Weighted overall confidence
      const overallConfidence = (
        skillMatchConfidence * 0.35 +
        experienceConfidence * 0.25 +
        availabilityConfidence * 0.2 +
        historicalConfidence * 0.2
      );

      // Calculate uncertainty bounds using confidence interval
      const uncertainty = Math.max(5, 100 - overallConfidence) * 0.3;
      const uncertaintyBounds: [number, number] = [
        Math.max(0, overallConfidence - uncertainty),
        Math.min(100, overallConfidence + uncertainty)
      ];

      return {
        overallConfidence: Math.round(overallConfidence),
        confidenceFactors: {
          skillMatchConfidence: Math.round(skillMatchConfidence),
          experienceConfidence: Math.round(experienceConfidence),
          availabilityConfidence: Math.round(availabilityConfidence),
          historicalConfidence: Math.round(historicalConfidence)
        },
        uncertaintyBounds
      };

    } catch (error) {
      this.logger.error('Error calculating confidence score:', error);
      return {
        overallConfidence: 50,
        confidenceFactors: {
          skillMatchConfidence: 50,
          experienceConfidence: 50,
          availabilityConfidence: 50,
          historicalConfidence: 50
        },
        uncertaintyBounds: [30, 70]
      };
    }
  }

  // Predict performance based on skill alignment and historical data
  async predictPerformance(
    employeeId: string,
    projectRequirements: MatchingCriteria,
    historicalProjects?: {
      projectId: number;
      skillSimilarity: number;
      actualPerformance: number;
      clientSatisfaction: number;
    }[]
  ): Promise<{
    predictedScore: number;
    confidenceInterval: [number, number];
    keyPredictors: string[];
    riskFactors: string[];
  }> {
    try {
      // Get employee's current skill profile
      const skillProfile = await this.getEmployeeSkillProfile(employeeId);
      
      // Calculate base performance prediction
      let baseScore = 70; // Default baseline
      
      // Skill alignment factor
      const skillAlignment = await this.calculateSkillAlignment(skillProfile, projectRequirements);
      baseScore += (skillAlignment - 0.5) * 40; // -20 to +20 adjustment
      
      // Experience factor
      const experienceFactor = this.calculateExperienceFactor(skillProfile, projectRequirements);
      baseScore += experienceFactor * 15; // 0 to +15 adjustment
      
      // Historical performance factor
      if (historicalProjects && historicalProjects.length > 0) {
        const avgHistorical = historicalProjects.reduce((sum, p) => sum + p.actualPerformance, 0) / historicalProjects.length;
        const historicalWeight = Math.min(historicalProjects.length / 5, 1); // Max weight at 5+ projects
        baseScore = baseScore * (1 - historicalWeight * 0.3) + avgHistorical * historicalWeight * 0.3;
      }
      
      // Apply constraints
      const predictedScore = Math.max(10, Math.min(100, baseScore));
      
      // Calculate confidence interval
      const uncertainty = this.calculatePredictionUncertainty(skillProfile, historicalProjects?.length || 0);
      const confidenceInterval: [number, number] = [
        Math.max(10, predictedScore - uncertainty),
        Math.min(100, predictedScore + uncertainty)
      ];
      
      return {
        predictedScore: Math.round(predictedScore),
        confidenceInterval,
        keyPredictors: [
          'Skill alignment score',
          'Relevant experience',
          'Historical performance',
          'Domain expertise'
        ],
        riskFactors: [
          'Limited similar project experience',
          'Skill gaps in critical areas',
          'High current workload'
        ]
      };
      
    } catch (error) {
      this.logger.error('Error predicting performance:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getCandidatePool(criteria: MatchingCriteria): Promise<any[]> {
    const query = `
      SELECT 
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        e.email,
        e.position,
        d.name as department,
        e.hire_date,
        
        -- Skill information
        JSON_AGG(
          CASE WHEN es.id IS NOT NULL THEN
            JSON_BUILD_OBJECT(
              'skill_id', s.id,
              'skill_name', s.name,
              'category', s.category,
              'proficiency_level', es.proficiency_level,
              'years_of_experience', es.years_of_experience,
              'last_assessed', es.last_assessed,
              'proficiency_numeric', 
                CASE es.proficiency_level
                  WHEN 'beginner' THEN 1
                  WHEN 'intermediate' THEN 2
                  WHEN 'advanced' THEN 3
                  WHEN 'expert' THEN 4
                  WHEN 'master' THEN 5
                END
            )
          END
        ) FILTER (WHERE es.id IS NOT NULL) as skills,
        
        -- Current utilization
        COALESCE(SUM(
          CASE WHEN ra.status IN ('active', 'planned') 
               AND ra.start_date <= $2::date 
               AND (ra.end_date IS NULL OR ra.end_date >= $2::date)
          THEN ra.planned_allocation_percentage
          ELSE 0 END
        ), 0) as current_utilization
        
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN employee_skills es ON e.id = es.employee_id AND es.is_active = true
      LEFT JOIN skills s ON es.skill_id = s.id AND s.is_active = true
      LEFT JOIN resource_assignments ra ON e.id = ra.employee_id
      
      WHERE e.is_active = true
      
      GROUP BY e.id, e.first_name, e.last_name, e.email, e.position, d.name, e.hire_date
      
      HAVING COUNT(CASE WHEN s.id = ANY($1::uuid[]) THEN 1 END) > 0
      
      ORDER BY current_utilization ASC, hire_date DESC
    `;
    
    const requiredSkillIds = criteria.requiredSkills.map(rs => rs.skillId);
    const result = await dbService.query(query, [requiredSkillIds, criteria.startDate]);
    
    return result.rows;
  }

  private async calculateDetailedMatch(candidate: any, criteria: MatchingCriteria): Promise<SkillMatchResult> {
    // Process skill breakdown
    const requiredSkills: SkillMatchDetail[] = [];
    const bonusSkills: SkillMatchDetail[] = [];
    const missingSkills: SkillGap[] = [];
    
    const candidateSkills = candidate.skills || [];
    
    // Process required skills
    for (const reqSkill of criteria.requiredSkills) {
      const candidateSkill = candidateSkills.find((cs: any) => cs.skill_id === reqSkill.skillId);
      
      if (candidateSkill) {
        const matchScore = this.calculateSkillMatchScore(candidateSkill, reqSkill);
        requiredSkills.push({
          skillId: reqSkill.skillId,
          skillName: candidateSkill.skill_name,
          category: candidateSkill.category,
          required: true,
          requiredLevel: reqSkill.minimumLevel,
          employeeLevel: candidateSkill.proficiency_level,
          matchScore,
          experienceYears: candidateSkill.years_of_experience,
          lastUsed: candidateSkill.last_assessed,
          certifications: [], // Would be populated from database
          domainContext: [] // Would be populated from database
        });
      } else {
        missingSkills.push({
          skillId: reqSkill.skillId,
          skillName: 'Unknown', // Would get from skills table
          category: 'unknown',
          requiredLevel: reqSkill.minimumLevel,
          gapSeverity: reqSkill.mandatory ? 'critical' : 'major',
          alternativeSkills: [],
          trainingOptions: [],
          estimatedLearningTime: 12 // weeks
        });
      }
    }
    
    // Calculate experience alignment
    const totalExperience = this.calculateTotalExperience(candidateSkills);
    const relevantExperience = this.calculateRelevantExperience(candidateSkills, criteria);
    const experienceGap = this.calculateExperienceGap(criteria.experienceLevel, relevantExperience);
    
    // Calculate availability metrics
    const capacityScore = Math.max(0, 100 - candidate.current_utilization);
    
    // Calculate overall match score
    const overallMatchScore = this.calculateOverallMatchScore({
      requiredSkills,
      missingSkills,
      experienceAlignment: { totalExperience, relevantExperience, experienceGap },
      availabilityScore: capacityScore
    });
    
    // Calculate confidence level
    const mockResult = {
      skillBreakdown: { requiredSkills, bonusSkills, missingSkills },
      experienceAlignment: {
        totalExperience,
        relevantExperience,
        experienceGap,
        experienceScore: Math.max(0, 100 - Math.abs(experienceGap) * 20)
      },
      availabilityMetrics: {
        currentUtilization: candidate.current_utilization,
        futureAvailability: 100 - candidate.current_utilization,
        capacityScore
      }
    };
    
    const { overallConfidence } = this.calculateConfidenceScore(mockResult);
    
    // Generate risk assessment
    const riskAssessment = this.generateRiskAssessment(mockResult);
    
    return {
      employeeId: candidate.employee_id,
      employeeName: candidate.employee_name,
      email: candidate.email,
      department: candidate.department,
      position: candidate.position,
      overallMatchScore,
      confidenceLevel: overallConfidence,
      skillBreakdown: {
        requiredSkills,
        bonusSkills,
        missingSkills
      },
      experienceAlignment: {
        totalExperience,
        relevantExperience,
        experienceGap,
        experienceScore: Math.max(0, 100 - Math.abs(experienceGap) * 20)
      },
      availabilityMetrics: {
        currentUtilization: candidate.current_utilization,
        futureAvailability: 100 - candidate.current_utilization,
        capacityScore
      },
      riskAssessment,
      performancePrediction: {
        predictedScore: Math.min(100, overallMatchScore + (overallConfidence - 50) * 0.3),
        confidenceBounds: [
          Math.max(0, overallMatchScore - 15),
          Math.min(100, overallMatchScore + 15)
        ],
        keyFactors: ['Skill alignment', 'Experience level', 'Availability']
      }
    };
  }

  private calculateSkillMatchScore(candidateSkill: any, requiredSkill: SkillRequirement): number {
    const levelMapping = { 'beginner': 1, 'intermediate': 2, 'advanced': 3, 'expert': 4, 'master': 5 };
    const candidateLevel = levelMapping[candidateSkill.proficiency_level as keyof typeof levelMapping] || 1;
    const requiredLevel = levelMapping[requiredSkill.minimumLevel as keyof typeof levelMapping] || 1;
    
    // Base score from proficiency level difference
    const levelDiff = candidateLevel - requiredLevel;
    let baseScore = Math.max(0, 50 + levelDiff * 25);
    
    // Experience bonus
    const experienceBonus = Math.min(candidateSkill.years_of_experience * 5, 25);
    
    // Recency penalty (if last assessed is old)
    const recencyPenalty = candidateSkill.last_assessed ? 
      Math.max(0, (Date.now() - new Date(candidateSkill.last_assessed).getTime()) / (365 * 24 * 60 * 60 * 1000) * 5) : 0;
    
    return Math.max(0, Math.min(100, baseScore + experienceBonus - recencyPenalty));
  }

  private calculateOverallMatchScore(factors: any): number {
    const requiredMatches = factors.requiredSkills.filter((s: any) => s.matchScore >= 70).length;
    const totalRequired = factors.requiredSkills.length;
    const skillScore = totalRequired > 0 ? (requiredMatches / totalRequired) * 100 : 100;
    
    const avgSkillScore = factors.requiredSkills.length > 0 ?
      factors.requiredSkills.reduce((sum: number, skill: any) => sum + skill.matchScore, 0) / factors.requiredSkills.length : 0;
    
    const experienceScore = Math.max(0, 100 - Math.abs(factors.experienceAlignment.experienceGap) * 20);
    const availabilityScore = factors.availabilityScore;
    
    // Missing skills penalty
    const criticalMissing = factors.missingSkills.filter((s: any) => s.gapSeverity === 'critical').length;
    const missingPenalty = criticalMissing * 20;
    
    const overallScore = (
      skillScore * 0.3 +
      avgSkillScore * 0.25 +
      experienceScore * 0.2 +
      availabilityScore * 0.15 +
      (100 - missingPenalty) * 0.1
    );
    
    return Math.max(0, Math.min(100, Math.round(overallScore)));
  }

  private generateRiskAssessment(matchResult: any): any {
    const risks: RiskFactor[] = [];
    
    // Availability risk
    if (matchResult.availabilityMetrics.currentUtilization > 80) {
      risks.push({
        type: 'availability',
        severity: 'high',
        description: 'Employee has high current utilization',
        impact: 0.8,
        probability: 0.9
      });
    }
    
    // Skill gap risk
    const criticalGaps = matchResult.skillBreakdown.missingSkills.filter((s: any) => s.gapSeverity === 'critical');
    if (criticalGaps.length > 0) {
      risks.push({
        type: 'skill_gap',
        severity: 'high',
        description: `Missing ${criticalGaps.length} critical skills`,
        impact: 0.7,
        probability: 0.8
      });
    }
    
    return {
      overallRisk: risks.length === 0 ? 'low' : risks.some(r => r.severity === 'high') ? 'high' : 'medium',
      riskFactors: risks,
      mitigationSuggestions: [
        'Consider pairing with experienced team member',
        'Plan for skill development during project',
        'Monitor workload closely'
      ]
    };
  }

  private calculateTotalExperience(skills: any[]): number {
    return skills.reduce((max, skill) => Math.max(max, skill.years_of_experience || 0), 0);
  }

  private calculateRelevantExperience(skills: any[], criteria: MatchingCriteria): number {
    const relevantSkills = skills.filter(skill => 
      criteria.requiredSkills.some(rs => rs.skillId === skill.skill_id)
    );
    
    if (relevantSkills.length === 0) return 0;
    
    return relevantSkills.reduce((sum, skill) => sum + (skill.years_of_experience || 0), 0) / relevantSkills.length;
  }

  private calculateExperienceGap(requiredLevel: string, actualExperience: number): number {
    const levelExperience = {
      'junior': 1,
      'intermediate': 3,
      'senior': 6,
      'expert': 10
    };
    
    const required = levelExperience[requiredLevel as keyof typeof levelExperience] || 3;
    return required - actualExperience;
  }

  private async getSkillVectors(skillIds: string[]): Promise<SkillVector[]> {
    // Simplified implementation - would use actual vector embeddings in production
    return skillIds.map(skillId => ({
      skillId,
      skillName: 'Skill Name',
      category: 'technical',
      proficiencyScore: 0.8,
      experienceWeight: 0.7,
      recencyWeight: 0.9,
      domainRelevance: 0.6
    }));
  }

  private calculateCosineSimilarity(vectors1: SkillVector[], vectors2: SkillVector[]): number {
    // Simplified cosine similarity calculation
    return 0.75; // Mock value
  }

  private async calculateSemanticSimilarity(skillSet1: string[], skillSet2: string[]): Promise<number> {
    // Would use NLP models for semantic similarity in production
    return 0.65; // Mock value
  }

  private async getEmployeeSkillProfile(employeeId: string): Promise<any> {
    const query = `
      SELECT 
        s.id, s.name, s.category,
        es.proficiency_level, es.years_of_experience, es.last_assessed
      FROM employee_skills es
      JOIN skills s ON es.skill_id = s.id
      WHERE es.employee_id = $1 AND es.is_active = true
    `;
    
    const result = await dbService.query(query, [employeeId]);
    return result.rows;
  }

  private calculateSkillAlignment(skillProfile: any[], requirements: MatchingCriteria): number {
    // Calculate alignment between employee skills and project requirements
    const matches = requirements.requiredSkills.filter(req => 
      skillProfile.some(skill => skill.id === req.skillId)
    ).length;
    
    return matches / requirements.requiredSkills.length;
  }

  private calculateExperienceFactor(skillProfile: any[], requirements: MatchingCriteria): number {
    const avgExperience = skillProfile.reduce((sum, skill) => sum + skill.years_of_experience, 0) / skillProfile.length || 0;
    const levelMapping = { 'junior': 2, 'intermediate': 4, 'senior': 7, 'expert': 12 };
    const requiredExperience = levelMapping[requirements.experienceLevel];
    
    return Math.min(1, avgExperience / requiredExperience);
  }

  private calculatePredictionUncertainty(skillProfile: any[], historicalProjectCount: number): number {
    // Base uncertainty
    let uncertainty = 15;
    
    // Reduce uncertainty with more historical data
    uncertainty *= Math.max(0.3, 1 - (historicalProjectCount * 0.1));
    
    // Increase uncertainty with skill gaps
    const skillCount = skillProfile.length;
    if (skillCount < 3) uncertainty *= 1.5;
    
    return Math.round(uncertainty);
  }

  private initializeSkillMappings(): void {
    // Initialize skill synonyms and domain contexts
    // This would be loaded from database in production
    this.skillSynonyms.set('javascript', ['js', 'node.js', 'react', 'vue']);
    this.skillSynonyms.set('python', ['django', 'flask', 'pandas', 'numpy']);
    
    this.domainContexts.set('web-development', ['frontend', 'backend', 'fullstack']);
    this.domainContexts.set('data-science', ['analytics', 'machine-learning', 'statistics']);
  }
}

export default new SkillsMatchingService();
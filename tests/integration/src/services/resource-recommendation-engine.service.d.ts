export const __esModule: boolean;
export class ResourceRecommendationEngine {
    static create(): Promise<ResourceRecommendationEngine>;
    constructor(db: any);
    db: any;
    skillMatcher: skill_matcher_service_1.SkillMatcherService;
    teamAnalyzer: team_chemistry_analyzer_service_1.TeamChemistryAnalyzerService;
    generateRecommendations(request: any, filters?: {}): Promise<{
        recommendationId: string;
        projectId: any;
        overallScore: number;
        confidence: string;
        recommendedTeam: {
            members: any;
            totalCost: any;
            teamChemistry: any;
        };
        alternatives: any;
        reasoning: {
            keyStrengths: string[];
            potentialConcerns: string[];
            tradeoffs: string[];
            riskAssessment: {
                level: string;
                factors: any;
                mitigation: any;
            };
        };
        optimizations: {
            type: string;
            description: string;
            impact: number;
            cost: number;
            timeline: string;
        }[];
        manualOverrides: {
            allowedSubstitutions: {
                originalEmployeeId: any;
                substitutes: {
                    employeeId: any;
                    matchScore: number;
                    reasoning: string;
                }[];
            }[];
            roleFlexibility: any;
        };
    }[]>;
    generateTeamOptions(request: any, maxOptions: any): Promise<any[]>;
    generateTeamByStrategy(request: any, roleCandidates: any, strategy: any): Promise<{
        composition: {
            members: {
                employeeId: any;
                firstName: any;
                lastName: any;
                position: any;
                departmentId: any;
                skills: any;
            }[];
            projectId: any;
            roleRequirements: any;
        };
        totalScore: number;
        members: any[];
    } | null>;
    buildRecommendation(teamOption: any, teamChemistry: any, request: any, filters: any, alternatives: any): Promise<{
        recommendationId: string;
        projectId: any;
        overallScore: number;
        confidence: string;
        recommendedTeam: {
            members: any;
            totalCost: any;
            teamChemistry: any;
        };
        alternatives: any;
        reasoning: {
            keyStrengths: string[];
            potentialConcerns: string[];
            tradeoffs: string[];
            riskAssessment: {
                level: string;
                factors: any;
                mitigation: any;
            };
        };
        optimizations: {
            type: string;
            description: string;
            impact: number;
            cost: number;
            timeline: string;
        }[];
        manualOverrides: {
            allowedSubstitutions: {
                originalEmployeeId: any;
                substitutes: {
                    employeeId: any;
                    matchScore: number;
                    reasoning: string;
                }[];
            }[];
            roleFlexibility: any;
        };
    }>;
    getSeniorityScore(position: any): 5 | 1 | 2 | 4;
    selectDiverseTeam(candidates: any, count: any): any[];
    removeDuplicateTeams(teams: any): any[];
    buildReasoning(teamOption: any, teamChemistry: any, request: any): {
        keyStrengths: string[];
        potentialConcerns: string[];
        tradeoffs: string[];
        riskAssessment: {
            level: string;
            factors: any;
            mitigation: any;
        };
    };
    generateOptimizations(teamOption: any, teamChemistry: any, request: any): Promise<{
        type: string;
        description: string;
        impact: number;
        cost: number;
        timeline: string;
    }[]>;
    buildManualOverrides(teamOption: any, request: any): Promise<{
        allowedSubstitutions: {
            originalEmployeeId: any;
            substitutes: {
                employeeId: any;
                matchScore: number;
                reasoning: string;
            }[];
        }[];
        roleFlexibility: any;
    }>;
    determineRecommendedRole(member: any, roleRequirements: any): any;
    findAlternativeRoles(member: any, roleRequirements: any, currentRole: any): any[];
    identifyTradeoffs(mainOption: any, alternative: any): string[];
}
import skill_matcher_service_1 = require("./skill-matcher.service");
import team_chemistry_analyzer_service_1 = require("./team-chemistry-analyzer.service");
//# sourceMappingURL=resource-recommendation-engine.service.d.ts.map
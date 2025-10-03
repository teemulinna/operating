export const __esModule: boolean;
export class TeamChemistryAnalyzerService {
    static create(): Promise<TeamChemistryAnalyzerService>;
    constructor(db: any);
    db: any;
    analyzeTeamChemistry(teamComposition: any): Promise<{
        overallChemistryScore: number;
        strengths: never[];
        concerns: never[];
        recommendations: never[];
        skillComplementarity: {
            score: number;
            overlapAreas: any[];
            gapAreas: any[];
            redundantSkills: any[];
            uniqueContributions: {
                employeeId: any;
                uniqueSkills: any[];
            }[];
        };
        experienceDiversity: {
            score: number;
            seniorityBalance: {
                junior: number;
                mid: number;
                senior: number;
                lead: number;
            };
            domainExpertise: {
                domain: any;
                experts: any;
                novices: any;
            }[];
        };
        collaborationHistory: {
            score: number;
            successfulCollaborations: any;
            potentialConflicts: any[];
        };
        communicationDynamics: {
            score: number;
            workingStyles: {
                employeeId: any;
                style: string;
                traits: string[];
            }[];
            departmentDiversity: number;
            timeZoneCompatibility: number;
        };
        riskFactors: {
            type: string;
            severity: string;
            description: string;
            affectedMembers: any;
            mitigation: string;
        }[];
        predictedPerformance: {
            velocityScore: number;
            qualityScore: number;
            innovationScore: number;
            stabilityScore: number;
        };
    }>;
    analyzeSkillComplementarity(team: any): Promise<{
        score: number;
        overlapAreas: any[];
        gapAreas: any[];
        redundantSkills: any[];
        uniqueContributions: {
            employeeId: any;
            uniqueSkills: any[];
        }[];
    }>;
    analyzeExperienceDiversity(team: any): Promise<{
        score: number;
        seniorityBalance: {
            junior: number;
            mid: number;
            senior: number;
            lead: number;
        };
        domainExpertise: {
            domain: any;
            experts: any;
            novices: any;
        }[];
    }>;
    analyzeCollaborationHistory(team: any): Promise<{
        score: number;
        successfulCollaborations: any;
        potentialConflicts: any[];
    }>;
    analyzeCommunicationDynamics(team: any): Promise<{
        score: number;
        workingStyles: {
            employeeId: any;
            style: string;
            traits: string[];
        }[];
        departmentDiversity: number;
        timeZoneCompatibility: number;
    }>;
    identifyRiskFactors(team: any): Promise<{
        type: string;
        severity: string;
        description: string;
        affectedMembers: any;
        mitigation: string;
    }[]>;
    predictTeamPerformance(team: any): Promise<{
        velocityScore: number;
        qualityScore: number;
        innovationScore: number;
        stabilityScore: number;
    }>;
    generateOptimizationSuggestions(analysis: any, team: any): Promise<{
        type: string;
        description: string;
        expectedImpact: number;
        implementation: string;
    }[]>;
    getSkillName(team: any, skillId: any): any;
    getSeniorityLevel(position: any): 5 | 1 | 2 | 4;
    calculateProjectSuccessScore(avgHours: any, duration: any): number;
    calculateStyleBalance(workingStyles: any): number;
    calculateOverallScore(analysis: any): number;
    generateInsights(analysis: any): void;
    identifyPotentialConflicts(team: any): Promise<never[]>;
}
//# sourceMappingURL=team-chemistry-analyzer.service.d.ts.map
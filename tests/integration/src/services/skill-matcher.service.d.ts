export const __esModule: boolean;
export class SkillMatcherService {
    static create(): Promise<SkillMatcherService>;
    constructor(db: any);
    db: any;
    findResourceMatches(criteria: any, filters?: {}): Promise<{
        employeeId: any;
        employee: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
            position: any;
            departmentId: any;
            departmentName: any;
        };
        overallMatchScore: number;
        skillMatches: {
            skillId: any;
            skillName: any;
            category: any;
            required: any;
            weight: any;
            hasSkill: boolean;
            employeeProficiency: any;
            requiredProficiency: any;
            proficiencyGap: number;
            matchScore: number;
            yearsOfExperience: any;
            lastUsed: any;
        }[];
        strengthAreas: any[];
        gapAreas: any[];
        availabilityScore: number;
        teamFitScore: number;
        overallRecommendation: string;
        reasoningNotes: string[];
    }[]>;
    calculateSkillMatch(candidate: any, criteria: any, filters: any): Promise<{
        employeeId: any;
        employee: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
            position: any;
            departmentId: any;
            departmentName: any;
        };
        overallMatchScore: number;
        skillMatches: {
            skillId: any;
            skillName: any;
            category: any;
            required: any;
            weight: any;
            hasSkill: boolean;
            employeeProficiency: any;
            requiredProficiency: any;
            proficiencyGap: number;
            matchScore: number;
            yearsOfExperience: any;
            lastUsed: any;
        }[];
        strengthAreas: any[];
        gapAreas: any[];
        availabilityScore: number;
        teamFitScore: number;
        overallRecommendation: string;
        reasoningNotes: string[];
    }>;
    calculateAvailabilityScore(employeeId: any, requiredHours: any, startDate: any, endDate: any): Promise<number>;
    calculateTeamFitScore(employeeId: any, projectId: any): Promise<60 | 80 | 90 | 70 | 75>;
    getCandidatesWithSkills(filters: any): Promise<any>;
    generateReasoningNotes(skillMatches: any, availabilityScore: any, teamFitScore: any, requiredSkillsMet: any, requiredSkillsCount: any): string[];
    getMatchStatistics(criteria: any): Promise<{
        totalCandidates: number;
        candidatesWithAnySkill: number;
        candidatesWithAllRequiredSkills: number;
        topSkillGaps: any;
        averageMatchScore: number;
    }>;
}
//# sourceMappingURL=skill-matcher.service.d.ts.map
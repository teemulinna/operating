"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceRecommendationEngine = void 0;
const database_service_1 = require("../database/database.service");
const database_factory_1 = require("../database/database-factory");
const api_error_1 = require("../utils/api-error");
const skill_matcher_service_1 = require("./skill-matcher.service");
const team_chemistry_analyzer_service_1 = require("./team-chemistry-analyzer.service");
class ResourceRecommendationEngine {
    constructor(db) {
        this.db = db || database_service_1.DatabaseService.getInstance();
        this.skillMatcher = new skill_matcher_service_1.SkillMatcherService(this.db);
        this.teamAnalyzer = new team_chemistry_analyzer_service_1.TeamChemistryAnalyzerService(this.db);
    }
    static async create() {
        const db = await database_factory_1.DatabaseFactory.getDatabaseService();
        return new ResourceRecommendationEngine(db);
    }
    /**
     * Generate comprehensive resource recommendations
     */
    async generateRecommendations(request, filters = {}) {
        try {
            const maxRecommendations = filters.maxRecommendations || 3;
            const includeAlternatives = filters.includeAlternatives !== false;
            // Generate multiple team composition options
            const teamOptions = await this.generateTeamOptions(request, maxRecommendations + 2);
            const recommendations = [];
            for (let i = 0; i < Math.min(teamOptions.length, maxRecommendations); i++) {
                const teamOption = teamOptions[i];
                // Analyze team chemistry
                const teamChemistry = await this.teamAnalyzer.analyzeTeamChemistry(teamOption.composition);
                // Generate detailed recommendation
                const recommendation = await this.buildRecommendation(teamOption, teamChemistry, request, filters, includeAlternatives ? teamOptions.slice(i + 1, i + 3) : []);
                // Filter by confidence if specified
                if (filters.minConfidence) {
                    const confidenceOrder = { 'low': 0, 'medium': 1, 'high': 2 };
                    if (confidenceOrder[recommendation.confidence] < confidenceOrder[filters.minConfidence]) {
                        continue;
                    }
                }
                recommendations.push(recommendation);
            }
            return recommendations.sort((a, b) => b.overallScore - a.overallScore);
        }
        catch (error) {
            console.error('Error generating recommendations:', error);
            throw new api_error_1.ApiError(500, 'Failed to generate resource recommendations');
        }
    }
    /**
     * Generate multiple team composition options
     */
    async generateTeamOptions(request, maxOptions) {
        const teamOptions = [];
        // For each role, find the best candidates
        const roleCandidates = new Map();
        for (const role of request.roleRequirements) {
            const criteria = {
                requiredSkills: role.skillRequirements.map(sr => ({
                    skillId: sr.skillId,
                    skillName: sr.skillName,
                    category: sr.category,
                    minimumProficiency: sr.minimumProficiency,
                    weight: sr.weight,
                    isRequired: sr.isRequired
                })),
                projectId: request.projectId,
                roleTitle: role.roleTitle,
                experienceLevel: role.experienceLevel,
                startDate: request.projectConstraints?.startDate,
                endDate: request.projectConstraints?.endDate
            };
            const candidates = await this.skillMatcher.findResourceMatches(criteria, {
                maxResults: Math.max(10, role.count * 3), // Get more candidates than needed
                departmentIds: role.preferredDepartments,
                minimumMatchScore: 30 // Lower threshold for more options
            });
            roleCandidates.set(role.roleTitle, candidates);
        }
        // Generate different team combinations using various strategies
        const strategies = [
            'best_match', // Highest individual scores
            'balanced', // Balance between skills and availability
            'cost_efficient', // Lower cost options
            'diverse', // Maximum diversity
            'experienced' // Prefer senior members
        ];
        for (const strategy of strategies.slice(0, maxOptions)) {
            const teamOption = await this.generateTeamByStrategy(request, roleCandidates, strategy);
            if (teamOption && teamOption.members.length > 0) {
                teamOptions.push(teamOption);
            }
        }
        // Remove duplicates and sort by score
        const uniqueTeams = this.removeDuplicateTeams(teamOptions);
        return uniqueTeams.sort((a, b) => b.totalScore - a.totalScore);
    }
    /**
     * Generate team composition using specific strategy
     */
    async generateTeamByStrategy(request, roleCandidates, strategy) {
        const selectedMembers = [];
        const usedEmployees = new Set();
        for (const role of request.roleRequirements) {
            const candidates = roleCandidates.get(role.roleTitle) || [];
            const availableCandidates = candidates.filter(c => !usedEmployees.has(c.employeeId));
            if (availableCandidates.length === 0) {
                continue; // Skip this role if no candidates available
            }
            let selectedCandidates = [];
            switch (strategy) {
                case 'best_match':
                    selectedCandidates = availableCandidates
                        .sort((a, b) => b.overallMatchScore - a.overallMatchScore)
                        .slice(0, role.count);
                    break;
                case 'balanced':
                    selectedCandidates = availableCandidates
                        .sort((a, b) => {
                        const scoreA = a.overallMatchScore * 0.7 + a.availabilityScore * 0.3;
                        const scoreB = b.overallMatchScore * 0.7 + b.availabilityScore * 0.3;
                        return scoreB - scoreA;
                    })
                        .slice(0, role.count);
                    break;
                case 'cost_efficient':
                    // Prefer junior roles for cost efficiency
                    selectedCandidates = availableCandidates
                        .filter(c => c.overallMatchScore >= 60) // Minimum competency
                        .sort((a, b) => {
                        const seniorityA = this.getSeniorityScore(a.employee.position);
                        const seniorityB = this.getSeniorityScore(b.employee.position);
                        return seniorityA - seniorityB; // Lower seniority first
                    })
                        .slice(0, role.count);
                    break;
                case 'diverse':
                    selectedCandidates = this.selectDiverseTeam(availableCandidates, role.count);
                    break;
                case 'experienced':
                    selectedCandidates = availableCandidates
                        .sort((a, b) => {
                        const seniorityA = this.getSeniorityScore(a.employee.position);
                        const seniorityB = this.getSeniorityScore(b.employee.position);
                        return seniorityB - seniorityA; // Higher seniority first
                    })
                        .slice(0, role.count);
                    break;
                default:
                    selectedCandidates = availableCandidates.slice(0, role.count);
            }
            selectedMembers.push(...selectedCandidates);
            selectedCandidates.forEach(c => usedEmployees.add(c.employeeId));
        }
        if (selectedMembers.length === 0) {
            return null;
        }
        // Build team composition
        const composition = {
            members: selectedMembers.map(m => ({
                employeeId: m.employeeId,
                firstName: m.employee.firstName,
                lastName: m.employee.lastName,
                position: m.employee.position,
                departmentId: m.employee.departmentId,
                skills: m.skillMatches.map(sm => ({
                    skillId: sm.skillId,
                    skillName: sm.skillName,
                    category: sm.category,
                    proficiencyLevel: sm.employeeProficiency || 0
                }))
            })),
            projectId: request.projectId,
            roleRequirements: request.roleRequirements.map(rr => ({
                role: rr.roleTitle,
                skillRequirements: rr.skillRequirements.map(sr => sr.skillName),
                count: rr.count
            }))
        };
        const totalScore = selectedMembers.reduce((sum, m) => sum + m.overallMatchScore, 0) / selectedMembers.length;
        return {
            composition,
            totalScore,
            members: selectedMembers
        };
    }
    /**
     * Build detailed recommendation from team option
     */
    async buildRecommendation(teamOption, teamChemistry, request, filters, alternatives) {
        const recommendationId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Calculate overall score combining individual matches and team chemistry
        const individualScore = teamOption.totalScore;
        const chemistryScore = teamChemistry.overallChemistryScore;
        const overallScore = Math.round(individualScore * 0.7 + chemistryScore * 0.3);
        // Determine confidence level
        let confidence = 'medium';
        if (overallScore >= 85 && teamChemistry.riskFactors.length <= 1) {
            confidence = 'high';
        }
        else if (overallScore < 60 || teamChemistry.riskFactors.some(rf => rf.severity === 'high')) {
            confidence = 'low';
        }
        // Calculate total cost if budget information is available
        const totalCost = request.roleRequirements.reduce((sum, role) => sum + (role.budget || 0), 0);
        // Build reasoning
        const reasoning = this.buildReasoning(teamOption, teamChemistry, request);
        // Generate optimizations
        const optimizations = await this.generateOptimizations(teamOption, teamChemistry, request);
        // Build manual overrides
        const manualOverrides = await this.buildManualOverrides(teamOption, request);
        return {
            recommendationId,
            projectId: request.projectId,
            overallScore,
            confidence,
            recommendedTeam: {
                members: teamOption.members.map(member => {
                    const recommendedRole = this.determineRecommendedRole(member, request.roleRequirements);
                    return {
                        employeeId: member.employeeId,
                        recommendedRole,
                        matchScore: member.overallMatchScore,
                        skillMatch: member,
                        alternativeRoles: this.findAlternativeRoles(member, request.roleRequirements, recommendedRole)
                    };
                }),
                totalCost: totalCost > 0 ? totalCost : undefined,
                teamChemistry
            },
            alternatives: alternatives.map(alt => ({
                members: alt.members.map(m => ({
                    employeeId: m.employeeId,
                    recommendedRole: this.determineRecommendedRole(m, request.roleRequirements),
                    matchScore: m.overallMatchScore
                })),
                overallScore: alt.totalScore,
                tradeoffs: this.identifyTradeoffs(teamOption, alt)
            })),
            reasoning,
            optimizations,
            manualOverrides
        };
    }
    // Helper methods
    getSeniorityScore(position) {
        const pos = position.toLowerCase();
        if (pos.includes('junior') || pos.includes('associate') || pos.includes('entry'))
            return 1;
        if (pos.includes('senior') || pos.includes('principal'))
            return 4;
        if (pos.includes('lead') || pos.includes('manager') || pos.includes('director'))
            return 5;
        return 2; // mid-level default
    }
    selectDiverseTeam(candidates, count) {
        const selected = [];
        const usedDepartments = new Set();
        // First pass: select from different departments
        for (const candidate of candidates) {
            if (selected.length >= count)
                break;
            if (!usedDepartments.has(candidate.employee.departmentId)) {
                selected.push(candidate);
                usedDepartments.add(candidate.employee.departmentId);
            }
        }
        // Second pass: fill remaining slots with best candidates
        for (const candidate of candidates) {
            if (selected.length >= count)
                break;
            if (!selected.some(s => s.employeeId === candidate.employeeId)) {
                selected.push(candidate);
            }
        }
        return selected;
    }
    removeDuplicateTeams(teams) {
        const unique = new Map();
        for (const team of teams) {
            const memberIds = team.members.map(m => m.employeeId).sort().join(',');
            if (!unique.has(memberIds) || unique.get(memberIds).totalScore < team.totalScore) {
                unique.set(memberIds, team);
            }
        }
        return Array.from(unique.values());
    }
    buildReasoning(teamOption, teamChemistry, request) {
        const keyStrengths = [];
        const potentialConcerns = [];
        const tradeoffs = [];
        // Analyze strengths
        const highPerformers = teamOption.members.filter((m) => m.overallMatchScore >= 80).length;
        if (highPerformers > 0) {
            keyStrengths.push(`${highPerformers} team member(s) with excellent skill match (80%+)`);
        }
        if (teamChemistry.overallChemistryScore >= 80) {
            keyStrengths.push('Strong team chemistry with good collaboration potential');
        }
        if (teamChemistry.skillComplementarity.uniqueContributions.length > 0) {
            keyStrengths.push('Team members bring unique and complementary skills');
        }
        // Analyze concerns
        const lowPerformers = teamOption.members.filter((m) => m.overallMatchScore < 60).length;
        if (lowPerformers > 0) {
            potentialConcerns.push(`${lowPerformers} team member(s) with limited skill match (<60%)`);
        }
        if (teamChemistry.skillComplementarity.gapAreas.length > 0) {
            potentialConcerns.push(`Missing skills: ${teamChemistry.skillComplementarity.gapAreas.join(', ')}`);
        }
        const highRisks = teamChemistry.riskFactors.filter(rf => rf.severity === 'high').length;
        if (highRisks > 0) {
            potentialConcerns.push(`${highRisks} high-severity risk factor(s) identified`);
        }
        // Identify tradeoffs
        const avgSeniority = teamOption.members.reduce((sum, m) => sum + this.getSeniorityScore(m.employee.position), 0) / teamOption.members.length;
        if (avgSeniority > 3.5) {
            tradeoffs.push('Higher cost due to senior team members, but better quality expected');
        }
        else if (avgSeniority < 2) {
            tradeoffs.push('Lower cost with junior members, but may require more oversight');
        }
        return {
            keyStrengths,
            potentialConcerns,
            tradeoffs,
            riskAssessment: {
                level: teamChemistry.riskFactors.some(rf => rf.severity === 'high') ? 'high' :
                    teamChemistry.riskFactors.some(rf => rf.severity === 'medium') ? 'medium' : 'low',
                factors: teamChemistry.riskFactors.map(rf => rf.description),
                mitigation: teamChemistry.riskFactors.map(rf => rf.mitigation)
            }
        };
    }
    async generateOptimizations(teamOption, teamChemistry, request) {
        const optimizations = [];
        // Skill training recommendations
        const skillGaps = teamChemistry.skillComplementarity.gapAreas;
        if (skillGaps.length > 0) {
            optimizations.push({
                type: 'skill_training',
                description: `Provide training in: ${skillGaps.slice(0, 3).join(', ')}`,
                impact: 15,
                cost: skillGaps.length * 2000, // Estimated training cost
                timeline: '2-4 weeks'
            });
        }
        // External hire recommendations
        const criticalSkillGaps = skillGaps.filter(skill => request.roleRequirements.some(role => role.skillRequirements.some(sr => sr.skillName.toLowerCase() === skill.toLowerCase() && sr.isRequired)));
        if (criticalSkillGaps.length > 0) {
            optimizations.push({
                type: 'external_hire',
                description: `Consider external hire for critical skills: ${criticalSkillGaps.join(', ')}`,
                impact: 25,
                cost: 50000, // Estimated hiring cost
                timeline: '4-8 weeks'
            });
        }
        return optimizations;
    }
    async buildManualOverrides(teamOption, request) {
        const allowedSubstitutions = [];
        // For each team member, find potential substitutes
        for (const member of teamOption.members) {
            const role = this.determineRecommendedRole(member, request.roleRequirements);
            const roleReq = request.roleRequirements.find(r => r.roleTitle === role);
            if (roleReq) {
                const criteria = {
                    requiredSkills: roleReq.skillRequirements.map(sr => ({
                        skillId: sr.skillId,
                        skillName: sr.skillName,
                        category: sr.category,
                        minimumProficiency: sr.minimumProficiency,
                        weight: sr.weight,
                        isRequired: sr.isRequired
                    }))
                };
                const substitutes = await this.skillMatcher.findResourceMatches(criteria, {
                    maxResults: 5,
                    excludeEmployeeIds: [member.employeeId],
                    minimumMatchScore: 50
                });
                if (substitutes.length > 0) {
                    allowedSubstitutions.push({
                        originalEmployeeId: member.employeeId,
                        substitutes: substitutes.slice(0, 3).map(sub => ({
                            employeeId: sub.employeeId,
                            matchScore: sub.overallMatchScore,
                            reasoning: sub.reasoningNotes.slice(0, 2).join('; ')
                        }))
                    });
                }
            }
        }
        const roleFlexibility = request.roleRequirements.map(role => ({
            roleTitle: role.roleTitle,
            flexibleSkills: role.skillRequirements.filter(sr => !sr.isRequired).map(sr => sr.skillName),
            acceptableAlternatives: [] // Could be populated with similar skills
        }));
        return {
            allowedSubstitutions,
            roleFlexibility
        };
    }
    determineRecommendedRole(member, roleRequirements) {
        // Find the role this member best fits
        let bestRole = roleRequirements[0]?.roleTitle || 'General';
        let bestScore = 0;
        for (const role of roleRequirements) {
            const roleSkills = role.skillRequirements.map(sr => sr.skillName.toLowerCase());
            const memberSkills = member.skillMatches.map(sm => sm.skillName.toLowerCase());
            const matchingSkills = roleSkills.filter(rs => memberSkills.includes(rs));
            const matchScore = matchingSkills.length / Math.max(1, roleSkills.length);
            if (matchScore > bestScore) {
                bestScore = matchScore;
                bestRole = role.roleTitle;
            }
        }
        return bestRole;
    }
    findAlternativeRoles(member, roleRequirements, currentRole) {
        const alternatives = [];
        for (const role of roleRequirements) {
            if (role.roleTitle === currentRole)
                continue;
            const roleSkills = role.skillRequirements.map(sr => sr.skillName.toLowerCase());
            const memberSkills = member.skillMatches.map(sm => sm.skillName.toLowerCase());
            const matchingSkills = roleSkills.filter(rs => memberSkills.includes(rs));
            const matchScore = matchingSkills.length / Math.max(1, roleSkills.length);
            if (matchScore >= 0.5) { // 50% skill overlap
                alternatives.push(role.roleTitle);
            }
        }
        return alternatives;
    }
    identifyTradeoffs(mainOption, alternative) {
        const tradeoffs = [];
        const mainAvgScore = mainOption.members.reduce((sum, m) => sum + m.overallMatchScore, 0) / mainOption.members.length;
        const altAvgScore = alternative.members.reduce((sum, m) => sum + m.overallMatchScore, 0) / alternative.members.length;
        if (altAvgScore > mainAvgScore) {
            tradeoffs.push('Higher average skill match scores');
        }
        else {
            tradeoffs.push('Lower average skill match scores');
        }
        // Could add more sophisticated tradeoff analysis here
        return tradeoffs;
    }
}
exports.ResourceRecommendationEngine = ResourceRecommendationEngine;

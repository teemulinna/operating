"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const skills_matching_service_1 = require("../src/services/skills-matching.service");
describe('SkillsMatchingService - Real Algorithm Implementation', () => {
    let skillsMatchingService;
    beforeEach(() => {
        skillsMatchingService = new skills_matching_service_1.SkillsMatchingService();
    });
    describe('calculateCosineSimilarity', () => {
        it('should return 0 for empty vectors', () => {
            const result = skillsMatchingService.calculateCosineSimilarity([], []);
            expect(result).toBe(0);
        });
        it('should return 1 for identical skill vectors', () => {
            const identicalVectors = [
                {
                    skillId: 'skill1',
                    skillName: 'JavaScript',
                    category: 'programming',
                    proficiencyScore: 0.8,
                    experienceWeight: 0.7,
                    recencyWeight: 0.9,
                    domainRelevance: 1.0
                }
            ];
            const result = skillsMatchingService.calculateCosineSimilarity(identicalVectors, identicalVectors);
            expect(result).toBe(1);
        });
        it('should calculate real cosine similarity for different vectors', () => {
            const vectors1 = [
                {
                    skillId: 'skill1',
                    skillName: 'JavaScript',
                    category: 'programming',
                    proficiencyScore: 0.9,
                    experienceWeight: 0.8,
                    recencyWeight: 0.9,
                    domainRelevance: 1.0
                },
                {
                    skillId: 'skill2',
                    skillName: 'Python',
                    category: 'programming',
                    proficiencyScore: 0.7,
                    experienceWeight: 0.6,
                    recencyWeight: 0.8,
                    domainRelevance: 1.0
                }
            ];
            const vectors2 = [
                {
                    skillId: 'skill1',
                    skillName: 'JavaScript',
                    category: 'programming',
                    proficiencyScore: 0.6,
                    experienceWeight: 0.5,
                    recencyWeight: 0.7,
                    domainRelevance: 0.8
                }
            ];
            const result = skillsMatchingService.calculateCosineSimilarity(vectors1, vectors2);
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThan(1);
            expect(result).not.toBe(0.75);
        });
        it('should return 0 for completely different skill sets', () => {
            const vectors1 = [
                {
                    skillId: 'skill1',
                    skillName: 'JavaScript',
                    category: 'programming',
                    proficiencyScore: 0.8,
                    experienceWeight: 0.7,
                    recencyWeight: 0.9,
                    domainRelevance: 1.0
                }
            ];
            const vectors2 = [
                {
                    skillId: 'skill2',
                    skillName: 'Python',
                    category: 'programming',
                    proficiencyScore: 0.6,
                    experienceWeight: 0.5,
                    recencyWeight: 0.7,
                    domainRelevance: 0.8
                }
            ];
            const result = skillsMatchingService.calculateCosineSimilarity(vectors1, vectors2);
            expect(result).toBe(0);
        });
    });
    describe('calculateStringSimilarity', () => {
        it('should return 1 for identical strings', () => {
            const result = skillsMatchingService.calculateStringSimilarity('javascript', 'javascript');
            expect(result).toBe(1);
        });
        it('should return 0 for completely different strings', () => {
            const result = skillsMatchingService.calculateStringSimilarity('javascript', 'xyz');
            expect(result).toBeLessThan(0.5);
        });
        it('should calculate similarity for similar strings', () => {
            const result = skillsMatchingService.calculateStringSimilarity('javascript', 'java');
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThan(1);
        });
    });
    describe('calculateProficiencyScore', () => {
        it('should calculate proficiency based on level and experience', () => {
            const result1 = skillsMatchingService.calculateProficiencyScore(1, 0);
            expect(result1).toBe(0);
            const result2 = skillsMatchingService.calculateProficiencyScore(4, 5);
            expect(result2).toBeGreaterThan(0.75);
            expect(result2).toBeLessThanOrEqual(1.0);
            const result3 = skillsMatchingService.calculateProficiencyScore(5, 15);
            expect(result3).toBe(1.0);
        });
    });
    describe('calculateRecencyWeight', () => {
        it('should return 1.0 for recent assessments', () => {
            const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const result = skillsMatchingService.calculateRecencyWeight(recentDate);
            expect(result).toBe(1.0);
        });
        it('should decay for older assessments', () => {
            const oldDate = new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000);
            const result = skillsMatchingService.calculateRecencyWeight(oldDate);
            expect(result).toBe(0.7);
        });
        it('should have minimum weight for very old assessments', () => {
            const veryOldDate = new Date(Date.now() - 36 * 30 * 24 * 60 * 60 * 1000);
            const result = skillsMatchingService.calculateRecencyWeight(veryOldDate);
            expect(result).toBe(0.3);
        });
    });
    describe('calculateDomainRelevance', () => {
        it('should return high relevance for technical categories', () => {
            const result = skillsMatchingService.calculateDomainRelevance('technical');
            expect(result).toBe(1.0);
        });
        it('should return moderate relevance for soft skills', () => {
            const result = skillsMatchingService.calculateDomainRelevance('soft-skill');
            expect(result).toBe(0.6);
        });
        it('should return default relevance for unknown categories', () => {
            const result = skillsMatchingService.calculateDomainRelevance('unknown');
            expect(result).toBe(0.5);
        });
    });
    describe('levenshteinDistance', () => {
        it('should return 0 for identical strings', () => {
            const result = skillsMatchingService.levenshteinDistance('hello', 'hello');
            expect(result).toBe(0);
        });
        it('should calculate edit distance correctly', () => {
            const result = skillsMatchingService.levenshteinDistance('kitten', 'sitting');
            expect(result).toBe(3);
        });
        it('should handle empty strings', () => {
            const result = skillsMatchingService.levenshteinDistance('', 'hello');
            expect(result).toBe(5);
        });
    });
    describe('calculateSynonymSimilarity', () => {
        it('should detect JavaScript synonyms', () => {
            const result = skillsMatchingService.calculateSynonymSimilarity('javascript', 'react');
            expect(result).toBe(0.8);
        });
        it('should return 0 for non-synonymous skills', () => {
            const result = skillsMatchingService.calculateSynonymSimilarity('javascript', 'cooking');
            expect(result).toBe(0);
        });
    });
});
//# sourceMappingURL=skills-matching.test.js.map
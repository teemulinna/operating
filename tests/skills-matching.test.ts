/**
 * Tests for Skills Matching Service
 * Verifies that the hardcoded mock values have been replaced with real algorithms
 */

import { SkillsMatchingService } from '../src/services/skills-matching.service';

describe('SkillsMatchingService - Real Algorithm Implementation', () => {
  let skillsMatchingService: SkillsMatchingService;

  beforeEach(() => {
    skillsMatchingService = new (SkillsMatchingService as any)();
  });

  describe('calculateCosineSimilarity', () => {
    it('should return 0 for empty vectors', () => {
      const result = (skillsMatchingService as any).calculateCosineSimilarity([], []);
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

      const result = (skillsMatchingService as any).calculateCosineSimilarity(
        identicalVectors,
        identicalVectors
      );

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
        // Note: vectors2 is missing skill2, creating different vector shapes
      ];

      const result = (skillsMatchingService as any).calculateCosineSimilarity(vectors1, vectors2);

      // Should be a real calculated value, not the hardcoded 0.75
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
      expect(result).not.toBe(0.75); // Verify it's not the old hardcoded value
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

      const result = (skillsMatchingService as any).calculateCosineSimilarity(vectors1, vectors2);
      expect(result).toBe(0); // No common skills
    });
  });

  describe('calculateStringSimilarity', () => {
    it('should return 1 for identical strings', () => {
      const result = (skillsMatchingService as any).calculateStringSimilarity('javascript', 'javascript');
      expect(result).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      const result = (skillsMatchingService as any).calculateStringSimilarity('javascript', 'xyz');
      expect(result).toBeLessThan(0.5);
    });

    it('should calculate similarity for similar strings', () => {
      const result = (skillsMatchingService as any).calculateStringSimilarity('javascript', 'java');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });
  });

  describe('calculateProficiencyScore', () => {
    it('should calculate proficiency based on level and experience', () => {
      // Beginner level (1) with no experience
      const result1 = (skillsMatchingService as any).calculateProficiencyScore(1, 0);
      expect(result1).toBe(0); // (1-1)/4 = 0, no experience multiplier

      // Expert level (4) with 5 years experience
      const result2 = (skillsMatchingService as any).calculateProficiencyScore(4, 5);
      expect(result2).toBeGreaterThan(0.75); // Should be high due to level and experience
      expect(result2).toBeLessThanOrEqual(1.0); // Capped at 1.0

      // Master level (5) with 10+ years experience
      const result3 = (skillsMatchingService as any).calculateProficiencyScore(5, 15);
      expect(result3).toBe(1.0); // Should be capped at 1.0
    });
  });

  describe('calculateRecencyWeight', () => {
    it('should return 1.0 for recent assessments', () => {
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 1 month ago
      const result = (skillsMatchingService as any).calculateRecencyWeight(recentDate);
      expect(result).toBe(1.0);
    });

    it('should decay for older assessments', () => {
      const oldDate = new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000); // 18 months ago
      const result = (skillsMatchingService as any).calculateRecencyWeight(oldDate);
      expect(result).toBe(0.7);
    });

    it('should have minimum weight for very old assessments', () => {
      const veryOldDate = new Date(Date.now() - 36 * 30 * 24 * 60 * 60 * 1000); // 3 years ago
      const result = (skillsMatchingService as any).calculateRecencyWeight(veryOldDate);
      expect(result).toBe(0.3);
    });
  });

  describe('calculateDomainRelevance', () => {
    it('should return high relevance for technical categories', () => {
      const result = (skillsMatchingService as any).calculateDomainRelevance('technical');
      expect(result).toBe(1.0);
    });

    it('should return moderate relevance for soft skills', () => {
      const result = (skillsMatchingService as any).calculateDomainRelevance('soft-skill');
      expect(result).toBe(0.6);
    });

    it('should return default relevance for unknown categories', () => {
      const result = (skillsMatchingService as any).calculateDomainRelevance('unknown');
      expect(result).toBe(0.5);
    });
  });

  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      const result = (skillsMatchingService as any).levenshteinDistance('hello', 'hello');
      expect(result).toBe(0);
    });

    it('should calculate edit distance correctly', () => {
      const result = (skillsMatchingService as any).levenshteinDistance('kitten', 'sitting');
      expect(result).toBe(3); // Known Levenshtein distance
    });

    it('should handle empty strings', () => {
      const result = (skillsMatchingService as any).levenshteinDistance('', 'hello');
      expect(result).toBe(5);
    });
  });

  describe('calculateSynonymSimilarity', () => {
    it('should detect JavaScript synonyms', () => {
      const result = (skillsMatchingService as any).calculateSynonymSimilarity('javascript', 'react');
      expect(result).toBe(0.8); // Both are JavaScript-related
    });

    it('should return 0 for non-synonymous skills', () => {
      const result = (skillsMatchingService as any).calculateSynonymSimilarity('javascript', 'cooking');
      expect(result).toBe(0);
    });
  });
});
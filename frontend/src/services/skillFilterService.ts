import type { Employee } from '../models/Employee';
import type { ProficiencyLevel } from '../models/Skill';

interface SkillFilterCriteria {
  skills: string[];
  minProficiency?: ProficiencyLevel;
  matchType: 'any' | 'all';
  minYearsExperience?: number;
  certifiedOnly?: boolean;
  departments?: string[];
  availabilityRange?: {
    startDate: Date;
    endDate: Date;
  };
}

interface FilteredEmployee extends Employee {
  matchScore: number;
  matchedSkills: Array<{
    skill_id: string;
    skill_name: string;
    proficiency_level: ProficiencyLevel;
    years_experience: number;
  }>;
}

interface SkillGap {
  skill_id: string;
  skill_name: string;
  required_count: number;
  available_count: number;
  gap_count: number;
  gap_percentage: number;
}

class SkillFilterService {
  private baseUrl = '/api';

  async filterEmployeesBySkills(criteria: SkillFilterCriteria): Promise<FilteredEmployee[]> {
    const queryParams = new URLSearchParams();
    
    if (criteria.skills.length > 0) {
      queryParams.append('skills', criteria.skills.join(','));
    }
    
    if (criteria.minProficiency) {
      queryParams.append('min_proficiency', criteria.minProficiency);
    }
    
    queryParams.append('match_type', criteria.matchType);
    
    if (criteria.minYearsExperience) {
      queryParams.append('min_years', criteria.minYearsExperience.toString());
    }
    
    if (criteria.certifiedOnly) {
      queryParams.append('certified_only', 'true');
    }
    
    if (criteria.departments && criteria.departments.length > 0) {
      queryParams.append('departments', criteria.departments.join(','));
    }

    const response = await fetch(`${this.baseUrl}/employees/filter-by-skills?${queryParams}`);
    if (!response.ok) {
      throw new Error('Failed to filter employees by skills');
    }
    return response.json();
  }

  async getSkillsStatistics(criteria?: Partial<SkillFilterCriteria>): Promise<{
    total_employees: number;
    skill_coverage: Record<string, number>;
    average_proficiency: number;
    proficiency_distribution: Record<ProficiencyLevel, number>;
  }> {
    const queryParams = new URLSearchParams();
    
    if (criteria?.skills && criteria.skills.length > 0) {
      queryParams.append('skills', criteria.skills.join(','));
    }
    
    if (criteria?.departments && criteria.departments.length > 0) {
      queryParams.append('departments', criteria.departments.join(','));
    }

    const response = await fetch(`${this.baseUrl}/skills/statistics?${queryParams}`);
    if (!response.ok) {
      throw new Error('Failed to get skills statistics');
    }
    return response.json();
  }

  async findSkillExperts(
    skillId: string, 
    minProficiency: ProficiencyLevel = 'Advanced'
  ): Promise<Array<{
    employee: Employee;
    proficiency_level: ProficiencyLevel;
    years_experience: number;
    is_certified: boolean;
    last_used_date?: Date;
  }>> {
    const response = await fetch(
      `${this.baseUrl}/skills/${skillId}/experts?min_proficiency=${minProficiency}`
    );
    if (!response.ok) {
      throw new Error('Failed to find skill experts');
    }
    return response.json();
  }

  async getAvailableEmployees(
    dateRange: { startDate: Date; endDate: Date },
    criteria?: Partial<SkillFilterCriteria>
  ): Promise<Array<{
    employee_id: string;
    skill_id: string;
    available_dates: string[];
    capacity_percentage: number;
  }>> {
    const queryParams = new URLSearchParams({
      start_date: dateRange.startDate.toISOString(),
      end_date: dateRange.endDate.toISOString()
    });
    
    if (criteria?.skills && criteria.skills.length > 0) {
      queryParams.append('skills', criteria.skills.join(','));
    }

    const response = await fetch(`${this.baseUrl}/employees/availability?${queryParams}`);
    if (!response.ok) {
      throw new Error('Failed to get employee availability');
    }
    return response.json();
  }

  async getSkillGaps(
    requiredSkills: Array<{ skill_id: string; required_count: number }>,
    departmentId?: string
  ): Promise<SkillGap[]> {
    const body = {
      required_skills: requiredSkills,
      department_id: departmentId
    };

    const response = await fetch(`${this.baseUrl}/skills/gap-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get skill gaps analysis');
    }
    return response.json();
  }

  async saveFilterPreset(
    name: string, 
    criteria: SkillFilterCriteria,
    userId: string
  ): Promise<{ id: string; name: string }> {
    const response = await fetch(`${this.baseUrl}/filter-presets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        criteria,
        user_id: userId,
        type: 'skill_filter'
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save filter preset');
    }
    return response.json();
  }

  async getFilterPresets(userId: string): Promise<Array<{
    id: string;
    name: string;
    criteria: SkillFilterCriteria;
    created_at: Date;
  }>> {
    const response = await fetch(`${this.baseUrl}/filter-presets?user_id=${userId}&type=skill_filter`);
    if (!response.ok) {
      throw new Error('Failed to get filter presets');
    }
    return response.json();
  }

  async exportFilterResults(
    employees: FilteredEmployee[],
    format: 'csv' | 'xlsx' = 'csv'
  ): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/employees/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employee_ids: employees.map(e => e.id),
        format,
        include_skills: true
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to export filter results');
    }
    return response.blob();
  }

  calculateMatchScore(
    employeeSkills: Array<{ skill_id: string; proficiency_level: ProficiencyLevel; years_experience: number }>,
    requiredSkills: string[],
    criteria: SkillFilterCriteria
  ): number {
    if (requiredSkills.length === 0) return 100;

    const proficiencyWeights = {
      'Beginner': 1,
      'Intermediate': 2,
      'Advanced': 3,
      'Expert': 4
    };

    let totalScore = 0;
    let matchedSkills = 0;

    requiredSkills.forEach(skillId => {
      const employeeSkill = employeeSkills.find(es => es.skill_id === skillId);
      
      if (employeeSkill) {
        matchedSkills++;
        const proficiencyScore = proficiencyWeights[employeeSkill.proficiency_level];
        const minProficiencyScore = criteria.minProficiency 
          ? proficiencyWeights[criteria.minProficiency] 
          : 1;
        
        // Calculate skill match score (0-100)
        const skillScore = Math.min(100, (proficiencyScore / Math.max(minProficiencyScore, 1)) * 100);
        
        // Bonus for years of experience
        const experienceBonus = Math.min(20, employeeSkill.years_experience * 2);
        
        totalScore += skillScore + experienceBonus;
      }
    });

    if (criteria.matchType === 'all' && matchedSkills < requiredSkills.length) {
      return 0; // Must have all required skills
    }

    return Math.round(totalScore / requiredSkills.length);
  }

  validateFilterCriteria(criteria: SkillFilterCriteria): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (criteria.skills.length === 0) {
      errors.push('At least one skill must be selected');
    }

    if (criteria.minYearsExperience && criteria.minYearsExperience < 0) {
      errors.push('Minimum years of experience cannot be negative');
    }

    if (criteria.availabilityRange) {
      if (criteria.availabilityRange.startDate > criteria.availabilityRange.endDate) {
        errors.push('Start date must be before end date');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const skillFilterService = new SkillFilterService();
export default skillFilterService;
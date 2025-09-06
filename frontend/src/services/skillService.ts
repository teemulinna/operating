import type { Skill, EmployeeSkill, ProficiencyLevel } from '../models/Skill';
import type { Employee } from '../models/Employee';

interface CreateEmployeeSkillData {
  employee_id: string;
  skill_id: string;
  proficiency_level: ProficiencyLevel;
  years_experience: number;
  is_certified?: boolean;
  certification_date?: Date;
  certification_body?: string;
  last_used_date?: Date;
  notes?: string;
}

interface UpdateEmployeeSkillData {
  proficiency_level?: ProficiencyLevel;
  years_experience?: number;
  is_certified?: boolean;
  certification_date?: Date;
  certification_body?: string;
  last_used_date?: Date;
  notes?: string;
}

interface SkillsAnalytics {
  skill_utilization: number;
  certification_rate: number;
  skill_gaps: number;
  improvement_suggestions: string[];
}

class SkillService {
  private baseUrl = '/api';

  async getAllSkills(): Promise<Skill[]> {
    const response = await fetch(`${this.baseUrl}/skills`);
    if (!response.ok) {
      throw new Error('Failed to fetch skills');
    }
    return response.json();
  }

  async getSkillById(id: string): Promise<Skill> {
    const response = await fetch(`${this.baseUrl}/skills/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch skill');
    }
    return response.json();
  }

  async getEmployeeSkills(employeeId: string): Promise<EmployeeSkill[]> {
    const response = await fetch(`${this.baseUrl}/employees/${employeeId}/skills`);
    if (!response.ok) {
      throw new Error('Failed to fetch employee skills');
    }
    return response.json();
  }

  async addEmployeeSkill(data: CreateEmployeeSkillData): Promise<EmployeeSkill> {
    const response = await fetch(`${this.baseUrl}/employees/${data.employee_id}/skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add employee skill');
    }
    return response.json();
  }

  async updateEmployeeSkill(skillId: string, data: UpdateEmployeeSkillData): Promise<EmployeeSkill> {
    const response = await fetch(`${this.baseUrl}/employee-skills/${skillId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update employee skill');
    }
    return response.json();
  }

  async removeEmployeeSkill(employeeId: string, skillId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/employees/${employeeId}/skills/${skillId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove employee skill');
    }
    return true;
  }

  async bulkUpdateEmployeeSkills(
    employeeId: string,
    updates: Array<{
      skill_id: string;
      proficiency_level: ProficiencyLevel;
      years_experience: number;
    }>
  ): Promise<EmployeeSkill[]> {
    const response = await fetch(`${this.baseUrl}/employees/${employeeId}/skills/bulk`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ updates }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to bulk update employee skills');
    }
    return response.json();
  }

  async getSkillsByCategory(category: string): Promise<Skill[]> {
    const response = await fetch(`${this.baseUrl}/skills/category/${category}`);
    if (!response.ok) {
      throw new Error('Failed to fetch skills by category');
    }
    return response.json();
  }

  async searchSkills(query: string): Promise<Skill[]> {
    const response = await fetch(`${this.baseUrl}/skills/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search skills');
    }
    return response.json();
  }

  async getSkillStatistics(): Promise<{
    total_skills: number;
    skills_by_category: Record<string, number>;
    most_used_skills: Array<{
      skill_id: string;
      skill_name: string;
      employee_count: number;
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/skills/statistics`);
    if (!response.ok) {
      throw new Error('Failed to fetch skill statistics');
    }
    return response.json();
  }

  async getEmployeeSkillsAnalytics(employeeId: string): Promise<SkillsAnalytics> {
    const response = await fetch(`${this.baseUrl}/employees/${employeeId}/skills/analytics`);
    if (!response.ok) {
      throw new Error('Failed to fetch employee skills analytics');
    }
    return response.json();
  }

  async getSkillExperts(skillId: string, minProficiency: ProficiencyLevel = 'Advanced'): Promise<Array<{
    employee: Employee;
    proficiency_level: ProficiencyLevel;
    years_experience: number;
    is_certified: boolean;
  }>> {
    const response = await fetch(
      `${this.baseUrl}/skills/${skillId}/experts?min_proficiency=${minProficiency}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch skill experts');
    }
    return response.json();
  }

  async getSkillDistribution(skillId?: string): Promise<Array<{
    proficiency_level: ProficiencyLevel;
    count: number;
    percentage: number;
  }>> {
    const url = skillId 
      ? `${this.baseUrl}/skills/${skillId}/distribution`
      : `${this.baseUrl}/skills/distribution`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch skill distribution');
    }
    return response.json();
  }

  async getSkillRecommendations(employeeId: string): Promise<Array<{
    skill_id: string;
    skill_name: string;
    recommendation_score: number;
    reason: string;
    learning_resources: string[];
  }>> {
    const response = await fetch(`${this.baseUrl}/employees/${employeeId}/skill-recommendations`);
    if (!response.ok) {
      throw new Error('Failed to fetch skill recommendations');
    }
    return response.json();
  }

  async exportEmployeeSkills(employeeId: string, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/employees/${employeeId}/skills/export?format=${format}`
    );
    if (!response.ok) {
      throw new Error('Failed to export employee skills');
    }
    return response.blob();
  }

  async importEmployeeSkills(employeeId: string, file: File): Promise<{
    imported_count: number;
    skipped_count: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/employees/${employeeId}/skills/import`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to import employee skills');
    }
    return response.json();
  }

  async validateSkillData(data: CreateEmployeeSkillData): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    try {
      const errors: string[] = [];

      if (!data.employee_id) {
        errors.push('Employee ID is required');
      }

      if (!data.skill_id) {
        errors.push('Skill ID is required');
      }

      if (!data.proficiency_level) {
        errors.push('Proficiency level is required');
      }

      if (!['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(data.proficiency_level)) {
        errors.push('Invalid proficiency level');
      }

      if (data.years_experience < 0) {
        errors.push('Years of experience cannot be negative');
      }

      if (data.is_certified && !data.certification_body) {
        errors.push('Certification body is required when certified');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: ['Validation failed']
      };
    }
  }
}

export const skillService = new SkillService();
export default skillService;
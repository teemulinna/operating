import type { EmployeeSkill, ProficiencyLevel } from '../models/Skill';

interface CompetencyGap {
  skill_id: string;
  skill_name: string;
  gap_level: number;
  recommendation: string;
}

interface SkillTrend {
  date: string;
  skill_id: string;
  proficiency_level: ProficiencyLevel;
}

interface LearningPathItem {
  skill_id: string;
  current_level: ProficiencyLevel;
  target_level: ProficiencyLevel;
  recommended_resources: string[];
  estimated_duration: string;
}

class CompetencyService {
  private baseUrl = '/api';

  async getEmployeeCompetencies(employeeId: string): Promise<EmployeeSkill[]> {
    const response = await fetch(`${this.baseUrl}/employees/${employeeId}/competencies`);
    if (!response.ok) {
      throw new Error('Failed to fetch employee competencies');
    }
    return response.json();
  }

  async updateCompetencyLevel(
    skillId: string, 
    proficiencyLevel: ProficiencyLevel
  ): Promise<EmployeeSkill> {
    const response = await fetch(`${this.baseUrl}/employee-skills/${skillId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ proficiency_level: proficiencyLevel }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update competency level');
    }
    return response.json();
  }

  async getCompetencyGaps(employeeId: string): Promise<CompetencyGap[]> {
    const response = await fetch(`${this.baseUrl}/employees/${employeeId}/competency-gaps`);
    if (!response.ok) {
      throw new Error('Failed to fetch competency gaps');
    }
    return response.json();
  }

  async getSkillTrends(employeeId: string, skillId?: string): Promise<SkillTrend[]> {
    const url = skillId 
      ? `${this.baseUrl}/employees/${employeeId}/skill-trends?skill_id=${skillId}`
      : `${this.baseUrl}/employees/${employeeId}/skill-trends`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch skill trends');
    }
    return response.json();
  }

  async generateLearningPath(employeeId: string): Promise<LearningPathItem[]> {
    const response = await fetch(`${this.baseUrl}/employees/${employeeId}/learning-path`);
    if (!response.ok) {
      throw new Error('Failed to generate learning path');
    }
    return response.json();
  }

  async setCompetencyGoal(
    employeeId: string,
    skillId: string,
    targetLevel: ProficiencyLevel,
    targetDate: Date
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/employees/${employeeId}/competency-goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        skill_id: skillId,
        target_level: targetLevel,
        target_date: targetDate.toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to set competency goal');
    }
  }

  async getCompetencyGoals(employeeId: string): Promise<Array<{
    skill_id: string;
    skill_name: string;
    target_level: ProficiencyLevel;
    target_date: Date;
    current_level: ProficiencyLevel;
    progress_percentage: number;
  }>> {
    const response = await fetch(`${this.baseUrl}/employees/${employeeId}/competency-goals`);
    if (!response.ok) {
      throw new Error('Failed to fetch competency goals');
    }
    return response.json();
  }

  async getTeamAverages(
    departmentId?: string
  ): Promise<Record<string, { average_proficiency: number; employee_count: number }>> {
    const url = departmentId 
      ? `${this.baseUrl}/departments/${departmentId}/competency-averages`
      : `${this.baseUrl}/competency-averages`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch team averages');
    }
    return response.json();
  }

  async exportCompetencyData(employeeId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/employees/${employeeId}/competencies/export`);
    if (!response.ok) {
      throw new Error('Failed to export competency data');
    }
    return response.blob();
  }

  getProficiencyNumericValue(level: ProficiencyLevel): number {
    const mapping = {
      'Beginner': 1,
      'Intermediate': 2,
      'Advanced': 3,
      'Expert': 4
    };
    return mapping[level] || 1;
  }

  getProficiencyFromNumeric(value: number): ProficiencyLevel {
    const mapping: Record<number, ProficiencyLevel> = {
      1: 'Beginner',
      2: 'Intermediate',
      3: 'Advanced',
      4: 'Expert'
    };
    return mapping[value] || 'Beginner';
  }

  calculateCompetencyScore(skills: EmployeeSkill[]): number {
    if (skills.length === 0) return 0;
    
    const totalScore = skills.reduce((sum, skill) => {
      return sum + this.getProficiencyNumericValue(skill.proficiency_level);
    }, 0);
    
    return Math.round((totalScore / (skills.length * 4)) * 100);
  }

  getSkillUsageStatus(lastUsedDate?: Date): 'recent' | 'stale' | 'unused' {
    if (!lastUsedDate) return 'unused';
    
    const now = new Date();
    const daysSinceUsed = Math.floor((now.getTime() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceUsed <= 30) return 'recent';
    if (daysSinceUsed <= 90) return 'stale';
    return 'unused';
  }

  generateRadarChartData(skills: EmployeeSkill[]): {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
    }>;
  } {
    const categoryData: Record<string, number[]> = {};
    const categoryLabels: string[] = [];

    // Group skills by category and calculate average proficiency
    skills.forEach(skill => {
      // This would need to be enhanced with actual skill category data
      const category = 'General'; // Placeholder
      if (!categoryData[category]) {
        categoryData[category] = [];
        categoryLabels.push(category);
      }
      categoryData[category].push(this.getProficiencyNumericValue(skill.proficiency_level));
    });

    const averages = Object.keys(categoryData).map(category => {
      const scores = categoryData[category];
      return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    return {
      labels: categoryLabels,
      datasets: [{
        label: 'Competency Level',
        data: averages,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
      }]
    };
  }
}

export const competencyService = new CompetencyService();
export default competencyService;
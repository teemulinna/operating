import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompetencyTracker } from '../../../components/skills/CompetencyTracker';
import type { ProficiencyLevel, EmployeeSkill, Skill } from '../../../models/Skill';

const mockSkillsData = [
  {
    id: 'es1',
    employee_id: '1',
    skill_id: 'skill1',
    proficiency_level: 'Advanced' as ProficiencyLevel,
    years_experience: 3,
    is_certified: true,
    certification_date: new Date('2022-01-01'),
    last_used_date: new Date(),
    skill: {
      id: 'skill1',
      name: 'JavaScript',
      category: 'Technical',
      is_technical: true
    }
  },
  {
    id: 'es2',
    employee_id: '1',
    skill_id: 'skill2',
    proficiency_level: 'Intermediate' as ProficiencyLevel,
    years_experience: 1,
    is_certified: false,
    last_used_date: new Date(),
    skill: {
      id: 'skill2',
      name: 'Communication',
      category: 'Soft Skills',
      is_technical: false
    }
  }
];

const mockCompetencyService = {
  getEmployeeCompetencies: jest.fn(),
  updateCompetencyLevel: jest.fn(),
  getCompetencyGaps: jest.fn(),
  getSkillTrends: jest.fn(),
  generateLearningPath: jest.fn()
};

jest.mock('../../../services/competencyService', () => mockCompetencyService);

describe('CompetencyTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompetencyService.getEmployeeCompetencies.mockResolvedValue(mockSkillsData);
    mockCompetencyService.getCompetencyGaps.mockResolvedValue([
      {
        skill_id: 'skill3',
        skill_name: 'React',
        gap_level: 2,
        recommendation: 'Consider taking React certification'
      }
    ]);
  });

  it('renders competency tracker with skills', async () => {
    render(<CompetencyTracker employeeId="1" />);
    
    expect(screen.getByText('Competency Tracker')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('Communication')).toBeInTheDocument();
    });
  });

  it('displays proficiency levels with visual indicators', async () => {
    render(<CompetencyTracker employeeId="1" />);
    
    await waitFor(() => {
      const advancedBadges = screen.getAllByText('Advanced');
      const intermediateBadges = screen.getAllByText('Intermediate');
      
      expect(advancedBadges.length).toBeGreaterThan(0);
      expect(intermediateBadges.length).toBeGreaterThan(0);
    });
  });

  it('allows updating proficiency levels with slider controls', async () => {
    mockCompetencyService.updateCompetencyLevel.mockResolvedValue({
      ...mockSkillsData[0],
      proficiency_level: 'Expert'
    });

    render(<CompetencyTracker employeeId="1" editable={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    // Find and interact with proficiency slider
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '4' } }); // Expert level

    await waitFor(() => {
      expect(mockCompetencyService.updateCompetencyLevel).toHaveBeenCalledWith(
        'es1',
        'Expert'
      );
    });
  });

  it('shows competency breakdown by category', async () => {
    render(<CompetencyTracker employeeId="1" showCategoryBreakdown={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Technical Skills')).toBeInTheDocument();
      expect(screen.getByText('Soft Skills')).toBeInTheDocument();
    });

    // Check category progress indicators
    expect(screen.getByText('1/1 Advanced+')).toBeInTheDocument(); // Technical
    expect(screen.getByText('0/1 Advanced+')).toBeInTheDocument(); // Soft Skills
  });

  it('displays years of experience with competency levels', async () => {
    render(<CompetencyTracker employeeId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText('3 years')).toBeInTheDocument();
      expect(screen.getByText('1 year')).toBeInTheDocument();
    });
  });

  it('highlights certification status', async () => {
    render(<CompetencyTracker employeeId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Certified')).toBeInTheDocument();
      expect(screen.getByText('Not Certified')).toBeInTheDocument();
    });
  });

  it('shows competency gaps and recommendations', async () => {
    render(<CompetencyTracker employeeId="1" showGaps={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Skill Gaps')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Consider taking React certification')).toBeInTheDocument();
    });
  });

  it('tracks skill usage recency', async () => {
    const recentDate = new Date();
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);

    const skillsWithUsage = [
      { ...mockSkillsData[0], last_used_date: recentDate },
      { ...mockSkillsData[1], last_used_date: oldDate }
    ];

    mockCompetencyService.getEmployeeCompetencies.mockResolvedValue(skillsWithUsage);

    render(<CompetencyTracker employeeId="1" trackUsage={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Recently Used')).toBeInTheDocument();
      expect(screen.getByText('Needs Practice')).toBeInTheDocument();
    });
  });

  it('generates competency radar chart', async () => {
    render(<CompetencyTracker employeeId="1" visualizations={['radar']} />);
    
    await waitFor(() => {
      expect(screen.getByText('Competency Radar')).toBeInTheDocument();
      // Check for chart container
      expect(screen.getByTestId('competency-radar-chart')).toBeInTheDocument();
    });
  });

  it('shows competency progress over time', async () => {
    const mockTrends = [
      { date: '2023-01-01', skill_id: 'skill1', proficiency_level: 'Intermediate' },
      { date: '2023-06-01', skill_id: 'skill1', proficiency_level: 'Advanced' }
    ];

    mockCompetencyService.getSkillTrends.mockResolvedValue(mockTrends);

    render(<CompetencyTracker employeeId="1" showTrends={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Progress Timeline')).toBeInTheDocument();
      expect(screen.getByText('Improved from Intermediate to Advanced')).toBeInTheDocument();
    });
  });

  it('allows setting competency goals', async () => {
    render(<CompetencyTracker employeeId="1" enableGoals={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    // Click set goal button
    const goalButtons = screen.getAllByRole('button', { name: /set goal/i });
    fireEvent.click(goalButtons[0]);

    // Set target proficiency level
    const targetSelect = screen.getByRole('combobox', { name: /target level/i });
    fireEvent.change(targetSelect, { target: { value: 'Expert' } });

    // Set target date
    const dateInput = screen.getByRole('textbox', { name: /target date/i });
    fireEvent.change(dateInput, { target: { value: '2024-12-31' } });

    // Save goal
    const saveButton = screen.getByRole('button', { name: /save goal/i });
    fireEvent.click(saveButton);

    expect(screen.getByText('Goal: Expert by Dec 31, 2024')).toBeInTheDocument();
  });

  it('filters competencies by proficiency level', async () => {
    render(<CompetencyTracker employeeId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('Communication')).toBeInTheDocument();
    });

    // Apply filter for Advanced level only
    const levelFilter = screen.getByRole('combobox', { name: /filter by level/i });
    fireEvent.change(levelFilter, { target: { value: 'Advanced' } });

    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.queryByText('Communication')).not.toBeInTheDocument();
    });
  });

  it('exports competency data', async () => {
    const mockExportData = {
      employee_id: '1',
      competencies: mockSkillsData,
      export_date: new Date().toISOString()
    };

    render(<CompetencyTracker employeeId="1" enableExport={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    // Mock file download
    const createObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    
    const link = document.createElement('a');
    link.click = jest.fn();
    jest.spyOn(document, 'createElement').mockReturnValue(link);

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalled();
    });
  });

  it('compares competencies with team averages', async () => {
    const mockTeamAverages = {
      'skill1': { average_proficiency: 2.5, employee_count: 5 },
      'skill2': { average_proficiency: 2.8, employee_count: 3 }
    };

    render(<CompetencyTracker employeeId="1" showTeamComparison={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('vs Team Average')).toBeInTheDocument();
      expect(screen.getByText('+0.5 above average')).toBeInTheDocument(); // Advanced vs 2.5 avg
    });
  });

  it('generates personalized learning recommendations', async () => {
    const mockLearningPath = [
      {
        skill_id: 'skill2',
        current_level: 'Intermediate',
        target_level: 'Advanced',
        recommended_resources: ['Online Course', 'Practice Projects'],
        estimated_duration: '3 months'
      }
    ];

    mockCompetencyService.generateLearningPath.mockResolvedValue(mockLearningPath);

    render(<CompetencyTracker employeeId="1" showLearningPath={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Learning Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Communication: Intermediate → Advanced')).toBeInTheDocument();
      expect(screen.getByText('Estimated: 3 months')).toBeInTheDocument();
    });
  });
});
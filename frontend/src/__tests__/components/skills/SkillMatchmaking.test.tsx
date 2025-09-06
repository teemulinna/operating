import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SkillMatchmaking } from '../../../components/skills/SkillMatchmaking';
import type { Employee } from '../../../models/Employee';
import type { Skill, ProficiencyLevel } from '../../../models/Skill';

interface ProjectRequirement {
  skill_id: string;
  skill_name: string;
  required_level: ProficiencyLevel;
  required_count: number;
  priority: 'high' | 'medium' | 'low';
}

interface SkillMatch {
  employee: Employee;
  match_score: number;
  matched_skills: Array<{
    skill_id: string;
    skill_name: string;
    employee_level: ProficiencyLevel;
    required_level: ProficiencyLevel;
    match_strength: number;
  }>;
  missing_skills: string[];
  availability_score: number;
}

const mockProjectRequirements: ProjectRequirement[] = [
  {
    skill_id: 'skill1',
    skill_name: 'React',
    required_level: 'Advanced' as ProficiencyLevel,
    required_count: 2,
    priority: 'high'
  },
  {
    skill_id: 'skill2',
    skill_name: 'TypeScript',
    required_level: 'Intermediate' as ProficiencyLevel,
    required_count: 2,
    priority: 'medium'
  }
];

const mockEmployees: Employee[] = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    employee_number: 'E001',
    email: 'john.doe@company.com',
    position_title: 'Senior Frontend Developer',
    department_id: 'dept1',
    hire_date: new Date('2021-01-01'),
    employment_status: 'active',
    capacity: 40,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null
  },
  {
    id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    employee_number: 'E002',
    email: 'jane.smith@company.com',
    position_title: 'Frontend Developer',
    department_id: 'dept1',
    hire_date: new Date('2022-01-01'),
    employment_status: 'active',
    capacity: 40,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null
  }
];

const mockMatchResults: SkillMatch[] = [
  {
    employee: mockEmployees[0],
    match_score: 92,
    matched_skills: [
      {
        skill_id: 'skill1',
        skill_name: 'React',
        employee_level: 'Expert' as ProficiencyLevel,
        required_level: 'Advanced' as ProficiencyLevel,
        match_strength: 100
      },
      {
        skill_id: 'skill2',
        skill_name: 'TypeScript',
        employee_level: 'Advanced' as ProficiencyLevel,
        required_level: 'Intermediate' as ProficiencyLevel,
        match_strength: 95
      }
    ],
    missing_skills: [],
    availability_score: 85
  },
  {
    employee: mockEmployees[1],
    match_score: 78,
    matched_skills: [
      {
        skill_id: 'skill1',
        skill_name: 'React',
        employee_level: 'Advanced' as ProficiencyLevel,
        required_level: 'Advanced' as ProficiencyLevel,
        match_strength: 90
      }
    ],
    missing_skills: ['TypeScript'],
    availability_score: 90
  }
];

const mockMatchmakingService = {
  findMatchingEmployees: jest.fn(),
  calculateMatchScore: jest.fn(),
  getSkillGapAnalysis: jest.fn(),
  generateTeamRecommendations: jest.fn(),
  getAvailabilityData: jest.fn()
};

jest.mock('../../../services/skillMatchmakingService', () => mockMatchmakingService);

describe('SkillMatchmaking', () => {
  const defaultProps = {
    projectRequirements: mockProjectRequirements,
    onTeamSelection: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchmakingService.findMatchingEmployees.mockResolvedValue(mockMatchResults);
    mockMatchmakingService.getSkillGapAnalysis.mockResolvedValue({
      total_gaps: 1,
      critical_gaps: 0,
      gap_details: [
        {
          skill_name: 'TypeScript',
          required_count: 2,
          available_count: 1,
          gap_count: 1
        }
      ]
    });
  });

  it('renders skill matchmaking interface', () => {
    render(<SkillMatchmaking {...defaultProps} />);
    
    expect(screen.getByText('Skill Matchmaking')).toBeInTheDocument();
    expect(screen.getByText('Project Requirements')).toBeInTheDocument();
    expect(screen.getByText('Employee Matches')).toBeInTheDocument();
  });

  it('displays project requirements', () => {
    render(<SkillMatchmaking {...defaultProps} />);
    
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Advanced (2 needed)')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Intermediate (2 needed)')).toBeInTheDocument();
    expect(screen.getByText('Medium Priority')).toBeInTheDocument();
  });

  it('shows employee match results with scores', async () => {
    render(<SkillMatchmaking {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('92% Match')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('78% Match')).toBeInTheDocument();
    });
  });

  it('displays matched skills with proficiency levels', async () => {
    render(<SkillMatchmaking {...defaultProps} />);
    
    await waitFor(() => {
      // John Doe's matches
      expect(screen.getByText('React: Expert')).toBeInTheDocument();
      expect(screen.getByText('TypeScript: Advanced')).toBeInTheDocument();
      
      // Jane Smith's matches
      expect(screen.getByText('React: Advanced')).toBeInTheDocument();
    });
  });

  it('highlights missing skills', async () => {
    render(<SkillMatchmaking {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Missing: TypeScript')).toBeInTheDocument();
    });
  });

  it('allows adjusting match criteria', async () => {
    render(<SkillMatchmaking {...defaultProps} />);
    
    // Adjust minimum match score
    const matchScoreSlider = screen.getByRole('slider', { name: /minimum match score/i });
    fireEvent.change(matchScoreSlider, { target: { value: '80' } });
    
    // Adjust availability weight
    const availabilitySlider = screen.getByRole('slider', { name: /availability weight/i });
    fireEvent.change(availabilitySlider, { target: { value: '30' } });
    
    await waitFor(() => {
      expect(mockMatchmakingService.findMatchingEmployees).toHaveBeenCalledWith(
        mockProjectRequirements,
        expect.objectContaining({
          minMatchScore: 80,
          availabilityWeight: 0.3
        })
      );
    });
  });

  it('supports team composition recommendations', async () => {
    const mockTeamRecommendations = [
      {
        team_id: 'team1',
        members: [mockEmployees[0], mockEmployees[1]],
        total_coverage: 95,
        skill_distribution: {
          'React': 2,
          'TypeScript': 1
        },
        estimated_capacity: 70
      }
    ];

    mockMatchmakingService.generateTeamRecommendations.mockResolvedValue(mockTeamRecommendations);

    render(<SkillMatchmaking {...defaultProps} enableTeamRecommendations={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Team Recommendations')).toBeInTheDocument();
      expect(screen.getByText('95% Coverage')).toBeInTheDocument();
      expect(screen.getByText('70% Capacity')).toBeInTheDocument();
    });
  });

  it('allows selecting employees for the team', async () => {
    const onTeamSelection = jest.fn();
    render(<SkillMatchmaking {...defaultProps} onTeamSelection={onTeamSelection} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select John Doe
    const johnCheckbox = screen.getByRole('checkbox', { name: /select john doe/i });
    fireEvent.click(johnCheckbox);
    
    // Select Jane Smith
    const janeCheckbox = screen.getByRole('checkbox', { name: /select jane smith/i });
    fireEvent.click(janeCheckbox);
    
    // Create team
    const createTeamButton = screen.getByRole('button', { name: /create team/i });
    fireEvent.click(createTeamButton);
    
    expect(onTeamSelection).toHaveBeenCalledWith([mockEmployees[0], mockEmployees[1]]);
  });

  it('shows availability calendar integration', async () => {
    const mockAvailability = {
      '1': { available_dates: 15, total_dates: 20, percentage: 75 },
      '2': { available_dates: 18, total_dates: 20, percentage: 90 }
    };

    mockMatchmakingService.getAvailabilityData.mockResolvedValue(mockAvailability);

    render(<SkillMatchmaking {...defaultProps} showAvailability={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('75% Available')).toBeInTheDocument();
      expect(screen.getByText('90% Available')).toBeInTheDocument();
    });
  });

  it('displays skill gap analysis', async () => {
    render(<SkillMatchmaking {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Skill Gap Analysis')).toBeInTheDocument();
      expect(screen.getByText('1 Total Gaps')).toBeInTheDocument();
      expect(screen.getByText('TypeScript: Need 1 more')).toBeInTheDocument();
    });
  });

  it('supports filtering matches by department', async () => {
    render(<SkillMatchmaking {...defaultProps} />);
    
    const departmentFilter = screen.getByRole('combobox', { name: /department/i });
    fireEvent.change(departmentFilter, { target: { value: 'dept1' } });
    
    await waitFor(() => {
      expect(mockMatchmakingService.findMatchingEmployees).toHaveBeenCalledWith(
        mockProjectRequirements,
        expect.objectContaining({
          departments: ['dept1']
        })
      );
    });
  });

  it('allows excluding employees from matches', async () => {
    render(<SkillMatchmaking {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Exclude John Doe
    const excludeButton = screen.getAllByRole('button', { name: /exclude/i })[0];
    fireEvent.click(excludeButton);
    
    await waitFor(() => {
      expect(mockMatchmakingService.findMatchingEmployees).toHaveBeenCalledWith(
        mockProjectRequirements,
        expect.objectContaining({
          excludeEmployees: ['1']
        })
      );
    });
  });

  it('shows match confidence indicators', async () => {
    render(<SkillMatchmaking {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('High Confidence')).toBeInTheDocument(); // John Doe 92%
      expect(screen.getByText('Medium Confidence')).toBeInTheDocument(); // Jane Smith 78%
    });
  });

  it('supports bulk team actions', async () => {
    render(<SkillMatchmaking {...defaultProps} enableBulkActions={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select multiple employees
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // John Doe
    fireEvent.click(checkboxes[1]); // Jane Smith
    
    // Bulk actions should appear
    expect(screen.getByRole('button', { name: /create team/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export selection/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compare skills/i })).toBeInTheDocument();
  });

  it('provides skill substitution suggestions', async () => {
    const mockSubstitutions = [
      {
        original_skill: 'React',
        substitute_skills: ['Vue.js', 'Angular'],
        confidence: 85
      }
    ];

    render(<SkillMatchmaking {...defaultProps} skillSubstitutions={mockSubstitutions} />);
    
    await waitFor(() => {
      expect(screen.getByText('Skill Alternatives')).toBeInTheDocument();
      expect(screen.getByText('React → Vue.js, Angular (85% match)')).toBeInTheDocument();
    });
  });

  it('shows project timeline impact', async () => {
    render(<SkillMatchmaking {...defaultProps} showTimelineImpact={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Timeline Impact')).toBeInTheDocument();
      expect(screen.getByText('Ready to Start')).toBeInTheDocument(); // John Doe
      expect(screen.getByText('Training Required')).toBeInTheDocument(); // Jane Smith
    });
  });

  it('exports match results', async () => {
    render(<SkillMatchmaking {...defaultProps} enableExport={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Export matches
    const exportButton = screen.getByRole('button', { name: /export matches/i });
    fireEvent.click(exportButton);
    
    // Mock file download
    const createObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    
    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalled();
    });
  });

  it('handles no matches scenario', async () => {
    mockMatchmakingService.findMatchingEmployees.mockResolvedValue([]);
    
    render(<SkillMatchmaking {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No matching employees found')).toBeInTheDocument();
      expect(screen.getByText('Consider adjusting requirements or expanding search criteria')).toBeInTheDocument();
    });
  });
});
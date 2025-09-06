import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SkillsFilter } from '../../../components/skills/SkillsFilter';
import type { Employee } from '../../../models/Employee';
import type { Skill, ProficiencyLevel } from '../../../models/Skill';

const mockEmployees: Employee[] = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    employee_number: 'E001',
    email: 'john.doe@company.com',
    position_title: 'Frontend Developer',
    department_id: 'dept1',
    hire_date: new Date('2023-01-01'),
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
    position_title: 'Backend Developer',
    department_id: 'dept1',
    hire_date: new Date('2023-02-01'),
    employment_status: 'active',
    capacity: 40,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null
  }
];

const mockSkills: Skill[] = [
  {
    id: 'skill1',
    name: 'React',
    description: 'Frontend framework',
    category: 'Technical',
    is_technical: true,
    proficiency_levels: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null
  },
  {
    id: 'skill2',
    name: 'Node.js',
    description: 'Backend runtime',
    category: 'Technical',
    is_technical: true,
    proficiency_levels: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null
  }
];

const mockFilterService = {
  filterEmployeesBySkills: jest.fn(),
  getSkillsStatistics: jest.fn(),
  findSkillExperts: jest.fn(),
  getAvailableEmployees: jest.fn()
};

jest.mock('../../../services/skillFilterService', () => mockFilterService);

describe('SkillsFilter', () => {
  const defaultProps = {
    employees: mockEmployees,
    skills: mockSkills,
    onFilterChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFilterService.filterEmployeesBySkills.mockResolvedValue(mockEmployees);
    mockFilterService.getSkillsStatistics.mockResolvedValue({
      total_employees: 2,
      skill_coverage: { 'skill1': 1, 'skill2': 1 },
      average_proficiency: 3.0
    });
  });

  it('renders skills filter interface', () => {
    render(<SkillsFilter {...defaultProps} />);
    
    expect(screen.getByText('Skills Filter')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /select skills/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /minimum proficiency/i })).toBeInTheDocument();
  });

  it('allows selecting multiple skills', async () => {
    render(<SkillsFilter {...defaultProps} />);
    
    const skillsSelect = screen.getByRole('combobox', { name: /select skills/i });
    
    // Select React skill
    fireEvent.click(skillsSelect);
    const reactOption = screen.getByRole('option', { name: 'React' });
    fireEvent.click(reactOption);
    
    // Select Node.js skill
    const nodejsOption = screen.getByRole('option', { name: 'Node.js' });
    fireEvent.click(nodejsOption);
    
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('filters by minimum proficiency level', async () => {
    const onFilterChange = jest.fn();
    render(<SkillsFilter {...defaultProps} onFilterChange={onFilterChange} />);
    
    // Set minimum proficiency to Advanced
    const proficiencySelect = screen.getByRole('combobox', { name: /minimum proficiency/i });
    fireEvent.change(proficiencySelect, { target: { value: 'Advanced' } });
    
    // Apply filter
    const applyButton = screen.getByRole('button', { name: /apply filter/i });
    fireEvent.click(applyButton);
    
    await waitFor(() => {
      expect(mockFilterService.filterEmployeesBySkills).toHaveBeenCalledWith({
        skills: [],
        minProficiency: 'Advanced',
        matchType: 'any'
      });
    });
  });

  it('supports "all skills" vs "any skill" matching', async () => {
    render(<SkillsFilter {...defaultProps} />);
    
    // Select multiple skills
    const skillsSelect = screen.getByRole('combobox', { name: /select skills/i });
    fireEvent.click(skillsSelect);
    fireEvent.click(screen.getByRole('option', { name: 'React' }));
    fireEvent.click(screen.getByRole('option', { name: 'Node.js' }));
    
    // Change to "all skills" matching
    const matchTypeSelect = screen.getByRole('combobox', { name: /match type/i });
    fireEvent.change(matchTypeSelect, { target: { value: 'all' } });
    
    expect(screen.getByDisplayValue('all')).toBeInTheDocument();
  });

  it('filters by years of experience', async () => {
    render(<SkillsFilter {...defaultProps} />);
    
    // Set minimum years of experience
    const experienceInput = screen.getByRole('spinbutton', { name: /minimum years/i });
    fireEvent.change(experienceInput, { target: { value: '3' } });
    
    // Apply filter
    const applyButton = screen.getByRole('button', { name: /apply filter/i });
    fireEvent.click(applyButton);
    
    await waitFor(() => {
      expect(mockFilterService.filterEmployeesBySkills).toHaveBeenCalledWith(
        expect.objectContaining({
          minYearsExperience: 3
        })
      );
    });
  });

  it('filters by certification status', async () => {
    render(<SkillsFilter {...defaultProps} />);
    
    // Enable certification filter
    const certificationCheckbox = screen.getByRole('checkbox', { name: /certified only/i });
    fireEvent.click(certificationCheckbox);
    
    expect(certificationCheckbox).toBeChecked();
    
    // Apply filter
    const applyButton = screen.getByRole('button', { name: /apply filter/i });
    fireEvent.click(applyButton);
    
    await waitFor(() => {
      expect(mockFilterService.filterEmployeesBySkills).toHaveBeenCalledWith(
        expect.objectContaining({
          certifiedOnly: true
        })
      );
    });
  });

  it('filters by department', async () => {
    render(<SkillsFilter {...defaultProps} />);
    
    // Select department filter
    const departmentSelect = screen.getByRole('combobox', { name: /department/i });
    fireEvent.change(departmentSelect, { target: { value: 'dept1' } });
    
    // Apply filter
    const applyButton = screen.getByRole('button', { name: /apply filter/i });
    fireEvent.click(applyButton);
    
    await waitFor(() => {
      expect(mockFilterService.filterEmployeesBySkills).toHaveBeenCalledWith(
        expect.objectContaining({
          departments: ['dept1']
        })
      );
    });
  });

  it('shows real-time filter results count', async () => {
    mockFilterService.filterEmployeesBySkills.mockResolvedValue([mockEmployees[0]]);
    
    render(<SkillsFilter {...defaultProps} />);
    
    // Apply a filter
    const skillsSelect = screen.getByRole('combobox', { name: /select skills/i });
    fireEvent.click(skillsSelect);
    fireEvent.click(screen.getByRole('option', { name: 'React' }));
    
    await waitFor(() => {
      expect(screen.getByText('1 employees found')).toBeInTheDocument();
    });
  });

  it('provides skill expertise levels filter', async () => {
    render(<SkillsFilter {...defaultProps} showExpertiseLevel={true} />);
    
    expect(screen.getByText('Expertise Level')).toBeInTheDocument();
    
    // Check expertise level options
    const expertiseSlider = screen.getByRole('slider', { name: /expertise level/i });
    fireEvent.change(expertiseSlider, { target: { value: '3' } });
    
    expect(expertiseSlider).toHaveValue('3');
  });

  it('supports saving filter presets', async () => {
    render(<SkillsFilter {...defaultProps} enablePresets={true} />);
    
    // Configure a filter
    const skillsSelect = screen.getByRole('combobox', { name: /select skills/i });
    fireEvent.click(skillsSelect);
    fireEvent.click(screen.getByRole('option', { name: 'React' }));
    
    const proficiencySelect = screen.getByRole('combobox', { name: /minimum proficiency/i });
    fireEvent.change(proficiencySelect, { target: { value: 'Advanced' } });
    
    // Save as preset
    const savePresetButton = screen.getByRole('button', { name: /save preset/i });
    fireEvent.click(savePresetButton);
    
    const presetNameInput = screen.getByRole('textbox', { name: /preset name/i });
    fireEvent.change(presetNameInput, { target: { value: 'React Experts' } });
    
    const confirmSaveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(confirmSaveButton);
    
    expect(screen.getByText('Preset saved: React Experts')).toBeInTheDocument();
  });

  it('allows loading saved filter presets', async () => {
    const mockPresets = [
      {
        id: 'preset1',
        name: 'React Experts',
        filters: {
          skills: ['skill1'],
          minProficiency: 'Advanced',
          matchType: 'any'
        }
      }
    ];

    render(<SkillsFilter {...defaultProps} savedPresets={mockPresets} />);
    
    // Load preset
    const presetsSelect = screen.getByRole('combobox', { name: /load preset/i });
    fireEvent.change(presetsSelect, { target: { value: 'preset1' } });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Advanced')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
    });
  });

  it('provides advanced search with skill combinations', async () => {
    render(<SkillsFilter {...defaultProps} advancedMode={true} />);
    
    expect(screen.getByText('Advanced Filter')).toBeInTheDocument();
    
    // Add skill group
    const addGroupButton = screen.getByRole('button', { name: /add skill group/i });
    fireEvent.click(addGroupButton);
    
    // Configure skill group with AND/OR logic
    const logicSelect = screen.getByRole('combobox', { name: /logic/i });
    fireEvent.change(logicSelect, { target: { value: 'AND' } });
    
    expect(screen.getByDisplayValue('AND')).toBeInTheDocument();
  });

  it('shows skill availability calendar', async () => {
    const mockAvailability = [
      {
        employee_id: '1',
        skill_id: 'skill1',
        available_dates: ['2024-01-15', '2024-01-16'],
        capacity_percentage: 80
      }
    ];

    mockFilterService.getAvailableEmployees.mockResolvedValue(mockAvailability);

    render(<SkillsFilter {...defaultProps} showAvailability={true} />);
    
    // Select date range
    const startDateInput = screen.getByRole('textbox', { name: /start date/i });
    fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });
    
    const endDateInput = screen.getByRole('textbox', { name: /end date/i });
    fireEvent.change(endDateInput, { target: { value: '2024-01-20' } });
    
    await waitFor(() => {
      expect(screen.getByText('Available: 80%')).toBeInTheDocument();
    });
  });

  it('exports filtered employee list', async () => {
    render(<SkillsFilter {...defaultProps} enableExport={true} />);
    
    // Apply filter
    const skillsSelect = screen.getByRole('combobox', { name: /select skills/i });
    fireEvent.click(skillsSelect);
    fireEvent.click(screen.getByRole('option', { name: 'React' }));
    
    // Export results
    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);
    
    // Mock file download
    const createObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    
    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalled();
    });
  });

  it('clears all filters', async () => {
    const onFilterChange = jest.fn();
    render(<SkillsFilter {...defaultProps} onFilterChange={onFilterChange} />);
    
    // Apply some filters
    const skillsSelect = screen.getByRole('combobox', { name: /select skills/i });
    fireEvent.click(skillsSelect);
    fireEvent.click(screen.getByRole('option', { name: 'React' }));
    
    const proficiencySelect = screen.getByRole('combobox', { name: /minimum proficiency/i });
    fireEvent.change(proficiencySelect, { target: { value: 'Advanced' } });
    
    // Clear all filters
    const clearButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearButton);
    
    expect(onFilterChange).toHaveBeenCalledWith({
      skills: [],
      minProficiency: 'Beginner',
      matchType: 'any',
      minYearsExperience: 0,
      certifiedOnly: false,
      departments: []
    });
  });

  it('provides skill gap analysis', async () => {
    const mockSkillGaps = [
      {
        skill_id: 'skill3',
        skill_name: 'TypeScript',
        required_count: 5,
        available_count: 2,
        gap_percentage: 60
      }
    ];

    render(<SkillsFilter {...defaultProps} showGapAnalysis={true} skillGaps={mockSkillGaps} />);
    
    expect(screen.getByText('Skill Gap Analysis')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('60% shortage')).toBeInTheDocument();
    expect(screen.getByText('Need 3 more')).toBeInTheDocument();
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SkillsMatrix } from '../../../components/skills/SkillsMatrix';
import type { Employee } from '../../../models/Employee';
import type { Skill, ProficiencyLevel } from '../../../models/Skill';

// Mock API service
const mockSkillService = {
  getAllSkills: jest.fn(),
  getEmployeeSkills: jest.fn(),
  updateEmployeeSkill: jest.fn(),
  removeEmployeeSkill: jest.fn(),
  addEmployeeSkill: jest.fn(),
};

jest.mock('../../../services/skillService', () => mockSkillService);

const mockEmployee: Employee = {
  id: '1',
  first_name: 'John',
  last_name: 'Doe',
  employee_number: 'E001',
  email: 'john.doe@company.com',
  position_title: 'Software Engineer',
  department_id: 'dept1',
  hire_date: new Date('2023-01-01'),
  employment_status: 'active',
  capacity: 40,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null
};

const mockSkills: Skill[] = [
  {
    id: 'skill1',
    name: 'JavaScript',
    description: 'Programming language',
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
    name: 'React',
    description: 'Frontend framework',
    category: 'Technical',
    is_technical: true,
    proficiency_levels: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null
  }
];

const mockEmployeeSkills = [
  {
    id: 'es1',
    employee_id: '1',
    skill_id: 'skill1',
    proficiency_level: 'Advanced' as ProficiencyLevel,
    years_experience: 3,
    is_certified: true,
    certification_date: new Date('2022-01-01'),
    certification_body: 'JavaScript Institute',
    last_used_date: new Date(),
    notes: 'Strong JavaScript skills',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null
  }
];

describe('SkillsMatrix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSkillService.getAllSkills.mockResolvedValue(mockSkills);
    mockSkillService.getEmployeeSkills.mockResolvedValue(mockEmployeeSkills);
  });

  it('renders skills matrix for employee', async () => {
    render(<SkillsMatrix employee={mockEmployee} />);
    
    expect(screen.getByText('Skills Matrix - John Doe')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
    });
  });

  it('displays current proficiency levels', async () => {
    render(<SkillsMatrix employee={mockEmployee} />);
    
    await waitFor(() => {
      expect(screen.getByText('Advanced')).toBeInTheDocument();
      expect(screen.getByText('3 years')).toBeInTheDocument();
    });
  });

  it('allows editing proficiency levels', async () => {
    mockSkillService.updateEmployeeSkill.mockResolvedValue({
      ...mockEmployeeSkills[0],
      proficiency_level: 'Expert'
    });

    render(<SkillsMatrix employee={mockEmployee} />);
    
    await waitFor(() => {
      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    // Click edit button
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    // Change proficiency level
    const expertOption = screen.getByRole('option', { name: 'Expert' });
    fireEvent.click(expertOption);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSkillService.updateEmployeeSkill).toHaveBeenCalledWith(
        'es1',
        expect.objectContaining({ proficiency_level: 'Expert' })
      );
    });
  });

  it('allows adding new skills', async () => {
    mockSkillService.addEmployeeSkill.mockResolvedValue({
      id: 'es2',
      employee_id: '1',
      skill_id: 'skill2',
      proficiency_level: 'Intermediate' as ProficiencyLevel,
      years_experience: 1,
      is_certified: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null
    });

    render(<SkillsMatrix employee={mockEmployee} />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    // Click add skill button
    const addButton = screen.getByRole('button', { name: /add skill/i });
    fireEvent.click(addButton);

    // Select React skill
    const skillSelect = screen.getByRole('combobox', { name: /skill/i });
    fireEvent.change(skillSelect, { target: { value: 'skill2' } });

    // Set proficiency level
    const proficiencySelect = screen.getByRole('combobox', { name: /proficiency/i });
    fireEvent.change(proficiencySelect, { target: { value: 'Intermediate' } });

    // Set years of experience
    const experienceInput = screen.getByRole('spinbutton', { name: /years of experience/i });
    fireEvent.change(experienceInput, { target: { value: '1' } });

    // Save new skill
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSkillService.addEmployeeSkill).toHaveBeenCalledWith({
        employee_id: '1',
        skill_id: 'skill2',
        proficiency_level: 'Intermediate',
        years_experience: 1,
        is_certified: false
      });
    });
  });

  it('allows removing skills', async () => {
    mockSkillService.removeEmployeeSkill.mockResolvedValue(true);

    render(<SkillsMatrix employee={mockEmployee} />);
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    // Click remove button
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    // Confirm removal
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockSkillService.removeEmployeeSkill).toHaveBeenCalledWith('1', 'skill1');
    });
  });

  it('filters skills by category', async () => {
    render(<SkillsMatrix employee={mockEmployee} />);
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    // Open category filter
    const categoryFilter = screen.getByRole('combobox', { name: /category/i });
    fireEvent.change(categoryFilter, { target: { value: 'Technical' } });

    // Verify only technical skills are shown
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('displays certification status', async () => {
    render(<SkillsMatrix employee={mockEmployee} />);
    
    await waitFor(() => {
      expect(screen.getByText('Certified')).toBeInTheDocument();
      expect(screen.getByText('JavaScript Institute')).toBeInTheDocument();
    });
  });

  it('handles bulk skill updates', async () => {
    const bulkUpdates = [
      { skill_id: 'skill1', proficiency_level: 'Expert' as ProficiencyLevel, years_experience: 4 },
      { skill_id: 'skill2', proficiency_level: 'Advanced' as ProficiencyLevel, years_experience: 2 }
    ];

    mockSkillService.updateEmployeeSkill.mockResolvedValue({});

    render(<SkillsMatrix employee={mockEmployee} onBulkUpdate={(updates) => {
      updates.forEach(update => mockSkillService.updateEmployeeSkill('', update));
    }} />);
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    // Enable bulk edit mode
    const bulkEditButton = screen.getByRole('button', { name: /bulk edit/i });
    fireEvent.click(bulkEditButton);

    // Update multiple skills
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Select JavaScript
    fireEvent.click(checkboxes[1]); // Select React

    // Apply bulk update
    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockSkillService.updateEmployeeSkill).toHaveBeenCalledTimes(2);
    });
  });

  it('validates required fields when adding skills', async () => {
    render(<SkillsMatrix employee={mockEmployee} />);
    
    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    // Click add skill button
    const addButton = screen.getByRole('button', { name: /add skill/i });
    fireEvent.click(addButton);

    // Try to save without selecting skill
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    expect(screen.getByText('Skill is required')).toBeInTheDocument();
    expect(screen.getByText('Proficiency level is required')).toBeInTheDocument();
  });

  it('shows skill usage analytics', async () => {
    const mockAnalytics = {
      skill_utilization: 85,
      certification_rate: 60,
      skill_gaps: 2,
      improvement_suggestions: ['Consider AWS certification', 'Enhance React skills']
    };

    render(<SkillsMatrix employee={mockEmployee} showAnalytics={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Skills Analytics')).toBeInTheDocument();
      expect(screen.getByText('85% Skill Utilization')).toBeInTheDocument();
      expect(screen.getByText('60% Certification Rate')).toBeInTheDocument();
      expect(screen.getByText('2 Skill Gaps')).toBeInTheDocument();
    });
  });
});
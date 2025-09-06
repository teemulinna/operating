import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProjectCard } from '@/components/projects/ProjectCard';
import type { Project } from '@/types/project';

// Mock project data
const mockProject: Project = {
  id: '1',
  name: 'Test Project',
  description: 'This is a test project description',
  clientName: 'Test Client',
  status: 'active',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  budget: 50000,
  hourlyRate: 100,
  totalHours: 500,
  billedHours: 250,
  isActive: true,
  teamMembers: ['emp1', 'emp2'],
  teamMembersCount: 2,
  tags: ['web', 'react'],
  notes: 'Test notes',
  budgetUtilization: 50,
  timeProgress: 50,
  daysRemaining: 300,
  isOverBudget: false,
  isOverdue: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockOverdueProject: Project = {
  ...mockProject,
  id: '2',
  name: 'Overdue Project',
  status: 'active',
  endDate: '2023-12-31',
  isOverdue: true,
  daysRemaining: -30,
};

const mockOverBudgetProject: Project = {
  ...mockProject,
  id: '3',
  name: 'Over Budget Project',
  budgetUtilization: 120,
  isOverBudget: true,
};

describe('ProjectCard', () => {
  const mockOnClick = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders project information correctly', () => {
    render(
      <ProjectCard
        project={mockProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test Client')).toBeInTheDocument();
    expect(screen.getByText('This is a test project description')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });

  it('displays project status badge with correct styling', () => {
    render(
      <ProjectCard
        project={mockProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    const statusBadge = screen.getByText('active');
    expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('shows progress bars for budget and time', () => {
    render(
      <ProjectCard
        project={mockProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Check for progress indicators
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays team member count', () => {
    render(
      <ProjectCard
        project={mockProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('2 members')).toBeInTheDocument();
  });

  it('shows project tags', () => {
    render(
      <ProjectCard
        project={mockProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('web')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    render(
      <ProjectCard
        project={mockProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    fireEvent.click(screen.getByTestId('project-card'));
    expect(mockOnClick).toHaveBeenCalledWith(mockProject);
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <ProjectCard
        project={mockProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    const editButton = screen.getByLabelText('Edit project');
    fireEvent.click(editButton);
    expect(mockOnEdit).toHaveBeenCalledWith(mockProject);
    expect(mockOnClick).not.toHaveBeenCalled(); // Should not trigger card click
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <ProjectCard
        project={mockProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    const deleteButton = screen.getByLabelText('Delete project');
    fireEvent.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith(mockProject);
    expect(mockOnClick).not.toHaveBeenCalled(); // Should not trigger card click
  });

  it('highlights overdue projects', () => {
    render(
      <ProjectCard
        project={mockOverdueProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    const card = screen.getByTestId('project-card');
    expect(card).toHaveClass('border-red-200');
    expect(screen.getByText('30 days overdue')).toBeInTheDocument();
  });

  it('highlights over-budget projects', () => {
    render(
      <ProjectCard
        project={mockOverBudgetProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    const card = screen.getByTestId('project-card');
    expect(card).toHaveClass('border-orange-200');
    expect(screen.getByText('Over budget')).toBeInTheDocument();
  });

  it('shows days remaining for active projects', () => {
    render(
      <ProjectCard
        project={mockProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('300 days remaining')).toBeInTheDocument();
  });

  it('renders compact view correctly', () => {
    render(
      <ProjectCard
        project={mockProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
        compact={true}
      />
    );

    // In compact view, description should not be shown
    expect(screen.queryByText('This is a test project description')).not.toBeInTheDocument();
    // But title should still be there
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('handles projects without optional fields gracefully', () => {
    const minimalProject: Project = {
      id: '4',
      name: 'Minimal Project',
      clientName: 'Client',
      status: 'planning',
      startDate: '2024-01-01',
      isActive: true,
      teamMembersCount: 0,
    };

    render(
      <ProjectCard
        project={minimalProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Minimal Project')).toBeInTheDocument();
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByText('0 members')).toBeInTheDocument();
  });

  it('shows correct status colors for different statuses', () => {
    const statuses = ['planning', 'active', 'completed', 'on-hold', 'cancelled'] as const;
    const expectedClasses = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-gray-100 text-gray-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800'
    ];

    statuses.forEach((status, index) => {
      const { unmount } = render(
        <ProjectCard
          project={{ ...mockProject, status }}
          onClick={mockOnClick}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onStatusChange={mockOnStatusChange}
        />
      );

      const statusBadge = screen.getByText(status);
      const expectedClass = expectedClasses[index];
      expectedClass.split(' ').forEach(cls => {
        expect(statusBadge).toHaveClass(cls);
      });
      
      unmount();
    });
  });

  it('prevents event bubbling when action buttons are clicked', () => {
    render(
      <ProjectCard
        project={mockProject}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    const editButton = screen.getByLabelText('Edit project');
    const deleteButton = screen.getByLabelText('Delete project');

    fireEvent.click(editButton);
    fireEvent.click(deleteButton);

    expect(mockOnClick).not.toHaveBeenCalled();
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });
});
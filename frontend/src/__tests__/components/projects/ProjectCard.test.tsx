import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ProjectCard } from '@/components/projects/ProjectCard';
import type { Project } from '@/types/project';

// Mock data
const mockProject: Project = {
  id: 'proj-1',
  name: 'E-commerce Platform',
  description: 'Modern e-commerce platform with React and Node.js',
  clientName: 'TechCorp Inc.',
  status: 'active',
  startDate: '2024-01-15T00:00:00.000Z',
  endDate: '2024-06-15T00:00:00.000Z',
  budget: 50000,
  hourlyRate: 150,
  totalHours: 400,
  billedHours: 280,
  isActive: true,
  teamMembers: ['emp-1', 'emp-2', 'emp-3'],
  teamMembersCount: 3,
  tags: ['react', 'node', 'ecommerce'],
  budgetUtilization: 65,
  timeProgress: 70,
  daysRemaining: 45,
  isOverBudget: false,
  isOverdue: false,
  createdAt: '2024-01-10T00:00:00.000Z',
  updatedAt: '2024-01-20T00:00:00.000Z',
};

const mockOverdueProject: Project = {
  ...mockProject,
  id: 'proj-2',
  name: 'Legacy Migration',
  status: 'active',
  endDate: '2023-12-31T00:00:00.000Z',
  daysRemaining: -15,
  isOverdue: true,
  isOverBudget: true,
  budgetUtilization: 120,
};

const mockCompactProject: Project = {
  ...mockProject,
  id: 'proj-3',
  name: 'Quick Task',
  description: undefined,
  tags: ['react', 'quick', 'task', 'extra', 'many', 'tags'],
};

describe('ProjectCard', () => {
  const mockOnClick = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render project card with basic information', () => {
      render(
        <ProjectCard
          project={mockProject}
          onClick={mockOnClick}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByTestId('project-card')).toBeInTheDocument();
      expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
      expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument();
      expect(screen.getByText('Modern e-commerce platform with React and Node.js')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should render project status with correct styling', () => {
      render(<ProjectCard project={mockProject} />);

      const statusBadge = screen.getByText('active');
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should display tags correctly', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('node')).toBeInTheDocument();
      expect(screen.getByText('ecommerce')).toBeInTheDocument();
    });

    it('should show budget information', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument(); // budget utilization
    });

    it('should display team information', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('3 members')).toBeInTheDocument();
    });

    it('should show date information', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jun 15, 2024')).toBeInTheDocument();
    });

    it('should display days remaining', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('45 days remaining')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode when compact prop is true', () => {
      render(
        <ProjectCard
          project={mockProject}
          compact={true}
        />
      );

      // Description should not be shown in compact mode
      expect(screen.queryByText('Modern e-commerce platform with React and Node.js')).not.toBeInTheDocument();
      
      // Budget, team, and days remaining should be shown in a single row
      expect(screen.getByText('3 members')).toBeInTheDocument();
      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('45 days remaining')).toBeInTheDocument();
    });

    it('should limit tags displayed in compact mode', () => {
      render(
        <ProjectCard
          project={mockCompactProject}
          compact={true}
        />
      );

      // Should show only first 2 tags + "more" indicator
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('quick')).toBeInTheDocument();
      expect(screen.getByText('+4 more')).toBeInTheDocument();
      
      // Should not show all tags
      expect(screen.queryByText('many')).not.toBeInTheDocument();
      expect(screen.queryByText('tags')).not.toBeInTheDocument();
    });
  });

  describe('Project States', () => {
    it('should show overdue indicator for overdue projects', () => {
      render(<ProjectCard project={mockOverdueProject} />);

      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('15 days overdue')).toBeInTheDocument();
      
      const overdueIndicator = screen.getByText('Overdue');
      expect(overdueIndicator).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('should show over budget indicator for over budget projects', () => {
      render(<ProjectCard project={mockOverdueProject} />);

      expect(screen.getByText('Over budget')).toBeInTheDocument();
      
      const overBudgetIndicator = screen.getByText('Over budget');
      expect(overBudgetIndicator).toHaveClass('bg-orange-100', 'text-orange-800');
    });

    it('should apply correct border styling for project states', () => {
      const { rerender } = render(<ProjectCard project={mockProject} />);
      
      let card = screen.getByTestId('project-card');
      expect(card).toHaveClass('border-gray-200');

      // Test overdue project
      rerender(<ProjectCard project={mockOverdueProject} />);
      card = screen.getByTestId('project-card');
      expect(card).toHaveClass('border-red-200');

      // Test over budget project (not overdue)
      const overBudgetOnly = { ...mockProject, isOverBudget: true, isOverdue: false };
      rerender(<ProjectCard project={overBudgetOnly} />);
      card = screen.getByTestId('project-card');
      expect(card).toHaveClass('border-orange-200');
    });

    it('should not show days remaining for completed projects', () => {
      const completedProject = { ...mockProject, status: 'completed' as const };
      render(<ProjectCard project={completedProject} />);

      expect(screen.queryByText('45 days remaining')).not.toBeInTheDocument();
    });

    it('should handle projects without end date', () => {
      const noEndDateProject = { ...mockProject, endDate: undefined, daysRemaining: undefined };
      render(<ProjectCard project={noEndDateProject} />);

      expect(screen.queryByText('days remaining')).not.toBeInTheDocument();
      expect(screen.queryByText('days overdue')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when card is clicked', async () => {
      const user = userEvent.setup();
      render(<ProjectCard project={mockProject} onClick={mockOnClick} />);

      const card = screen.getByTestId('project-card');
      await user.click(card);

      expect(mockOnClick).toHaveBeenCalledWith(mockProject);
    });

    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProjectCard project={mockProject} onEdit={mockOnEdit} />);

      const editButton = screen.getByLabelText('Edit project');
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockProject);
    });

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProjectCard project={mockProject} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByLabelText('Delete project');
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockProject);
    });

    it('should prevent card click when action buttons are clicked', async () => {
      const user = userEvent.setup();
      render(
        <ProjectCard
          project={mockProject}
          onClick={mockOnClick}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const editButton = screen.getByLabelText('Edit project');
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockProject);
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should show hover effects on card', () => {
      render(<ProjectCard project={mockProject} onClick={mockOnClick} />);

      const card = screen.getByTestId('project-card');
      expect(card).toHaveClass('cursor-pointer', 'hover:shadow-md');
    });
  });

  describe('Action Buttons', () => {
    it('should show action buttons by default', () => {
      render(<ProjectCard project={mockProject} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByLabelText('Edit project')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete project')).toBeInTheDocument();
    });

    it('should hide action buttons when showActions is false', () => {
      render(
        <ProjectCard
          project={mockProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          showActions={false}
        />
      );

      expect(screen.queryByLabelText('Edit project')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Delete project')).not.toBeInTheDocument();
    });

    it('should style delete button with red color', () => {
      render(<ProjectCard project={mockProject} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByLabelText('Delete project');
      expect(deleteButton).toHaveClass('text-red-600', 'hover:text-red-800');
    });
  });

  describe('Data Formatting', () => {
    it('should format currency correctly', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('$50,000')).toBeInTheDocument();
    });

    it('should handle missing budget gracefully', () => {
      const noBudgetProject = { ...mockProject, budget: undefined };
      render(<ProjectCard project={noBudgetProject} />);

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('should format dates correctly', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jun 15, 2024')).toBeInTheDocument();
    });

    it('should handle missing dates gracefully', () => {
      const noDateProject = { ...mockProject, endDate: undefined };
      render(<ProjectCard project={noDateProject} />);

      // Should only show start date
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      // Should not crash or show "N/A" for end date in the timeline
    });

    it('should show progress percentage correctly', () => {
      render(<ProjectCard project={mockProject} />);

      const progressText = screen.getByText('65%');
      expect(progressText).toBeInTheDocument();
    });

    it('should handle zero team members', () => {
      const noTeamProject = { ...mockProject, teamMembersCount: 0 };
      render(<ProjectCard project={noTeamProject} />);

      expect(screen.getByText('0 members')).toBeInTheDocument();
    });
  });

  describe('Tag Handling', () => {
    it('should display multiple tags correctly', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('node')).toBeInTheDocument();
      expect(screen.getByText('ecommerce')).toBeInTheDocument();
    });

    it('should limit tags in regular mode (max 4)', () => {
      const manyTagsProject = { ...mockProject, tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'] };
      render(<ProjectCard project={manyTagsProject} />);

      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      expect(screen.getByText('tag3')).toBeInTheDocument();
      expect(screen.getByText('tag4')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
      expect(screen.queryByText('tag5')).not.toBeInTheDocument();
      expect(screen.queryByText('tag6')).not.toBeInTheDocument();
    });

    it('should handle projects with no tags', () => {
      const noTagsProject = { ...mockProject, tags: [] };
      render(<ProjectCard project={noTagsProject} />);

      // Should not show any tag section
      expect(screen.queryByText('react')).not.toBeInTheDocument();
      expect(screen.queryByText('+0 more')).not.toBeInTheDocument();
    });
  });

  describe('Progress Indicators', () => {
    it('should show budget utilization progress bar', () => {
      render(<ProjectCard project={mockProject} />);

      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '65');
    });

    it('should handle missing progress data', () => {
      const noProgressProject = { ...mockProject, budgetUtilization: undefined };
      render(<ProjectCard project={noProgressProject} />);

      // Should still render budget section but without progress bar
      expect(screen.getByText('$50,000')).toBeInTheDocument();
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for action buttons', () => {
      render(<ProjectCard project={mockProject} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByLabelText('Edit project')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete project')).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<ProjectCard project={mockProject} onClick={mockOnClick} onEdit={mockOnEdit} />);

      const card = screen.getByTestId('project-card');
      
      // Tab to card
      await user.tab();
      expect(card).toHaveFocus();

      // Press Enter to activate
      await user.keyboard('{Enter}');
      expect(mockOnClick).toHaveBeenCalledWith(mockProject);
    });

    it('should support keyboard navigation for action buttons', async () => {
      const user = userEvent.setup();
      render(<ProjectCard project={mockProject} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      // Tab to edit button
      await user.tab();
      await user.tab();
      
      const editButton = screen.getByLabelText('Edit project');
      expect(editButton).toHaveFocus();

      // Press Enter to activate
      await user.keyboard('{Enter}');
      expect(mockOnEdit).toHaveBeenCalledWith(mockProject);
    });
  });
});
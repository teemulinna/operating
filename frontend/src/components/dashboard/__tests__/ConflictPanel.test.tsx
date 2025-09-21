import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ConflictPanel } from '../ConflictPanel';

const mockConflicts = [
  {
    id: 'conflict-1',
    type: 'over-allocation',
    severity: 'high',
    employee: {
      id: '1',
      name: 'John Doe',
      department: 'Development',
    },
    project: {
      id: 1,
      name: 'Project Alpha',
      priority: 'high',
    },
    details: {
      allocatedHours: 45,
      capacity: 40,
      overAllocation: 5,
      startDate: '2024-01-15',
      endDate: '2024-01-19',
    },
    suggestedActions: [
      'Reduce allocation by 5 hours',
      'Move tasks to next week',
      'Assign to another team member',
    ],
    createdAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'conflict-2',
    type: 'skill-mismatch',
    severity: 'medium',
    employee: {
      id: '2',
      name: 'Jane Smith',
      department: 'Design',
    },
    project: {
      id: 2,
      name: 'Project Beta',
      priority: 'medium',
    },
    details: {
      requiredSkills: ['React', 'TypeScript'],
      employeeSkills: ['Vue', 'JavaScript'],
      matchPercentage: 40,
    },
    suggestedActions: [
      'Provide React training',
      'Pair with React developer',
      'Reassign to Vue project',
    ],
    createdAt: '2024-01-09T14:30:00Z',
  },
  {
    id: 'conflict-3',
    type: 'schedule-conflict',
    severity: 'low',
    employee: {
      id: '3',
      name: 'Bob Johnson',
      department: 'Development',
    },
    project: {
      id: 3,
      name: 'Project Gamma',
      priority: 'low',
    },
    details: {
      conflictingProjects: ['Project Alpha', 'Project Delta'],
      overlappingHours: 10,
    },
    suggestedActions: [
      'Adjust project timelines',
      'Prioritize higher priority project',
    ],
    createdAt: '2024-01-08T09:15:00Z',
  },
];

describe('ConflictPanel', () => {
  let mockOnResolve: any;
  let mockOnViewDetails: any;

  beforeEach(() => {
    mockOnResolve = vi.fn();
    mockOnViewDetails = vi.fn();
  });

  it('should render list of over-allocation conflicts', () => {
    render(
      <ConflictPanel 
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
      />
    );

    // Check that all conflicts are displayed
    expect(screen.getByTestId('conflict-conflict-1')).toBeInTheDocument();
    expect(screen.getByTestId('conflict-conflict-2')).toBeInTheDocument();
    expect(screen.getByTestId('conflict-conflict-3')).toBeInTheDocument();

    // Check conflict details
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('45h allocated / 40h capacity')).toBeInTheDocument();
  });

  it('should display severity indicators with correct colors', () => {
    render(
      <ConflictPanel 
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
      />
    );

    // Check severity badges
    const highSeverity = screen.getByTestId('severity-high');
    const mediumSeverity = screen.getByTestId('severity-medium');
    const lowSeverity = screen.getByTestId('severity-low');

    expect(highSeverity).toHaveClass('bg-red-100', 'text-red-800');
    expect(mediumSeverity).toHaveClass('bg-yellow-100', 'text-yellow-800');
    expect(lowSeverity).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('should show conflict type icons', () => {
    render(
      <ConflictPanel 
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
      />
    );

    expect(screen.getByTestId('icon-over-allocation')).toBeInTheDocument();
    expect(screen.getByTestId('icon-skill-mismatch')).toBeInTheDocument();
    expect(screen.getByTestId('icon-schedule-conflict')).toBeInTheDocument();
  });

  it('should handle quick resolution actions', async () => {
    render(
      <ConflictPanel 
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
      />
    );

    // Find and click quick resolution button for first conflict
    const quickResolveButton = screen.getByTestId('quick-resolve-conflict-1');
    await userEvent.click(quickResolveButton);

    expect(mockOnResolve).toHaveBeenCalledWith('conflict-1', 'quick');
  });

  it('should handle view details action', async () => {
    render(
      <ConflictPanel 
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
      />
    );

    const viewDetailsButton = screen.getByTestId('view-details-conflict-1');
    await userEvent.click(viewDetailsButton);

    expect(mockOnViewDetails).toHaveBeenCalledWith('conflict-1');
  });

  it('should show suggested actions', () => {
    render(
      <ConflictPanel 
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
      />
    );

    // Check suggested actions for first conflict
    expect(screen.getByText('Reduce allocation by 5 hours')).toBeInTheDocument();
    expect(screen.getByText('Move tasks to next week')).toBeInTheDocument();
    expect(screen.getByText('Assign to another team member')).toBeInTheDocument();
  });

  it('should handle individual suggested action clicks', async () => {
    render(
      <ConflictPanel 
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
      />
    );

    const actionButton = screen.getByTestId('action-0-conflict-1');
    await userEvent.click(actionButton);

    expect(mockOnResolve).toHaveBeenCalledWith('conflict-1', 'Reduce allocation by 5 hours');
  });

  it('should show loading state', () => {
    render(
      <ConflictPanel 
        conflicts={[]}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={true}
      />
    );

    expect(screen.getByTestId('conflicts-loading')).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton')).toHaveLength(3); // 3 skeleton items
  });

  it('should handle empty conflicts gracefully', () => {
    render(
      <ConflictPanel 
        conflicts={[]}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
      />
    );

    expect(screen.getByTestId('no-conflicts')).toBeInTheDocument();
    expect(screen.getByText('No conflicts detected')).toBeInTheDocument();
    expect(screen.getByText('Great! All resources are properly allocated.')).toBeInTheDocument();
  });

  it('should filter conflicts by severity', () => {
    render(
      <ConflictPanel 
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
        filterBySeverity="high"
      />
    );

    // Should only show high severity conflicts
    expect(screen.getByTestId('conflict-conflict-1')).toBeInTheDocument();
    expect(screen.queryByTestId('conflict-conflict-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('conflict-conflict-3')).not.toBeInTheDocument();
  });

  it('should filter conflicts by type', () => {
    render(
      <ConflictPanel 
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
        filterByType="over-allocation"
      />
    );

    // Should only show over-allocation conflicts
    expect(screen.getByTestId('conflict-conflict-1')).toBeInTheDocument();
    expect(screen.queryByTestId('conflict-conflict-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('conflict-conflict-3')).not.toBeInTheDocument();
  });

  it('should sort conflicts by severity', () => {
    render(
      <ConflictPanel 
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
        sortBy="severity"
      />
    );

    const conflictElements = screen.getAllByTestId(/conflict-conflict-/);;
    // High severity should be first
    expect(conflictElements[0]).toHaveAttribute('data-testid', 'conflict-conflict-1');
  });

  it('should show conflict statistics', () => {
    render(
      <ConflictPanel 
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
        showStats={true}
      />
    );

    expect(screen.getByTestId('conflict-stats')).toBeInTheDocument();
    expect(screen.getByText('3 total conflicts')).toBeInTheDocument();
    expect(screen.getByText('1 high severity')).toBeInTheDocument();
    expect(screen.getByText('1 medium severity')).toBeInTheDocument();
    expect(screen.getByText('1 low severity')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(
      <ConflictPanel 
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
      />
    );

    // Check ARIA labels
    const panel = screen.getByTestId('conflict-panel');
    expect(panel).toHaveAttribute('role', 'region');
    expect(panel).toHaveAttribute('aria-label', 'Resource allocation conflicts');

    // Check conflict items are interactive
    const actionButtons = screen.getAllByRole('button');
    actionButtons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
  });

  it('should show time since conflict was created', () => {
    render(
      <ConflictPanel 
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onViewDetails={mockOnViewDetails}
        loading={false}
      />
    );

    expect(screen.getByTestId('time-since-conflict-1')).toBeInTheDocument();
    // Should show relative time like "4 days ago"
  });
});

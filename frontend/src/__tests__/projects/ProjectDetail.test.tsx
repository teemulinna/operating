import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectDetail } from '@/components/projects/ProjectDetail';
import { useProject, useProjectTimeline } from '@/hooks/useProjects';
import type { Project, ProjectTimelineEvent } from '@/types/project';

// Mock the hooks
vi.mock('@/hooks/useProjects');
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUseProject = useProject as any;
const mockUseProjectTimeline = useProjectTimeline as any;

// Mock project data
const mockProject: Project = {
  id: '1',
  name: 'Advanced Web Application',
  description: 'A comprehensive web application with modern features and responsive design.',
  clientName: 'TechCorp Solutions',
  status: 'active',
  startDate: '2024-01-15',
  endDate: '2024-08-15',
  budget: 75000,
  hourlyRate: 125,
  totalHours: 600,
  billedHours: 300,
  isActive: true,
  teamMembers: ['emp1', 'emp2', 'emp3'],
  teamMembersCount: 3,
  tags: ['web', 'react', 'typescript', 'node.js'],
  notes: 'High priority project with tight deadlines.',
  budgetUtilization: 50,
  timeProgress: 50,
  daysRemaining: 120,
  isOverBudget: false,
  isOverdue: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-02-01T00:00:00Z',
};

const mockTimelineEvents: ProjectTimelineEvent[] = [
  {
    id: '1',
    projectId: '1',
    type: 'created',
    title: 'Project Created',
    description: 'Project was initially created',
    date: '2024-01-01T00:00:00Z',
    userId: 'user1',
  },
  {
    id: '2',
    projectId: '1',
    type: 'status_changed',
    title: 'Status Changed',
    description: 'Status changed from planning to active',
    date: '2024-01-15T00:00:00Z',
    userId: 'user1',
  },
  {
    id: '3',
    projectId: '1',
    type: 'team_updated',
    title: 'Team Member Added',
    description: 'John Doe was added to the project team',
    date: '2024-01-20T00:00:00Z',
    userId: 'user2',
  },
];

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ProjectDetail', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseProject.mockReturnValue({
      data: mockProject,
      isLoading: false,
      error: null,
    });

    mockUseProjectTimeline.mockReturnValue({
      data: mockTimelineEvents,
      isLoading: false,
      error: null,
    });
  });

  it('renders project information correctly', () => {
    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Advanced Web Application')).toBeInTheDocument();
    expect(screen.getByText('TechCorp Solutions')).toBeInTheDocument();
    expect(screen.getByText(/A comprehensive web application/)).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('$75,000')).toBeInTheDocument();
  });

  it('displays project progress correctly', () => {
    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('50%')).toBeInTheDocument(); // Budget utilization
    expect(screen.getByText('300 / 600 hours')).toBeInTheDocument(); // Hours progress
    expect(screen.getByText('120 days remaining')).toBeInTheDocument();
  });

  it('shows team information', () => {
    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('3 team members')).toBeInTheDocument();
  });

  it('displays project tags', () => {
    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('web')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(screen.getByText('node.js')).toBeInTheDocument();
  });

  it('displays timeline events', () => {
    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Project Timeline')).toBeInTheDocument();
    expect(screen.getByText('Project Created')).toBeInTheDocument();
    expect(screen.getByText('Status Changed')).toBeInTheDocument();
    expect(screen.getByText('Team Member Added')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    const editButton = screen.getByLabelText('Edit project');
    fireEvent.click(editButton);
    expect(mockOnEdit).toHaveBeenCalledWith(mockProject);
  });

  it('calls onDelete when delete button is clicked', () => {
    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    const deleteButton = screen.getByLabelText('Delete project');
    fireEvent.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith(mockProject);
  });

  it('calls onBack when back button is clicked', () => {
    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    const backButton = screen.getByLabelText('Go back');
    fireEvent.click(backButton);
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('shows loading state when data is loading', () => {
    mockUseProject.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByTestId('project-detail-skeleton')).toBeInTheDocument();
  });

  it('shows error state when data fails to load', () => {
    mockUseProject.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load project'),
    });

    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Failed to Load Project')).toBeInTheDocument();
    expect(screen.getByText('Failed to load project')).toBeInTheDocument();
  });

  it('highlights overdue projects', () => {
    const overdueProject = {
      ...mockProject,
      isOverdue: true,
      daysRemaining: -15,
    };

    mockUseProject.mockReturnValue({
      data: overdueProject,
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('15 days overdue')).toBeInTheDocument();
    expect(screen.getByTestId('project-status-alert')).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('highlights over-budget projects', () => {
    const overBudgetProject = {
      ...mockProject,
      isOverBudget: true,
      budgetUtilization: 120,
    };

    mockUseProject.mockReturnValue({
      data: overBudgetProject,
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Over Budget')).toBeInTheDocument();
    expect(screen.getByTestId('project-status-alert')).toHaveClass('bg-orange-50', 'border-orange-200');
  });

  it('displays budget and time progress bars', () => {
    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(2); // Budget and time progress
  });

  it('shows project dates correctly formatted', () => {
    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument(); // Start date
    expect(screen.getByText('Aug 15, 2024')).toBeInTheDocument(); // End date
  });

  it('handles timeline loading state', () => {
    mockUseProjectTimeline.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Loading timeline...')).toBeInTheDocument();
  });

  it('handles empty timeline gracefully', () => {
    mockUseProjectTimeline.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('No timeline events yet')).toBeInTheDocument();
  });

  it('displays project notes when available', () => {
    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('High priority project with tight deadlines.')).toBeInTheDocument();
  });

  it('formats timeline event dates correctly', () => {
    renderWithQueryClient(
      <ProjectDetail
        projectId="1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('Jan 20, 2024')).toBeInTheDocument();
  });
});
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { ProjectList } from '@/components/projects/ProjectList';
import { useProjects, useDeleteProject } from '@/hooks/useProjects';
import type { Project, ProjectsResponse } from '@/types/project';

// Mock the hooks
vi.mock('@/hooks/useProjects');
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUseProjects = vi.mocked(useProjects);
const mockUseDeleteProject = vi.mocked(useDeleteProject);

// Test data
const mockProjects: Project[] = [
  {
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
  },
  {
    id: 'proj-2',
    name: 'Mobile App Redesign',
    description: 'Complete UI/UX redesign of mobile application',
    clientName: 'DesignStudio',
    status: 'planning',
    startDate: '2024-02-01T00:00:00.000Z',
    endDate: '2024-04-01T00:00:00.000Z',
    budget: 30000,
    hourlyRate: 120,
    totalHours: 250,
    billedHours: 0,
    isActive: true,
    teamMembers: ['emp-2', 'emp-4'],
    teamMembersCount: 2,
    tags: ['mobile', 'ui', 'ux'],
    budgetUtilization: 0,
    timeProgress: 10,
    daysRemaining: 60,
    isOverBudget: false,
    isOverdue: false,
    createdAt: '2024-01-25T00:00:00.000Z',
    updatedAt: '2024-01-28T00:00:00.000Z',
  },
  {
    id: 'proj-3',
    name: 'Legacy System Migration',
    description: 'Migrating old PHP system to modern architecture',
    clientName: 'OldTech Ltd.',
    status: 'on-hold',
    startDate: '2023-12-01T00:00:00.000Z',
    endDate: '2024-01-30T00:00:00.000Z',
    budget: 75000,
    hourlyRate: 180,
    totalHours: 500,
    billedHours: 420,
    isActive: false,
    teamMembers: ['emp-1', 'emp-3'],
    teamMembersCount: 2,
    tags: ['migration', 'php', 'modernization'],
    budgetUtilization: 85,
    timeProgress: 80,
    daysRemaining: -15,
    isOverBudget: true,
    isOverdue: true,
    createdAt: '2023-11-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  },
];

const mockProjectsResponse: ProjectsResponse = {
  projects: mockProjects,
  total: 3,
  page: 1,
  limit: 10,
  totalPages: 1,
};

// Helper function to create QueryClient for tests
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Wrapper component for tests
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ProjectList', () => {
  const mockRefetch = vi.fn();
  const mockDeleteMutation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseProjects.mockReturnValue({
      data: mockProjectsResponse,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isRefetching: false,
    } as any);

    mockUseDeleteProject.mockReturnValue({
      mutateAsync: mockDeleteMutation,
      isPending: false,
    } as any);
  });

  describe('Initial Render', () => {
    it('should render project list with header and controls', () => {
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      expect(screen.getByText('Project Management')).toBeInTheDocument();
      expect(screen.getByText('Manage and track your organization\'s projects')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search projects...')).toBeInTheDocument();
      expect(screen.getByText('Add Project')).toBeInTheDocument();
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
      expect(screen.getByText('Import CSV')).toBeInTheDocument();
    });

    it('should render view mode toggle buttons', () => {
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      expect(screen.getByText('Table View')).toBeInTheDocument();
      expect(screen.getByText('Card View')).toBeInTheDocument();
    });

    it('should render status filter dropdown', () => {
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
    });

    it('should display projects count in table view by default', () => {
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      expect(screen.getByTestId('project-table')).toBeInTheDocument();
      expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
      expect(screen.getByText('Mobile App Redesign')).toBeInTheDocument();
      expect(screen.getByText('Legacy System Migration')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show skeleton when initially loading', () => {
      mockUseProjects.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
        isRefetching: false,
      } as any);

      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      expect(screen.getByTestId('project-list-skeleton')).toBeInTheDocument();
    });

    it('should show loading overlay when refetching', () => {
      mockUseProjects.mockReturnValue({
        data: mockProjectsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isRefetching: true,
      } as any);

      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
      // Loading overlay should be present
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error message with retry button when fetch fails', () => {
      const errorMessage = 'Failed to fetch projects';
      mockUseProjects.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error(errorMessage),
        refetch: mockRefetch,
        isRefetching: false,
      } as any);

      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      expect(screen.getByText('Unable to Load Projects')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Create Project')).toBeInTheDocument();
    });

    it('should call refetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      mockUseProjects.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
        isRefetching: false,
      } as any);

      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no projects exist', () => {
      mockUseProjects.mockReturnValue({
        data: { ...mockProjectsResponse, projects: [], total: 0 },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isRefetching: false,
      } as any);

      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      expect(screen.getByText('No projects yet')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating your first project or importing data from a CSV file.')).toBeInTheDocument();
      expect(screen.getByText('Create First Project')).toBeInTheDocument();
    });

    it('should show no search results when search returns empty', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search projects...');
      await user.type(searchInput, 'nonexistent');

      // Mock empty search results
      mockUseProjects.mockReturnValue({
        data: { ...mockProjectsResponse, projects: [], total: 0 },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isRefetching: false,
      } as any);

      // Re-render to reflect the search
      render(
        <TestWrapper>
          <ProjectList initialSearchTerm="nonexistent" />
        </TestWrapper>
      );

      expect(screen.getByText('No projects found')).toBeInTheDocument();
      expect(screen.getByText('No projects match your search for "nonexistent"')).toBeInTheDocument();
      expect(screen.getByText('Clear Search')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('should update search input and trigger debounced search', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search projects...');
      await user.type(searchInput, 'E-commerce');

      expect(searchInput).toHaveValue('E-commerce');
      
      // Wait for debounced search
      await waitFor(() => {
        expect(mockUseProjects).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'E-commerce' }),
          expect.anything()
        );
      }, { timeout: 500 });
    });

    it('should filter by status when status dropdown changes', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const statusSelect = screen.getByDisplayValue('All Status');
      await user.click(statusSelect);
      
      const activeOption = screen.getByText('Active');
      await user.click(activeOption);

      expect(mockUseProjects).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
        expect.anything()
      );
    });

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup();
      
      // Start with a search term
      render(
        <TestWrapper>
          <ProjectList initialSearchTerm="test" />
        </TestWrapper>
      );

      // Simulate no results scenario to show clear button
      mockUseProjects.mockReturnValue({
        data: { ...mockProjectsResponse, projects: [], total: 0 },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isRefetching: false,
      } as any);

      // Re-render with empty results
      render(
        <TestWrapper>
          <ProjectList initialSearchTerm="test" />
        </TestWrapper>
      );

      const clearButton = screen.getByText('Clear Search');
      await user.click(clearButton);

      expect(mockUseProjects).toHaveBeenCalledWith(
        expect.objectContaining({ search: undefined }),
        expect.anything()
      );
    });
  });

  describe('View Mode Toggle', () => {
    it('should switch to card view when card view button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const cardViewButton = screen.getByText('Card View');
      await user.click(cardViewButton);

      expect(screen.getByTestId('project-card-view')).toBeInTheDocument();
      expect(screen.queryByTestId('project-table')).not.toBeInTheDocument();
    });

    it('should switch back to table view when table view button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      // First switch to card view
      const cardViewButton = screen.getByText('Card View');
      await user.click(cardViewButton);
      
      // Then switch back to table view
      const tableViewButton = screen.getByText('Table View');
      await user.click(tableViewButton);

      expect(screen.getByTestId('project-table')).toBeInTheDocument();
      expect(screen.queryByTestId('project-card-view')).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort by project name when name column header is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const nameHeader = screen.getByText('Project Name');
      await user.click(nameHeader);

      expect(mockUseProjects).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ 
          sortBy: 'name',
          sortOrder: 'asc',
          page: 1
        })
      );
    });

    it('should toggle sort order when clicking the same column header twice', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const nameHeader = screen.getByText('Project Name');
      
      // First click - ascending
      await user.click(nameHeader);
      expect(mockUseProjects).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ sortOrder: 'asc' })
      );

      // Second click - descending
      await user.click(nameHeader);
      expect(mockUseProjects).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ sortOrder: 'desc' })
      );
    });
  });

  describe('Project Actions', () => {
    it('should call onProjectCreate when Add Project button is clicked', async () => {
      const user = userEvent.setup();
      const onProjectCreate = vi.fn();
      
      render(
        <TestWrapper>
          <ProjectList onProjectCreate={onProjectCreate} />
        </TestWrapper>
      );

      const addButton = screen.getByText('Add Project');
      await user.click(addButton);

      expect(onProjectCreate).toHaveBeenCalledTimes(1);
    });

    it('should call onProjectSelect when project row is clicked', async () => {
      const user = userEvent.setup();
      const onProjectSelect = vi.fn();
      
      render(
        <TestWrapper>
          <ProjectList onProjectSelect={onProjectSelect} />
        </TestWrapper>
      );

      const projectRow = screen.getByText('E-commerce Platform').closest('tr');
      await user.click(projectRow!);

      expect(onProjectSelect).toHaveBeenCalledWith(mockProjects[0]);
    });

    it('should call onProjectEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      const onProjectEdit = vi.fn();
      
      render(
        <TestWrapper>
          <ProjectList onProjectEdit={onProjectEdit} />
        </TestWrapper>
      );

      const editButtons = screen.getAllByTitle('Edit project');
      await user.click(editButtons[0]);

      expect(onProjectEdit).toHaveBeenCalledWith(mockProjects[0]);
    });

    it('should show delete confirmation and delete project when confirmed', async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn().mockReturnValue(true);
      mockDeleteMutation.mockResolvedValue(undefined);
      
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const deleteButtons = screen.getAllByTitle('Delete project');
      await user.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "E-commerce Platform"? This action cannot be undone.'
      );
      expect(mockDeleteMutation).toHaveBeenCalledWith('proj-1');
    });

    it('should not delete project when confirmation is cancelled', async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn().mockReturnValue(false);
      
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const deleteButtons = screen.getAllByTitle('Delete project');
      await user.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalled();
      expect(mockDeleteMutation).not.toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    const paginatedResponse: ProjectsResponse = {
      ...mockProjectsResponse,
      total: 25,
      totalPages: 3,
      page: 1,
      limit: 10,
    };

    it('should show pagination when there are multiple pages', () => {
      mockUseProjects.mockReturnValue({
        data: paginatedResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isRefetching: false,
      } as any);

      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      expect(screen.getByText('Showing 1 to 10 of 25 projects')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should navigate to next page when Next button is clicked', async () => {
      const user = userEvent.setup();
      mockUseProjects.mockReturnValue({
        data: paginatedResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isRefetching: false,
      } as any);

      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      expect(mockUseProjects).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ page: 2 })
      );
    });
  });

  describe('CSV Operations', () => {
    it('should call onCSVImport when Import CSV button is clicked', async () => {
      const user = userEvent.setup();
      const onCSVImport = vi.fn();
      
      render(
        <TestWrapper>
          <ProjectList onCSVImport={onCSVImport} />
        </TestWrapper>
      );

      const importButton = screen.getByText('Import CSV');
      await user.click(importButton);

      expect(onCSVImport).toHaveBeenCalledTimes(1);
    });

    it('should call onCSVExport when Export CSV button is clicked', async () => {
      const user = userEvent.setup();
      const onCSVExport = vi.fn();
      
      render(
        <TestWrapper>
          <ProjectList onCSVExport={onCSVExport} />
        </TestWrapper>
      );

      const exportButton = screen.getByText('Export CSV');
      await user.click(exportButton);

      expect(onCSVExport).toHaveBeenCalledTimes(1);
    });
  });

  describe('Refresh Functionality', () => {
    it('should call refetch when Refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('should disable refresh button and show spinner when refetching', () => {
      mockUseProjects.mockReturnValue({
        data: mockProjectsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        isRefetching: true,
      } as any);

      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeDisabled();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Project Data Display', () => {
    it('should display project information correctly in table view', () => {
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const project = mockProjects[0];
      
      expect(screen.getByText(project.name)).toBeInTheDocument();
      expect(screen.getByText(project.clientName)).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // team members count
    });

    it('should format currency values correctly', () => {
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('$30,000')).toBeInTheDocument();
      expect(screen.getByText('$75,000')).toBeInTheDocument();
    });

    it('should format dates correctly', () => {
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Feb 1, 2024')).toBeInTheDocument();
      expect(screen.getByText('Dec 1, 2023')).toBeInTheDocument();
    });

    it('should show appropriate status badges with correct styling', () => {
      render(
        <TestWrapper>
          <ProjectList />
        </TestWrapper>
      );

      const activeStatus = screen.getByText('active');
      const planningStatus = screen.getByText('planning');
      const onHoldStatus = screen.getByText('on-hold');

      expect(activeStatus).toHaveClass('bg-green-100', 'text-green-800');
      expect(planningStatus).toHaveClass('bg-blue-100', 'text-blue-800');
      expect(onHoldStatus).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });
  });
});
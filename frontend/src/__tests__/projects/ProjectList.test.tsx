import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectList } from '@/components/projects/ProjectList';
import { useProjects } from '@/hooks/useProjects';
import type { Project } from '@/types/project';

// Mock the hooks
vi.mock('@/hooks/useProjects');
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUseProjects = useProjects as any;

// Mock project data
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Project Alpha',
    description: 'First test project',
    clientName: 'Client A',
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
    budgetUtilization: 50,
    timeProgress: 50,
    daysRemaining: 300,
    isOverBudget: false,
    isOverdue: false,
  },
  {
    id: '2',
    name: 'Project Beta',
    description: 'Second test project',
    clientName: 'Client B',
    status: 'planning',
    startDate: '2024-02-01',
    endDate: '2024-11-30',
    budget: 30000,
    hourlyRate: 80,
    totalHours: 375,
    billedHours: 0,
    isActive: true,
    teamMembers: ['emp1'],
    teamMembersCount: 1,
    tags: ['mobile', 'react-native'],
    budgetUtilization: 0,
    timeProgress: 0,
    daysRemaining: 270,
    isOverBudget: false,
    isOverdue: false,
  }
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

describe('ProjectList', () => {
  const mockOnProjectSelect = vi.fn();
  const mockOnProjectCreate = vi.fn();
  const mockOnProjectEdit = vi.fn();
  const mockOnCSVImport = vi.fn();
  const mockOnCSVExport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful mock
    mockUseProjects.mockReturnValue({
      data: {
        projects: mockProjects,
        total: mockProjects.length,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    });
  });

  it('renders project list correctly', () => {
    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
      />
    );

    expect(screen.getByText('Project Management')).toBeInTheDocument();
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
    expect(screen.getByText('Client A')).toBeInTheDocument();
    expect(screen.getByText('Client B')).toBeInTheDocument();
  });

  it('displays loading skeleton when loading', () => {
    mockUseProjects.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    });

    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
      />
    );

    expect(screen.getByTestId('project-list-skeleton')).toBeInTheDocument();
  });

  it('displays error state with retry option', () => {
    const mockRefetch = vi.fn();
    mockUseProjects.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load projects'),
      refetch: mockRefetch,
      isRefetching: false,
    });

    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
      />
    );

    expect(screen.getByText('Unable to Load Projects')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('displays empty state when no projects exist', () => {
    mockUseProjects.mockReturnValue({
      data: {
        projects: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    });

    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
      />
    );

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Create First Project')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });

    // Wait for debounced search
    await waitFor(() => {
      expect(mockUseProjects).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Alpha' }),
        expect.any(Object)
      );
    }, { timeout: 500 });
  });

  it('handles table view vs card view toggle', () => {
    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
      />
    );

    // Should default to table view
    expect(screen.getByText('Table View')).toHaveClass('bg-blue-600'); // Active button

    // Switch to card view
    const cardViewButton = screen.getByText('Card View');
    fireEvent.click(cardViewButton);

    // Should show cards now
    expect(screen.getByTestId('project-card-view')).toBeInTheDocument();
    expect(screen.queryByTestId('project-table')).not.toBeInTheDocument();
  });

  it('handles sorting by different columns', () => {
    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
      />
    );

    const nameHeader = screen.getByText('Project Name');
    fireEvent.click(nameHeader);

    expect(mockUseProjects).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        sortBy: 'name',
        sortOrder: 'asc',
        page: 1,
      })
    );

    // Click again to reverse sort order
    fireEvent.click(nameHeader);
    expect(mockUseProjects).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        sortBy: 'name',
        sortOrder: 'desc',
        page: 1,
      })
    );
  });

  it('handles pagination', () => {
    mockUseProjects.mockReturnValue({
      data: {
        projects: mockProjects,
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    });

    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
      />
    );

    expect(screen.getByText('Showing 1 to 10 of 25 projects')).toBeInTheDocument();
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    expect(mockUseProjects).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        page: 2,
      })
    );
  });

  it('handles status filtering', () => {
    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
      />
    );

    const statusFilter = screen.getByDisplayValue('All Status');
    fireEvent.change(statusFilter, { target: { value: 'active' } });

    expect(mockUseProjects).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
      expect.any(Object)
    );
  });

  it('calls callbacks when actions are performed', () => {
    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
      />
    );

    // Test create project button
    const createButton = screen.getByText('Add Project');
    fireEvent.click(createButton);
    expect(mockOnProjectCreate).toHaveBeenCalled();

    // Test CSV import button
    const importButton = screen.getByText('Import CSV');
    fireEvent.click(importButton);
    expect(mockOnCSVImport).toHaveBeenCalled();

    // Test CSV export button
    const exportButton = screen.getByText('Export CSV');
    fireEvent.click(exportButton);
    expect(mockOnCSVExport).toHaveBeenCalled();
  });

  it('shows refresh indicator when refetching', () => {
    mockUseProjects.mockReturnValue({
      data: {
        projects: mockProjects,
        total: mockProjects.length,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: true,
    });

    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
      />
    );

    // The refresh button should show spinning animation
    const refreshButton = screen.getByLabelText('Refresh');
    expect(refreshButton.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays no search results message', () => {
    mockUseProjects.mockReturnValue({
      data: {
        projects: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    });

    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
        initialSearchTerm="NonexistentProject"
      />
    );

    expect(screen.getByText('No projects found')).toBeInTheDocument();
    expect(screen.getByText(/No projects match your search for/)).toBeInTheDocument();
  });

  it('renders project cards in card view', () => {
    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
      />
    );

    // Switch to card view
    const cardViewButton = screen.getByText('Card View');
    fireEvent.click(cardViewButton);

    // Should see project cards
    expect(screen.getAllByTestId('project-card')).toHaveLength(2);
  });

  it('handles project selection in both table and card view', () => {
    renderWithQueryClient(
      <ProjectList
        onProjectSelect={mockOnProjectSelect}
        onProjectCreate={mockOnProjectCreate}
        onProjectEdit={mockOnProjectEdit}
        onCSVImport={mockOnCSVImport}
        onCSVExport={mockOnCSVExport}
      />
    );

    // In table view - click on table row
    const projectRow = screen.getByText('Project Alpha').closest('tr');
    fireEvent.click(projectRow!);
    expect(mockOnProjectSelect).toHaveBeenCalledWith(mockProjects[0]);

    // Switch to card view
    const cardViewButton = screen.getByText('Card View');
    fireEvent.click(cardViewButton);

    // In card view - click on card
    const projectCard = screen.getAllByTestId('project-card')[0];
    fireEvent.click(projectCard);
    expect(mockOnProjectSelect).toHaveBeenCalledWith(mockProjects[0]);
  });
});
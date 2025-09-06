import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { ProjectDetail } from '@/components/projects/ProjectDetail';
import { useProject, useProjectAssignments } from '@/hooks/useProjects';
import { useEmployees } from '@/hooks/useEmployees';
import type { Project, ProjectAssignment } from '@/types/project';

// Mock hooks
vi.mock('@/hooks/useProjects');
vi.mock('@/hooks/useEmployees');
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUseProject = vi.mocked(useProject);
const mockUseProjectAssignments = vi.mocked(useProjectAssignments);
const mockUseEmployees = vi.mocked(useEmployees);

// Test data
const mockProject: Project = {
  id: 'proj-1',
  name: 'E-commerce Platform',
  description: 'Modern e-commerce platform with React and Node.js. This is a comprehensive project that involves building a full-stack application with advanced features.',
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
  tags: ['react', 'node', 'ecommerce', 'typescript'],
  notes: 'Important client project with tight deadline.',
  budgetUtilization: 65,
  timeProgress: 70,
  daysRemaining: 45,
  isOverBudget: false,
  isOverdue: false,
  createdAt: '2024-01-10T00:00:00.000Z',
  updatedAt: '2024-01-20T00:00:00.000Z',
};

const mockAssignments: ProjectAssignment[] = [
  {
    id: 'assign-1',
    projectId: 'proj-1',
    employeeId: 'emp-1',
    employee: {
      id: 'emp-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@company.com',
      position: 'Senior Developer',
      avatar: 'https://example.com/avatar1.jpg',
    },
    role: 'manager',
    utilizationPercentage: 80,
    startDate: '2024-01-15T00:00:00.000Z',
    endDate: '2024-06-15T00:00:00.000Z',
    isActive: true,
    estimatedHours: 320,
    actualHours: 220,
    hourlyRate: 150,
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-20T00:00:00.000Z',
  },
  {
    id: 'assign-2',
    projectId: 'proj-1',
    employeeId: 'emp-2',
    employee: {
      id: 'emp-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@company.com',
      position: 'Frontend Developer',
      avatar: 'https://example.com/avatar2.jpg',
    },
    role: 'developer',
    utilizationPercentage: 60,
    startDate: '2024-01-20T00:00:00.000Z',
    endDate: '2024-05-30T00:00:00.000Z',
    isActive: true,
    estimatedHours: 240,
    actualHours: 180,
    hourlyRate: 120,
    createdAt: '2024-01-20T00:00:00.000Z',
    updatedAt: '2024-01-25T00:00:00.000Z',
  },
  {
    id: 'assign-3',
    projectId: 'proj-1',
    employeeId: 'emp-3',
    employee: {
      id: 'emp-3',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@company.com',
      position: 'UI/UX Designer',
      avatar: 'https://example.com/avatar3.jpg',
    },
    role: 'designer',
    utilizationPercentage: 40,
    startDate: '2024-02-01T00:00:00.000Z',
    endDate: '2024-04-01T00:00:00.000Z',
    isActive: false,
    estimatedHours: 160,
    actualHours: 160,
    hourlyRate: 100,
    createdAt: '2024-02-01T00:00:00.000Z',
    updatedAt: '2024-04-01T00:00:00.000Z',
  },
];

const mockEmployees = [
  {
    id: 'emp-4',
    firstName: 'Alice',
    lastName: 'Wilson',
    email: 'alice.wilson@company.com',
    position: 'Backend Developer',
  },
  {
    id: 'emp-5',
    firstName: 'Charlie',
    lastName: 'Brown',
    email: 'charlie.brown@company.com',
    position: 'QA Engineer',
  },
];

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

describe('ProjectDetail', () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseProject.mockReturnValue({
      data: mockProject,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    mockUseProjectAssignments.mockReturnValue({
      data: mockAssignments,
      isLoading: false,
      error: null,
    } as any);

    mockUseEmployees.mockReturnValue({
      data: { employees: mockEmployees },
      isLoading: false,
      error: null,
    } as any);
  });

  describe('Initial Render', () => {
    it('should render project details header', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
      expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should display project description and details', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText(/Modern e-commerce platform with React and Node.js/)).toBeInTheDocument();
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jun 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('400 hours')).toBeInTheDocument();
    });

    it('should show project tags', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('node')).toBeInTheDocument();
      expect(screen.getByText('ecommerce')).toBeInTheDocument();
      expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('should display progress indicators', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('Budget Progress')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('Time Progress')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('should show project timeline information', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('Project Timeline')).toBeInTheDocument();
      expect(screen.getByText('45 days remaining')).toBeInTheDocument();
      expect(screen.getByText('280 / 400 hours billed')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when project is loading', () => {
      mockUseProject.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByTestId('project-detail-skeleton')).toBeInTheDocument();
    });

    it('should show assignments loading state separately', () => {
      mockUseProjectAssignments.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
      expect(screen.getByText('Loading assignments...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when project fails to load', () => {
      mockUseProject.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Project not found'),
        refetch: mockRefetch,
      } as any);

      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('Error Loading Project')).toBeInTheDocument();
      expect(screen.getByText('Project not found')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should show error for assignments while keeping project visible', () => {
      mockUseProjectAssignments.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load assignments'),
      } as any);

      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
      expect(screen.getByText('Failed to load team assignments')).toBeInTheDocument();
    });

    it('should retry project fetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      mockUseProject.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as any);

      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Team Management', () => {
    it('should display team assignments section', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('Team Assignments')).toBeInTheDocument();
      expect(screen.getByText('Add Team Member')).toBeInTheDocument();
    });

    it('should show team member cards with roles and details', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Senior Developer')).toBeInTheDocument();
      expect(screen.getByText('manager')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument(); // utilization
      
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
      expect(screen.getByText('developer')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('should show inactive assignments with different styling', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      const bobAssignment = screen.getByText('Bob Johnson').closest('[data-testid="assignment-card"]');
      expect(bobAssignment).toHaveClass('opacity-60'); // inactive styling
    });

    it('should display assignment hours and rates', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('220 / 320 hrs')).toBeInTheDocument(); // John's hours
      expect(screen.getByText('$150/hr')).toBeInTheDocument(); // John's rate
      expect(screen.getByText('180 / 240 hrs')).toBeInTheDocument(); // Jane's hours
      expect(screen.getByText('$120/hr')).toBeInTheDocument(); // Jane's rate
    });

    it('should show role badges with appropriate colors', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      const managerBadge = screen.getByText('manager');
      const developerBadge = screen.getByText('developer');
      const designerBadge = screen.getByText('designer');

      expect(managerBadge).toHaveClass('bg-purple-100', 'text-purple-800');
      expect(developerBadge).toHaveClass('bg-blue-100', 'text-blue-800');
      expect(designerBadge).toHaveClass('bg-pink-100', 'text-pink-800');
    });
  });

  describe('Project Actions', () => {
    it('should show edit and delete buttons for project', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" onEdit={vi.fn()} onDelete={vi.fn()} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Edit project')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete project')).toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnEdit = vi.fn();
      
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" onEdit={mockOnEdit} />
        </TestWrapper>
      );

      const editButton = screen.getByLabelText('Edit project');
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockProject);
    });

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnDelete = vi.fn();
      
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" onDelete={mockOnDelete} />
        </TestWrapper>
      );

      const deleteButton = screen.getByLabelText('Delete project');
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockProject);
    });

    it('should not show action buttons when callbacks are not provided', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.queryByLabelText('Edit project')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Delete project')).not.toBeInTheDocument();
    });
  });

  describe('Assignment Actions', () => {
    it('should show assignment action buttons for each team member', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      const editButtons = screen.getAllByLabelText('Edit assignment');
      const deleteButtons = screen.getAllByLabelText('Remove from project');
      
      expect(editButtons).toHaveLength(3);
      expect(deleteButtons).toHaveLength(3);
    });

    it('should open add team member dialog when Add Team Member is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      const addButton = screen.getByText('Add Team Member');
      await user.click(addButton);

      expect(screen.getByText('Add Team Member')).toBeInTheDocument();
      expect(screen.getByText('Select Employee')).toBeInTheDocument();
      expect(screen.getByText('Alice Wilson')).toBeInTheDocument();
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    });

    it('should filter out already assigned employees from add dialog', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      const addButton = screen.getByText('Add Team Member');
      await user.click(addButton);

      // Already assigned employees should not appear in the dialog
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('should show overdue warning for overdue projects', () => {
      const overdueProject = { ...mockProject, isOverdue: true, daysRemaining: -5 };
      mockUseProject.mockReturnValue({
        data: overdueProject,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('Project Overdue')).toBeInTheDocument();
      expect(screen.getByText('5 days overdue')).toBeInTheDocument();
    });

    it('should show over budget warning for projects exceeding budget', () => {
      const overBudgetProject = { ...mockProject, isOverBudget: true, budgetUtilization: 120 };
      mockUseProject.mockReturnValue({
        data: overBudgetProject,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('Over Budget')).toBeInTheDocument();
      expect(screen.getByText('120%')).toBeInTheDocument();
    });

    it('should show project completion status', () => {
      const completedProject = { ...mockProject, status: 'completed' as const };
      mockUseProject.mockReturnValue({
        data: completedProject,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      const statusBadge = screen.getByText('completed');
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });
  });

  describe('Data Formatting', () => {
    it('should format currency values correctly', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('$150/hr')).toBeInTheDocument();
      expect(screen.getByText('$120/hr')).toBeInTheDocument();
      expect(screen.getByText('$100/hr')).toBeInTheDocument();
    });

    it('should format dates consistently', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jun 15, 2024')).toBeInTheDocument();
    });

    it('should handle missing optional data gracefully', () => {
      const minimalProject = {
        ...mockProject,
        description: undefined,
        notes: undefined,
        budget: undefined,
        endDate: undefined,
      };
      
      mockUseProject.mockReturnValue({
        data: minimalProject,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
      expect(screen.queryByText('Modern e-commerce platform')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render properly on mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
      // Test that responsive classes are applied
      const container = document.querySelector('.container');
      expect(container).toBeTruthy();
    });

    it('should adapt grid layout for different screen sizes', () => {
      render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      const gridElements = document.querySelectorAll('.grid');
      expect(gridElements.length).toBeGreaterThan(0);
      
      // Check for responsive grid classes
      const hasResponsiveGrid = Array.from(gridElements).some(el => 
        el.classList.contains('md:grid-cols-2') || 
        el.classList.contains('lg:grid-cols-3')
      );
      expect(hasResponsiveGrid).toBe(true);
    });
  });

  describe('Performance Optimization', () => {
    it('should not re-render unnecessarily when props are the same', () => {
      const { rerender } = render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      const initialRender = screen.getByText('E-commerce Platform');
      
      rerender(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('E-commerce Platform')).toBe(initialRender);
    });

    it('should handle rapid projectId changes gracefully', () => {
      const { rerender } = render(
        <TestWrapper>
          <ProjectDetail projectId="proj-1" />
        </TestWrapper>
      );

      rerender(
        <TestWrapper>
          <ProjectDetail projectId="proj-2" />
        </TestWrapper>
      );

      rerender(
        <TestWrapper>
          <ProjectDetail projectId="proj-3" />
        </TestWrapper>
      );

      // Should not crash and should call useProject with latest projectId
      expect(mockUseProject).toHaveBeenLastCalledWith("proj-3");
    });
  });
});
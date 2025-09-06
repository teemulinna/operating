import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { ProjectRoleManager } from '@/components/projects/ProjectRoleManager';
import { 
  useProjectRoles, 
  useCreateProjectRole, 
  useUpdateProjectRole, 
  useDeleteProjectRole 
} from '@/hooks/useProjects';
import type { ProjectRole, CreateProjectRoleRequest } from '@/types/project';

// Mock hooks
vi.mock('@/hooks/useProjects', () => ({
  useProjectRoles: vi.fn(),
  useCreateProjectRole: vi.fn(),
  useUpdateProjectRole: vi.fn(),
  useDeleteProjectRole: vi.fn(),
}));
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUseProjectRoles = vi.mocked(useProjectRoles);
const mockUseCreateProjectRole = vi.mocked(useCreateProjectRole);
const mockUseUpdateProjectRole = vi.mocked(useUpdateProjectRole);
const mockUseDeleteProjectRole = vi.mocked(useDeleteProjectRole);

// Test data
const mockProjectRoles: ProjectRole[] = [
  {
    id: 'role-1',
    projectId: 'proj-1',
    roleName: 'Senior Frontend Developer',
    description: 'Lead the frontend development team and architect React components',
    requiredSkills: ['React', 'TypeScript', 'CSS-in-JS', 'Redux'],
    minimumExperienceLevel: 'senior',
    plannedAllocationPercentage: 80,
    estimatedHours: 320,
    actualHours: 240,
    status: 'active',
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-20T00:00:00.000Z',
  },
  {
    id: 'role-2',
    projectId: 'proj-1',
    roleName: 'Backend Developer',
    description: 'Implement APIs and database architecture',
    requiredSkills: ['Node.js', 'PostgreSQL', 'REST APIs', 'GraphQL'],
    minimumExperienceLevel: 'intermediate',
    plannedAllocationPercentage: 60,
    estimatedHours: 240,
    actualHours: 180,
    status: 'active',
    createdAt: '2024-01-16T00:00:00.000Z',
    updatedAt: '2024-01-21T00:00:00.000Z',
  },
  {
    id: 'role-3',
    projectId: 'proj-1',
    roleName: 'UI/UX Designer',
    description: 'Create design system and user interface mockups',
    requiredSkills: ['Figma', 'Design Systems', 'User Research', 'Prototyping'],
    minimumExperienceLevel: 'junior',
    plannedAllocationPercentage: 40,
    estimatedHours: 160,
    actualHours: 160,
    status: 'completed',
    createdAt: '2024-01-17T00:00:00.000Z',
    updatedAt: '2024-02-15T00:00:00.000Z',
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

describe('ProjectRoleManager', () => {
  const mockCreateMutation = vi.fn();
  const mockUpdateMutation = vi.fn();
  const mockDeleteMutation = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseProjectRoles.mockReturnValue({
      data: mockProjectRoles,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    mockUseCreateProjectRole.mockReturnValue({
      mutateAsync: mockCreateMutation,
      isPending: false,
      error: null,
    } as any);

    mockUseUpdateProjectRole.mockReturnValue({
      mutateAsync: mockUpdateMutation,
      isPending: false,
      error: null,
    } as any);

    mockUseDeleteProjectRole.mockReturnValue({
      mutateAsync: mockDeleteMutation,
      isPending: false,
      error: null,
    } as any);
  });

  describe('Initial Render', () => {
    it('should render project roles manager with title', () => {
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('Project Roles & Skills')).toBeInTheDocument();
      expect(screen.getByText('Define roles and required skills for this project')).toBeInTheDocument();
    });

    it('should display existing project roles', () => {
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('Senior Frontend Developer')).toBeInTheDocument();
      expect(screen.getByText('Backend Developer')).toBeInTheDocument();
      expect(screen.getByText('UI/UX Designer')).toBeInTheDocument();
    });

    it('should show role details and skills', () => {
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('Lead the frontend development team')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('senior')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument(); // allocation
    });

    it('should show add role button', () => {
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('Add Role')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when roles are loading', () => {
      mockUseProjectRoles.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('Loading roles...')).toBeInTheDocument();
    });

    it('should show empty state when no roles exist', () => {
      mockUseProjectRoles.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('No roles defined yet')).toBeInTheDocument();
      expect(screen.getByText('Define the first role')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when roles fail to load', () => {
      mockUseProjectRoles.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch roles'),
        refetch: mockRefetch,
      } as any);

      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('Error Loading Roles')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch roles')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should retry fetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      mockUseProjectRoles.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as any);

      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Add Role Dialog', () => {
    it('should open add role dialog when Add Role button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const addButton = screen.getByText('Add Role');
      await user.click(addButton);

      expect(screen.getByText('Add New Role')).toBeInTheDocument();
      expect(screen.getByLabelText('Role Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Required Skills')).toBeInTheDocument();
      expect(screen.getByLabelText('Experience Level')).toBeInTheDocument();
      expect(screen.getByLabelText('Allocation Percentage')).toBeInTheDocument();
    });

    it('should validate required fields in add role form', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const addButton = screen.getByText('Add Role');
      await user.click(addButton);

      const saveButton = screen.getByText('Save Role');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Role name is required')).toBeInTheDocument();
        expect(screen.getByText('Allocation percentage is required')).toBeInTheDocument();
      });
    });

    it('should create role with valid data', async () => {
      const user = userEvent.setup();
      mockCreateMutation.mockResolvedValue(mockProjectRoles[0]);

      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const addButton = screen.getByText('Add Role');
      await user.click(addButton);

      await user.type(screen.getByLabelText('Role Name'), 'QA Engineer');
      await user.type(screen.getByLabelText('Description'), 'Test automation specialist');
      await user.type(screen.getByLabelText('Required Skills'), 'Jest, Cypress, Testing');
      await user.selectOptions(screen.getByLabelText('Experience Level'), 'intermediate');
      await user.type(screen.getByLabelText('Allocation Percentage'), '50');

      const saveButton = screen.getByText('Save Role');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateMutation).toHaveBeenCalledWith({
          projectId: 'proj-1',
          roleName: 'QA Engineer',
          description: 'Test automation specialist',
          requiredSkills: ['Jest', 'Cypress', 'Testing'],
          minimumExperienceLevel: 'intermediate',
          plannedAllocationPercentage: 50,
        });
      });
    });
  });

  describe('Edit Role Dialog', () => {
    it('should open edit role dialog when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const editButtons = screen.getAllByLabelText('Edit role');
      await user.click(editButtons[0]);

      expect(screen.getByText('Edit Role')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Senior Frontend Developer')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Lead the frontend development team')).toBeInTheDocument();
    });

    it('should populate form with existing role data', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const editButtons = screen.getAllByLabelText('Edit role');
      await user.click(editButtons[0]);

      expect(screen.getByDisplayValue('Senior Frontend Developer')).toBeInTheDocument();
      expect(screen.getByDisplayValue('React, TypeScript, CSS-in-JS, Redux')).toBeInTheDocument();
      expect(screen.getByDisplayValue('senior')).toBeInTheDocument();
      expect(screen.getByDisplayValue('80')).toBeInTheDocument();
    });

    it('should update role with changed data', async () => {
      const user = userEvent.setup();
      mockUpdateMutation.mockResolvedValue({ ...mockProjectRoles[0], roleName: 'Updated Role' });

      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const editButtons = screen.getAllByLabelText('Edit role');
      await user.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Senior Frontend Developer');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Frontend Developer');

      const saveButton = screen.getByText('Update Role');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateMutation).toHaveBeenCalledWith({
          id: 'role-1',
          updates: expect.objectContaining({
            roleName: 'Updated Frontend Developer',
          }),
        });
      });
    });
  });

  describe('Delete Role', () => {
    it('should show delete confirmation dialog', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const deleteButtons = screen.getAllByLabelText('Delete role');
      await user.click(deleteButtons[0]);

      expect(screen.getByText('Delete Role')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this role?')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('should delete role when confirmed', async () => {
      const user = userEvent.setup();
      mockDeleteMutation.mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const deleteButtons = screen.getAllByLabelText('Delete role');
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Delete');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteMutation).toHaveBeenCalledWith('role-1');
      });
    });

    it('should cancel delete when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const deleteButtons = screen.getAllByLabelText('Delete role');
      await user.click(deleteButtons[0]);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(screen.queryByText('Delete Role')).not.toBeInTheDocument();
      expect(mockDeleteMutation).not.toHaveBeenCalled();
    });
  });

  describe('Role Status Display', () => {
    it('should show role status badges with correct colors', () => {
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const activeBadges = screen.getAllByText('active');
      const completedBadge = screen.getByText('completed');

      expect(activeBadges[0]).toHaveClass('bg-green-100', 'text-green-800');
      expect(completedBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('should show experience level badges', () => {
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('senior')).toBeInTheDocument();
      expect(screen.getByText('intermediate')).toBeInTheDocument();
      expect(screen.getByText('junior')).toBeInTheDocument();
    });

    it('should display skill tags', () => {
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
      expect(screen.getByText('Figma')).toBeInTheDocument();
    });
  });

  describe('Role Progress Tracking', () => {
    it('should show hours allocation and progress', () => {
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('240 / 320 hours')).toBeInTheDocument(); // Frontend role
      expect(screen.getByText('180 / 240 hours')).toBeInTheDocument(); // Backend role
      expect(screen.getByText('160 / 160 hours')).toBeInTheDocument(); // Designer role
    });

    it('should show allocation percentages', () => {
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
    });

    it('should calculate and display progress bars', () => {
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const progressBars = document.querySelectorAll('[role="progressbar"]');
      expect(progressBars).toHaveLength(3);
    });
  });

  describe('Skills Management', () => {
    it('should parse comma-separated skills correctly', async () => {
      const user = userEvent.setup();
      mockCreateMutation.mockResolvedValue(mockProjectRoles[0]);

      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const addButton = screen.getByText('Add Role');
      await user.click(addButton);

      await user.type(screen.getByLabelText('Role Name'), 'Full Stack Developer');
      await user.type(screen.getByLabelText('Required Skills'), 'React, Node.js, MongoDB, AWS, Docker');
      await user.type(screen.getByLabelText('Allocation Percentage'), '75');

      const saveButton = screen.getByText('Save Role');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateMutation).toHaveBeenCalledWith(
          expect.objectContaining({
            requiredSkills: ['React', 'Node.js', 'MongoDB', 'AWS', 'Docker'],
          })
        );
      });
    });

    it('should handle empty skills gracefully', async () => {
      const user = userEvent.setup();
      mockCreateMutation.mockResolvedValue(mockProjectRoles[0]);

      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const addButton = screen.getByText('Add Role');
      await user.click(addButton);

      await user.type(screen.getByLabelText('Role Name'), 'Junior Developer');
      await user.type(screen.getByLabelText('Allocation Percentage'), '40');

      const saveButton = screen.getByText('Save Role');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateMutation).toHaveBeenCalledWith(
          expect.objectContaining({
            requiredSkills: [],
          })
        );
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate allocation percentage range', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const addButton = screen.getByText('Add Role');
      await user.click(addButton);

      await user.type(screen.getByLabelText('Role Name'), 'Test Role');
      await user.type(screen.getByLabelText('Allocation Percentage'), '150');

      const saveButton = screen.getByText('Save Role');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Allocation must be between 1 and 100')).toBeInTheDocument();
      });
    });

    it('should validate role name length', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const addButton = screen.getByText('Add Role');
      await user.click(addButton);

      await user.type(screen.getByLabelText('Role Name'), 'A'.repeat(256));
      await user.type(screen.getByLabelText('Allocation Percentage'), '50');

      const saveButton = screen.getByText('Save Role');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Role name must be less than 255 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      expect(screen.getByRole('region', { name: 'Project Roles & Skills' })).toBeInTheDocument();
      expect(screen.getByLabelText('Edit role')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete role')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectRoleManager projectId="proj-1" />
        </TestWrapper>
      );

      const addButton = screen.getByText('Add Role');
      await user.tab();
      expect(addButton).toHaveFocus();

      const editButtons = screen.getAllByLabelText('Edit role');
      await user.tab();
      expect(editButtons[0]).toHaveFocus();
    });
  });
});
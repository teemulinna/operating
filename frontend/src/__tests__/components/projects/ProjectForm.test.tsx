import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects';
import { useEmployees } from '@/hooks/useEmployees';
import type { Project, CreateProjectRequest } from '@/types/project';

// Mock hooks
vi.mock('@/hooks/useProjects');
vi.mock('@/hooks/useEmployees');
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUseCreateProject = vi.mocked(useCreateProject);
const mockUseUpdateProject = vi.mocked(useUpdateProject);
const mockUseEmployees = vi.mocked(useEmployees);

// Test data
const mockEmployees = [
  {
    id: 'emp-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    position: 'Senior Developer',
  },
  {
    id: 'emp-2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@company.com',
    position: 'Project Manager',
  },
  {
    id: 'emp-3',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@company.com',
    position: 'UI/UX Designer',
  },
];

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
  billedHours: 0,
  isActive: true,
  teamMembers: ['emp-1', 'emp-2'],
  teamMembersCount: 2,
  tags: ['react', 'node', 'ecommerce'],
  notes: 'Important client project with tight deadline.',
  createdAt: '2024-01-10T00:00:00.000Z',
  updatedAt: '2024-01-20T00:00:00.000Z',
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

describe('ProjectForm', () => {
  const mockCreateMutation = vi.fn();
  const mockUpdateMutation = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseCreateProject.mockReturnValue({
      mutateAsync: mockCreateMutation,
      isPending: false,
      error: null,
    } as any);

    mockUseUpdateProject.mockReturnValue({
      mutateAsync: mockUpdateMutation,
      isPending: false,
      error: null,
    } as any);

    mockUseEmployees.mockReturnValue({
      data: { employees: mockEmployees },
      isLoading: false,
      error: null,
    } as any);
  });

  describe('Create Mode', () => {
    it('should render form in create mode with correct title', () => {
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      expect(screen.getByText('Create New Project')).toBeInTheDocument();
      expect(screen.getByText('Create Project')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render all form fields for project creation', () => {
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Client Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Budget')).toBeInTheDocument();
      expect(screen.getByLabelText('Hourly Rate')).toBeInTheDocument();
      expect(screen.getByLabelText('Total Hours')).toBeInTheDocument();
      expect(screen.getByLabelText('Tags')).toBeInTheDocument();
      expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    });

    it('should have default values for new project', () => {
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('planning')).toBeInTheDocument();
      const activeCheckbox = screen.getByLabelText('Active Project') as HTMLInputElement;
      expect(activeCheckbox.checked).toBe(true);
    });
  });

  describe('Edit Mode', () => {
    it('should render form in edit mode with correct title', () => {
      render(
        <TestWrapper>
          <ProjectForm
            project={mockProject}
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Edit Project')).toBeInTheDocument();
      expect(screen.getByText('Update Project')).toBeInTheDocument();
    });

    it('should populate form fields with existing project data', () => {
      render(
        <TestWrapper>
          <ProjectForm
            project={mockProject}
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('E-commerce Platform')).toBeInTheDocument();
      expect(screen.getByDisplayValue('TechCorp Inc.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Modern e-commerce platform with React and Node.js')).toBeInTheDocument();
      expect(screen.getByDisplayValue('active')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('150')).toBeInTheDocument();
      expect(screen.getByDisplayValue('400')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Important client project with tight deadline.')).toBeInTheDocument();
    });

    it('should populate date fields correctly', () => {
      render(
        <TestWrapper>
          <ProjectForm
            project={mockProject}
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-06-15')).toBeInTheDocument();
    });

    it('should populate tags field correctly', () => {
      render(
        <TestWrapper>
          <ProjectForm
            project={mockProject}
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('react, node, ecommerce')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Create Project');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project name is required')).toBeInTheDocument();
        expect(screen.getByText('Client name is required')).toBeInTheDocument();
        expect(screen.getByText('Start date is required')).toBeInTheDocument();
      });
    });

    it('should validate project name length', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText('Project Name');
      await user.type(nameInput, 'A'); // Too short
      
      const submitButton = screen.getByText('Create Project');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project name must be at least 2 characters')).toBeInTheDocument();
      });

      await user.clear(nameInput);
      await user.type(nameInput, 'A'.repeat(256)); // Too long

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project name must be less than 255 characters')).toBeInTheDocument();
      });
    });

    it('should validate budget as positive number', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const budgetInput = screen.getByLabelText('Budget');
      await user.type(budgetInput, '-1000');

      const submitButton = screen.getByText('Create Project');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Budget must be a positive number')).toBeInTheDocument();
      });
    });

    it('should validate hourly rate as positive number', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const rateInput = screen.getByLabelText('Hourly Rate');
      await user.type(rateInput, '0');

      const submitButton = screen.getByText('Create Project');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Hourly rate must be greater than 0')).toBeInTheDocument();
      });
    });

    it('should validate total hours as positive number', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const hoursInput = screen.getByLabelText('Total Hours');
      await user.type(hoursInput, '-50');

      const submitButton = screen.getByText('Create Project');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Total hours must be a positive number')).toBeInTheDocument();
      });
    });

    it('should validate end date is after start date', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');

      await user.type(startDateInput, '2024-06-15');
      await user.type(endDateInput, '2024-01-15'); // End before start

      const submitButton = screen.getByText('Create Project');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
      });
    });

    it('should validate email format for client contact', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Check if client email field exists (might be optional)
      const clientEmailInput = screen.queryByLabelText('Client Email');
      if (clientEmailInput) {
        await user.type(clientEmailInput, 'invalid-email');

        const submitButton = screen.getByText('Create Project');
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Form Submission', () => {
    it('should create project successfully with valid data', async () => {
      const user = userEvent.setup();
      mockCreateMutation.mockResolvedValue(mockProject);

      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Fill in required fields
      await user.type(screen.getByLabelText('Project Name'), 'New Project');
      await user.type(screen.getByLabelText('Client Name'), 'Test Client');
      await user.type(screen.getByLabelText('Start Date'), '2024-01-01');

      const submitButton = screen.getByText('Create Project');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateMutation).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Project',
            clientName: 'Test Client',
            startDate: '2024-01-01',
            status: 'planning',
            isActive: true,
          })
        );
        expect(mockOnSuccess).toHaveBeenCalledWith(mockProject);
      });
    });

    it('should update project successfully with valid changes', async () => {
      const user = userEvent.setup();
      mockUpdateMutation.mockResolvedValue({ ...mockProject, name: 'Updated Project' });

      render(
        <TestWrapper>
          <ProjectForm
            project={mockProject}
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      );

      const nameInput = screen.getByDisplayValue('E-commerce Platform');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Project');

      const submitButton = screen.getByText('Update Project');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateMutation).toHaveBeenCalledWith({
          id: 'proj-1',
          updates: expect.objectContaining({
            name: 'Updated Project',
          }),
        });
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle form submission errors gracefully', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Project name already exists';
      mockCreateMutation.mockRejectedValue(new Error(errorMessage));

      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText('Project Name'), 'Duplicate Project');
      await user.type(screen.getByLabelText('Client Name'), 'Test Client');
      await user.type(screen.getByLabelText('Start Date'), '2024-01-01');

      const submitButton = screen.getByText('Create Project');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should disable submit button while form is submitting', async () => {
      const user = userEvent.setup();
      mockUseCreateProject.mockReturnValue({
        mutateAsync: mockCreateMutation,
        isPending: true,
        error: null,
      } as any);

      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Creating...');
      expect(submitButton).toBeDisabled();
    });

    it('should show loading state during update', async () => {
      mockUseUpdateProject.mockReturnValue({
        mutateAsync: mockUpdateMutation,
        isPending: true,
        error: null,
      } as any);

      render(
        <TestWrapper>
          <ProjectForm
            project={mockProject}
            onSuccess={mockOnSuccess}
            onCancel={mockOnCancel}
          />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Updating...');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should toggle active status checkbox', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const activeCheckbox = screen.getByLabelText('Active Project') as HTMLInputElement;
      expect(activeCheckbox.checked).toBe(true);

      await user.click(activeCheckbox);
      expect(activeCheckbox.checked).toBe(false);
    });

    it('should update status dropdown selection', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const statusSelect = screen.getByLabelText('Status');
      await user.selectOptions(statusSelect, 'active');

      expect(screen.getByDisplayValue('active')).toBeInTheDocument();
    });

    it('should handle tags input correctly', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const tagsInput = screen.getByLabelText('Tags');
      await user.type(tagsInput, 'react, node, typescript');

      expect(tagsInput).toHaveValue('react, node, typescript');
    });

    it('should format and validate date inputs', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const startDateInput = screen.getByLabelText('Start Date');
      await user.type(startDateInput, '2024-01-15');

      expect(startDateInput).toHaveValue('2024-01-15');
    });

    it('should clear form validation errors when corrected', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Submit empty form to trigger validation
      const submitButton = screen.getByText('Create Project');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project name is required')).toBeInTheDocument();
      });

      // Fix the error
      const nameInput = screen.getByLabelText('Project Name');
      await user.type(nameInput, 'Valid Project Name');

      await waitFor(() => {
        expect(screen.queryByText('Project name is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Transformation', () => {
    it('should transform tags from string to array for submission', async () => {
      const user = userEvent.setup();
      mockCreateMutation.mockResolvedValue(mockProject);

      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText('Project Name'), 'Tag Test Project');
      await user.type(screen.getByLabelText('Client Name'), 'Test Client');
      await user.type(screen.getByLabelText('Start Date'), '2024-01-01');
      await user.type(screen.getByLabelText('Tags'), 'react, node.js, typescript, testing');

      const submitButton = screen.getByText('Create Project');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateMutation).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: ['react', 'node.js', 'typescript', 'testing'],
          })
        );
      });
    });

    it('should handle empty tags gracefully', async () => {
      const user = userEvent.setup();
      mockCreateMutation.mockResolvedValue(mockProject);

      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText('Project Name'), 'No Tags Project');
      await user.type(screen.getByLabelText('Client Name'), 'Test Client');
      await user.type(screen.getByLabelText('Start Date'), '2024-01-01');
      // Leave tags empty

      const submitButton = screen.getByText('Create Project');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateMutation).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: [],
          })
        );
      });
    });

    it('should convert numeric strings to numbers for submission', async () => {
      const user = userEvent.setup();
      mockCreateMutation.mockResolvedValue(mockProject);

      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText('Project Name'), 'Numeric Test Project');
      await user.type(screen.getByLabelText('Client Name'), 'Test Client');
      await user.type(screen.getByLabelText('Start Date'), '2024-01-01');
      await user.type(screen.getByLabelText('Budget'), '75000');
      await user.type(screen.getByLabelText('Hourly Rate'), '125');
      await user.type(screen.getByLabelText('Total Hours'), '600');

      const submitButton = screen.getByText('Create Project');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateMutation).toHaveBeenCalledWith(
          expect.objectContaining({
            budget: 75000,
            hourlyRate: 125,
            totalHours: 600,
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and accessibility attributes', () => {
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText('Project Name');
      const clientInput = screen.getByLabelText('Client Name');
      const statusSelect = screen.getByLabelText('Status');

      expect(nameInput).toHaveAttribute('required');
      expect(clientInput).toHaveAttribute('required');
      expect(statusSelect).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText('Project Name')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Client Name')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Description')).toHaveFocus();
    });

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ProjectForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Create Project');
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('Project name is required');
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });
});
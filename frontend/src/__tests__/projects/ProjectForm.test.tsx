import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { useClients } from '@/hooks/useProjects';
import type { Project } from '@/types/project';

// Mock the hooks
vi.mock('@/hooks/useProjects');
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUseClients = useClients as any;

// Mock project data
const mockProject: Project = {
  id: '1',
  name: 'Test Project',
  description: 'Test project description',
  clientName: 'Test Client',
  status: 'active',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  budget: 50000,
  hourlyRate: 100,
  totalHours: 500,
  isActive: true,
  teamMembers: [],
  tags: ['web', 'react'],
};

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

describe('ProjectForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseClients.mockReturnValue({
      data: ['Client A', 'Client B', 'Test Client'],
      isLoading: false,
    });
  });

  it('renders form fields correctly for new project', () => {
    renderWithQueryClient(
      <ProjectForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="create"
      />
    );

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Client Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Budget')).toBeInTheDocument();
    expect(screen.getByLabelText('Hourly Rate')).toBeInTheDocument();
    expect(screen.getByText('Create Project')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders form fields correctly for edit mode', () => {
    renderWithQueryClient(
      <ProjectForm
        project={mockProject}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="edit"
      />
    );

    expect(screen.getByText('Edit Project')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Client')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test project description')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderWithQueryClient(
      <ProjectForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="create"
      />
    );

    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument();
      expect(screen.getByText('Client name is required')).toBeInTheDocument();
      expect(screen.getByText('Start date is required')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates date range (end date must be after start date)', async () => {
    renderWithQueryClient(
      <ProjectForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="create"
      />
    );

    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');
    
    fireEvent.change(startDateInput, { target: { value: '2024-12-31' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-01' } });

    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
    });
  });

  it('validates budget and hourly rate are positive numbers', async () => {
    renderWithQueryClient(
      <ProjectForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="create"
      />
    );

    const budgetInput = screen.getByLabelText('Budget');
    const hourlyRateInput = screen.getByLabelText('Hourly Rate');
    
    fireEvent.change(budgetInput, { target: { value: '-1000' } });
    fireEvent.change(hourlyRateInput, { target: { value: '-50' } });

    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Budget must be a positive number')).toBeInTheDocument();
      expect(screen.getByText('Hourly rate must be a positive number')).toBeInTheDocument();
    });
  });

  it('submits form with correct data', async () => {
    renderWithQueryClient(
      <ProjectForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="create"
      />
    );

    // Fill out required fields
    fireEvent.change(screen.getByLabelText('Project Name'), { 
      target: { value: 'New Project' } 
    });
    fireEvent.change(screen.getByLabelText('Client Name'), { 
      target: { value: 'New Client' } 
    });
    fireEvent.change(screen.getByLabelText('Start Date'), { 
      target: { value: '2024-01-01' } 
    });
    fireEvent.change(screen.getByLabelText('End Date'), { 
      target: { value: '2024-12-31' } 
    });
    fireEvent.change(screen.getByLabelText('Budget'), { 
      target: { value: '75000' } 
    });
    fireEvent.change(screen.getByLabelText('Hourly Rate'), { 
      target: { value: '120' } 
    });
    fireEvent.change(screen.getByLabelText('Description'), { 
      target: { value: 'Project description' } 
    });

    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'New Project',
        clientName: 'New Client',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        budget: 75000,
        hourlyRate: 120,
        description: 'Project description',
        status: 'planning',
        isActive: true,
        teamMembers: [],
        tags: [],
      });
    });
  });

  it('handles cancel action', () => {
    renderWithQueryClient(
      <ProjectForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="create"
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows loading state when submitting', async () => {
    renderWithQueryClient(
      <ProjectForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="create"
        isSubmitting={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: /creating/i });
    expect(submitButton).toBeDisabled();
  });

  it('handles client name autocomplete', async () => {
    renderWithQueryClient(
      <ProjectForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="create"
      />
    );

    const clientInput = screen.getByLabelText('Client Name');
    fireEvent.change(clientInput, { target: { value: 'Client' } });
    fireEvent.focus(clientInput);

    // Should show autocomplete suggestions
    await waitFor(() => {
      expect(screen.getByText('Client A')).toBeInTheDocument();
      expect(screen.getByText('Client B')).toBeInTheDocument();
    });

    // Click on suggestion
    fireEvent.click(screen.getByText('Client A'));
    expect(clientInput).toHaveValue('Client A');
  });

  it('handles status selection', () => {
    renderWithQueryClient(
      <ProjectForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="create"
      />
    );

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'active' } });
    
    expect(statusSelect).toHaveValue('active');
  });

  it('handles tags input', () => {
    renderWithQueryClient(
      <ProjectForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="create"
      />
    );

    const tagsInput = screen.getByLabelText('Tags');
    fireEvent.change(tagsInput, { target: { value: 'web, react, typescript' } });
    
    expect(tagsInput).toHaveValue('web, react, typescript');
  });

  it('calculates total budget from hours and rate', async () => {
    renderWithQueryClient(
      <ProjectForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="create"
      />
    );

    const totalHoursInput = screen.getByLabelText('Total Hours');
    const hourlyRateInput = screen.getByLabelText('Hourly Rate');
    
    fireEvent.change(totalHoursInput, { target: { value: '100' } });
    fireEvent.change(hourlyRateInput, { target: { value: '50' } });

    // Should show calculated budget
    await waitFor(() => {
      const budgetDisplay = screen.getByText(/estimated budget.*\$5,000/i);
      expect(budgetDisplay).toBeInTheDocument();
    });
  });

  it('preserves form data when switching between create and edit modes', () => {
    const { rerender } = renderWithQueryClient(
      <ProjectForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="create"
      />
    );

    // Fill out form in create mode
    fireEvent.change(screen.getByLabelText('Project Name'), { 
      target: { value: 'Test Project' } 
    });

    // Switch to edit mode with project data
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProjectForm
          project={mockProject}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="edit"
        />
      </QueryClientProvider>
    );

    // Should now show the project data
    expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
  });
});
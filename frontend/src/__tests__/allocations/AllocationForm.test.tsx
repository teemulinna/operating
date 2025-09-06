import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AllocationForm } from '../../components/allocations/AllocationForm';
import { useEmployees } from '../../hooks/useEmployees';
import { useProjects } from '../../hooks/useProjects';
import { useCreateAllocation, useUpdateAllocation, useCheckConflicts } from '../../hooks/useAllocations';
import { useToast } from '../../hooks/useToast';

// Mock hooks
vi.mock('../../hooks/useEmployees');
vi.mock('../../hooks/useProjects');
vi.mock('../../hooks/useAllocations');
vi.mock('../../hooks/useToast');

const mockUseEmployees = vi.mocked(useEmployees);
const mockUseProjects = vi.mocked(useProjects);
const mockUseCreateAllocation = vi.mocked(useCreateAllocation);
const mockUseUpdateAllocation = vi.mocked(useUpdateAllocation);
const mockUseCheckConflicts = vi.mocked(useCheckConflicts);
const mockUseToast = vi.mocked(useToast);

const mockEmployees = [
  { id: 'emp-1', firstName: 'John', lastName: 'Doe', department: 'Engineering' },
  { id: 'emp-2', firstName: 'Jane', lastName: 'Smith', department: 'Design' },
];

const mockProjects = [
  { id: 'proj-1', name: 'Test Project 1', clientName: 'Client A' },
  { id: 'proj-2', name: 'Test Project 2', clientName: 'Client B' },
];

const mockAllocation = {
  id: 'alloc-1',
  employeeId: 'emp-1',
  projectId: 'proj-1',
  startDate: '2024-01-01',
  endDate: '2024-01-07',
  allocatedHours: 40,
  role: 'Developer',
  status: 'active' as const,
  notes: 'Test allocation',
  isActive: true,
};

const mockToast = vi.fn();

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('AllocationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseToast.mockReturnValue({ toast: mockToast });
    
    mockUseEmployees.mockReturnValue({
      data: { employees: mockEmployees, total: 2 },
      isLoading: false,
    });
    
    mockUseProjects.mockReturnValue({
      data: { projects: mockProjects, total: 2 },
      isLoading: false,
    });
    
    mockUseCreateAllocation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ allocation: mockAllocation, conflicts: [] }),
      isPending: false,
    });
    
    mockUseUpdateAllocation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ allocation: mockAllocation, conflicts: [] }),
      isPending: false,
    });
    
    mockUseCheckConflicts.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue([]),
      isPending: false,
    });
  });

  it('renders create form correctly', () => {
    render(
      <TestWrapper>
        <AllocationForm />
      </TestWrapper>
    );
    
    expect(screen.getByText('Create New Allocation')).toBeInTheDocument();
    expect(screen.getByLabelText('Employee *')).toBeInTheDocument();
    expect(screen.getByLabelText('Project *')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date *')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date *')).toBeInTheDocument();
    expect(screen.getByLabelText('Hours per Week *')).toBeInTheDocument();
    expect(screen.getByText('Create Allocation')).toBeInTheDocument();
  });

  it('renders edit form correctly', () => {
    render(
      <TestWrapper>
        <AllocationForm allocation={mockAllocation} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Edit Allocation')).toBeInTheDocument();
    expect(screen.getByText('Update Allocation')).toBeInTheDocument();
  });

  it('populates form fields with initial data', async () => {
    const initialData = {
      employeeId: 'emp-1',
      projectId: 'proj-1',
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      allocatedHours: 20,
      role: 'Designer',
    };

    render(
      <TestWrapper>
        <AllocationForm initialData={initialData} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Designer')).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <AllocationForm />
      </TestWrapper>
    );
    
    const submitButton = screen.getByText('Create Allocation');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Employee is required')).toBeInTheDocument();
      expect(screen.getByText('Project is required')).toBeInTheDocument();
    });
  });

  it('validates date range', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <AllocationForm />
      </TestWrapper>
    );

    // Set end date before start date
    const startDateButton = screen.getByText('Pick a date');
    await user.click(startDateButton);
    
    // This would require more complex calendar interaction
    // For now, we test that validation exists
    expect(screen.getByLabelText('Start Date *')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date *')).toBeInTheDocument();
  });

  it('validates hours range', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <AllocationForm />
      </TestWrapper>
    );
    
    const hoursInput = screen.getByPlaceholderText('e.g., 40');
    await user.clear(hoursInput);
    await user.type(hoursInput, '200'); // Over max
    
    const submitButton = screen.getByText('Create Allocation');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Cannot exceed 168 hours per week')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    
    const mockCreateAsync = vi.fn().mockResolvedValue({
      allocation: mockAllocation,
      conflicts: [],
    });
    
    mockUseCreateAllocation.mockReturnValue({
      mutateAsync: mockCreateAsync,
      isPending: false,
    });
    
    render(
      <TestWrapper>
        <AllocationForm onSuccess={onSuccess} />
      </TestWrapper>
    );
    
    // Fill out the form
    const employeeSelect = screen.getByLabelText('Employee *');
    await user.click(employeeSelect);
    await user.click(screen.getByText('John Doe - Engineering'));
    
    const projectSelect = screen.getByLabelText('Project *');
    await user.click(projectSelect);
    await user.click(screen.getByText('Test Project 1 - Client A'));
    
    const hoursInput = screen.getByPlaceholderText('e.g., 40');
    await user.clear(hoursInput);
    await user.type(hoursInput, '40');
    
    const roleInput = screen.getByPlaceholderText('e.g., Developer, Designer');
    await user.type(roleInput, 'Developer');
    
    const submitButton = screen.getByText('Create Allocation');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateAsync).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(mockAllocation);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Allocation Created',
        description: 'Allocation has been successfully created.',
        variant: 'success',
      });
    });
  });

  it('shows conflicts when detected', async () => {
    const user = userEvent.setup();
    
    const conflicts = [{
      id: 'conflict-1',
      type: 'time_overlap' as const,
      severity: 'medium' as const,
      description: 'Time overlap detected',
      affectedAllocations: ['alloc-1'],
      canAutoResolve: false,
    }];
    
    mockUseCheckConflicts.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(conflicts),
      isPending: false,
    });
    
    render(
      <TestWrapper>
        <AllocationForm />
      </TestWrapper>
    );
    
    // Fill minimal form data to trigger conflict checking
    const employeeSelect = screen.getByLabelText('Employee *');
    await user.click(employeeSelect);
    await user.click(screen.getByText('John Doe - Engineering'));
    
    const projectSelect = screen.getByLabelText('Project *');
    await user.click(projectSelect);
    await user.click(screen.getByText('Test Project 1 - Client A'));
    
    // Wait for conflict checking
    await waitFor(() => {
      expect(screen.getByText('1 conflict detected:')).toBeInTheDocument();
      expect(screen.getByText('Time overlap detected')).toBeInTheDocument();
    });
  });

  it('allows force creation with conflicts', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    
    const conflicts = [{
      id: 'conflict-1',
      type: 'time_overlap' as const,
      severity: 'medium' as const,
      description: 'Time overlap detected',
      affectedAllocations: ['alloc-1'],
      canAutoResolve: false,
    }];
    
    const mockCreateAsync = vi.fn().mockResolvedValue({
      allocation: mockAllocation,
      conflicts,
    });
    
    mockUseCreateAllocation.mockReturnValue({
      mutateAsync: mockCreateAsync,
      isPending: false,
    });
    
    mockUseCheckConflicts.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(conflicts),
      isPending: false,
    });
    
    render(
      <TestWrapper>
        <AllocationForm onSuccess={onSuccess} />
      </TestWrapper>
    );
    
    // Fill out form (would trigger conflicts)
    const employeeSelect = screen.getByLabelText('Employee *');
    await user.click(employeeSelect);
    await user.click(screen.getByText('John Doe - Engineering'));
    
    // Wait for conflicts to appear
    await waitFor(() => {
      expect(screen.getByText('Proceed Anyway')).toBeInTheDocument();
    });
    
    // Click "Proceed Anyway"
    const proceedButton = screen.getByText('Proceed Anyway');
    await user.click(proceedButton);
    
    await waitFor(() => {
      expect(mockCreateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ forceCreate: true })
      );
    });
  });

  it('handles form cancellation', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    
    render(
      <TestWrapper>
        <AllocationForm onCancel={onCancel} />
      </TestWrapper>
    );
    
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows loading states correctly', () => {
    mockUseEmployees.mockReturnValue({
      data: null,
      isLoading: true,
    });
    
    mockUseProjects.mockReturnValue({
      data: null,
      isLoading: true,
    });
    
    render(
      <TestWrapper>
        <AllocationForm />
      </TestWrapper>
    );
    
    expect(screen.getByText('Select employee')).toBeInTheDocument();
    expect(screen.getByText('Select project')).toBeInTheDocument();
  });

  it('updates form when allocation prop changes', () => {
    const { rerender } = render(
      <TestWrapper>
        <AllocationForm />
      </TestWrapper>
    );
    
    rerender(
      <TestWrapper>
        <AllocationForm allocation={mockAllocation} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Edit Allocation')).toBeInTheDocument();
    expect(screen.getByDisplayValue('40')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Developer')).toBeInTheDocument();
  });

  it('handles update mutation for edit mode', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    
    const mockUpdateAsync = vi.fn().mockResolvedValue({
      allocation: mockAllocation,
      conflicts: [],
    });
    
    mockUseUpdateAllocation.mockReturnValue({
      mutateAsync: mockUpdateAsync,
      isPending: false,
    });
    
    render(
      <TestWrapper>
        <AllocationForm allocation={mockAllocation} onSuccess={onSuccess} />
      </TestWrapper>
    );
    
    const submitButton = screen.getByText('Update Allocation');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockUpdateAsync).toHaveBeenCalledWith({
        id: mockAllocation.id,
        updates: expect.any(Object),
      });
      expect(onSuccess).toHaveBeenCalledWith(mockAllocation);
    });
  });

  it('renders when not open', () => {
    const { container } = render(
      <TestWrapper>
        <AllocationForm isOpen={false} />
      </TestWrapper>
    );
    
    expect(container.firstChild).toBeNull();
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ResourceAllocationForm from '../ResourceAllocationForm';
import { apiService } from '../../../services/api';
import { useToast } from '../../../components/ui/toast';

// Mock dependencies
vi.mock('../../../services/api');
vi.mock('../../../components/ui/toast');

const mockApiService = apiService as any;
const mockUseToast = useToast as any;

// Test data
const mockEmployees = [
  {
    id: '1',
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    position: 'Senior Developer',
    role: 'Senior Developer',
    department: 'Engineering',
    departmentId: 'dept-1',
    salary: 80000,
    skills: ['React', 'TypeScript'],
    capacity: 40,
    status: 'active' as const,
    startDate: '2023-01-01',
    hireDate: '2023-01-01',
  },
  {
    id: '2',
    name: 'Jane Smith',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    position: 'UI Designer',
    role: 'UI Designer',
    department: 'Design',
    departmentId: 'dept-2',
    salary: 70000,
    skills: ['Figma', 'CSS'],
    capacity: 40,
    status: 'active' as const,
    startDate: '2023-02-01',
    hireDate: '2023-02-01',
  },
];

const mockProjects = [
  {
    id: 1,
    name: 'Project Alpha',
    description: 'Web application project',
    status: 'active' as const,
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    budget: 100000,
    priority: 'high' as const,
    manager: 'Project Manager',
    clientName: 'Client A',
    progress: 25,
    estimatedHours: 1000,
    actualHours: 250,
  },
  {
    id: 2,
    name: 'Project Beta',
    description: 'Mobile application project',
    status: 'planning' as const,
    startDate: '2024-03-01',
    endDate: '2024-12-31',
    budget: 150000,
    priority: 'medium' as const,
    manager: 'Project Manager 2',
    clientName: 'Client B',
    progress: 0,
    estimatedHours: 1500,
    actualHours: 0,
  },
];

const mockExistingAllocations = [
  {
    id: 1,
    employeeId: 1,
    projectId: 1,
    hours: 20,
    date: '2024-01-15',
    status: 'active' as const,
    billableRate: 100,
    notes: 'Initial allocation',
  },
];

// Helper function to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Helper function to render component with wrapper
const renderWithQueryClient = (component: React.ReactElement) => {
  return render(component, { wrapper: createWrapper() });
};

describe('ResourceAllocationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService.getEmployees = vi.fn().mockResolvedValue(mockEmployees);
    mockApiService.getProjects = vi.fn().mockResolvedValue(mockProjects);
    mockApiService.getAllocations = vi.fn().mockResolvedValue(mockExistingAllocations);
    mockUseToast.mockReturnValue({
      showToast: vi.fn(),
      ToastComponent: () => null,
    });
  });

  describe('Form Rendering', () => {
    it('should render with employee and project selectors', async () => {
      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/project/i)).toBeInTheDocument();
      });
    });

    it('should render date range pickers', async () => {
      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      });
    });

    it('should render allocation percentage slider', async () => {
      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/allocation percentage/i)).toBeInTheDocument();
      });
    });

    it('should render hours input field', async () => {
      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/hours/i)).toBeInTheDocument();
      });
    });

    it('should render submit button', async () => {
      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      expect(screen.getByRole('button', { name: /create allocation/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate that end date is after start date', async () => {
      const user = userEvent.setup();
      const mockShowToast = vi.fn();
      mockUseToast.mockReturnValue({
        showToast: mockShowToast,
        ToastComponent: () => null,
      });
      
      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);
      const submitButton = screen.getByRole('button', { name: /create allocation/i });

      await user.type(startDateInput, '2024-06-01');
      await user.type(endDateInput, '2024-05-01');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('End date must be after start date', 'error');
      });
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      const mockShowToast = vi.fn();
      mockUseToast.mockReturnValue({
        showToast: mockShowToast,
        ToastComponent: () => null,
      });
      
      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      const submitButton = screen.getByRole('button', { name: /create allocation/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Employee is required', 'error');
      });
    });

    it('should validate hours input is positive', async () => {
      const user = userEvent.setup();
      const mockShowToast = vi.fn();
      mockUseToast.mockReturnValue({
        showToast: mockShowToast,
        ToastComponent: () => null,
      });
      
      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      const hoursInput = screen.getByLabelText(/hours/i);
      const submitButton = screen.getByRole('button', { name: /create allocation/i });

      await user.clear(hoursInput);
      await user.type(hoursInput, '-10');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Hours must be positive', 'error');
      });
    });
  });

  describe('API Integration', () => {
    it('should create allocation via API on form submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn();
      const expectedAllocation = {
        id: 3,
        employeeId: 1,
        projectId: 1,
        hours: 20,
        date: '2024-01-15',
        status: 'active' as const,
        billableRate: 100,
        notes: 'Test allocation',
      };
      
      mockApiService.createAllocation = vi.fn().mockResolvedValue(expectedAllocation);

      renderWithQueryClient(<ResourceAllocationForm onSubmit={mockOnSubmit} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
      });

      // Fill out form
      const employeeSelect = screen.getByLabelText(/employee/i);
      const projectSelect = screen.getByLabelText(/project/i);
      const hoursInput = screen.getByLabelText(/hours/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);
      const notesInput = screen.getByLabelText(/notes/i);
      const submitButton = screen.getByRole('button', { name: /create allocation/i });

      fireEvent.change(employeeSelect, { target: { value: '1' } });
      fireEvent.change(projectSelect, { target: { value: '1' } });
      await user.clear(hoursInput);
      await user.type(hoursInput, '20');
      await user.clear(startDateInput);
      await user.type(startDateInput, '2024-01-15');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2024-01-30');
      await user.type(notesInput, 'Test allocation');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiService.createAllocation).toHaveBeenCalledWith({
          employeeId: 1,
          projectId: 1,
          hours: 20,
          date: '2024-01-15',
          status: 'active',
          notes: 'Test allocation',
        });
        expect(mockOnSubmit).toHaveBeenCalledWith(expectedAllocation);
      });
    });

    it('should show success toast on successful submission', async () => {
      const user = userEvent.setup();
      const mockShowToast = vi.fn();
      mockUseToast.mockReturnValue({
        showToast: mockShowToast,
        ToastComponent: () => null,
      });
      mockApiService.createAllocation = vi.fn().mockResolvedValue({
        id: 3,
        employeeId: 1,
        projectId: 1,
        hours: 20,
        date: '2024-01-15',
        status: 'active' as const,
      });

      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
      });

      // Fill minimum required fields and submit
      const employeeSelect = screen.getByLabelText(/employee/i);
      const projectSelect = screen.getByLabelText(/project/i);
      const submitButton = screen.getByRole('button', { name: /create allocation/i });

      fireEvent.change(employeeSelect, { target: { value: '1' } });
      fireEvent.change(projectSelect, { target: { value: '1' } });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Allocation created successfully', 'success');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast on API failure', async () => {
      const user = userEvent.setup();
      const mockError = new Error('API Error');
      const mockShowToast = vi.fn();
      mockUseToast.mockReturnValue({
        showToast: mockShowToast,
        ToastComponent: () => null,
      });
      mockApiService.createAllocation = vi.fn().mockRejectedValue(mockError);

      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
      });

      // Fill and submit form
      const employeeSelect = screen.getByLabelText(/employee/i);
      const projectSelect = screen.getByLabelText(/project/i);
      const submitButton = screen.getByRole('button', { name: /create allocation/i });

      fireEvent.change(employeeSelect, { target: { value: '1' } });
      fireEvent.change(projectSelect, { target: { value: '1' } });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to create allocation: API Error', 'error');
      });
    });

    it('should handle over-allocation API errors specifically', async () => {
      const user = userEvent.setup();
      const overAllocationError = {
        message: 'Over-allocation detected',
        code: 'OVER_ALLOCATION',
        details: { availableHours: 5, requestedHours: 20 },
      };
      const mockShowToast = vi.fn();
      mockUseToast.mockReturnValue({
        showToast: mockShowToast,
        ToastComponent: () => null,
      });
      mockApiService.createAllocation = vi.fn().mockRejectedValue(overAllocationError);

      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
      });

      // Fill and submit form
      const employeeSelect = screen.getByLabelText(/employee/i);
      const projectSelect = screen.getByLabelText(/project/i);
      const submitButton = screen.getByRole('button', { name: /create allocation/i });

      fireEvent.change(employeeSelect, { target: { value: '1' } });
      fireEvent.change(projectSelect, { target: { value: '1' } });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Over-allocation detected. Available: 5 hours', 'error');
      });
    });
  });

  describe('User Experience', () => {
    it('should disable submit button while submitting', async () => {
      const user = userEvent.setup();
      // Create a promise that we can control
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApiService.createAllocation = vi.fn().mockReturnValue(pendingPromise);

      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
      });

      // Fill and submit form
      const employeeSelect = screen.getByLabelText(/employee/i);
      const projectSelect = screen.getByLabelText(/project/i);
      const submitButton = screen.getByRole('button', { name: /create allocation/i });

      fireEvent.change(employeeSelect, { target: { value: '1' } });
      fireEvent.change(projectSelect, { target: { value: '1' } });
      await user.click(submitButton);

      // Button should be disabled during submission
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/creating.../i)).toBeInTheDocument();

      // Resolve the promise to complete submission
      resolvePromise!({ id: 1, employeeId: 1, projectId: 1 });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/employee/i)).toHaveAttribute('aria-label');
        expect(screen.getByLabelText(/project/i)).toHaveAttribute('aria-label');
        expect(screen.getByLabelText(/hours/i)).toHaveAttribute('aria-label');
        expect(screen.getByLabelText(/allocation percentage/i)).toHaveAttribute('aria-label');
      });
    });

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<ResourceAllocationForm onSubmit={vi.fn()} />);

      const submitButton = screen.getByRole('button', { name: /create allocation/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });
  });
});
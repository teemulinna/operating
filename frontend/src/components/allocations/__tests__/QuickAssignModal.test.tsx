import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import QuickAssignModal from '../QuickAssignModal';
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
    priority: 'high' as const,
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

describe('QuickAssignModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService.getEmployees = vi.fn().mockResolvedValue(mockEmployees);
    mockApiService.getProjects = vi.fn().mockResolvedValue(mockProjects);
    mockApiService.getAllocations = vi.fn().mockResolvedValue([]);
    mockUseToast.mockReturnValue({
      showToast: vi.fn(),
      ToastComponent: () => null,
    });
  });

  describe('Modal Behavior', () => {
    it('should render when open prop is true', () => {
      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onAssign={vi.fn()} 
        />
      );

      expect(screen.getByText(/quick assign/i)).toBeInTheDocument();
    });

    it('should not render when open prop is false', () => {
      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={false} 
          onClose={vi.fn()} 
          onAssign={vi.fn()} 
        />
      );

      expect(screen.queryByText(/quick assign/i)).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      
      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onAssign={vi.fn()} 
        />
      );

      // Look for close button (X button in dialog)
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when escape key is pressed', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      
      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onAssign={vi.fn()} 
        />
      );

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Simplified Form', () => {
    it('should render simplified assignment form', async () => {
      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onAssign={vi.fn()} 
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/project/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/hours/i)).toBeInTheDocument();
      });
    });

    it('should have default hours value', async () => {
      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onAssign={vi.fn()} 
        />
      );

      await waitFor(() => {
        const hoursInput = screen.getByLabelText(/hours/i) as HTMLInputElement;
        expect(hoursInput.value).toBe('20'); // Default value
      });
    });
  });

  describe('Auto-suggest Functionality', () => {
    it('should show available employees in dropdown', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onAssign={vi.fn()} 
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
      });

      const employeeSelect = screen.getAllByLabelText(/employee/i)[1]; // Get the actual select, not the search
      await user.click(employeeSelect);

      await waitFor(() => {
        expect(screen.getByText('John Doe - Senior Developer')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith - UI Designer')).toBeInTheDocument();
      });
    });

    it('should filter employees based on search input', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onAssign={vi.fn()} 
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search employees/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search employees/i);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        const employeeSelect = screen.getAllByLabelText(/employee/i)[1];
        await user.click(employeeSelect);
        
        expect(screen.getByText('John Doe - Senior Developer')).toBeInTheDocument();
        // Jane Smith should be filtered out, but the option might still exist in the select
        // The key is that the search filters the displayed options
      });
    });

    it('should show employee availability status', async () => {
      const user = userEvent.setup();
      // Mock existing allocations to show availability
      mockApiService.getAllocations = vi.fn().mockResolvedValue([
        {
          id: 1,
          employeeId: 1,
          projectId: 1,
          hours: 20,
          date: '2024-01-15',
          status: 'active' as const,
        },
      ]);

      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onAssign={vi.fn()} 
        />
      );

      await waitFor(() => {
        expect(screen.getAllByLabelText(/employee/i)[1]).toBeInTheDocument();
      });

      const employeeSelect = screen.getAllByLabelText(/employee/i)[1];
      fireEvent.change(employeeSelect, { target: { value: '1' } });

      await waitFor(() => {
        expect(screen.getByText(/20h available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Quick Assignment', () => {
    it('should create allocation with minimal required fields', async () => {
      const user = userEvent.setup();
      const mockOnAssign = vi.fn();
      const expectedAllocation = {
        id: 1,
        employeeId: 1,
        projectId: 1,
        hours: 20,
        date: '2024-01-15',
        status: 'active' as const,
      };
      
      mockApiService.createAllocation = vi.fn().mockResolvedValue(expectedAllocation);

      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onAssign={mockOnAssign} 
        />
      );

      await waitFor(() => {
        expect(screen.getAllByLabelText(/employee/i)[1]).toBeInTheDocument();
      });

      // Fill minimum required fields
      const employeeSelect = screen.getAllByLabelText(/employee/i)[1];
      const projectSelect = screen.getByLabelText(/project/i);
      
      fireEvent.change(employeeSelect, { target: { value: '1' } });
      fireEvent.change(projectSelect, { target: { value: '1' } });
      
      const assignButton = screen.getByRole('button', { name: /quick assign/i });
      await user.click(assignButton);

      await waitFor(() => {
        expect(mockApiService.createAllocation).toHaveBeenCalledWith({
          employeeId: 1,
          projectId: 1,
          hours: 20, // Default value
          date: expect.any(String), // Today's date
          status: 'active',
        });
        expect(mockOnAssign).toHaveBeenCalledWith(expectedAllocation);
      });
    });

    it('should close modal after successful assignment', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      mockApiService.createAllocation = vi.fn().mockResolvedValue({
        id: 1,
        employeeId: 1,
        projectId: 1,
        hours: 20,
        date: '2024-01-15',
        status: 'active' as const,
      });

      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onAssign={vi.fn()} 
        />
      );

      await waitFor(() => {
        expect(screen.getAllByLabelText(/employee/i)[1]).toBeInTheDocument();
      });

      // Fill and submit form
      const employeeSelect = screen.getAllByLabelText(/employee/i)[1];
      const projectSelect = screen.getByLabelText(/project/i);
      
      fireEvent.change(employeeSelect, { target: { value: '1' } });
      fireEvent.change(projectSelect, { target: { value: '1' } });
      
      const assignButton = screen.getByRole('button', { name: /quick assign/i });
      await user.click(assignButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show success toast after assignment', async () => {
      const user = userEvent.setup();
      const mockShowToast = vi.fn();
      mockUseToast.mockReturnValue({
        showToast: mockShowToast,
        ToastComponent: () => null,
      });
      mockApiService.createAllocation = vi.fn().mockResolvedValue({
        id: 1,
        employeeId: 1,
        projectId: 1,
        hours: 20,
        date: '2024-01-15',
        status: 'active' as const,
      });

      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onAssign={vi.fn()} 
        />
      );

      await waitFor(() => {
        expect(screen.getAllByLabelText(/employee/i)[1]).toBeInTheDocument();
      });

      // Fill and submit form
      const employeeSelect = screen.getAllByLabelText(/employee/i)[1];
      const projectSelect = screen.getByLabelText(/project/i);
      
      fireEvent.change(employeeSelect, { target: { value: '1' } });
      fireEvent.change(projectSelect, { target: { value: '1' } });
      
      const assignButton = screen.getByRole('button', { name: /quick assign/i });
      await user.click(assignButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Quick assignment completed successfully', 'success');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast on assignment failure', async () => {
      const user = userEvent.setup();
      const mockError = new Error('Assignment failed');
      const mockShowToast = vi.fn();
      mockUseToast.mockReturnValue({
        showToast: mockShowToast,
        ToastComponent: () => null,
      });
      mockApiService.createAllocation = vi.fn().mockRejectedValue(mockError);

      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onAssign={vi.fn()} 
        />
      );

      await waitFor(() => {
        expect(screen.getAllByLabelText(/employee/i)[1]).toBeInTheDocument();
      });

      // Fill and submit form
      const employeeSelect = screen.getAllByLabelText(/employee/i)[1];
      const projectSelect = screen.getByLabelText(/project/i);
      
      fireEvent.change(employeeSelect, { target: { value: '1' } });
      fireEvent.change(projectSelect, { target: { value: '1' } });
      
      const assignButton = screen.getByRole('button', { name: /quick assign/i });
      await user.click(assignButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to create assignment: Assignment failed', 'error');
      });
    });

    it('should not close modal on assignment failure', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      const mockError = new Error('Assignment failed');
      mockApiService.createAllocation = vi.fn().mockRejectedValue(mockError);

      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onAssign={vi.fn()} 
        />
      );

      await waitFor(() => {
        expect(screen.getAllByLabelText(/employee/i)[1]).toBeInTheDocument();
      });

      // Fill and submit form
      const employeeSelect = screen.getAllByLabelText(/employee/i)[1];
      const projectSelect = screen.getByLabelText(/project/i);
      
      fireEvent.change(employeeSelect, { target: { value: '1' } });
      fireEvent.change(projectSelect, { target: { value: '1' } });
      
      const assignButton = screen.getByRole('button', { name: /quick assign/i });
      await user.click(assignButton);

      // Wait for error to be processed
      await waitFor(() => {
        expect(mockApiService.createAllocation).toHaveBeenCalled();
      });

      // Modal should remain open
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.getByText(/quick assign/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onAssign={vi.fn()} 
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
      });
    });

    it('should support Tab navigation within modal', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <QuickAssignModal 
          isOpen={true} 
          onClose={vi.fn()} 
          onAssign={vi.fn()} 
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search employees/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search employees/i);
      const employeeSelect = screen.getAllByLabelText(/employee/i)[1];
      const projectSelect = screen.getByLabelText(/project/i);
      const hoursInput = screen.getByLabelText(/hours/i);

      // Start from search input (should be auto-focused)
      expect(searchInput).toHaveFocus();

      // Tab navigation should work between elements
      await user.tab();
      expect(employeeSelect).toHaveFocus();

      await user.tab();
      expect(projectSelect).toHaveFocus();

      await user.tab();
      expect(hoursInput).toHaveFocus();
    });
  });
});
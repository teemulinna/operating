import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeList } from '@/components/employees/EmployeeList';
import { EmployeeService } from '@/services/api';
import type { Employee, EmployeesResponse } from '@/types/employee';

// Mock the API service
vi.mock('@/services/api');
const mockEmployeeService = vi.mocked(EmployeeService);

// Mock data
const mockEmployees: Employee[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0123',
    department: 'Engineering',
    position: 'Software Engineer',
    salary: 75000,
    startDate: '2024-01-15T00:00:00Z',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '555-0456',
    department: 'Marketing',
    position: 'Marketing Manager',
    salary: 68000,
    startDate: '2023-06-01T00:00:00Z',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockEmployeesResponse: EmployeesResponse = {
  employees: mockEmployees,
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const mockDepartments = ['Engineering', 'Marketing', 'Sales'];
const mockPositions = ['Software Engineer', 'Marketing Manager', 'Sales Representative'];

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('EmployeeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockEmployeeService.getEmployees.mockResolvedValue(mockEmployeesResponse);
    mockEmployeeService.getDepartments.mockResolvedValue(mockDepartments);
    mockEmployeeService.getPositions.mockResolvedValue(mockPositions);
    mockEmployeeService.deleteEmployee.mockResolvedValue();
    mockEmployeeService.exportCSV.mockResolvedValue(new Blob(['csv data'], { type: 'text/csv' }));
  });

  it('renders employee list with data', async () => {
    render(
      <TestWrapper>
        <EmployeeList />
      </TestWrapper>
    );

    // Check for loading state initially
    expect(screen.getByText('Loading employees...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Check employee details
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Marketing Manager')).toBeInTheDocument();
  });

  it('shows employee count', async () => {
    render(
      <TestWrapper>
        <EmployeeList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('2 employees')).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EmployeeList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search employees by name, email, or department...');
    await user.type(searchInput, 'John');

    // Verify API is called with search filter
    await waitFor(() => {
      expect(mockEmployeeService.getEmployees).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'John' }),
        expect.any(Object)
      );
    });
  });

  it('handles filter functionality', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EmployeeList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open filters
    const filterButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filterButton);

    // Check filter form is visible
    expect(screen.getByText('Department')).toBeInTheDocument();
    expect(screen.getByText('Position')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('handles sorting functionality', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EmployeeList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click on email header to sort
    const emailHeader = screen.getByText('Email');
    await user.click(emailHeader);

    // Verify API is called with sort parameters
    await waitFor(() => {
      expect(mockEmployeeService.getEmployees).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ 
          sortBy: 'email', 
          sortOrder: 'asc',
          page: 1
        })
      );
    });

    // Click again to reverse sort
    await user.click(emailHeader);

    await waitFor(() => {
      expect(mockEmployeeService.getEmployees).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ 
          sortBy: 'email', 
          sortOrder: 'desc',
          page: 1
        })
      );
    });
  });

  it('handles employee actions', async () => {
    const user = userEvent.setup();
    const mockOnEmployeeSelect = vi.fn();
    
    render(
      <TestWrapper>
        <EmployeeList onEmployeeSelect={mockOnEmployeeSelect} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find action buttons for first employee
    const actionButtons = screen.getAllByRole('button');
    const viewButton = actionButtons.find(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('lucide-eye')
    );
    const editButton = actionButtons.find(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('lucide-edit')
    );
    const deleteButton = actionButtons.find(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('lucide-trash-2')
    );

    expect(viewButton).toBeInTheDocument();
    expect(editButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();

    // Test view action
    if (viewButton) {
      await user.click(viewButton);
      expect(mockOnEmployeeSelect).toHaveBeenCalledWith(mockEmployees[0]);
    }
  });

  it('handles employee deletion with confirmation', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm
    const mockConfirm = vi.fn().mockReturnValue(true);
    window.confirm = mockConfirm;
    
    render(
      <TestWrapper>
        <EmployeeList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click delete button
    const actionButtons = screen.getAllByRole('button');
    const deleteButton = actionButtons.find(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('lucide-trash-2')
    );

    if (deleteButton) {
      await user.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete John Doe?');
      expect(mockEmployeeService.deleteEmployee).toHaveBeenCalledWith(1);
    }
  });

  it('handles CSV export', async () => {
    const user = userEvent.setup();
    
    // Mock URL.createObjectURL and related functions
    const mockCreateObjectURL = vi.fn().mockReturnValue('mock-url');
    const mockRevokeObjectURL = vi.fn();
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;

    render(
      <TestWrapper>
        <EmployeeList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    await user.click(exportButton);

    await waitFor(() => {
      expect(mockEmployeeService.exportCSV).toHaveBeenCalled();
    });
  });

  it('opens add employee dialog', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EmployeeList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add employee/i });
    await user.click(addButton);

    // Should open the employee dialog
    await waitFor(() => {
      expect(screen.getByText('Add New Employee')).toBeInTheDocument();
    });
  });

  it('opens CSV import dialog', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EmployeeList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const importButton = screen.getByRole('button', { name: /import csv/i });
    await user.click(importButton);

    // Should open the CSV import dialog
    await waitFor(() => {
      expect(screen.getByText('Import Employees from CSV')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock API to return error
    mockEmployeeService.getEmployees.mockRejectedValue(new Error('API Error'));
    
    render(
      <TestWrapper>
        <EmployeeList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/error loading employees/i)).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it('shows empty state when no employees', async () => {
    mockEmployeeService.getEmployees.mockResolvedValue({
      employees: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    
    render(
      <TestWrapper>
        <EmployeeList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No employees found matching your criteria.')).toBeInTheDocument();
    });
  });

  it('handles pagination', async () => {
    const user = userEvent.setup();
    
    // Mock response with multiple pages
    mockEmployeeService.getEmployees.mockResolvedValue({
      employees: mockEmployees,
      total: 25,
      page: 1,
      limit: 20,
      totalPages: 2,
    });
    
    render(
      <TestWrapper>
        <EmployeeList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Check pagination controls
    expect(screen.getByText('Showing 1 to 20 of 25 results')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();

    // Test next page
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(mockEmployeeService.getEmployees).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it('clears filters correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <EmployeeList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open filters
    const filterButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filterButton);

    // Set a search term
    const searchInput = screen.getByPlaceholderText('Search employees by name, email, or department...');
    await user.type(searchInput, 'test search');

    // Clear filters
    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    await user.click(clearButton);

    // Verify search input is cleared
    expect(searchInput).toHaveValue('');
  });
});
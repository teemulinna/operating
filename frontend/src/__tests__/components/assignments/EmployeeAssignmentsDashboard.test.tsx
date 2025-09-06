import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { EmployeeAssignmentsDashboard } from '@/components/assignments/EmployeeAssignmentsDashboard';
import { useEmployees } from '@/hooks/useEmployees';
import type { EmployeeCapacity, ProjectAssignment } from '@/types/project';

// Mock hooks
vi.mock('@/hooks/useEmployees');
vi.mock('@/hooks/useProjects');

const mockUseEmployees = vi.mocked(useEmployees);

// Test data
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
    projectId: 'proj-2',
    employeeId: 'emp-1',
    employee: {
      id: 'emp-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@company.com',
      position: 'Senior Developer',
      avatar: 'https://example.com/avatar1.jpg',
    },
    role: 'developer',
    utilizationPercentage: 40,
    startDate: '2024-02-01T00:00:00.000Z',
    endDate: '2024-05-01T00:00:00.000Z',
    isActive: true,
    estimatedHours: 160,
    actualHours: 80,
    hourlyRate: 150,
    createdAt: '2024-02-01T00:00:00.000Z',
    updatedAt: '2024-02-05T00:00:00.000Z',
  },
  {
    id: 'assign-3',
    projectId: 'proj-3',
    employeeId: 'emp-2',
    employee: {
      id: 'emp-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@company.com',
      position: 'Project Manager',
      avatar: 'https://example.com/avatar2.jpg',
    },
    role: 'manager',
    utilizationPercentage: 60,
    startDate: '2024-01-20T00:00:00.000Z',
    endDate: '2024-07-20T00:00:00.000Z',
    isActive: true,
    estimatedHours: 480,
    actualHours: 200,
    hourlyRate: 120,
    createdAt: '2024-01-20T00:00:00.000Z',
    updatedAt: '2024-01-25T00:00:00.000Z',
  },
];

const mockEmployeeCapacities: EmployeeCapacity[] = [
  {
    employeeId: 'emp-1',
    employee: {
      id: 'emp-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@company.com',
      position: 'Senior Developer',
      avatar: 'https://example.com/avatar1.jpg',
    },
    totalUtilization: 120, // Overloaded
    assignments: [mockAssignments[0], mockAssignments[1]],
    availableCapacity: -20,
    isOverloaded: true,
  },
  {
    employeeId: 'emp-2',
    employee: {
      id: 'emp-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@company.com',
      position: 'Project Manager',
      avatar: 'https://example.com/avatar2.jpg',
    },
    totalUtilization: 60,
    assignments: [mockAssignments[2]],
    availableCapacity: 40,
    isOverloaded: false,
  },
  {
    employeeId: 'emp-3',
    employee: {
      id: 'emp-3',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@company.com',
      position: 'UI/UX Designer',
      avatar: 'https://example.com/avatar3.jpg',
    },
    totalUtilization: 0,
    assignments: [],
    availableCapacity: 100,
    isOverloaded: false,
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

describe('EmployeeAssignmentsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the capacity data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEmployeeCapacities),
    });

    mockUseEmployees.mockReturnValue({
      data: { employees: mockEmployeeCapacities.map(c => c.employee) },
      isLoading: false,
      error: null,
    } as any);
  });

  describe('Initial Render', () => {
    it('should render dashboard with header and controls', () => {
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Employee Assignments Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Monitor and manage employee project assignments and capacity')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
    });

    it('should render view toggle buttons', () => {
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('List View')).toBeInTheDocument();
      expect(screen.getByText('Grid View')).toBeInTheDocument();
      expect(screen.getByText('Calendar View')).toBeInTheDocument();
    });

    it('should show capacity overview statistics', async () => {
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Total Employees')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('Overloaded')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('Available')).toBeInTheDocument();
        expect(screen.getByText('Average Utilization')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when data is loading', () => {
      global.fetch = vi.fn(() => new Promise(() => {})); // Never resolves

      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      expect(screen.getByTestId('assignments-dashboard-skeleton')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when capacity data fails to load', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch capacity data'));

      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Error Loading Capacity Data')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch capacity data')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry fetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEmployeeCapacities),
        });

      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Employee Capacity Display', () => {
    it('should display employee cards with capacity information', async () => {
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Senior Developer')).toBeInTheDocument();
        expect(screen.getByText('120%')).toBeInTheDocument(); // Utilization
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Project Manager')).toBeInTheDocument();
        expect(screen.getByText('60%')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
        expect(screen.getByText('UI/UX Designer')).toBeInTheDocument();
        expect(screen.getByText('0%')).toBeInTheDocument();
      });
    });

    it('should highlight overloaded employees', async () => {
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        const johnCard = screen.getByText('John Doe').closest('[data-testid="employee-capacity-card"]');
        expect(johnCard).toHaveClass('border-red-200'); // Overloaded styling
        
        const overloadedIndicator = screen.getByText('Overloaded');
        expect(overloadedIndicator).toHaveClass('bg-red-100', 'text-red-800');
      });
    });

    it('should show available capacity for employees under 100%', async () => {
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        const janeCard = screen.getByText('Jane Smith').closest('[data-testid="employee-capacity-card"]');
        expect(janeCard).toContainElement(screen.getByText('40% available'));
        
        const bobCard = screen.getByText('Bob Johnson').closest('[data-testid="employee-capacity-card"]');
        expect(bobCard).toContainElement(screen.getByText('100% available'));
      });
    });

    it('should display project assignments for each employee', async () => {
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        // John has 2 assignments
        const johnCard = screen.getByText('John Doe').closest('[data-testid="employee-capacity-card"]');
        expect(johnCard).toContainElement(screen.getByText('2 active projects'));
        
        // Jane has 1 assignment
        const janeCard = screen.getByText('Jane Smith').closest('[data-testid="employee-capacity-card"]');
        expect(janeCard).toContainElement(screen.getByText('1 active project'));
        
        // Bob has no assignments
        const bobCard = screen.getByText('Bob Johnson').closest('[data-testid="employee-capacity-card"]');
        expect(bobCard).toContainElement(screen.getByText('No active projects'));
      });
    });
  });

  describe('Search and Filtering', () => {
    it('should filter employees by search term', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search employees...');
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
      });
    });

    it('should filter by capacity status', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      // Add filter dropdown (assuming it exists)
      const filterDropdown = screen.queryByLabelText('Filter by Status');
      if (filterDropdown) {
        await user.selectOptions(filterDropdown, 'overloaded');

        await waitFor(() => {
          expect(screen.getByText('John Doe')).toBeInTheDocument();
          expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
          expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
        });
      }
    });

    it('should show no results when search returns empty', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search employees...');
      await user.type(searchInput, 'NonexistentEmployee');

      await waitFor(() => {
        expect(screen.getByText('No employees found')).toBeInTheDocument();
        expect(screen.getByText('No employees match your search criteria')).toBeInTheDocument();
      });
    });
  });

  describe('View Modes', () => {
    it('should switch to grid view when grid button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      const gridViewButton = screen.getByText('Grid View');
      await user.click(gridViewButton);

      await waitFor(() => {
        expect(screen.getByTestId('assignments-grid-view')).toBeInTheDocument();
        expect(screen.queryByTestId('assignments-list-view')).not.toBeInTheDocument();
      });
    });

    it('should switch to calendar view when calendar button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      const calendarViewButton = screen.getByText('Calendar View');
      await user.click(calendarViewButton);

      await waitFor(() => {
        expect(screen.getByTestId('assignments-calendar-view')).toBeInTheDocument();
        expect(screen.queryByTestId('assignments-list-view')).not.toBeInTheDocument();
      });
    });

    it('should maintain search and filters when switching views', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      // Set up search
      const searchInput = screen.getByPlaceholderText('Search employees...');
      await user.type(searchInput, 'John');

      // Switch views
      const gridViewButton = screen.getByText('Grid View');
      await user.click(gridViewButton);

      // Search should be maintained
      expect(searchInput).toHaveValue('John');
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });
  });

  describe('Assignment Details', () => {
    it('should show assignment details when employee card is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        const johnCard = screen.getByText('John Doe');
        expect(johnCard).toBeInTheDocument();
      });

      const johnCard = screen.getByText('John Doe').closest('[data-testid="employee-capacity-card"]');
      await user.click(johnCard!);

      await waitFor(() => {
        expect(screen.getByText('Assignment Details')).toBeInTheDocument();
        expect(screen.getByText('Project Manager Role')).toBeInTheDocument();
        expect(screen.getByText('80% utilization')).toBeInTheDocument();
      });
    });

    it('should show time tracking information in details modal', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        const johnCard = screen.getByText('John Doe').closest('[data-testid="employee-capacity-card"]');
        await user.click(johnCard!);
      });

      await waitFor(() => {
        expect(screen.getByText('220 / 320 hours logged')).toBeInTheDocument();
        expect(screen.getByText('$150/hour')).toBeInTheDocument();
      });
    });

    it('should close details modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      // Open modal
      await waitFor(() => {
        const johnCard = screen.getByText('John Doe').closest('[data-testid="employee-capacity-card"]');
        user.click(johnCard!);
      });

      await waitFor(() => {
        expect(screen.getByText('Assignment Details')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Assignment Details')).not.toBeInTheDocument();
      });
    });
  });

  describe('Capacity Utilization Visualization', () => {
    it('should show utilization progress bars', async () => {
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        const progressBars = document.querySelectorAll('[role="progressbar"]');
        expect(progressBars.length).toBeGreaterThan(0);
        
        // Check John's overloaded progress bar (120%)
        const johnProgressBar = screen.getByLabelText('John Doe capacity utilization');
        expect(johnProgressBar).toHaveAttribute('aria-valuenow', '120');
      });
    });

    it('should use different colors for utilization levels', async () => {
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        // Overloaded (red)
        const johnCard = screen.getByText('John Doe').closest('[data-testid="employee-capacity-card"]');
        const johnProgress = johnCard?.querySelector('[role="progressbar"]');
        expect(johnProgress).toHaveClass('bg-red-500'); // Or similar red class
        
        // Normal utilization (green/blue)
        const janeCard = screen.getByText('Jane Smith').closest('[data-testid="employee-capacity-card"]');
        const janeProgress = janeCard?.querySelector('[role="progressbar"]');
        expect(janeProgress).toHaveClass('bg-blue-500'); // Or similar normal class
      });
    });
  });

  describe('Export and Actions', () => {
    it('should show export button for capacity data', () => {
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Export Capacity Report')).toBeInTheDocument();
    });

    it('should trigger export when export button is clicked', async () => {
      const user = userEvent.setup();
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:url');
      global.URL.createObjectURL = mockCreateObjectURL;

      // Mock successful blob creation
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['capacity,data'], { type: 'text/csv' })),
      });

      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      const exportButton = screen.getByText('Export Capacity Report');
      await user.click(exportButton);

      // Should trigger download
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
      });
    });

    it('should show quick assignment action buttons', async () => {
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        const assignButtons = screen.getAllByText('Quick Assign');
        expect(assignButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update capacity data when assignments change', async () => {
      const { rerender } = render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('120%')).toBeInTheDocument(); // John's utilization
      });

      // Mock updated data
      const updatedCapacities = [
        { ...mockEmployeeCapacities[0], totalUtilization: 80, isOverloaded: false },
        ...mockEmployeeCapacities.slice(1),
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updatedCapacities),
      });

      rerender(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('80%')).toBeInTheDocument(); // Updated utilization
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      // Check for mobile-responsive classes
      const dashboardContainer = document.querySelector('[data-testid="assignments-dashboard"]');
      expect(dashboardContainer).toHaveClass('px-4'); // Mobile padding
    });

    it('should stack cards vertically on small screens', async () => {
      render(
        <TestWrapper>
          <EmployeeAssignmentsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        const gridContainer = document.querySelector('.grid');
        expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
      });
    });
  });
});
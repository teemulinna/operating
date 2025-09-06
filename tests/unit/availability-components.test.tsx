import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Mock components we'll be testing
const AvailabilityDashboard = jest.fn(() => <div>Availability Dashboard</div>);
const StatusIndicator = jest.fn(() => <div>Status Indicator</div>);
const TeamOverview = jest.fn(() => <div>Team Overview</div>);
const ExportManager = jest.fn(() => <div>Export Manager</div>);

// Mock API functions
const mockAvailabilityAPI = {
  getEmployeeStatuses: jest.fn(),
  updateEmployeeStatus: jest.fn(),
  getDepartmentUtilization: jest.fn(),
  subscribeToUpdates: jest.fn(),
  exportEmployees: jest.fn(),
  generateCapacityReport: jest.fn(),
  scheduleReport: jest.fn()
};

const mockEmployees = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
    position: 'Developer',
    departmentName: 'Engineering',
    status: 'available' as const,
    capacity: 100,
    currentProjects: 1,
    availableHours: 40
  },
  {
    id: '2', 
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@test.com',
    position: 'Designer',
    departmentName: 'Design',
    status: 'busy' as const,
    capacity: 75,
    currentProjects: 3,
    availableHours: 10
  }
];

const mockDepartmentData = {
  departmentId: 'eng-1',
  departmentName: 'Engineering',
  totalEmployees: 5,
  availableEmployees: 2,
  busyEmployees: 2,
  unavailableEmployees: 1,
  averageCapacity: 78.5,
  employees: mockEmployees
};

describe('Availability Dashboard Components', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('StatusIndicator Component', () => {
    test('should render available status correctly', () => {
      const employee = mockEmployees[0];
      
      render(<StatusIndicator employee={employee} onStatusChange={jest.fn()} />);
      
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('100% Capacity')).toBeInTheDocument();
      expect(screen.getByText('40h Available')).toBeInTheDocument();
    });

    test('should render busy status with warning styling', () => {
      const employee = mockEmployees[1];
      
      render(<StatusIndicator employee={employee} onStatusChange={jest.fn()} />);
      
      expect(screen.getByText('Busy')).toBeInTheDocument();
      expect(screen.getByText('75% Capacity')).toBeInTheDocument();
      expect(screen.getByText('10h Available')).toBeInTheDocument();
      
      const statusBadge = screen.getByText('Busy').closest('div');
      expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    test('should handle status change interactions', async () => {
      const onStatusChange = jest.fn();
      const employee = mockEmployees[0];
      
      render(<StatusIndicator employee={employee} onStatusChange={onStatusChange} />);
      
      // Click on status dropdown
      const statusButton = screen.getByRole('button', { name: /change status/i });
      await userEvent.click(statusButton);
      
      // Select new status
      const busyOption = screen.getByRole('option', { name: /busy/i });
      await userEvent.click(busyOption);
      
      expect(onStatusChange).toHaveBeenCalledWith(employee.id, 'busy');
    });

    test('should display capacity with visual progress bar', () => {
      const employee = mockEmployees[1];
      
      render(<StatusIndicator employee={employee} capacity={75} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('TeamOverview Component', () => {
    test('should render department utilization metrics', () => {
      render(<TeamOverview departmentData={mockDepartmentData} />);
      
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('5 Total')).toBeInTheDocument();
      expect(screen.getByText('2 Available')).toBeInTheDocument();
      expect(screen.getByText('2 Busy')).toBeInTheDocument();
      expect(screen.getByText('1 Unavailable')).toBeInTheDocument();
      expect(screen.getByText('78.5% Avg Capacity')).toBeInTheDocument();
    });

    test('should render employee cards within team view', () => {
      render(<TeamOverview departmentData={mockDepartmentData} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Developer')).toBeInTheDocument();
      expect(screen.getByText('Designer')).toBeInTheDocument();
    });

    test('should handle department filter changes', async () => {
      const onFilterChange = jest.fn();
      
      render(
        <TeamOverview 
          departmentData={mockDepartmentData} 
          onFilterChange={onFilterChange}
        />
      );
      
      const filterSelect = screen.getByRole('combobox', { name: /filter by status/i });
      await userEvent.selectOptions(filterSelect, 'available');
      
      expect(onFilterChange).toHaveBeenCalledWith({ status: 'available' });
    });

    test('should display utilization charts when enabled', () => {
      render(
        <TeamOverview 
          departmentData={mockDepartmentData} 
          showCharts={true}
        />
      );
      
      expect(screen.getByTestId('utilization-chart')).toBeInTheDocument();
      expect(screen.getByTestId('capacity-trend-chart')).toBeInTheDocument();
    });
  });

  describe('AvailabilityDashboard Component', () => {
    test('should render with employee data and controls', () => {
      mockAvailabilityAPI.getEmployeeStatuses.mockResolvedValue({
        data: mockEmployees,
        total: 2
      });

      renderWithProviders(<AvailabilityDashboard />);
      
      expect(screen.getByText('Resource Availability Dashboard')).toBeInTheDocument();
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    test('should handle real-time status updates', async () => {
      const mockWebSocket = {
        addEventListener: jest.fn(),
        send: jest.fn(),
        close: jest.fn()
      };
      
      mockAvailabilityAPI.subscribeToUpdates.mockReturnValue(mockWebSocket);
      
      renderWithProviders(<AvailabilityDashboard enableRealTime={true} />);
      
      // Simulate WebSocket message
      const statusUpdate = {
        employeeId: '1',
        status: 'busy',
        capacity: 60,
        timestamp: new Date().toISOString()
      };
      
      const messageHandler = mockWebSocket.addEventListener.mock.calls[0][1];
      messageHandler({ data: JSON.stringify(statusUpdate) });
      
      await waitFor(() => {
        expect(screen.getByText('Status updated')).toBeInTheDocument();
      });
    });

    test('should filter employees by availability status', async () => {
      mockAvailabilityAPI.getEmployeeStatuses.mockResolvedValue({
        data: mockEmployees,
        total: 2
      });

      renderWithProviders(<AvailabilityDashboard />);
      
      const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
      await userEvent.selectOptions(statusFilter, 'available');
      
      expect(mockAvailabilityAPI.getEmployeeStatuses).toHaveBeenCalledWith({
        filters: { status: 'available' }
      });
    });

    test('should handle search functionality', async () => {
      mockAvailabilityAPI.getEmployeeStatuses.mockResolvedValue({
        data: mockEmployees,
        total: 2
      });

      renderWithProviders(<AvailabilityDashboard />);
      
      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'John');
      
      // Debounced search should trigger
      await waitFor(() => {
        expect(mockAvailabilityAPI.getEmployeeStatuses).toHaveBeenCalledWith({
          filters: { search: 'John' }
        });
      });
    });
  });

  describe('ExportManager Component', () => {
    test('should render export options and controls', () => {
      render(<ExportManager employees={mockEmployees} />);
      
      expect(screen.getByText('Export Data')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export excel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate pdf report/i })).toBeInTheDocument();
    });

    test('should handle CSV export with field selection', async () => {
      mockAvailabilityAPI.exportEmployees.mockResolvedValue(new Blob());
      
      render(<ExportManager employees={mockEmployees} />);
      
      const csvButton = screen.getByRole('button', { name: /export csv/i });
      await userEvent.click(csvButton);
      
      // Field selection dialog should appear
      expect(screen.getByText('Select Fields to Export')).toBeInTheDocument();
      
      const firstNameField = screen.getByRole('checkbox', { name: /first name/i });
      const emailField = screen.getByRole('checkbox', { name: /email/i });
      
      await userEvent.click(firstNameField);
      await userEvent.click(emailField);
      
      const exportButton = screen.getByRole('button', { name: /confirm export/i });
      await userEvent.click(exportButton);
      
      expect(mockAvailabilityAPI.exportEmployees).toHaveBeenCalledWith({
        format: 'csv',
        fields: ['firstName', 'email'],
        employees: mockEmployees
      });
    });

    test('should handle PDF capacity report generation', async () => {
      mockAvailabilityAPI.generateCapacityReport.mockResolvedValue(new Blob());
      
      render(<ExportManager employees={mockEmployees} />);
      
      const pdfButton = screen.getByRole('button', { name: /generate pdf report/i });
      await userEvent.click(pdfButton);
      
      // Report configuration dialog
      const dateRangeStart = screen.getByLabelText(/start date/i);
      const dateRangeEnd = screen.getByLabelText(/end date/i);
      
      await userEvent.type(dateRangeStart, '2024-01-01');
      await userEvent.type(dateRangeEnd, '2024-12-31');
      
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await userEvent.click(generateButton);
      
      expect(mockAvailabilityAPI.generateCapacityReport).toHaveBeenCalledWith({
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31'
        },
        employees: mockEmployees,
        includeCharts: true
      });
    });

    test('should handle scheduled report configuration', async () => {
      mockAvailabilityAPI.scheduleReport.mockResolvedValue({
        scheduleId: 'sched-123',
        nextRun: '2024-09-13T09:00:00Z'
      });
      
      render(<ExportManager employees={mockEmployees} />);
      
      const scheduleButton = screen.getByRole('button', { name: /schedule reports/i });
      await userEvent.click(scheduleButton);
      
      // Schedule configuration
      const frequencySelect = screen.getByRole('combobox', { name: /frequency/i });
      const formatSelect = screen.getByRole('combobox', { name: /format/i });
      
      await userEvent.selectOptions(frequencySelect, 'weekly');
      await userEvent.selectOptions(formatSelect, 'pdf');
      
      const recipientsInput = screen.getByLabelText(/recipients/i);
      await userEvent.type(recipientsInput, 'manager@test.com');
      
      const scheduleBtn = screen.getByRole('button', { name: /create schedule/i });
      await userEvent.click(scheduleBtn);
      
      expect(mockAvailabilityAPI.scheduleReport).toHaveBeenCalledWith({
        frequency: 'weekly',
        format: 'pdf',
        recipients: ['manager@test.com'],
        reportType: 'capacity_summary'
      });
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle end-to-end workflow: search -> filter -> export', async () => {
      mockAvailabilityAPI.getEmployeeStatuses.mockResolvedValue({
        data: mockEmployees,
        total: 2
      });
      mockAvailabilityAPI.exportEmployees.mockResolvedValue(new Blob());

      renderWithProviders(
        <div>
          <AvailabilityDashboard />
          <ExportManager employees={mockEmployees} />
        </div>
      );
      
      // 1. Search for employees
      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, 'John');
      
      // 2. Apply status filter
      const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
      await userEvent.selectOptions(statusFilter, 'available');
      
      // 3. Export filtered results
      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await userEvent.click(exportButton);
      
      const confirmExport = screen.getByRole('button', { name: /confirm export/i });
      await userEvent.click(confirmExport);
      
      expect(mockAvailabilityAPI.exportEmployees).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'csv',
          filters: { search: 'John', status: 'available' }
        })
      );
    });

    test('should maintain state consistency during real-time updates', async () => {
      const mockWebSocket = {
        addEventListener: jest.fn(),
        send: jest.fn(),
        close: jest.fn()
      };
      
      mockAvailabilityAPI.subscribeToUpdates.mockReturnValue(mockWebSocket);
      mockAvailabilityAPI.getEmployeeStatuses.mockResolvedValue({
        data: mockEmployees,
        total: 2
      });

      renderWithProviders(<AvailabilityDashboard enableRealTime={true} />);
      
      // Initial render
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Simulate real-time update
      const statusUpdate = {
        employeeId: '1',
        status: 'unavailable',
        capacity: 0,
        timestamp: new Date().toISOString()
      };
      
      const messageHandler = mockWebSocket.addEventListener.mock.calls[0][1];
      messageHandler({ data: JSON.stringify(statusUpdate) });
      
      // Verify UI updated
      await waitFor(() => {
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle API failures gracefully', async () => {
      mockAvailabilityAPI.getEmployeeStatuses.mockRejectedValue(
        new Error('Network error')
      );

      renderWithProviders(<AvailabilityDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/error loading availability data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    test('should handle WebSocket connection failures', async () => {
      const mockWebSocket = {
        addEventListener: jest.fn(),
        send: jest.fn(),
        close: jest.fn()
      };
      
      mockAvailabilityAPI.subscribeToUpdates.mockReturnValue(mockWebSocket);

      renderWithProviders(<AvailabilityDashboard enableRealTime={true} />);
      
      // Simulate connection error
      const errorHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      errorHandler?.();
      
      await waitFor(() => {
        expect(screen.getByText(/real-time updates unavailable/i)).toBeInTheDocument();
      });
    });

    test('should handle export failures with user feedback', async () => {
      mockAvailabilityAPI.exportEmployees.mockRejectedValue(
        new Error('Export failed')
      );

      render(<ExportManager employees={mockEmployees} />);
      
      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await userEvent.click(exportButton);
      
      const confirmButton = screen.getByRole('button', { name: /confirm export/i });
      await userEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry export/i })).toBeInTheDocument();
      });
    });
  });
});
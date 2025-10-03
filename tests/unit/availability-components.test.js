"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const react_1 = require("@testing-library/react");
const react_query_1 = require("@tanstack/react-query");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const AvailabilityDashboard = globals_1.jest.fn(() => <div>Availability Dashboard</div>);
const StatusIndicator = globals_1.jest.fn(() => <div>Status Indicator</div>);
const TeamOverview = globals_1.jest.fn(() => <div>Team Overview</div>);
const ExportManager = globals_1.jest.fn(() => <div>Export Manager</div>);
const mockAvailabilityAPI = {
    getEmployeeStatuses: undefined,
    const: mockEmployees = [
        {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@test.com',
            position: 'Developer',
            departmentName: 'Engineering',
            status: 'available',
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
            status: 'busy',
            capacity: 75,
            currentProjects: 3,
            availableHours: 10
        }
    ],
    const: mockDepartmentData = {
        departmentId: 'eng-1',
        departmentName: 'Engineering',
        totalEmployees: 5,
        availableEmployees: 2,
        busyEmployees: 2,
        unavailableEmployees: 1,
        averageCapacity: 78.5,
        employees: mockEmployees
    },
    describe() { }
}();
{
    let queryClient;
    (0, globals_1.beforeEach)(() => {
        queryClient = new react_query_1.QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false }
            }
        });
        globals_1.jest.clearAllMocks();
    });
    const renderWithProviders = (component) => {
        return (0, react_1.render)(<react_query_1.QueryClientProvider client={queryClient}>
        {component}
      </react_query_1.QueryClientProvider>);
    };
    (0, globals_1.describe)('StatusIndicator Component', () => {
        (0, globals_1.test)('should render available status correctly', () => {
            const employee = mockEmployees[0];
            (0, react_1.render)(<StatusIndicator employee={employee} onStatusChange={undefined}/>);
            (0, globals_1.expect)(react_1.screen.getByText('Available')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByText('100% Capacity')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByText('40h Available')).toBeInTheDocument();
        });
        (0, globals_1.test)('should render busy status with warning styling', () => {
            const employee = mockEmployees[1];
            (0, react_1.render)(<StatusIndicator employee={employee} onStatusChange={undefined}/>);
            (0, globals_1.expect)(react_1.screen.getByText('Busy')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByText('75% Capacity')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByText('10h Available')).toBeInTheDocument();
            const statusBadge = react_1.screen.getByText('Busy').closest('div');
            (0, globals_1.expect)(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
        });
        (0, globals_1.test)('should handle status change interactions', async () => {
            const onStatusChange = undefined;
            const employee = mockEmployees[0];
            (0, react_1.render)(<StatusIndicator employee={employee} onStatusChange={onStatusChange}/>);
            const statusButton = react_1.screen.getByRole('button', { name: /change status/i });
            await user_event_1.default.click(statusButton);
            const busyOption = react_1.screen.getByRole('option', { name: /busy/i });
            await user_event_1.default.click(busyOption);
            (0, globals_1.expect)(onStatusChange).toHaveBeenCalledWith(employee.id, 'busy');
        });
        (0, globals_1.test)('should display capacity with visual progress bar', () => {
            const employee = mockEmployees[1];
            (0, react_1.render)(<StatusIndicator employee={employee} capacity={75}/>);
            const progressBar = react_1.screen.getByRole('progressbar');
            (0, globals_1.expect)(progressBar).toHaveAttribute('aria-valuenow', '75');
            (0, globals_1.expect)(progressBar).toHaveAttribute('aria-valuemax', '100');
        });
    });
    (0, globals_1.describe)('TeamOverview Component', () => {
        (0, globals_1.test)('should render department utilization metrics', () => {
            (0, react_1.render)(<TeamOverview departmentData={mockDepartmentData}/>);
            (0, globals_1.expect)(react_1.screen.getByText('Engineering')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByText('5 Total')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByText('2 Available')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByText('2 Busy')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByText('1 Unavailable')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByText('78.5% Avg Capacity')).toBeInTheDocument();
        });
        (0, globals_1.test)('should render employee cards within team view', () => {
            (0, react_1.render)(<TeamOverview departmentData={mockDepartmentData}/>);
            (0, globals_1.expect)(react_1.screen.getByText('John Doe')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByText('Jane Smith')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByText('Developer')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByText('Designer')).toBeInTheDocument();
        });
        (0, globals_1.test)('should handle department filter changes', async () => {
            const onFilterChange = undefined;
            (0, react_1.render)(<TeamOverview departmentData={mockDepartmentData} onFilterChange={onFilterChange}/>);
            const filterSelect = react_1.screen.getByRole('combobox', { name: /filter by status/i });
            await user_event_1.default.selectOptions(filterSelect, 'available');
            (0, globals_1.expect)(onFilterChange).toHaveBeenCalledWith({ status: 'available' });
        });
        (0, globals_1.test)('should display utilization charts when enabled', () => {
            (0, react_1.render)(<TeamOverview departmentData={mockDepartmentData} showCharts={true}/>);
            (0, globals_1.expect)(react_1.screen.getByTestId('utilization-chart')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByTestId('capacity-trend-chart')).toBeInTheDocument();
        });
    });
    (0, globals_1.describe)('AvailabilityDashboard Component', () => {
        (0, globals_1.test)('should render with employee data and controls', () => {
            mockAvailabilityAPI.getEmployeeStatuses.;
            renderWithProviders(<AvailabilityDashboard />);
            (0, globals_1.expect)(react_1.screen.getByText('Resource Availability Dashboard')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByRole('searchbox')).toBeInTheDocument();
            (0, globals_1.expect)(react_1.screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
        });
        (0, globals_1.test)('should handle real-time status updates', async () => {
            const mockWebSocket = {
                addEventListener: undefined,
                mockAvailabilityAPI, : .subscribeToUpdates.,
                const: statusUpdate = {
                    employeeId: '1',
                    status: 'busy',
                    capacity: 60,
                    timestamp: new Date().toISOString()
                },
                const: messageHandler = mockWebSocket.addEventListener.mock.calls[0][1],
                messageHandler({ data: JSON }) { }, : .stringify(statusUpdate)
            };
        });
        await (0, react_1.waitFor)(() => {
            (0, globals_1.expect)(react_1.screen.getByText('Status updated')).toBeInTheDocument();
        });
    });
    (0, globals_1.test)('should filter employees by availability status', async () => {
        mockAvailabilityAPI.getEmployeeStatuses.;
        renderWithProviders(<AvailabilityDashboard />);
        const statusFilter = react_1.screen.getByRole('combobox', { name: /filter by status/i });
        await user_event_1.default.selectOptions(statusFilter, 'available');
        (0, globals_1.expect)(mockAvailabilityAPI.getEmployeeStatuses).toHaveBeenCalledWith({
            filters: { status: 'available' }
        });
    });
    (0, globals_1.test)('should handle search functionality', async () => {
        mockAvailabilityAPI.getEmployeeStatuses.;
        renderWithProviders(<AvailabilityDashboard />);
        const searchInput = react_1.screen.getByRole('searchbox');
        await user_event_1.default.type(searchInput, 'John');
        await (0, react_1.waitFor)(() => {
            (0, globals_1.expect)(mockAvailabilityAPI.getEmployeeStatuses).toHaveBeenCalledWith({
                filters: { search: 'John' }
            });
        });
    });
}
;
(0, globals_1.describe)('ExportManager Component', () => {
    (0, globals_1.test)('should render export options and controls', () => {
        (0, react_1.render)(<ExportManager employees={mockEmployees}/>);
        (0, globals_1.expect)(react_1.screen.getByText('Export Data')).toBeInTheDocument();
        (0, globals_1.expect)(react_1.screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
        (0, globals_1.expect)(react_1.screen.getByRole('button', { name: /export excel/i })).toBeInTheDocument();
        (0, globals_1.expect)(react_1.screen.getByRole('button', { name: /generate pdf report/i })).toBeInTheDocument();
    });
    (0, globals_1.test)('should handle CSV export with field selection', async () => {
        mockAvailabilityAPI.exportEmployees.;
    });
    (0, react_1.render)(<ExportManager employees={mockEmployees}/>);
    const csvButton = react_1.screen.getByRole('button', { name: /export csv/i });
    await user_event_1.default.click(csvButton);
    (0, globals_1.expect)(react_1.screen.getByText('Select Fields to Export')).toBeInTheDocument();
    const firstNameField = react_1.screen.getByRole('checkbox', { name: /first name/i });
    const emailField = react_1.screen.getByRole('checkbox', { name: /email/i });
    await user_event_1.default.click(firstNameField);
    await user_event_1.default.click(emailField);
    const exportButton = react_1.screen.getByRole('button', { name: /confirm export/i });
    await user_event_1.default.click(exportButton);
    (0, globals_1.expect)(mockAvailabilityAPI.exportEmployees).toHaveBeenCalledWith({
        format: 'csv',
        fields: ['firstName', 'email'],
        employees: mockEmployees
    });
});
(0, globals_1.test)('should handle PDF capacity report generation', async () => {
    mockAvailabilityAPI.generateCapacityReport.;
});
(0, react_1.render)(<ExportManager employees={mockEmployees}/>);
const pdfButton = react_1.screen.getByRole('button', { name: /generate pdf report/i });
await user_event_1.default.click(pdfButton);
const dateRangeStart = react_1.screen.getByLabelText(/start date/i);
const dateRangeEnd = react_1.screen.getByLabelText(/end date/i);
await user_event_1.default.type(dateRangeStart, '2024-01-01');
await user_event_1.default.type(dateRangeEnd, '2024-12-31');
const generateButton = react_1.screen.getByRole('button', { name: /generate report/i });
await user_event_1.default.click(generateButton);
(0, globals_1.expect)(mockAvailabilityAPI.generateCapacityReport).toHaveBeenCalledWith({
    dateRange: {
        start: '2024-01-01',
        end: '2024-12-31'
    },
    employees: mockEmployees,
    includeCharts: true
});
;
(0, globals_1.test)('should handle scheduled report configuration', async () => {
    mockAvailabilityAPI.scheduleReport.;
    (0, react_1.render)(<ExportManager employees={mockEmployees}/>);
    const scheduleButton = react_1.screen.getByRole('button', { name: /schedule reports/i });
    await user_event_1.default.click(scheduleButton);
    const frequencySelect = react_1.screen.getByRole('combobox', { name: /frequency/i });
    const formatSelect = react_1.screen.getByRole('combobox', { name: /format/i });
    await user_event_1.default.selectOptions(frequencySelect, 'weekly');
    await user_event_1.default.selectOptions(formatSelect, 'pdf');
    const recipientsInput = react_1.screen.getByLabelText(/recipients/i);
    await user_event_1.default.type(recipientsInput, 'manager@test.com');
    const scheduleBtn = react_1.screen.getByRole('button', { name: /create schedule/i });
    await user_event_1.default.click(scheduleBtn);
    (0, globals_1.expect)(mockAvailabilityAPI.scheduleReport).toHaveBeenCalledWith({
        frequency: 'weekly',
        format: 'pdf',
        recipients: ['manager@test.com'],
        reportType: 'capacity_summary'
    });
});
;
(0, globals_1.describe)('Integration Scenarios', () => {
    (0, globals_1.test)('should handle end-to-end workflow: search -> filter -> export', async () => {
        mockAvailabilityAPI.getEmployeeStatuses.;
        mockAvailabilityAPI.exportEmployees.;
    });
    renderWithProviders(<div>
          <AvailabilityDashboard />
          <ExportManager employees={mockEmployees}/>
        </div>);
    const searchInput = react_1.screen.getByRole('searchbox');
    await user_event_1.default.type(searchInput, 'John');
    const statusFilter = react_1.screen.getByRole('combobox', { name: /filter by status/i });
    await user_event_1.default.selectOptions(statusFilter, 'available');
    const exportButton = react_1.screen.getByRole('button', { name: /export csv/i });
    await user_event_1.default.click(exportButton);
    const confirmExport = react_1.screen.getByRole('button', { name: /confirm export/i });
    await user_event_1.default.click(confirmExport);
    (0, globals_1.expect)(mockAvailabilityAPI.exportEmployees).toHaveBeenCalledWith(globals_1.expect.objectContaining({
        format: 'csv',
        filters: { search: 'John', status: 'available' }
    }));
});
(0, globals_1.test)('should maintain state consistency during real-time updates', async () => {
    const mockWebSocket = {
        addEventListener: undefined,
        mockAvailabilityAPI, : .subscribeToUpdates.,
        mockAvailabilityAPI, : .getEmployeeStatuses.,
        await: (0, react_1.waitFor)(() => {
            (0, globals_1.expect)(react_1.screen.getByText('John Doe')).toBeInTheDocument();
        }),
        const: statusUpdate = {
            employeeId: '1',
            status: 'unavailable',
            capacity: 0,
            timestamp: new Date().toISOString()
        },
        const: messageHandler = mockWebSocket.addEventListener.mock.calls[0][1],
        messageHandler({ data: JSON }) { }, : .stringify(statusUpdate)
    };
});
await (0, react_1.waitFor)(() => {
    (0, globals_1.expect)(react_1.screen.getByText('Unavailable')).toBeInTheDocument();
});
;
;
(0, globals_1.describe)('Error Handling', () => {
    (0, globals_1.test)('should handle API failures gracefully', async () => {
        mockAvailabilityAPI.getEmployeeStatuses;
    });
    renderWithProviders(<AvailabilityDashboard />);
    await (0, react_1.waitFor)(() => {
        (0, globals_1.expect)(react_1.screen.getByText(/error loading availability data/i)).toBeInTheDocument();
        (0, globals_1.expect)(react_1.screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
});
(0, globals_1.test)('should handle WebSocket connection failures', async () => {
    const mockWebSocket = {
        addEventListener: undefined,
        mockAvailabilityAPI, : .subscribeToUpdates.,
        const: errorHandler = mockWebSocket.addEventListener.mock.calls.find(call => call[0] === 'error')?.[1],
        errorHandler
    }();
    await (0, react_1.waitFor)(() => {
        (0, globals_1.expect)(react_1.screen.getByText(/real-time updates unavailable/i)).toBeInTheDocument();
    });
});
(0, globals_1.test)('should handle export failures with user feedback', async () => {
    mockAvailabilityAPI.exportEmployees;
});
(0, react_1.render)(<ExportManager employees={mockEmployees}/>);
const exportButton = react_1.screen.getByRole('button', { name: /export csv/i });
await user_event_1.default.click(exportButton);
const confirmButton = react_1.screen.getByRole('button', { name: /confirm export/i });
await user_event_1.default.click(confirmButton);
await (0, react_1.waitFor)(() => {
    (0, globals_1.expect)(react_1.screen.getByText(/export failed/i)).toBeInTheDocument();
    (0, globals_1.expect)(react_1.screen.getByRole('button', { name: /retry export/i })).toBeInTheDocument();
});
;
;
;
//# sourceMappingURL=availability-components.test.js.map
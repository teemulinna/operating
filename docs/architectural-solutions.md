# Resource Management Platform - Technical Architecture Solutions

> See also: `docs/GUIDELINES/CONVENTIONS_INDEX.md` for coding, API, DB, testing, and deployment conventions referenced by this document.

## Current State Analysis

After analyzing the Resource Management Platform codebase, I've identified these critical architectural issues:

### Current Problems

1. **Monolithic App.tsx**: 1600+ lines with multiple page components
2. **Mock Service Dependencies**: Many services still use mock data
3. **Missing E2E Test Structure**: No comprehensive testing architecture
4. **Inconsistent State Management**: Direct API calls in components
5. **No Service Layer Architecture**: Business logic mixed with UI
6. **Database Schema Inconsistencies**: Mixed naming conventions and missing relationships
7. **Real-time Updates**: WebSocket integration needs standardization
8. **Capacity Calculation Logic**: Complex business rules scattered across components

## 1. Mock Service Replacement Architecture

### Current Issues

- Multiple services contain placeholder/mock implementations
- Inconsistent API client patterns
- Missing error handling standardization
- No service layer abstraction
- Capacity calculation logic scattered across components
- Real-time WebSocket events not standardized
- Database queries not optimized for capacity planning

### Solution: Service Layer Architecture

```typescript
// src/services/base/BaseService.ts
export abstract class BaseService<T, CreateT = Omit<T, 'id'>, UpdateT = Partial<T>> {
  protected abstract endpoint: string;
  protected apiClient: AxiosInstance;

  constructor(apiClient: AxiosInstance) {
    this.apiClient = apiClient;
  }

  async findAll(): Promise<T[]> {
    const response = await this.apiClient.get(`/${this.endpoint}`);
    return response.data.data || response.data;
  }

  async findById(id: string | number): Promise<T | null> {
    try {
      const response = await this.apiClient.get(`/${this.endpoint}/${id}`);
      return response.data.data || response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async create(data: CreateT): Promise<T> {
    const response = await this.apiClient.post(`/${this.endpoint}`, data);
    return response.data.data || response.data;
  }

  async update(id: string | number, data: UpdateT): Promise<T> {
    const response = await this.apiClient.put(`/${this.endpoint}/${id}`, data);
    return response.data.data || response.data;
  }

  async delete(id: string | number): Promise<void> {
    await this.apiClient.delete(`/${this.endpoint}/${id}`);
  }
}
```

### Service Interface Contracts

```typescript
// src/services/interfaces/IEmployeeService.ts
export interface IEmployeeService {
  findAll(): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
  findByDepartment(departmentId: string): Promise<Employee[]>;
  findBySkills(skills: string[]): Promise<Employee[]>;
  create(employee: CreateEmployeeDto): Promise<Employee>;
  update(id: string, updates: UpdateEmployeeDto): Promise<Employee>;
  delete(id: string): Promise<void>;
  getCapacity(id: string, dateRange: DateRange): Promise<CapacityInfo>;
  getAllocations(id: string, dateRange?: DateRange): Promise<ResourceAllocation[]>;
  getRealTimeCapacity(id: string, dateRange: DateRange): Promise<CapacitySnapshot[]>;
  getOverAllocationWarnings(id: string): Promise<OverAllocationWarning[]>;
}

// src/services/interfaces/IProjectService.ts
export interface IProjectService {
  findAll(): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  findByStatus(status: ProjectStatus[]): Promise<Project[]>;
  create(project: CreateProjectDto): Promise<Project>;
  update(id: string, updates: UpdateProjectDto): Promise<Project>;
  delete(id: string): Promise<void>;
  getResourceRequirements(id: string): Promise<ResourceRequirement[]>;
  getTeamMembers(id: string): Promise<Employee[]>;
  getProjectTasks(id: string): Promise<ProjectTask[]>;
  getProjectAllocations(id: string): Promise<ResourceAllocation[]>;
}

// src/services/interfaces/ICapacityService.ts
export interface ICapacityService {
  calculateRealTimeCapacity(employeeId: string, dateRange: DateRange): Promise<CapacitySnapshot[]>;
  detectOverAllocations(employeeId: string, allocation: CreateResourceAllocationInput): Promise<OverAllocationWarning[]>;
  validateAllocation(allocation: CreateResourceAllocationInput): Promise<CapacityValidationResult>;
  generateResolutionSuggestions(warning: OverAllocationWarning): Promise<ResolutionSuggestion[]>;
  recalculateCapacityForPeriod(dateFrom: Date, dateTo: Date): Promise<BatchOperationResult>;
  getCapacityHeatmap(filters: HeatmapFilters): Promise<CapacityHeatmapData>;
  getCapacityTrends(employeeId: string, period: string): Promise<CapacityTrend[]>;
}

// src/services/interfaces/IAllocationService.ts
export interface IAllocationService {
  findAll(): Promise<ResourceAllocation[]>;
  findById(id: string): Promise<ResourceAllocation | null>;
  create(allocation: CreateResourceAllocationInput): Promise<ResourceAllocation>;
  update(id: string, updates: UpdateResourceAllocationInput): Promise<ResourceAllocation>;
  delete(id: string): Promise<void>;
  createWithValidation(allocation: CreateResourceAllocationInput): Promise<ResourceAllocationExtended>;
  getCapacityImpact(employeeId: string, dateRange: DateRange): Promise<CapacityImpact>;
  approveAllocation(id: string, approverId: string): Promise<ResourceAllocation>;
  rejectAllocation(id: string, reason: string): Promise<ResourceAllocation>;
}
```

### Implementation Services

```typescript
// src/services/implementations/EmployeeService.ts
export class EmployeeService extends BaseService<Employee, CreateEmployeeDto, UpdateEmployeeDto> implements IEmployeeService {
  protected endpoint = 'employees';

  async findByDepartment(departmentId: string): Promise<Employee[]> {
    const response = await this.apiClient.get(`/${this.endpoint}?departmentId=${departmentId}`);
    return response.data.data || response.data;
  }

  async findBySkills(skills: string[]): Promise<Employee[]> {
    const skillsQuery = skills.join(',');
    const response = await this.apiClient.get(`/${this.endpoint}?skills=${skillsQuery}`);
    return response.data.data || response.data;
  }

  async getCapacity(id: string, dateRange: DateRange): Promise<CapacityInfo> {
    const response = await this.apiClient.get(`/${this.endpoint}/${id}/capacity`, {
      params: dateRange
    });
    return response.data;
  }

  async getAllocations(id: string, dateRange?: DateRange): Promise<ResourceAllocation[]> {
    const response = await this.apiClient.get(`/${this.endpoint}/${id}/allocations`, {
      params: dateRange
    });
    return response.data.data || response.data;
  }

  async getRealTimeCapacity(id: string, dateRange: DateRange): Promise<CapacitySnapshot[]> {
    const response = await this.apiClient.get(`/api/capacity/employee/${id}/real-time`, {
      params: {
        dateFrom: dateRange.start.toISOString(),
        dateTo: dateRange.end.toISOString()
      }
    });
    return response.data.data || response.data;
  }

  async getOverAllocationWarnings(id: string): Promise<OverAllocationWarning[]> {
    const response = await this.apiClient.get(`/api/capacity/warnings?employeeId=${id}`);
    return response.data.data || response.data;
  }
}

// src/services/implementations/CapacityService.ts
export class CapacityService implements ICapacityService {
  constructor(private apiClient: AxiosInstance) {}

  async calculateRealTimeCapacity(employeeId: string, dateRange: DateRange): Promise<CapacitySnapshot[]> {
    const response = await this.apiClient.get(`/api/capacity/employee/${employeeId}/real-time`, {
      params: {
        dateFrom: dateRange.start.toISOString(),
        dateTo: dateRange.end.toISOString()
      }
    });
    return response.data.data || response.data;
  }

  async detectOverAllocations(employeeId: string, allocation: CreateResourceAllocationInput): Promise<OverAllocationWarning[]> {
    const response = await this.apiClient.post('/api/capacity/validate-allocation', allocation);
    return response.data.data?.warnings || [];
  }

  async validateAllocation(allocation: CreateResourceAllocationInput): Promise<CapacityValidationResult> {
    const response = await this.apiClient.post('/api/capacity/validate-allocation', allocation);
    return response.data.data || response.data;
  }

  async generateResolutionSuggestions(warning: OverAllocationWarning): Promise<ResolutionSuggestion[]> {
    const response = await this.apiClient.get(`/api/capacity/warnings/${warning.id}/suggestions`);
    return response.data.data || response.data;
  }

  async recalculateCapacityForPeriod(dateFrom: Date, dateTo: Date): Promise<BatchOperationResult> {
    const response = await this.apiClient.post('/api/capacity/recalculate', {
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString()
    });
    return response.data.data || response.data;
  }

  async getCapacityHeatmap(filters: HeatmapFilters): Promise<CapacityHeatmapData> {
    const response = await this.apiClient.get('/api/capacity/heatmap', { params: filters });
    return response.data.data || response.data;
  }

  async getCapacityTrends(employeeId: string, period: string): Promise<CapacityTrend[]> {
    const response = await this.apiClient.get(`/api/capacity/trends/${employeeId}`, {
      params: { period }
    });
    return response.data.data || response.data;
  }
}
```

### Service Factory Pattern

```typescript
// src/services/ServiceFactory.ts
export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: Map<string, any> = new Map();
  private apiClient: AxiosInstance;

  private constructor(apiClient: AxiosInstance) {
    this.apiClient = apiClient;
  }

  static getInstance(apiClient?: AxiosInstance): ServiceFactory {
    if (!ServiceFactory.instance) {
      if (!apiClient) throw new Error('API client required for first instance');
      ServiceFactory.instance = new ServiceFactory(apiClient);
    }
    return ServiceFactory.instance;
  }

  getEmployeeService(): IEmployeeService {
    if (!this.services.has('employee')) {
      this.services.set('employee', new EmployeeService(this.apiClient));
    }
    return this.services.get('employee');
  }

  getProjectService(): IProjectService {
    if (!this.services.has('project')) {
      this.services.set('project', new ProjectService(this.apiClient));
    }
    return this.services.get('project');
  }

  getAllocationService(): IAllocationService {
    if (!this.services.has('allocation')) {
      this.services.set('allocation', new AllocationService(this.apiClient));
    }
    return this.services.get('allocation');
  }

  getCapacityService(): ICapacityService {
    if (!this.services.has('capacity')) {
      this.services.set('capacity', new CapacityService(this.apiClient));
    }
    return this.services.get('capacity');
  }

  getAnalyticsService(): IAnalyticsService {
    if (!this.services.has('analytics')) {
      this.services.set('analytics', new AnalyticsService(this.apiClient));
    }
    return this.services.get('analytics');
  }

  getNotificationService(): INotificationService {
    if (!this.services.has('notification')) {
      this.services.set('notification', new NotificationService(this.apiClient));
    }
    return this.services.get('notification');
  }
}
```

### Error Handling Strategy

```typescript
// src/services/errors/ServiceError.ts
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }

  static fromApiError(error: any): ServiceError {
    return new ServiceError(
      error.message || 'Service operation failed',
      error.code || 'UNKNOWN_ERROR',
      error.statusCode,
      error.details
    );
  }
}

// src/services/utils/ErrorHandler.ts
export class ErrorHandler {
  static handle(error: any): ServiceError {
    if (error instanceof ServiceError) return error;
    
    if (error.response) {
      return new ServiceError(
        error.response.data?.message || error.message,
        this.getErrorCode(error.response.status),
        error.response.status,
        error.response.data
      );
    }

    return new ServiceError(error.message, 'NETWORK_ERROR');
  }

  private static getErrorCode(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'VALIDATION_ERROR';
      case 500: return 'INTERNAL_ERROR';
      default: return 'HTTP_ERROR';
    }
  }
}
```

### WebSocket and Real-time Architecture

```typescript
// src/services/websocket/WebSocketService.ts
export class WebSocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(private baseUrl: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.baseUrl, {
        transports: ['websocket'],
        timeout: 20000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });

      // Register default event handlers
      this.registerDefaultHandlers();
    });
  }

  private registerDefaultHandlers() {
    this.on('capacity:updated', (data: CapacityUpdateEvent) => {
      this.emit('capacityUpdate', data);
    });

    this.on('warning:created', (data: WarningCreatedEvent) => {
      this.emit('warningCreated', data);
    });

    this.on('allocation:approved', (data: AllocationApprovedEvent) => {
      this.emit('allocationApproved', data);
    });

    this.on('allocation:rejected', (data: AllocationRejectedEvent) => {
      this.emit('allocationRejected', data);
    });
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);

    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// src/hooks/useWebSocket.ts
export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocketService | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const wsService = new WebSocketService(process.env.REACT_APP_WS_URL || 'ws://localhost:3001');
    
    wsService.connect()
      .then(() => {
        setSocket(wsService);
        setConnected(true);
      })
      .catch((error) => {
        console.error('Failed to connect to WebSocket:', error);
        setConnected(false);
      });

    return () => {
      wsService.disconnect();
    };
  }, []);

  return { socket, connected };
}

// src/hooks/useRealTimeCapacity.ts
export function useRealTimeCapacity(employeeId: string, dateRange: DateRange) {
  const { socket } = useWebSocket();
  const [capacityData, setCapacityData] = useState<CapacitySnapshot[]>([]);
  const [warnings, setWarnings] = useState<OverAllocationWarning[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleCapacityUpdate = (data: CapacityUpdateEvent) => {
      if (data.employeeId === employeeId) {
        setCapacityData(prev => 
          prev.map(snapshot => 
            snapshot.snapshotDate.toDateString() === data.date.toDateString()
              ? { ...snapshot, ...data.updates }
              : snapshot
          )
        );
      }
    };

    const handleWarningCreated = (data: WarningCreatedEvent) => {
      if (data.employeeId === employeeId) {
        setWarnings(prev => [...prev, data.warning]);
      }
    };

    socket.on('capacity:updated', handleCapacityUpdate);
    socket.on('warning:created', handleWarningCreated);

    return () => {
      socket.off('capacity:updated', handleCapacityUpdate);
      socket.off('warning:created', handleWarningCreated);
    };
  }, [socket, employeeId]);

  return { capacityData, warnings };
}
```

### Data Flow and Integration Patterns

```typescript
// src/services/patterns/Repository.ts
export interface Repository<T, K = string> {
  findAll(options?: QueryOptions): Promise<PaginatedResult<T>>;
  findById(id: K): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: K, data: Partial<T>): Promise<T>;
  delete(id: K): Promise<void>;
  exists(id: K): Promise<boolean>;
}

// src/services/patterns/UnitOfWork.ts
export class UnitOfWork {
  private transactions: (() => Promise<any>)[] = [];
  private rollbacks: (() => Promise<any>)[] = [];

  add<T>(operation: () => Promise<T>, rollback?: () => Promise<any>): UnitOfWork {
    this.transactions.push(operation);
    if (rollback) this.rollbacks.push(rollback);
    return this;
  }

  async commit(): Promise<any[]> {
    const results: any[] = [];
    try {
      for (const transaction of this.transactions) {
        results.push(await transaction());
      }
      return results;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  private async rollback(): Promise<void> {
    for (const rollback of this.rollbacks.reverse()) {
      try {
        await rollback();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
  }
}
```

## 2. Frontend Component Architecture

### Frontend Issues

- Single 1600+ line App.tsx file
- No component hierarchy
- Mixed concerns (UI + business logic)
- No routing organization

### Solution: Layered Component Architecture

```typescript
// Resource Management Platform Frontend Architecture Structure
src/
├── components/
│   ├── common/           # Reusable UI components
│   │   ├── DataTable.tsx
│   │   ├── Modal.tsx
│   │   ├── Charts/
│   │   └── Forms/
│   ├── layout/           # Layout components
│   │   ├── AppLayout.tsx
│   │   ├── Navigation.tsx
│   │   └── Sidebar.tsx
│   ├── capacity/         # Capacity management components
│   │   ├── CapacityDashboard.tsx
│   │   ├── HeatMapGrid.tsx
│   │   ├── CapacityCard.tsx
│   │   └── OverAllocationWarnings.tsx
│   ├── allocations/      # Resource allocation components
│   │   ├── AllocationForm.tsx
│   │   ├── AllocationCalendar.tsx
│   │   └── AllocationTimeline.tsx
│   ├── projects/         # Project management components
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectTasks.tsx
│   │   └── ProjectTimeline.tsx
│   ├── analytics/        # Analytics and reporting components
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── UtilizationChart.tsx
│   │   └── TrendAnalysis.tsx
│   └── scenarios/        # What-if scenario components
│       ├── ScenarioBuilder.tsx
│       ├── ScenarioComparison.tsx
│       └── ImpactAnalysis.tsx
├── pages/                # Route-level components
│   ├── DashboardPage.tsx
│   ├── CapacityPage.tsx
│   ├── AllocationsPage.tsx
│   ├── ProjectsPage.tsx
│   ├── AnalyticsPage.tsx
│   └── ScenariosPage.tsx
├── hooks/                # Custom React hooks
│   ├── useCapacity.ts
│   ├── useAllocations.ts
│   ├── useWebSocket.ts
│   └── useRealTimeUpdates.ts
├── services/             # API services
│   ├── capacity.service.ts
│   ├── allocation.service.ts
│   ├── project.service.ts
│   └── analytics.service.ts
├── types/                # TypeScript types
│   ├── capacity.types.ts
│   ├── allocation.types.ts
│   ├── project.types.ts
│   └── analytics.types.ts
├── utils/                # Utility functions
│   ├── dateUtils.ts
│   ├── capacityUtils.ts
│   └── validationUtils.ts
└── constants/            # Application constants
    ├── capacityThresholds.ts
    ├── colorSchemes.ts
    └── apiEndpoints.ts
```

### Component Hierarchy Design

```typescript
// src/components/layout/AppLayout.tsx
export interface AppLayoutProps {
  children: React.ReactNode;
  navigation?: NavigationItem[];
  user?: User;
  notifications?: Notification[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  navigation = defaultNavigation,
  user,
  notifications = []
}) => {
  return (
    <div className="app-layout">
      <AppHeader user={user} notifications={notifications} />
      <div className="app-body">
        <AppNavigation items={navigation} />
        <main className="app-main">
          <ErrorBoundary>
            <Suspense fallback={<AppSpinner />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <AppFooter />
    </div>
  );
};

// src/components/common/DataTable.tsx
export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: Error;
  pagination?: PaginationConfig;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  actions?: TableAction<T>[];
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading,
  error,
  pagination,
  onRowClick,
  onEdit,
  onDelete,
  actions = []
}: DataTableProps<T>) {
  if (error) return <ErrorDisplay error={error} />;
  if (loading) return <TableSkeleton columns={columns} />;

  return (
    <div className="data-table">
      <table className="table">
        <DataTableHeader columns={columns} />
        <DataTableBody
          data={data}
          columns={columns}
          onRowClick={onRowClick}
          actions={[
            ...(onEdit ? [{ label: 'Edit', handler: onEdit, icon: 'edit' }] : []),
            ...(onDelete ? [{ label: 'Delete', handler: onDelete, icon: 'delete' }] : []),
            ...actions
          ]}
        />
      </table>
      {pagination && <TablePagination {...pagination} />}
    </div>
  );
}
```

### Page Component Architecture

```typescript
// src/pages/employees/EmployeesPage.tsx
export const EmployeesPage: React.FC = () => {
  const {
    employees,
    loading,
    error,
    pagination,
    filters,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    setFilters,
    refresh
  } = useEmployees();

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <PageLayout
      title="Employee Management"
      actions={[
        <Button
          key="create"
          variant="primary"
          onClick={() => setShowCreateForm(true)}
          icon="plus"
        >
          Add Employee
        </Button>
      ]}
    >
      <PageFilters>
        <EmployeeFilters
          filters={filters}
          onChange={setFilters}
        />
      </PageFilters>

      <DataTable
        data={employees}
        columns={employeeTableColumns}
        loading={loading}
        error={error}
        pagination={pagination}
        onEdit={setSelectedEmployee}
        onDelete={(employee) => deleteEmployee(employee.id)}
      />

      {showCreateForm && (
        <EmployeeFormModal
          onSubmit={(data) => {
            createEmployee(data);
            setShowCreateForm(false);
          }}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {selectedEmployee && (
        <EmployeeFormModal
          employee={selectedEmployee}
          onSubmit={(data) => {
            updateEmployee(selectedEmployee.id, data);
            setSelectedEmployee(null);
          }}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </PageLayout>
  );
};
```

### Custom Hook Architecture

```typescript
// src/hooks/domain/useEmployees.ts
export interface UseEmployeesOptions {
  filters?: EmployeeFilters;
  pagination?: PaginationConfig;
  autoRefresh?: boolean;
}

export function useEmployees(options: UseEmployeesOptions = {}) {
  const employeeService = useService('employee');
  const [state, setState] = useState<EmployeesState>({
    employees: [],
    loading: false,
    error: null,
    filters: options.filters || {},
    pagination: options.pagination || defaultPagination
  });

  const fetchEmployees = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const result = await employeeService.findAll({
        ...state.filters,
        ...state.pagination
      });
      setState(prev => ({
        ...prev,
        employees: result.data,
        pagination: { ...prev.pagination, total: result.total },
        loading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as ServiceError
      }));
    }
  }, [employeeService, state.filters, state.pagination]);

  const createEmployee = useCallback(async (data: CreateEmployeeDto) => {
    try {
      const newEmployee = await employeeService.create(data);
      setState(prev => ({
        ...prev,
        employees: [...prev.employees, newEmployee]
      }));
      return newEmployee;
    } catch (error) {
      throw error;
    }
  }, [employeeService]);

  const updateEmployee = useCallback(async (id: number, data: UpdateEmployeeDto) => {
    try {
      const updatedEmployee = await employeeService.update(id, data);
      setState(prev => ({
        ...prev,
        employees: prev.employees.map(emp => 
          emp.id === id ? updatedEmployee : emp
        )
      }));
      return updatedEmployee;
    } catch (error) {
      throw error;
    }
  }, [employeeService]);

  const deleteEmployee = useCallback(async (id: number) => {
    try {
      await employeeService.delete(id);
      setState(prev => ({
        ...prev,
        employees: prev.employees.filter(emp => emp.id !== id)
      }));
    } catch (error) {
      throw error;
    }
  }, [employeeService]);

  const setFilters = useCallback((filters: Partial<EmployeeFilters>) => {
    setState(prev => ({ ...prev, filters: { ...prev.filters, ...filters } }));
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return {
    ...state,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    setFilters,
    refresh: fetchEmployees
  };
}
```

### Routing Architecture

```typescript
// src/routing/AppRouter.tsx
export const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          
          {/* Employee Management Routes */}
          <Route path="employees">
            <Route index element={<EmployeesPage />} />
            <Route path=":id" element={<EmployeeDetailPage />} />
            <Route path="new" element={<CreateEmployeePage />} />
          </Route>

          {/* Capacity Management Routes */}
          <Route path="capacity">
            <Route index element={<CapacityPage />} />
            <Route path="heatmap" element={<HeatMapPage />} />
            <Route path="warnings" element={<WarningsPage />} />
            <Route path="trends" element={<TrendsPage />} />
          </Route>

          {/* Project Management Routes */}
          <Route path="projects">
            <Route index element={<ProjectsPage />} />
            <Route path=":id" element={<ProjectDetailPage />} />
            <Route path="new" element={<CreateProjectPage />} />
            <Route path=":id/tasks" element={<ProjectTasksPage />} />
          </Route>

          {/* Resource Allocation Routes */}
          <Route path="allocations">
            <Route index element={<AllocationsPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="new" element={<CreateAllocationPage />} />
          </Route>

          {/* Analytics Routes */}
          <Route path="analytics">
            <Route index element={<AnalyticsPage />} />
            <Route path="utilization" element={<UtilizationPage />} />
            <Route path="forecasting" element={<ForecastingPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          {/* Scenario Planning Routes */}
          <Route path="scenarios">
            <Route index element={<ScenariosPage />} />
            <Route path="new" element={<CreateScenarioPage />} />
            <Route path=":id" element={<ScenarioDetailPage />} />
            <Route path=":id/compare" element={<ScenarioComparisonPage />} />
          </Route>

          {/* Settings Routes */}
          <Route path="settings">
            <Route index element={<SettingsPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="departments" element={<DepartmentsPage />} />
          </Route>
        </Route>
        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
};

// src/routing/routeConfig.ts
export const routes = {
  dashboard: '/',
  employees: {
    list: '/employees',
    detail: (id: string) => `/employees/${id}`,
    create: '/employees/new'
  },
  capacity: {
    list: '/capacity',
    heatmap: '/capacity/heatmap',
    warnings: '/capacity/warnings',
    trends: '/capacity/trends'
  },
  projects: {
    list: '/projects',
    detail: (id: string) => `/projects/${id}`,
    create: '/projects/new',
    tasks: (id: string) => `/projects/${id}/tasks`
  },
  allocations: {
    list: '/allocations',
    schedule: '/allocations/schedule',
    calendar: '/allocations/calendar',
    timeline: '/allocations/timeline',
    create: '/allocations/new'
  },
  analytics: {
    list: '/analytics',
    utilization: '/analytics/utilization',
    forecasting: '/analytics/forecasting',
    reports: '/analytics/reports'
  },
  scenarios: {
    list: '/scenarios',
    create: '/scenarios/new',
    detail: (id: string) => `/scenarios/${id}`,
    compare: (id: string) => `/scenarios/${id}/compare`
  }
} as const;
```

### State Management Architecture

```typescript
// src/store/StoreProvider.tsx
export interface AppStore {
  user: UserState;
  employees: EmployeesState;
  projects: ProjectsState;
  allocations: AllocationsState;
  capacity: CapacityState;
  analytics: AnalyticsState;
  scenarios: ScenariosState;
  ui: UIState;
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, dispatch] = useReducer(rootReducer, initialState);

  return (
    <StoreContext.Provider value={{ store, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

// src/contexts/ServiceContext.tsx
export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const apiClient = useMemo(() => createApiClient(), []);
  const serviceFactory = useMemo(() => ServiceFactory.getInstance(apiClient), [apiClient]);

  return (
    <ServiceContext.Provider value={serviceFactory}>
      {children}
    </ServiceContext.Provider>
  );
};

export function useService<T extends keyof ServiceMap>(serviceName: T): ServiceMap[T] {
  const serviceFactory = useContext(ServiceContext);
  if (!serviceFactory) {
    throw new Error('useService must be used within a ServiceProvider');
  }

  return useMemo(() => {
    switch (serviceName) {
      case 'employee': return serviceFactory.getEmployeeService();
      case 'project': return serviceFactory.getProjectService();
      case 'allocation': return serviceFactory.getAllocationService();
      case 'capacity': return serviceFactory.getCapacityService();
      case 'analytics': return serviceFactory.getAnalyticsService();
      case 'notification': return serviceFactory.getNotificationService();
      default: throw new Error(`Unknown service: ${serviceName}`);
    }
  }, [serviceFactory, serviceName]) as ServiceMap[T];
}
```

## 3. Testing Architecture

### Testing Issues

- No organized test structure
- Missing page object patterns
- No test data management
- No CI/CD integration

### Solution: Comprehensive Testing Framework

```typescript
// Resource Management Platform Testing Architecture Structure
tests/
├── e2e/
│   ├── fixtures/           # Test data and fixtures
│   │   ├── EmployeeFixtures.ts
│   │   ├── ProjectFixtures.ts
│   │   ├── AllocationFixtures.ts
│   │   └── CapacityFixtures.ts
│   ├── pages/              # Page object models
│   │   ├── EmployeesPage.ts
│   │   ├── CapacityPage.ts
│   │   ├── AllocationsPage.ts
│   │   ├── ProjectsPage.ts
│   │   ├── AnalyticsPage.ts
│   │   └── ScenariosPage.ts
│   ├── specs/              # Test specifications
│   │   ├── employee-management.spec.ts
│   │   ├── capacity-planning.spec.ts
│   │   ├── resource-allocations.spec.ts
│   │   ├── project-management.spec.ts
│   │   ├── analytics-reporting.spec.ts
│   │   └── scenario-planning.spec.ts
│   ├── utils/              # Test utilities
│   │   ├── DatabaseManager.ts
│   │   ├── WebSocketHelper.ts
│   │   └── CapacityTestUtils.ts
│   └── config/             # Test configuration
│       ├── playwright.config.ts
│       └── test-setup.ts
├── integration/            # Integration tests
│   ├── capacity-workflow.test.ts
│   ├── allocation-validation.test.ts
│   └── real-time-updates.test.ts
├── unit/                   # Unit tests
│   ├── services/
│   ├── components/
│   └── utils/
└── support/               # Test support files
    ├── test-database.ts
    └── mock-services.ts
```

### Page Object Pattern

```typescript
// tests/e2e/pages/EmployeesPage.ts
export class EmployeesPage {
  constructor(private page: Page) {}

  // Locators
  private get addButton() { return this.page.getByTestId('add-employee-button'); }
  private get employeesList() { return this.page.getByTestId('employees-list'); }
  private get searchInput() { return this.page.getByTestId('employee-search'); }
  private get filterDepartment() { return this.page.getByTestId('filter-department'); }

  // Actions
  async navigateTo() {
    await this.page.goto('/employees');
    await this.page.waitForSelector('[data-testid="employees-page"]');
  }

  async createEmployee(employee: CreateEmployeeDto) {
    await this.addButton.click();
    
    const form = new EmployeeFormModal(this.page);
    await form.fillForm(employee);
    await form.submit();
    await form.waitForClose();
  }

  async searchEmployees(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForSelector('[data-testid="search-results"]');
  }

  async filterByDepartment(department: string) {
    await this.filterDepartment.selectOption(department);
    await this.page.waitForSelector('[data-testid="filtered-results"]');
  }

  async getEmployeeCount(): Promise<number> {
    const summary = this.page.getByTestId('employees-summary');
    const text = await summary.textContent();
    const match = text?.match(/Total: (\d+) employees/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async editEmployee(employeeId: string, updates: UpdateEmployeeDto) {
    const editButton = this.page.getByTestId(`edit-employee-${employeeId}`);
    await editButton.click();

    const form = new EmployeeFormModal(this.page);
    await form.fillForm(updates);
    await form.submit();
    await form.waitForClose();
  }

  async deleteEmployee(employeeId: string) {
    const deleteButton = this.page.getByTestId(`delete-employee-${employeeId}`);
    await deleteButton.click();

    const dialog = new ConfirmationDialog(this.page);
    await dialog.confirm();
    await dialog.waitForClose();
  }

  // Assertions
  async expectEmployeeVisible(employee: Employee) {
    const employeeRow = this.page.getByTestId(`employee-${employee.id}`);
    await expect(employeeRow).toBeVisible();
    
    const name = this.page.getByTestId(`employee-name-${employee.id}`);
    await expect(name).toHaveText(`${employee.firstName} ${employee.lastName}`);
  }

  async expectEmployeeCount(expectedCount: number) {
    const actualCount = await this.getEmployeeCount();
    expect(actualCount).toBe(expectedCount);
  }
}

// tests/e2e/pages/components/EmployeeFormModal.ts
export class EmployeeFormModal {
  constructor(private page: Page) {}

  private get modal() { return this.page.getByTestId('employee-form-modal'); }
  private get firstNameInput() { return this.page.getByTestId('employee-first-name'); }
  private get lastNameInput() { return this.page.getByTestId('employee-last-name'); }
  private get emailInput() { return this.page.getByTestId('employee-email'); }
  private get positionInput() { return this.page.getByTestId('employee-position'); }
  private get departmentSelect() { return this.page.getByTestId('employee-department'); }
  private get submitButton() { return this.page.getByTestId('submit-employee'); }
  private get cancelButton() { return this.page.getByText('Cancel'); }

  async fillForm(employee: Partial<CreateEmployeeDto>) {
    if (employee.firstName) {
      await this.firstNameInput.fill(employee.firstName);
    }
    if (employee.lastName) {
      await this.lastNameInput.fill(employee.lastName);
    }
    if (employee.email) {
      await this.emailInput.fill(employee.email);
    }
    if (employee.position) {
      await this.positionInput.fill(employee.position);
    }
    if (employee.departmentId) {
      await this.departmentSelect.selectOption(employee.departmentId.toString());
    }
  }

  async submit() {
    await this.submitButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async waitForClose() {
    await this.modal.waitFor({ state: 'detached' });
  }

  async expectValidationError(field: string, message: string) {
    const errorElement = this.page.getByTestId(`${field}-error`);
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toHaveText(message);
  }
}

// tests/e2e/pages/CapacityPage.ts
export class CapacityPage {
  constructor(private page: Page) {}

  // Locators
  private get heatMapGrid() { return this.page.getByTestId('capacity-heatmap-grid'); }
  private get capacityCards() { return this.page.getByTestId('capacity-card'); }
  private get warningsList() { return this.page.getByTestId('over-allocation-warnings'); }
  private get dateRangePicker() { return this.page.getByTestId('date-range-picker'); }
  private get employeeFilter() { return this.page.getByTestId('employee-filter'); }

  // Actions
  async navigateTo() {
    await this.page.goto('/capacity');
    await this.page.waitForSelector('[data-testid="capacity-page"]');
  }

  async selectDateRange(startDate: string, endDate: string) {
    await this.dateRangePicker.click();
    await this.page.fill('[data-testid="start-date"]', startDate);
    await this.page.fill('[data-testid="end-date"]', endDate);
    await this.page.click('[data-testid="apply-date-range"]');
  }

  async filterByEmployee(employeeId: string) {
    await this.employeeFilter.selectOption(employeeId);
    await this.page.waitForSelector('[data-testid="filtered-capacity-data"]');
  }

  async viewCapacityDetails(employeeId: string, date: string) {
    const capacityCell = this.page.getByTestId(`capacity-cell-${employeeId}-${date}`);
    await capacityCell.click();
    await this.page.waitForSelector('[data-testid="capacity-details-modal"]');
  }

  async acknowledgeWarning(warningId: string) {
    const warning = this.page.getByTestId(`warning-${warningId}`);
    await warning.click();
    await this.page.click('[data-testid="acknowledge-warning"]');
  }

  // Assertions
  async expectCapacityHeatmapVisible() {
    await expect(this.heatMapGrid).toBeVisible();
  }

  async expectCapacityCardCount(expectedCount: number) {
    const cards = this.capacityCards;
    await expect(cards).toHaveCount(expectedCount);
  }

  async expectWarningCount(expectedCount: number) {
    const warnings = this.warningsList.locator('[data-testid^="warning-"]');
    await expect(warnings).toHaveCount(expectedCount);
  }

  async expectCapacityUtilization(employeeId: string, date: string, expectedUtilization: number) {
    const utilizationElement = this.page.getByTestId(`utilization-${employeeId}-${date}`);
    await expect(utilizationElement).toHaveText(`${expectedUtilization}%`);
  }
}

// tests/e2e/pages/AllocationsPage.ts
export class AllocationsPage {
  constructor(private page: Page) {}

  // Locators
  private get createAllocationButton() { return this.page.getByTestId('create-allocation-button'); }
  private get allocationsList() { return this.page.getByTestId('allocations-list'); }
  private get calendarView() { return this.page.getByTestId('allocations-calendar'); }
  private get timelineView() { return this.page.getByTestId('allocations-timeline'); }

  // Actions
  async navigateTo() {
    await this.page.goto('/allocations');
    await this.page.waitForSelector('[data-testid="allocations-page"]');
  }

  async createAllocation(allocation: CreateAllocationDto) {
    await this.createAllocationButton.click();
    
    const form = new AllocationFormModal(this.page);
    await form.fillForm(allocation);
    await form.submit();
    await form.waitForClose();
  }

  async switchToCalendarView() {
    await this.page.click('[data-testid="calendar-view-toggle"]');
    await this.page.waitForSelector('[data-testid="allocations-calendar"]');
  }

  async switchToTimelineView() {
    await this.page.click('[data-testid="timeline-view-toggle"]');
    await this.page.waitForSelector('[data-testid="allocations-timeline"]');
  }

  async editAllocation(allocationId: string, updates: UpdateAllocationDto) {
    const editButton = this.page.getByTestId(`edit-allocation-${allocationId}`);
    await editButton.click();

    const form = new AllocationFormModal(this.page);
    await form.fillForm(updates);
    await form.submit();
    await form.waitForClose();
  }

  // Assertions
  async expectAllocationVisible(allocation: ResourceAllocation) {
    const allocationRow = this.page.getByTestId(`allocation-${allocation.id}`);
    await expect(allocationRow).toBeVisible();
  }

  async expectAllocationCount(expectedCount: number) {
    const allocations = this.allocationsList.locator('[data-testid^="allocation-"]');
    await expect(allocations).toHaveCount(expectedCount);
  }
}
```

### Test Data Management

```typescript
// tests/e2e/fixtures/EmployeeFixtures.ts
export class EmployeeFixtures {
  static createValidEmployee(): CreateEmployeeDto {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      position: faker.person.jobTitle(),
      departmentId: faker.helpers.arrayElement([1, 2, 3, 4]),
      defaultHoursPerWeek: 40,
      salary: faker.number.int({ min: 50000, max: 150000 })
    };
  }

  static createEmployeeWithDepartment(departmentId: number): CreateEmployeeDto {
    return {
      ...this.createValidEmployee(),
      departmentId
    };
  }

  static createInvalidEmployee(): CreateEmployeeDto {
    return {
      firstName: '',
      lastName: '',
      email: 'invalid-email',
      position: '',
      departmentId: 0,
      defaultHoursPerWeek: -1,
      salary: -1000
    };
  }
}

// tests/e2e/fixtures/ProjectFixtures.ts
export class ProjectFixtures {
  static createValidProject(): CreateProjectDto {
    const startDate = faker.date.future();
    const endDate = faker.date.future({ refDate: startDate });
    
    return {
      name: faker.company.name(),
      description: faker.lorem.paragraph(),
      client_name: faker.company.name(),
      status: faker.helpers.arrayElement(['planning', 'active', 'completed']),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      budget: faker.number.int({ min: 10000, max: 500000 }),
      hourly_rate: faker.number.int({ min: 50, max: 200 }),
      estimated_hours: faker.number.int({ min: 100, max: 2000 })
    };
  }
}

// tests/e2e/fixtures/AllocationFixtures.ts
export class AllocationFixtures {
  static createValidAllocation(): CreateResourceAllocationInput {
    const startDate = faker.date.future();
    const endDate = faker.date.future({ refDate: startDate });
    
    return {
      projectId: faker.string.uuid(),
      employeeId: faker.string.uuid(),
      allocatedHours: faker.number.int({ min: 10, max: 40 }),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      roleOnProject: faker.person.jobTitle(),
      hourlyRate: faker.number.int({ min: 50, max: 200 }),
      notes: faker.lorem.sentence()
    };
  }

  static createOverAllocation(): CreateResourceAllocationInput {
    const allocation = this.createValidAllocation();
    return {
      ...allocation,
      allocatedHours: 50 // Over capacity
    };
  }
}

// tests/e2e/fixtures/CapacityFixtures.ts
export class CapacityFixtures {
  static createCapacitySnapshot(): CapacitySnapshot {
    return {
      id: faker.string.uuid(),
      employeeId: faker.string.uuid(),
      snapshotDate: faker.date.recent(),
      allocatedHours: faker.number.float({ min: 0, max: 12, fractionDigits: 2 }),
      availableHours: 8.0,
      overAllocationHours: 0,
      utilizationPercentage: faker.number.float({ min: 0, max: 150, fractionDigits: 2 }),
      lastUpdated: new Date()
    };
  }

  static createOverAllocationWarning(): OverAllocationWarning {
    return {
      id: faker.string.uuid(),
      employeeId: faker.string.uuid(),
      projectId: faker.string.uuid(),
      allocationId: faker.string.uuid(),
      warningType: 'over_allocation',
      severity: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
      conflictDate: faker.date.recent(),
      overAllocationHours: faker.number.float({ min: 0.5, max: 4, fractionDigits: 2 }),
      autoResolved: false,
      resolutionStrategy: null,
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
```

### Test Database Management

```typescript
// tests/e2e/utils/DatabaseManager.ts
export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database;

  private constructor() {
    this.db = new Database(process.env.TEST_DATABASE_URL);
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async resetDatabase(): Promise<void> {
    // Truncate tables in correct order due to foreign key constraints
    await this.db.execute('TRUNCATE TABLE over_allocation_warnings CASCADE');
    await this.db.execute('TRUNCATE TABLE employee_capacity_snapshots CASCADE');
    await this.db.execute('TRUNCATE TABLE resource_allocations CASCADE');
    await this.db.execute('TRUNCATE TABLE project_tasks CASCADE');
    await this.db.execute('TRUNCATE TABLE projects CASCADE');
    await this.db.execute('TRUNCATE TABLE employees CASCADE');
    await this.db.execute('TRUNCATE TABLE departments CASCADE');
    
    // Reset sequences for UUID primary keys (if using serial IDs)
    // Note: UUIDs don't need sequence resets
  }

  async seedDefaultData(): Promise<void> {
    // Seed departments
    await this.db.execute(`
      INSERT INTO departments (id, name) VALUES 
      (gen_random_uuid(), 'Engineering'), 
      (gen_random_uuid(), 'Product'), 
      (gen_random_uuid(), 'Marketing'), 
      (gen_random_uuid(), 'QA')
    `);
  }

  async createEmployee(employee: CreateEmployeeDto): Promise<Employee> {
    const result = await this.db.query(`
      INSERT INTO employees (id, first_name, last_name, email, position, department_id, default_hours_per_week, salary)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      employee.firstName,
      employee.lastName,
      employee.email,
      employee.position,
      employee.departmentId,
      employee.defaultHoursPerWeek,
      employee.salary
    ]);
    
    return result.rows[0];
  }

  async createProject(project: CreateProjectDto): Promise<Project> {
    const result = await this.db.query(`
      INSERT INTO projects (id, name, description, client_name, status, priority, start_date, end_date, budget, hourly_rate, estimated_hours)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      project.name,
      project.description,
      project.client_name,
      project.status,
      project.priority,
      project.start_date,
      project.end_date,
      project.budget,
      project.hourly_rate,
      project.estimated_hours
    ]);
    
    return result.rows[0];
  }

  async cleanup(): Promise<void> {
    await this.db.close();
  }
}
```

### Test Specifications

```typescript
// tests/e2e/specs/employee-management.spec.ts
import { test, expect } from '@playwright/test';
import { EmployeesPage } from '../pages/EmployeesPage';
import { EmployeeFixtures } from '../fixtures/EmployeeFixtures';
import { DatabaseManager } from '../utils/DatabaseManager';

test.describe('Employee Management', () => {
  let employeesPage: EmployeesPage;
  let dbManager: DatabaseManager;

  test.beforeEach(async ({ page }) => {
    employeesPage = new EmployeesPage(page);
    dbManager = DatabaseManager.getInstance();
    
    await dbManager.resetDatabase();
    await dbManager.seedDefaultData();
    await employeesPage.navigateTo();
  });

  test('should create a new employee', async () => {
    const newEmployee = EmployeeFixtures.createValidEmployee();
    
    await employeesPage.createEmployee(newEmployee);
    await employeesPage.expectEmployeeCount(1);
    
    // Verify employee appears in list
    const createdEmployee = await dbManager.findEmployeeByEmail(newEmployee.email);
    await employeesPage.expectEmployeeVisible(createdEmployee);
  });

  test('should validate required fields', async () => {
    const invalidEmployee = EmployeeFixtures.createInvalidEmployee();
    
    await employeesPage.addButton.click();
    
    const form = new EmployeeFormModal(employeesPage.page);
    await form.fillForm(invalidEmployee);
    await form.submit();
    
    // Expect validation errors
    await form.expectValidationError('first-name', 'First name is required');
    await form.expectValidationError('email-format', 'Please enter a valid email address');
  });

  test('should edit an existing employee', async () => {
    // Setup: Create an employee
    const employee = await dbManager.createEmployee(EmployeeFixtures.createValidEmployee());
    await employeesPage.page.reload();
    
    // Edit employee
    const updates = { firstName: 'Updated Name' };
    await employeesPage.editEmployee(employee.id.toString(), updates);
    
    // Verify update
    const updatedEmployee = { ...employee, ...updates };
    await employeesPage.expectEmployeeVisible(updatedEmployee);
  });

  test('should delete an employee', async () => {
    // Setup: Create an employee
    const employee = await dbManager.createEmployee(EmployeeFixtures.createValidEmployee());
    await employeesPage.page.reload();
    
    await employeesPage.expectEmployeeCount(1);
    
    // Delete employee
    await employeesPage.deleteEmployee(employee.id.toString());
    
    // Verify deletion
    await employeesPage.expectEmployeeCount(0);
  });

  test('should filter employees by department', async () => {
    // Setup: Create employees in different departments
    await dbManager.createEmployee(EmployeeFixtures.createEmployeeWithDepartment(1));
    await dbManager.createEmployee(EmployeeFixtures.createEmployeeWithDepartment(2));
    await dbManager.createEmployee(EmployeeFixtures.createEmployeeWithDepartment(1));
    
    await employeesPage.page.reload();
    
    // Filter by Engineering department (ID: 1)
    await employeesPage.filterByDepartment('1');
    
    // Should show 2 employees
    await employeesPage.expectEmployeeCount(2);
  });
});

// tests/e2e/specs/capacity-planning.spec.ts
import { test, expect } from '@playwright/test';
import { CapacityPage } from '../pages/CapacityPage';
import { CapacityFixtures } from '../fixtures/CapacityFixtures';
import { DatabaseManager } from '../utils/DatabaseManager';

test.describe('Capacity Planning', () => {
  let capacityPage: CapacityPage;
  let dbManager: DatabaseManager;

  test.beforeEach(async ({ page }) => {
    capacityPage = new CapacityPage(page);
    dbManager = DatabaseManager.getInstance();
    
    await dbManager.resetDatabase();
    await dbManager.seedDefaultData();
    await capacityPage.navigateTo();
  });

  test('should display capacity heatmap', async () => {
    await capacityPage.expectCapacityHeatmapVisible();
  });

  test('should show over-allocation warnings', async () => {
    // Setup: Create over-allocation warning
    const warning = CapacityFixtures.createOverAllocationWarning();
    await dbManager.createOverAllocationWarning(warning);
    
    await capacityPage.page.reload();
    
    await capacityPage.expectWarningCount(1);
  });

  test('should filter capacity by date range', async () => {
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';
    
    await capacityPage.selectDateRange(startDate, endDate);
    
    // Verify date range is applied
    await expect(capacityPage.page.getByTestId('date-range-display')).toContainText('Jan 1 - Jan 31');
  });

  test('should show capacity utilization details', async () => {
    // Setup: Create capacity snapshot
    const snapshot = CapacityFixtures.createCapacitySnapshot();
    await dbManager.createCapacitySnapshot(snapshot);
    
    await capacityPage.page.reload();
    
    await capacityPage.expectCapacityUtilization(
      snapshot.employeeId, 
      snapshot.snapshotDate.toISOString().split('T')[0], 
      snapshot.utilizationPercentage
    );
  });
});

// tests/e2e/specs/resource-allocations.spec.ts
import { test, expect } from '@playwright/test';
import { AllocationsPage } from '../pages/AllocationsPage';
import { AllocationFixtures } from '../fixtures/AllocationFixtures';
import { DatabaseManager } from '../utils/DatabaseManager';

test.describe('Resource Allocations', () => {
  let allocationsPage: AllocationsPage;
  let dbManager: DatabaseManager;

  test.beforeEach(async ({ page }) => {
    allocationsPage = new AllocationsPage(page);
    dbManager = DatabaseManager.getInstance();
    
    await dbManager.resetDatabase();
    await dbManager.seedDefaultData();
    await allocationsPage.navigateTo();
  });

  test('should create new allocation', async () => {
    const newAllocation = AllocationFixtures.createValidAllocation();
    
    await allocationsPage.createAllocation(newAllocation);
    await allocationsPage.expectAllocationCount(1);
  });

  test('should validate over-allocation', async () => {
    const overAllocation = AllocationFixtures.createOverAllocation();
    
    await allocationsPage.createAllocation(overAllocation);
    
    // Should show validation warning
    await expect(allocationsPage.page.getByTestId('validation-warning')).toBeVisible();
  });

  test('should switch between calendar and timeline views', async () => {
    await allocationsPage.switchToCalendarView();
    await expect(allocationsPage.page.getByTestId('allocations-calendar')).toBeVisible();
    
    await allocationsPage.switchToTimelineView();
    await expect(allocationsPage.page.getByTestId('allocations-timeline')).toBeVisible();
  });
});
```

### CI/CD Integration

```typescript
// tests/e2e/config/playwright.config.ts
export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit-results.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup'
    },
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup']
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup']
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup']
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup']
    }
  ],

  webServer: [
    {
      command: 'npm run start:test-backend',
      port: 3001,
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'npm run start:test-frontend',
      port: 3000,
      reuseExistingServer: !process.env.CI
    }
  ]
});
```

## 4. Implementation Patterns

### Migration Strategy

```typescript
// Migration Pattern: Strangler Fig
// Gradually replace monolithic components with new Resource Management Platform architecture

// Phase 1: Extract Services
// - Move API calls from components to services
// - Implement service interfaces for capacity, allocations, projects
// - Add error handling and WebSocket integration
// - Standardize on PostgreSQL with UUID primary keys

// Phase 2: Component Decomposition  
// - Extract reusable components (DataTable, Charts, Forms)
// - Implement domain-specific components (Capacity, Allocations, Projects)
// - Add proper state management with real-time updates
// - Implement capacity planning and heat map components

// Phase 3: Routing Restructure
// - Implement proper routing for all platform features
// - Add lazy loading for capacity, analytics, scenarios
// - Optimize bundle splitting for large datasets
// - Add route guards for approval workflows

// Phase 4: Testing Integration
// - Add comprehensive E2E tests for capacity planning
// - Implement page object patterns for complex workflows
// - Set up CI/CD pipeline with database migrations
// - Add performance testing for capacity calculations

// Implementation Timeline for Resource Management Platform
const migrationPhases = {
  phase1: {
    duration: '3-4 weeks',
    tasks: [
      'Extract API services (capacity, allocations, projects)',
      'Implement WebSocket integration',
      'Add service interfaces for all domains',
      'Standardize on PostgreSQL with UUIDs',
      'Update dependency injection'
    ]
  },
  phase2: {
    duration: '4-5 weeks', 
    tasks: [
      'Break down App.tsx into domain components',
      'Create capacity planning components',
      'Implement heat map and analytics components',
      'Add real-time state management',
      'Implement scenario planning components'
    ]
  },
  phase3: {
    duration: '3-4 weeks',
    tasks: [
      'Restructure routing for all platform features',
      'Add lazy loading for heavy components',
      'Optimize performance for large datasets',
      'Implement error boundaries and validation',
      'Add approval workflow routing'
    ]
  },
  phase4: {
    duration: '3-4 weeks',
    tasks: [
      'Create comprehensive E2E test suite',
      'Implement page objects for complex workflows',
      'Set up CI/CD pipeline with database migrations',
      'Add monitoring and performance testing',
      'Implement capacity calculation testing'
    ]
  }
};
```

## 5. Technical Standards

### Coding Standards

```typescript
// TypeScript Configuration Standards
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}

// ESLint Configuration
{
  "extends": [
    "@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "react-hooks/exhaustive-deps": "error"
  }
}

// File Naming Conventions
// - Components: PascalCase (UserProfile.tsx)
// - Hooks: camelCase with 'use' prefix (useEmployees.ts)
// - Services: PascalCase with Service suffix (EmployeeService.ts)  
// - Types: PascalCase with interface/type prefix (IEmployeeService.ts)
// - Constants: SCREAMING_SNAKE_CASE (API_ENDPOINTS.ts)
```

### Performance Standards

```typescript
// Performance Optimization Patterns

// 1. Code Splitting
const LazyEmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const LazyProjectsPage = lazy(() => import('./pages/ProjectsPage'));

// 2. Memoization
const MemoizedDataTable = memo(DataTable);
const MemoizedEmployeeCard = memo(EmployeeCard, (prev, next) => {
  return prev.employee.id === next.employee.id && 
         prev.employee.updatedAt === next.employee.updatedAt;
});

// 3. Virtual Scrolling for Large Lists
const VirtualizedEmployeeList = ({ employees }: { employees: Employee[] }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={employees.length}
      itemSize={80}
      itemData={employees}
    >
      {EmployeeRow}
    </FixedSizeList>
  );
};

// 4. Request Optimization
import { useQuery } from '@tanstack/react-query';

const useOptimizedEmployees = () => {
  return useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.findAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });
};
```

### Security Standards

```typescript
// Security Implementation Patterns

// 1. Input Validation
const validateEmployeeInput = (data: CreateEmployeeDto): ValidationResult => {
  const schema = z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.string().email(),
    position: z.string().min(1).max(100),
    departmentId: z.number().positive(),
    salary: z.number().nonnegative().optional()
  });

  try {
    schema.parse(data);
    return { isValid: true };
  } catch (error) {
    return { isValid: false, errors: error.issues };
  }
};

// 2. API Security
const secureApiClient = axios.create({
  baseURL: process.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Add CSRF protection
secureApiClient.interceptors.request.use((config) => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// 3. Error Handling Security
const sanitizeErrorMessage = (error: any): string => {
  // Never expose internal system details
  if (error.code === 'INTERNAL_ERROR') {
    return 'An internal error occurred. Please contact support.';
  }
  
  // Sanitize user-facing messages
  const allowedMessages = [
    'Validation failed',
    'Resource not found',
    'Unauthorized access',
    'Network error'
  ];
  
  return allowedMessages.includes(error.message) 
    ? error.message 
    : 'An unexpected error occurred';
};
```

This comprehensive architectural solution addresses all critical issues identified in the current codebase and provides clear implementation guidelines for building a maintainable, scalable, and testable application architecture.

### Appendix: HTTP Caching Example

```typescript
// Example: Controller with explicit caching for read-heavy endpoints
// src/controllers/capacity.controller.ts
export async function getCapacityHeatmap(req: Request, res: Response) {
  const filters = parseHeatmapFilters(req);

  // Cache public data for 5 minutes; adjust per business rules
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');

  const data = await capacityService.getCapacityHeatmap(filters);
  return res.status(200).json({ success: true, data });
}

// Example: private data (user-specific)
export async function getEmployeeCapacity(req: Request, res: Response) {
  const { employeeId } = req.params;
  const dateRange = parseDateRange(req);

  // Private caches should not be shared by proxies
  res.setHeader('Cache-Control', 'private, max-age=120');

  const data = await capacityService.calculateRealTimeCapacity(employeeId, dateRange);
  return res.status(200).json({ success: true, data });
}
```

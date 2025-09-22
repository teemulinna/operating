# Phase 1: Technical Implementation Specifications

## 1. Database Changes Required

### 1.1 SQL Migration Scripts

#### Migration 027: Enhanced Resource Allocations with Real-time Capacity Tracking

```sql
-- Migration: 027_enhanced_resource_allocations
-- Description: Add real-time capacity tracking and over-allocation prevention

-- Add capacity tracking fields to employees
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS daily_capacity_hours DECIMAL(4,2) DEFAULT 8.0 CHECK (daily_capacity_hours > 0),
ADD COLUMN IF NOT EXISTS overtime_threshold DECIMAL(4,2) DEFAULT 10.0 CHECK (overtime_threshold >= daily_capacity_hours),
ADD COLUMN IF NOT EXISTS auto_overtime_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"over_allocation": true, "capacity_warnings": true}';

-- Create real-time capacity snapshots table
CREATE TABLE IF NOT EXISTS employee_capacity_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    allocated_hours DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (allocated_hours >= 0),
    available_hours DECIMAL(6,2) NOT NULL DEFAULT 8.0 CHECK (available_hours >= 0),
    over_allocation_hours DECIMAL(6,2) GENERATED ALWAYS AS (
        CASE WHEN allocated_hours > available_hours
        THEN allocated_hours - available_hours
        ELSE 0 END
    ) STORED,
    utilization_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN available_hours > 0
        THEN (allocated_hours / available_hours) * 100
        ELSE 0 END
    ) STORED,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(employee_id, snapshot_date)
);

-- Create enum types for warnings (must exist before table references)
CREATE TYPE allocation_warning_type AS ENUM (
    'over_allocation',
    'capacity_exceeded',
    'skill_mismatch',
    'date_conflict',
    'budget_overrun'
);

CREATE TYPE warning_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create over-allocation warnings table
CREATE TABLE IF NOT EXISTS over_allocation_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    allocation_id UUID REFERENCES resource_allocations(id) ON DELETE CASCADE,
    warning_type allocation_warning_type NOT NULL,
    severity warning_severity NOT NULL DEFAULT 'medium',
    conflict_date DATE NOT NULL,
    over_allocation_hours DECIMAL(6,2) NOT NULL CHECK (over_allocation_hours > 0),
    auto_resolved BOOLEAN DEFAULT false,
    resolution_strategy TEXT,
    acknowledged_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create allocation status enum (must exist before column reference)
CREATE TYPE allocation_status AS ENUM ('pending', 'approved', 'rejected', 'auto_approved', 'expired');

-- Enhanced resource allocations with real-time validation
ALTER TABLE resource_allocations
ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_manager_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS allocation_status allocation_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS daily_hours_distribution JSONB; -- Store daily hour breakdown

-- (enum defined above)
```

#### Migration 028: Performance Optimization Indexes

```sql
-- Migration: 028_performance_optimization_indexes
-- Description: Add specialized indexes for real-time queries

-- Composite indexes for capacity calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_allocations_employee_date_range
ON resource_allocations(employee_id, start_date, end_date)
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_allocations_project_active
ON resource_allocations(project_id, is_active, start_date, end_date);

-- Partial indexes for over-allocation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_capacity_snapshots_over_allocated
ON employee_capacity_snapshots(employee_id, snapshot_date, over_allocation_hours)
WHERE over_allocation_hours > 0;

-- JSON indexes for notification preferences
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_notification_preferences
ON employees USING GIN (notification_preferences);

-- Function-based index for utilization calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_capacity_snapshots_utilization
ON employee_capacity_snapshots(employee_id, utilization_percentage DESC, snapshot_date);

-- Covering index for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_over_allocation_warnings_dashboard
ON over_allocation_warnings(employee_id, warning_type, severity, created_at DESC)
INCLUDE (conflict_date, over_allocation_hours, auto_resolved);
```

### 1.2 Index Strategies for Performance

#### Primary Performance Indexes
```sql
-- Real-time capacity calculation indexes
CREATE INDEX idx_resource_allocations_capacity_calc
ON resource_allocations(employee_id, start_date, end_date, allocated_hours)
WHERE is_active = true;

-- Over-allocation detection index
CREATE INDEX idx_capacity_warnings_active
ON over_allocation_warnings(employee_id, conflict_date, auto_resolved)
WHERE resolved_at IS NULL;

-- Utilization trending index
CREATE INDEX idx_capacity_snapshots_trending
ON employee_capacity_snapshots(employee_id, snapshot_date DESC, utilization_percentage);
```

#### Specialized Query Indexes
```sql
-- Weekly/monthly reporting indexes
CREATE INDEX idx_allocations_reporting_period
ON resource_allocations(DATE_TRUNC('week', start_date), employee_id, allocated_hours)
WHERE is_active = true;

-- Project capacity planning index
CREATE INDEX idx_project_capacity_planning
ON resource_allocations(project_id, start_date, end_date, allocated_hours)
WHERE is_active = true AND allocation_status IN ('approved', 'auto_approved');
```

### 1.3 Data Integrity Constraints

```sql
-- Business logic constraints
ALTER TABLE resource_allocations
ADD CONSTRAINT chk_allocation_hours_positive
CHECK (allocated_hours > 0 AND allocated_hours <= 24);

ALTER TABLE employee_capacity_snapshots
ADD CONSTRAINT chk_capacity_hours_realistic
CHECK (available_hours > 0 AND available_hours <= 24);

-- Prevent overlapping allocations without approval
CREATE OR REPLACE FUNCTION prevent_overlapping_allocations()
RETURNS TRIGGER AS $$
DECLARE
    overlapping_count INTEGER;
    total_hours DECIMAL(6,2);
    capacity_hours DECIMAL(6,2);
BEGIN
    -- Calculate total allocated hours for the period
    SELECT COALESCE(SUM(allocated_hours), 0) INTO total_hours
    FROM resource_allocations
    WHERE employee_id = NEW.employee_id
    AND is_active = true
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (start_date, end_date) OVERLAPS (NEW.start_date, NEW.end_date);

    -- Get employee daily capacity
    SELECT daily_capacity_hours INTO capacity_hours
    FROM employees
    WHERE id = NEW.employee_id;

    -- Calculate days in allocation period
    total_hours := total_hours + NEW.allocated_hours;

    -- Allow if under capacity or has manager approval
    IF total_hours > (capacity_hours * (NEW.end_date - NEW.start_date + 1))
       AND NOT NEW.requires_manager_approval
       AND NEW.allocation_status = 'pending' THEN
        RAISE EXCEPTION 'Allocation exceeds employee capacity. Manager approval required.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_overlapping_allocations
BEFORE INSERT OR UPDATE ON resource_allocations
FOR EACH ROW EXECUTE FUNCTION prevent_overlapping_allocations();
```

## 2. Backend Implementation

### 2.1 TypeScript Interfaces

#### Core Domain Interfaces
```typescript
// src/types/capacity.types.ts
export interface CapacitySnapshot {
  id: string;
  employeeId: string;
  snapshotDate: Date;
  allocatedHours: number;
  availableHours: number;
  overAllocationHours: number;
  utilizationPercentage: number;
  lastUpdated: Date;
}

export interface OverAllocationWarning {
  id: string;
  employeeId: string;
  projectId?: string;
  allocationId?: string;
  warningType: AllocationWarningType;
  severity: WarningSeverity;
  conflictDate: Date;
  overAllocationHours: number;
  autoResolved: boolean;
  resolutionStrategy?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceAllocationExtended extends ResourceAllocation {
  autoApproved: boolean;
  requiresManagerApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  allocationStatus: AllocationStatus;
  dailyHoursDistribution?: DailyHoursDistribution;
}

export interface DailyHoursDistribution {
  [date: string]: number; // ISO date string -> hours
}

export type AllocationWarningType =
  | 'over_allocation'
  | 'capacity_exceeded'
  | 'skill_mismatch'
  | 'date_conflict'
  | 'budget_overrun';

export type WarningSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AllocationStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'expired';

// src/types/real-time.types.ts
export interface RealTimeCapacityUpdate {
  employeeId: string;
  date: Date;
  previousCapacity: number;
  newCapacity: number;
  affectedAllocations: string[];
  warningsGenerated: OverAllocationWarning[];
}

export interface CapacityValidationResult {
  isValid: boolean;
  warnings: OverAllocationWarning[];
  autoResolutionSuggestions: ResolutionSuggestion[];
  requiresApproval: boolean;
}

export interface ResolutionSuggestion {
  type: 'redistribute' | 'adjust_hours' | 'extend_deadline' | 'add_resources';
  description: string;
  impact: 'low' | 'medium' | 'high';
  estimatedEffort: string;
  affectedEntities: string[];
}
```

#### Service Layer Interfaces
```typescript
// src/services/interfaces/capacity.service.interface.ts
export interface ICapacityService {
  // Real-time capacity calculation
  calculateRealTimeCapacity(employeeId: string, dateRange: DateRange): Promise<CapacitySnapshot[]>;

  // Over-allocation detection
  detectOverAllocations(employeeId: string, allocation: CreateResourceAllocationInput): Promise<OverAllocationWarning[]>;

  // Capacity validation
  validateAllocation(allocation: CreateResourceAllocationInput): Promise<CapacityValidationResult>;

  // Auto-resolution
  generateResolutionSuggestions(warning: OverAllocationWarning): Promise<ResolutionSuggestion[]>;

  // Batch operations
  recalculateCapacityForPeriod(dateFrom: Date, dateTo: Date): Promise<BatchOperationResult>;
}

export interface IOverAllocationService {
  // Warning management
  createWarning(warning: CreateOverAllocationWarningInput): Promise<OverAllocationWarning>;
  acknowledgeWarning(warningId: string, acknowledgerId: string): Promise<OverAllocationWarning>;
  resolveWarning(warningId: string, resolutionStrategy: string): Promise<OverAllocationWarning>;

  // Auto-resolution
  attemptAutoResolution(warningId: string): Promise<boolean>;

  // Notification integration
  sendWarningNotifications(warnings: OverAllocationWarning[]): Promise<void>;
}
```

### 2.2 Controller Methods and Routes

#### Capacity Controller
```typescript
// src/controllers/capacity.controller.ts
export class CapacityController {
  constructor(
    private capacityService: ICapacityService,
    private overAllocationService: IOverAllocationService,
    private notificationService: INotificationService
  ) {}

  // GET /api/capacity/employee/:employeeId/real-time
  @Get('/employee/:employeeId/real-time')
  @ValidateParams(GetCapacityParamsSchema)
  @ValidateQuery(CapacityQuerySchema)
  async getRealTimeCapacity(req: Request, res: Response): Promise<void> {
    const { employeeId } = req.params;
    const { dateFrom, dateTo } = req.query;

    const snapshots = await this.capacityService.calculateRealTimeCapacity(
      employeeId,
      { start: new Date(dateFrom as string), end: new Date(dateTo as string) }
    );

    res.json({ success: true, data: snapshots });
  }

  // POST /api/capacity/validate-allocation
  @Post('/validate-allocation')
  @ValidateBody(CreateResourceAllocationSchema)
  async validateAllocation(req: Request, res: Response): Promise<void> {
    const allocationData = req.body;

    const validation = await this.capacityService.validateAllocation(allocationData);

    if (!validation.isValid) {
      res.status(409).json({
        success: false,
        data: validation,
        message: 'Allocation conflicts detected'
      });
      return;
    }

    res.json({ success: true, data: validation });
  }

  // GET /api/capacity/warnings
  @Get('/warnings')
  @ValidateQuery(WarningsQuerySchema)
  async getOverAllocationWarnings(req: Request, res: Response): Promise<void> {
    const { severity, employeeId, resolved, page = 1, limit = 20 } = req.query;

    const warnings = await this.overAllocationService.getWarnings({
      severity: severity as WarningSeverity,
      employeeId: employeeId as string,
      resolved: resolved === 'true',
      pagination: { page: Number(page), limit: Number(limit) }
    });

    res.json({ success: true, data: warnings });
  }

  // PUT /api/capacity/warnings/:warningId/acknowledge
  @Put('/warnings/:warningId/acknowledge')
  @ValidateParams(WarningParamsSchema)
  async acknowledgeWarning(req: Request, res: Response): Promise<void> {
    const { warningId } = req.params;
    const { userId } = req.user!;

    const warning = await this.overAllocationService.acknowledgeWarning(warningId, userId);

    // Send real-time update
    await this.notificationService.broadcastWarningUpdate(warning);

    res.json({ success: true, data: warning });
  }
}
```

#### Enhanced Resource Allocation Controller
```typescript
// src/controllers/resource-allocation.controller.ts - Enhanced methods
export class ResourceAllocationController {
  // POST /api/allocations/with-validation
  @Post('/with-validation')
  @ValidateBody(CreateResourceAllocationWithValidationSchema)
  async createAllocationWithValidation(req: Request, res: Response): Promise<void> {
    const allocationData = req.body;

    // Step 1: Validate capacity
    const validation = await this.capacityService.validateAllocation(allocationData);

    if (!validation.isValid && !allocationData.forceCreate) {
      res.status(409).json({
        success: false,
        data: validation,
        message: 'Cannot create allocation due to capacity conflicts'
      });
      return;
    }

    // Step 2: Create allocation with appropriate status
    const allocation = await this.resourceAllocationService.create({
      ...allocationData,
      allocationStatus: validation.requiresApproval ? 'pending' : 'auto_approved',
      requiresManagerApproval: validation.requiresApproval
    });

    // Step 3: Handle warnings if any
    if (validation.warnings.length > 0) {
      await this.overAllocationService.createWarnings(validation.warnings);
      await this.notificationService.sendWarningNotifications(validation.warnings);
    }

    // Step 4: Send real-time updates
    await this.websocketService.broadcastCapacityUpdate({
      employeeId: allocation.employeeId,
      type: 'allocation_created',
      data: allocation
    });

    res.status(201).json({ success: true, data: allocation });
  }

  // GET /api/allocations/employee/:employeeId/capacity-impact
  @Get('/employee/:employeeId/capacity-impact')
  async getCapacityImpact(req: Request, res: Response): Promise<void> {
    const { employeeId } = req.params;
    const { dateFrom, dateTo } = req.query;

    const impact = await this.capacityService.calculateCapacityImpact(
      employeeId,
      { start: new Date(dateFrom as string), end: new Date(dateTo as string) }
    );

    res.json({ success: true, data: impact });
  }
}
```

### 2.3 Validation Schemas with Zod

```typescript
// src/validation/capacity.schemas.ts
import { z } from 'zod';

export const CapacityQuerySchema = z.object({
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  includeWarnings: z.boolean().optional().default(false),
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily')
});

export const CreateResourceAllocationWithValidationSchema = z.object({
  projectId: z.string().uuid(),
  employeeId: z.string().uuid(),
  allocatedHours: z.number().positive().max(24),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  roleOnProject: z.string().min(1).max(100),
  hourlyRate: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
  forceCreate: z.boolean().optional().default(false), // Bypass warnings
  autoApprove: z.boolean().optional().default(false),
  dailyHoursDistribution: z.record(z.string(), z.number().positive().max(24)).optional()
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return start <= end;
}, {
  message: "Start date must be before or equal to end date",
  path: ["endDate"]
});

export const WarningsQuerySchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  employeeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  warningType: z.enum(['over_allocation', 'capacity_exceeded', 'skill_mismatch', 'date_conflict', 'budget_overrun']).optional(),
  resolved: z.boolean().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(['created_at', 'conflict_date', 'severity']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export const WarningParamsSchema = z.object({
  warningId: z.string().uuid()
});

export const GetCapacityParamsSchema = z.object({
  employeeId: z.string().uuid()
});
```

### 2.4 Business Logic Pseudocode

#### Real-time Capacity Calculation Algorithm
```typescript
/**
 * ALGORITHM: Real-time Capacity Calculation
 *
 * PURPOSE: Calculate current capacity status for an employee across a date range
 *
 * INPUT: employeeId, dateRange
 * OUTPUT: CapacitySnapshot[]
 */
async function calculateRealTimeCapacity(employeeId: string, dateRange: DateRange): Promise<CapacitySnapshot[]> {
  /*
  STEP 1: Get employee base capacity
    - Fetch employee.daily_capacity_hours
    - Fetch any capacity overrides from capacity_history table
    - Handle weekends/holidays if configured
  */

  const employee = await getEmployeeById(employeeId);
  const baseCapacity = employee.dailyCapacityHours || 8.0;

  /*
  STEP 2: Generate date series for the range
    - Create array of dates from start to end
    - Filter out non-working days if configured
  */

  const workingDays = generateWorkingDays(dateRange.start, dateRange.end);
  const snapshots: CapacitySnapshot[] = [];

  /*
  STEP 3: For each day, calculate allocation
    - Sum all active allocations that overlap the day
    - Consider daily_hours_distribution if available
    - Calculate over-allocation and utilization
  */

  for (const day of workingDays) {
    const allocations = await getActiveAllocationsForDay(employeeId, day);

    let totalAllocated = 0;
    for (const allocation of allocations) {
      if (allocation.dailyHoursDistribution && allocation.dailyHoursDistribution[day.toISOString()]) {
        // Use specific daily hours if available
        totalAllocated += allocation.dailyHoursDistribution[day.toISOString()];
      } else {
        // Distribute equally across allocation period
        const allocationDays = calculateWorkingDays(allocation.startDate, allocation.endDate);
        totalAllocated += allocation.allocatedHours / allocationDays.length;
      }
    }

    /*
    STEP 4: Create capacity snapshot
      - Calculate over-allocation (if any)
      - Calculate utilization percentage
      - Determine if warnings should be generated
    */

    const availableHours = await getAvailableHoursForDay(employeeId, day, baseCapacity);

    snapshots.push({
      id: generateUUID(),
      employeeId,
      snapshotDate: day,
      allocatedHours: totalAllocated,
      availableHours,
      overAllocationHours: Math.max(0, totalAllocated - availableHours),
      utilizationPercentage: availableHours > 0 ? (totalAllocated / availableHours) * 100 : 0,
      lastUpdated: new Date()
    });
  }

  /*
  STEP 5: Persist snapshots and trigger events
    - Save to database (upsert)
    - Generate warnings for over-allocations
    - Trigger real-time events for UI updates
  */

  await upsertCapacitySnapshots(snapshots);
  await generateWarningsForOverAllocations(snapshots.filter(s => s.overAllocationHours > 0));

  return snapshots;
}
```

#### Over-allocation Detection Algorithm
```typescript
/**
 * ALGORITHM: Over-allocation Detection and Warning Generation
 *
 * PURPOSE: Detect capacity conflicts when creating/updating allocations
 *
 * INPUT: new allocation data
 * OUTPUT: CapacityValidationResult
 */
async function detectOverAllocations(allocationData: CreateResourceAllocationInput): Promise<CapacityValidationResult> {
  /*
  STEP 1: Get overlapping allocations
    - Find all active allocations for the employee in the date range
    - Calculate total allocated hours for each day
  */

  const overlappingAllocations = await getOverlappingAllocations(
    allocationData.employeeId,
    allocationData.startDate,
    allocationData.endDate
  );

  /*
  STEP 2: Calculate capacity for each affected day
    - Get employee daily capacity
    - Account for any capacity adjustments
    - Identify days with over-allocation
  */

  const affectedDays = generateWorkingDays(allocationData.startDate, allocationData.endDate);
  const warnings: OverAllocationWarning[] = [];
  const resolutionSuggestions: ResolutionSuggestion[] = [];

  for (const day of affectedDays) {
    const existingHours = calculateExistingHoursForDay(overlappingAllocations, day);
    const newHours = calculateNewHoursForDay(allocationData, day);
    const totalHours = existingHours + newHours;
    const availableHours = await getAvailableHoursForDay(allocationData.employeeId, day);

    /*
    STEP 3: Generate warnings for over-allocations
      - Create warning if total > available
      - Determine severity based on over-allocation amount
      - Generate resolution suggestions
    */

    if (totalHours > availableHours) {
      const overAllocationAmount = totalHours - availableHours;

      warnings.push({
        id: generateUUID(),
        employeeId: allocationData.employeeId,
        projectId: allocationData.projectId,
        warningType: 'over_allocation',
        severity: determineSeverity(overAllocationAmount, availableHours),
        conflictDate: day,
        overAllocationHours: overAllocationAmount,
        autoResolved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      /*
      STEP 4: Generate resolution suggestions
        - Redistribute hours to other days
        - Reduce allocation hours
        - Extend project timeline
        - Add additional resources
      */

      resolutionSuggestions.push(...await generateResolutionSuggestions(
        allocationData,
        overAllocationAmount,
        overlappingAllocations
      ));
    }
  }

  /*
  STEP 5: Determine if approval is required
    - Check if warnings exist
    - Check employee overtime policies
    - Check project priority levels
  */

  const requiresApproval = warnings.length > 0 && !canAutoApprove(allocationData, warnings);

  return {
    isValid: warnings.length === 0,
    warnings,
    autoResolutionSuggestions: resolutionSuggestions,
    requiresApproval
  };
}
```

## 3. Frontend Components

### 3.1 React Component Hierarchy

```
src/components/capacity/
├── CapacityDashboard.tsx              # Main capacity overview
├── RealTimeCapacityGrid.tsx           # Real-time capacity visualization
├── OverAllocationWarnings.tsx         # Warning management interface
├── CapacityValidationModal.tsx        # Allocation validation dialog
├── ResolutionSuggestions.tsx          # Auto-resolution suggestions
├── EmployeeCapacityCard.tsx           # Individual employee capacity
├── CapacityTrendChart.tsx             # Historical capacity trends
└── __tests__/                         # Component tests
    ├── CapacityDashboard.test.tsx
    ├── RealTimeCapacityGrid.test.tsx
    └── OverAllocationWarnings.test.tsx

src/hooks/capacity/
├── useRealTimeCapacity.ts             # Real-time capacity hook
├── useOverAllocationWarnings.ts       # Warnings management hook
├── useCapacityValidation.ts           # Allocation validation hook
└── useCapacityWebSocket.ts            # WebSocket integration hook

src/features/capacity/
├── CapacityManagement.tsx             # Main feature component
├── components/                        # Feature-specific components
├── hooks/                            # Feature-specific hooks
├── types/                            # Feature-specific types
└── services/                         # Feature-specific services
```

### 3.2 State Management Approach

#### React Query Integration
```typescript
// src/hooks/capacity/useRealTimeCapacity.ts
export function useRealTimeCapacity(employeeId: string, dateRange: DateRange) {
  return useQuery({
    queryKey: ['capacity', 'real-time', employeeId, dateRange],
    queryFn: () => capacityApi.getRealTimeCapacity(employeeId, dateRange),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
    cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!employeeId && !!dateRange.start && !!dateRange.end,
    onSuccess: (data) => {
      // Update capacity cache
      queryClient.setQueryData(['capacity', 'snapshots', employeeId], data);
    },
    onError: (error) => {
      toast.error('Failed to fetch real-time capacity data');
      console.error('Capacity fetch error:', error);
    }
  });
}

// src/hooks/capacity/useOverAllocationWarnings.ts
export function useOverAllocationWarnings(filters: WarningFilters = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['over-allocation-warnings', filters],
    queryFn: () => capacityApi.getWarnings(filters),
    refetchInterval: 15000, // More frequent for warnings
    staleTime: 5000,
    onSuccess: (data) => {
      // Update individual warning cache
      data.forEach(warning => {
        queryClient.setQueryData(['warning', warning.id], warning);
      });
    }
  });

  const acknowledgeWarning = useMutation({
    mutationFn: (warningId: string) => capacityApi.acknowledgeWarning(warningId),
    onSuccess: (updatedWarning) => {
      // Optimistic update
      queryClient.setQueryData(['warning', updatedWarning.id], updatedWarning);
      queryClient.invalidateQueries(['over-allocation-warnings']);
      toast.success('Warning acknowledged');
    },
    onError: () => {
      toast.error('Failed to acknowledge warning');
    }
  });

  return {
    ...query,
    acknowledgeWarning
  };
}
```

#### Zustand Store for Real-time State
```typescript
// src/stores/capacityStore.ts
interface CapacityState {
  // Real-time capacity data
  capacitySnapshots: Record<string, CapacitySnapshot[]>;
  activeWarnings: OverAllocationWarning[];

  // UI state
  selectedEmployee: string | null;
  selectedDateRange: DateRange;
  warningFilters: WarningFilters;

  // Actions
  setSelectedEmployee: (employeeId: string | null) => void;
  setDateRange: (range: DateRange) => void;
  updateCapacitySnapshot: (employeeId: string, snapshot: CapacitySnapshot) => void;
  addWarning: (warning: OverAllocationWarning) => void;
  removeWarning: (warningId: string) => void;
  updateWarning: (warningId: string, updates: Partial<OverAllocationWarning>) => void;
}

export const useCapacityStore = create<CapacityState>((set, get) => ({
  capacitySnapshots: {},
  activeWarnings: [],
  selectedEmployee: null,
  selectedDateRange: { start: new Date(), end: addDays(new Date(), 30) },
  warningFilters: {},

  setSelectedEmployee: (employeeId) => set({ selectedEmployee: employeeId }),

  setDateRange: (range) => set({ selectedDateRange: range }),

  updateCapacitySnapshot: (employeeId, snapshot) => set((state) => ({
    capacitySnapshots: {
      ...state.capacitySnapshots,
      [employeeId]: [
        ...state.capacitySnapshots[employeeId]?.filter(s =>
          s.snapshotDate.toDateString() !== snapshot.snapshotDate.toDateString()
        ) || [],
        snapshot
      ].sort((a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime())
    }
  })),

  addWarning: (warning) => set((state) => ({
    activeWarnings: [...state.activeWarnings, warning]
  })),

  removeWarning: (warningId) => set((state) => ({
    activeWarnings: state.activeWarnings.filter(w => w.id !== warningId)
  })),

  updateWarning: (warningId, updates) => set((state) => ({
    activeWarnings: state.activeWarnings.map(w =>
      w.id === warningId ? { ...w, ...updates } : w
    )
  }))
}));
```

### 3.3 API Integration with React Query

```typescript
// src/services/capacity.api.ts
class CapacityAPI {
  private baseUrl = '/api/capacity';

  async getRealTimeCapacity(employeeId: string, dateRange: DateRange): Promise<CapacitySnapshot[]> {
    const params = new URLSearchParams({
      dateFrom: dateRange.start.toISOString(),
      dateTo: dateRange.end.toISOString(),
      includeWarnings: 'true'
    });

    const response = await fetch(`${this.baseUrl}/employee/${employeeId}/real-time?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch capacity data: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  async validateAllocation(allocation: CreateResourceAllocationInput): Promise<CapacityValidationResult> {
    const response = await fetch(`${this.baseUrl}/validate-allocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allocation)
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle validation conflicts
      if (response.status === 409) {
        return data.data; // Return validation result with warnings
      }
      throw new Error(data.message || 'Validation failed');
    }

    return data.data;
  }

  async createAllocationWithValidation(
    allocation: CreateResourceAllocationInput & { forceCreate?: boolean }
  ): Promise<ResourceAllocationExtended> {
    const response = await fetch('/api/allocations/with-validation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allocation)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create allocation');
    }

    const data = await response.json();
    return data.data;
  }

  async getWarnings(filters: WarningFilters): Promise<OverAllocationWarning[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/warnings?${params}`);

    if (!response.ok) {
      throw new Error('Failed to fetch warnings');
    }

    const data = await response.json();
    return data.data;
  }

  async acknowledgeWarning(warningId: string): Promise<OverAllocationWarning> {
    const response = await fetch(`${this.baseUrl}/warnings/${warningId}/acknowledge`, {
      method: 'PUT'
    });

    if (!response.ok) {
      throw new Error('Failed to acknowledge warning');
    }

    const data = await response.json();
    return data.data;
  }
}

export const capacityApi = new CapacityAPI();
```

### 3.4 UI/UX Specifications

#### Real-time Capacity Grid Component
```typescript
// src/components/capacity/RealTimeCapacityGrid.tsx
interface RealTimeCapacityGridProps {
  employeeId: string;
  dateRange: DateRange;
  showWarningsInline?: boolean;
  allowQuickActions?: boolean;
  onCellClick?: (snapshot: CapacitySnapshot) => void;
}

export function RealTimeCapacityGrid({
  employeeId,
  dateRange,
  showWarningsInline = true,
  allowQuickActions = false,
  onCellClick
}: RealTimeCapacityGridProps) {
  const { data: snapshots, isLoading, error } = useRealTimeCapacity(employeeId, dateRange);
  const { data: warnings } = useOverAllocationWarnings({ employeeId });

  // WebSocket integration for real-time updates
  useCapacityWebSocket(employeeId, (update) => {
    queryClient.invalidateQueries(['capacity', 'real-time', employeeId]);
  });

  if (isLoading) return <CapacityGridSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (!snapshots?.length) return <EmptyState />;

  return (
    <div className="capacity-grid">
      <div className="grid-header">
        <h3>Real-time Capacity: {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}</h3>
        <div className="grid-controls">
          <CapacityLegend />
          <RefreshButton onClick={() => queryClient.invalidateQueries(['capacity'])} />
        </div>
      </div>

      <div className="grid-container">
        {snapshots.map((snapshot) => {
          const dayWarnings = warnings?.filter(w =>
            isSameDay(w.conflictDate, snapshot.snapshotDate)
          );

          return (
            <CapacityCell
              key={snapshot.id}
              snapshot={snapshot}
              warnings={dayWarnings}
              showWarningsInline={showWarningsInline}
              allowQuickActions={allowQuickActions}
              onClick={() => onCellClick?.(snapshot)}
            />
          );
        })}
      </div>

      {allowQuickActions && (
        <CapacityQuickActions
          employeeId={employeeId}
          selectedSnapshots={snapshots.filter(s => s.overAllocationHours > 0)}
        />
      )}
    </div>
  );
}

// Individual capacity cell component
interface CapacityCellProps {
  snapshot: CapacitySnapshot;
  warnings?: OverAllocationWarning[];
  showWarningsInline: boolean;
  allowQuickActions: boolean;
  onClick: () => void;
}

function CapacityCell({ snapshot, warnings, showWarningsInline, allowQuickActions, onClick }: CapacityCellProps) {
  const isOverAllocated = snapshot.overAllocationHours > 0;
  const utilizationLevel = getUtilizationLevel(snapshot.utilizationPercentage);

  return (
    <div
      className={cn(
        'capacity-cell',
        `utilization-${utilizationLevel}`,
        { 'over-allocated': isOverAllocated, 'has-warnings': warnings?.length }
      )}
      onClick={onClick}
    >
      <div className="cell-header">
        <span className="date">{format(snapshot.snapshotDate, 'MM/dd')}</span>
        <span className="day">{format(snapshot.snapshotDate, 'EEE')}</span>
      </div>

      <div className="cell-content">
        <div className="hours-info">
          <span className="allocated">{snapshot.allocatedHours}h</span>
          <span className="available">/ {snapshot.availableHours}h</span>
        </div>

        <div className="utilization-bar">
          <div
            className="utilization-fill"
            style={{ width: `${Math.min(100, snapshot.utilizationPercentage)}%` }}
          />
          {isOverAllocated && (
            <div
              className="over-allocation-fill"
              style={{ width: `${(snapshot.overAllocationHours / snapshot.availableHours) * 100}%` }}
            />
          )}
        </div>

        <span className="utilization-percentage">
          {snapshot.utilizationPercentage.toFixed(0)}%
        </span>

        {isOverAllocated && (
          <div className="over-allocation-indicator">
            +{snapshot.overAllocationHours}h
          </div>
        )}
      </div>

      {showWarningsInline && warnings?.length && (
        <div className="warnings-inline">
          {warnings.map(warning => (
            <WarningBadge key={warning.id} warning={warning} compact />
          ))}
        </div>
      )}

      {allowQuickActions && isOverAllocated && (
        <div className="quick-actions">
          <button
            className="btn-quick-resolve"
            onClick={(e) => {
              e.stopPropagation();
              // Handle quick resolution
            }}
          >
            Resolve
          </button>
        </div>
      )}
    </div>
  );
}
```

#### Over-allocation Warning Component
```typescript
// src/components/capacity/OverAllocationWarnings.tsx
export function OverAllocationWarnings() {
  const [filters, setFilters] = useState<WarningFilters>({});
  const { data: warnings, isLoading, acknowledgeWarning } = useOverAllocationWarnings(filters);

  const groupedWarnings = useMemo(() => {
    return groupBy(warnings || [], 'employeeId');
  }, [warnings]);

  return (
    <div className="over-allocation-warnings">
      <div className="warnings-header">
        <h2>Over-allocation Warnings</h2>
        <WarningFilters filters={filters} onChange={setFilters} />
      </div>

      <div className="warnings-content">
        {Object.entries(groupedWarnings).map(([employeeId, employeeWarnings]) => (
          <EmployeeWarningGroup
            key={employeeId}
            employeeId={employeeId}
            warnings={employeeWarnings}
            onAcknowledge={acknowledgeWarning.mutate}
          />
        ))}

        {(!warnings || warnings.length === 0) && (
          <EmptyState
            icon={CheckCircle}
            title="No active warnings"
            description="All capacity allocations are within limits"
          />
        )}
      </div>
    </div>
  );
}
```

## 4. Integration Points

### 4.1 WebSocket Events for Real-time Updates

```typescript
// src/services/websocket/capacity.events.ts
export enum CapacityEventType {
  CAPACITY_UPDATED = 'capacity:updated',
  WARNING_CREATED = 'warning:created',
  WARNING_ACKNOWLEDGED = 'warning:acknowledged',
  WARNING_RESOLVED = 'warning:resolved',
  ALLOCATION_APPROVED = 'allocation:approved',
  ALLOCATION_REJECTED = 'allocation:rejected'
}

export interface CapacityEvent {
  type: CapacityEventType;
  employeeId: string;
  timestamp: Date;
  data: any;
}

// WebSocket event handlers
export class CapacityWebSocketHandler {
  constructor(private socketService: WebSocketService) {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.socketService.on(CapacityEventType.CAPACITY_UPDATED, this.handleCapacityUpdate.bind(this));
    this.socketService.on(CapacityEventType.WARNING_CREATED, this.handleWarningCreated.bind(this));
    this.socketService.on(CapacityEventType.WARNING_ACKNOWLEDGED, this.handleWarningAcknowledged.bind(this));
  }

  private handleCapacityUpdate(event: CapacityEvent) {
    // Update React Query cache
    queryClient.invalidateQueries(['capacity', 'real-time', event.employeeId]);

    // Update Zustand store
    const capacityStore = useCapacityStore.getState();
    capacityStore.updateCapacitySnapshot(event.employeeId, event.data);

    // Show toast notification if significant change
    if (event.data.overAllocationHours > 0) {
      toast.warning(`Over-allocation detected for employee ${event.employeeId}`);
    }
  }

  private handleWarningCreated(event: CapacityEvent) {
    const capacityStore = useCapacityStore.getState();
    capacityStore.addWarning(event.data);

    // Show notification
    showNotification({
      type: 'warning',
      title: 'Capacity Warning',
      message: `Over-allocation detected: ${event.data.overAllocationHours}h`,
      employeeId: event.employeeId,
      warningId: event.data.id
    });
  }

  private handleWarningAcknowledged(event: CapacityEvent) {
    const capacityStore = useCapacityStore.getState();
    capacityStore.updateWarning(event.data.id, {
      acknowledgedBy: event.data.acknowledgedBy,
      acknowledgedAt: event.data.acknowledgedAt
    });

    // Update React Query cache
    queryClient.invalidateQueries(['over-allocation-warnings']);
  }
}
```

### 4.2 Cache Invalidation Strategies

```typescript
// src/services/cache/capacity.cache.ts
export class CapacityCacheManager {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  // Invalidate capacity data when allocations change
  async invalidateCapacityForEmployee(employeeId: string, dateRange?: DateRange) {
    const queries = [
      ['capacity', 'real-time', employeeId],
      ['capacity', 'snapshots', employeeId],
      ['employee', employeeId, 'utilization']
    ];

    if (dateRange) {
      queries.push(['capacity', 'real-time', employeeId, dateRange]);
    }

    await Promise.all(
      queries.map(queryKey => this.queryClient.invalidateQueries(queryKey))
    );
  }

  // Smart cache invalidation based on allocation changes
  async handleAllocationChange(allocation: ResourceAllocationExtended, changeType: 'created' | 'updated' | 'deleted') {
    // Invalidate employee capacity
    await this.invalidateCapacityForEmployee(
      allocation.employeeId,
      { start: allocation.startDate, end: allocation.endDate }
    );

    // Invalidate project allocations
    await this.queryClient.invalidateQueries(['project', allocation.projectId, 'allocations']);

    // Invalidate warnings
    await this.queryClient.invalidateQueries(['over-allocation-warnings']);

    // If allocation was approved/rejected, invalidate pending approvals
    if (allocation.allocationStatus === 'approved' || allocation.allocationStatus === 'rejected') {
      await this.queryClient.invalidateQueries(['allocations', 'pending-approval']);
    }
  }

  // Batch cache invalidation for bulk operations
  async handleBulkAllocationChanges(allocations: ResourceAllocationExtended[]) {
    const employeeIds = [...new Set(allocations.map(a => a.employeeId))];
    const projectIds = [...new Set(allocations.map(a => a.projectId))];

    // Invalidate all affected employees
    await Promise.all(
      employeeIds.map(employeeId => this.invalidateCapacityForEmployee(employeeId))
    );

    // Invalidate all affected projects
    await Promise.all(
      projectIds.map(projectId =>
        this.queryClient.invalidateQueries(['project', projectId, 'allocations'])
      )
    );

    // Invalidate global queries
    await this.queryClient.invalidateQueries(['over-allocation-warnings']);
    await this.queryClient.invalidateQueries(['capacity', 'overview']);
  }
}
```

### 4.3 Error Handling Patterns

```typescript
// src/utils/error-handling/capacity.errors.ts
export class CapacityError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'CapacityError';
  }
}

export class OverAllocationError extends CapacityError {
  constructor(
    public employeeId: string,
    public conflictDate: Date,
    public overAllocationHours: number,
    public suggestions: ResolutionSuggestion[]
  ) {
    super(
      `Over-allocation detected: ${overAllocationHours}h on ${conflictDate.toDateString()}`,
      'OVER_ALLOCATION',
      { employeeId, conflictDate, overAllocationHours, suggestions }
    );
  }
}

// Error boundary for capacity components
export function CapacityErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={CapacityErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Capacity component error:', error, errorInfo);

        // Report to error tracking service
        errorTrackingService.reportError(error, {
          component: 'CapacityManagement',
          errorInfo,
          userId: getCurrentUser()?.id,
          timestamp: new Date().toISOString()
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

function CapacityErrorFallback({ error, resetErrorBoundary }: any) {
  if (error instanceof OverAllocationError) {
    return (
      <OverAllocationErrorUI
        error={error}
        onResolve={resetErrorBoundary}
      />
    );
  }

  return (
    <GenericErrorFallback
      error={error}
      onRetry={resetErrorBoundary}
      title="Capacity Management Error"
      description="An error occurred while loading capacity data"
    />
  );
}
```

### 4.4 Performance Optimization

```typescript
// src/hooks/capacity/useOptimizedCapacity.ts
export function useOptimizedCapacity(employeeId: string, dateRange: DateRange) {
  // Memoize expensive calculations
  const processedSnapshots = useMemo(() => {
    if (!snapshots) return [];

    return snapshots.map(snapshot => ({
      ...snapshot,
      utilizationLevel: getUtilizationLevel(snapshot.utilizationPercentage),
      warningLevel: getWarningLevel(snapshot.overAllocationHours),
      displayDate: format(snapshot.snapshotDate, 'MMM dd'),
      isWeekend: isWeekend(snapshot.snapshotDate)
    }));
  }, [snapshots]);

  // Debounced date range changes to prevent excessive API calls
  const debouncedDateRange = useDebounce(dateRange, 300);

  // Use React Query with optimistic updates
  const { data: snapshots, isLoading } = useQuery({
    queryKey: ['capacity', 'optimized', employeeId, debouncedDateRange],
    queryFn: () => capacityApi.getRealTimeCapacity(employeeId, debouncedDateRange),
    staleTime: 30000,
    cacheTime: 5 * 60 * 1000,
    select: (data) => {
      // Transform data in the select function for better caching
      return data.filter(snapshot => {
        // Filter out weekends if not configured to show them
        return !isWeekend(snapshot.snapshotDate) || showWeekends;
      });
    }
  });

  // Prefetch adjacent date ranges
  useEffect(() => {
    const nextRange = {
      start: addDays(dateRange.end, 1),
      end: addDays(dateRange.end, 14)
    };

    queryClient.prefetchQuery({
      queryKey: ['capacity', 'optimized', employeeId, nextRange],
      queryFn: () => capacityApi.getRealTimeCapacity(employeeId, nextRange),
      staleTime: 60000
    });
  }, [employeeId, dateRange]);

  return {
    snapshots: processedSnapshots,
    isLoading,
    // Add performance metrics
    metrics: {
      snapshotCount: processedSnapshots.length,
      overAllocatedDays: processedSnapshots.filter(s => s.overAllocationHours > 0).length,
      averageUtilization: processedSnapshots.reduce((sum, s) => sum + s.utilizationPercentage, 0) / processedSnapshots.length || 0
    }
  };
}
```

## 5. Testing Strategy

### 5.1 Unit Test Requirements

```typescript
// src/services/__tests__/capacity.service.test.ts
describe('CapacityService', () => {
  let capacityService: CapacityService;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    capacityService = new CapacityService(mockDb);
  });

  describe('calculateRealTimeCapacity', () => {
    it('should calculate capacity correctly for single allocation', async () => {
      // Arrange
      const employeeId = 'emp-123';
      const dateRange = { start: new Date('2024-01-01'), end: new Date('2024-01-07') };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ daily_capacity_hours: 8.0 }]
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'alloc-1',
            allocated_hours: 40,
            start_date: '2024-01-01',
            end_date: '2024-01-05',
            daily_hours_distribution: null
          }
        ]
      });

      // Act
      const result = await capacityService.calculateRealTimeCapacity(employeeId, dateRange);

      // Assert
      expect(result).toHaveLength(5); // 5 working days
      expect(result[0].allocatedHours).toBe(8); // 40 hours / 5 days
      expect(result[0].availableHours).toBe(8);
      expect(result[0].utilizationPercentage).toBe(100);
      expect(result[0].overAllocationHours).toBe(0);
    });

    it('should detect over-allocation correctly', async () => {
      // Arrange: Employee with 8h capacity, allocated 10h per day
      const employeeId = 'emp-123';
      const dateRange = { start: new Date('2024-01-01'), end: new Date('2024-01-01') };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ daily_capacity_hours: 8.0 }]
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'alloc-1',
            allocated_hours: 10,
            start_date: '2024-01-01',
            end_date: '2024-01-01',
            daily_hours_distribution: { '2024-01-01': 10 }
          }
        ]
      });

      // Act
      const result = await capacityService.calculateRealTimeCapacity(employeeId, dateRange);

      // Assert
      expect(result[0].allocatedHours).toBe(10);
      expect(result[0].availableHours).toBe(8);
      expect(result[0].overAllocationHours).toBe(2);
      expect(result[0].utilizationPercentage).toBe(125);
    });

    it('should handle custom daily hour distributions', async () => {
      // Test custom daily distributions vs. equal distribution
    });

    it('should exclude weekends when configured', async () => {
      // Test weekend exclusion logic
    });
  });

  describe('detectOverAllocations', () => {
    it('should return no warnings for valid allocation', async () => {
      // Test valid allocation scenario
    });

    it('should generate warnings for over-allocation', async () => {
      // Test over-allocation detection
    });

    it('should generate appropriate resolution suggestions', async () => {
      // Test suggestion generation
    });
  });
});
```

### 5.2 Integration Test Scenarios

```typescript
// src/__tests__/integration/capacity-workflow.test.ts
describe('Capacity Management Workflow Integration', () => {
  let app: Application;
  let testDb: TestDatabase;
  let testEmployeeId: string;
  let testProjectId: string;

  beforeAll(async () => {
    app = await createTestApp();
    testDb = await setupTestDatabase();

    // Create test data
    testEmployeeId = await testDb.createEmployee({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      dailyCapacityHours: 8.0
    });

    testProjectId = await testDb.createProject({
      name: 'Test Project',
      status: 'active'
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('Allocation Creation with Capacity Validation', () => {
    it('should create allocation when within capacity', async () => {
      // Test normal allocation creation
      const allocationData = {
        projectId: testProjectId,
        employeeId: testEmployeeId,
        allocatedHours: 32, // 4 days * 8 hours
        startDate: '2024-01-01',
        endDate: '2024-01-04',
        roleOnProject: 'Developer'
      };

      const response = await request(app)
        .post('/api/allocations/with-validation')
        .send(allocationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.allocationStatus).toBe('auto_approved');
    });

    it('should require approval for over-allocation', async () => {
      // Test over-allocation scenario
      const allocationData = {
        projectId: testProjectId,
        employeeId: testEmployeeId,
        allocatedHours: 48, // 4 days * 12 hours (over capacity)
        startDate: '2024-01-01',
        endDate: '2024-01-04',
        roleOnProject: 'Developer'
      };

      const response = await request(app)
        .post('/api/allocations/with-validation')
        .send(allocationData)
        .expect(201);

      expect(response.body.data.allocationStatus).toBe('pending');
      expect(response.body.data.requiresManagerApproval).toBe(true);

      // Verify warnings were created
      const warningsResponse = await request(app)
        .get(`/api/capacity/warnings?employeeId=${testEmployeeId}`)
        .expect(200);

      expect(warningsResponse.body.data).toHaveLength(1);
      expect(warningsResponse.body.data[0].warningType).toBe('over_allocation');
    });

    it('should prevent allocation creation when forced=false and conflicts exist', async () => {
      // Test conflict prevention
      const allocationData = {
        projectId: testProjectId,
        employeeId: testEmployeeId,
        allocatedHours: 96, // Extreme over-allocation
        startDate: '2024-01-01',
        endDate: '2024-01-04',
        roleOnProject: 'Developer',
        forceCreate: false
      };

      const response = await request(app)
        .post('/api/allocations/with-validation')
        .send(allocationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.warnings).toHaveLength(4); // 4 days of warnings
    });
  });

  describe('Real-time Capacity Updates', () => {
    it('should update capacity snapshots when allocation is created', async () => {
      // Create allocation
      const allocationData = {
        projectId: testProjectId,
        employeeId: testEmployeeId,
        allocatedHours: 40,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        roleOnProject: 'Developer'
      };

      await request(app)
        .post('/api/allocations/with-validation')
        .send(allocationData)
        .expect(201);

      // Check capacity snapshots were updated
      const capacityResponse = await request(app)
        .get(`/api/capacity/employee/${testEmployeeId}/real-time`)
        .query({
          dateFrom: '2024-02-01',
          dateTo: '2024-02-05'
        })
        .expect(200);

      const snapshots = capacityResponse.body.data;
      expect(snapshots).toHaveLength(5); // 5 working days
      expect(snapshots.every(s => s.allocatedHours === 8)).toBe(true);
      expect(snapshots.every(s => s.utilizationPercentage === 100)).toBe(true);
    });
  });

  describe('Warning Management Workflow', () => {
    it('should acknowledge and resolve warnings', async () => {
      // Create over-allocation to generate warning
      const allocationData = {
        projectId: testProjectId,
        employeeId: testEmployeeId,
        allocatedHours: 44, // 4 hours over capacity
        startDate: '2024-03-01',
        endDate: '2024-03-01',
        roleOnProject: 'Developer',
        forceCreate: true
      };

      await request(app)
        .post('/api/allocations/with-validation')
        .send(allocationData)
        .expect(201);

      // Get the warning
      const warningsResponse = await request(app)
        .get(`/api/capacity/warnings?employeeId=${testEmployeeId}`)
        .expect(200);

      const warning = warningsResponse.body.data[0];
      expect(warning.warningType).toBe('over_allocation');

      // Acknowledge the warning
      await request(app)
        .put(`/api/capacity/warnings/${warning.id}/acknowledge`)
        .expect(200);

      // Verify acknowledgment
      const updatedWarningResponse = await request(app)
        .get(`/api/capacity/warnings?employeeId=${testEmployeeId}`)
        .expect(200);

      const updatedWarning = updatedWarningResponse.body.data.find(w => w.id === warning.id);
      expect(updatedWarning.acknowledgedAt).toBeTruthy();
    });
  });
});
```

### 5.3 E2E Test Paths with Playwright

```typescript
// tests/e2e/capacity-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Capacity Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test data
    await page.goto('/employees');
    await page.waitForLoadState('networkidle');
  });

  test('should display real-time capacity grid', async ({ page }) => {
    // Navigate to capacity management
    await page.click('[data-testid="capacity-tab"]');

    // Select an employee
    await page.click('[data-testid="employee-selector"]');
    await page.click('[data-testid="employee-option-1"]');

    // Verify capacity grid loads
    await expect(page.locator('[data-testid="capacity-grid"]')).toBeVisible();

    // Check capacity cells are rendered
    const capacityCells = page.locator('[data-testid="capacity-cell"]');
    await expect(capacityCells).toHaveCount(7); // 7 days by default

    // Verify utilization percentages are displayed
    await expect(page.locator('[data-testid="utilization-percentage"]').first()).toBeVisible();
  });

  test('should create allocation and update capacity in real-time', async ({ page }) => {
    // Navigate to create allocation
    await page.click('[data-testid="create-allocation-btn"]');

    // Fill allocation form
    await page.selectOption('[data-testid="project-select"]', { index: 1 });
    await page.selectOption('[data-testid="employee-select"]', { index: 1 });
    await page.fill('[data-testid="allocated-hours"]', '40');
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-05');
    await page.fill('[data-testid="role"]', 'Developer');

    // Submit form
    await page.click('[data-testid="submit-allocation"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // Check that capacity grid updated
    await page.goto('/capacity');
    await page.selectOption('[data-testid="employee-selector"]', { index: 1 });

    // Verify updated utilization
    const utilizationCells = page.locator('[data-testid="capacity-cell"]');
    await expect(utilizationCells.first().locator('[data-testid="utilization-percentage"]')).toHaveText('100%');
  });

  test('should handle over-allocation warnings', async ({ page }) => {
    // Create over-allocation
    await page.click('[data-testid="create-allocation-btn"]');

    // Fill form with over-allocation
    await page.selectOption('[data-testid="project-select"]', { index: 1 });
    await page.selectOption('[data-testid="employee-select"]', { index: 1 });
    await page.fill('[data-testid="allocated-hours"]', '60'); // Over capacity
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-05');

    // Submit and expect validation modal
    await page.click('[data-testid="submit-allocation"]');

    // Verify warning modal appears
    await expect(page.locator('[data-testid="validation-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="over-allocation-warning"]')).toBeVisible();

    // Check warning details
    await expect(page.locator('[data-testid="warning-hours"]')).toContainText('4h'); // 60-40 = 20h over 5 days = 4h per day

    // View resolution suggestions
    await page.click('[data-testid="view-suggestions"]');
    await expect(page.locator('[data-testid="resolution-suggestions"]')).toBeVisible();

    // Force create allocation
    await page.check('[data-testid="force-create-checkbox"]');
    await page.click('[data-testid="confirm-create"]');

    // Verify allocation was created with pending status
    await expect(page.locator('[data-testid="allocation-pending"]')).toBeVisible();
  });

  test('should acknowledge warnings from dashboard', async ({ page }) => {
    // Navigate to warnings dashboard
    await page.goto('/capacity/warnings');

    // Wait for warnings to load
    await page.waitForSelector('[data-testid="warning-card"]');

    // Count initial warnings
    const initialWarnings = await page.locator('[data-testid="warning-card"]').count();

    // Acknowledge first warning
    await page.click('[data-testid="acknowledge-warning-btn"]').first();

    // Verify acknowledgment
    await expect(page.locator('[data-testid="warning-acknowledged"]').first()).toBeVisible();

    // Check warning count in navigation badge
    const badge = page.locator('[data-testid="warnings-badge"]');
    if (initialWarnings > 1) {
      await expect(badge).toHaveText((initialWarnings - 1).toString());
    } else {
      await expect(badge).not.toBeVisible();
    }
  });

  test('should filter and search warnings', async ({ page }) => {
    await page.goto('/capacity/warnings');

    // Apply severity filter
    await page.selectOption('[data-testid="severity-filter"]', 'high');

    // Verify filtered results
    const warningCards = page.locator('[data-testid="warning-card"]');
    const count = await warningCards.count();

    for (let i = 0; i < count; i++) {
      await expect(warningCards.nth(i).locator('[data-testid="warning-severity"]')).toHaveText('High');
    }

    // Search by employee name
    await page.fill('[data-testid="employee-search"]', 'John Doe');
    await page.waitForTimeout(300); // Debounce

    // Verify search results
    const searchResults = page.locator('[data-testid="warning-card"]');
    const searchCount = await searchResults.count();

    for (let i = 0; i < searchCount; i++) {
      await expect(searchResults.nth(i).locator('[data-testid="employee-name"]')).toContainText('John Doe');
    }
  });

  test('should show real-time updates via WebSocket', async ({ page }) => {
    // Open capacity dashboard
    await page.goto('/capacity');
    await page.selectOption('[data-testid="employee-selector"]', { index: 1 });

    // Get initial utilization
    const initialUtilization = await page.locator('[data-testid="utilization-percentage"]').first().textContent();

    // Simulate allocation creation in another tab
    const secondPage = await page.context().newPage();
    await secondPage.goto('/allocations/create');

    // Create allocation that affects the employee
    await secondPage.selectOption('[data-testid="employee-select"]', { index: 1 });
    await secondPage.fill('[data-testid="allocated-hours"]', '20');
    await secondPage.fill('[data-testid="start-date"]', '2024-01-01');
    await secondPage.fill('[data-testid="end-date"]', '2024-01-02');
    await secondPage.click('[data-testid="submit-allocation"]');

    // Wait for WebSocket update on original page
    await page.waitForFunction(
      (initial) => {
        const current = document.querySelector('[data-testid="utilization-percentage"]')?.textContent;
        return current && current !== initial;
      },
      initialUtilization,
      { timeout: 5000 }
    );

    // Verify capacity updated in real-time
    const updatedUtilization = await page.locator('[data-testid="utilization-percentage"]').first().textContent();
    expect(updatedUtilization).not.toBe(initialUtilization);

    await secondPage.close();
  });
});
```

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze current database schema and identify required changes", "status": "completed", "activeForm": "Analyzing current database schema and identifying required changes"}, {"content": "Create SQL migration scripts for new tables and modifications", "status": "completed", "activeForm": "Creating SQL migration scripts for new tables and modifications"}, {"content": "Design index strategies for optimal performance", "status": "completed", "activeForm": "Designing index strategies for optimal performance"}, {"content": "Define TypeScript interfaces for backend services", "status": "completed", "activeForm": "Defining TypeScript interfaces for backend services"}, {"content": "Create controller methods and route specifications", "status": "completed", "activeForm": "Creating controller methods and route specifications"}, {"content": "Design validation schemas with Zod", "status": "completed", "activeForm": "Designing validation schemas with Zod"}, {"content": "Write business logic pseudocode for core algorithms", "status": "completed", "activeForm": "Writing business logic pseudocode for core algorithms"}, {"content": "Define React component hierarchy and architecture", "status": "completed", "activeForm": "Defining React component hierarchy and architecture"}, {"content": "Specify state management and API integration patterns", "status": "completed", "activeForm": "Specifying state management and API integration patterns"}, {"content": "Design WebSocket events and real-time update strategies", "status": "completed", "activeForm": "Designing WebSocket events and real-time update strategies"}, {"content": "Create comprehensive testing strategy documentation", "status": "completed", "activeForm": "Creating comprehensive testing strategy documentation"}]
# Frontend Architecture - Project-Resource Integration

> Created: 2025-09-06
> Framework: React + TypeScript + Vite
> UI Library: Shadcn/ui (existing)

## Component Architecture Overview

### **Navigation & Layout Updates**

#### Enhanced Main Navigation
```typescript
// src/components/layout/MainNav.tsx
const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Projects', href: '/projects', new: true }, // NEW
  { name: 'Resources', href: '/resources', new: true }, // NEW  
  { name: 'Employees', href: '/employees' }, // existing
  { name: 'Reports', href: '/reports', new: true }, // NEW
  { name: 'Settings', href: '/settings' }
];
```

#### Multi-Context Dashboard
```typescript
// src/pages/DashboardPage.tsx - Updated
interface DashboardProps {
  view: 'manager' | 'employee' | 'admin';
}

// Manager View: Resource allocation across projects
// Employee View: Personal assignments and utilization
// Admin View: System-wide resource metrics
```

---

## Phase 1: Core Project Management Components

### **1. Project Management Interface**

#### ProjectList Component
```typescript
// src/components/projects/ProjectList.tsx
interface ProjectListProps {
  view: 'grid' | 'table';
  filters: {
    status: ProjectStatus[];
    priority: ProjectPriority[];
    dateRange: { start: Date; end: Date };
    search: string;
  };
}

// Features:
// - Project status indicators
// - Resource fill percentage badges
// - Quick assignment actions
// - Search and filtering
```

#### ProjectDetail Component
```typescript
// src/components/projects/ProjectDetail.tsx
interface ProjectDetailProps {
  projectId: string;
  activeTab: 'overview' | 'roles' | 'assignments' | 'timeline';
}

// Tabs:
// - Overview: Project info, status, budget
// - Roles: Required roles and skills
// - Assignments: Current employee assignments
// - Timeline: Project phases and milestones
```

#### ProjectRoleManager Component
```typescript
// src/components/projects/ProjectRoleManager.tsx
interface ProjectRoleManagerProps {
  projectId: string;
  onRoleCreate: (role: ProjectRole) => void;
  onAssignEmployee: (roleId: string) => void;
}

// Features:
// - Add/edit project roles
// - Skills requirements definition
// - Role fill status indicators
// - Quick assignment buttons
```

### **2. Resource Assignment Interface**

#### ResourceAssignmentForm Component
```typescript
// src/components/assignments/ResourceAssignmentForm.tsx
interface AssignmentFormProps {
  projectId: string;
  roleId?: string;
  mode: 'create' | 'edit';
  onSubmit: (assignment: ResourceAssignment) => void;
}

// Features:
// - Employee search with skills filtering
// - Allocation percentage slider
// - Date range picker
// - Conflict warnings
// - Skills match indicators
```

#### EmployeeAssignmentsList Component
```typescript
// src/components/assignments/EmployeeAssignmentsList.tsx
interface EmployeeAssignmentsProps {
  employeeId: string;
  view: 'current' | 'historical' | 'upcoming';
}

// Features:
// - Multi-project assignment view
// - Timeline visualization
// - Utilization percentage display
// - Project status indicators
// - Allocation percentage by project
```

---

## Phase 2: Advanced Resource Planning Components

### **3. Resource Planning Dashboard**

#### ResourcePlanningBoard Component
```typescript
// src/components/resources/ResourcePlanningBoard.tsx
interface PlanningBoardProps {
  view: 'projects' | 'employees';
  timeframe: 'week' | 'month' | 'quarter';
}

// Kanban-style board:
// Projects → Roles → Available Employees → Assignments
// Drag-and-drop functionality
// Real-time conflict detection
// Skills matching indicators
```

#### CapacityCalendar Component
```typescript
// src/components/resources/CapacityCalendar.tsx
interface CapacityCalendarProps {
  employees: Employee[];
  startDate: Date;
  weeks: number;
  onAssignmentCreate: (assignment: Partial<ResourceAssignment>) => void;
}

// Features:
// - Weekly grid: employees × weeks
// - Color-coded allocation levels
// - Project assignment overlays
// - Drag-and-drop scheduling
// - Conflict highlighting
```

#### ConflictResolver Component
```typescript
// src/components/resources/ConflictResolver.tsx
interface ConflictResolverProps {
  conflicts: ResourceConflict[];
  onResolve: (conflictId: string, resolution: ConflictResolution) => void;
}

// Features:
// - List of resource conflicts
// - Auto-generated resolution suggestions
// - Impact analysis for each resolution
// - Bulk conflict resolution
// - Priority-based sorting
```

### **4. Skills & Availability Management**

#### SkillsBasedMatcher Component
```typescript
// src/components/resources/SkillsBasedMatcher.tsx
interface SkillsMatcherProps {
  requiredSkills: Skill[];
  minimumExperience: ExperienceLevel;
  availabilityRange: { start: Date; end: Date };
}

// Features:
// - Skills requirement definition
// - Employee skills matching with percentage
// - Availability filtering
// - Experience level filtering
// - Match quality scoring
```

---

## Phase 3: Reporting & Analytics Components

### **5. Time Tracking Interface**

#### TimeEntryForm Component
```typescript
// src/components/time/TimeEntryForm.tsx
interface TimeEntryFormProps {
  assignmentId: string;
  prefilledDate?: Date;
  onSubmit: (entry: TimeEntry) => void;
}

// Features:
// - Quick time logging
// - Assignment context display
// - Billable hours toggle
// - Description templates
// - Batch entry capabilities
```

### **6. Reporting Dashboard**

#### PlannedVsActualDashboard Component
```typescript
// src/components/reports/PlannedVsActualDashboard.tsx
interface PlannedVsActualProps {
  projectId?: string;
  employeeId?: string;
  dateRange: { start: Date; end: Date };
}

// Features:
// - Variance charts (planned vs actual)
// - Trend analysis graphs
// - Efficiency metrics
// - Drill-down capabilities
// - Export functionality
```

#### UtilizationReports Component
```typescript
// src/components/reports/UtilizationReports.tsx
interface UtilizationReportsProps {
  view: 'individual' | 'team' | 'organization';
  period: 'week' | 'month' | 'quarter';
}

// Features:
// - Resource utilization charts
// - Capacity vs demand analysis
// - Skills utilization breakdown
// - Optimization opportunities
// - Historical trends
```

---

## Hooks & State Management

### **Custom Hooks for Resource Management**

```typescript
// src/hooks/useProjects.ts
export function useProjects(filters?: ProjectFilters) {
  // Project CRUD operations
  // Real-time project updates via WebSocket
  // Optimistic updates with rollback
}

// src/hooks/useResourceAssignments.ts  
export function useResourceAssignments(projectId?: string, employeeId?: string) {
  // Assignment CRUD operations
  // Capacity validation
  // Conflict detection
}

// src/hooks/useResourcePlanning.ts
export function useResourcePlanning() {
  // Availability calculations
  // Skills-based matching
  // Optimization suggestions
  // Conflict resolution
}

// src/hooks/useTimeTracking.ts
export function useTimeTracking() {
  // Time entry logging
  // Planned vs actual calculations
  // Reporting data aggregation
}
```

### **State Management Strategy**

#### React Query for Server State
```typescript
// Project management queries
const projectQueries = {
  all: () => ['projects'],
  lists: () => [...projectQueries.all(), 'list'],
  list: (filters: ProjectFilters) => [...projectQueries.lists(), filters],
  details: () => [...projectQueries.all(), 'detail'],
  detail: (id: string) => [...projectQueries.details(), id]
};

// Resource assignment queries with optimistic updates
const assignmentMutations = {
  create: optimisticCreate,
  update: optimisticUpdate,
  delete: optimisticDelete
};
```

#### Local State for UI
```typescript
// Component-level state for UI interactions
// - Form states
// - Drag-and-drop operations
// - Modal/dialog states
// - Filter preferences (persisted to localStorage)
```

## Performance Considerations

### **Optimization Strategies**
1. **Lazy Loading**: Load components and data on-demand
2. **Virtualization**: Handle large employee/project lists efficiently
3. **Caching**: Aggressive caching of reference data (skills, departments)
4. **Debouncing**: Debounce search and filter operations
5. **Memoization**: Memo expensive calculations (capacity, conflicts)

### **Bundle Optimization**
```typescript
// Code splitting by feature area
const ProjectManagement = lazy(() => import('./pages/ProjectManagement'));
const ResourcePlanning = lazy(() => import('./pages/ResourcePlanning'));
const ReportsAnalytics = lazy(() => import('./pages/ReportsAnalytics'));
```

## User Experience Design

### **Navigation Flow**
1. **Dashboard** → Overview of projects, assignments, conflicts
2. **Projects** → Project list → Project detail → Role management → Assignment
3. **Resources** → Employee list → Multi-project view → Capacity planning
4. **Reports** → Analytics dashboard → Detailed reports → Exports

### **Responsive Design Breakpoints**
- **Desktop** (1024px+): Full feature set with side-by-side panels
- **Tablet** (768-1023px): Optimized layout with collapsible sidebars
- **Mobile** (320-767px): Stack-based layout with simplified interactions

### **Accessibility Requirements**
- WCAG 2.1 AA compliance
- Keyboard navigation for all interactions
- Screen reader support
- High contrast mode support
- Focus management for complex interactions

This frontend architecture provides a comprehensive foundation for the project-resource integration system while maintaining excellent user experience and performance characteristics.
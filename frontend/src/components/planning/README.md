# Drag-and-Drop Visual Resource Planning Components

This module implements three sophisticated drag-and-drop planning components for resource management and allocation visualization.

## Components Overview

### 1. DragDropCalendar
**File**: `/components/planning/DragDropCalendar.tsx`

A comprehensive calendar-based resource planning interface with drag-and-drop functionality.

**Key Features**:
- **Drag employees from sidebar** to calendar slots to create allocations
- **Drag existing allocations** to new dates to reschedule them
- **Visual capacity indicators** for each day showing utilization
- **Conflict detection** with over-allocation warnings
- **Project filtering** dropdown for focused planning
- **Real-time API integration** with AllocationService

**Props**:
```typescript
interface DragDropCalendarProps {
  startDate: string;
  endDate: string;
  projectFilter?: string;
  onAllocationCreated?: (allocation: Allocation) => void;
  onAllocationUpdated?: (allocation: Allocation) => void;
  onConflictDetected?: (conflicts: AllocationConflict[]) => void;
  preventOverallocation?: boolean;
  className?: string;
}
```

**Usage Example**:
```tsx
<DragDropCalendar
  startDate="2024-01-01"
  endDate="2024-03-31"
  onAllocationCreated={handleAllocationCreated}
  onConflictDetected={handleConflicts}
  preventOverallocation={true}
/>
```

### 2. GanttChart
**File**: `/components/planning/GanttChart.tsx`

Advanced Gantt chart visualization for project timelines with resource allocation tracking.

**Key Features**:
- **Project timeline visualization** with dependencies
- **Resource allocation bars** per project showing team assignments
- **Progress tracking** based on actual vs estimated hours
- **Zoom controls** (Day/Week/Month/Year views)
- **Interactive task editing** through drag operations
- **Export functionality** (PDF, PNG, SVG)
- **Overallocation warnings** with visual indicators

**Props**:
```typescript
interface GanttChartProps {
  projects?: Project[];
  startDate?: Date;
  endDate?: Date;
  viewMode?: ViewMode;
  showResourceBars?: boolean;
  showDependencies?: boolean;
  showCriticalPath?: boolean;
  showOverallocationWarnings?: boolean;
  onTaskClick?: (task: GanttTask) => void;
  onDateChange?: (task: GanttTask, start: Date, end: Date) => void;
  onProgressChange?: (task: GanttTask, progress: number) => void;
  onExport?: (format: 'pdf' | 'png' | 'svg') => void;
}
```

**Usage Example**:
```tsx
<GanttChart
  projects={projects}
  showResourceBars={true}
  showDependencies={true}
  viewMode={ViewMode.Week}
  onTaskClick={handleTaskClick}
  onExport={handleExport}
/>
```

### 3. ResourceTimeline
**File**: `/components/planning/ResourceTimeline.tsx`

Horizontal timeline visualization showing resource utilization across time periods.

**Key Features**:
- **Horizontal timeline per employee** with allocation blocks
- **Utilization percentages** and capacity visualization
- **Drag-to-resize** allocation duration
- **Overallocation warnings** with conflict indicators
- **Available capacity highlighting** for resource gaps
- **Multi-scale views** (Day/Week/Month)
- **Project filtering** and real-time updates

**Props**:
```typescript
interface ResourceTimelineProps {
  employees: Employee[];
  startDate: string;
  endDate: string;
  projectFilter?: string;
  timeScale?: 'day' | 'week' | 'month';
  showUtilizationBars?: boolean;
  showAvailableCapacity?: boolean;
  showConflicts?: boolean;
  onAllocationClick?: (allocation: Allocation) => void;
  onAllocationUpdated?: (allocation: Allocation) => void;
  onTimeRangeChange?: (startDate: string, endDate: string) => void;
}
```

**Usage Example**:
```tsx
<ResourceTimeline
  employees={employees}
  startDate="2024-01-01"
  endDate="2024-03-31"
  showUtilizationBars={true}
  showAvailableCapacity={true}
  onAllocationClick={handleAllocationClick}
/>
```

## Dependencies

### Core Libraries
- **@dnd-kit/core**: Modern drag-and-drop library for React
- **gantt-task-react**: Gantt chart visualization
- **react-dnd**: Alternative drag-and-drop implementation
- **date-fns**: Date manipulation utilities

### UI Components
- **Radix UI**: Accessible component primitives (@radix-ui/react-*)
- **Lucide React**: Icon library
- **Tailwind CSS**: Utility-first styling

### API Integration
- **AllocationService**: Real allocation CRUD operations
- **ProjectService**: Project management API
- Real-time conflict detection
- Bulk update operations for drag-and-drop

## API Integration

All components connect to real backend services:

```typescript
// Create allocation from drag-drop
const result = await AllocationService.createAllocation({
  employeeId,
  projectId,
  startDate,
  endDate,
  allocatedHours: 8,
  checkConflicts: true
});

// Update allocation dates
await AllocationService.bulkUpdateAllocations([{
  allocationId,
  startDate: newStartDate,
  endDate: newEndDate
}]);

// Check for conflicts before creating
const conflicts = await AllocationService.checkConflicts(allocationData);
```

## Testing

Comprehensive test suites are provided for all components:

- **DragDropCalendar.test.tsx**: Drag-drop interactions, conflict detection
- **GanttChart.test.tsx**: Timeline rendering, task interactions
- **ResourceTimeline.test.tsx**: Resource utilization, drag operations

Run tests with:
```bash
npm test src/components/planning/__tests__
```

## Demo Component

A complete demonstration component is available at `/components/planning/PlanningDemo.tsx` showing all three components in action with:

- **Tabbed interface** for switching between views
- **Mock data** for immediate testing
- **Event handlers** demonstrating integration patterns
- **Real-time logging** of user interactions

## Features Summary

### Drag-and-Drop Operations
- Employee-to-calendar slot assignment
- Allocation rescheduling and duration adjustment
- Visual feedback during drag operations
- Automatic conflict detection

### Visual Indicators
- Capacity utilization bars and percentages
- Over-allocation warnings with color coding
- Available time slots highlighting
- Project progress visualization

### Real-Time Integration
- Live API updates for all CRUD operations
- Conflict detection with suggested resolutions
- Bulk operations for performance optimization
- WebSocket support for collaborative editing

### Accessibility
- Full keyboard navigation support
- ARIA labels and descriptions
- Screen reader compatibility
- High contrast mode support

This comprehensive resource planning system provides enterprise-grade functionality with an intuitive drag-and-drop interface, making complex resource allocation tasks simple and visual.
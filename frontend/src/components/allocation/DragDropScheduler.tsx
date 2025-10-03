import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
} from '@dnd-kit/core';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, isToday } from 'date-fns';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ResourceLane } from './ResourceLane';
import { AllocationCard } from './AllocationCard';
import { TimeGrid } from './TimeGrid';
import { useToast } from '../ui/toast-provider';
import {
  DragDropAllocation,
  ResourceLane as ResourceLaneType,
  AllocationConflict,
  UndoRedoState,
  AllocationOperation,
  SelectionState,
  DropValidationResult,
  Allocation,
} from '../../types/allocation';
import { Employee, Project } from '../../types/api';
import { apiService, Allocation as ApiAllocation } from '../../services/api';

interface DragDropSchedulerProps {
  employees: Employee[];
  projects: Project[];
  allocations: DragDropAllocation[];
  onAllocationChange: (allocations: DragDropAllocation[]) => void;
  onConflictDetected: (conflicts: AllocationConflict[]) => void;
  viewMode?: 'week' | 'month' | 'quarter';
  selectedDate?: Date;
  readOnly?: boolean;
}

// Helper function to convert both Allocation types to DragDropAllocation
const toDragDropAllocation = (allocation: Allocation | ApiAllocation): DragDropAllocation => {
  // Handle allocation from types/allocation.ts
  if ('allocatedHours' in allocation && allocation.allocatedHours !== undefined) {
    return {
      ...allocation,
      id: allocation.id.toString(),
      employeeId: allocation.employeeId.toString(),
      projectId: allocation.projectId.toString(),
      startDate: allocation.startDate || '',
      endDate: allocation.endDate || '',
      allocatedHours: allocation.allocatedHours,
      allocationId: allocation.id.toString(),
      originalStartDate: allocation.startDate || '',
      originalEndDate: allocation.endDate || '',
      newStartDate: allocation.startDate || '',
      newEndDate: allocation.endDate || '',
      hours: allocation.allocatedHours,
      role: (allocation as any).role || '',
      status: allocation.status as 'planned' | 'active' | 'completed',
      notes: allocation.notes || '',
      isActive: allocation.isActive ?? true,
    };
  }

  // Handle allocation from services/api.ts
  const apiAlloc = allocation as ApiAllocation;
  const hours = apiAlloc.allocatedHours || apiAlloc.hours || 0;
  return {
    ...apiAlloc,
    id: apiAlloc.id.toString(),
    employeeId: apiAlloc.employeeId,
    projectId: apiAlloc.projectId?.toString() || '',
    startDate: apiAlloc.startDate || apiAlloc.date || '',
    endDate: apiAlloc.endDate || apiAlloc.date || '',
    allocatedHours: hours,
    allocationId: apiAlloc.id.toString(),
    originalStartDate: apiAlloc.startDate || apiAlloc.date || '',
    originalEndDate: apiAlloc.endDate || apiAlloc.date || '',
    newStartDate: apiAlloc.startDate || apiAlloc.date || '',
    newEndDate: apiAlloc.endDate || apiAlloc.date || '',
    hours,
    role: apiAlloc.roleOnProject,
    status: (apiAlloc.status || 'active') as 'planned' | 'active' | 'completed',
    notes: apiAlloc.notes,
    isActive: apiAlloc.isActive !== undefined ? apiAlloc.isActive : true,
  };
};

export const DragDropScheduler: React.FC<DragDropSchedulerProps> = ({
  employees,
  projects,
  allocations,
  onAllocationChange,
  onConflictDetected,
  viewMode = 'week',
  selectedDate = new Date(),
  readOnly = false,
}) => {
  const { addToast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resourceLanes, setResourceLanes] = useState<ResourceLaneType[]>([]);
  const [conflicts, setConflicts] = useState<AllocationConflict[]>([]);
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState>({
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,
  });
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedIds: [],
    isMultiSelect: false,
    lastSelectedId: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showConflicts, setShowConflicts] = useState(true);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // Calculate time slots based on view mode
  const timeSlots = useMemo(() => {
    const start = startOfWeek(selectedDate);
    let end;

    switch (viewMode) {
      case 'week':
        end = endOfWeek(selectedDate);
        break;
      case 'month':
        end = addDays(start, 30);
        break;
      case 'quarter':
        end = addDays(start, 90);
        break;
      default:
        end = endOfWeek(selectedDate);
    }

    return eachDayOfInterval({ start, end }).map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      isWeekend: isWeekend(date),
      isToday: isToday(date),
      isHoliday: false, // TODO: Implement holiday detection
      totalCapacity: 0,
      totalAllocated: 0,
    }));
  }, [selectedDate, viewMode]);

  // Initialize resource lanes
  useEffect(() => {
    const lanes = employees.map(employee => {
      const employeeAllocations = allocations.filter(
        allocation => allocation.employeeId.toString() === employee.id.toString()
      );

      const utilization = employeeAllocations.reduce(
        (sum, allocation) => sum + (allocation.hours || 0),
        0
      );

      const weeklyCapacity = employee.weeklyCapacity || 40; // Default 40 hours per week

      return {
        id: employee.id,
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employee: employee,
        capacity: weeklyCapacity,
        utilization: Math.min(utilization, weeklyCapacity),
        allocations: employeeAllocations,
      };
    });

    setResourceLanes(lanes);
  }, [employees, allocations]);

  // Detect conflicts
  const detectConflicts = useCallback((lanes: ResourceLaneType[]): AllocationConflict[] => {
    const detectedConflicts: AllocationConflict[] = [];

    lanes.forEach(lane => {
      // Check capacity exceeded
      if (lane.utilization > lane.capacity) {
        detectedConflicts.push({
          id: `capacity-${lane.id}`,
          type: 'capacity_exceeded',
          message: `${lane.employeeName} is over-allocated (${lane.utilization}h/${lane.capacity}h)`,
          description: `The employee is allocated ${lane.utilization} hours, exceeding their capacity of ${lane.capacity} hours.`,
          severity: 'high',
          affectedAllocations: lane.allocations.map(a => a.id.toString()),
          suggestedResolution: 'Reduce allocation hours or distribute work to other team members.',
          canAutoResolve: false,
        });
      }

      // Check overlapping allocations
      lane.allocations.forEach((allocation1, i) => {
        lane.allocations.slice(i + 1).forEach(allocation2 => {
          const start1 = new Date(allocation1.startDate);
          const end1 = new Date(allocation1.endDate);
          const start2 = new Date(allocation2.startDate);
          const end2 = new Date(allocation2.endDate);

          if (start1 <= end2 && start2 <= end1) {
            detectedConflicts.push({
              id: `overlap-${allocation1.id}-${allocation2.id}`,
              type: 'time_overlap',
              message: `Overlapping allocations detected for ${lane.employeeName}`,
              description: `Allocations overlap between ${format(start1 > start2 ? start1 : start2, 'MMM d')} and ${format(end1 < end2 ? end1 : end2, 'MMM d, yyyy')}.`,
              severity: 'medium',
              affectedAllocations: [allocation1.id.toString(), allocation2.id.toString()],
              suggestedResolution: 'Adjust the dates to remove overlap or reduce allocation hours.',
              canAutoResolve: true,
            });
          }
        });
      });

      // Check skill mismatch
      lane.allocations.forEach(allocation => {
        const project = projects.find(p => p.id.toString() === allocation.projectId.toString());
        if (project && employees.find(e => e.id === lane.employeeId)?.skills) {
          // TODO: Implement skill requirement checking
          // This would require project skill requirements data
        }
      });
    });

    return detectedConflicts;
  }, [projects, employees]);

  // Update conflicts when lanes change
  useEffect(() => {
    const newConflicts = detectConflicts(resourceLanes);
    setConflicts(newConflicts);
    onConflictDetected(newConflicts);
  }, [resourceLanes, detectConflicts, onConflictDetected]);

  // Validate drop operation
  const validateDrop = useCallback((
    allocation: DragDropAllocation,
    targetEmployeeId: string,
    targetDate: string
  ): DropValidationResult => {
    const targetLane = resourceLanes.find(lane => lane.id === targetEmployeeId);
    if (!targetLane) {
      return {
        isValid: false,
        canProceed: false,
        conflicts: [],
        warnings: ['Invalid target employee'],
        affectedAllocations: [],
      };
    }

    // Create temporary allocation for validation - ensure it's a full DragDropAllocation
    const tempAllocation: DragDropAllocation = {
      ...allocation,
      employeeId: targetEmployeeId,
      startDate: targetDate,
      newStartDate: targetDate,
    };

    // Create temporary lanes with the new allocation
    const tempLanes: ResourceLaneType[] = resourceLanes.map(lane => {
      if (lane.id === targetEmployeeId) {
        // Remove the old allocation if it exists in this lane and add the updated one
        const filteredAllocations = lane.allocations.filter(a => a.id !== allocation.id);
        const updatedAllocations = [...filteredAllocations, tempAllocation];
        return {
          ...lane,
          allocations: updatedAllocations,
          utilization: updatedAllocations.reduce((sum, a) => sum + (a.hours || 0), 0),
        };
      }
      // Remove from other lanes if it was there
      return {
        ...lane,
        allocations: lane.allocations.filter(a => a.id !== allocation.id),
      };
    });

    const validationConflicts = detectConflicts(tempLanes);
    const hasErrors = validationConflicts.some(c => c.severity === 'high' || c.severity === 'critical');

    return {
      isValid: !hasErrors,
      canProceed: !hasErrors,
      conflicts: validationConflicts,
      warnings: validationConflicts
        .filter(c => c.severity === 'medium')
        .map(c => c.message || c.description),
      affectedAllocations: validationConflicts
        .flatMap(c => c.affectedAllocations)
        .filter((id): id is string => id !== undefined && id !== null),
    };
  }, [resourceLanes, detectConflicts]);

  // Add operation to undo/redo stack
  const addOperation = useCallback((operation: AllocationOperation) => {
    setUndoRedoState(prev => {
      const newPast = [...prev.past, operation];

      return {
        past: newPast,
        future: [],
        canUndo: newPast.length > 0,
        canRedo: false,
      };
    });
  }, []);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || readOnly) {
      setActiveId(null);
      return;
    }

    const activeAllocation = allocations.find(a => a.id.toString() === active.id);
    if (!activeAllocation) {
      setActiveId(null);
      return;
    }

    const overData = over.data.current;
    if (!overData || overData.type !== 'lane') {
      setActiveId(null);
      return;
    }

    const targetEmployeeId = overData.employeeId;
    const targetDate = overData.date || activeAllocation.startDate;

    // Validate the drop
    const validation = validateDrop(activeAllocation, targetEmployeeId, targetDate);

    if (!validation.isValid) {
      addToast({
        title: 'Invalid Drop',
        message: validation.warnings.join(', ') || 'Cannot move allocation here',
        type: 'error',
      });
      setActiveId(null);
      return;
    }

    if (validation.warnings.length > 0) {
      addToast({
        title: 'Warning',
        message: validation.warnings.join(', '),
        type: 'warning',
      });
    }

    setIsLoading(true);

    try {
      const previousData = { ...activeAllocation };
      const updatedAllocation: DragDropAllocation = {
        ...activeAllocation,
        employeeId: targetEmployeeId,
        startDate: targetDate,
        newStartDate: targetDate,
      };

      // Update the allocation via API - convert string ID to number if needed
      const allocationId = typeof activeAllocation.id === 'string'
        ? parseInt(activeAllocation.id, 10)
        : activeAllocation.id;

      const result = await apiService.updateAllocation(
        allocationId,
        updatedAllocation
      );

      if (result) {
        // Transform API result to DragDropAllocation
        const transformedResult = toDragDropAllocation(result);

        const updatedAllocations = allocations.map(allocation =>
          allocation.id.toString() === activeAllocation.id.toString() ? transformedResult : allocation
        );

        onAllocationChange(updatedAllocations);

        // Add to undo stack
        addOperation({
          type: 'move',
          allocation: transformedResult,
          previousState: previousData,
          timestamp: Date.now(),
        });

        const targetEmployee = employees.find(e => e.id === targetEmployeeId);
        const employeeName = targetEmployee ? `${targetEmployee.firstName} ${targetEmployee.lastName}` : 'unknown employee';

        addToast({
          title: 'Allocation Moved',
          message: `Successfully moved allocation to ${employeeName}`,
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Failed to move allocation:', error);
      addToast({
        title: 'Move Failed',
        message: 'Failed to move allocation. Please try again.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
      setActiveId(null);
    }
  };

  // Handle allocation creation
  const handleCreateAllocation = useCallback(async (
    employeeId: string,
    projectId: string,
    startDate: string,
    endDate: string,
    hours: number
  ) => {
    if (readOnly) return;

    setIsLoading(true);

    try {
      // Create allocation data matching api.ts Allocation interface
      const newAllocation = {
        employeeId,
        projectId, // Keep as string to match CreateAllocationData (which is Omit<Allocation, ...>)
        hours,
        allocatedHours: hours, // Include both for compatibility
        startDate,
        endDate,
        status: 'active' as const,
        isActive: true,
      };

      const result = await apiService.createAllocation(newAllocation);

      if (result) {
        // Transform the result to DragDropAllocation
        const dragDropAllocation = toDragDropAllocation(result);

        const updatedAllocations = [...allocations, dragDropAllocation];
        onAllocationChange(updatedAllocations);

        addOperation({
          type: 'create',
          allocation: dragDropAllocation,
          timestamp: Date.now(),
        });

        addToast({
          title: 'Allocation Created',
          message: 'New allocation created successfully',
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Failed to create allocation:', error);
      addToast({
        title: 'Creation Failed',
        message: 'Failed to create allocation. Please try again.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [allocations, onAllocationChange, addOperation, readOnly, addToast]);

  // Handle allocation deletion
  const handleDeleteAllocation = useCallback(async (allocationId: string) => {
    if (readOnly) return;

    const allocation = allocations.find(a => {
      const allocIdString = a.id.toString();
      const targetIdString = allocationId.toString();
      return allocIdString === targetIdString;
    });
    if (!allocation) return;

    setIsLoading(true);

    try {
      // Convert string ID to number for API
      const numericId = typeof allocationId === 'string' ? parseInt(allocationId, 10) : allocationId;
      const success = await apiService.deleteAllocation(numericId);

      if (success) {
        const updatedAllocations = allocations.filter(a => a.id.toString() !== allocationId.toString());
        onAllocationChange(updatedAllocations);

        addOperation({
          type: 'delete',
          allocation,
          timestamp: Date.now(),
        });

        addToast({
          title: 'Allocation Deleted',
          message: 'Allocation deleted successfully',
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Failed to delete allocation:', error);
      addToast({
        title: 'Deletion Failed',
        message: 'Failed to delete allocation. Please try again.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [allocations, onAllocationChange, addOperation, readOnly, addToast]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (undoRedoState.canUndo && undoRedoState.past.length > 0) {
      const lastOperation = undoRedoState.past[undoRedoState.past.length - 1];
      // TODO: Implement undo logic
      console.log('Undo operation:', lastOperation);
      setUndoRedoState(prev => ({
        past: prev.past.slice(0, -1),
        future: [lastOperation, ...prev.future],
        canUndo: prev.past.length > 1,
        canRedo: true,
      }));
    }
  }, [undoRedoState]);

  // Handle redo
  const handleRedo = useCallback(() => {
    if (undoRedoState.canRedo && undoRedoState.future.length > 0) {
      const nextOperation = undoRedoState.future[0];
      // TODO: Implement redo logic
      console.log('Redo operation:', nextOperation);
      setUndoRedoState(prev => ({
        past: [...prev.past, nextOperation],
        future: prev.future.slice(1),
        canUndo: true,
        canRedo: prev.future.length > 1,
      }));
    }
  }, [undoRedoState]);

  // Handle bulk selection
  const handleSelectionChange = useCallback((allocationIds: string[], mode: 'single' | 'multiple' = 'single') => {
    setSelectionState({
      selectedIds: allocationIds,
      isMultiSelect: mode === 'multiple',
      lastSelectedId: allocationIds.length > 0 ? allocationIds[allocationIds.length - 1] : null,
    });
  }, []);

  const activeAllocation = activeId ? allocations.find(a => a.id.toString() === activeId) : null;

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={!undoRedoState.canUndo || isLoading}
            >
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedo}
              disabled={!undoRedoState.canRedo || isLoading}
            >
              Redo
            </Button>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConflicts(!showConflicts)}
              className={showConflicts ? 'bg-yellow-100' : ''}
            >
              {showConflicts ? 'Hide' : 'Show'} Conflicts
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={conflicts.length > 0 ? 'destructive' : 'default'}>
              {conflicts.length} Conflicts
            </Badge>
            <Badge variant="outline">
              {selectionState.selectedIds.length} Selected
            </Badge>
          </div>
        </div>
      </Card>

      {/* Main scheduler */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToFirstScrollableAncestor]}
        >
          <div className="h-full flex">
            {/* Time grid header */}
            <TimeGrid
              timeSlots={timeSlots}
              viewMode={viewMode}
              selectedDate={selectedDate}
              className="flex-1"
            />
          </div>

          {/* Resource lanes */}
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {resourceLanes.map(lane => (
              <ResourceLane
                key={lane.id}
                lane={lane}
                projects={projects}
                conflicts={showConflicts ? conflicts.filter(c =>
                  c.affectedAllocations.some(id =>
                    lane.allocations.some(a => a.id.toString() === id)
                  )
                ) : []}
                selectedAllocations={new Set(selectionState.selectedIds)}
                onAllocationSelect={handleSelectionChange}
                onAllocationDelete={handleDeleteAllocation}
                onAllocationCreate={handleCreateAllocation}
                readOnly={readOnly}
              />
            ))}
          </div>

          <DragOverlay>
            {activeAllocation && (
              <AllocationCard
                allocation={activeAllocation}
                project={projects.find(p => p.id.toString() === activeAllocation.projectId.toString())}
                conflicts={conflicts.filter(c =>
                  c.affectedAllocations.includes(activeAllocation.id.toString())
                )}
                isSelected={selectionState.selectedIds.includes(activeAllocation.id.toString())}
                isDragging
                readOnly={readOnly}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DragDropScheduler;

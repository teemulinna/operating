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
  closestCorners,
  rectIntersection,
} from '@dnd-kit/core';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend } from 'date-fns';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { ResourceLane } from './ResourceLane';
import { AllocationCard } from './AllocationCard';
import { TimeGrid } from './TimeGrid';
import { toast } from '../ui/toast';
import {
  DragDropAllocation,
  ResourceLane as ResourceLaneType,
  AllocationConflict,
  UndoRedoState,
  AllocationOperation,
  SelectionState,
  DropValidationResult,
} from '../../types/allocation';
import { Employee, Project } from '../../types/api';
import { apiService } from '../../services/api';

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resourceLanes, setResourceLanes] = useState<ResourceLaneType[]>([]);
  const [conflicts, setConflicts] = useState<AllocationConflict[]>([]);
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState>({
    operations: [],
    currentIndex: -1,
    maxOperations: 50,
  });
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedAllocations: new Set(),
    selectionMode: 'single',
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
      isHoliday: false, // TODO: Implement holiday detection
      totalCapacity: 0,
      totalAllocated: 0,
    }));
  }, [selectedDate, viewMode]);

  // Initialize resource lanes
  useEffect(() => {
    const lanes = employees.map(employee => {
      const employeeAllocations = allocations.filter(
        allocation => allocation.employeeId.toString() === employee.id
      );

      const utilization = employeeAllocations.reduce(
        (sum, allocation) => sum + (allocation.hours || 0),
        0
      );

      return {
        id: employee.id,
        employee,
        capacity: employee.capacity || 40, // Default 40 hours per week
        utilization: Math.min(utilization, employee.capacity || 40),
        allocations: employeeAllocations,
        conflicts: [],
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
          message: `${lane.employee.name} is over-allocated (${lane.utilization}h/${lane.capacity}h)`,
          severity: 'error',
          affectedAllocations: lane.allocations.map(a => a.id),
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
              type: 'overlap',
              message: `Overlapping allocations detected for ${lane.employee.name}`,
              severity: 'warning',
              affectedAllocations: [allocation1.id, allocation2.id],
            });
          }
        });
      });

      // Check skill mismatch
      lane.allocations.forEach(allocation => {
        const project = projects.find(p => p.id === allocation.projectId);
        if (project && lane.employee.skills) {
          // TODO: Implement skill requirement checking
          // This would require project skill requirements data
        }
      });
    });

    return detectedConflicts;
  }, [projects]);

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
        conflicts: [],
        warnings: ['Invalid target employee'],
      };
    }

    // Create temporary allocation for validation
    const tempAllocation = {
      ...allocation,
      employeeId: parseInt(targetEmployeeId),
      date: targetDate,
    };

    // Create temporary lanes with the new allocation
    const tempLanes = resourceLanes.map(lane => {
      if (lane.id === targetEmployeeId) {
        const updatedAllocations = [...lane.allocations, tempAllocation];
        return {
          ...lane,
          allocations: updatedAllocations,
          utilization: updatedAllocations.reduce((sum, a) => sum + (a.hours || 0), 0),
        };
      }
      return lane;
    });

    const validationConflicts = detectConflicts(tempLanes);
    const hasErrors = validationConflicts.some(c => c.severity === 'error');

    return {
      isValid: !hasErrors,
      conflicts: validationConflicts,
      warnings: validationConflicts
        .filter(c => c.severity === 'warning')
        .map(c => c.message),
    };
  }, [resourceLanes, detectConflicts]);

  // Add operation to undo/redo stack
  const addOperation = useCallback((operation: AllocationOperation) => {
    setUndoRedoState(prev => {
      const newOperations = [
        ...prev.operations.slice(0, prev.currentIndex + 1),
        operation,
      ];

      // Limit the number of operations
      if (newOperations.length > prev.maxOperations) {
        newOperations.shift();
      }

      return {
        ...prev,
        operations: newOperations,
        currentIndex: newOperations.length - 1,
      };
    });
  }, []);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over, delta } = event;
    
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
    const targetDate = overData.date || activeAllocation.date;

    // Validate the drop
    const validation = validateDrop(activeAllocation, targetEmployeeId, targetDate);
    
    if (!validation.isValid) {
      toast({
        title: 'Invalid Drop',
        description: validation.warnings.join(', ') || 'Cannot move allocation here',
        variant: 'destructive',
      });
      setActiveId(null);
      return;
    }

    if (validation.warnings.length > 0) {
      toast({
        title: 'Warning',
        description: validation.warnings.join(', '),
        variant: 'default',
      });
    }

    setIsLoading(true);

    try {
      const previousData = { ...activeAllocation };
      const updatedAllocation = {
        ...activeAllocation,
        employeeId: parseInt(targetEmployeeId),
        date: targetDate,
        position: {
          x: activeAllocation.position.x + delta.x,
          y: activeAllocation.position.y + delta.y,
        },
      };

      // Update the allocation via API
      const result = await apiService.updateAllocation(
        activeAllocation.id,
        updatedAllocation
      );

      if (result) {
        const updatedAllocations = allocations.map(allocation =>
          allocation.id === activeAllocation.id ? updatedAllocation : allocation
        );

        onAllocationChange(updatedAllocations);

        // Add to undo stack
        addOperation({
          type: 'move',
          allocation: updatedAllocation,
          previousData,
          timestamp: Date.now(),
        });

        toast({
          title: 'Allocation Moved',
          description: `Successfully moved allocation to ${employees.find(e => e.id === targetEmployeeId)?.name}`,
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Failed to move allocation:', error);
      toast({
        title: 'Move Failed',
        description: 'Failed to move allocation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setActiveId(null);
    }
  };

  // Handle allocation creation
  const handleCreateAllocation = useCallback(async (
    employeeId: string,
    projectId: number,
    startDate: string,
    endDate: string,
    hours: number
  ) => {
    if (readOnly) return;

    setIsLoading(true);

    try {
      const newAllocation = {
        employeeId: parseInt(employeeId),
        projectId,
        hours,
        date: startDate,
        startDate,
        endDate,
        duration: Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)),
        status: 'active' as const,
        position: { x: 0, y: 0 },
        dimensions: { width: 200, height: 60 },
      };

      const result = await apiService.createAllocation(newAllocation);

      if (result) {
        const updatedAllocations = [...allocations, result];
        onAllocationChange(updatedAllocations);

        addOperation({
          type: 'create',
          allocation: result,
          timestamp: Date.now(),
        });

        toast({
          title: 'Allocation Created',
          description: 'New allocation created successfully',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Failed to create allocation:', error);
      toast({
        title: 'Creation Failed',
        description: 'Failed to create allocation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [allocations, onAllocationChange, addOperation, readOnly]);

  // Handle allocation deletion
  const handleDeleteAllocation = useCallback(async (allocationId: number) => {
    if (readOnly) return;

    const allocation = allocations.find(a => a.id === allocationId);
    if (!allocation) return;

    setIsLoading(true);

    try {
      const success = await apiService.deleteAllocation(allocationId);

      if (success) {
        const updatedAllocations = allocations.filter(a => a.id !== allocationId);
        onAllocationChange(updatedAllocations);

        addOperation({
          type: 'delete',
          allocation,
          timestamp: Date.now(),
        });

        toast({
          title: 'Allocation Deleted',
          description: 'Allocation deleted successfully',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Failed to delete allocation:', error);
      toast({
        title: 'Deletion Failed',
        description: 'Failed to delete allocation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [allocations, onAllocationChange, addOperation, readOnly]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (undoRedoState.currentIndex >= 0) {
      const operation = undoRedoState.operations[undoRedoState.currentIndex];
      // TODO: Implement undo logic
      console.log('Undo operation:', operation);
      setUndoRedoState(prev => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
    }
  }, [undoRedoState]);

  // Handle redo
  const handleRedo = useCallback(() => {
    if (undoRedoState.currentIndex < undoRedoState.operations.length - 1) {
      const operation = undoRedoState.operations[undoRedoState.currentIndex + 1];
      // TODO: Implement redo logic
      console.log('Redo operation:', operation);
      setUndoRedoState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    }
  }, [undoRedoState]);

  // Handle bulk selection
  const handleSelectionChange = useCallback((allocationIds: number[], mode: 'single' | 'multiple' = 'single') => {
    setSelectionState(prev => ({
      ...prev,
      selectedAllocations: new Set(allocationIds),
      selectionMode: mode,
    }));
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
              disabled={undoRedoState.currentIndex < 0 || isLoading}
            >
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedo}
              disabled={
                undoRedoState.currentIndex >= undoRedoState.operations.length - 1 || isLoading
              }
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
              {selectionState.selectedAllocations.size} Selected
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
                timeSlots={timeSlots}
                conflicts={showConflicts ? conflicts.filter(c => 
                  c.affectedAllocations.some(id => 
                    lane.allocations.some(a => a.id === id)
                  )
                ) : []}
                selectedAllocations={selectionState.selectedAllocations}
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
                project={projects.find(p => p.id === activeAllocation.projectId)}
                conflicts={conflicts.filter(c => 
                  c.affectedAllocations.includes(activeAllocation.id)
                )}
                isSelected={selectionState.selectedAllocations.has(activeAllocation.id)}
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
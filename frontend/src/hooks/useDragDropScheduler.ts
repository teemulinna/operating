import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend } from 'date-fns';
import {
  DragDropAllocation,
  AllocationConflict,
  AllocationStatus,
  Allocation as TypeAllocation,
} from '../types/allocation';
import { Employee, Project, Allocation as ApiAllocation } from '../services/api';
import { apiService } from '../services/api';

// Additional types needed for the hook
export interface TimeSlot {
  date: string;
  isWeekend: boolean;
  isToday: boolean;
}

export interface ResourceLane {
  id: string;
  employeeId: string;
  employeeName: string;
  employee: Employee;
  allocations: DragDropAllocation[];
  totalHours: number;
  capacity: number;
  utilization: number;
}

export interface UndoRedoState {
  operations: AllocationOperation[];
  currentIndex: number;
}

export interface AllocationOperation {
  type: 'create' | 'update' | 'delete' | 'move';
  allocationId: number;
  oldData?: DragDropAllocation | DragDropAllocation[];
  newData?: DragDropAllocation | DragDropAllocation[];
  timestamp: Date;
}

export interface SelectionState {
  selectedAllocations: Set<number>;
  selectionMode: 'single' | 'multiple';
}

export interface DropValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface BulkOperationResult {
  successful: number[];
  failed: number[];
  errors: { allocationId: number; error: string }[];
}

interface UseDragDropSchedulerProps {
  employees: Employee[];
  projects: Project[];
  initialAllocations: DragDropAllocation[];
  viewMode?: 'week' | 'month' | 'quarter';
  selectedDate?: Date;
  onAllocationChange?: (allocations: DragDropAllocation[]) => void;
  onConflictDetected?: (conflicts: AllocationConflict[]) => void;
  maxUndoOperations?: number;
}

interface UseDragDropSchedulerReturn {
  // State
  allocations: DragDropAllocation[];
  resourceLanes: ResourceLane[];
  conflicts: AllocationConflict[];
  timeSlots: TimeSlot[];
  selectionState: SelectionState;
  undoRedoState: UndoRedoState;
  isLoading: boolean;

  // Actions
  handleAllocationMove: (allocationId: number, targetEmployeeId: string, targetDate: string) => Promise<boolean>;
  handleAllocationCreate: (employeeId: string[], projectId: number, startDate: string, hours: number) => Promise<boolean>;
  handleAllocationUpdate: (allocationId: number, updates: Partial<DragDropAllocation>) => Promise<boolean>;
  handleAllocationDelete: (allocationIds: number[]) => Promise<boolean>;
  handleBulkOperation: (operation: 'move' | 'update' | 'delete', allocationIds: number[], params?: any) => Promise<BulkOperationResult>;

  // Selection
  handleSelectionChange: (allocationIds: number[], mode?: 'single' | 'multiple') => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => Promise<boolean>;
  handleRedo: () => Promise<boolean>;

  // Validation
  validateDrop: (allocationId: number, targetEmployeeId: string, targetDate: string) => DropValidationResult;
  detectConflicts: (allocations: DragDropAllocation[]) => AllocationConflict[];

  // Utility
  refreshData: () => Promise<void>;
  exportData: (format: 'json' | 'csv') => string;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Helper function to transform API Allocation to DragDropAllocation
const transformToDragDropAllocation = (allocation: ApiAllocation | TypeAllocation): DragDropAllocation => {
  const allocatedHours = (allocation as any).allocatedHours || (allocation as any).hours || 0;
  const startDate = allocation.startDate || (allocation as any).date || '';
  const endDate = allocation.endDate || (allocation as any).date || '';

  return {
    // Core Allocation properties
    id: typeof allocation.id === 'string' ? allocation.id : allocation.id.toString(),
    employeeId: allocation.employeeId,
    projectId: typeof allocation.projectId === 'string' ? allocation.projectId : allocation.projectId.toString(),
    startDate,
    endDate,
    allocatedHours,
    role: (allocation as any).roleOnProject || (allocation as any).role || '',
    status: (allocation.status || 'active') as AllocationStatus,
    notes: allocation.notes,
    isActive: allocation.isActive !== undefined ? allocation.isActive : true,
    createdAt: allocation.createdAt,
    updatedAt: allocation.updatedAt,

    // DragDropAllocation specific properties
    allocationId: typeof allocation.id === 'string' ? allocation.id : allocation.id.toString(),
    originalStartDate: startDate,
    originalEndDate: endDate,
    newStartDate: startDate,
    newEndDate: endDate,
    hours: allocatedHours,
    billableRate: (allocation as any).billableRate,
  };
};

const useDragDropScheduler = ({
  employees,
  projects,
  initialAllocations,
  viewMode = 'week',
  selectedDate = new Date(),
  onAllocationChange,
  onConflictDetected,
  maxUndoOperations = 50,
}: UseDragDropSchedulerProps): UseDragDropSchedulerReturn => {
  // State
  const [allocations, setAllocations] = useState<DragDropAllocation[]>(initialAllocations);
  const [conflicts, setConflicts] = useState<AllocationConflict[]>([]);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedAllocations: new Set(),
    selectionMode: 'single',
  });
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState>({
    operations: [],
    currentIndex: -1,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Toast function
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }, []);

  // Compute time slots based on view mode
  const timeSlots = useMemo((): TimeSlot[] => {
    const start = startOfWeek(selectedDate);
    const end = endOfWeek(selectedDate);
    const days = eachDayOfInterval({ start, end });

    return days.map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      isWeekend: isWeekend(date),
      isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
    }));
  }, [selectedDate, viewMode]);

  // Compute resource lanes
  const resourceLanes = useMemo((): ResourceLane[] => {
    return employees.map(employee => {
      const employeeAllocations = allocations.filter(
        alloc => alloc.employeeId === employee.id
      );

      const totalHours = employeeAllocations.reduce((sum, alloc) => sum + alloc.allocatedHours, 0);
      const capacity = employee.weeklyCapacity || employee.capacity || 40;
      const utilization = capacity > 0 ? Math.round((totalHours / capacity) * 100) : 0;

      return {
        id: employee.id,
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employee,
        allocations: employeeAllocations,
        totalHours,
        capacity,
        utilization,
      };
    });
  }, [employees, allocations]);

  // Conflict detection
  const detectConflicts = useCallback((allocs: DragDropAllocation[]): AllocationConflict[] => {
    const conflictList: AllocationConflict[] = [];

    allocs.forEach((alloc, index) => {
      allocs.slice(index + 1).forEach(otherAlloc => {
        if (
          alloc.employeeId === otherAlloc.employeeId &&
          alloc.startDate <= otherAlloc.endDate &&
          alloc.endDate >= otherAlloc.startDate
        ) {
          conflictList.push({
            id: `conflict-${alloc.id}-${otherAlloc.id}`,
            type: 'time_overlap',
            affectedAllocations: [String(alloc.id), String(otherAlloc.id)],
            message: `Overlapping allocations for employee ${alloc.employeeId}`,
            description: `Overlapping allocations for employee ${alloc.employeeId}`,
            severity: 'high',
            canAutoResolve: false,
          });
        }
      });

      // Check capacity conflicts
      const employee = employees.find(e => e.id === alloc.employeeId);
      if (employee) {
        const totalHours = allocs
          .filter(a => a.employeeId === alloc.employeeId)
          .reduce((sum, a) => sum + a.allocatedHours, 0);

        const capacity = employee.weeklyCapacity || employee.capacity || 40;
        if (totalHours > capacity) {
          const employeeName = `${employee.firstName} ${employee.lastName}`;
          conflictList.push({
            id: `capacity-${alloc.id}`,
            type: 'overallocation',
            affectedAllocations: [String(alloc.id)],
            message: `Employee ${employeeName} over-allocated (${totalHours}h/${capacity}h capacity)`,
            description: `Employee ${employeeName} over-allocated (${totalHours}h/${capacity}h capacity)`,
            severity: 'medium',
            canAutoResolve: false,
          });
        }
      }
    });

    return conflictList;
  }, [employees]);

  // Update conflicts when allocations change
  useEffect(() => {
    const newConflicts = detectConflicts(allocations);
    setConflicts(newConflicts);
    onConflictDetected?.(newConflicts);
  }, [allocations, detectConflicts, onConflictDetected]);

  // Drop validation
  const validateDrop = useCallback(
    (allocationId: number, targetEmployeeId: string, targetDate: string): DropValidationResult => {
      const allocation = allocations.find(a => parseInt(a.id) === allocationId);
      if (!allocation) {
        return { isValid: false, reason: 'Allocation not found' };
      }

      const targetEmployee = employees.find(e => e.id === targetEmployeeId);
      if (!targetEmployee) {
        return { isValid: false, reason: 'Target employee not found' };
      }

      // Check for conflicts with existing allocations
      const wouldConflict = allocations.some(
        a =>
          parseInt(a.id) !== allocationId &&
          a.employeeId === targetEmployeeId &&
          a.startDate <= targetDate &&
          a.endDate >= targetDate
      );

      if (wouldConflict) {
        return { isValid: false, reason: 'Time slot already allocated' };
      }

      return { isValid: true };
    },
    [allocations, employees]
  );

  // Record operation for undo/redo
  const recordOperation = useCallback((operation: AllocationOperation) => {
    setUndoRedoState(prev => {
      const newOperations = prev.operations.slice(0, prev.currentIndex + 1);
      newOperations.push(operation);

      // Limit operations to maxUndoOperations
      if (newOperations.length > maxUndoOperations) {
        newOperations.shift();
      }

      return {
        operations: newOperations,
        currentIndex: newOperations.length - 1,
      };
    });
  }, [maxUndoOperations]);

  // Move allocation
  const handleAllocationMove = useCallback(
    async (allocationId: number, targetEmployeeId: string, targetDate: string): Promise<boolean> => {
      const validation = validateDrop(allocationId, targetEmployeeId, targetDate);
      if (!validation.isValid) {
        showToast(validation.reason || 'Invalid move', 'error');
        return false;
      }

      const allocation = allocations.find(a => parseInt(a.id) === allocationId);
      if (!allocation) return false;

      const oldData = { ...allocation };

      try {
        setIsLoading(true);
        const updated = await apiService.updateAllocation(allocationId, {
          employeeId: targetEmployeeId,
          date: targetDate,
          startDate: targetDate,
        });

        if (!updated) {
          showToast('Failed to update allocation', 'error');
          return false;
        }

        const updatedDragDrop = transformToDragDropAllocation(updated);

        setAllocations(prev =>
          prev.map(a => (parseInt(a.id) === allocationId ? updatedDragDrop : a))
        );

        recordOperation({
          type: 'move',
          allocationId,
          oldData,
          newData: updatedDragDrop,
          timestamp: new Date(),
        });

        onAllocationChange?.(allocations);
        return true;
      } catch (error) {
        console.error('Failed to move allocation:', error);
        showToast('Failed to update allocation', 'error');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [allocations, validateDrop, recordOperation, onAllocationChange, showToast]
  );

  // Create allocation
  const handleAllocationCreate = useCallback(
    async (
      employeeIds: string[],
      projectId: number,
      startDate: string,
      hours: number
    ): Promise<boolean> => {
      try {
        setIsLoading(true);
        const newAllocations = await Promise.all(
          employeeIds.map(employeeId =>
            apiService.createAllocation({
              employeeId,
              projectId: projectId.toString(),
              date: startDate,
              startDate,
              endDate: startDate,
              hours,
            })
          )
        );

        const newDragDropAllocations = newAllocations.map(transformToDragDropAllocation);

        setAllocations(prev => [...prev, ...newDragDropAllocations]);

        recordOperation({
          type: 'create',
          allocationId: parseInt(newDragDropAllocations[0].id),
          newData: newDragDropAllocations,
          timestamp: new Date(),
        });

        onAllocationChange?.(allocations);
        showToast(`Created ${newAllocations.length} allocation(s)`, 'success');
        return true;
      } catch (error) {
        console.error('Failed to create allocation:', error);
        showToast('Failed to create allocation', 'error');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [recordOperation, onAllocationChange, allocations, showToast]
  );

  // Update allocation
  const handleAllocationUpdate = useCallback(
    async (allocationId: number, updates: Partial<DragDropAllocation>): Promise<boolean> => {
      const allocation = allocations.find(a => parseInt(a.id) === allocationId);
      if (!allocation) return false;

      const oldData = { ...allocation };

      try {
        setIsLoading(true);
        const updated = await apiService.updateAllocation(allocationId, updates);

        if (!updated) {
          showToast('Failed to update allocation', 'error');
          return false;
        }

        const updatedDragDrop = transformToDragDropAllocation(updated);

        setAllocations(prev =>
          prev.map(a => (parseInt(a.id) === allocationId ? updatedDragDrop : a))
        );

        recordOperation({
          type: 'update',
          allocationId,
          oldData,
          newData: updatedDragDrop,
          timestamp: new Date(),
        });

        onAllocationChange?.(allocations);
        return true;
      } catch (error) {
        console.error('Failed to update allocation:', error);
        showToast('Failed to update allocation', 'error');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [allocations, recordOperation, onAllocationChange, showToast]
  );

  // Delete allocation
  const handleAllocationDelete = useCallback(
    async (allocationIds: number[]): Promise<boolean> => {
      const toDelete = allocations.filter(a => allocationIds.includes(parseInt(a.id)));

      try {
        setIsLoading(true);
        await Promise.all(allocationIds.map(id => apiService.deleteAllocation(id)));

        setAllocations(prev => prev.filter(a => !allocationIds.includes(parseInt(a.id))));

        recordOperation({
          type: 'delete',
          allocationId: allocationIds[0],
          oldData: toDelete,
          timestamp: new Date(),
        });

        onAllocationChange?.(allocations);
        showToast(`Deleted ${allocationIds.length} allocation(s)`, 'success');
        return true;
      } catch (error) {
        console.error('Failed to delete allocations:', error);
        showToast('Failed to delete allocations', 'error');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [allocations, recordOperation, onAllocationChange, showToast]
  );

  // Bulk operations
  const handleBulkOperation = useCallback(
    async (
      operation: 'move' | 'update' | 'delete',
      allocationIds: number[],
      params?: any
    ): Promise<BulkOperationResult> => {
      const results: BulkOperationResult = {
        successful: [],
        failed: [],
        errors: [],
      };

      for (const id of allocationIds) {
        try {
          let success = false;

          switch (operation) {
            case 'move':
              success = await handleAllocationMove(id, params.targetEmployeeId, params.targetDate);
              break;
            case 'update':
              success = await handleAllocationUpdate(id, params.updates);
              break;
            case 'delete':
              success = await handleAllocationDelete([id]);
              break;
          }

          if (success) {
            results.successful.push(id);
          } else {
            results.failed.push(id);
          }
        } catch (error) {
          results.failed.push(id);
          results.errors.push({ allocationId: id, error: String(error) });
        }
      }

      return results;
    },
    [handleAllocationMove, handleAllocationUpdate, handleAllocationDelete]
  );

  // Selection management
  const handleSelectionChange = useCallback((allocationIds: number[], mode: 'single' | 'multiple' = 'single') => {
    setSelectionState({
      selectedAllocations: new Set(allocationIds),
      selectionMode: mode,
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionState({
      selectedAllocations: new Set(),
      selectionMode: 'single',
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectionState({
      selectedAllocations: new Set(allocations.map(a => parseInt(a.id))),
      selectionMode: 'multiple',
    });
  }, [allocations]);

  // Undo/Redo functionality
  const canUndo = undoRedoState.currentIndex >= 0;
  const canRedo = undoRedoState.currentIndex < undoRedoState.operations.length - 1;

  const handleUndo = useCallback(async (): Promise<boolean> => {
    if (!canUndo) return false;

    const operation = undoRedoState.operations[undoRedoState.currentIndex];
    // TODO: Implement undo logic based on operation type
    console.log('Undo operation:', operation);

    setUndoRedoState(prev => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
    return true;
  }, [undoRedoState, canUndo]);

  const handleRedo = useCallback(async (): Promise<boolean> => {
    if (!canRedo) return false;

    const operation = undoRedoState.operations[undoRedoState.currentIndex + 1];
    // TODO: Implement redo logic based on operation type
    console.log('Redo operation:', operation);

    setUndoRedoState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    return true;
  }, [undoRedoState, canRedo]);

  // Refresh data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const freshAllocations = await apiService.getAllocations();
      const dragDropAllocations = freshAllocations.map(transformToDragDropAllocation);
      setAllocations(dragDropAllocations);
      onAllocationChange?.(dragDropAllocations);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      showToast('Failed to refresh allocation data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onAllocationChange, showToast]);

  // Export data
  const exportData = useCallback((format: 'json' | 'csv'): string => {
    if (format === 'json') {
      return JSON.stringify({
        allocations,
        conflicts,
        resourceLanes,
        exportedAt: new Date().toISOString(),
      }, null, 2);
    }

    // CSV export
    const headers = ['ID', 'Employee', 'Project', 'Hours', 'Start Date', 'End Date', 'Status'];
    const rows = allocations.map(alloc => {
      const employee = employees.find(e => e.id === alloc.employeeId);
      const project = projects.find(p => p.id.toString() === alloc.projectId);
      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
      return [
        alloc.id,
        employeeName,
        project?.name || 'Unknown',
        alloc.allocatedHours,
        alloc.startDate,
        alloc.endDate,
        alloc.status,
      ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }, [allocations, conflicts, resourceLanes, employees, projects]);

  return {
    // State
    allocations,
    resourceLanes,
    conflicts,
    timeSlots,
    selectionState,
    undoRedoState,
    isLoading,

    // Actions
    handleAllocationMove,
    handleAllocationCreate,
    handleAllocationUpdate,
    handleAllocationDelete,
    handleBulkOperation,

    // Selection
    handleSelectionChange,
    clearSelection,
    selectAll,

    // Undo/Redo
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,

    // Validation
    validateDrop,
    detectConflicts,

    // Utility
    refreshData,
    exportData,
    showToast,
  };
};

export default useDragDropScheduler;

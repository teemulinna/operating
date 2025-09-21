import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
import { AllocationService } from '../../services/allocationService';
import { useToastManager, ToastNotification } from '../../hooks/useToastManager';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';
import type { Allocation, AllocationConflict, CreateAllocationRequest } from '../../types/allocation';
import type { Employee, Project } from '../../services/api';

interface CalendarData {
  allocations: Allocation[];
  employees: { id: string; name: string }[];
  projects: { id: string; name: string; clientName: string }[];
}

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

interface DragItem {
  type: 'employee' | 'allocation';
  employeeId?: string;
  allocationId?: string;
  projectId?: string;
  allocation?: Allocation;
}

interface DropZoneData {
  date: string;
  employeeId?: string;
  projectId?: string;
}

// Draggable Employee Component
const DraggableEmployee = ({ employee }: { employee: { id: string; name: string } }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `employee-${employee.id}`,
    data: {
      type: 'employee',
      employeeId: employee.id,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'p-2 bg-white border rounded-lg cursor-grab shadow-sm hover:shadow-md transition-shadow',
        isDragging && 'opacity-50'
      )}
    >
      <div className="text-sm font-medium">{employee.name}</div>
      <div className="text-xs text-gray-500">Available</div>
    </div>
  );
};

// Draggable Allocation Component
const DraggableAllocation = ({ allocation }: { allocation: Allocation }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `allocation-${allocation.id}`,
    data: {
      type: 'allocation',
      allocationId: allocation.id,
      allocation,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'p-2 bg-blue-100 border border-blue-200 rounded cursor-grab text-xs',
        isDragging && 'opacity-50'
      )}
    >
      <div className="font-medium text-blue-800 truncate">
        {allocation.projectName}
      </div>
      <div className="text-blue-600">{allocation.allocatedHours}h</div>
    </div>
  );
};

// Droppable Calendar Cell Component
const DroppableCalendarCell = ({ 
  date, 
  employeeId, 
  allocations, 
  employee,
  onHover 
}: { 
  date: string; 
  employeeId?: string; 
  allocations: Allocation[];
  employee?: { id: string; name: string };
  onHover?: (allocation: Allocation | null) => void;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${date}-${employeeId || 'project'}`,
    data: {
      date,
      employeeId,
    },
  });

  const dayAllocations = allocations.filter(allocation => {
    const allocationStart = parseISO(allocation.startDate);
    const allocationEnd = parseISO(allocation.endDate);
    const cellDate = parseISO(date);
    
    return cellDate >= allocationStart && cellDate <= allocationEnd &&
           (!employeeId || allocation.employeeId === employeeId);
  });

  const totalHours = dayAllocations.reduce((sum, allocation) => sum + allocation.allocatedHours, 0);
  const isOverCapacity = totalHours > 8; // Assuming 8-hour workday

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[60px] border border-gray-200 p-1 relative',
        isOver && 'bg-blue-50 border-blue-300',
        isOverCapacity && 'bg-red-50'
      )}
      data-testid={`capacity-indicator-${date}-${employeeId}`}
    >
      {/* Capacity indicator */}
      <div className="absolute top-1 right-1 text-xs">
        <span className={cn(
          'px-1 py-0.5 rounded text-xs',
          isOverCapacity ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
        )}>
          {totalHours}h
        </span>
      </div>

      {/* Allocations */}
      <div className="space-y-1 mt-4">
        {dayAllocations.map(allocation => (
          <div
            key={allocation.id}
            className="relative"
            onMouseEnter={() => onHover?.(allocation)}
            onMouseLeave={() => onHover?.(null)}
          >
            <DraggableAllocation allocation={allocation} />
          </div>
        ))}
      </div>

      {/* Drop zone indicator */}
      {isOver && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50/50 flex items-center justify-center">
          <div className="text-sm text-blue-600 font-medium">Drop here</div>
        </div>
      )}
    </div>
  );
};

export const DragDropCalendar: React.FC<DragDropCalendarProps> = ({
  startDate,
  endDate,
  projectFilter,
  onAllocationCreated,
  onAllocationUpdated,
  onConflictDetected,
  preventOverallocation = false,
  className,
}) => {
  const [calendarData, setCalendarData] = useState<CalendarData>({
    allocations: [],
    employees: [],
    projects: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredAllocation, setHoveredAllocation] = useState<Allocation | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>(projectFilter || 'all');
  const [showProjectSelectionDialog, setShowProjectSelectionDialog] = useState(false);
  const [pendingAllocation, setPendingAllocation] = useState<{
    dragData: DragItem;
    dropData: DropZoneData;
  } | null>(null);
  const [allocationHours, setAllocationHours] = useState('8');
  const [selectedProjectForAllocation, setSelectedProjectForAllocation] = useState('');
  
  const { toast, showError, showSuccess, showWarning, hideToast } = useToastManager();

  // Generate date range
  const dateRange = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const dates: Date[] = [];
    let current = start;
    
    while (current <= end) {
      dates.push(new Date(current));
      current = addDays(current, 1);
    }
    
    return dates;
  }, [startDate, endDate]);

  // Load calendar data
  const loadCalendarData = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters = selectedProject !== 'all' ? { projectId: selectedProject } : {};
      const data = await AllocationService.getCalendarData(startDate, endDate, filters);
      setCalendarData(data);
    } catch (error: any) {
      console.error('Failed to load calendar data:', error);
      showError(error.response?.data?.message || 'Failed to load calendar data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedProject, showError]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const dragData = active.data.current as DragItem;
    const dropData = over.data.current as DropZoneData;

    if (!dragData || !dropData) return;

    try {
      if (dragData.type === 'employee') {
        // For new allocations, show project selection dialog if multiple projects available
        if (calendarData.projects.length > 1) {
          setPendingAllocation({ dragData, dropData });
          setSelectedProjectForAllocation(calendarData.projects[0]?.id || '');
          setShowProjectSelectionDialog(true);
        } else if (calendarData.projects.length === 1) {
          // Single project - create directly
          await handleCreateAllocation(dragData, dropData, calendarData.projects[0].id);
        } else {
          showError('No projects available. Please create a project first.');
        }
      } else if (dragData.type === 'allocation') {
        // Update existing allocation
        await handleUpdateAllocation(dragData, dropData);
      }
    } catch (error) {
      console.error('Failed to handle drag end:', error);
      showError('Failed to process drag operation. Please try again.');
    }
  };

  // Create new allocation
  const handleCreateAllocation = async (dragData: DragItem, dropData: DropZoneData, projectId?: string) => {
    if (!dragData.employeeId) {
      showError('Employee information missing. Please try again.');
      return;
    }

    if (!projectId && !selectedProjectForAllocation) {
      showError('Please select a project for this allocation.');
      return;
    }

    setIsOperationLoading(true);
    
    try {
      const allocationData: CreateAllocationRequest = {
        employeeId: dragData.employeeId,
        projectId: projectId || selectedProjectForAllocation,
        startDate: dropData.date,
        endDate: dropData.date,
        allocatedHours: parseInt(allocationHours) || 8,
        status: 'planned',
        checkConflicts: preventOverallocation,
        isActive: true,
      };

      // Check conflicts first if prevention is enabled
      if (preventOverallocation) {
        const conflicts = await AllocationService.checkConflicts(allocationData);
        if (conflicts.length > 0) {
          const conflictMessages = conflicts.map(c => c.description).join(', ');
          showWarning(`Conflicts detected: ${conflictMessages}`);
          onConflictDetected?.(conflicts);
          return;
        }
      }

      const result = await AllocationService.createAllocation(allocationData);
      
      if (result.conflicts && result.conflicts.length > 0) {
        const conflictMessages = result.conflicts.map(c => c.description).join(', ');
        showWarning(`Allocation created with conflicts: ${conflictMessages}`);
        onConflictDetected?.(result.conflicts);
      } else {
        showSuccess('Allocation created successfully');
      }

      onAllocationCreated?.(result.allocation);
      await loadCalendarData();
      
    } catch (error: any) {
      console.error('Failed to create allocation:', error);
      showError(error.response?.data?.message || 'Failed to create allocation. Please try again.');
    } finally {
      setIsOperationLoading(false);
    }
  };

  // Update existing allocation
  const handleUpdateAllocation = async (dragData: DragItem, dropData: DropZoneData) => {
    if (!dragData.allocationId || !dragData.allocation) {
      showError('Allocation information missing. Please try again.');
      return;
    }

    setIsOperationLoading(true);
    
    try {
      const allocation = dragData.allocation;
      const updates = {
        allocationId: dragData.allocationId,
        startDate: dropData.date,
        endDate: dropData.date,
        allocatedHours: allocation.allocatedHours,
      };

      const result = await AllocationService.bulkUpdateAllocations([updates]);

      if (result.failed && result.failed.length > 0) {
        const failedMessages = result.failed.map(f => f.error).join(', ');
        showError(`Failed to update allocation: ${failedMessages}`);
        return;
      }

      if (result.conflicts && result.conflicts.length > 0) {
        const conflictMessages = result.conflicts.map(c => c.description).join(', ');
        showWarning(`Allocation updated with conflicts: ${conflictMessages}`);
        onConflictDetected?.(result.conflicts);
      } else {
        showSuccess('Allocation updated successfully');
      }

      if (result.updated.length > 0) {
        onAllocationUpdated?.(result.updated[0]);
      }

      await loadCalendarData();
      
    } catch (error: any) {
      console.error('Failed to update allocation:', error);
      showError(error.response?.data?.message || 'Failed to update allocation. Please try again.');
    } finally {
      setIsOperationLoading(false);
    }
  };

  // Handle project selection dialog submit
  const handleProjectSelectionSubmit = () => {
    if (pendingAllocation && selectedProjectForAllocation) {
      handleCreateAllocation(
        pendingAllocation.dragData,
        pendingAllocation.dropData,
        selectedProjectForAllocation
      );
    }
    setShowProjectSelectionDialog(false);
    setPendingAllocation(null);
    setAllocationHours('8');
    setSelectedProjectForAllocation('');
  };

  // Get active drag item
  const activeDragItem = useMemo(() => {
    if (!activeId) return null;

    if (activeId.startsWith('employee-')) {
      const employeeId = activeId.replace('employee-', '');
      const employee = calendarData.employees.find(e => e.id === employeeId);
      return employee ? <DraggableEmployee employee={employee} /> : null;
    }

    if (activeId.startsWith('allocation-')) {
      const allocationId = activeId.replace('allocation-', '');
      const allocation = calendarData.allocations.find(a => a.id === allocationId);
      return allocation ? <DraggableAllocation allocation={allocation} /> : null;
    }

    return null;
  }, [activeId, calendarData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header with filters */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">Resource Planning Calendar</h2>
        <div className="flex items-center gap-4">
          <select 
            value={selectedProject} 
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-48 h-10 px-3 py-2 rounded-md border border-gray-300 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Project filter"
          >
            <option value="all">All Projects</option>
            {calendarData.projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={rectIntersection}
      >
        {/* Loading overlay */}
        {isOperationLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Processing allocation...</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Employee Sidebar */}
          <div className="w-64 border-r bg-gray-50 p-4">
            <h3 className="font-medium mb-4">Available Employees</h3>
            <div className="space-y-2">
              {calendarData.employees.map(employee => (
                <DraggableEmployee key={employee.id} employee={employee} />
              ))}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-auto">
            <div className="min-w-max">
              {/* Header row */}
              <div className="flex border-b bg-gray-50 sticky top-0 z-10">
                <div className="w-32 p-2 border-r font-medium">Employee</div>
                {dateRange.map(date => (
                  <div
                    key={date.toISOString()}
                    className="w-32 p-2 border-r text-center font-medium"
                  >
                    <div className="text-xs text-gray-500">
                      {format(date, 'EEE')}
                    </div>
                    <div>{format(date, 'MMM dd')}</div>
                  </div>
                ))}
              </div>

              {/* Employee rows */}
              {calendarData.employees.map(employee => (
                <div key={employee.id} className="flex border-b">
                  <div 
                    className="w-32 p-2 border-r bg-gray-50 font-medium"
                    data-testid={`employee-timeline-${employee.id}`}
                  >
                    {employee.name}
                  </div>
                  {dateRange.map(date => (
                    <div key={date.toISOString()} className="w-32">
                      <DroppableCalendarCell
                        date={date.toISOString().split('T')[0]}
                        employeeId={employee.id}
                        allocations={calendarData.allocations}
                        employee={employee}
                        onHover={setHoveredAllocation}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeDragItem}
        </DragOverlay>
      </DndContext>

      {/* Project Selection Dialog */}
      <Dialog open={showProjectSelectionDialog} onOpenChange={setShowProjectSelectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Allocation</DialogTitle>
            <DialogDescription>
              Select a project and allocation details for this employee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-select">Project</Label>
              <select
                id="project-select"
                value={selectedProjectForAllocation}
                onChange={(e) => setSelectedProjectForAllocation(e.target.value)}
                className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select a project...</option>
                {calendarData.projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name} - {project.clientName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allocation-hours">Hours per Week</Label>
              <Input
                id="allocation-hours"
                type="number"
                min="1"
                max="40"
                value={allocationHours}
                onChange={(e) => setAllocationHours(e.target.value)}
                placeholder="8"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowProjectSelectionDialog(false);
                  setPendingAllocation(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProjectSelectionSubmit}
                disabled={!selectedProjectForAllocation || !allocationHours}
              >
                Create Allocation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Allocation details tooltip */}
      {hoveredAllocation && (
        <div className="absolute z-50 bg-black text-white p-2 rounded text-sm pointer-events-none">
          <div className="font-medium">{hoveredAllocation.employeeName}</div>
          <div>{hoveredAllocation.allocatedHours} hours/week</div>
          <div className="text-gray-300">{hoveredAllocation.role}</div>
        </div>
      )}

      {/* Toast Notification */}
      <ToastNotification toast={toast} onClose={hideToast} />
    </div>
  );
};

export default DragDropCalendar;
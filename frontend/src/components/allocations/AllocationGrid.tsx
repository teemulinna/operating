import React, { useState, useMemo, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, UsersIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCalendarData, useBulkUpdateAllocations } from '@/hooks/useAllocations';
import { useToast } from '@/hooks/useToast';
import type { Allocation, DragDropAllocation, AllocationFilters } from '@/types/allocation';
import { ALLOCATION_STATUS_COLORS } from '@/types/allocation';

interface AllocationGridProps {
  filters?: AllocationFilters;
  onAllocationClick?: (allocation: Allocation) => void;
  onAllocationEdit?: (allocation: Allocation) => void;
  onCreateAllocation?: (date: Date, employeeId?: string) => void;
}

interface DragItem {
  type: string;
  allocation: Allocation;
}

interface DropResult {
  date: Date;
  employeeId: string;
}

const ItemTypes = {
  ALLOCATION: 'allocation',
};

// Allocation cell component with drag functionality
function AllocationCell({ allocation, onEdit, onClick }: {
  allocation: Allocation;
  onEdit?: (allocation: Allocation) => void;
  onClick?: (allocation: Allocation) => void;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ALLOCATION,
    item: { type: ItemTypes.ALLOCATION, allocation },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const statusColor = ALLOCATION_STATUS_COLORS[allocation.status] || 'bg-gray-100 text-gray-800';

  return (
    <div
      ref={drag}
      className={`
        relative p-2 m-1 rounded-md border cursor-pointer transition-all duration-200
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${statusColor}
        hover:shadow-md hover:scale-105
      `}
      onClick={() => onClick?.(allocation)}
      onDoubleClick={() => onEdit?.(allocation)}
      title={`${allocation.projectName} - ${allocation.allocatedHours}h/week`}
    >
      <div className="text-xs font-medium truncate">
        {allocation.projectName}
      </div>
      <div className="text-xs opacity-75 flex items-center">
        <ClockIcon className="h-3 w-3 mr-1" />
        {allocation.allocatedHours}h
      </div>
      {allocation.role && (
        <div className="text-xs opacity-75 truncate">
          {allocation.role}
        </div>
      )}
    </div>
  );
}

// Drop zone for calendar cells
function CalendarCell({ date, employeeId, allocations, onDrop, onCreateAllocation }: {
  date: Date;
  employeeId: string;
  allocations: Allocation[];
  onDrop: (allocation: Allocation, date: Date, employeeId: string) => void;
  onCreateAllocation?: (date: Date, employeeId: string) => void;
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.ALLOCATION,
    drop: (item: DragItem) => {
      onDrop(item.allocation, date, employeeId);
      return { date, employeeId };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const isToday = isSameDay(date, new Date());
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div
      ref={drop}
      className={`
        relative min-h-[80px] p-1 border border-gray-200
        ${isToday ? 'bg-blue-50 border-blue-200' : ''}
        ${isWeekend ? 'bg-gray-50' : 'bg-white'}
        ${isOver ? 'bg-green-50 border-green-300 border-2' : ''}
        hover:bg-gray-50
      `}
      onClick={() => onCreateAllocation?.(date, employeeId)}
    >
      <div className="text-xs font-medium text-gray-500 mb-1">
        {format(date, 'd')}
      </div>
      <div className="space-y-1">
        {allocations.map((allocation) => (
          <AllocationCell
            key={allocation.id}
            allocation={allocation}
          />
        ))}
      </div>
      {isOver && (
        <div className="absolute inset-0 bg-green-100 opacity-50 border-2 border-green-300 border-dashed rounded" />
      )}
    </div>
  );
}

export function AllocationGrid({ 
  filters,
  onAllocationClick,
  onAllocationEdit,
  onCreateAllocation 
}: AllocationGridProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const { toast } = useToast();

  const bulkUpdateMutation = useBulkUpdateAllocations();

  // Calculate date range for data fetching
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Sunday
  
  // Extend range for month view
  const displayStart = viewMode === 'month' ? subWeeks(weekStart, 2) : weekStart;
  const displayEnd = viewMode === 'month' ? addWeeks(weekEnd, 2) : weekEnd;

  // Fetch calendar data
  const { data: calendarData, isLoading, error } = useCalendarData(
    format(displayStart, 'yyyy-MM-dd'),
    format(displayEnd, 'yyyy-MM-dd'),
    filters
  );

  // Generate days for the grid
  const days = useMemo(() => {
    return eachDayOfInterval({ start: displayStart, end: displayEnd });
  }, [displayStart, displayEnd]);

  // Group allocations by employee and date
  const allocationsByEmployeeAndDate = useMemo(() => {
    if (!calendarData?.allocations) return {};

    const grouped: Record<string, Record<string, Allocation[]>> = {};

    calendarData.allocations.forEach((allocation) => {
      const startDate = parseISO(allocation.startDate);
      const endDate = parseISO(allocation.endDate);

      // Find all dates this allocation spans within our view range
      const allocationDays = eachDayOfInterval({ start: startDate, end: endDate })
        .filter(day => day >= displayStart && day <= displayEnd);

      allocationDays.forEach(day => {
        const employeeId = allocation.employeeId;
        const dateKey = format(day, 'yyyy-MM-dd');

        if (!grouped[employeeId]) {
          grouped[employeeId] = {};
        }
        if (!grouped[employeeId][dateKey]) {
          grouped[employeeId][dateKey] = [];
        }
        
        grouped[employeeId][dateKey].push(allocation);
      });
    });

    return grouped;
  }, [calendarData?.allocations, displayStart, displayEnd]);

  // Handle drag and drop
  const handleDrop = useCallback(async (allocation: Allocation, newDate: Date, newEmployeeId: string) => {
    try {
      const currentStartDate = parseISO(allocation.startDate);
      const currentEndDate = parseISO(allocation.endDate);
      const duration = Math.ceil((currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const newStartDate = newDate;
      const newEndDate = new Date(newDate);
      newEndDate.setDate(newEndDate.getDate() + duration);

      const updates = [{
        allocationId: allocation.id,
        startDate: format(newStartDate, 'yyyy-MM-dd'),
        endDate: format(newEndDate, 'yyyy-MM-dd'),
      }];

      const result = await bulkUpdateMutation.mutateAsync(updates);

      if (result.conflicts && result.conflicts.length > 0) {
        toast({
          title: 'Conflicts Detected',
          description: `${result.conflicts.length} conflict(s) detected. Please resolve them.`,
          variant: 'warning',
        });
      } else {
        toast({
          title: 'Allocation Updated',
          description: 'Allocation has been successfully moved.',
          variant: 'success',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update allocation.',
        variant: 'destructive',
      });
    }
  }, [bulkUpdateMutation, toast]);

  const handleCreateAllocation = useCallback((date: Date, employeeId?: string) => {
    onCreateAllocation?.(date, employeeId);
  }, [onCreateAllocation]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1));
    }
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-red-600">Failed to load allocation data</p>
            <p className="text-sm text-gray-500 mt-2">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5" />
                Resource Allocation Calendar
              </CardTitle>
              <div className="text-sm text-gray-600">
                {format(displayStart, 'MMM d')} - {format(displayEnd, 'MMM d, yyyy')}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View mode selector */}
              <Select value={viewMode} onValueChange={(value: 'week' | 'month') => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week View</SelectItem>
                  <SelectItem value="month">Month View</SelectItem>
                </SelectContent>
              </Select>

              {/* Navigation */}
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Statistics */}
          {calendarData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                <UsersIcon className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <div className="text-sm font-medium text-blue-900">Active Employees</div>
                  <div className="text-lg font-bold text-blue-700">{calendarData.employees.length}</div>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-green-50 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <div className="text-sm font-medium text-green-900">Active Projects</div>
                  <div className="text-lg font-bold text-green-700">{calendarData.projects.length}</div>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                <ClockIcon className="h-5 w-5 text-purple-600 mr-2" />
                <div>
                  <div className="text-sm font-medium text-purple-900">Total Allocations</div>
                  <div className="text-lg font-bold text-purple-700">{calendarData.allocations.length}</div>
                </div>
              </div>
            </div>
          )}

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header with days */}
              <div className="grid grid-cols-8 gap-px bg-gray-200 mb-1">
                <div className="bg-gray-50 p-3 text-sm font-medium text-gray-700">
                  Employee
                </div>
                {viewMode === 'week' ? (
                  days.slice(0, 7).map((day) => (
                    <div key={day.toISOString()} className="bg-gray-50 p-3 text-center">
                      <div className="text-xs font-medium text-gray-500">
                        {format(day, 'EEE')}
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        {format(day, 'd')}
                      </div>
                    </div>
                  ))
                ) : (
                  // For month view, show a simplified header
                  days.slice(0, 7).map((day, index) => (
                    <div key={index} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-700">
                      {format(addWeeks(weekStart, Math.floor(index / 7)), 'EEE')}
                    </div>
                  ))
                )}
              </div>

              {/* Employee rows */}
              {calendarData?.employees.map((employee) => (
                <div key={employee.id} className="grid grid-cols-8 gap-px bg-gray-200 mb-1">
                  {/* Employee name column */}
                  <div className="bg-white p-3 flex items-center">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {employee.name}
                    </div>
                  </div>
                  
                  {/* Calendar cells */}
                  {(viewMode === 'week' ? days.slice(0, 7) : days.slice(0, 7)).map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const allocations = allocationsByEmployeeAndDate[employee.id]?.[dateKey] || [];
                    
                    return (
                      <CalendarCell
                        key={`${employee.id}-${dateKey}`}
                        date={day}
                        employeeId={employee.id}
                        allocations={allocations}
                        onDrop={handleDrop}
                        onCreateAllocation={handleCreateAllocation}
                      />
                    );
                  })}
                </div>
              ))}

              {/* Empty state */}
              {!calendarData?.employees.length && (
                <div className="text-center py-12">
                  <div className="text-gray-500">No employees found for the selected criteria</div>
                  <div className="text-sm text-gray-400 mt-1">Try adjusting your filters</div>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Legend</div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2"></div>
                <span className="text-xs text-gray-600">Active</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded mr-2"></div>
                <span className="text-xs text-gray-600">Planned</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded mr-2"></div>
                <span className="text-xs text-gray-600">Completed</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-100 border border-red-200 rounded mr-2"></div>
                <span className="text-xs text-gray-600">Cancelled</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Drag allocations to reschedule • Click empty cells to create new allocations • Double-click to edit
            </div>
          </div>
        </CardContent>
      </Card>
    </DndProvider>
  );
}
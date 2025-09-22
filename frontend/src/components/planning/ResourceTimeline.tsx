import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { format, addDays, startOfWeek, endOfWeek, parseISO, differenceInDays } from 'date-fns';
import { AllocationService } from '../../services/allocationService';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { AlertTriangle, ZoomIn, ZoomOut } from 'lucide-react';
import type { Allocation, Employee } from '../../services/api';

interface EmployeeUtilization {
  employeeId: string;
  name: string;
  totalCapacity: number;
  totalAllocated: number;
  utilizationRate: number;
  allocations: Allocation[];
}

interface AllocationConflict {
  employeeId: string;
  date: string;
  totalHours: number;
  capacity: number;
  conflicts: Allocation[];
}

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
  className?: string;
}

interface DragItem {
  type: 'allocation';
  allocationId: string;
  originalStartDate: string;
  originalEndDate: string;
}

interface TimelineData {
  [employeeId: string]: EmployeeUtilization;
}

// Draggable Allocation Block
const AllocationBlock = ({ 
  allocation, 
  employee, 
  timelineWidth, 
  startDate, 
  endDate,
  onAllocationClick 
}: {
  allocation: Allocation;
  employee: Employee;
  timelineWidth: number;
  startDate: string;
  endDate: string;
  onAllocationClick?: (allocation: Allocation) => void;
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'allocation',
    item: {
      type: 'allocation',
      allocationId: allocation.id,
      originalStartDate: allocation.startDate,
      originalEndDate: allocation.endDate,
    } as DragItem,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  // Calculate position and width
  const timelineStart = parseISO(startDate);
  const timelineEnd = parseISO(endDate);
  const allocationStart = parseISO(allocation.startDate);
  const allocationEnd = parseISO(allocation.endDate);

  const totalDays = differenceInDays(timelineEnd, timelineStart);
  const startOffset = Math.max(0, differenceInDays(allocationStart, timelineStart));
  const duration = differenceInDays(allocationEnd, allocationStart) + 1;

  const leftPercent = (startOffset / totalDays) * 100;
  const widthPercent = (duration / totalDays) * 100;

  // Calculate utilization percentage
  const utilizationPercent = employee.weeklyCapacity > 0 ? 
    Math.round((allocation.allocatedHours / employee.weeklyCapacity) * 100) : 0;

  // Determine color based on project or utilization
  const getBlockColor = () => {
    if (utilizationPercent > 100) return 'bg-red-500';
    if (utilizationPercent > 80) return 'bg-orange-500';
    if (utilizationPercent > 60) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div
      ref={drag}
      data-testid={`allocation-block-${allocation.id}`}
      className={cn(
        'absolute h-8 rounded cursor-move transition-opacity',
        getBlockColor(),
        isDragging && 'opacity-50'
      )}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        minWidth: '20px',
      }}
      onClick={() => onAllocationClick?.(allocation)}
    >
      <div className="p-1 text-xs text-white font-medium overflow-hidden">
        <div className="truncate">{allocation.projectName}</div>
        <div className="text-white/80">{utilizationPercent}%</div>
      </div>
      
      {/* Resize handles */}
      <div className="absolute left-0 top-0 w-1 h-full bg-white/30 cursor-ew-resize" />
      <div className="absolute right-0 top-0 w-1 h-full bg-white/30 cursor-ew-resize" />
    </div>
  );
};

// Employee Timeline Row
const EmployeeTimelineRow = ({ 
  employee, 
  utilization, 
  startDate, 
  endDate, 
  timeScale, 
  showUtilizationBars, 
  showAvailableCapacity, 
  showConflicts,
  onAllocationClick,
  projectFilter 
}: {
  employee: Employee;
  utilization: EmployeeUtilization;
  startDate: string;
  endDate: string;
  timeScale: 'day' | 'week' | 'month';
  showUtilizationBars: boolean;
  showAvailableCapacity: boolean;
  showConflicts: boolean;
  onAllocationClick?: (allocation: Allocation) => void;
  projectFilter?: string;
}) => {
  const [, drop] = useDrop(() => ({
    accept: 'allocation',
    drop: (item: DragItem) => {
      // Handle allocation move/resize
      console.log('Dropped allocation:', item);
    },
  }));

  // Filter allocations by project if specified
  const filteredAllocations = utilization.allocations.filter(allocation =>
    !projectFilter || allocation.projectId === projectFilter
  );

  return (
    <div 
      data-testid={`employee-timeline-${employee.id}`}
      className={cn(
        'border-b border-gray-200',
        utilization.overallocated && 'bg-red-50 overallocated'
      )}
    >
      <div className="flex">
        {/* Employee Info */}
        <div className="w-48 p-3 border-r bg-gray-50 flex items-center justify-between">
          <div>
            <div className="font-medium">{employee.firstName} {employee.lastName}</div>
            <div className="text-sm text-gray-500">{employee.position}</div>
          </div>
          
          {/* Utilization indicator */}
          {showUtilizationBars && (
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">
                {utilization.utilizationRate}%
              </div>
              <div 
                data-testid={`utilization-bar-${employee.id}`}
                className="w-16 h-2 bg-gray-200 rounded"
              >
                <div
                  className={cn(
                    'h-full rounded',
                    utilization.utilizationRate > 100 ? 'bg-red-500' :
                    utilization.utilizationRate > 80 ? 'bg-orange-500' :
                    'bg-green-500'
                  )}
                  style={{ width: `${Math.min(100, utilization.utilizationRate)}%` }}
                />
              </div>
            </div>
          )}

          {/* Overallocation warning */}
          {utilization.overallocated && showConflicts && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle 
                    className="h-4 w-4 text-red-500"
                    data-testid={`overallocation-warning-${employee.id}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    {utilization.conflicts.map(conflict => (
                      <div key={conflict.id}>{conflict.description}</div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Timeline */}
        <div 
          ref={drop}
          className="flex-1 relative min-h-[60px] bg-white"
          data-testid={`timeline-scale-${timeScale}`}
        >
          {/* Available capacity background */}
          {showAvailableCapacity && utilization.availableHours > 0 && (
            <div 
              className="absolute inset-0 bg-green-100 opacity-30"
              data-testid={`available-capacity-${employee.id}`}
            >
              <div className="absolute right-2 top-1 text-xs text-green-700">
                {utilization.availableHours}h available
              </div>
            </div>
          )}

          {/* Allocation blocks */}
          {filteredAllocations.map(allocation => (
            <AllocationBlock
              key={allocation.id}
              allocation={allocation}
              employee={employee}
              timelineWidth={800} // This would be calculated from container
              startDate={startDate}
              endDate={endDate}
              onAllocationClick={onAllocationClick}
            />
          ))}

          {/* Conflict indicators */}
          {showConflicts && utilization.conflicts.map(conflict => (
            <TooltipProvider key={conflict.id}>
              <Tooltip>
                <TooltipTrigger>
                  <div 
                    className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"
                    data-testid={`conflict-indicator-${employee.id}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">{conflict.description}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ResourceTimeline: React.FC<ResourceTimelineProps> = ({
  employees,
  startDate,
  endDate,
  projectFilter,
  timeScale = 'week',
  showUtilizationBars = true,
  showAvailableCapacity = false,
  showConflicts = true,
  onAllocationClick,
  onAllocationUpdated,
  onTimeRangeChange,
  className,
}) => {
  const [timelineData, setTimelineData] = useState<TimelineData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentTimeScale, setCurrentTimeScale] = useState(timeScale);

  // Generate timeline dates based on scale
  const timelineDates = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const dates: Date[] = [];
    let current = start;
    
    while (current <= end) {
      dates.push(new Date(current));
      if (currentTimeScale === 'day') {
        current = addDays(current, 1);
      } else if (currentTimeScale === 'week') {
        current = addDays(current, 7);
      } else {
        current = addDays(current, 30); // Approximate month
      }
    }
    
    return dates;
  }, [startDate, endDate, currentTimeScale]);

  // Load employee utilization data
  const loadTimelineData = useCallback(async () => {
    try {
      setIsLoading(true);
      const employeeIds = employees.map(e => e.id);
      const utilization = await AllocationService.getMultipleEmployeeUtilization(
        employeeIds,
        startDate,
        endDate
      );
      setTimelineData(utilization);
    } catch (error) {
      console.error('Failed to load timeline data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [employees, startDate, endDate]);

  useEffect(() => {
    loadTimelineData();
  }, [loadTimelineData]);

  // Handle allocation updates
  const handleAllocationUpdated = useCallback(async (dragItem: DragItem, newEndDate: string) => {
    try {
      const result = await AllocationService.updateAllocation(dragItem.allocationId, {
        endDate: newEndDate,
      });
      
      onAllocationUpdated?.(result.allocation);
      loadTimelineData();
    } catch (error) {
      console.error('Failed to update allocation:', error);
    }
  }, [onAllocationUpdated, loadTimelineData]);

  // Time scale controls
  const handleZoomIn = () => {
    if (currentTimeScale === 'month') setCurrentTimeScale('week');
    else if (currentTimeScale === 'week') setCurrentTimeScale('day');
  };

  const handleZoomOut = () => {
    if (currentTimeScale === 'day') setCurrentTimeScale('week');
    else if (currentTimeScale === 'week') setCurrentTimeScale('month');
  };

  if (isLoading) {
    return (
      <Card className={cn('h-96', className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading resource timeline...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Card className={cn('h-full', className)} data-testid="dnd-provider">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Resource Timeline</CardTitle>
            <div className="flex items-center gap-2">
              {/* Time Scale Selector */}
              <Select
                value={currentTimeScale}
                onValueChange={(value: 'day' | 'week' | 'month') => setCurrentTimeScale(value)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border rounded">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={currentTimeScale === 'month'}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={currentTimeScale === 'day'}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="border-b">
            {/* Timeline Header */}
            <div className="flex">
              <div className="w-48 p-3 border-r bg-gray-100 font-medium">
                Employee
              </div>
              <div 
                className="flex-1 flex overflow-x-auto"
                data-testid="timeline-scroll-container"
              >
                {timelineDates.map((date, index) => (
                  <div
                    key={index}
                    className="min-w-[100px] p-2 border-r text-center text-xs font-medium bg-gray-100"
                  >
                    {currentTimeScale === 'day' && format(date, 'MMM dd')}
                    {currentTimeScale === 'week' && `Week ${format(date, 'w')}`}
                    {currentTimeScale === 'month' && format(date, 'MMM yyyy')}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Employee Rows */}
          <div className="max-h-96 overflow-y-auto">
            {employees.map(employee => {
              const utilization = timelineData[employee.id];
              if (!utilization) return null;

              return (
                <EmployeeTimelineRow
                  key={employee.id}
                  employee={employee}
                  utilization={utilization}
                  startDate={startDate}
                  endDate={endDate}
                  timeScale={currentTimeScale}
                  showUtilizationBars={showUtilizationBars}
                  showAvailableCapacity={showAvailableCapacity}
                  showConflicts={showConflicts}
                  onAllocationClick={onAllocationClick}
                  projectFilter={projectFilter}
                />
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Under 60%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>60-80%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>80-100%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Over 100%</span>
                </div>
              </div>
              
              <div className="text-gray-600">
                {employees.length} employees • 
                {Object.values(timelineData).filter(u => u.overallocated).length} overallocated
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DndProvider>
  );
};

export default ResourceTimeline;
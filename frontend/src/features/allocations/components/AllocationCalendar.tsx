import React from 'react';
import type { Allocation, Employee, Project } from '../hooks/useAllocationOperations';
import type { OverAllocationWarning } from '../hooks/useOverAllocationCheck';

interface AllocationCalendarProps {
  allocations: Allocation[];
  employees: Employee[];
  projects: Project[];
  overAllocationWarnings?: OverAllocationWarning[];
  onDateSelect?: (date: Date) => void;
  onAllocationClick?: (allocation: Allocation) => void;
  selectedDate?: Date;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  allocations: Array<Allocation & { employee?: Employee; project?: Project }>;
  isOverAllocated: boolean;
  totalHours: number;
}

export const AllocationCalendar: React.FC<AllocationCalendarProps> = ({
  allocations,
  employees,
  projects,
  overAllocationWarnings = [],
  onDateSelect,
  onAllocationClick,
  selectedDate
}) => {
  const [currentDate, setCurrentDate] = React.useState(selectedDate || new Date());
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate calendar days for the current month
  const generateCalendarDays = React.useMemo((): CalendarDay[] => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Find the Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    // Find the Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const days: CalendarDay[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayAllocations = allocations
        .filter(allocation => {
          const allocStart = new Date(allocation.startDate);
          const allocEnd = new Date(allocation.endDate);
          return allocStart <= current && allocEnd >= current;
        })
        .map(allocation => ({
          ...allocation,
          employee: employees.find(e => e.id === allocation.employeeId),
          project: projects.find(p => p.id === allocation.projectId)
        }));

      const totalHours = dayAllocations.reduce((sum, alloc) => sum + (alloc.allocatedHours / 7), 0); // Convert weekly hours to daily
      
      // Check if this date has over-allocation warnings
      const isOverAllocated = overAllocationWarnings.some(warning => {
        const warningDate = new Date(warning.weekStartDate);
        const warningEndDate = new Date(warning.weekEndDate);
        return current >= warningDate && current <= warningEndDate;
      });

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === currentDate.getMonth(),
        isToday: current.getTime() === today.getTime(),
        allocations: dayAllocations,
        isOverAllocated,
        totalHours
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate, allocations, employees, projects, overAllocationWarnings, today]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (day: CalendarDay) => {
    onDateSelect?.(day.date);
  };

  const getUtilizationColor = (totalHours: number): string => {
    if (totalHours === 0) return 'bg-white';
    if (totalHours <= 4) return 'bg-green-100'; // Low utilization
    if (totalHours <= 6) return 'bg-yellow-100'; // Medium utilization
    if (totalHours <= 8) return 'bg-orange-100'; // High utilization
    return 'bg-red-100'; // Over-allocation
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Resource Calendar</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-lg font-semibold text-gray-900 min-w-[150px] text-center">
              {currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              aria-label="Next month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
          {weekDays.map(day => (
            <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-lg overflow-hidden">
          {generateCalendarDays.map((day, index) => (
            <div
              key={day.date.getTime()}
              className={`
                min-h-[100px] p-1 cursor-pointer transition-colors
                ${getUtilizationColor(day.totalHours)}
                ${day.isOverAllocated ? 'border-2 border-red-400' : 'border'}
                ${day.isCurrentMonth ? '' : 'opacity-40'}
                ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                hover:bg-blue-50
              `}
              onClick={() => handleDateClick(day)}
              data-testid={`calendar-day-${day.date.toISOString().split('T')[0]}`}
            >
              {/* Date Number */}
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-medium ${
                  day.isToday ? 'text-blue-600' : 
                  day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {day.date.getDate()}
                </span>
                {day.isOverAllocated && (
                  <span className="text-red-500 text-xs font-bold" title="Over-allocated">⚠️</span>
                )}
              </div>

              {/* Allocations for this day */}
              <div className="space-y-1">
                {day.allocations.slice(0, 3).map((allocation, idx) => (
                  <div
                    key={allocation.id}
                    className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-blue-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAllocationClick?.(allocation);
                    }}
                    title={`${allocation.employee?.firstName} ${allocation.employee?.lastName} - ${allocation.project?.name}`}
                  >
                    {allocation.employee?.firstName?.[0]}{allocation.employee?.lastName?.[0]} - {allocation.project?.name?.substring(0, 8)}
                  </div>
                ))}
                
                {day.allocations.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{day.allocations.length - 3} more
                  </div>
                )}
              </div>

              {/* Hours Summary */}
              {day.totalHours > 0 && (
                <div className="mt-1 text-xs text-gray-600 text-center">
                  {day.totalHours.toFixed(1)}h
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 bg-gray-50 border-t">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 border rounded"></div>
              <span className="text-gray-600">Low (≤4h)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-100 border rounded"></div>
              <span className="text-gray-600">Medium (≤6h)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-100 border rounded"></div>
              <span className="text-gray-600">High (≤8h)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-100 border-2 border-red-400 rounded"></div>
              <span className="text-gray-600">Over-allocated ({'>8h'})</span>
            </div>
          </div>
          <div className="text-gray-500">
            Click date to select • Click allocation to view details
          </div>
        </div>
      </div>
    </div>
  );
};
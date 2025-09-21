import React from 'react';
import type { Allocation, Employee, Project } from '../hooks/useAllocationOperations';

interface AllocationGridProps {
  allocations: Allocation[];
  employees: Employee[];
  projects: Project[];
  onAllocationClick?: (allocation: Allocation) => void;
}

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  allocations: (Allocation & { employee?: Employee; project?: Project })[];
}

export const AllocationGrid: React.FC<AllocationGridProps> = ({
  allocations,
  employees,
  projects,
  onAllocationClick
}) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  // Get current week's Monday
  const getWeekStart = (date: Date): Date => {
    const monday = new Date(date);
    monday.setDate(date.getDate() - date.getDay() + 1);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Generate weeks for the current month
  const generateWeeks = React.useMemo((): WeekData[] => {
    const weeksData: WeekData[] = [];
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    let weekStart = getWeekStart(monthStart);
    
    // Go back to the previous Monday if the month doesn't start on Monday
    while (weekStart > monthStart) {
      weekStart.setDate(weekStart.getDate() - 7);
    }
    
    while (weekStart <= monthEnd) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      // Get allocations for this week
      const weekAllocations = allocations
        .filter(allocation => {
          const allocStart = new Date(allocation.startDate);
          const allocEnd = new Date(allocation.endDate);
          return allocStart <= weekEnd && allocEnd >= weekStart;
        })
        .map(allocation => ({
          ...allocation,
          employee: employees.find(e => e.id === allocation.employeeId),
          project: projects.find(p => p.id === allocation.projectId)
        }))
        .sort((a, b) => {
          // Sort by employee name, then by hours
          const employeeA = a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : '';
          const employeeB = b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : '';
          if (employeeA !== employeeB) {
            return employeeA.localeCompare(employeeB);
          }
          return b.allocatedHours - a.allocatedHours;
        });
      
      weeksData.push({
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        allocations: weekAllocations
      });
      
      weekStart.setDate(weekStart.getDate() + 7);
    }
    
    return weeksData;
  }, [currentDate, allocations, employees, projects]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'planned':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'completed':
        return 'bg-gray-100 border-gray-300 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Resource Allocation Timeline
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
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
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {generateWeeks.map((week, weekIndex) => (
            <div key={week.weekStart.getTime()} className={`border-b border-gray-100 ${weekIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
              {/* Week Header */}
              <div className="px-6 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">
                  Week of {week.weekStart.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })} - {week.weekEnd.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {week.allocations.length} allocation{week.allocations.length !== 1 ? 's' : ''} this week
                </p>
              </div>

              {/* Allocations for this week */}
              <div className="px-6 py-4">
                {week.allocations.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No allocations this week</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {week.allocations.map(allocation => (
                      <div
                        key={allocation.id}
                        className={`p-3 rounded-md border cursor-pointer transition-all hover:shadow-md ${getStatusColor(allocation.status)}`}
                        onClick={() => onAllocationClick?.(allocation)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {allocation.employee 
                                ? `${allocation.employee.firstName} ${allocation.employee.lastName}`
                                : 'Unknown Employee'
                              }
                            </p>
                            <p className="text-xs opacity-75 truncate">
                              {allocation.project?.name || 'Unknown Project'}
                            </p>
                          </div>
                          <div className="flex-shrink-0 ml-2">
                            <span className="text-sm font-semibold">
                              {allocation.allocatedHours}h
                            </span>
                          </div>
                        </div>
                        
                        {allocation.roleOnProject && (
                          <p className="text-xs opacity-75 mt-1 truncate">
                            {allocation.roleOnProject}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs opacity-75">
                            {allocation.status}
                          </span>
                          <span className="text-xs opacity-75">
                            {new Date(allocation.startDate).getMonth() === new Date(allocation.endDate).getMonth() 
                              ? `${new Date(allocation.startDate).getDate()}-${new Date(allocation.endDate).getDate()}`
                              : `${new Date(allocation.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(allocation.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            }
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t">
        <div className="text-sm text-gray-600">
          Showing {generateWeeks.reduce((sum, week) => sum + week.allocations.length, 0)} allocation{generateWeeks.reduce((sum, week) => sum + week.allocations.length, 0) !== 1 ? 's' : ''} 
          across {generateWeeks.length} week{generateWeeks.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};
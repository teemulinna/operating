import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService, Employee, Project, Allocation } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, addWeeks, isWithinInterval } from 'date-fns';

interface WeeklyAllocation {
  employee: Employee;
  weeks: {
    [weekKey: string]: {
      allocations: Allocation[];
      totalHours: number;
      overAllocated: boolean;
    };
  };
}

const STANDARD_WORK_HOURS = 40;
const WEEKS_TO_SHOW = 12;

function generateWeeks(startDate: Date, weeksCount: number) {
  const weeks = [];
  for (let i = 0; i < weeksCount; i++) {
    const weekStart = addWeeks(startDate, i);
    weeks.push({
      key: format(weekStart, 'yyyy-MM-dd'),
      label: format(weekStart, 'MMM dd'),
      start: weekStart,
      end: addWeeks(weekStart, 1)
    });
  }
  return weeks;
}

export function WeeklyResourceGrid() {
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: apiService.getEmployees,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: apiService.getProjects,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations'],
    queryFn: apiService.getAllocations,
  });

  const startDate = startOfWeek(new Date());
  const weeks = generateWeeks(startDate, WEEKS_TO_SHOW);

  // Calculate weekly allocations for each employee
  const weeklyAllocations: WeeklyAllocation[] = React.useMemo(() => {
    return employees.map(employee => {
      const employeeAllocations = allocations.filter(a => a.employeeId === employee.id);
      
      const weeks: WeeklyAllocation['weeks'] = {};
      
      generateWeeks(startDate, WEEKS_TO_SHOW).forEach(week => {
        const weekAllocations = employeeAllocations.filter(allocation => {
          const allocStart = new Date(allocation.startDate);
          const allocEnd = new Date(allocation.endDate);
          
          return isWithinInterval(week.start, { start: allocStart, end: allocEnd }) ||
                 isWithinInterval(week.end, { start: allocStart, end: allocEnd }) ||
                 (allocStart <= week.start && allocEnd >= week.end);
        });

        const totalHours = weekAllocations.reduce((sum, alloc) => sum + alloc.allocatedHours, 0);
        const maxCapacity = (employee.capacity / 100) * STANDARD_WORK_HOURS;
        
        weeks[week.key] = {
          allocations: weekAllocations,
          totalHours,
          overAllocated: totalHours > maxCapacity
        };
      });

      return {
        employee,
        weeks
      };
    });
  }, [employees, allocations, startDate]);

  const exportToCSV = () => {
    const csvData = [];
    csvData.push(['Employee Name', 'Project Name', 'Hours per Week', 'Start Date', 'End Date', 'Status']);
    
    allocations.forEach(allocation => {
      const employee = employees.find(e => e.id === allocation.employeeId);
      const project = projects.find(p => p.id === allocation.projectId);
      
      csvData.push([
        employee?.name || 'Unknown Employee',
        project?.name || 'Unknown Project',
        allocation.allocatedHours.toString(),
        format(new Date(allocation.startDate), 'yyyy-MM-dd'),
        format(new Date(allocation.endDate), 'yyyy-MM-dd'),
        allocation.status
      ]);
    });

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resource-allocation-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-6">
      <CardHeader className="px-0">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Weekly Resource Allocation Grid</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Employee capacity vs project assignments over {WEEKS_TO_SHOW} weeks
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header Row */}
            <div className="grid grid-cols-[200px_repeat(12,100px)] gap-1 mb-2">
              <div className="font-semibold text-sm text-gray-700 p-2">
                Employee
              </div>
              {weeks.map(week => (
                <div key={week.key} className="font-semibold text-xs text-gray-700 p-2 text-center">
                  {week.label}
                </div>
              ))}
            </div>

            {/* Employee Rows */}
            {weeklyAllocations.map(({ employee, weeks: employeeWeeks }) => (
              <div key={employee.id} className="grid grid-cols-[200px_repeat(12,100px)] gap-1 mb-2">
                {/* Employee Info */}
                <div className="bg-white border rounded p-2">
                  <div className="font-medium text-sm">{employee.name}</div>
                  <div className="text-xs text-gray-500">{employee.role}</div>
                  <Badge 
                    variant={employee.capacity > 80 ? 'destructive' : employee.capacity > 60 ? 'secondary' : 'default'}
                    className="mt-1 text-xs"
                  >
                    {employee.capacity}% cap
                  </Badge>
                </div>

                {/* Week Cells */}
                {weeks.map(week => {
                  const weekData = employeeWeeks[week.key];
                  const maxCapacity = (employee.capacity / 100) * STANDARD_WORK_HOURS;
                  
                  return (
                    <div
                      key={week.key}
                      className={`
                        border rounded p-1 min-h-[60px] text-xs
                        ${weekData.overAllocated 
                          ? 'bg-red-50 border-red-200' 
                          : weekData.totalHours > maxCapacity * 0.8
                          ? 'bg-yellow-50 border-yellow-200'
                          : weekData.totalHours > 0
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                        }
                      `}
                    >
                      {weekData.totalHours > 0 && (
                        <>
                          <div className="font-medium mb-1">
                            {weekData.totalHours}h
                          </div>
                          {weekData.allocations.slice(0, 2).map(allocation => {
                            const project = projects.find(p => p.id === allocation.projectId);
                            return (
                              <div 
                                key={allocation.id} 
                                className="text-xs truncate mb-1 px-1 py-0.5 bg-white rounded"
                              >
                                {project?.name.substring(0, 8)}...
                              </div>
                            );
                          })}
                          {weekData.allocations.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{weekData.allocations.length - 2} more
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
            <span>Normal allocation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
            <span>High allocation (80%+ capacity)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
            <span>Over-allocated (exceeds capacity)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
            <span>No allocation</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday, parseISO, isWithinInterval } from 'date-fns';

export function ScheduleView() {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: apiService.getEmployees,
    retry: false,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: apiService.getProjects,
    retry: false,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations'],
    queryFn: apiService.getAllocations,
    retry: false,
  });

  // Calculate week range
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Sunday
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Filter allocations for current week
  const weekAllocations = useMemo(() => {
    return allocations.filter(allocation => {
      const allocStart = parseISO(allocation.startDate);
      const allocEnd = parseISO(allocation.endDate);
      
      return isWithinInterval(weekStart, { start: allocStart, end: allocEnd }) ||
             isWithinInterval(weekEnd, { start: allocStart, end: allocEnd }) ||
             (allocStart <= weekStart && allocEnd >= weekEnd);
    });
  }, [allocations, weekStart, weekEnd]);

  // Group allocations by employee
  const employeeAllocations = useMemo(() => {
    const grouped: Record<number, typeof allocations> = {};
    weekAllocations.forEach(allocation => {
      if (!grouped[allocation.employeeId]) {
        grouped[allocation.employeeId] = [];
      }
      grouped[allocation.employeeId].push(allocation);
    });
    return grouped;
  }, [weekAllocations]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const getEmployeeWorkload = (employeeId: number, day: Date) => {
    const empAllocations = employeeAllocations[employeeId] || [];
    return empAllocations.filter(allocation => {
      const allocStart = parseISO(allocation.startDate);
      const allocEnd = parseISO(allocation.endDate);
      return isWithinInterval(day, { start: allocStart, end: allocEnd });
    });
  };

  const getCapacityColor = (capacity: number) => {
    if (capacity > 80) return 'bg-red-100 text-red-800 border-red-200';
    if (capacity > 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Schedule</h1>
          <p className="text-gray-600">Resource allocation calendar view</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigateWeek('prev')}>
            Previous Week
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" onClick={() => navigateWeek('next')}>
            Next Week
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Week of {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Schedule Grid */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            {/* Header with days */}
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-48 sticky left-0 bg-gray-50">
                  Employee
                </th>
                {weekDays.map((day) => (
                  <th 
                    key={day.toISOString()} 
                    className={`px-3 py-3 text-center text-sm font-medium min-w-32 ${
                      isToday(day) ? 'bg-blue-50 text-blue-700' : 'text-gray-500'
                    }`}
                  >
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-xs">{format(day, 'MMM dd')}</div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Employee rows */}
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  {/* Employee info */}
                  <td className="px-4 py-4 sticky left-0 bg-white border-r">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                      <div className="text-xs text-gray-500">{employee.role}</div>
                      <div className="text-xs mt-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getCapacityColor(employee.capacity)}`}
                        >
                          {employee.capacity}% capacity
                        </Badge>
                      </div>
                    </div>
                  </td>

                  {/* Daily allocations */}
                  {weekDays.map((day) => {
                    const dayAllocations = getEmployeeWorkload(employee.id, day);
                    const totalHours = dayAllocations.reduce((sum, alloc) => sum + (alloc.allocatedHours / 7), 0);
                    
                    return (
                      <td 
                        key={day.toISOString()} 
                        className={`px-2 py-2 text-center border-r ${
                          isToday(day) ? 'bg-blue-50' : ''
                        }`}
                      >
                        {dayAllocations.length > 0 ? (
                          <div className="space-y-1">
                            {dayAllocations.slice(0, 2).map((allocation) => {
                              const project = projects.find(p => p.id === allocation.projectId);
                              return (
                                <div 
                                  key={allocation.id} 
                                  className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate"
                                  title={`${project?.name || 'Project'} - ${allocation.allocatedHours}h total`}
                                >
                                  {project?.name?.substring(0, 12) || 'Project'}
                                </div>
                              );
                            })}
                            {dayAllocations.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{dayAllocations.length - 2} more
                              </div>
                            )}
                            {totalHours > 0 && (
                              <div className="text-xs text-gray-600 font-medium">
                                {Math.round(totalHours)}h
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">-</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekAllocations.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Utilized Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {Object.keys(employeeAllocations).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">of {employees.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {weekAllocations.reduce((sum, alloc) => sum + alloc.allocatedHours, 0)}h
            </div>
            <p className="text-xs text-gray-500 mt-1">Allocated this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {employees.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m0 0V7a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2m0 0V7a2 2 0 012-2h4a2 2 0 012 2v4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No schedule data</h3>
            <p className="text-gray-500">Add employees and projects to see the weekly schedule.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
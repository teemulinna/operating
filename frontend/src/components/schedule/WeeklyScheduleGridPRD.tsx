import React, { useState, useEffect, useCallback } from 'react';
import { format, addWeeks, startOfWeek, endOfWeek, eachWeekOfInterval, isSameWeek } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Calendar, Plus, AlertTriangle } from 'lucide-react';
import { apiService, Employee, Project, Allocation, ServiceError } from '../../services/api';

interface CellData {
  employeeId: string;
  weekStart: Date;
  allocations: Allocation[];
  totalHours: number;
  capacity: number;
}

const WeeklyScheduleGrid: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate weeks for the current view (8 weeks)
  const weeks = eachWeekOfInterval({
    start: startOfWeek(currentDate),
    end: endOfWeek(addWeeks(currentDate, 7))
  });

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [employeesData, projectsData, allocationsData] = await Promise.all([
          apiService.getEmployees(),
          apiService.getProjects(),
          apiService.getAllocations()
        ]);

        setEmployees(employeesData);
        setProjects(projectsData);
        setAllocations(allocationsData);
      } catch (err) {
        const error = err as ServiceError;
        console.error('Failed to fetch data:', error);
        setError(error.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate allocation data for a specific cell
  const getCellData = useCallback((employeeId: string, weekStart: Date): CellData => {
    const weekAllocations = allocations.filter(alloc => {
      const allocDate = new Date(alloc.date || alloc.week || '');
      return alloc.employeeId.toString() === employeeId && isSameWeek(allocDate, weekStart);
    });

    const totalHours = weekAllocations.reduce((sum, alloc) => sum + (alloc.hours || 0), 0);
    const employee = employees.find(e => e.id === employeeId);
    const capacity = employee?.capacity || 40;

    return {
      employeeId,
      weekStart,
      allocations: weekAllocations,
      totalHours,
      capacity
    };
  }, [allocations, employees]);

  // Navigation handlers
  const navigateToPreviousWeek = () => setCurrentDate(prev => addWeeks(prev, -1));
  const navigateToNextWeek = () => setCurrentDate(prev => addWeeks(prev, 1));
  const navigateToToday = () => setCurrentDate(new Date());

  // Get allocation status color
  const getStatusColor = (totalHours: number, capacity: number) => {
    const utilization = (totalHours / capacity) * 100;
    if (utilization === 0) return 'bg-gray-100';
    if (utilization <= 75) return 'bg-green-100';
    if (utilization <= 100) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  // Get project by ID
  const getProject = (projectId: number): Project | undefined => {
    return projects.find(p => p.id === projectId);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading schedule data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div className="text-red-600">{error}</div>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Weekly Resource Schedule</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={navigateToPreviousWeek}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={navigateToToday}
              variant="outline"
              size="sm"
              className="px-3"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Today
            </Button>
            <Button
              onClick={navigateToNextWeek}
              variant="outline"
              size="sm"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white text-left p-3 border-b-2 border-gray-200 font-medium min-w-[150px]">
                  Employee
                </th>
                {weeks.slice(0, 8).map(weekStart => (
                  <th key={weekStart.toISOString()} className="text-center p-3 border-b-2 border-gray-200 font-medium min-w-[120px]">
                    <div className="text-sm text-gray-600">
                      {format(weekStart, 'MMM d')}
                    </div>
                    <div className="text-xs text-gray-400">
                      Week {format(weekStart, 'w')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white p-3 border-b border-gray-200">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-xs text-gray-500">
                      {employee.capacity || 40}h/week
                    </div>
                  </td>
                  {weeks.slice(0, 8).map(weekStart => {
                    const cellData = getCellData(employee.id, weekStart);
                    const statusColor = getStatusColor(cellData.totalHours, cellData.capacity);
                    
                    return (
                      <td 
                        key={`${employee.id}-${weekStart.toISOString()}`}
                        className={`p-2 border-b border-gray-200 ${statusColor}`}
                      >
                        <div className="min-h-[60px]">
                          {cellData.allocations.length > 0 ? (
                            <div className="space-y-1">
                              {cellData.allocations.map(alloc => {
                                const project = getProject(alloc.projectId);
                                return (
                                  <div
                                    key={alloc.id}
                                    className="text-xs p-1 rounded"
                                    style={{
                                      backgroundColor: project?.priority === 'high' ? '#FEE2E2' :
                                                      project?.priority === 'medium' ? '#FEF3C7' :
                                                      '#E5E7EB'
                                    }}
                                  >
                                    <div className="font-medium">
                                      {project?.name || `Project ${alloc.projectId}`}
                                    </div>
                                    <div className="text-gray-600">
                                      {alloc.hours}h
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="text-xs font-medium text-gray-700 mt-1">
                                Total: {cellData.totalHours}h / {cellData.capacity}h
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 text-center">
                              No allocations
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 rounded"></div>
            <span>Unallocated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 rounded"></div>
            <span>≤75% Allocated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 rounded"></div>
            <span>76-100% Allocated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 rounded"></div>
            <span>&gt;100% Over-allocated</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyScheduleGrid;
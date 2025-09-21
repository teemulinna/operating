import React, { useState, useEffect, useCallback } from 'react';
import { format, addWeeks, startOfWeek, endOfWeek, eachWeekOfInterval, isSameWeek } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Calendar, Plus, AlertTriangle, TrendingUp } from 'lucide-react';
import { useRealTimeOverAllocation } from '../../hooks/useRealTimeOverAllocation';
import { CapacityWarningIndicator } from '../ui/CapacityWarningIndicator';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  defaultHoursPerWeek: number;
  capacity: number;
}

interface Project {
  id: string;
  name: string;
  status: string;
  color?: string;
}

interface Allocation {
  id: string;
  employeeId: string;
  projectId: string;
  allocatedHours: number;
  startDate: string;
  endDate: string;
  weekStart: string | Date;
  hours?: number;
  project?: Project;
}

interface CellData {
  employeeId: string;
  weekStart: Date;
  allocations: Allocation[];
  totalHours: number;
  capacity: number;
}

const EnhancedWeeklyScheduleGrid: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time over-allocation tracking
  const {
    getEmployeeWarningLevel,
    getEmployeeUtilizationRate,
    isEmployeeOverAllocated,
    getWeeklyOverAllocation,
    overAllocatedEmployeeCount,
    totalOverAllocationHours,
    avgUtilizationRate
  } = useRealTimeOverAllocation(employees, allocations, {
    refreshInterval: 30000 // Refresh every 30 seconds
  });

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
        const [employeesRes, projectsRes, allocationsRes] = await Promise.all([
          fetch('http://localhost:3001/api/employees'),
          fetch('http://localhost:3001/api/projects'),
          fetch('http://localhost:3001/api/allocations')
        ]);

        const employeesResponse = await employeesRes.json();
        const projectsResponse = await projectsRes.json();
        const allocationsResponse = await allocationsRes.json();

        // Handle both .data format and direct array format
        const employeesData = employeesResponse.data || employeesResponse;
        const projectsData = projectsResponse.data || projectsResponse;
        const allocationsData = allocationsResponse.data || allocationsResponse;

        // Transform employees data
        const transformedEmployees = employeesData.map((emp: any) => ({
          id: emp.id,
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          name: emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || `Employee ${emp.id}`,
          defaultHoursPerWeek: emp.defaultHoursPerWeek || 40,
          capacity: emp.capacity || emp.defaultHoursPerWeek || 40
        }));

        // Transform projects data
        const transformedProjects = projectsData.map((proj: any) => ({
          id: proj.id,
          name: proj.name || `Project ${proj.id}`,
          status: proj.status || 'active',
          color: proj.color || '#3B82F6'
        }));

        // Transform allocations data
        const transformedAllocations = allocationsData.map((alloc: any) => {
          const project = transformedProjects.find((p: any) => p.id === alloc.projectId);
          return {
            id: alloc.id,
            employeeId: alloc.employeeId,
            projectId: alloc.projectId,
            allocatedHours: alloc.allocatedHours || alloc.hours || 0,
            startDate: alloc.startDate,
            endDate: alloc.endDate,
            weekStart: new Date(alloc.weekStart || alloc.startDate),
            hours: alloc.allocatedHours || alloc.hours || 0,
            project
          };
        });

        setEmployees(transformedEmployees);
        setProjects(transformedProjects);
        setAllocations(transformedAllocations);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('Failed to load data');
        
        // Set empty arrays - no fallback mock data
        setEmployees([]);
        setProjects([]);
        setAllocations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentDate]);

  // Get allocations for specific employee and week
  const getAllocationsForCell = useCallback((employeeId: string, weekStart: Date): Allocation[] => {
    return allocations.filter(alloc => 
      alloc.employeeId === employeeId && 
      isSameWeek(new Date(alloc.weekStart), weekStart)
    );
  }, [allocations]);

  // Calculate total hours for a cell
  const getTotalHours = useCallback((employeeId: string, weekStart: Date): number => {
    const cellAllocations = getAllocationsForCell(employeeId, weekStart);
    return cellAllocations.reduce((sum, alloc) => sum + (alloc.hours || 0), 0);
  }, [getAllocationsForCell]);

  // Get capacity utilization percentage
  const getUtilizationPercentage = useCallback((totalHours: number, capacity: number): number => {
    return capacity > 0 ? (totalHours / capacity) * 100 : 0;
  }, []);

  // Get cell background color based on utilization
  const getCellColor = useCallback((utilizationPercentage: number, isRealTimeOverAllocated?: boolean): string => {
    if (isRealTimeOverAllocated) return 'bg-red-100 border-red-300';
    if (utilizationPercentage === 0) return 'bg-gray-50';
    if (utilizationPercentage <= 50) return 'bg-green-50 border-green-200';
    if (utilizationPercentage <= 80) return 'bg-yellow-50 border-yellow-200';
    if (utilizationPercentage <= 100) return 'bg-orange-50 border-orange-200';
    return 'bg-red-100 border-red-300'; // Over-allocated
  }, []);

  // Navigation handlers
  const navigatePrevious = () => {
    setCurrentDate(prev => addWeeks(prev, -4));
  };
  
  const navigateNext = () => {
    setCurrentDate(prev => addWeeks(prev, 4));
  };
  
  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  if (loading) {
    return (
      <Card data-testid="enhanced-weekly-schedule-grid">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Enhanced Weekly Schedule Grid with Over-Allocation Warnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && employees.length === 0) {
    return (
      <Card data-testid="enhanced-weekly-schedule-grid">
        <CardHeader>
          <CardTitle>Enhanced Weekly Schedule Grid</CardTitle>
        </CardHeader>
        <CardContent>
          <div data-testid="error-message" className="text-red-600">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full responsive-grid" data-testid="enhanced-weekly-schedule-grid">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Enhanced Weekly Schedule Grid
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={navigatePrevious}
              data-testid="previous-week-button"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={navigateToday}
              data-testid="today-button"
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={navigateNext}
              data-testid="next-week-button"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Over-allocation summary */}
        {overAllocatedEmployeeCount > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg" data-testid="over-allocation-summary">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-800">Over-Allocation Alert</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-red-700">Over-allocated employees:</span>
                <span className="font-bold text-red-800">{overAllocatedEmployeeCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-700">Total excess hours:</span>
                <span className="font-bold text-red-800">{Math.round(totalOverAllocationHours)}h</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-700">Avg utilization:</span>
                <span className="font-bold text-red-800">{Math.round(avgUtilizationRate)}%</span>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" data-testid="grid-table">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 bg-gray-50 min-w-[180px]">
                  Employee
                </th>
                {weeks.map((week, weekIndex) => (
                  <th key={week.getTime()} className="border border-gray-300 p-2 bg-gray-50 min-w-[140px]" data-testid={`week-header-${weekIndex}`}>
                    <div className="text-sm">
                      <div className="font-semibold">
                        {format(week, 'MMM dd')}
                      </div>
                      <div className="text-gray-600">
                        {format(endOfWeek(week), 'MMM dd')}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, employeeIndex) => {
                const employeeWarningLevel = getEmployeeWarningLevel(employee.id);
                const employeeUtilization = getEmployeeUtilizationRate(employee.id);
                const employeeIsOverAllocated = isEmployeeOverAllocated(employee.id);
                
                return (
                  <tr key={employee.id} data-testid={`employee-row-${employee.id}`}>
                    <td className="border border-gray-300 p-2 bg-gray-50">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{employee.name}</div>
                          <CapacityWarningIndicator
                            utilizationRate={employeeUtilization}
                            severity={employeeWarningLevel}
                            isOverAllocated={employeeIsOverAllocated}
                            size="sm"
                            className="flex-shrink-0"
                          />
                        </div>
                        <div className="text-sm text-gray-600">
                          Capacity: {employee.capacity}h/week
                        </div>
                        {employeeIsOverAllocated && (
                          <div className="text-xs text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Over-allocated ({Math.round(employeeUtilization)}%)
                          </div>
                        )}
                      </div>
                    </td>
                    {weeks.map((week, weekIndex) => {
                      const cellAllocations = getAllocationsForCell(employee.id, week);
                      const totalHours = getTotalHours(employee.id, week);
                      const utilizationPercentage = getUtilizationPercentage(totalHours, employee.capacity);
                      const isOverAllocated = utilizationPercentage > 100;
                      
                      // Get real-time over-allocation data
                      const weeklyOverAllocation = getWeeklyOverAllocation(employee.id, week);
                      
                      // Use real-time data if available, fallback to calculated values
                      const actualUtilization = weeklyOverAllocation?.utilizationRate || utilizationPercentage;
                      const actualIsOverAllocated = weeklyOverAllocation?.isOverAllocated || isOverAllocated;
                      const overAllocationHours = weeklyOverAllocation?.overAllocationHours || Math.max(0, totalHours - employee.capacity);

                      return (
                        <td
                          key={`${employee.id}-${week.getTime()}`}
                          className={`border border-gray-300 p-1 h-28 cursor-pointer transition-all duration-200 ${
                            getCellColor(actualUtilization, actualIsOverAllocated)
                          } ${actualIsOverAllocated ? 'shadow-inner' : ''}`}
                          data-testid={`grid-cell-${employee.id}-${weekIndex}`}
                        >
                          <div className="space-y-1 h-full">
                            {cellAllocations.map((allocation, index) => (
                              <div
                                key={allocation.id}
                                className="text-xs p-1 rounded border text-white shadow-sm"
                                style={{
                                  backgroundColor: allocation.project?.color || '#3B82F6'
                                }}
                                data-testid={`allocation-block-${allocation.id}`}
                              >
                                <div className="truncate font-medium">
                                  {allocation.project?.name || `Project ${allocation.projectId}`}
                                </div>
                                <div>{allocation.hours}h</div>
                              </div>
                            ))}
                            
                            {totalHours > 0 && (
                              <div className="space-y-1 mt-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-medium">
                                    {totalHours}h / {employee.capacity}h
                                  </span>
                                  {actualIsOverAllocated && (
                                    <AlertTriangle 
                                      className="h-3 w-3 text-red-600 animate-pulse" 
                                      data-testid={`over-allocation-warning-${employee.id}-${weekIndex}`}
                                    />
                                  )}
                                </div>
                                
                                {/* Enhanced capacity warning indicator */}
                                <div className="flex justify-center">
                                  <CapacityWarningIndicator
                                    utilizationRate={actualUtilization}
                                    severity={actualIsOverAllocated ? (actualUtilization > 150 ? 'critical' : actualUtilization > 120 ? 'high' : 'medium') : 'none'}
                                    isOverAllocated={actualIsOverAllocated}
                                    size="sm"
                                    showText={false}
                                    showPercentage={true}
                                    className="text-xs"
                                  />
                                </div>
                                
                                {/* Over-allocation details */}
                                {actualIsOverAllocated && overAllocationHours > 0 && (
                                  <div className="text-xs text-red-700 font-bold text-center bg-red-100 px-1 py-0.5 rounded">
                                    +{Math.round(overAllocationHours)}h over
                                  </div>
                                )}
                              </div>
                            )}

                            {totalHours === 0 && (
                              <div className="flex items-center justify-center h-full text-gray-400">
                                <Plus className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Enhanced Legend */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span>Low utilization (≤50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
              <span>Medium utilization (51-80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
              <span>High utilization (81-100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span>Over-allocated (&gt;100%)</span>
            </div>
          </div>
          
          {/* Warning Severity Legend */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Warning Levels:</h4>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Normal (≤100%)</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span>Medium (101-120%)</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span>High (121-150%)</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>Critical (&gt;150%)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedWeeklyScheduleGrid;

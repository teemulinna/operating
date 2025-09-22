import React, { useState, useEffect } from 'react';
import { OverAllocationWarning } from '../allocation/OverAllocationWarning';
import { apiService, Employee as ApiEmployee, Project as ApiProject, Allocation as ApiAllocation } from '../../services/api';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  weeklyCapacity: number;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface Allocation {
  id: string;
  employeeId: string;
  projectId: string;
  allocatedHours: number;
  startDate: string;
  endDate: string;
  status: string;
  roleOnProject?: string;
}

const WeeklyScheduleGrid: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Get week dates (Monday to Friday)
  const getWeekDates = (date: Date) => {
    const monday = new Date(date);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 5; i++) {
      const weekDay = new Date(monday);
      weekDay.setDate(monday.getDate() + i);
      weekDates.push(weekDay);
    }
    return weekDates;
  };

  const weekDates = getWeekDates(currentWeek);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch employees directly from the API to get all fields including weeklyCapacity
        const [employeesRes, projectsData, allocationsData] = await Promise.all([
          fetch('http://localhost:3001/api/employees'),
          apiService.getProjects(),
          apiService.getAllocations()
        ]);

        const employeesJson = await employeesRes.json();
        const employeesData = employeesJson.data || [];

        // Map API data to local interfaces
        const mappedEmployees: Employee[] = employeesData.map((emp: any) => ({
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          weeklyCapacity: Number(emp.weeklyCapacity) || 40
        }));

        const mappedProjects: Project[] = (projectsData || []).map((proj: ApiProject) => ({
          id: proj.id.toString(),
          name: proj.name,
          status: proj.status
        }));

        const mappedAllocations: Allocation[] = (allocationsData || []).map((alloc: ApiAllocation) => ({
          id: alloc.id.toString(),
          employeeId: alloc.employeeId.toString(),
          projectId: alloc.projectId.toString(),
          allocatedHours: alloc.hours,
          startDate: alloc.date,
          endDate: alloc.date, // Using date for both start and end as API only has date
          status: alloc.status,
          roleOnProject: undefined // Not available in API
        }));

        setEmployees(mappedEmployees as Employee[]);
        setProjects(mappedProjects as Project[]);
        setAllocations(mappedAllocations as Allocation[]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getEmployeeAllocations = (employeeId: string) => {
    return allocations.filter(allocation => 
      allocation.employeeId === employeeId && 
      allocation.status === 'active'
    );
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="schedule-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading schedule...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow" data-testid="weekly-schedule-grid">
      {/* Header with week navigation */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Week of {weekDates[0]?.toLocaleDateString()}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => navigateWeek('prev')}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              data-testid="prev-week-btn"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded"
              data-testid="current-week-btn"
            >
              This Week
            </button>
            <button
              onClick={() => navigateWeek('next')}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              data-testid="next-week-btn"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="p-3 text-left text-sm font-medium text-gray-600 w-48">
                Employee
              </th>
              {weekDates.map((date, index) => (
                <th key={index} className="p-3 text-left text-sm font-medium text-gray-600 min-w-40">
                  <div>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </th>
              ))}
              <th className="p-3 text-left text-sm font-medium text-gray-600 w-24">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const employeeAllocations = getEmployeeAllocations(employee.id);
              const totalHours = employeeAllocations.reduce((sum, alloc) => sum + alloc.allocatedHours, 0);
              const isOverAllocated = totalHours > employee.weeklyCapacity;

              return (
                <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">
                    <div>
                      <div className="font-medium text-gray-900" data-testid={`employee-${employee.id}-name`}>
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee.weeklyCapacity}h/week capacity
                      </div>
                      {isOverAllocated && (
                        <div className="mt-1 text-xs text-red-600 font-medium" data-testid={`overallocation-warning-${employee.id}`}>
                          ⚠️ Over-allocated: {totalHours}h / {employee.weeklyCapacity}h
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {weekDates.map((date, dayIndex) => (
                    <td key={dayIndex} className="p-3 align-top">
                      <div className="space-y-1">
                        {employeeAllocations.map((allocation) => (
                          <div 
                            key={allocation.id}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                            data-testid={`allocation-${allocation.id}-${dayIndex}`}
                          >
                            <div className="font-medium truncate">
                              {getProjectName(allocation.projectId)}
                            </div>
                            <div>{allocation.allocatedHours}h</div>
                            {allocation.roleOnProject && (
                              <div className="text-blue-600">
                                {allocation.roleOnProject}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                  
                  <td className="p-3">
                    <div className="text-right">
                      <div className={`font-medium ${
                        isOverAllocated ? 'text-red-600' : 'text-gray-900'
                      }`} data-testid={`employee-${employee.id}-total`}>
                        {totalHours}h
                      </div>
                      <div className="text-sm text-gray-500">
                        {((totalHours / employee.weeklyCapacity) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {employees.length === 0 && !loading && (
        <div className="p-8 text-center text-gray-500" data-testid="no-employees">
          No employees found
        </div>
      )}
    </div>
  );
};

export default WeeklyScheduleGrid;
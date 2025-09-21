import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ServiceFactory } from '../../services/api';

interface UtilizationChartProps {
  data?: {
    employees: Array<{
      id: string;
      name: string;
      utilization: number;
      capacity: number;
      allocatedHours: number;
    }>;
    trends?: Array<{
      date: string;
      utilization: number;
    }>;
  };
  type?: 'bar' | 'line' | 'pie';
  loading?: boolean;
  height?: number;
}

export const UtilizationChart: React.FC<UtilizationChartProps> = ({
  data,
  type = 'bar',
  loading = false,
  height = 300,
}) => {
  // Fetch real employee utilization data if not provided
  const { data: employeeData, isLoading } = useQuery({
    queryKey: ['employee-utilization'],
    queryFn: async () => {
      const employeeService = ServiceFactory.getEmployeeService();
      const allocationService = ServiceFactory.getAllocationService();
      
      try {
        // Get all active employees
        const employeesResponse = await employeeService.getAll();
        const employees = employeesResponse.data;
        
        // Get all allocations
        const allocationsResponse = await allocationService.getAll();
        const allocations = allocationsResponse.data;
        
        // Calculate utilization for each employee
        const employeeUtilization = employees.map(employee => {
          const employeeAllocations = allocations.filter(
            allocation => allocation.employeeId.toString() === employee.id
          );
          
          const totalAllocatedHours = employeeAllocations.reduce(
            (sum, allocation) => sum + (allocation.hours || 0), 0
          );
          
          // Assume 40 hours per week capacity
          const capacity = 40;
          const utilization = capacity > 0 ? (totalAllocatedHours / capacity) * 100 : 0;
          
          return {
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            utilization: Math.round(utilization),
            capacity,
            allocatedHours: totalAllocatedHours,
            projects: employeeAllocations.length,
          };
        });
        
        return {
          employees: employeeUtilization,
          trends: [], // Could be calculated from historical data
        };
      } catch (error) {
        console.error('Error fetching utilization data:', error);
        return {
          employees: [],
          trends: [],
        };
      }
    },
    enabled: !data,
    staleTime: 5 * 60 * 1000,
  });

  const chartData = data || employeeData;
  const isLoadingData = loading || isLoading;

  if (isLoadingData) {
    return (
      <div className="animate-pulse h-72">
        <div className="h-4 bg-gray-200 rounded mb-4 w-1/3"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!chartData?.employees?.length) {
    return (
      <div className="h-72 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-lg font-medium">No utilization data</div>
          <div className="text-sm">Employee utilization will appear here once data is available</div>
        </div>
      </div>
    );
  }

  // Simple bar chart representation using CSS
  const getBarColor = (utilization: number) => {
    if (utilization > 100) return 'bg-red-500';
    if (utilization > 90) return 'bg-orange-500';
    if (utilization > 80) return 'bg-yellow-500';
    if (utilization > 60) return 'bg-green-500';
    return 'bg-gray-500';
  };

  return (
    <div style={{ height: `${height}px` }} data-testid="utilization-bar-chart" className="p-4">
      <h3 className="text-lg font-medium mb-4">Team Utilization</h3>
      
      <div className="space-y-3">
        {chartData.employees.slice(0, 10).map(employee => (
          <div key={employee.id} className="flex items-center gap-3">
            <div className="w-32 text-sm font-medium truncate" title={employee.name}>
              {employee.name}
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
              <div
                className={`h-6 rounded-full transition-all duration-300 ${getBarColor(employee.utilization)}`}
                style={{ width: `${Math.min(employee.utilization, 100)}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                {employee.utilization}%
              </div>
            </div>
            <div className="w-20 text-sm text-gray-600">
              {employee.allocatedHours}h
            </div>
          </div>
        ))}
      </div>

      {chartData.employees.length > 10 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Showing top 10 employees. Total: {chartData.employees.length}
        </div>
      )}
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-500 rounded"></div>
          <span>Under 60%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>60-80%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>80-90%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span>90-100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Over 100%</span>
        </div>
      </div>
    </div>
  );
};

export default UtilizationChart;

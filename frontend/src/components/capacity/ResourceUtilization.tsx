import React, { useState, useMemo } from 'react';
import { useResourceUtilization } from '@/hooks/useCapacity';
import { ResourceUtilizationMetrics, CapacityFilters } from '@/types/capacity';
import { Employee } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { cn } from '@/utils/cn';

interface ResourceUtilizationProps {
  employees: Employee[];
  onEmployeeSelect?: (employee: Employee) => void;
  onDepartmentSelect?: (department: string) => void;
}

interface ChartData {
  name: string;
  utilization: number;
  capacity: number;
  allocation: number;
  color: string;
}

const UtilizationChart: React.FC<{
  data: ChartData[];
  height?: number;
  type?: 'bar' | 'line';
}> = ({ data, height = 200, type = 'bar' }) => {
  const maxValue = Math.max(...data.map(d => Math.max(d.utilization, d.capacity, d.allocation)));
  const scale = height / maxValue;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Utilization Chart</h4>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Capacity</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Allocation</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span>Utilization %</span>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-[600px] relative" style={{ height: height + 40 }}>
          {/* Chart Bars */}
          <div className="flex items-end justify-between h-full pb-6">
            {data.map((item, index) => (
              <div key={index} className="flex flex-col items-center space-y-2">
                <div className="flex items-end space-x-1">
                  {/* Capacity Bar */}
                  <div
                    className="bg-blue-500 rounded-t min-w-[20px] transition-all hover:opacity-80"
                    style={{ height: item.capacity * scale }}
                    title={`Capacity: ${item.capacity}`}
                  ></div>
                  
                  {/* Allocation Bar */}
                  <div
                    className="bg-green-500 rounded-t min-w-[20px] transition-all hover:opacity-80"
                    style={{ height: item.allocation * scale }}
                    title={`Allocation: ${item.allocation}`}
                  ></div>
                  
                  {/* Utilization Line */}
                  <div className="relative min-w-[20px]">
                    <div
                      className="bg-purple-500 rounded-full w-3 h-3 absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ 
                        bottom: (item.utilization / 100) * height,
                        left: '50%'
                      }}
                      title={`Utilization: ${item.utilization}%`}
                    ></div>
                  </div>
                </div>
                
                {/* Label */}
                <div className="text-xs text-center max-w-[80px] truncate">
                  {item.name}
                </div>
              </div>
            ))}
          </div>
          
          {/* Y-axis lines */}
          <div className="absolute inset-0 pointer-events-none">
            {[0, 25, 50, 75, 100].map(tick => (
              <div
                key={tick}
                className="absolute w-full border-t border-gray-200 text-xs text-gray-500"
                style={{ bottom: `${(tick / 100) * height + 24}px` }}
              >
                <span className="absolute -left-8 -translate-y-1/2">{tick}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricsCard: React.FC<{
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}> = ({ title, value, change, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  };

  const trendIcons = {
    up: '↗️',
    down: '↘️',
    stable: '→'
  };

  return (
    <Card className={cn('p-4 border-2', colorClasses[color])}>
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-600">{title}</div>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{value}</div>
          {change && trend && (
            <div className="flex items-center space-x-1 text-sm">
              <span>{trendIcons[trend]}</span>
              <span className="font-medium">{change}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const ResourceUtilization: React.FC<ResourceUtilizationProps> = ({
  employees,
  onEmployeeSelect,
  onDepartmentSelect
}) => {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'departments' | 'trends'>('overview');

  const filters: CapacityFilters = {
    startDate: dateRange.start,
    endDate: dateRange.end,
    departments: selectedDepartment === 'all' ? undefined : [selectedDepartment]
  };

  const { data: metrics, isLoading, error } = useResourceUtilization(filters);

  // Get unique departments
  const departments = useMemo(() => {
    const depts = [...new Set(employees.map(emp => emp.department))];
    return depts.sort();
  }, [employees]);

  // Prepare chart data
  const departmentChartData = useMemo(() => {
    if (!metrics?.departmentMetrics) return [];
    
    return metrics.departmentMetrics.map((dept, index) => ({
      name: dept.department,
      utilization: dept.averageUtilization,
      capacity: dept.totalCapacity,
      allocation: dept.totalAllocation,
      color: `hsl(${(index * 40) % 360}, 60%, 50%)`
    }));
  }, [metrics]);

  const trendChartData = useMemo(() => {
    if (!metrics?.weeklyTrends) return [];
    
    return metrics.weeklyTrends.slice(-8).map((trend, index) => ({
      name: new Date(trend.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      utilization: trend.averageUtilization,
      capacity: trend.totalCapacity / 10, // Scale for visibility
      allocation: trend.totalAllocation / 10, // Scale for visibility
      color: `hsl(210, 60%, ${60 - index * 5}%)`
    }));
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p>Failed to load utilization metrics</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resource Utilization Dashboard</h2>
          <p className="text-gray-600">Team capacity and utilization analytics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-2 py-1 border rounded text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-2 py-1 border rounded text-sm"
            />
          </div>
          
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'departments', label: 'Departments' },
          { key: 'trends', label: 'Trends' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key as typeof viewMode)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              viewMode === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Total Employees"
          value={metrics.totalEmployees}
          color="blue"
        />
        <MetricsCard
          title="Average Utilization"
          value={`${metrics.averageUtilization.toFixed(1)}%`}
          color={metrics.averageUtilization > 85 ? 'red' : metrics.averageUtilization > 70 ? 'yellow' : 'green'}
        />
        <MetricsCard
          title="Overbooked"
          value={metrics.overbookedEmployees}
          color={metrics.overbookedEmployees > 0 ? 'red' : 'green'}
        />
        <MetricsCard
          title="Underutilized"
          value={metrics.underutilizedEmployees}
          color={metrics.underutilizedEmployees > 5 ? 'yellow' : 'green'}
        />
      </div>

      {/* Main Content based on View Mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Department Overview</h3>
            <div className="space-y-4">
              {metrics.departmentMetrics.map(dept => (
                <div
                  key={dept.department}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => onDepartmentSelect?.(dept.department)}
                >
                  <div>
                    <div className="font-medium">{dept.department}</div>
                    <div className="text-sm text-gray-600">
                      {dept.employeeCount} employees
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      'font-bold',
                      dept.averageUtilization > 100 ? 'text-red-600' :
                      dept.averageUtilization > 80 ? 'text-orange-600' : 'text-green-600'
                    )}>
                      {dept.averageUtilization.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">
                      {dept.totalAllocation}h / {dept.totalCapacity}h
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Utilization Distribution</h3>
            <div className="space-y-4">
              {/* Utilization ranges */}
              {[
                { range: '0-50%', min: 0, max: 50, color: 'bg-red-500' },
                { range: '51-75%', min: 51, max: 75, color: 'bg-yellow-500' },
                { range: '76-100%', min: 76, max: 100, color: 'bg-green-500' },
                { range: '100%+', min: 101, max: 999, color: 'bg-red-600' }
              ].map(({ range, min, max, color }) => {
                const count = metrics.departmentMetrics.filter(
                  dept => dept.averageUtilization >= min && dept.averageUtilization <= max
                ).length;
                const percentage = metrics.departmentMetrics.length > 0 
                  ? (count / metrics.departmentMetrics.length) * 100 
                  : 0;

                return (
                  <div key={range} className="flex items-center space-x-3">
                    <div className={cn('w-4 h-4 rounded', color)}></div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm font-medium">{range}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{count} dept(s)</span>
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full transition-all', color)}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {viewMode === 'departments' && (
        <Card className="p-6">
          <UtilizationChart data={departmentChartData} height={300} />
        </Card>
      )}

      {viewMode === 'trends' && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Weekly Utilization Trends</h3>
            <UtilizationChart data={trendChartData} height={300} type="line" />
          </div>
        </Card>
      )}

      {/* Department Details Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Department Details</h3>
          <Button
            onClick={() => {
              // Export functionality could be added here
              console.log('Export utilization data');
            }}
            variant="outline"
            size="sm"
          >
            Export Data
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium">Department</th>
                <th className="text-center py-3 px-4 font-medium">Employees</th>
                <th className="text-center py-3 px-4 font-medium">Capacity (h)</th>
                <th className="text-center py-3 px-4 font-medium">Allocated (h)</th>
                <th className="text-center py-3 px-4 font-medium">Utilization</th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.departmentMetrics.map(dept => (
                <tr
                  key={dept.department}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onDepartmentSelect?.(dept.department)}
                >
                  <td className="py-3 px-4 font-medium">{dept.department}</td>
                  <td className="py-3 px-4 text-center">{dept.employeeCount}</td>
                  <td className="py-3 px-4 text-center">{dept.totalCapacity}</td>
                  <td className="py-3 px-4 text-center">{dept.totalAllocation}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={cn(
                      'font-bold',
                      dept.averageUtilization > 100 ? 'text-red-600' :
                      dept.averageUtilization > 80 ? 'text-orange-600' : 'text-green-600'
                    )}>
                      {dept.averageUtilization.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      dept.averageUtilization > 100 
                        ? 'bg-red-100 text-red-800'
                        : dept.averageUtilization > 80 
                        ? 'bg-orange-100 text-orange-800'
                        : dept.averageUtilization < 50
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    )}>
                      {dept.averageUtilization > 100 ? 'Overbooked' :
                       dept.averageUtilization > 80 ? 'High' :
                       dept.averageUtilization < 50 ? 'Low' : 'Optimal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ResourceUtilization;
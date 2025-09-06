import React, { useState, useMemo } from 'react';
import { BarChart, TrendingUp, TrendingDown, AlertCircle, Users } from 'lucide-react';

interface CapacityData {
  employeeId: number;
  employeeName: string;
  totalCapacity: number;
  allocatedHours: number;
  utilization: number;
  availableHours: number;
  efficiency?: number;
  projects?: { name: string; hours: number; color: string }[];
}

interface CapacityChartProps {
  data: CapacityData[];
  showEfficiency?: boolean;
  showProjectBredown?: boolean;
  onEmployeeClick?: (employeeId: number) => void;
}

interface CapacityBarProps {
  employee: CapacityData;
  maxCapacity: number;
  showEfficiency: boolean;
  showProjectBredown: boolean;
  onClick?: (employeeId: number) => void;
}

const CapacityBar: React.FC<CapacityBarProps> = ({
  employee,
  maxCapacity,
  showEfficiency,
  showProjectBredown,
  onClick
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const utilizationPercentage = (employee.utilization * 100).toFixed(1);
  const isOverUtilized = employee.utilization > 1.0;
  const isUnderUtilized = employee.utilization < 0.7;

  const barWidth = Math.min(100, (employee.allocatedHours / maxCapacity) * 100);

  const getBarColor = () => {
    if (isOverUtilized) return 'bg-red-500';
    if (isUnderUtilized) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getUtilizationColor = () => {
    if (isOverUtilized) return 'text-red-600 bg-red-50';
    if (isUnderUtilized) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="group">
      <div className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
        {/* Employee Name */}
        <div className="w-40 flex-shrink-0">
          <div 
            className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => onClick?.(employee.employeeId)}
          >
            {employee.employeeName}
          </div>
          {showEfficiency && employee.efficiency && (
            <div className="text-sm text-gray-500">
              {(employee.efficiency * 100).toFixed(0)}% efficiency
            </div>
          )}
        </div>

        {/* Capacity Bar */}
        <div className="flex-1 relative">
          <div className="h-8 bg-gray-200 rounded-full overflow-hidden relative">
            {/* Main capacity bar */}
            {!showProjectBredown && (
              <div
                data-testid={`capacity-bar-${employee.employeeId}`}
                className={`h-full transition-all duration-300 ${getBarColor()}`}
                style={{ width: `${barWidth}%` }}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              />
            )}

            {/* Project breakdown bars */}
            {showProjectBredown && employee.projects && (
              <>
                {employee.projects.reduce((acc, project, index) => {
                  const projectWidth = (project.hours / maxCapacity) * 100;
                  const segment = (
                    <div
                      key={index}
                      className={`h-full transition-all duration-300`}
                      style={{
                        width: `${projectWidth}%`,
                        backgroundColor: project.color,
                        marginLeft: index === 0 ? '0' : '1px'
                      }}
                      title={`${project.name}: ${project.hours}h`}
                    />
                  );
                  acc.push(segment);
                  return acc;
                }, [] as JSX.Element[])}
              </>
            )}

            {/* Over-capacity indicator */}
            {isOverUtilized && (
              <div 
                className="absolute top-0 h-full bg-red-600 opacity-20"
                style={{ 
                  left: '100%',
                  width: `${(employee.allocatedHours - employee.totalCapacity) / maxCapacity * 100}%`
                }}
              />
            )}
          </div>

          {/* Capacity markers */}
          <div className="absolute top-0 w-full h-8 pointer-events-none">
            {/* 100% capacity line */}
            <div 
              className="absolute top-0 h-full w-0.5 bg-gray-400"
              style={{ left: `${(employee.totalCapacity / maxCapacity) * 100}%` }}
            />
          </div>
        </div>

        {/* Hours Display */}
        <div className="w-32 text-right">
          <div className="font-medium text-gray-900">
            {employee.allocatedHours}h / {employee.totalCapacity}h
          </div>
          <div className={`text-sm px-2 py-1 rounded-full ${getUtilizationColor()}`}>
            {utilizationPercentage}%
          </div>
        </div>

        {/* Available Hours */}
        <div className="w-24 text-right">
          <div className={`font-medium ${employee.availableHours < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {employee.availableHours > 0 ? '+' : ''}{employee.availableHours}h
          </div>
          <div className="text-xs text-gray-500">
            {employee.availableHours < 0 ? 'over' : 'available'}
          </div>
        </div>

        {/* Status Indicator */}
        <div className="w-8 flex justify-center">
          {isOverUtilized && <AlertCircle className="w-5 h-5 text-red-500" />}
          {isUnderUtilized && <TrendingDown className="w-5 h-5 text-yellow-500" />}
          {!isOverUtilized && !isUnderUtilized && <TrendingUp className="w-5 h-5 text-green-500" />}
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-10 p-3 bg-gray-900 text-white rounded-lg shadow-lg text-sm max-w-xs">
          <div className="font-medium">{employee.employeeName}</div>
          <div className="mt-1 space-y-1">
            <div>Capacity: {employee.totalCapacity}h</div>
            <div>Allocated: {employee.allocatedHours}h</div>
            <div>Utilization: {utilizationPercentage}%</div>
            <div className={employee.availableHours < 0 ? 'text-red-300' : 'text-green-300'}>
              {Math.abs(employee.availableHours)} hours {employee.availableHours < 0 ? 'over-allocated' : 'available'}
            </div>
            {showEfficiency && employee.efficiency && (
              <div>Efficiency: {(employee.efficiency * 100).toFixed(0)}%</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const CapacityChart: React.FC<CapacityChartProps> = ({
  data,
  showEfficiency = false,
  showProjectBredown = false,
  onEmployeeClick
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'utilization' | 'available'>('utilization');
  const [filterBy, setFilterBy] = useState<'all' | 'over' | 'under' | 'optimal'>('all');

  // Calculate summary statistics
  const stats = useMemo(() => {
    const totalCapacity = data.reduce((sum, emp) => sum + emp.totalCapacity, 0);
    const totalAllocated = data.reduce((sum, emp) => sum + emp.allocatedHours, 0);
    const avgUtilization = data.reduce((sum, emp) => sum + emp.utilization, 0) / data.length;
    
    const overUtilized = data.filter(emp => emp.utilization > 1.0).length;
    const underUtilized = data.filter(emp => emp.utilization < 0.7).length;
    const optimal = data.length - overUtilized - underUtilized;

    return {
      totalCapacity,
      totalAllocated,
      totalAvailable: totalCapacity - totalAllocated,
      avgUtilization: avgUtilization * 100,
      overUtilized,
      underUtilized,
      optimal
    };
  }, [data]);

  // Sort and filter data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply filters
    switch (filterBy) {
      case 'over':
        filtered = data.filter(emp => emp.utilization > 1.0);
        break;
      case 'under':
        filtered = data.filter(emp => emp.utilization < 0.7);
        break;
      case 'optimal':
        filtered = data.filter(emp => emp.utilization >= 0.7 && emp.utilization <= 1.0);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'name':
        return filtered.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
      case 'utilization':
        return filtered.sort((a, b) => b.utilization - a.utilization);
      case 'available':
        return filtered.sort((a, b) => b.availableHours - a.availableHours);
      default:
        return filtered;
    }
  }, [data, sortBy, filterBy]);

  const maxCapacity = Math.max(...data.map(emp => Math.max(emp.totalCapacity, emp.allocatedHours)));

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Capacity Utilization</h3>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Sort Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="name">Name</option>
                <option value="utilization">Utilization</option>
                <option value="available">Available Hours</option>
              </select>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Filter:</span>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">All</option>
                <option value="over">Over-utilized</option>
                <option value="under">Under-utilized</option>
                <option value="optimal">Optimal</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.avgUtilization.toFixed(1)}%</div>
                <div className="text-sm text-blue-600">Avg Utilization</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats.optimal}</div>
            <div className="text-sm text-green-600">Optimal (70-100%)</div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.underUtilized}</div>
            <div className="text-sm text-yellow-600">Under-utilized (&lt;70%)</div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">{stats.overUtilized}</div>
            <div className="text-sm text-red-600">Over-utilized (&gt;100%)</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        {/* Column Headers */}
        <div className="flex items-center space-x-4 pb-3 border-b text-sm font-medium text-gray-600">
          <div className="w-40">Employee</div>
          <div className="flex-1">Capacity Utilization</div>
          <div className="w-32 text-right">Allocated / Total</div>
          <div className="w-24 text-right">Available</div>
          <div className="w-8">Status</div>
        </div>

        {/* Data Rows */}
        <div className="space-y-1 mt-3">
          {processedData.map((employee) => (
            <CapacityBar
              key={employee.employeeId}
              employee={employee}
              maxCapacity={maxCapacity}
              showEfficiency={showEfficiency}
              showProjectBredown={showProjectBredown}
              onClick={onEmployeeClick}
            />
          ))}
        </div>

        {processedData.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <BarChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No employees match the current filter.</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-4 bg-gray-50 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Optimal (70-100%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-600">Under-utilized (&lt;70%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600">Over-utilized (&gt;100%)</span>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            {stats.totalAllocated.toLocaleString()}h allocated of {stats.totalCapacity.toLocaleString()}h total capacity
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapacityChart;
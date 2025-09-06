import React, { useState } from 'react';
import { StatusIndicator, EmployeeAvailability } from './StatusIndicator';
import { ChartBarIcon, UsersIcon, ClockIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

export interface DepartmentUtilization {
  departmentId: string;
  departmentName: string;
  totalEmployees: number;
  availableEmployees: number;
  busyEmployees: number;
  unavailableEmployees: number;
  averageCapacity: number;
  employees: EmployeeAvailability[];
}

interface TeamOverviewProps {
  departmentData: DepartmentUtilization;
  onFilterChange?: (filters: { status?: string }) => void;
  onStatusChange?: (employeeId: string, newStatus: 'available' | 'busy' | 'unavailable') => void;
  showCharts?: boolean;
  className?: string;
}

export function TeamOverview({
  departmentData,
  onFilterChange,
  onStatusChange,
  showCharts = false,
  className = ''
}: TeamOverviewProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleFilterChange = (newFilter: string) => {
    setStatusFilter(newFilter);
    onFilterChange?.({ status: newFilter === 'all' ? undefined : newFilter });
  };

  const getUtilizationLevel = (percentage: number) => {
    if (percentage >= 90) return { label: 'High', color: 'text-red-600', bgColor: 'bg-red-100' };
    if (percentage >= 70) return { label: 'Moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { label: 'Low', color: 'text-green-600', bgColor: 'bg-green-100' };
  };

  const utilizationPercentage = Math.round((departmentData.busyEmployees / departmentData.totalEmployees) * 100);
  const utilization = getUtilizationLevel(utilizationPercentage);

  const filteredEmployees = statusFilter === 'all' 
    ? departmentData.employees 
    : departmentData.employees.filter(emp => emp.status === statusFilter);

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{departmentData.departmentName}</h2>
            <p className="text-sm text-gray-500 mt-1">Team capacity and availability overview</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="block rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
        </div>
      </div>

      {/* Department Metrics */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Total Employees */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{departmentData.totalEmployees}</p>
            </div>
          </div>

          {/* Available */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Available</p>
              <p className="text-2xl font-bold text-green-600">{departmentData.availableEmployees}</p>
            </div>
          </div>

          {/* Busy */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <BriefcaseIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Busy</p>
              <p className="text-2xl font-bold text-yellow-600">{departmentData.busyEmployees}</p>
            </div>
          </div>

          {/* Average Capacity */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Capacity</p>
              <p className="text-2xl font-bold text-purple-600">{departmentData.averageCapacity.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Team Utilization</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${utilization.bgColor} ${utilization.color}`}>
              {utilization.label} ({utilizationPercentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-500"
              style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {showCharts && (
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Utilization Chart Placeholder */}
            <div 
              className="h-48 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300"
              data-testid="utilization-chart"
            >
              <div className="text-center">
                <ChartBarIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Utilization Trend Chart</p>
                <p className="text-xs text-gray-400">Last 30 days</p>
              </div>
            </div>

            {/* Capacity Trend Chart Placeholder */}
            <div 
              className="h-48 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300"
              data-testid="capacity-trend-chart"
            >
              <div className="text-center">
                <ChartBarIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Capacity Trend Chart</p>
                <p className="text-xs text-gray-400">Weekly averages</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Grid/List */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Team Members {statusFilter !== 'all' && `(${filteredEmployees.length})`}
          </h3>
          
          {filteredEmployees.length === 0 && (
            <button
              onClick={() => handleFilterChange('all')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
            </button>
          )}
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-500">
              {statusFilter === 'all' 
                ? 'This department has no active employees.' 
                : `No employees with status "${statusFilter}".`
              }
            </p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-4'
          }>
            {filteredEmployees.map((employee) => (
              <StatusIndicator
                key={employee.id}
                employee={employee}
                onStatusChange={onStatusChange}
                className={viewMode === 'list' ? 'flex-1' : ''}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
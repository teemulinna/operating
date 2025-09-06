import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusIndicator, EmployeeAvailability } from './StatusIndicator';
import { TeamOverview, DepartmentUtilization } from './TeamOverview';
import { ExportManager } from './ExportManager';
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon, 
  FunnelIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface AvailabilityDashboardProps {
  enableRealTime?: boolean;
  defaultView?: 'overview' | 'team' | 'export';
  className?: string;
}

interface AvailabilityFilters {
  search?: string;
  status?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
}

interface WebSocketMessage {
  employeeId: string;
  status: 'available' | 'busy' | 'unavailable';
  capacity: number;
  timestamp: string;
}

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001/api';

// Mock API functions (in real app, these would be in a separate service file)
const availabilityAPI = {
  getEmployeeStatuses: async (filters: AvailabilityFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    
    const response = await fetch(`${API_BASE_URL}/availability/status?${params}`);
    if (!response.ok) throw new Error('Failed to fetch employee statuses');
    return response.json();
  },

  updateEmployeeStatus: async (employeeId: string, status: 'available' | 'busy' | 'unavailable') => {
    const response = await fetch(`${API_BASE_URL}/availability/status/${employeeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status, 
        capacity: status === 'unavailable' ? 0 : 100,
        currentProjects: status === 'busy' ? 3 : status === 'available' ? 1 : 0,
        availableHours: status === 'unavailable' ? 0 : status === 'busy' ? 10 : 40
      })
    });
    if (!response.ok) throw new Error('Failed to update employee status');
    return response.json();
  },

  getDepartmentUtilization: async (departmentId: string) => {
    const response = await fetch(`${API_BASE_URL}/availability/department/${departmentId}`);
    if (!response.ok) throw new Error('Failed to fetch department utilization');
    return response.json();
  },

  subscribeToUpdates: (onMessage: (data: WebSocketMessage) => void) => {
    // Mock WebSocket connection
    const ws = {
      addEventListener: (event: string, handler: (event: any) => void) => {
        if (event === 'message') {
          // Simulate periodic updates
          const interval = setInterval(() => {
            const mockUpdate = {
              data: JSON.stringify({
                employeeId: `emp-${Math.floor(Math.random() * 3) + 1}`,
                status: ['available', 'busy', 'unavailable'][Math.floor(Math.random() * 3)],
                capacity: Math.floor(Math.random() * 100),
                timestamp: new Date().toISOString()
              })
            };
            handler(mockUpdate);
          }, 30000); // Update every 30 seconds
          
          return () => clearInterval(interval);
        } else if (event === 'error') {
          // Simulate occasional connection errors
          setTimeout(() => handler({}), Math.random() * 60000);
        }
      },
      send: () => {},
      close: () => {}
    };
    return ws;
  }
};

export function AvailabilityDashboard({ 
  enableRealTime = false, 
  defaultView = 'overview',
  className = ''
}: AvailabilityDashboardProps) {
  const [currentView, setCurrentView] = useState(defaultView);
  const [filters, setFilters] = useState<AvailabilityFilters>({});
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [realTimeStatus, setRealTimeStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const queryClient = useQueryClient();

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm || undefined }));
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch employee statuses
  const { 
    data: employeesData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['employeeStatuses', filters],
    queryFn: () => availabilityAPI.getEmployeeStatuses(filters),
    refetchInterval: enableRealTime ? 30000 : false, // Refetch every 30 seconds if real-time enabled
    staleTime: 30000
  });

  // Fetch department utilization
  const { data: departmentData } = useQuery({
    queryKey: ['departmentUtilization', selectedDepartment],
    queryFn: () => availabilityAPI.getDepartmentUtilization(selectedDepartment),
    enabled: !!selectedDepartment && currentView === 'team'
  });

  // Update employee status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ employeeId, status }: { employeeId: string; status: 'available' | 'busy' | 'unavailable' }) =>
      availabilityAPI.updateEmployeeStatus(employeeId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeStatuses'] });
      queryClient.invalidateQueries({ queryKey: ['departmentUtilization'] });
    }
  });

  // Real-time WebSocket connection
  useEffect(() => {
    if (!enableRealTime) return;

    let cleanup: (() => void) | undefined;
    
    try {
      setRealTimeStatus('connected');
      const ws = availabilityAPI.subscribeToUpdates((data: WebSocketMessage) => {
        // Update local cache with real-time data
        queryClient.setQueryData(['employeeStatuses'], (oldData: any) => {
          if (!oldData?.data) return oldData;
          
          const updatedEmployees = oldData.data.map((emp: EmployeeAvailability) => 
            emp.id === data.employeeId 
              ? { ...emp, status: data.status, capacity: data.capacity, lastUpdated: data.timestamp }
              : emp
          );
          
          return { ...oldData, data: updatedEmployees };
        });
        
        setLastUpdate(data.timestamp);
      });

      // Handle WebSocket events
      ws.addEventListener('error', () => {
        setRealTimeStatus('error');
        console.warn('WebSocket connection error');
      });

    } catch (error) {
      setRealTimeStatus('error');
      console.error('Failed to establish WebSocket connection:', error);
    }

    return cleanup;
  }, [enableRealTime, queryClient]);

  const handleStatusChange = useCallback(async (employeeId: string, newStatus: 'available' | 'busy' | 'unavailable') => {
    try {
      await updateStatusMutation.mutateAsync({ employeeId, status: newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
      // Toast notification would go here
    }
  }, [updateStatusMutation]);

  const handleFilterChange = useCallback((newFilters: Partial<AvailabilityFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const employees = employeesData?.data || [];
  const totalCount = employeesData?.pagination?.totalItems || 0;

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Availability Data</h3>
        <p className="text-gray-600 mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resource Availability Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Monitor team capacity and availability in real-time
              {totalCount > 0 && ` • ${totalCount} employees`}
            </p>
            {enableRealTime && (
              <div className="flex items-center mt-2">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  realTimeStatus === 'connected' ? 'bg-green-500' :
                  realTimeStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                <span className="text-xs text-gray-500">
                  {realTimeStatus === 'connected' ? 'Real-time updates active' :
                   realTimeStatus === 'error' ? 'Real-time updates unavailable' : 'Real-time updates disabled'}
                  {lastUpdate && ` • Last update: ${new Date(lastUpdate).toLocaleTimeString()}`}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* View Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCurrentView('overview')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'overview' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ChartBarIcon className="w-4 h-4 inline mr-1" />
                Overview
              </button>
              <button
                onClick={() => setCurrentView('team')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'team' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Team View
              </button>
              <button
                onClick={() => setCurrentView('export')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'export' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <DocumentArrowDownIcon className="w-4 h-4 inline mr-1" />
                Export
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      {currentView !== 'export' && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                role="searchbox"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-4 h-4 text-gray-400" />
              <select
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange({ status: e.target.value === 'all' ? undefined : e.target.value })}
                className="block rounded-md border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>

            {/* Department Filter for Team View */}
            {currentView === 'team' && (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="block rounded-md border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                <option value="e85e5cfe-1970-4ea8-98c8-4a59b7587a52">Engineering</option>
                <option value="0deaad17-debf-4e11-bd3a-c387ca4723b4">Sales</option>
                <option value="fe827643-ab36-4d5f-a3a3-b52b20b8fdfa">Marketing</option>
              </select>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {/* Overview Mode */}
        {currentView === 'overview' && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : employees.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or search criteria.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({});
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((employee: EmployeeAvailability) => (
                  <StatusIndicator
                    key={employee.id}
                    employee={employee}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Team View Mode */}
        {currentView === 'team' && selectedDepartment && departmentData && (
          <TeamOverview
            departmentData={departmentData.data}
            onFilterChange={handleFilterChange}
            onStatusChange={handleStatusChange}
            showCharts={true}
          />
        )}

        {currentView === 'team' && !selectedDepartment && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <FunnelIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Department</h3>
            <p className="text-gray-500">Choose a department from the filter above to view team details.</p>
          </div>
        )}

        {/* Export Mode */}
        {currentView === 'export' && (
          <ExportManager employees={employees} />
        )}
      </div>
    </div>
  );
}
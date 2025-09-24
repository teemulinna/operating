import React, { useState } from 'react';
import { HeatMapCalendar } from '../components/heat-map/HeatMapCalendar';
import { HeatMapFilters } from '../components/heat-map/HeatMapFilters';
import { HeatMapBottlenecks } from '../components/heat-map/HeatMapBottlenecks';
import { HeatMapFilters as FilterType } from '../services/heat-map.service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BarChart3, Calendar, AlertTriangle } from 'lucide-react';
export const HeatMapPage: React.FC = () => {
  const [filters, setFilters] = useState<FilterType>({
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    granularity: 'day',
  });
  const [, setSelectedEmployeeId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('calendar');
  const handleFiltersChange = (newFilters: any) => {
    setFilters({
      ...newFilters,
      startDate: newFilters.startDate?.toISOString(),
      endDate: newFilters.endDate?.toISOString(),
      employeeId: newFilters.employeeIds?.[0],
      employeeIds: newFilters.employeeIds,
      departmentId: newFilters.departmentIds?.[0],
      departmentIds: newFilters.departmentIds,
    });
  };
  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    // Switch to calendar view to show the selected employee
    setActiveTab('calendar');
    // Update filters to show only this employee
    setFilters((prev: any) => ({
      ...prev,
      employeeId,
      employeeIds: [employeeId],
    }));
  };
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Capacity Heat Map</h1>
        <p className="text-gray-600">
          Visualize team capacity utilization and identify resource bottlenecks
        </p>
      </div>
      {/* Filters */}
      <HeatMapFilters
        onFiltersChange={handleFiltersChange}
        initialFilters={{
          startDate: new Date(filters.startDate!),
          endDate: new Date(filters.endDate!),
          employeeId: filters.employeeId,
          departmentId: filters.departmentId,
          granularity: filters.granularity as 'day' | 'week' | 'month',
        }}
      />
      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="bottlenecks" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Bottlenecks
          </TabsTrigger>
        </TabsList>
        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <HeatMapCalendar
            employeeId={filters.employeeId}
            departmentId={filters.departmentId}
            startDate={new Date(filters.startDate!)}
            endDate={new Date(filters.endDate!)}
            granularity={filters.granularity as 'day' | 'week' | 'month'}
            onCellClick={(data) => {
              console.log('Cell clicked:', data);
            }}
          />
        </TabsContent>
        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Capacity Analytics</h2>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-900">85%</div>
                <div className="text-sm text-blue-700">Average Utilization</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-900">72</div>
                <div className="text-sm text-emerald-700">Optimal Days</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-amber-900">18</div>
                <div className="text-sm text-amber-700">Warning Days</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-900">5</div>
                <div className="text-sm text-red-700">Critical Days</div>
              </div>
            </div>
            {/* Placeholder for charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6 h-64 flex items-center justify-center">
                <p className="text-gray-500">Utilization Trend Chart</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 h-64 flex items-center justify-center">
                <p className="text-gray-500">Department Comparison Chart</p>
              </div>
            </div>
          </div>
        </TabsContent>
        {/* Bottlenecks Tab */}
        <TabsContent value="bottlenecks" className="space-y-4">
          <HeatMapBottlenecks
            filters={filters}
            onEmployeeSelect={handleEmployeeSelect}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { HeatMapCalendar } from '../../components/heat-map/HeatMapCalendar';
import { HeatMapFilters } from '../../components/heat-map/HeatMapFilters';
import { HeatMapBottlenecks } from '../../components/heat-map/HeatMapBottlenecks';
import { apiClient } from '../../services/api';

export const HeatMapPage = () => {
  const [, setHeatMapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    departmentId: '',
    employeeId: '',
    granularity: 'day' as 'day' | 'week' | 'month'
  });

  const fetchHeatMapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
        ...(filters.departmentId && { departmentId: filters.departmentId }),
        ...(filters.employeeId && { employeeId: filters.employeeId })
      });
      // Note: granularity validation issue - temporarily removed

      const response = await apiClient.get(`/capacity/heatmap?${params}`);
      setHeatMapData(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch heat map data:', err);
      setError(err.message || 'Failed to load heat map data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatMapData();
  }, [filters]);

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Capacity Heat Map</h1>
        <p className="text-gray-600 mt-2">
          Visualize team capacity and utilization patterns across time
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <HeatMapFilters
          onFiltersChange={handleFilterChange}
          initialFilters={filters}
        />
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading heat map data...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <HeatMapCalendar
                startDate={filters.startDate}
                endDate={filters.endDate}
                employeeId={filters.employeeId || undefined}
                departmentId={filters.departmentId || undefined}
                granularity={filters.granularity}
              />
            </div>
            <div className="lg:col-span-1">
              <HeatMapBottlenecks
                filters={{
                  startDate: filters.startDate.toISOString(),
                  endDate: filters.endDate.toISOString(),
                  employeeId: filters.employeeId || undefined,
                  departmentId: filters.departmentId || undefined,
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format,eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { HeatMapService, HeatMapData, HeatMapFilters } from '../../services/heat-map.service';
import { Loader2, Download, RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useHeatMapWebSocket } from '../../hooks/useHeatMapWebSocket';
interface HeatMapCalendarProps {
  employeeId?: string;
  departmentId?: string;
  startDate?: Date;
  endDate?: Date;
  granularity?: 'day' | 'week' | 'month';
  onCellClick?: (data: HeatMapData) => void;
}
export const HeatMapCalendar: React.FC<HeatMapCalendarProps> = ({
  employeeId,
  departmentId,
  startDate = new Date(),
  endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  granularity = 'day',
  onCellClick,
}) => {
  const [heatMapData, setHeatMapData] = useState<HeatMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<HeatMapData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const heatMapService = useMemo(() => new HeatMapService(), []);
  // WebSocket integration for real-time updates
  const handlePartialUpdate = useCallback((update: Partial<HeatMapData>) => {
    setHeatMapData((prevData: any) => {
      const index = prevData.findIndex((item: any) =>
        item.employeeId === update.employeeId &&
        item.date === update.date
      );
      if (index >= 0) {
        const newData = [...prevData];
        newData[index] = { ...newData[index], ...update };
        return newData;
      }
      return prevData;
    });
  }, []);
  const { isConnected, lastUpdate } = useHeatMapWebSocket({
    employeeId,
    departmentId,
    onPartialUpdate: handlePartialUpdate,
    onDataUpdate: setHeatMapData,
    enabled: true,
  });
  // Fetch heat map data
  useEffect(() => {
    loadHeatMapData();
  }, [employeeId, departmentId, startDate, endDate, granularity]);
  const loadHeatMapData = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: HeatMapFilters = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        employeeId,
        departmentId,
        granularity,
      };
      const data = await heatMapService.getHeatMapData(filters);
      setHeatMapData(data);
    } catch (err) {
      setError('Failed to load heat map data');
      console.error('Heat map load error:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await heatMapService.refreshHeatMap();
      await loadHeatMapData();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const filters: HeatMapFilters = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        employeeId,
        departmentId,
        granularity,
      };
      const blob = await heatMapService.exportHeatMap(filters, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `heatmap-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };
  const handleCellClick = (data: HeatMapData) => {
    setSelectedCell(data);
    onCellClick?.(data);
  };
  // Group data by date for calendar view
  const dataByDate = useMemo(() => {
    const map = new Map<string, HeatMapData[]>();
    heatMapData.forEach((item: any) => {
      const dateKey = format(new Date(item.date), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(item);
    });
    return map;
  }, [heatMapData]);
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days;
  }, [startDate, endDate]);
  // Calculate week groups for calendar layout
  const weeks = useMemo(() => {
    const weekGroups: Date[][] = [];
    let currentWeek: Date[] = [];
    calendarDays.forEach((day: any, index: number) => {
      if (index === 0 || day.getDay() === 0) {
        if (currentWeek.length > 0) {
          weekGroups.push(currentWeek);
        }
        currentWeek = [day];
      } else {
        currentWeek.push(day);
      }
    });
    if (currentWeek.length > 0) {
      weekGroups.push(currentWeek);
    }
    return weekGroups;
  }, [calendarDays]);
  const getAggregatedUtilization = (data: HeatMapData[]): {
    percentage: number;
    category: 'green' | 'blue' | 'yellow' | 'red';
    count: number;
  } => {
    if (data.length === 0) {
      return { percentage: 0, category: 'green', count: 0 };
    }
    const avgUtilization = data.reduce((sum, item) => sum + item.utilizationPercentage, 0) / data.length;
    const category = HeatMapService.getUtilizationColor(avgUtilization);
    return {
      percentage: Math.round(avgUtilization),
      category,
      count: data.length,
    };
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header with controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Capacity Heat Map</h2>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Offline</span>
              </>
            )}
            {lastUpdate && (
              <span className="text-xs text-gray-400 ml-2">
                Updated {format(lastUpdate, 'HH:mm:ss')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-6 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-500 rounded"></div>
          <span className="text-sm text-gray-600">≤70% (Optimal)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm text-gray-600">71-85% (Good)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded"></div>
          <span className="text-sm text-gray-600">86-100% (Warning)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-sm text-gray-600">&gt;100% (Critical)</span>
        </div>
      </div>
      {/* Calendar Grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        {/* Calendar weeks */}
        {weeks.map((week: any, weekIndex: number) => (
          <div key={weekIndex} className="grid grid-cols-7 border-t border-gray-200">
            {week.map((day: any, dayIndex: number) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayData = dataByDate.get(dateKey) || [];
              const utilization = getAggregatedUtilization(dayData);
              const isCurrentMonth = isSameMonth(day, startDate);
              const isTodayDate = isToday(day);
              return (
                <div
                  key={dayIndex}
                  onClick={() => dayData.length > 0 && handleCellClick(dayData[0])}
                  className={`
                    relative min-h-[80px] p-2 border-r border-gray-200 last:border-r-0
                    ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
                    ${isTodayDate ? 'ring-2 ring-blue-500' : ''}
                    ${dayData.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}
                  `}
                >
                  {/* Date number */}
                  <div className={`text-sm font-medium ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </div>
                  {/* Utilization indicator */}
                  {dayData.length > 0 && (
                    <div className="mt-1">
                      <div
                        className={`
                          h-6 rounded flex items-center justify-center text-xs font-medium text-white
                          ${HeatMapService.getColorClass(utilization.category)}
                        `}
                      >
                        {utilization.percentage}%
                      </div>
                      {utilization.count > 1 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {utilization.count} employees
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Fill empty cells at end of week */}
            {week.length < 7 && Array(7 - week.length).fill(null).map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-50 border-r border-gray-200 last:border-r-0 min-h-[80px]"></div>
            ))}
          </div>
        ))}
      </div>
      {/* Selected cell details */}
      {selectedCell && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Details for {format(new Date(selectedCell.date), 'MMM d, yyyy')}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Employee:</span> {selectedCell.employeeName}
            </div>
            <div>
              <span className="text-gray-600">Department:</span> {selectedCell.departmentName}
            </div>
            <div>
              <span className="text-gray-600">Allocated:</span> {selectedCell.totalAllocated}h / {selectedCell.dailyCapacity}h
            </div>
            <div>
              <span className="text-gray-600">Utilization:</span> {selectedCell.utilizationPercentage}%
            </div>
            {selectedCell.projectCount > 0 && (
              <div className="col-span-2">
                <span className="text-gray-600">Projects:</span> {selectedCell.projectCount}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

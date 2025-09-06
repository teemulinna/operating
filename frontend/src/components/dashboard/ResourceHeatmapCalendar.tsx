import React, { useState, useMemo } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { LoadingSkeletons } from '../ui/LoadingSkeletons';
import { Employee, CapacityData } from '../../hooks/useResourceData';
import { 
  CalendarIcon, 
  ChevronDownIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// Import the heatmap CSS
import 'react-calendar-heatmap/dist/styles.css';

interface ResourceHeatmapCalendarProps {
  employees: Employee[] | undefined;
  capacityData: CapacityData[];
  className?: string;
}

type ViewMode = 'day' | 'week' | 'month';

interface HeatmapValue {
  date: string;
  count: number;
  employeeIds: string[];
  details: {
    totalAllocated: number;
    totalAvailable: number;
    averageUtilization: number;
    employeeCount: number;
  };
}

export const ResourceHeatmapCalendar: React.FC<ResourceHeatmapCalendarProps> = ({
  employees,
  capacityData,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<HeatmapValue | null>(null);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = new Date(today);

    switch (viewMode) {
      case 'day':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30); // Last 30 days
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - (7 * 12)); // Last 12 weeks
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 12); // Last 12 months
        endDate = new Date(today);
        break;
      default:
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3); // Default to 3 months
    }

    return { startDate, endDate };
  }, [viewMode]);

  // Transform capacity data into heatmap format
  const heatmapValues = useMemo(() => {
    if (!capacityData || capacityData.length === 0) {
      // Generate default values with 0 utilization
      const values: HeatmapValue[] = [];
      const current = new Date(dateRange.startDate);
      
      while (current <= dateRange.endDate) {
        values.push({
          date: current.toISOString().split('T')[0],
          count: 0,
          employeeIds: [],
          details: {
            totalAllocated: 0,
            totalAvailable: 0,
            averageUtilization: 0,
            employeeCount: 0
          }
        });
        current.setDate(current.getDate() + 1);
      }
      
      return values;
    }

    // Filter by selected employee if not "all"
    const filteredData = selectedEmployeeId === 'all' 
      ? capacityData 
      : capacityData.filter(cap => cap.employeeId === selectedEmployeeId);

    // Group by date
    const dataByDate = filteredData.reduce((acc, cap) => {
      const dateStr = new Date(cap.date).toISOString().split('T')[0];
      
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(cap);
      
      return acc;
    }, {} as Record<string, CapacityData[]>);

    // Transform to heatmap format
    const values: HeatmapValue[] = Object.entries(dataByDate).map(([date, dayData]) => {
      const totalAllocated = dayData.reduce((sum, cap) => sum + cap.allocatedHours, 0);
      const totalAvailable = dayData.reduce((sum, cap) => sum + cap.availableHours, 0);
      const averageUtilization = dayData.length > 0 
        ? dayData.reduce((sum, cap) => sum + cap.utilizationRate, 0) / dayData.length 
        : 0;

      return {
        date,
        count: Math.round(averageUtilization * 100), // Convert to percentage for display
        employeeIds: dayData.map(cap => cap.employeeId),
        details: {
          totalAllocated,
          totalAvailable,
          averageUtilization,
          employeeCount: dayData.length
        }
      };
    });

    // Fill in missing dates with zero values
    const allDates: HeatmapValue[] = [];
    const current = new Date(dateRange.startDate);
    
    while (current <= dateRange.endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const existingValue = values.find(v => v.date === dateStr);
      
      if (existingValue) {
        allDates.push(existingValue);
      } else {
        allDates.push({
          date: dateStr,
          count: 0,
          employeeIds: [],
          details: {
            totalAllocated: 0,
            totalAvailable: 0,
            averageUtilization: 0,
            employeeCount: 0
          }
        });
      }
      
      current.setDate(current.getDate() + 1);
    }

    return allDates.sort((a, b) => a.date.localeCompare(b.date));
  }, [capacityData, selectedEmployeeId, dateRange]);

  const getClassForValue = (value: HeatmapValue | null) => {
    if (!value || value.count === 0) return 'color-empty';
    
    if (value.count < 25) return 'color-github-0';
    if (value.count < 50) return 'color-github-1';
    if (value.count < 75) return 'color-github-2';
    if (value.count < 100) return 'color-github-3';
    return 'color-github-4';
  };

  const handleCellClick = (value: HeatmapValue | null) => {
    setSelectedDay(value);
  };

  const getTooltipDataAttrs = (value: HeatmapValue | null) => {
    if (!value) return {};
    
    return {
      'data-tooltip-id': 'utilization-tooltip',
      'data-tooltip-content': `${value.date}: ${value.count}% utilization (${value.details.employeeCount} employees)`,
      'data-tooltip-place': 'top'
    };
  };

  if (!employees) {
    return <LoadingSkeletons.Chart data-testid="loading-skeleton" />;
  }

  return (
    <div 
      className={cn('resource-heatmap-calendar', className)}
      role="region"
      aria-label="Resource utilization heatmap calendar"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Resource Utilization Heatmap
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Visual representation of team utilization over time
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {/* Employee Filter */}
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="min-w-[140px]">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees?.map(employee => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex border rounded-lg overflow-hidden">
                {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      'rounded-none capitalize',
                      viewMode === mode && 'bg-blue-600'
                    )}
                    onClick={() => setViewMode(mode)}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div 
            className="responsive-heatmap overflow-x-auto p-4"
            data-testid="heatmap-container"
          >
            <CalendarHeatmap
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              values={heatmapValues}
              classForValue={getClassForValue}
              onClick={handleCellClick}
              tooltipDataAttrs={getTooltipDataAttrs}
              showWeekdayLabels
              showMonthLabels
            />
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <InformationCircleIcon className="h-4 w-4" />
              <span>Utilization</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Low</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded-sm" />
                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded-sm" />
                <div className="w-3 h-3 bg-green-200 border border-green-300 rounded-sm" />
                <div className="w-3 h-3 bg-green-400 border border-green-500 rounded-sm" />
                <div className="w-3 h-3 bg-green-600 border border-green-700 rounded-sm" />
              </div>
              <span className="text-sm text-gray-500">High</span>
            </div>
          </div>

          {/* Day Details */}
          {selectedDay && (
            <Card className="mt-4" data-testid="day-detail-tooltip">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">
                    {new Date(selectedDay.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h4>
                  <Badge variant={selectedDay.count > 100 ? "destructive" : "default"}>
                    {selectedDay.count}% Utilization
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Employees</p>
                    <p className="text-lg font-semibold">{selectedDay.details.employeeCount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Allocated</p>
                    <p className="text-lg font-semibold">{selectedDay.details.totalAllocated}h</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Available</p>
                    <p className="text-lg font-semibold">{selectedDay.details.totalAvailable}h</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
                    <p className="text-lg font-semibold">
                      {(selectedDay.details.averageUtilization * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Tooltip Container */}
      <div data-testid="tooltip-utilization-tooltip" />

      {/* Custom CSS for heatmap colors */}
      <style>{`
        .resource-heatmap-calendar .react-calendar-heatmap .color-empty {
          fill: #ebedf0;
        }
        .resource-heatmap-calendar .react-calendar-heatmap .color-github-0 {
          fill: #9be9a8;
        }
        .resource-heatmap-calendar .react-calendar-heatmap .color-github-1 {
          fill: #40c463;
        }
        .resource-heatmap-calendar .react-calendar-heatmap .color-github-2 {
          fill: #30a14e;
        }
        .resource-heatmap-calendar .react-calendar-heatmap .color-github-3 {
          fill: #216e39;
        }
        .resource-heatmap-calendar .react-calendar-heatmap .color-github-4 {
          fill: #196127;
        }
        .resource-heatmap-calendar .react-calendar-heatmap rect {
          cursor: pointer;
        }
        .resource-heatmap-calendar .react-calendar-heatmap rect:hover {
          stroke: #333;
          stroke-width: 1px;
        }

        @media (max-width: 640px) {
          .responsive-heatmap {
            font-size: 12px;
          }
          .resource-heatmap-calendar .react-calendar-heatmap .month-label {
            font-size: 10px;
          }
          .resource-heatmap-calendar .react-calendar-heatmap .day-label {
            font-size: 8px;
          }
        }
      `}</style>
    </div>
  );
};
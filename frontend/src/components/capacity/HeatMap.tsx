import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  isWeekend,
  isSameDay
} from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, DownloadIcon, RefreshCwIcon } from 'lucide-react';
import { HeatMapCell } from './HeatMapCell';
import { HeatMapLegend } from './HeatMapLegend';
import { HeatMapFilters } from './HeatMapFilters';
import { useCapacityHeatmap } from '../../hooks/useCapacityHeatmap';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';

// ============================================
// TYPES
// ============================================

export type HeatmapGranularity = 'daily' | 'weekly' | 'monthly';
export type HeatLevel = 'available' | 'green' | 'blue' | 'yellow' | 'red' | 'unavailable';

export interface HeatmapCell {
  employeeId: string;
  employeeName: string;
  department: string;
  date: Date;
  availableHours: number;
  allocatedHours: number;
  utilizationPercentage: number;
  heatLevel: HeatLevel;
  projectCount: number;
  projectNames: string[];
  isHoliday?: boolean;
  hasException?: boolean;
}

export interface HeatmapData {
  cells: HeatmapCell[];
  summary: {
    totalEmployees: number;
    totalAvailableHours: number;
    totalAllocatedHours: number;
    avgUtilization: number;
    peakUtilization: number;
    overAllocatedDays: number;
    underUtilizedDays: number;
  };
  metadata: {
    startDate: Date;
    endDate: Date;
    granularity: HeatmapGranularity;
    lastRefreshed: Date;
    cached: boolean;
  };
}

export interface HeatMapProps {
  departmentId?: string;
  employeeIds?: string[];
  initialStartDate?: Date;
  initialEndDate?: Date;
  initialGranularity?: HeatmapGranularity;
  showFilters?: boolean;
  showLegend?: boolean;
  showSummary?: boolean;
  onCellClick?: (cell: HeatmapCell) => void;
  onExport?: (data: HeatmapData) => void;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const HeatMap: React.FC<HeatMapProps> = ({
  departmentId,
  employeeIds,
  initialStartDate = new Date(),
  initialEndDate = addWeeks(new Date(), 4),
  initialGranularity = 'daily',
  showFilters = true,
  showLegend = true,
  showSummary = true,
  onCellClick,
  onExport,
  className = ''
}) => {
  // State
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [granularity, setGranularity] = useState<HeatmapGranularity>(initialGranularity);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(employeeIds || []);
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>(departmentId);
  const [includeWeekends, setIncludeWeekends] = useState(false);

  // Query heat map data
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useCapacityHeatmap({
    startDate,
    endDate,
    departmentId: selectedDepartment,
    employeeIds: selectedEmployees.length > 0 ? selectedEmployees : undefined,
    granularity,
    includeInactive: false,
    includeWeekends
  });

  // Compute grid dimensions
  const gridData = useMemo(() => {
    if (!data?.cells) return { employees: [], dates: [], cellMap: new Map() };

    // Extract unique employees and dates
    const employeeSet = new Set<string>();
    const dateSet = new Set<string>();
    const cellMap = new Map<string, HeatmapCell>();

    data.cells.forEach(cell => {
      const employeeKey = `${cell.employeeId}-${cell.employeeName}`;
      const dateKey = format(new Date(cell.date), 'yyyy-MM-dd');
      const cellKey = `${employeeKey}-${dateKey}`;

      employeeSet.add(employeeKey);
      dateSet.add(dateKey);
      cellMap.set(cellKey, cell);
    });

    const employees = Array.from(employeeSet).sort();
    const dates = Array.from(dateSet).sort();

    return { employees, dates, cellMap };
  }, [data]);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (granularity === 'monthly') {
      setStartDate(prev => addMonths(prev, -1));
      setEndDate(prev => addMonths(prev, -1));
    } else if (granularity === 'weekly') {
      setStartDate(prev => addWeeks(prev, -1));
      setEndDate(prev => addWeeks(prev, -1));
    } else {
      setStartDate(prev => addWeeks(prev, -1));
      setEndDate(prev => addWeeks(prev, -1));
    }
  }, [granularity]);

  const handleNext = useCallback(() => {
    if (granularity === 'monthly') {
      setStartDate(prev => addMonths(prev, 1));
      setEndDate(prev => addMonths(prev, 1));
    } else if (granularity === 'weekly') {
      setStartDate(prev => addWeeks(prev, 1));
      setEndDate(prev => addWeeks(prev, 1));
    } else {
      setStartDate(prev => addWeeks(prev, 1));
      setEndDate(prev => addWeeks(prev, 1));
    }
  }, [granularity]);

  const handleToday = useCallback(() => {
    const today = new Date();
    if (granularity === 'monthly') {
      setStartDate(startOfMonth(today));
      setEndDate(endOfMonth(today));
    } else if (granularity === 'weekly') {
      setStartDate(startOfWeek(today));
      setEndDate(endOfWeek(addWeeks(today, 3)));
    } else {
      setStartDate(today);
      setEndDate(addWeeks(today, 4));
    }
  }, [granularity]);

  // Export handler
  const handleExport = useCallback(async () => {
    if (!data) return;

    if (onExport) {
      onExport(data);
    } else {
      // Default CSV export
      try {
        const response = await fetch(`/api/capacity/heatmap/export?${new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          departmentId: selectedDepartment || '',
          granularity
        })}`);

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `heatmap-${granularity}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Export failed:', error);
      }
    }
  }, [data, onExport, startDate, endDate, selectedDepartment, granularity]);

  // Render loading state
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 40 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (isError) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertDescription>
          Failed to load heat map data: {error?.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            disabled={isFetching}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleToday}
            disabled={isFetching}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={isFetching}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select value={granularity} onValueChange={(val) => setGranularity(val as HeatmapGranularity)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCwIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!data || isFetching}
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <HeatMapFilters
          selectedDepartment={selectedDepartment}
          selectedEmployees={selectedEmployees}
          includeWeekends={includeWeekends}
          onDepartmentChange={setSelectedDepartment}
          onEmployeesChange={setSelectedEmployees}
          onIncludeWeekendsChange={setIncludeWeekends}
        />
      )}

      {/* Summary Stats */}
      {showSummary && data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-background rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">Avg Utilization</div>
            <div className="text-2xl font-semibold">{data.summary.avgUtilization.toFixed(1)}%</div>
          </div>
          <div className="bg-background rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">Peak Utilization</div>
            <div className="text-2xl font-semibold">{data.summary.peakUtilization.toFixed(1)}%</div>
          </div>
          <div className="bg-background rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">Over-allocated Days</div>
            <div className="text-2xl font-semibold text-red-600">{data.summary.overAllocatedDays}</div>
          </div>
          <div className="bg-background rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">Available Days</div>
            <div className="text-2xl font-semibold text-green-600">{data.summary.underUtilizedDays}</div>
          </div>
        </div>
      )}

      {/* Heat Map Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Date Headers */}
          <div className="grid grid-cols-[200px_repeat(auto-fill,_minmax(40px,_1fr))] gap-1 mb-2">
            <div></div>
            {gridData.dates.map(date => (
              <div
                key={date}
                className="text-xs text-center text-muted-foreground font-medium"
              >
                {granularity === 'weekly' ?
                  `W${format(new Date(date), 'w')}` :
                  format(new Date(date), 'MMM d')
                }
              </div>
            ))}
          </div>

          {/* Employee Rows */}
          {gridData.employees.map(employeeKey => {
            const [employeeId, employeeName] = employeeKey.split('-');
            return (
              <div
                key={employeeKey}
                className="grid grid-cols-[200px_repeat(auto-fill,_minmax(40px,_1fr))] gap-1 mb-1"
              >
                <div className="text-sm truncate pr-2 py-2">
                  {employeeName}
                </div>
                {gridData.dates.map(date => {
                  const cellKey = `${employeeKey}-${date}`;
                  const cell = gridData.cellMap.get(cellKey);

                  return cell ? (
                    <HeatMapCell
                      key={cellKey}
                      cell={cell}
                      onClick={onCellClick}
                    />
                  ) : (
                    <div key={cellKey} className="bg-gray-100 rounded" />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {showLegend && <HeatMapLegend />}

      {/* Cache indicator */}
      {data?.metadata.cached && (
        <div className="text-xs text-muted-foreground text-right">
          Cached data • Last refreshed {format(new Date(data.metadata.lastRefreshed), 'MMM d, h:mm a')}
        </div>
      )}
    </div>
  );
};
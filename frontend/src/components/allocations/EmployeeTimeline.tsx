import React, { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, UserIcon, CalendarIcon, ClockIcon, TrendingUpIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AllocationCard } from './AllocationCard';
import { useEmployeeAllocations, useUtilization } from '@/hooks/useAllocations';
import type { Allocation, TimelineEntry } from '@/types/allocation';
import { ALLOCATION_STATUS_COLORS } from '@/types/allocation';

interface EmployeeTimelineProps {
  employeeId: string;
  employeeName?: string;
  onAllocationClick?: (allocation: Allocation) => void;
  onAllocationEdit?: (allocation: Allocation) => void;
  onAllocationDelete?: (allocation: Allocation) => void;
  className?: string;
}

export function EmployeeTimeline({
  employeeId,
  employeeName,
  onAllocationClick,
  onAllocationEdit,
  onAllocationDelete,
  className = ""
}: EmployeeTimelineProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'timeline' | 'cards'>('timeline');
  const [timeRange, setTimeRange] = useState<'3months' | '6months' | '1year'>('6months');

  // Calculate date range based on time range selection
  const dateRange = useMemo(() => {
    const monthsToShow = timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12;
    const startDate = subMonths(startOfMonth(currentDate), Math.floor(monthsToShow / 2));
    const endDate = addMonths(startDate, monthsToShow);
    return { startDate, endDate };
  }, [currentDate, timeRange]);

  // Fetch employee allocations
  const { data: allocationsData, isLoading: allocationsLoading } = useEmployeeAllocations(
    employeeId,
    {
      startDateFrom: format(dateRange.startDate, 'yyyy-MM-dd'),
      endDateTo: format(dateRange.endDate, 'yyyy-MM-dd'),
    }
  );

  // Fetch utilization data
  const { data: utilizationData, isLoading: utilizationLoading } = useUtilization(
    employeeId,
    format(dateRange.startDate, 'yyyy-MM-dd'),
    format(dateRange.endDate, 'yyyy-MM-dd')
  );

  // Generate months for timeline
  const months = useMemo(() => {
    return eachMonthOfInterval({
      start: dateRange.startDate,
      end: dateRange.endDate
    });
  }, [dateRange]);

  // Group allocations by month
  const allocationsByMonth = useMemo(() => {
    if (!allocationsData?.allocations) return {};

    const grouped: Record<string, Allocation[]> = {};

    allocationsData.allocations.forEach((allocation) => {
      const startDate = parseISO(allocation.startDate);
      const endDate = parseISO(allocation.endDate);

      // Find all months this allocation spans
      months.forEach(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        // Check if allocation overlaps with this month
        if (startDate <= monthEnd && endDate >= monthStart) {
          const monthKey = format(month, 'yyyy-MM');
          if (!grouped[monthKey]) {
            grouped[monthKey] = [];
          }
          grouped[monthKey].push(allocation);
        }
      });
    });

    return grouped;
  }, [allocationsData?.allocations, months]);

  const navigateTime = (direction: 'prev' | 'next') => {
    const monthsToMove = timeRange === '3months' ? 1 : timeRange === '6months' ? 3 : 6;
    
    if (direction === 'prev') {
      setCurrentDate(subMonths(currentDate, monthsToMove));
    } else {
      setCurrentDate(addMonths(currentDate, monthsToMove));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (allocationsLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allocations = allocationsData?.allocations || [];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center">
            <UserIcon className="mr-2 h-5 w-5" />
            {employeeName ? `${employeeName}'s Timeline` : 'Employee Timeline'}
          </CardTitle>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Time Range Selector */}
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">3 Months</SelectItem>
                <SelectItem value="6months">6 Months</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Selector */}
            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timeline">Timeline</SelectItem>
                <SelectItem value="cards">Cards</SelectItem>
              </SelectContent>
            </Select>

            {/* Navigation */}
            <Button variant="outline" size="sm" onClick={() => navigateTime('prev')}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            
            <Button variant="outline" size="sm" onClick={() => navigateTime('next')}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Utilization Summary */}
        {utilizationData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
              <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <div className="text-sm font-medium text-blue-900">Weekly Capacity</div>
                <div className="text-lg font-bold text-blue-700">{utilizationData.weeklyCapacity}h</div>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-green-50 rounded-lg">
              <TrendingUpIcon className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <div className="text-sm font-medium text-green-900">Allocated</div>
                <div className="text-lg font-bold text-green-700">{utilizationData.allocatedHours}h</div>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-purple-50 rounded-lg">
              <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center mr-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              </div>
              <div>
                <div className="text-sm font-medium text-purple-900">Available</div>
                <div className="text-lg font-bold text-purple-700">{utilizationData.availableHours}h</div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Utilization</span>
                <span className="text-lg font-bold text-gray-900">
                  {Math.round(utilizationData.utilizationRate)}%
                </span>
              </div>
              <Progress 
                value={utilizationData.utilizationRate} 
                className={`h-2 ${utilizationData.overallocated ? 'bg-red-100' : ''}`}
              />
              {utilizationData.overallocated && (
                <div className="text-xs text-red-600 mt-1">Overallocated</div>
              )}
            </div>
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="space-y-4">
            {months.map((month) => {
              const monthKey = format(month, 'yyyy-MM');
              const monthAllocations = allocationsByMonth[monthKey] || [];
              const monthName = format(month, 'MMMM yyyy');

              return (
                <div key={monthKey} className="border-l-2 border-gray-200 pl-4 ml-4">
                  {/* Month Header */}
                  <div className="flex items-center mb-3 -ml-6">
                    <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow"></div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">{monthName}</h3>
                      <p className="text-sm text-gray-600">
                        {monthAllocations.length} allocation{monthAllocations.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Allocations for this month */}
                  <div className="space-y-3 pb-6">
                    {monthAllocations.length > 0 ? (
                      monthAllocations.map((allocation) => (
                        <div key={allocation.id} className="ml-4">
                          <AllocationCard
                            allocation={allocation}
                            onClick={onAllocationClick}
                            onEdit={onAllocationEdit}
                            onDelete={onAllocationDelete}
                            showEmployee={false}
                            compact
                          />
                        </div>
                      ))
                    ) : (
                      <div className="ml-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <p className="text-sm text-gray-500 text-center">No allocations for this month</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cards View */}
        {viewMode === 'cards' && (
          <div className="space-y-6">
            {allocations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allocations.map((allocation) => (
                  <AllocationCard
                    key={allocation.id}
                    allocation={allocation}
                    onClick={onAllocationClick}
                    onEdit={onAllocationEdit}
                    onDelete={onAllocationDelete}
                    showEmployee={false}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No allocations</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No allocations found for the selected time period.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Statistics Summary */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{allocations.length}</div>
              <div className="text-sm text-gray-600">Total Allocations</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {allocations.filter(a => a.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {allocations.filter(a => a.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {allocations.filter(a => a.status === 'planned').length}
              </div>
              <div className="text-sm text-gray-600">Planned</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
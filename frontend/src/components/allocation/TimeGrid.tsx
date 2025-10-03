import React, { useMemo, useCallback } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isWeekend, isSameDay } from 'date-fns';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { TimeSlot } from '../../types/allocation';

interface TimeGridProps {
  timeSlots: TimeSlot[];
  viewMode: 'week' | 'month' | 'quarter';
  selectedDate: Date;
  onDateChange?: (date: Date) => void;
  onViewModeChange?: (mode: 'week' | 'month' | 'quarter') => void;
  className?: string;
}

export const TimeGrid: React.FC<TimeGridProps> = ({
  timeSlots,
  viewMode,
  selectedDate,
  onDateChange,
  onViewModeChange,
  className,
}) => {
  // Navigate to previous period
  const navigatePrevious = useCallback(() => {
    if (!onDateChange) return;

    let newDate: Date;
    switch (viewMode) {
      case 'week':
        newDate = addDays(selectedDate, -7);
        break;
      case 'month':
        newDate = addDays(selectedDate, -30);
        break;
      case 'quarter':
        newDate = addDays(selectedDate, -90);
        break;
      default:
        newDate = addDays(selectedDate, -7);
    }
    onDateChange(newDate);
  }, [selectedDate, viewMode, onDateChange]);

  // Navigate to next period
  const navigateNext = useCallback(() => {
    if (!onDateChange) return;

    let newDate: Date;
    switch (viewMode) {
      case 'week':
        newDate = addDays(selectedDate, 7);
        break;
      case 'month':
        newDate = addDays(selectedDate, 30);
        break;
      case 'quarter':
        newDate = addDays(selectedDate, 90);
        break;
      default:
        newDate = addDays(selectedDate, 7);
    }
    onDateChange(newDate);
  }, [selectedDate, viewMode, onDateChange]);

  // Go to today
  const goToToday = useCallback(() => {
    if (!onDateChange) return;
    onDateChange(new Date());
  }, [onDateChange]);

  // Get period label
  const getPeriodLabel = useMemo(() => {
    switch (viewMode) {
      case 'week':
        const weekStart = startOfWeek(selectedDate);
        const weekEnd = endOfWeek(selectedDate);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'month':
        return format(selectedDate, 'MMMM yyyy');
      case 'quarter':
        const quarter = Math.floor(selectedDate.getMonth() / 3) + 1;
        return `Q${quarter} ${format(selectedDate, 'yyyy')}`;
      default:
        return format(selectedDate, 'MMMM yyyy');
    }
  }, [selectedDate, viewMode]);

  // Group time slots by week for better display in month/quarter view
  const groupedTimeSlots = useMemo(() => {
    if (viewMode === 'week') {
      return [timeSlots];
    }

    const groups: TimeSlot[][] = [];
    let currentGroup: TimeSlot[] = [];

    timeSlots.forEach((slot, index) => {
      currentGroup.push(slot);

      // Check if this is the end of a week (Sunday) or the last slot
      const slotDate = new Date(slot.date);
      if (slotDate.getDay() === 0 || index === timeSlots.length - 1) {
        groups.push([...currentGroup]);
        currentGroup = [];
      }
    });

    return groups;
  }, [timeSlots, viewMode]);

  // Get column width based on view mode
  const getColumnWidth = () => {
    switch (viewMode) {
      case 'week': return 'w-32'; // More space for weekly view
      case 'month': return 'w-24';
      case 'quarter': return 'w-16';
      default: return 'w-24';
    }
  };

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="sm" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-lg font-semibold">{getPeriodLabel}</h2>

          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        {/* View mode selector */}
        {onViewModeChange && (
          <div className="flex items-center space-x-1">
            {(['week', 'month', 'quarter'] as const).map(mode => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewModeChange(mode)}
                className="capitalize"
              >
                {mode}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Time grid */}
      <div className="space-y-2">
        {groupedTimeSlots.map((weekSlots, weekIndex) => (
          <div key={weekIndex} className="flex gap-1 overflow-x-auto">
            {weekSlots.map(slot => {
              const slotDate = new Date(slot.date);
              const isToday = isSameDay(slotDate, new Date());
              const isWeekendDay = isWeekend(slotDate);
              const utilizationRate = (slot.totalCapacity ?? 0) > 0
                ? ((slot.totalAllocated ?? 0) / (slot.totalCapacity ?? 0)) * 100
                : 0;

              return (
                <div
                  key={slot.date}
                  className={cn(
                    'flex-shrink-0 p-2 border rounded-lg transition-colors',
                    getColumnWidth(),
                    isToday && 'border-primary bg-primary/5',
                    isWeekendDay && 'bg-gray-50',
                    slot.isHoliday && 'bg-red-50 border-red-200'
                  )}
                >
                  {/* Date header */}
                  <div className="text-center mb-2">
                    <div className={cn(
                      'text-xs font-medium',
                      isToday && 'text-primary',
                      isWeekendDay && 'text-muted-foreground'
                    )}>
                      {format(slotDate, 'EEE')}
                    </div>
                    <div className={cn(
                      'text-lg font-semibold',
                      isToday && 'text-primary'
                    )}>
                      {format(slotDate, 'd')}
                    </div>
                  </div>

                  {/* Capacity indicator */}
                  {viewMode === 'week' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Capacity</span>
                        <span>{Math.round(utilizationRate)}%</span>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all',
                            utilizationRate > 100 ? 'bg-red-500' :
                            utilizationRate > 90 ? 'bg-orange-500' :
                            utilizationRate > 75 ? 'bg-yellow-500' : 'bg-green-500'
                          )}
                          style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                        />
                      </div>

                      <div className="text-xs text-center text-muted-foreground">
                        {slot.totalAllocated}h / {slot.totalCapacity}h
                      </div>
                    </div>
                  )}

                  {/* Compact view for month/quarter */}
                  {viewMode !== 'week' && (
                    <div className="text-center">
                      {utilizationRate > 0 && (
                        <div className={cn(
                          'w-2 h-2 rounded-full mx-auto',
                          utilizationRate > 100 ? 'bg-red-500' :
                          utilizationRate > 90 ? 'bg-orange-500' :
                          utilizationRate > 75 ? 'bg-yellow-500' : 'bg-green-500'
                        )} />
                      )}
                    </div>
                  )}

                  {/* Holiday indicator */}
                  {slot.isHoliday && (
                    <Badge variant="outline" className="w-full text-xs justify-center mt-1">
                      Holiday
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Normal (0-75%)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>High (75-90%)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <span>Critical (90-100%)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span>Over-allocated ({'>'}100%)</span>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Drag allocations to schedule</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TimeGrid;

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { 
  CalendarIcon, 
  ChartBarIcon, 
  ClockIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Employee, CapacityData } from '../../hooks/useResourceData';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

interface SmartResourceCardProps {
  employee: Employee;
  capacityData: CapacityData[];
  onSchedule?: (employee: Employee) => void;
  onAssign?: (employee: Employee) => void;
  onAnalytics?: (employee: Employee) => void;
  isLoading?: boolean;
  className?: string;
}

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ 
  percentage, 
  size = 64, 
  strokeWidth = 6 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (percent: number) => {
    if (percent >= 100) return 'text-red-500';
    if (percent >= 80) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="absolute inset-0 -rotate-90 transform"
        width={size}
        height={size}
        data-testid="progress-ring"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className={getColor(percentage)}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className={`text-sm font-semibold ${getColor(percentage)}`}
          aria-live="polite"
          aria-label={`${percentage}% utilization`}
        >
          {Math.round(percentage)}%
        </span>
      </div>
      {percentage > 100 && (
        <div 
          className="absolute -top-1 -right-1"
          data-testid="over-utilization-warning"
        >
          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
        </div>
      )}
    </div>
  );
};

interface MiniCalendarProps {
  capacityData: CapacityData[];
  employeeId: string;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ capacityData, employeeId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getUtilizationForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const capacity = capacityData.find(c => 
      c.employeeId === employeeId && c.date.startsWith(dateStr)
    );
    return capacity ? capacity.utilizationRate : 0;
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization === 0) return 'bg-gray-100';
    if (utilization > 1) return 'bg-red-500';
    if (utilization > 0.8) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  return (
    <div className="space-y-2">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-1 hover:bg-gray-100 rounded"
          data-testid="prev-month-button"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => navigateMonth('next')}
          className="p-1 hover:bg-gray-100 rounded"
          data-testid="next-month-button"
          aria-label="Next month"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 text-xs">
        {/* Day headers */}
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-gray-500 font-medium p-1">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {daysInMonth.map(date => {
          const utilization = getUtilizationForDate(date);
          const dayNumber = date.getDate();
          
          return (
            <Popover key={date.toISOString()}>
              <PopoverTrigger asChild>
                <button
                  className={`
                    relative w-6 h-6 text-xs rounded transition-colors
                    hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${getUtilizationColor(utilization)}
                    ${utilization === 0 ? 'text-gray-600' : 'text-white'}
                  `}
                  data-testid={`calendar-day-${dayNumber}`}
                  onMouseEnter={() => setHoveredDate(date)}
                  onMouseLeave={() => setHoveredDate(null)}
                >
                  {dayNumber}
                  {utilization > 0 && (
                    <div className="absolute bottom-0 right-0 w-1 h-1 bg-white rounded-full opacity-75" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" side="top">
                <div className="text-xs">
                  <div className="font-medium">{format(date, 'MMM d, yyyy')}</div>
                  {utilization > 0 ? (
                    <div className="mt-1 text-gray-600">
                      <div>{Math.round(utilization * 40)}/40 hours</div>
                      <div>{Math.round(utilization * 100)}% utilized</div>
                    </div>
                  ) : (
                    <div className="mt-1 text-gray-500">No allocations</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
};

export const SmartResourceCard: React.FC<SmartResourceCardProps> = ({
  employee,
  capacityData,
  onSchedule,
  onAssign,
  onAnalytics,
  isLoading = false,
  className = ''
}) => {
  const [realCapacityData, setRealCapacityData] = useState<CapacityData[]>(capacityData);
  const [isLoadingCapacity, setIsLoadingCapacity] = useState(false);

  // Calculate average utilization
  const averageUtilization = useMemo(() => {
    if (!realCapacityData || realCapacityData.length === 0) return 0;
    
    const employeeCapacityData = realCapacityData.filter(
      c => c.employeeId === employee.id.toString()
    );
    
    if (employeeCapacityData.length === 0) return 0;
    
    const total = employeeCapacityData.reduce((sum, c) => sum + c.utilizationRate, 0);
    return (total / employeeCapacityData.length) * 100;
  }, [realCapacityData, employee.id]);

  // Fetch real capacity data
  const fetchCapacityData = async () => {
    try {
      setIsLoadingCapacity(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/capacity`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const capacityArray = data.data || data;
        if (Array.isArray(capacityArray)) {
          setRealCapacityData(capacityArray);
        }
      }
    } catch (error) {
      console.error('Failed to fetch capacity data:', error);
      // Keep using provided capacity data on error
    } finally {
      setIsLoadingCapacity(false);
    }
  };

  useEffect(() => {
    fetchCapacityData();
  }, [employee.id]);

  useEffect(() => {
    setRealCapacityData(capacityData);
  }, [capacityData]);

  const cardVariants = {
    initial: { scale: 1, y: 0 },
    hover: { scale: 1.02, y: -2 },
    tap: { scale: 0.98 }
  };

  const isDisabled = !employee.isActive || isLoading || isLoadingCapacity;

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={className}
      data-testid="smart-resource-card"
    >
      <Card className="relative overflow-hidden">
        {/* Loading overlay */}
        <AnimatePresence>
          {(isLoading || isLoadingCapacity) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/50 flex items-center justify-center z-10"
            >
              <div 
                className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
                data-testid="card-loading-spinner"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              
              {/* Employee info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {employee.firstName} {employee.lastName}
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {employee.position}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {employee.email}
                </p>
                
                {/* Status badge */}
                <div className="mt-2">
                  <Badge 
                    variant={employee.isActive ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Utilization ring */}
            <div className="flex-shrink-0">
              <ProgressRing percentage={averageUtilization} />
              <div className="text-center mt-1">
                <span className="text-xs text-gray-600">Utilization</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Skills */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
            <div className="flex flex-wrap gap-1">
              {employee.skills && employee.skills.length > 0 ? (
                employee.skills.map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-gray-500">No skills listed</span>
              )}
            </div>
          </div>

          {/* Mini Calendar */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              Allocation Calendar
            </h4>
            <MiniCalendar 
              capacityData={realCapacityData} 
              employeeId={employee.id.toString()} 
            />
          </div>

          {/* Quick Actions */}
          <div className="pt-2 border-t">
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isDisabled}
                onClick={() => onSchedule?.(employee)}
                className="text-xs flex items-center gap-1"
                aria-label={`Schedule ${employee.firstName} ${employee.lastName}`}
              >
                <ClockIcon className="h-3 w-3" />
                Schedule
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                disabled={isDisabled}
                onClick={() => onAssign?.(employee)}
                className="text-xs flex items-center gap-1"
                aria-label={`Quick assign ${employee.firstName} ${employee.lastName}`}
              >
                <UserIcon className="h-3 w-3" />
                Quick Assign
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                disabled={false} // Analytics can be viewed even for inactive employees
                onClick={() => onAnalytics?.(employee)}
                className="text-xs flex items-center gap-1"
                aria-label={`View analytics for ${employee.firstName} ${employee.lastName}`}
              >
                <ChartBarIcon className="h-3 w-3" />
                Analytics
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
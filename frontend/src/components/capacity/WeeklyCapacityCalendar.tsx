import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Employee } from '@/types/Employee';
import { StatusBadge, CapacityProgressBar } from './CapacityIndicator';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';

interface WeeklyCapacityCalendarProps {
  employees: Employee[];
  onEmployeeSelect?: (employee: Employee) => void;
  className?: string;
}

// Mock function to generate capacity data for the week
const generateWeeklyData = (employee: Employee, weekStart: Date) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dayName = format(date, 'EEE');
    const isWeekend = i === 5 || i === 6; // Saturday, Sunday
    
    // Mock capacity data
    const totalHours = isWeekend ? 0 : 8;
    const allocatedHours = isWeekend ? 0 : Math.floor(Math.random() * 9);
    const availableHours = Math.max(0, totalHours - allocatedHours);
    
    days.push({
      date,
      dayName,
      totalHours,
      allocatedHours,
      availableHours,
      isWeekend
    });
  }
  return days;
};

export function WeeklyCapacityCalendar({ 
  employees, 
  onEmployeeSelect,
  className = '' 
}: WeeklyCapacityCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start

  const goToPreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Weekly Capacity View</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToCurrentWeek}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-3">
              {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {employees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No employees to display</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header Row */}
            <div className="grid grid-cols-8 gap-2 pb-2 border-b border-gray-200 text-sm font-medium text-gray-600">
              <div className="flex items-center">
                Employee
              </div>
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="text-center">
                  <div>{format(day, 'EEE')}</div>
                  <div className="text-xs text-gray-400">{format(day, 'd')}</div>
                </div>
              ))}
            </div>

            {/* Employee Rows */}
            {employees.slice(0, 10).map((employee) => { // Limit to first 10 employees for demo
              const weekData = generateWeeklyData(employee, currentWeek);
              const weekTotal = weekData.reduce((sum, day) => sum + day.availableHours, 0);
              
              return (
                <div 
                  key={employee.id} 
                  className="grid grid-cols-8 gap-2 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onEmployeeSelect?.(employee)}
                >
                  {/* Employee Info */}
                  <div className="flex flex-col space-y-1 pr-2">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div className="flex items-center space-x-1">
                      {employee.capacity ? (
                        <StatusBadge status={employee.capacity.availabilityStatus} />
                      ) : (
                        <StatusBadge status="available" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {weekTotal}h this week
                    </div>
                  </div>

                  {/* Daily Capacity */}
                  {weekData.map((day, dayIndex) => (
                    <div key={dayIndex} className="text-center">
                      {day.isWeekend ? (
                        <div className="text-gray-300 text-xs">-</div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-xs text-gray-600">
                            {day.availableHours}h
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className={`h-1 rounded-full ${
                                day.availableHours === 0 ? 'bg-red-400' :
                                day.availableHours < 3 ? 'bg-yellow-400' :
                                'bg-green-400'
                              }`}
                              style={{ 
                                width: day.totalHours > 0 
                                  ? `${(day.availableHours / day.totalHours) * 100}%` 
                                  : '0%' 
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Summary Row */}
            <div className="grid grid-cols-8 gap-2 pt-3 border-t border-gray-200 bg-gray-50 rounded-lg p-2">
              <div className="font-medium text-sm text-gray-700">
                Team Total
              </div>
              {weekDays.map((day, dayIndex) => {
                const isWeekend = dayIndex === 5 || dayIndex === 6;
                const totalAvailable = employees
                  .slice(0, 10)
                  .reduce((sum, employee) => {
                    const dayData = generateWeeklyData(employee, currentWeek)[dayIndex];
                    return sum + dayData.availableHours;
                  }, 0);

                return (
                  <div key={dayIndex} className="text-center">
                    {isWeekend ? (
                      <div className="text-gray-400 text-xs">Weekend</div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-700">
                          {totalAvailable}h
                        </div>
                        <div className="text-xs text-gray-500">
                          {employees.slice(0, 10).length} people
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-gray-200 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Available (3+ hours)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span>Limited (1-2 hours)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span>No availability</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
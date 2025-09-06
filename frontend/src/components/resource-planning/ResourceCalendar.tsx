import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, AlertTriangle } from 'lucide-react';

interface Assignment {
  id: number;
  employeeId: number;
  employeeName: string;
  projectId: number;
  projectName: string;
  startDate: string;
  endDate: string;
  allocatedHours: number;
  role: string;
  hasConflict?: boolean;
}

interface ResourceCalendarProps {
  assignments: Assignment[];
  onAssignmentChange?: (assignmentId: number, newStartDate: string, newEndDate: string) => void;
  editable?: boolean;
  showConflicts?: boolean;
}

interface TimelineBarProps {
  assignment: Assignment;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  onDragStart?: (assignmentId: number) => void;
  onDragEnd?: (assignmentId: number, newDates: { start: string; end: string }) => void;
  editable?: boolean;
}

const TimelineBar: React.FC<TimelineBarProps> = ({
  assignment,
  startDate,
  endDate,
  totalDays,
  onDragStart,
  onDragEnd,
  editable = false
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const assignmentStart = new Date(assignment.startDate);
  const assignmentEnd = new Date(assignment.endDate);
  
  // Calculate position and width as percentages
  const startOffset = Math.max(0, (assignmentStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const duration = (assignmentEnd.getTime() - assignmentStart.getTime()) / (1000 * 60 * 60 * 24);
  
  const left = (startOffset / totalDays) * 100;
  const width = (duration / totalDays) * 100;

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!editable) return;
    setIsDragging(true);
    onDragStart?.(assignment.id);
    e.dataTransfer.setData('assignmentId', assignment.id.toString());
  }, [assignment.id, editable, onDragStart]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (!editable) return;
    setIsDragging(false);
    // In a real implementation, you'd calculate new dates based on drop position
    onDragEnd?.(assignment.id, {
      start: assignment.startDate,
      end: assignment.endDate
    });
  }, [assignment.id, assignment.startDate, assignment.endDate, editable, onDragEnd]);

  const barClasses = `
    absolute rounded px-2 py-1 text-xs font-medium cursor-pointer transition-all duration-200
    ${assignment.hasConflict ? 'bg-red-500 text-white border-red-600' : 'bg-blue-500 text-white border-blue-600'}
    ${isDragging ? 'opacity-75 z-10' : ''}
    ${editable ? 'hover:shadow-md hover:scale-105' : ''}
    border
  `;

  return (
    <div
      data-testid={assignment.hasConflict ? `conflict-assignment-${assignment.id}` : `timeline-bar`}
      className={barClasses}
      style={{
        left: `${left}%`,
        width: `${Math.max(width, 2)}%`, // Minimum 2% width for visibility
        height: '28px',
        top: '2px'
      }}
      draggable={editable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={`${assignment.projectName} - ${assignment.role} (${assignment.allocatedHours}h)`}
    >
      <div className="flex items-center space-x-1 truncate">
        {assignment.hasConflict && <AlertTriangle size={12} />}
        <span className="truncate">{assignment.projectName}</span>
      </div>
    </div>
  );
};

export const ResourceCalendar: React.FC<ResourceCalendarProps> = ({
  assignments,
  onAssignmentChange,
  editable = false,
  showConflicts = true
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'month' | 'quarter' | 'year'>('month');

  // Calculate date range based on view type
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (viewType) {
      case 'month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        break;
      case 'quarter':
        start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
        end.setMonth(start.getMonth() + 3);
        end.setDate(0);
        break;
      case 'year':
        start.setMonth(0, 1);
        end.setFullYear(end.getFullYear() + 1, 0, 0);
        break;
    }

    return { start, end };
  }, [currentDate, viewType]);

  // Generate date headers
  const dateHeaders = useMemo(() => {
    const headers = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      headers.push(new Date(current));
      current.setDate(current.getDate() + (viewType === 'month' ? 1 : viewType === 'quarter' ? 7 : 30));
    }
    
    return headers;
  }, [dateRange, viewType]);

  const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);

  // Group assignments by employee
  const employeeAssignments = useMemo(() => {
    const grouped = new Map<number, { employee: string; assignments: Assignment[] }>();
    
    assignments.forEach(assignment => {
      if (!grouped.has(assignment.employeeId)) {
        grouped.set(assignment.employeeId, {
          employee: assignment.employeeName,
          assignments: []
        });
      }
      grouped.get(assignment.employeeId)!.assignments.push(assignment);
    });

    return Array.from(grouped.values()).sort((a, b) => a.employee.localeCompare(b.employee));
  }, [assignments]);

  // Filter assignments that are visible in current date range
  const visibleAssignments = useMemo(() => {
    return assignments.filter(assignment => {
      const start = new Date(assignment.startDate);
      const end = new Date(assignment.endDate);
      return !(end < dateRange.start || start > dateRange.end);
    });
  }, [assignments, dateRange]);

  const handleDragStart = useCallback((assignmentId: number) => {
    console.log('Drag started for assignment:', assignmentId);
  }, []);

  const handleDragEnd = useCallback((assignmentId: number, newDates: { start: string; end: string }) => {
    console.log('Drag ended for assignment:', assignmentId, newDates);
    onAssignmentChange?.(assignmentId, newDates.start, newDates.end);
  }, [onAssignmentChange]);

  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (viewType) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'quarter':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 3 : -3));
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  }, [currentDate, viewType]);

  const formatDateHeader = (date: Date) => {
    switch (viewType) {
      case 'month':
        return date.getDate().toString();
      case 'quarter':
        return `${date.getMonth() + 1}/${date.getDate()}`;
      case 'year':
        return date.toLocaleDateString('en', { month: 'short' });
    }
  };

  const conflictCount = visibleAssignments.filter(a => a.hasConflict).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Resource Calendar</h3>
            {showConflicts && conflictCount > 0 && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 rounded-full">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View Type Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['month', 'quarter', 'year'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setViewType(type)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    viewType === type
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Navigation */}
            <button
              onClick={() => navigateDate('prev')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="min-w-[120px] text-center font-medium text-gray-900">
              {currentDate.toLocaleDateString('en', { 
                month: 'long', 
                year: 'numeric',
                ...(viewType === 'quarter' && { month: 'short' })
              })}
            </div>
            
            <button
              onClick={() => navigateDate('next')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Date Headers */}
          <div className="bg-gray-50 border-b grid" style={{ gridTemplateColumns: '200px 1fr' }}>
            <div className="p-3 font-medium text-gray-700 border-r">Employee</div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${dateHeaders.length}, 1fr)` }}>
              {dateHeaders.map((date, index) => (
                <div key={index} className="p-2 text-center text-sm font-medium text-gray-600 border-r last:border-r-0">
                  {formatDateHeader(date)}
                </div>
              ))}
            </div>
          </div>

          {/* Employee Rows */}
          {employeeAssignments.map(({ employee, assignments: empAssignments }) => (
            <div key={employee} className="border-b last:border-b-0 grid" style={{ gridTemplateColumns: '200px 1fr' }}>
              {/* Employee Name */}
              <div className="p-3 border-r bg-gray-50 flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900 truncate">{employee}</span>
              </div>
              
              {/* Timeline */}
              <div className="relative" style={{ height: '60px' }}>
                {/* Grid Lines */}
                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${dateHeaders.length}, 1fr)` }}>
                  {dateHeaders.map((_, index) => (
                    <div key={index} className="border-r last:border-r-0 h-full" />
                  ))}
                </div>
                
                {/* Assignment Bars */}
                {empAssignments.map(assignment => (
                  <TimelineBar
                    key={assignment.id}
                    assignment={assignment}
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                    totalDays={totalDays}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    editable={editable}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">Assigned</span>
            </div>
            {showConflicts && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-600">Conflict</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>
              {visibleAssignments.reduce((total, a) => total + a.allocatedHours, 0).toLocaleString()} 
              total hours allocated
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceCalendar;
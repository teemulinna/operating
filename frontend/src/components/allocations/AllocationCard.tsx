import React from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon, 
  BriefcaseIcon, 
  EditIcon, 
  TrashIcon,
  AlertTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Allocation } from '@/types/allocation';
import { ALLOCATION_STATUS_COLORS } from '@/types/allocation';

interface AllocationCardProps {
  allocation: Allocation;
  onClick?: (allocation: Allocation) => void;
  onEdit?: (allocation: Allocation) => void;
  onDelete?: (allocation: Allocation) => void;
  showEmployee?: boolean;
  showProject?: boolean;
  compact?: boolean;
  className?: string;
}

export function AllocationCard({ 
  allocation,
  onClick,
  onEdit,
  onDelete,
  showEmployee = true,
  showProject = true,
  compact = false,
  className = ""
}: AllocationCardProps) {
  const startDate = parseISO(allocation.startDate);
  const endDate = parseISO(allocation.endDate);
  const today = new Date();
  
  // Calculate progress
  const totalDays = differenceInDays(endDate, startDate) + 1;
  const elapsedDays = Math.max(0, differenceInDays(today, startDate) + 1);
  const progressPercentage = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  // Determine status indicators
  const isOverdue = allocation.isOverdue;
  const isUpcoming = allocation.isUpcoming;
  const isActive = allocation.status === 'active';
  const isCompleted = allocation.status === 'completed';

  const statusColor = ALLOCATION_STATUS_COLORS[allocation.status] || 'bg-gray-100 text-gray-800';

  const handleCardClick = () => {
    onClick?.(allocation);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(allocation);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(allocation);
  };

  if (compact) {
    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${className}`}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header with status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isOverdue && <AlertTriangleIcon className="h-4 w-4 text-red-500" />}
                {isCompleted && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
                <Badge className={statusColor}>
                  {allocation.status}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="h-8 w-8 p-0"
                  title="Edit allocation"
                >
                  <EditIcon className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                  title="Delete allocation"
                >
                  <TrashIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Employee and Project */}
            {showEmployee && allocation.employeeName && (
              <div className="flex items-center text-sm text-gray-600">
                <UserIcon className="h-4 w-4 mr-1" />
                <span className="truncate">{allocation.employeeName}</span>
              </div>
            )}

            {showProject && allocation.projectName && (
              <div className="flex items-center text-sm text-gray-600">
                <BriefcaseIcon className="h-4 w-4 mr-1" />
                <span className="truncate">{allocation.projectName}</span>
                {allocation.clientName && (
                  <span className="text-xs text-gray-500 ml-1">
                    ({allocation.clientName})
                  </span>
                )}
              </div>
            )}

            {/* Hours and dates */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600">
                <ClockIcon className="h-4 w-4 mr-1" />
                <span>{allocation.allocatedHours}h/week</span>
              </div>
              
              <div className="text-xs text-gray-500">
                {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}
              </div>
            </div>

            {/* Progress bar for active allocations */}
            {isActive && !isUpcoming && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progress</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className={`h-2 ${isOverdue ? 'bg-red-100' : ''}`}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${className}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            {isOverdue && <AlertTriangleIcon className="h-5 w-5 text-red-500 mr-2" />}
            {isCompleted && <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />}
            <span className="truncate">
              {showProject && allocation.projectName ? allocation.projectName : 'Allocation'}
            </span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Badge className={statusColor}>
              {allocation.status}
            </Badge>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                title="Edit allocation"
              >
                <EditIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-800"
                title="Delete allocation"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Client name if available */}
        {allocation.clientName && (
          <div className="text-sm text-gray-600">
            Client: {allocation.clientName}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Employee and Project Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {showEmployee && allocation.employeeName && (
            <div className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-sm font-medium">Employee</div>
                <div className="text-sm text-gray-600">{allocation.employeeName}</div>
              </div>
            </div>
          )}

          {showProject && allocation.projectName && (
            <div className="flex items-center space-x-2">
              <BriefcaseIcon className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-sm font-medium">Project</div>
                <div className="text-sm text-gray-600 truncate">
                  {allocation.projectName}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Role if specified */}
        {allocation.role && (
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
            </div>
            <div>
              <div className="text-sm font-medium">Role</div>
              <div className="text-sm text-gray-600">{allocation.role}</div>
            </div>
          </div>
        )}

        {/* Time Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-5 w-5 text-gray-500" />
            <div>
              <div className="text-sm font-medium">Hours/Week</div>
              <div className="text-sm text-gray-600">{allocation.allocatedHours}h</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-500" />
            <div>
              <div className="text-sm font-medium">Duration</div>
              <div className="text-sm text-gray-600">{allocation.duration} days</div>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500">Start Date</div>
              <div className="text-sm font-semibold">
                {format(startDate, 'MMM d, yyyy')}
              </div>
            </div>
            
            <div className="text-gray-300">→</div>
            
            <div className="text-right">
              <div className="text-xs font-medium text-gray-500">End Date</div>
              <div className="text-sm font-semibold">
                {format(endDate, 'MMM d, yyyy')}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Indicator for Active Allocations */}
        {isActive && !isUpcoming && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-600">
                {Math.round(progressPercentage)}% complete
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className={`h-3 ${isOverdue ? 'bg-red-100' : ''}`}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {elapsedDays} of {totalDays} days
              </span>
              {isOverdue && (
                <span className="text-red-600 font-medium">
                  Overdue
                </span>
              )}
            </div>
          </div>
        )}

        {/* Upcoming indicator */}
        {isUpcoming && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-800">
                Starts {format(startDate, 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        )}

        {/* Notes */}
        {allocation.notes && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-xs font-medium text-yellow-800 mb-1">Notes</div>
            <div className="text-sm text-yellow-700">{allocation.notes}</div>
          </div>
        )}

        {/* Total hours calculation */}
        {allocation.totalHours && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-700">Total Hours</span>
              <span className="font-semibold">{allocation.totalHours}h</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
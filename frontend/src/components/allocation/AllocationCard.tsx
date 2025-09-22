import React, { useState, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { 
  Calendar, 
  Clock, 
  User, 
  AlertTriangle, 
  X, 
  Edit2,
  MoreVertical,
  Copy,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { 
  DragDropAllocation, 
  AllocationConflict 
} from '../../types/allocation';
import { Project } from '../../types/api';

interface AllocationCardProps {
  allocation: DragDropAllocation;
  project?: Project;
  conflicts?: AllocationConflict[];
  isSelected?: boolean;
  isDragging?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  readOnly?: boolean;
  className?: string;
}

export const AllocationCard: React.FC<AllocationCardProps> = ({
  allocation,
  project,
  conflicts = [],
  isSelected = false,
  isDragging = false,
  onClick,
  onDelete,
  onEdit,
  onDuplicate,
  readOnly = false,
  className,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingFromHook,
  } = useDraggable({
    id: allocation.id.toString(),
    data: {
      type: 'allocation',
      allocation,
    },
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  // Calculate duration and dates
  const startDate = allocation.startDate ? parseISO(allocation.startDate) : null;
  const endDate = allocation.endDate ? parseISO(allocation.endDate) : null;
  
  const duration = startDate && endDate && isValid(startDate) && isValid(endDate) 
    ? differenceInDays(endDate, startDate) + 1 
    : allocation.duration || 1;

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100';
      case 'pending': return 'text-yellow-700 bg-yellow-100';
      case 'completed': return 'text-blue-700 bg-blue-100';
      case 'inactive': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  // Handle card click
  const handleCardClick = useCallback((event: React.MouseEvent) => {
    if (event.defaultPrevented) return;
    onClick?.(event);
  }, [onClick]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    onDelete?.();
    setShowDeleteDialog(false);
  }, [onDelete]);

  // Handle edit
  const handleEdit = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onEdit?.();
  }, [onEdit]);

  // Handle duplicate
  const handleDuplicate = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onDuplicate?.();
  }, [onDuplicate]);

  // Handle delete click
  const handleDeleteClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setShowDeleteDialog(true);
  }, []);

  const hasConflicts = conflicts.length > 0;
  const hasErrors = conflicts.some(c => c.severity === 'error');
  const hasWarnings = conflicts.some(c => c.severity === 'warning');

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          'relative p-3 cursor-move transition-all duration-200 group',
          'hover:shadow-md hover:-translate-y-0.5',
          isSelected && 'ring-2 ring-primary ring-opacity-50 bg-primary/5',
          isDragging && 'opacity-50 rotate-3 shadow-lg z-50',
          isDraggingFromHook && 'cursor-grabbing',
          hasErrors && 'border-red-200 bg-red-50/50',
          hasWarnings && !hasErrors && 'border-yellow-200 bg-yellow-50/50',
          readOnly && 'cursor-default',
          className
        )}
        onClick={handleCardClick}
      >
        {/* Priority indicator */}
        <div 
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1 rounded-l',
            getPriorityColor(project?.priority || 'medium')
          )}
        />

        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">
              {project?.name || 'Unknown Project'}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {project?.clientName || 'No client'}
            </p>
          </div>

          <div className="flex items-center space-x-1 ml-2">
            {/* Status badge */}
            <Badge
              variant="outline"
              className={cn('text-xs px-2 py-0.5', getStatusColor(allocation.status))}
            >
              {allocation.status}
            </Badge>

            {/* Conflicts indicator */}
            {hasConflicts && (
              <div className="relative">
                <AlertTriangle
                  className={cn(
                    'h-4 w-4',
                    hasErrors ? 'text-red-500' : 'text-yellow-500'
                  )}
                />
                <div className={cn(
                  'absolute -top-1 -right-1 h-2 w-2 rounded-full',
                  hasErrors ? 'bg-red-500' : 'bg-yellow-500'
                )} />
              </div>
            )}

            {/* Actions menu */}
            {!readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  {onEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit2 className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <Copy className="h-3 w-3 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {(onEdit || onDuplicate) && onDelete && <DropdownMenuSeparator />}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={handleDeleteClick}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2">
          {/* Hours and duration */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>{allocation.hours}h</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>{duration} day{duration !== 1 ? 's' : ''}</span>
              </div>
            </div>
            
            {allocation.billableRate && (
              <div className="text-xs text-muted-foreground">
                ${allocation.billableRate}/h
              </div>
            )}
          </div>

          {/* Dates */}
          {startDate && endDate && isValid(startDate) && isValid(endDate) && (
            <div className="text-xs text-muted-foreground">
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </div>
          )}

          {/* Notes */}
          {allocation.notes && (
            <div className="text-xs text-muted-foreground truncate" title={allocation.notes}>
              {allocation.notes}
            </div>
          )}
        </div>

        {/* Conflicts details */}
        {hasConflicts && (
          <div className="mt-2 pt-2 border-t border-border space-y-1">
            {conflicts.slice(0, 2).map(conflict => (
              <div key={conflict.id} className="text-xs flex items-center space-x-1">
                <AlertTriangle 
                  className={cn(
                    'h-3 w-3',
                    conflict.severity === 'error' ? 'text-red-500' : 'text-yellow-500'
                  )} 
                />
                <span className="truncate" title={conflict.message}>
                  {conflict.message}
                </span>
              </div>
            ))}
            {conflicts.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{conflicts.length - 2} more conflicts
              </div>
            )}
          </div>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute -inset-0.5 bg-primary/20 rounded-lg pointer-events-none" />
        )}
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Allocation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this allocation for "{project?.name || 'Unknown Project'}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AllocationCard;"
import React, { useCallback, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '../../lib/utils';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import {
  AlertTriangle,
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { AllocationCard } from './AllocationCard';
import { format } from 'date-fns';
import {
  AllocationConflict,
  DragDropAllocation,
} from '../../types/allocation';
import { Project, Employee } from '../../types/api';

// TimeSlot interface for timeline grid
export interface TimeSlot {
  date: Date;
  isWeekend: boolean;
  isToday: boolean;
}

// ResourceLane interface matching the expected structure
export interface ResourceLaneType {
  id: string;
  employeeId: string;
  employee: Employee;
  capacity: number;
  utilization: number;
  allocations: DragDropAllocation[];
}

interface ResourceLaneProps {
  lane: ResourceLaneType;
  projects: Project[];
  conflicts: AllocationConflict[];
  selectedAllocations: Set<string>;
  onAllocationSelect: (allocationIds: string[], mode?: 'single' | 'multiple') => void;
  onAllocationDelete: (allocationId: string) => void;
  onAllocationCreate: (
    employeeId: string,
    projectId: string,
    startDate: string,
    endDate: string,
    hours: number
  ) => void;
  readOnly?: boolean;
}

export const ResourceLane: React.FC<ResourceLaneProps> = ({
  lane,
  projects,
  conflicts,
  selectedAllocations,
  onAllocationSelect,
  onAllocationDelete,
  onAllocationCreate,
  readOnly = false,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `lane-${lane.id}`,
    data: {
      type: 'lane',
      employeeId: lane.id,
    },
  });

  // Calculate utilization metrics
  const utilizationMetrics = useMemo(() => {
    const utilizationRate = (lane.utilization / lane.capacity) * 100;
    const isOverAllocated = lane.utilization > lane.capacity;
    const availableHours = Math.max(0, lane.capacity - lane.utilization);

    return {
      utilizationRate,
      isOverAllocated,
      availableHours,
      status:
        isOverAllocated ? 'overallocated' :
        utilizationRate > 90 ? 'critical' :
        utilizationRate > 75 ? 'high' : 'normal'
    };
  }, [lane.utilization, lane.capacity]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overallocated': return 'text-red-600 bg-red-100';
      case 'critical': return 'text-orange-600 bg-orange-100';
      case 'high': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  // Handle allocation selection
  const handleAllocationClick = useCallback((allocation: DragDropAllocation, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.metaKey || event.ctrlKey) {
      // Multi-select mode
      const currentSelection = Array.from(selectedAllocations);
      const isSelected = selectedAllocations.has(allocation.id);

      if (isSelected) {
        onAllocationSelect(currentSelection.filter(id => id !== allocation.id), 'multiple');
      } else {
        onAllocationSelect([...currentSelection, allocation.id], 'multiple');
      }
    } else {
      // Single select mode
      onAllocationSelect([allocation.id], 'single');
    }
  }, [selectedAllocations, onAllocationSelect]);

  // Handle quick allocation creation
  const handleQuickCreate = useCallback(() => {
    if (readOnly) return;

    // For now, create a default allocation - in a real app this would open a modal
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Use the first available project as default
    const defaultProject = projects[0];
    if (defaultProject) {
      onAllocationCreate(
        lane.id,
        defaultProject.id,
        format(today, 'yyyy-MM-dd'),
        format(tomorrow, 'yyyy-MM-dd'),
        8 // Default 8 hours
      );
    }
  }, [lane.id, projects, onAllocationCreate, readOnly]);

  // Sort allocations by start date
  const sortedAllocations = useMemo(() => {
    return [...lane.allocations].sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }, [lane.allocations]);

  // Get employee display name
  const employeeName = `${lane.employee.firstName} ${lane.employee.lastName}`;

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'p-4 transition-all duration-200',
        isOver && 'ring-2 ring-primary ring-opacity-50 bg-primary/5',
        conflicts.length > 0 && 'border-orange-200 bg-orange-50/50'
      )}
    >
      {/* Employee header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`/avatars/${lane.employee.id}.png`} />
            <AvatarFallback>
              {lane.employee.firstName?.[0]}{lane.employee.lastName?.[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h3 className="font-semibold text-sm">{employeeName}</h3>
            <p className="text-xs text-muted-foreground">
              {lane.employee.role} • {lane.employee.department}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Capacity indicator */}
          <div className="text-right">
            <div className="text-xs font-medium">
              {lane.utilization}h / {lane.capacity}h
            </div>
            <div className="text-xs text-muted-foreground">
              {utilizationMetrics.availableHours}h available
            </div>
          </div>

          {/* Status badge */}
          <Badge
            variant="outline"
            className={cn('text-xs', getStatusColor(utilizationMetrics.status))}
          >
            {Math.round(utilizationMetrics.utilizationRate)}%
          </Badge>
        </div>
      </div>

      {/* Capacity progress bar */}
      <div className="mb-4">
        <Progress
          value={utilizationMetrics.utilizationRate}
          className="h-2"
          indicatorClassName={cn(
            utilizationMetrics.isOverAllocated ? 'bg-red-500' :
            utilizationMetrics.status === 'critical' ? 'bg-orange-500' :
            utilizationMetrics.status === 'high' ? 'bg-yellow-500' : 'bg-green-500'
          )}
        />
      </div>

      {/* Skills */}
      {lane.employee.skills && lane.employee.skills.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {lane.employee.skills.slice(0, 5).map(skill => (
              <Badge key={skill} variant="secondary" className="text-xs px-2 py-1">
                {skill}
              </Badge>
            ))}
            {lane.employee.skills.length > 5 && (
              <Badge variant="outline" className="text-xs px-2 py-1">
                +{lane.employee.skills.length - 5} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="mb-4 space-y-1">
          {conflicts.map(conflict => (
            <div
              key={conflict.id}
              className={cn(
                'text-xs p-2 rounded flex items-center space-x-1',
                conflict.severity === 'critical' || conflict.severity === 'high'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>{conflict.message || conflict.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Allocations */}
      <div className="space-y-2">
        {sortedAllocations.length > 0 ? (
          <div className="space-y-2">
            {sortedAllocations.map(allocation => {
              const project = projects.find(p => p.id === allocation.projectId);
              const allocationConflicts = conflicts.filter(c =>
                c.affectedAllocations.includes(allocation.id)
              );

              return (
                <AllocationCard
                  key={allocation.id}
                  allocation={allocation}
                  project={project}
                  conflicts={allocationConflicts}
                  isSelected={selectedAllocations.has(allocation.id)}
                  onClick={(e) => handleAllocationClick(allocation, e)}
                  onDelete={() => onAllocationDelete(allocation.id)}
                  readOnly={readOnly}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No allocations</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      {!readOnly && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {utilizationMetrics.isOverAllocated && (
                <div className="flex items-center space-x-1 text-red-600">
                  <TrendingDown className="h-3 w-3" />
                  <span>Over-allocated</span>
                </div>
              )}
              {!utilizationMetrics.isOverAllocated && utilizationMetrics.availableHours > 0 && (
                <div className="flex items-center space-x-1 text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>{utilizationMetrics.availableHours}h available</span>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickCreate}
              className="h-8 px-3 text-xs"
              disabled={projects.length === 0}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Allocation
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ResourceLane;

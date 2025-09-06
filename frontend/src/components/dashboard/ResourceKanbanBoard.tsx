import React, { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { LoadingSkeletons } from '../ui/LoadingSkeletons';
import { Employee, CapacityData } from '../../hooks/useResourceData';
import { UsersIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface ResourceKanbanBoardProps {
  employees: Employee[] | undefined;
  capacityData: CapacityData[];
  onAllocationUpdate: (employeeId: string, newUtilization: number) => void;
  className?: string;
}

interface UtilizationZone {
  id: string;
  title: string;
  description: string;
  minUtilization: number;
  maxUtilization: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface EmployeeWithUtilization extends Employee {
  utilizationRate: number;
  allocatedHours: number;
  availableHours: number;
}

const utilizationZones: UtilizationZone[] = [
  {
    id: 'available',
    title: 'Available',
    description: 'Resources with capacity for more work',
    minUtilization: 0,
    maxUtilization: 0.75,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: UsersIcon
  },
  {
    id: 'allocated',
    title: 'Allocated',
    description: 'Optimally utilized resources',
    minUtilization: 0.75,
    maxUtilization: 0.95,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: ClockIcon
  },
  {
    id: 'busy',
    title: 'Busy',
    description: 'Fully utilized resources',
    minUtilization: 0.95,
    maxUtilization: 1.1,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: ClockIcon
  },
  {
    id: 'over-allocated',
    title: 'Over-allocated',
    description: 'Resources exceeding capacity',
    minUtilization: 1.1,
    maxUtilization: Infinity,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: ExclamationTriangleIcon
  }
];

export const ResourceKanbanBoard: React.FC<ResourceKanbanBoardProps> = ({
  employees,
  capacityData,
  onAllocationUpdate,
  className = ''
}) => {
  const [draggedEmployee, setDraggedEmployee] = useState<string | null>(null);

  // Calculate utilization for each employee
  const employeesWithUtilization = useMemo(() => {
    if (!employees) return [];

    return employees.map(employee => {
      // Get the most recent capacity data for this employee
      const recentCapacity = capacityData
        .filter(cap => cap.employeeId === employee.id.toString())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      return {
        ...employee,
        utilizationRate: recentCapacity?.utilizationRate || 0,
        allocatedHours: recentCapacity?.allocatedHours || 0,
        availableHours: recentCapacity?.availableHours || 40
      };
    });
  }, [employees, capacityData]);

  // Group employees by utilization zones
  const employeesByZone = useMemo(() => {
    const zones: Record<string, EmployeeWithUtilization[]> = {};
    
    utilizationZones.forEach(zone => {
      zones[zone.id] = employeesWithUtilization.filter(emp =>
        emp.utilizationRate >= zone.minUtilization && emp.utilizationRate < zone.maxUtilization
      );
    });

    return zones;
  }, [employeesWithUtilization]);

  const handleDragStart = (result: any) => {
    setDraggedEmployee(result.draggableId);
  };

  const handleDragEnd = (result: DropResult) => {
    setDraggedEmployee(null);

    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    // Extract employee ID from draggableId (format: "employee-{id}")
    const employeeId = draggableId.replace('employee-', '');
    const targetZone = utilizationZones.find(zone => zone.id === destination.droppableId);
    
    if (targetZone) {
      // Calculate new utilization based on target zone
      const newUtilization = (targetZone.minUtilization + targetZone.maxUtilization) / 2;
      onAllocationUpdate(employeeId, Math.min(newUtilization, 1.5)); // Cap at 150%
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate < 0.5) return 'text-green-600';
    if (rate < 0.8) return 'text-blue-600';
    if (rate < 1.0) return 'text-yellow-600';
    if (rate < 1.2) return 'text-orange-600';
    return 'text-red-600';
  };

  const getUtilizationBadgeVariant = (rate: number): "default" | "secondary" | "destructive" | "outline" => {
    if (rate < 0.8) return 'default';
    if (rate < 1.0) return 'secondary';
    return 'destructive';
  };

  const EmployeeCard: React.FC<{ employee: EmployeeWithUtilization; index: number }> = ({ employee, index }) => (
    <Draggable draggableId={`employee-${employee.id}`} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'mb-3 cursor-move transition-all duration-200',
            snapshot.isDragging && 'shadow-lg scale-105 rotate-2',
            draggedEmployee === `employee-${employee.id}` && 'opacity-50'
          )}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">
                  {employee.firstName} {employee.lastName}
                </h4>
                <p className="text-sm text-gray-600">{employee.position}</p>
              </div>
              <Badge variant={getUtilizationBadgeVariant(employee.utilizationRate)}>
                {(employee.utilizationRate * 100).toFixed(1)}%
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Utilization</span>
                <span className={cn('font-medium', getUtilizationColor(employee.utilizationRate))}>
                  {employee.allocatedHours}h / {employee.availableHours}h
                </span>
              </div>
              
              <Progress 
                value={Math.min(employee.utilizationRate * 100, 100)} 
                className="h-2"
              />

              {employee.skills && employee.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {employee.skills.slice(0, 3).map(skill => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {employee.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{employee.skills.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );

  const ZoneColumn: React.FC<{ zone: UtilizationZone }> = ({ zone }) => {
    const zoneEmployees = employeesByZone[zone.id] || [];
    const Icon = zone.icon;

    return (
      <Card className={cn('h-full', zone.bgColor, zone.borderColor, 'border-2')}>
        <CardHeader className="pb-4">
          <CardTitle className={cn('flex items-center gap-2', zone.color)}>
            <Icon className="h-5 w-5" />
            {zone.title}
            <Badge variant="secondary" className="ml-auto">
              {zoneEmployees.length}
            </Badge>
          </CardTitle>
          <p className="text-sm text-gray-600">{zone.description}</p>
        </CardHeader>

        <Droppable droppableId={zone.id}>
          {(provided, snapshot) => (
            <CardContent
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                'flex-1 min-h-[400px] p-4 pt-0',
                snapshot.isDraggingOver && 'bg-opacity-50'
              )}
            >
              {zoneEmployees.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No employees in this zone</p>
                </div>
              ) : (
                zoneEmployees.map((employee, index) => (
                  <EmployeeCard key={employee.id} employee={employee} index={index} />
                ))
              )}
              {provided.placeholder}
            </CardContent>
          )}
        </Droppable>
      </Card>
    );
  };

  if (!employees) {
    return <LoadingSkeletons.ResourceCard count={4} data-testid="loading-skeleton" />;
  }

  if (employees.length === 0) {
    return (
      <Card className="p-8 text-center">
        <UsersIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No employees to display</h3>
        <p className="text-gray-600">Add employees to see their resource allocation status.</p>
      </Card>
    );
  }

  return (
    <div 
      className={cn('resource-kanban-board', className)}
      role="region"
      aria-label="Resource allocation kanban board"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Resource Allocation Board</h2>
        <p className="text-gray-600">
          Drag and drop employees between utilization zones to optimize resource allocation.
        </p>
      </div>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {utilizationZones.map(zone => (
            <ZoneColumn key={zone.id} zone={zone} />
          ))}
        </div>
      </DragDropContext>

      {/* Legend */}
      <Card className="mt-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">Utilization Ranges:</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            {utilizationZones.map(zone => (
              <div key={zone.id} className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-full', zone.bgColor, zone.borderColor, 'border')} />
                <span className="text-sm text-gray-600">
                  {zone.title}: {Math.round(zone.minUtilization * 100)}-
                  {zone.maxUtilization === Infinity ? '∞' : Math.round(zone.maxUtilization * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
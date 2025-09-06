import React, { useState, useMemo, useCallback } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  UserIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ArrowsUpDownIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  skills: string[];
  currentUtilization: number;
  maxCapacity: number;
  status: 'available' | 'busy' | 'overloaded' | 'offline';
  projects: string[];
}

interface Project {
  id: string;
  name: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  requiredSkills: string[];
  estimatedHours: number;
  assignedHours: number;
  team: string[];
}

interface Assignment {
  id: string;
  employeeId: string;
  projectId: string;
  allocation: number; // percentage
  startDate: string;
  endDate: string;
  role: string;
}

interface EnhancedResourcePlannerProps {
  employees: Employee[];
  projects: Project[];
  assignments: Assignment[];
  onAssignmentChange: (assignments: Assignment[]) => void;
  onEmployeeUpdate?: (employee: Employee) => void;
  onProjectUpdate?: (project: Project) => void;
}

const DraggableEmployee: React.FC<{
  employee: Employee;
  assignments: Assignment[];
  onRemoveAssignment?: (assignmentId: string) => void;
}> = ({ employee, assignments, onRemoveAssignment }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: employee.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusColors = {
    available: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    busy: 'bg-blue-100 text-blue-800 border-blue-200',
    overloaded: 'bg-red-100 text-red-800 border-red-200',
    offline: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const utilizationColor = employee.currentUtilization > 100 ? 'bg-red-500' : 
                          employee.currentUtilization > 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      whileHover={{ scale: isDragging ? 1 : 1.02 }}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "z-50"
      )}
    >
      <Card variant="interactive" className="w-72">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {employee.avatar ? (
                <img src={employee.avatar} alt={employee.name} className="rounded-full" />
              ) : (
                <UserIcon className="h-6 w-6 text-gray-400" />
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{employee.name}</h4>
              <p className="text-sm text-gray-600 truncate">{employee.role}</p>
            </div>
            <Badge className={statusColors[employee.status]}>
              {employee.status}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Utilization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Utilization</span>
              <span className="font-medium">{employee.currentUtilization}%</span>
            </div>
            <Progress 
              value={employee.currentUtilization} 
              className="h-2"
              color={utilizationColor}
            />
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Skills</p>
            <div className="flex flex-wrap gap-1">
              {employee.skills.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {employee.skills.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{employee.skills.length - 3}
                </Badge>
              )}
            </div>
          </div>

          {/* Current Assignments */}
          {assignments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Current Assignments</p>
              <div className="space-y-2 max-h-24 overflow-y-auto scrollbar-thin">
                {assignments.map((assignment) => (
                  <div 
                    key={assignment.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        Project {assignment.projectId}
                      </p>
                      <p className="text-xs text-gray-600">{assignment.allocation}% allocation</p>
                    </div>
                    {onRemoveAssignment && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => onRemoveAssignment(assignment.id)}
                        className="flex-shrink-0"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ProjectDropZone: React.FC<{
  project: Project;
  assignedEmployees: Employee[];
  assignments: Assignment[];
  onAssignmentUpdate?: (projectId: string, employeeId: string, allocation: number) => void;
}> = ({ project, assignedEmployees, assignments, onAssignmentUpdate }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: project.id,
  });

  const priorityColors = {
    low: 'border-l-gray-400 bg-gray-50',
    medium: 'border-l-blue-400 bg-blue-50',
    high: 'border-l-amber-400 bg-amber-50',
    critical: 'border-l-red-400 bg-red-50'
  };

  const statusIcons = {
    planning: CalendarDaysIcon,
    active: CheckCircleIcon,
    completed: CheckCircleIcon,
    'on-hold': ExclamationTriangleIcon
  };

  const StatusIcon = statusIcons[project.status];
  const totalAssigned = assignments.reduce((sum, a) => sum + a.allocation, 0);
  const isOverCapacity = totalAssigned > 100;

  return (
    <motion.div
      ref={setNodeRef}
      className={cn(
        "min-h-96 border-2 border-dashed rounded-2xl transition-all duration-200",
        isOver ? "border-blue-400 bg-blue-50" : "border-gray-300",
        priorityColors[project.priority]
      )}
      whileHover={{ scale: 1.01 }}
    >
      <Card variant="outline" className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className="h-5 w-5 text-gray-600" />
              <div>
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={project.priority === 'critical' ? 'destructive' : 'secondary'}
                  >
                    {project.priority}
                  </Badge>
                  <Badge variant="outline">{project.status}</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Project Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Deadline</p>
              <p className="font-medium">{new Date(project.deadline).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Estimated Hours</p>
              <p className="font-medium">{project.estimatedHours}h</p>
            </div>
          </div>

          {/* Required Skills */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Required Skills</p>
            <div className="flex flex-wrap gap-1">
              {project.requiredSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Team Allocation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Team Allocation</p>
              <div className={cn(
                "text-sm font-medium",
                isOverCapacity ? "text-red-600" : "text-gray-900"
              )}>
                {totalAssigned}%
                {isOverCapacity && (
                  <ExclamationTriangleIcon className="inline h-4 w-4 ml-1" />
                )}
              </div>
            </div>

            <Progress 
              value={Math.min(totalAssigned, 100)} 
              className="h-2"
              color={isOverCapacity ? "bg-red-500" : "bg-blue-500"}
            />

            {/* Assigned Team Members */}
            <div className="space-y-2">
              <AnimatePresence>
                {assignedEmployees.map((employee) => {
                  const assignment = assignments.find(a => a.employeeId === employee.id);
                  if (!assignment) return null;

                  return (
                    <motion.div
                      key={employee.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <UserIcon className="h-4 w-4" />
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{employee.name}</p>
                          <p className="text-xs text-gray-600">{assignment.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{assignment.allocation}%</p>
                        <p className="text-xs text-gray-600">allocation</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {assignedEmployees.length === 0 && !isOver && (
                <div className="text-center py-8 text-gray-500">
                  <ArrowsUpDownIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Drop employees here to assign</p>
                </div>
              )}

              {isOver && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50"
                >
                  <PlusIcon className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-blue-600 font-medium">Release to assign</p>
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const EnhancedResourcePlanner: React.FC<EnhancedResourcePlannerProps> = ({
  employees,
  projects,
  assignments,
  onAssignmentChange,
  onEmployeeUpdate,
  onProjectUpdate
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filteredEmployees, setFilteredEmployees] = useState(employees);

  const employeeAssignments = useMemo(() => {
    return employees.reduce((acc, employee) => {
      acc[employee.id] = assignments.filter(a => a.employeeId === employee.id);
      return acc;
    }, {} as Record<string, Assignment[]>);
  }, [employees, assignments]);

  const projectAssignments = useMemo(() => {
    return projects.reduce((acc, project) => {
      acc[project.id] = assignments.filter(a => a.projectId === project.id);
      return acc;
    }, {} as Record<string, Assignment[]>);
  }, [projects, assignments]);

  const handleDragStart = useCallback((event: any) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    // Check if dropping employee on project
    const employee = employees.find(e => e.id === active.id);
    const project = projects.find(p => p.id === over.id);

    if (employee && project) {
      // Create new assignment
      const newAssignment: Assignment = {
        id: `${employee.id}-${project.id}-${Date.now()}`,
        employeeId: employee.id,
        projectId: project.id,
        allocation: 25, // Default allocation
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        role: employee.role
      };

      const updatedAssignments = [...assignments, newAssignment];
      onAssignmentChange(updatedAssignments);
    }

    setActiveId(null);
  }, [employees, projects, assignments, onAssignmentChange]);

  const handleRemoveAssignment = useCallback((assignmentId: string) => {
    const updatedAssignments = assignments.filter(a => a.id !== assignmentId);
    onAssignmentChange(updatedAssignments);
  }, [assignments, onAssignmentChange]);

  const activeEmployee = activeId ? employees.find(e => e.id === activeId) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resource Planning</h1>
          <p className="text-gray-600 mt-1">
            Drag and drop employees to assign them to projects
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<ChartBarIcon className="h-4 w-4" />}>
            Analytics
          </Button>
          <Button leftIcon={<PlusIcon className="h-4 w-4" />}>
            New Assignment
          </Button>
        </div>
      </div>

      <DndContext 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
      >
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Available Employees */}
          <div className="xl:col-span-1">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Available Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-screen overflow-y-auto scrollbar-thin">
                  <SortableContext items={filteredEmployees.map(e => e.id)}>
                    {filteredEmployees.map((employee) => (
                      <DraggableEmployee
                        key={employee.id}
                        employee={employee}
                        assignments={employeeAssignments[employee.id] || []}
                        onRemoveAssignment={handleRemoveAssignment}
                      />
                    ))}
                  </SortableContext>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects Grid */}
          <div className="xl:col-span-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {projects.map((project) => {
                const assignedEmployeeIds = projectAssignments[project.id]?.map(a => a.employeeId) || [];
                const assignedEmployees = employees.filter(e => assignedEmployeeIds.includes(e.id));
                
                return (
                  <ProjectDropZone
                    key={project.id}
                    project={project}
                    assignedEmployees={assignedEmployees}
                    assignments={projectAssignments[project.id] || []}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeEmployee && (
            <DraggableEmployee
              employee={activeEmployee}
              assignments={employeeAssignments[activeEmployee.id] || []}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
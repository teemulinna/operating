import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Slider } from '../ui/slider';
import { toast } from '../ui/use-toast';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { PlusIcon, UserIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: number;
  position: string;
  skills: string[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  startDate: string;
  endDate: string;
  requiredSkills: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface Allocation {
  id: string;
  employeeId: string;
  projectId: string;
  allocatedHours: number;
  startDate: string;
  endDate: string;
}

interface ResourceAllocationMatrixProps {
  employees: Employee[];
  projects: Project[];
  allocations: Allocation[];
  onAllocationChange: () => void;
}

export const ResourceAllocationMatrix: React.FC<ResourceAllocationMatrixProps> = ({
  employees,
  projects,
  allocations,
  onAllocationChange
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [allocationHours, setAllocationHours] = useState<number[]>([20]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  
  // Create allocation matrix
  const allocationMatrix = useMemo(() => {
    return employees.map(employee => {
      const employeeAllocations = allocations.filter(a => a.employeeId === employee.id.toString());
      const employeeProjects = employeeAllocations.map(alloc => {
        const project = projects.find(p => p.id === alloc.projectId);
        return {
          ...alloc,
          project,
          skillMatch: project ? calculateSkillMatch(employee.skills, project.requiredSkills) : 0
        };
      });

      const totalAllocated = employeeAllocations.reduce((sum, a) => sum + a.allocatedHours, 0);
      const utilizationRate = totalAllocated / 40; // Assuming 40h work week

      return {
        employee,
        projects: employeeProjects,
        totalAllocated,
        utilizationRate,
        status: utilizationRate > 1 ? 'overallocated' : utilizationRate > 0.8 ? 'optimal' : 'underutilized'
      };
    });
  }, [employees, projects, allocations]);

  const filteredMatrix = useMemo(() => {
    switch (filter) {
      case 'overallocated':
        return allocationMatrix.filter(m => m.status === 'overallocated');
      case 'underutilized':
        return allocationMatrix.filter(m => m.status === 'underutilized');
      case 'available':
        return allocationMatrix.filter(m => m.utilizationRate < 0.9);
      default:
        return allocationMatrix;
    }
  }, [allocationMatrix, filter]);

  const calculateSkillMatch = (employeeSkills: string[], requiredSkills: string[]): number => {
    if (requiredSkills.length === 0) return 1;
    const matches = employeeSkills.filter(skill => requiredSkills.includes(skill));
    return matches.length / requiredSkills.length;
  };

  const handleCreateAllocation = async () => {
    if (!selectedEmployee || !selectedProject) {
      toast({
        title: "Error",
        description: "Please select both employee and project",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/allocations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          projectId: selectedProject,
          allocatedHours: allocationHours[0],
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Resource allocation created successfully"
        });
        setIsDialogOpen(false);
        setSelectedEmployee('');
        setSelectedProject('');
        setAllocationHours([20]);
        onAllocationChange();
      } else {
        throw new Error('Failed to create allocation');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create allocation",
        variant: "destructive"
      });
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // Handle project reassignment between employees
    if (source.droppableId !== destination.droppableId) {
      // Move project from one employee to another
      const projectId = result.draggableId;
      const newEmployeeId = destination.droppableId;
      
      // Update allocation in backend
      // This would be implemented with your API
      console.log(`Moving project ${projectId} to employee ${newEmployeeId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overallocated':
        return 'bg-red-100 text-red-800';
      case 'optimal':
        return 'bg-green-100 text-green-800';
      case 'underutilized':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Resource Allocation Matrix</h2>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="overallocated">Over-allocated</SelectItem>
              <SelectItem value="underutilized">Under-utilized</SelectItem>
              <SelectItem value="available">Available</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Allocation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Resource Allocation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Employee</label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.firstName} {emp.lastName} - {emp.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.filter(p => p.status === 'active' || p.status === 'planning').map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} ({project.priority} priority)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Allocated Hours per Week: {allocationHours[0]}</label>
                <Slider
                  value={allocationHours}
                  onValueChange={setAllocationHours}
                  max={40}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>
              
              <Button onClick={handleCreateAllocation} className="w-full">
                Create Allocation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Allocation Matrix */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {filteredMatrix.map((employeeData, index) => (
            <Card key={employeeData.employee.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <UserIcon className="h-5 w-5 text-gray-500" />
                    <div>
                      <CardTitle className="text-lg">
                        {employeeData.employee.firstName} {employeeData.employee.lastName}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{employeeData.employee.position}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(employeeData.status)}>
                      {employeeData.status}
                    </Badge>
                    <div className="text-right">
                      <p className="text-sm font-medium">{employeeData.totalAllocated}h / 40h</p>
                      <p className="text-xs text-gray-600">
                        {(employeeData.utilizationRate * 100).toFixed(0)}% utilization
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <Droppable droppableId={employeeData.employee.id.toString()}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-20 p-3 rounded-lg border-2 border-dashed transition-colors ${snapshot.isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      {employeeData.projects.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No current projects</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {employeeData.projects.map((projectAlloc, projIndex) => (
                            <Draggable
                              key={projectAlloc.id}
                              draggableId={projectAlloc.id}
                              index={projIndex}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 rounded-lg border shadow-sm bg-white transition-shadow ${snapshot.isDragging ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-medium text-sm">{projectAlloc.project?.name}</h4>
                                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(projectAlloc.project?.priority || 'low')}`} />
                                  </div>
                                  
                                  <div className="space-y-1 text-xs text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <ClockIcon className="h-3 w-3" />
                                      <span>{projectAlloc.allocatedHours}h/week</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      <CheckCircleIcon className="h-3 w-3" />
                                      <span>Skills: {(projectAlloc.skillMatch * 100).toFixed(0)}% match</span>
                                    </div>
                                  </div>
                                  
                                  {projectAlloc.skillMatch < 0.5 && (
                                    <div className="flex items-center gap-1 text-orange-600 text-xs mt-1">
                                      <ExclamationTriangleIcon className="h-3 w-3" />
                                      <span>Low skill match</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                
                {/* Skills */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-600 mb-1">Skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {employeeData.employee.skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};
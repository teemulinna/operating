import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Textarea } from '../ui/textarea';
import { toast } from '../ui/use-toast';
import { CalendarIcon, PlusIcon, UserIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';

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
  estimatedHours?: number;
  requiredResources?: number;
}

interface CapacityData {
  id: string;
  employeeId: string;
  date: string;
  availableHours: number;
  allocatedHours: number;
  utilizationRate: number;
}

interface ResourcePlan {
  projectId: string;
  employeeId: string;
  startDate: Date;
  endDate: Date;
  hoursPerWeek: number;
  role: string;
  skillMatch: number;
}

interface ProjectResourcePlannerProps {
  projects: Project[];
  employees: Employee[];
  capacityData: CapacityData[];
  onPlanningChange: () => void;
}

export const ProjectResourcePlanner: React.FC<ProjectResourcePlannerProps> = ({
  projects,
  employees,
  capacityData,
  onPlanningChange
}) => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    startDate: new Date(),
    endDate: addDays(new Date(), 30),
    requiredSkills: [] as string[],
    priority: 'medium' as const,
    estimatedHours: 0,
    requiredResources: 1
  });
  const [resourcePlan, setResourcePlan] = useState<ResourcePlan>({
    projectId: '',
    employeeId: '',
    startDate: new Date(),
    endDate: addDays(new Date(), 30),
    hoursPerWeek: 20,
    role: '',
    skillMatch: 0
  });

  const projectTimelines = useMemo(() => {
    return projects.map(project => {
      const projectEmployees = capacityData
        .filter(cap => {
          // This would typically come from a project_allocations table
          // For now, we'll simulate project assignments
          return project.status === 'active';
        })
        .map(cap => {
          const employee = employees.find(emp => emp.id.toString() === cap.employeeId);
          return employee ? {
            ...employee,
            allocation: cap.allocatedHours,
            utilization: cap.utilizationRate
          } : null;
        })
        .filter(Boolean);

      const totalAllocated = projectEmployees.reduce((sum, emp) => sum + (emp?.allocation || 0), 0);
      const avgUtilization = projectEmployees.length > 0 
        ? projectEmployees.reduce((sum, emp) => sum + (emp?.utilization || 0), 0) / projectEmployees.length
        : 0;

      const duration = differenceInDays(parseISO(project.endDate), parseISO(project.startDate));
      const progress = project.status === 'completed' ? 100 : 
                      project.status === 'active' ? Math.min(75, (Date.now() - parseISO(project.startDate).getTime()) / (parseISO(project.endDate).getTime() - parseISO(project.startDate).getTime()) * 100) :
                      0;

      return {
        ...project,
        assignedEmployees: projectEmployees,
        totalAllocated,
        avgUtilization,
        duration,
        progress,
        resourceNeeds: calculateResourceNeeds(project, projectEmployees, employees)
      };
    });
  }, [projects, employees, capacityData]);

  const calculateResourceNeeds = (project: Project, assigned: any[], allEmployees: Employee[]) => {
    const skillGaps = project.requiredSkills.filter(skill => 
      !assigned.some(emp => emp?.skills?.includes(skill))
    );

    const suggestedEmployees = allEmployees
      .filter(emp => !assigned.some(a => a?.id === emp.id))
      .map(emp => ({
        ...emp,
        skillMatch: calculateSkillMatch(emp.skills, project.requiredSkills),
        availability: getEmployeeAvailability(emp.id.toString(), capacityData)
      }))
      .filter(emp => emp.skillMatch > 0.3 && emp.availability > 10)
      .sort((a, b) => b.skillMatch - a.skillMatch)
      .slice(0, 5);

    return {
      skillGaps,
      suggestedEmployees,
      isUnderResourced: assigned.length < (project.requiredResources || 1),
      isOverResourced: assigned.length > (project.requiredResources || 1) * 1.5
    };
  };

  const calculateSkillMatch = (employeeSkills: string[], requiredSkills: string[]): number => {
    if (requiredSkills.length === 0) return 1;
    const matches = employeeSkills.filter(skill => requiredSkills.includes(skill));
    return matches.length / requiredSkills.length;
  };

  const getEmployeeAvailability = (employeeId: string, capacityData: CapacityData[]): number => {
    const empCapacity = capacityData.filter(cap => cap.employeeId === employeeId);
    if (empCapacity.length === 0) return 40; // Default 40h/week if no data
    
    const avgAvailable = empCapacity.reduce((sum, cap) => sum + (cap.availableHours - cap.allocatedHours), 0) / empCapacity.length;
    return Math.max(0, avgAvailable);
  };

  const handleCreateProject = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newProject,
          status: 'planning',
          startDate: newProject.startDate.toISOString(),
          endDate: newProject.endDate.toISOString()
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Project created successfully"
        });
        setIsNewProjectDialogOpen(false);
        setNewProject({
          name: '',
          description: '',
          startDate: new Date(),
          endDate: addDays(new Date(), 30),
          requiredSkills: [],
          priority: 'medium',
          estimatedHours: 0,
          requiredResources: 1
        });
        onPlanningChange();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
    }
  };

  const handleCreateResourcePlan = async () => {
    try {
      const response = await fetch('/api/resource-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...resourcePlan,
          startDate: resourcePlan.startDate.toISOString(),
          endDate: resourcePlan.endDate.toISOString()
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Resource plan created successfully"
        });
        setIsPlanDialogOpen(false);
        onPlanningChange();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create resource plan",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProjects = selectedProject 
    ? projectTimelines.filter(p => p.id === selectedProject)
    : projectTimelines;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Project Resource Planning</h2>
          <p className="text-gray-600 mt-1">Plan and optimize resource allocation across projects</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Projects</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserIcon className="h-4 w-4 mr-2" />
                Plan Resources
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Resource Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select 
                  value={resourcePlan.projectId} 
                  onValueChange={(value) => setResourcePlan({...resourcePlan, projectId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.filter(p => p.status !== 'completed').map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={resourcePlan.employeeId} 
                  onValueChange={(value) => setResourcePlan({...resourcePlan, employeeId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.firstName} {emp.lastName} - {emp.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(resourcePlan.startDate, 'MMM dd')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar
                        mode="single"
                        selected={resourcePlan.startDate}
                        onSelect={(date) => date && setResourcePlan({...resourcePlan, startDate: date})}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(resourcePlan.endDate, 'MMM dd')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar
                        mode="single"
                        selected={resourcePlan.endDate}
                        onSelect={(date) => date && setResourcePlan({...resourcePlan, endDate: date})}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Hours per Week: {resourcePlan.hoursPerWeek}</label>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={resourcePlan.hoursPerWeek}
                    onChange={(e) => setResourcePlan({...resourcePlan, hoursPerWeek: parseInt(e.target.value)})}
                    className="w-full mt-2"
                  />
                </div>
                
                <Input
                  placeholder="Role/Responsibility"
                  value={resourcePlan.role}
                  onChange={(e) => setResourcePlan({...resourcePlan, role: e.target.value})}
                />
                
                <Button onClick={handleCreateResourcePlan} className="w-full">
                  Create Plan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Project Name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  />
                  
                  <Select 
                    value={newProject.priority} 
                    onValueChange={(value: any) => setNewProject({...newProject, priority: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="critical">Critical Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Textarea
                  placeholder="Project Description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Estimated Hours</label>
                    <Input
                      type="number"
                      value={newProject.estimatedHours}
                      onChange={(e) => setNewProject({...newProject, estimatedHours: parseInt(e.target.value)})}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Required Resources</label>
                    <Input
                      type="number"
                      value={newProject.requiredResources}
                      onChange={(e) => setNewProject({...newProject, requiredResources: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                
                <Button onClick={handleCreateProject} className="w-full">
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Project Timeline Cards */}
      <div className="space-y-4">
        {filteredProjects.map(project => (
          <Card key={project.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    <Badge className={getPriorityColor(project.priority)}>
                      {project.priority}
                    </Badge>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm">{project.description}</p>
                </div>
                
                <div className="text-right text-sm text-gray-600">
                  <div>{format(parseISO(project.startDate), 'MMM dd')} - {format(parseISO(project.endDate), 'MMM dd, yyyy')}</div>
                  <div>{project.duration} days</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Progress</span>
                <span>{project.progress.toFixed(0)}%</span>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Assigned Team */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Assigned Team ({project.assignedEmployees?.length || 0})
                  </h4>
                  
                  {project.assignedEmployees?.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                      No team members assigned
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {project.assignedEmployees?.map((employee) => (
                        <div key={employee?.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium">{employee?.firstName} {employee?.lastName}</div>
                            <div className="text-sm text-gray-600">{employee?.position}</div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="flex items-center gap-1">
                              <ClockIcon className="h-3 w-3" />
                              {employee?.allocation}h/week
                            </div>
                            <div className="text-gray-600">{((employee?.utilization || 0) * 100).toFixed(0)}% utilized</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Resource Recommendations */}
                <div>
                  <h4 className="font-medium mb-3">Resource Analysis</h4>
                  
                  {project.resourceNeeds.isUnderResourced && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 text-yellow-800 mb-2">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span className="font-medium">Under-resourced</span>
                      </div>
                      <p className="text-sm text-yellow-700">This project needs more team members.</p>
                    </div>
                  )}
                  
                  {project.resourceNeeds.skillGaps.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 text-red-800 mb-2">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span className="font-medium">Skill Gaps</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {project.resourceNeeds.skillGaps.map(skill => (
                          <Badge key={skill} variant="destructive" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {project.resourceNeeds.suggestedEmployees.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Suggested Resources</h5>
                      <div className="space-y-2">
                        {project.resourceNeeds.suggestedEmployees.slice(0, 3).map(employee => (
                          <div key={employee.id} className="flex justify-between items-center p-2 bg-green-50 border border-green-200 rounded">
                            <div>
                              <div className="text-sm font-medium">{employee.firstName} {employee.lastName}</div>
                              <div className="text-xs text-gray-600">{employee.position}</div>
                            </div>
                            <div className="text-right text-xs">
                              <div className="text-green-700">{(employee.skillMatch * 100).toFixed(0)}% match</div>
                              <div className="text-gray-600">{employee.availability}h available</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!project.resourceNeeds.isUnderResourced && 
                   project.resourceNeeds.skillGaps.length === 0 && 
                   project.assignedEmployees && project.assignedEmployees.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircleIcon className="h-4 w-4" />
                        <span className="font-medium">Well Resourced</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">This project has adequate resources and skills.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
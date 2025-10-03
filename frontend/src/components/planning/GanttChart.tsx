import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import { ProjectService } from '../../services/projectService';
import { AllocationService } from '../../services/allocationService';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { Calendar, ZoomIn, ZoomOut, Download } from 'lucide-react';
import type { Project, Allocation } from '../../services/api';
import 'gantt-task-react/dist/index.css';

interface GanttTask extends Task {
  projectData: Project;
  allocations: Allocation[];
  resourceBars?: {
    employeeId: string;
    employeeName: string;
    role: string;
    allocatedHours: number;
    utilization: number;
  }[];
}

interface GanttChartProps {
  projects?: Project[];
  startDate?: Date;
  endDate?: Date;
  viewMode?: ViewMode;
  showResourceBars?: boolean;
  showDependencies?: boolean;
  showCriticalPath?: boolean;
  showOverallocationWarnings?: boolean;
  overallocatedEmployees?: Array<{
    employeeId: string;
    employeeName: string;
    utilizationRate: number;
    overallocated: boolean;
  }>;
  onTaskClick?: (task: GanttTask) => void;
  onDateChange?: (task: GanttTask, start: Date, end: Date) => void;
  onProgressChange?: (task: GanttTask, progress: number) => void;
  onExport?: (format: 'pdf' | 'png' | 'svg') => void;
  className?: string;
}

const VIEW_MODE_OPTIONS = [
  { value: ViewMode.Day, label: 'Day' },
  { value: ViewMode.Week, label: 'Week' },
  { value: ViewMode.Month, label: 'Month' },
  { value: ViewMode.Year, label: 'Year' },
];

export const GanttChart: React.FC<GanttChartProps> = ({
  projects: propProjects,
  startDate,
  endDate,
  viewMode = ViewMode.Month,
  showResourceBars = false,
  showOverallocationWarnings = false,
  overallocatedEmployees = [],
  onTaskClick,
  onDateChange,
  onProgressChange,
  onExport,
  className,
}) => {
  const [projects, setProjects] = useState<Project[]>(propProjects || []);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(viewMode);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);

  // Load projects and allocations
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load projects if not provided
      if (!propProjects) {
        const service = new ProjectService();
        const projectsResponse = await service.getAll(
          { status: 'active' }
        );
        setProjects(projectsResponse.data as Project[]);
      }

      // Load allocations with date filters
      const allocationFilters: any = {};
      if (startDate) {
        allocationFilters.startDateFrom = startDate.toISOString().split('T')[0];
      }
      if (endDate) {
        allocationFilters.endDateTo = endDate.toISOString().split('T')[0];
      }

      const allocationsResponse = await AllocationService.getAllocations(
        allocationFilters,
        { limit: 1000 }
      );
      setAllocations(allocationsResponse.allocations as Allocation[]);

    } catch (error) {
      console.error('Failed to load gantt data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [propProjects, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Transform projects to gantt tasks
  const ganttTasks = useMemo((): GanttTask[] => {
    return projects.map(project => {
      const projectAllocations = allocations.filter(
        allocation => allocation.projectId === project.id.toString()
      );

      // Calculate progress based on actual vs estimated hours
      let progress = 0;
      if (project.estimatedHours && project.actualHours) {
        progress = Math.min(100, (project.actualHours / project.estimatedHours) * 100);
      }

      // Group allocations by employee for resource bars
      const resourceBars = showResourceBars ?
        Object.values(
          projectAllocations.reduce((acc, allocation) => {
            if (!acc[allocation.employeeId]) {
              acc[allocation.employeeId] = {
                employeeId: allocation.employeeId,
                employeeName: allocation.employeeId, // Use employeeId as fallback
                role: allocation.roleOnProject || 'Team Member',
                allocatedHours: 0,
                utilization: 0,
              };
            }
            acc[allocation.employeeId].allocatedHours += allocation.allocatedHours || allocation.hours || 0;
            return acc;
          }, {} as Record<string, any>)
        ) : undefined;

      // Determine task type and color based on project status
      let type: Task['type'] = 'task';
      let styles: any = {};

      switch (project.status) {
        case 'completed':
          styles.backgroundColor = '#22c55e';
          styles.progressColor = '#16a34a';
          break;
        case 'active':
          styles.backgroundColor = '#3b82f6';
          styles.progressColor = '#2563eb';
          break;
        case 'inactive':
          styles.backgroundColor = '#f59e0b';
          styles.progressColor = '#d97706';
          break;
        case 'planning':
          styles.backgroundColor = '#8b5cf6';
          styles.progressColor = '#7c3aed';
          break;
        default:
          styles.backgroundColor = '#6b7280';
          styles.progressColor = '#4b5563';
      }

      // Add overallocation warning styles
      if (showOverallocationWarnings) {
        const hasOverallocatedEmployee = resourceBars?.some(bar =>
          overallocatedEmployees.some(emp =>
            emp.employeeId === bar.employeeId && emp.overallocated
          )
        );

        if (hasOverallocatedEmployee) {
          styles.backgroundColor = '#ef4444';
          styles.progressColor = '#dc2626';
        }
      }

      return {
        id: project.id.toString(),
        name: project.name,
        start: new Date(project.startDate),
        end: new Date(project.endDate || project.startDate),
        progress,
        type,
        styles,
        project: project.id.toString(),
        projectData: project,
        allocations: projectAllocations,
        resourceBars,
        hideChildren: false,
        displayOrder: project.id,
      } as GanttTask;
    });
  }, [projects, allocations, showResourceBars, showOverallocationWarnings, overallocatedEmployees]);

  // Handle task interactions
  const handleTaskClick = (task: Task) => {
    const ganttTask = ganttTasks.find(t => t.id === task.id);
    if (ganttTask) {
      setSelectedTask(ganttTask);
      onTaskClick?.(ganttTask);
    }
  };

  const handleDateChange = (task: Task) => {
    const ganttTask = ganttTasks.find(t => t.id === task.id);
    if (ganttTask) {
      onDateChange?.(ganttTask, task.start, task.end);

      // Update project dates in the backend
      const service = new ProjectService();
      service.update(ganttTask.projectData.id, {
        startDate: task.start.toISOString().split('T')[0],
        endDate: task.end.toISOString().split('T')[0],
      });

      loadData(); // Reload data
    }
  };

  const handleProgressChange = (task: Task) => {
    const ganttTask = ganttTasks.find(t => t.id === task.id);
    if (ganttTask) {
      onProgressChange?.(ganttTask, task.progress);
    }
  };

  // View mode controls
  const handleZoomIn = () => {
    const modes = [ViewMode.Year, ViewMode.Month, ViewMode.Week, ViewMode.Day];
    const currentIndex = modes.indexOf(currentViewMode);
    if (currentIndex < modes.length - 1) {
      setCurrentViewMode(modes[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const modes = [ViewMode.Year, ViewMode.Month, ViewMode.Week, ViewMode.Day];
    const currentIndex = modes.indexOf(currentViewMode);
    if (currentIndex > 0) {
      setCurrentViewMode(modes[currentIndex - 1]);
    }
  };

  // Export functionality
  const handleExport = (format: 'pdf' | 'png' | 'svg') => {
    onExport?.(format);
  };

  if (isLoading) {
    return (
      <Card className={cn('h-96', className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading Gantt chart...</div>
        </CardContent>
      </Card>
    );
  }

  if (ganttTasks.length === 0) {
    return (
      <Card className={cn('h-96', className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500">No projects found</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Timeline</CardTitle>
          <div className="flex items-center gap-2">
            {/* View Mode Selector */}
            <Select
              value={currentViewMode.toString()}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrentViewMode(e.target.value as ViewMode)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEW_MODE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border rounded">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                data-testid="zoom-out"
                disabled={currentViewMode === ViewMode.Year}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                data-testid="zoom-in"
                disabled={currentViewMode === ViewMode.Day}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Export Button */}
            {onExport && (
              <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div data-testid="gantt-chart" className="h-96">
          <Gantt
            tasks={ganttTasks as Task[]}
            viewMode={currentViewMode}
            onDateChange={handleDateChange}
            onProgressChange={handleProgressChange}
            onClick={handleTaskClick}
            columnWidth={currentViewMode === ViewMode.Day ? 50 :
                        currentViewMode === ViewMode.Week ? 100 :
                        currentViewMode === ViewMode.Month ? 150 : 200}
            listCellWidth="200px"
            ganttHeight={ganttTasks.length * 50 + 100}
            fontSize="14"
            fontFamily="Inter, system-ui, sans-serif"
          />
        </div>

        {/* Legend */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Inactive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Planning</span>
            </div>
            {showOverallocationWarnings && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Overallocated</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Task Details Panel */}
      {selectedTask && (
        <div className="absolute right-4 top-4 w-80 bg-white border shadow-lg rounded-lg p-4 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{selectedTask.name}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTask(null)}
            >
              ×
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Client:</span> {selectedTask.projectData.clientName}
            </div>
            <div>
              <span className="font-medium">Status:</span>{' '}
              <Badge variant={selectedTask.projectData.status === 'active' ? 'default' : 'secondary'}>
                {selectedTask.projectData.status}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Progress:</span> {selectedTask.progress.toFixed(0)}%
            </div>
            <div>
              <span className="font-medium">Team:</span> {selectedTask.allocations.length} members
            </div>

            {showResourceBars && selectedTask.resourceBars && (
              <div>
                <span className="font-medium">Resource Allocation:</span>
                <div className="mt-1 space-y-1">
                  {selectedTask.resourceBars.map(resource => (
                    <div key={resource.employeeId} className="flex justify-between text-xs">
                      <span>{resource.employeeName}</span>
                      <span>{resource.allocatedHours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default GanttChart;

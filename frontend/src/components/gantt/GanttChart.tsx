import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { 
  GanttTask, 
  GanttProject, 
  GanttViewOptions, 
  GanttEvent, 
  GanttSettings,
  DEFAULT_VIEW_OPTIONS,
  DEFAULT_GANTT_THEME 
} from './types';
import { GanttToolbar } from './GanttToolbar';
import { TaskEditor } from './TaskEditor';
import { transformProjectToGanttTasks, calculateCriticalPath } from './utils/ganttUtils';
import { exportGanttChart } from './utils/ganttExport';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent } from '@/components/ui/card';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface GanttChartProps {
  project: GanttProject;
  onTaskUpdate?: (task: GanttTask) => void;
  onTaskCreate?: (task: Partial<GanttTask>) => void;
  onTaskDelete?: (taskId: string) => void;
  onDependencyCreate?: (from: string, to: string) => void;
  onDependencyDelete?: (from: string, to: string) => void;
  settings?: Partial<GanttSettings>;
  viewOptions?: Partial<GanttViewOptions>;
  readOnly?: boolean;
  showToolbar?: boolean;
  height?: number;
  onProjectUpdate?: (project: GanttProject) => void;
  realTimeUpdates?: boolean;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  project,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onDependencyCreate,
  onDependencyDelete,
  settings = {},
  viewOptions = {},
  readOnly = false,
  showToolbar = true,
  height = 600,
  onProjectUpdate,
  realTimeUpdates = true,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskEditor, setShowTaskEditor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [criticalPath, setCriticalPath] = useState<string[]>([]);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showProgress, setShowProgress] = useState(true);
  const [showDependencies, setShowDependencies] = useState(true);
  
  const ganttRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { socket } = useWebSocket();

  // Merge settings with defaults
  const mergedSettings: GanttSettings = useMemo(() => ({
    ...DEFAULT_GANTT_THEME,
    ...settings,
  }), [settings]);

  // Merge view options with defaults
  const mergedViewOptions: GanttViewOptions = useMemo(() => ({
    ...DEFAULT_VIEW_OPTIONS,
    ...viewOptions,
    viewMode: viewMode === ViewMode.Day ? 'Day' as const : 
              viewMode === ViewMode.Week ? 'Week' as const :
              viewMode === ViewMode.Month ? 'Month' as const : 'Day' as const,
  }), [viewOptions, viewMode]);

  // Transform project data to Gantt tasks
  const ganttTasks = useMemo(() => {
    if (!project?.tasks) return [];
    return transformProjectToGanttTasks(project.tasks, project);
  }, [project]);

  // Convert to gantt-task-react format
  const taskList: Task[] = useMemo(() => {
    return ganttTasks.map(task => ({
      id: task.id,
      name: task.name,
      type: task.type as 'task' | 'milestone' | 'project',
      start: task.start,
      end: task.end,
      progress: task.progress,
      dependencies: task.dependencies || [],
      project: task.project || project.id,
      displayOrder: task.displayOrder || 0,
      styles: {
        backgroundColor: task.status === 'completed' ? mergedSettings.statusColors.completed :
                        task.status === 'in-progress' ? mergedSettings.statusColors['in-progress'] :
                        task.status === 'on-hold' ? mergedSettings.statusColors['on-hold'] :
                        task.status === 'cancelled' ? mergedSettings.statusColors.cancelled :
                        mergedSettings.statusColors['not-started'],
        backgroundSelectedColor: mergedSettings.colors.selected,
        progressColor: mergedSettings.colors.success,
        progressSelectedColor: mergedSettings.colors.success,
        ...task.styles,
      },
      isDisabled: task.isDisabled || readOnly,
      hideChildren: task.hideChildren,
    }));
  }, [ganttTasks, mergedSettings, project.id, readOnly]);

  // Calculate critical path
  useEffect(() => {
    if (ganttTasks.length > 0 && showCriticalPath) {
      try {
        const analysis = calculateCriticalPath(ganttTasks);
        setCriticalPath(analysis.criticalPath);
      } catch (error) {
        console.error('Error calculating critical path:', error);
      }
    }
  }, [ganttTasks, showCriticalPath]);

  // Apply critical path styling
  const styledTasks = useMemo(() => {
    if (!showCriticalPath || criticalPath.length === 0) return taskList;
    
    return taskList.map(task => ({
      ...task,
      styles: {
        ...task.styles,
        backgroundColor: criticalPath.includes(task.id) 
          ? '#ef4444' // Red for critical path
          : task.styles?.backgroundColor,
      },
    }));
  }, [taskList, criticalPath, showCriticalPath]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!realTimeUpdates || !socket) return;

    const handleProjectUpdate = (data: any) => {
      if (data.projectId === project.id) {
        // Update tasks when project data changes
        if (onProjectUpdate) {
          onProjectUpdate(data);
        }
        toast({
          title: 'Project Updated',
          description: 'The project has been updated in real-time.',
        });
      }
    };

    const handleTaskUpdate = (data: any) => {
      if (data.projectId === project.id) {
        // Update specific task
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === data.taskId ? { ...task, ...data.updates } : task
          )
        );
      }
    };

    socket.on('project:updated', handleProjectUpdate);
    socket.on('task:updated', handleTaskUpdate);
    socket.on('allocation:updated', handleTaskUpdate);

    return () => {
      socket.off('project:updated', handleProjectUpdate);
      socket.off('task:updated', handleTaskUpdate);
      socket.off('allocation:updated', handleTaskUpdate);
    };
  }, [socket, project.id, onProjectUpdate, realTimeUpdates, toast]);

  // Task event handlers
  const handleTaskChange = useCallback(async (task: Task) => {
    if (readOnly) return;
    
    setIsLoading(true);
    try {
      // Find the original Gantt task
      const originalTask = ganttTasks.find(t => t.id === task.id);
      if (!originalTask) return;

      // Create updated task
      const updatedTask: GanttTask = {
        ...originalTask,
        name: task.name,
        start: task.start,
        end: task.end,
        progress: task.progress,
      };

      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === task.id ? task : t)
      );

      // Notify parent component
      if (onTaskUpdate) {
        await onTaskUpdate(updatedTask);
      }

      toast({
        title: 'Task Updated',
        description: `Task "${task.name}" has been updated successfully.`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update the task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [readOnly, ganttTasks, onTaskUpdate, toast]);

  const handleTaskDelete = useCallback(async (task: Task) => {
    if (readOnly) return;
    
    setIsLoading(true);
    try {
      // Remove from local state
      setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
      
      // Notify parent component
      if (onTaskDelete) {
        await onTaskDelete(task.id);
      }

      toast({
        title: 'Task Deleted',
        description: `Task "${task.name}" has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete the task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [readOnly, onTaskDelete, toast]);

  const handleProgressChange = useCallback(async (task: Task) => {
    if (readOnly) return;
    
    // Update task progress
    const updatedTask = { ...task };
    await handleTaskChange(updatedTask);
  }, [readOnly, handleTaskChange]);

  const handleDoubleClick = useCallback((task: Task) => {
    if (readOnly) return;
    
    setSelectedTask(task);
    setShowTaskEditor(true);
  }, [readOnly]);

  const handleSelect = useCallback((task: Task, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTask(task);
    } else {
      setSelectedTask(null);
    }
  }, []);

  // Export functionality
  const handleExport = useCallback(async (format: 'pdf' | 'png' | 'svg') => {
    if (!ganttRef.current) return;
    
    setIsLoading(true);
    try {
      await exportGanttChart(ganttRef.current, {
        format,
        filename: `${project.name}-gantt-chart`,
        title: project.name,
        author: project.manager?.name,
      });
      
      toast({
        title: 'Export Successful',
        description: `Gantt chart exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export the Gantt chart. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [project.name, project.manager?.name, toast]);

  // View mode change handler
  const handleViewModeChange = useCallback((newViewMode: ViewMode) => {
    setViewMode(newViewMode);
  }, []);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(100);
  }, []);

  // Filter and search handlers
  const handleToggleProgress = useCallback(() => {
    setShowProgress(prev => !prev);
  }, []);

  const handleToggleDependencies = useCallback(() => {
    setShowDependencies(prev => !prev);
  }, []);

  const handleToggleCriticalPath = useCallback(() => {
    setShowCriticalPath(prev => !prev);
  }, []);

  return (
    <Card className="w-full">
      {showToolbar && (
        <GanttToolbar
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onExport={handleExport}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          zoomLevel={zoomLevel}
          showProgress={showProgress}
          showDependencies={showDependencies}
          showCriticalPath={showCriticalPath}
          onToggleProgress={handleToggleProgress}
          onToggleDependencies={handleToggleDependencies}
          onToggleCriticalPath={handleToggleCriticalPath}
          isLoading={isLoading}
          readOnly={readOnly}
        />
      )}
      
      <CardContent className="p-0">
        <div 
          ref={ganttRef}
          style={{ 
            height: `${height}px`,
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top left',
            width: `${100 / (zoomLevel / 100)}%`,
          }}
        >
          <Gantt
            tasks={styledTasks}
            viewMode={viewMode}
            onDateChange={handleTaskChange}
            onDelete={handleTaskDelete}
            onProgressChange={handleProgressChange}
            onDoubleClick={handleDoubleClick}
            onSelect={handleSelect}
            listCellWidth={mergedViewOptions.listCellWidth}
            columnWidth={mergedViewOptions.columnWidth}
            rowHeight={mergedViewOptions.rowHeight}
            barCornerRadius={mergedViewOptions.barCornerRadius}
            handleWidth={mergedViewOptions.handleWidth}
            fontSize={mergedViewOptions.fontSize}
            fontFamily={mergedViewOptions.fontFamily}
            arrowColor={mergedSettings.colors.primary}
            arrowIndent={20}
            todayColor={mergedSettings.colors.today}
            TooltipContent={({ task, fontSize, fontFamily }) => (
              <div 
                className="bg-white p-3 rounded-lg shadow-lg border max-w-xs"
                style={{ fontSize, fontFamily }}
              >
                <div className="font-semibold text-gray-900">{task.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  <div>Start: {task.start.toLocaleDateString()}</div>
                  <div>End: {task.end.toLocaleDateString()}</div>
                  <div>Progress: {Math.round(task.progress)}%</div>
                  {task.dependencies && task.dependencies.length > 0 && (
                    <div>Dependencies: {task.dependencies.length}</div>
                  )}
                </div>
              </div>
            )}
            TaskListHeader={({ headerHeight, rowWidth, fontFamily, fontSize }) => (
              <div 
                className="flex items-center px-4 bg-gray-50 border-b"
                style={{ height: headerHeight, width: rowWidth, fontFamily, fontSize }}
              >
                <div className="font-semibold text-gray-900">Task Name</div>
              </div>
            )}
            TaskListTable={({ rowHeight, rowWidth, fontFamily, fontSize, locale, tasks, selectedTaskId, setSelectedTask, onExpanderClick }) => (
              <div>
                {tasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={`flex items-center px-4 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedTaskId === task.id ? 'bg-blue-50' : ''
                    }`}
                    style={{ height: rowHeight, width: rowWidth, fontFamily, fontSize }}
                    onClick={() => setSelectedTask(task.id)}
                  >
                    <div className="flex items-center">
                      {task.hideChildren !== undefined && (
                        <button
                          className="w-4 h-4 mr-2 flex items-center justify-center text-gray-400 hover:text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExpanderClick(task.id);
                          }}
                        >
                          {task.hideChildren ? '▶' : '▼'}
                        </button>
                      )}
                      <span className="truncate">{task.name}</span>
                      {criticalPath.includes(task.id) && showCriticalPath && (
                        <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                          Critical
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          />
        </div>
      </CardContent>

      {showTaskEditor && selectedTask && (
        <TaskEditor
          task={selectedTask}
          isOpen={showTaskEditor}
          onClose={() => {
            setShowTaskEditor(false);
            setSelectedTask(null);
          }}
          onSave={async (updatedTask) => {
            await handleTaskChange(updatedTask);
            setShowTaskEditor(false);
            setSelectedTask(null);
          }}
          readOnly={readOnly}
        />
      )}
    </Card>
  );
};

export default GanttChart;
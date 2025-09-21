import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  GanttTask, 
  GanttProject, 
  GanttResource, 
  CriticalPathAnalysis,
  ResourceConflict,
  GanttFilterOptions 
} from '../types';
import { 
  transformApiProjectToGanttProject,
  calculateCriticalPath,
  detectResourceConflicts,
  calculateResourceUtilization,
  autoScheduleTasks,
} from '../utils/ganttUtils';
import { useToast } from '@/components/ui/toast';
import { api } from '@/services/api';

interface UseGanttDataOptions {
  projectId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseGanttDataReturn {
  // Data
  project: GanttProject | null;
  tasks: GanttTask[];
  resources: GanttResource[];
  
  // Analysis
  criticalPath: CriticalPathAnalysis | null;
  resourceConflicts: ResourceConflict[];
  resourceUtilization: any[];
  
  // State
  isLoading: boolean;
  error: Error | null;
  
  // Filters
  filters: GanttFilterOptions;
  setFilters: (filters: GanttFilterOptions) => void;
  filteredTasks: GanttTask[];
  
  // Actions
  updateTask: (task: GanttTask) => Promise<void>;
  createTask: (task: Partial<GanttTask>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateProject: (project: Partial<GanttProject>) => Promise<void>;
  refresh: () => Promise<void>;
  
  // Advanced features
  autoSchedule: () => Promise<void>;
  optimizeResourceAllocation: () => Promise<void>;
  
  // Export
  exportData: (format: string) => Promise<any>;
}

export const useGanttData = (options: UseGanttDataOptions): UseGanttDataReturn => {
  const { projectId, autoRefresh = false, refreshInterval = 30000 } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState<GanttFilterOptions>({
    showCompleted: true,
    showOnHold: true,
    showCancelled: false,
    resourceIds: [],
    priorities: ['low', 'medium', 'high', 'critical'],
    progressRange: { min: 0, max: 100 },
  });

  // Fetch project data
  const {
    data: projectData,
    isLoading: isProjectLoading,
    error: projectError,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    },
    enabled: !!projectId,
    refetchInterval: autoRefresh ? refreshInterval : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch allocations (tasks)
  const {
    data: allocationsData,
    isLoading: isAllocationsLoading,
    error: allocationsError,
    refetch: refetchAllocations,
  } = useQuery({
    queryKey: ['allocations', projectId],
    queryFn: async () => {
      const response = await api.get(`/allocations?projectId=${projectId}`);
      return response.data;
    },
    enabled: !!projectId,
    refetchInterval: autoRefresh ? refreshInterval : undefined,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch employees (resources)
  const {
    data: employeesData,
    isLoading: isEmployeesLoading,
    error: employeesError,
    refetch: refetchEmployees,
  } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees');
      return response.data;
    },
    refetchInterval: autoRefresh ? refreshInterval : undefined,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Transform data to Gantt format
  const project = useMemo(() => {
    if (!projectData || !allocationsData || !employeesData) return null;
    
    return transformApiProjectToGanttProject(
      projectData,
      allocationsData,
      employeesData
    );
  }, [projectData, allocationsData, employeesData]);

  // Extract tasks and resources
  const tasks = useMemo(() => project?.tasks || [], [project]);
  const resources = useMemo(() => project?.resources || [], [project]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    if (!tasks.length) return [];
    
    return tasks.filter(task => {
      // Status filter
      if (!filters.showCompleted && task.status === 'completed') return false;
      if (!filters.showOnHold && task.status === 'on-hold') return false;
      if (!filters.showCancelled && task.status === 'cancelled') return false;
      
      // Resource filter
      if (filters.resourceIds && filters.resourceIds.length > 0) {
        const hasMatchingResource = task.resources?.some(resourceId => 
          filters.resourceIds?.includes(resourceId)
        );
        if (!hasMatchingResource) return false;
      }
      
      // Date range filters
      if (filters.startDateRange) {
        if (filters.startDateRange.start && task.start < filters.startDateRange.start) return false;
        if (filters.startDateRange.end && task.start > filters.startDateRange.end) return false;
      }
      
      if (filters.endDateRange) {
        if (filters.endDateRange.start && task.end < filters.endDateRange.start) return false;
        if (filters.endDateRange.end && task.end > filters.endDateRange.end) return false;
      }
      
      // Priority filter
      if (filters.priorities && !filters.priorities.includes(task.priority)) return false;
      
      // Progress filter
      if (filters.progressRange) {
        if (task.progress < filters.progressRange.min || task.progress > filters.progressRange.max) {
          return false;
        }
      }
      
      // Search filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        return task.name.toLowerCase().includes(searchLower) ||
               task.description?.toLowerCase().includes(searchLower);
      }
      
      return true;
    });
  }, [tasks, filters]);

  // Calculate critical path
  const criticalPath = useMemo(() => {
    if (!filteredTasks.length) return null;
    
    try {
      return calculateCriticalPath(filteredTasks);
    } catch (error) {
      console.error('Error calculating critical path:', error);
      return null;
    }
  }, [filteredTasks]);

  // Detect resource conflicts
  const resourceConflicts = useMemo(() => {
    if (!filteredTasks.length || !resources.length) return [];
    
    return detectResourceConflicts(filteredTasks, resources);
  }, [filteredTasks, resources]);

  // Calculate resource utilization
  const resourceUtilization = useMemo(() => {
    if (!filteredTasks.length || !resources.length || !project) return [];
    
    return calculateResourceUtilization(
      filteredTasks,
      resources,
      project.startDate,
      project.endDate
    );
  }, [filteredTasks, resources, project]);

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (task: GanttTask) => {
      // Convert Gantt task back to allocation format
      const allocationData = {
        allocated_hours: task.estimatedHours,
        actual_hours: task.actualHours,
        role_on_project: task.name,
        start_date: task.start.toISOString(),
        end_date: task.end.toISOString(),
        notes: (task as any).notes || '',
      };
      
      const response = await api.put(`/allocations/${task.id}`, allocationData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations', projectId] });
      toast({
        title: 'Task Updated',
        description: 'Task has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update task.',
        variant: 'destructive',
      });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (task: Partial<GanttTask>) => {
      const allocationData = {
        project_id: projectId,
        employee_id: task.resources?.[0] || null,
        allocated_hours: task.estimatedHours || 0,
        role_on_project: task.name || 'New Task',
        start_date: task.start?.toISOString() || new Date().toISOString(),
        end_date: task.end?.toISOString() || new Date().toISOString(),
        notes: (task as any).notes || '',
      };
      
      const response = await api.post('/allocations', allocationData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations', projectId] });
      toast({
        title: 'Task Created',
        description: 'New task has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create task.',
        variant: 'destructive',
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.delete(`/allocations/${taskId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations', projectId] });
      toast({
        title: 'Task Deleted',
        description: 'Task has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Failed to delete task.',
        variant: 'destructive',
      });
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (updates: Partial<GanttProject>) => {
      const projectData = {
        name: updates.name,
        description: updates.description,
        start_date: updates.startDate?.toISOString(),
        end_date: updates.endDate?.toISOString(),
        status: updates.status,
        priority: updates.priority,
        budget: updates.budget,
      };
      
      const response = await api.put(`/projects/${projectId}`, projectData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({
        title: 'Project Updated',
        description: 'Project has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update project.',
        variant: 'destructive',
      });
    },
  });

  // Auto-schedule tasks
  const autoScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error('No project data available');
      
      const scheduledTasks = autoScheduleTasks(
        filteredTasks,
        resources,
        project.startDate
      );
      
      // Update all tasks with new dates
      const updatePromises = scheduledTasks.map(task => 
        updateTaskMutation.mutateAsync(task)
      );
      
      await Promise.all(updatePromises);
      return scheduledTasks;
    },
    onSuccess: () => {
      toast({
        title: 'Auto-Schedule Complete',
        description: 'Tasks have been automatically scheduled.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Auto-Schedule Failed',
        description: error.message || 'Failed to auto-schedule tasks.',
        variant: 'destructive',
      });
    },
  });

  // Action functions
  const updateTask = useCallback(async (task: GanttTask) => {
    await updateTaskMutation.mutateAsync(task);
  }, [updateTaskMutation]);

  const createTask = useCallback(async (task: Partial<GanttTask>) => {
    await createTaskMutation.mutateAsync(task);
  }, [createTaskMutation]);

  const deleteTask = useCallback(async (taskId: string) => {
    await deleteTaskMutation.mutateAsync(taskId);
  }, [deleteTaskMutation]);

  const updateProject = useCallback(async (updates: Partial<GanttProject>) => {
    await updateProjectMutation.mutateAsync(updates);
  }, [updateProjectMutation]);

  const refresh = useCallback(async () => {
    await Promise.all([
      refetchProject(),
      refetchAllocations(),
      refetchEmployees(),
    ]);
  }, [refetchProject, refetchAllocations, refetchEmployees]);

  const autoSchedule = useCallback(async () => {
    await autoScheduleMutation.mutateAsync();
  }, [autoScheduleMutation]);

  const optimizeResourceAllocation = useCallback(async () => {
    // This would implement resource optimization logic
    toast({
      title: 'Feature Coming Soon',
      description: 'Resource optimization is being developed.',
    });
  }, [toast]);

  const exportData = useCallback(async (format: string) => {
    if (!project) return null;
    
    switch (format) {
      case 'json':
        return {
          project,
          tasks: filteredTasks,
          resources,
          criticalPath,
          resourceConflicts,
        };
      
      case 'csv':
        return filteredTasks.map(task => ({
          id: task.id,
          name: task.name,
          start: task.start.toISOString(),
          end: task.end.toISOString(),
          progress: task.progress,
          status: task.status,
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours,
        }));
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }, [project, filteredTasks, resources, criticalPath, resourceConflicts]);

  // Loading and error states
  const isLoading = isProjectLoading || isAllocationsLoading || isEmployeesLoading;
  const error = projectError || allocationsError || employeesError;

  return {
    // Data
    project,
    tasks,
    resources,
    
    // Analysis
    criticalPath,
    resourceConflicts,
    resourceUtilization,
    
    // State
    isLoading,
    error: error as Error | null,
    
    // Filters
    filters,
    setFilters,
    filteredTasks,
    
    // Actions
    updateTask,
    createTask,
    deleteTask,
    updateProject,
    refresh,
    
    // Advanced features
    autoSchedule,
    optimizeResourceAllocation,
    
    // Export
    exportData,
  };
};
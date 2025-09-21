import { 
  GanttTask, 
  GanttProject, 
  GanttDependency, 
  CriticalPathAnalysis, 
  CriticalPathNode,
  ResourceConflict,
  ResourceAllocation 
} from '../types';
import { Project, ApiProject } from '@/types/project';
import { addDays, differenceInDays, format } from 'date-fns';

/**
 * Transform project data to Gantt tasks
 */
export const transformProjectToGanttTasks = (
  projectTasks: GanttTask[], 
  project: GanttProject
): GanttTask[] => {
  if (!projectTasks || projectTasks.length === 0) return [];

  // Sort tasks by display order and dependencies
  const sortedTasks = [...projectTasks].sort((a, b) => {
    // First by display order
    if (a.displayOrder !== b.displayOrder) {
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    }
    // Then by start date
    return a.start.getTime() - b.start.getTime();
  });

  return sortedTasks.map(task => ({
    ...task,
    // Ensure dates are valid
    start: new Date(task.start),
    end: new Date(task.end),
    // Ensure progress is within bounds
    progress: Math.max(0, Math.min(100, task.progress)),
    // Add project context
    project: task.project || project.id,
  }));
};

/**
 * Transform API project data to GanttProject
 */
export const transformApiProjectToGanttProject = (
  apiProject: ApiProject,
  allocations: any[] = [],
  employees: any[] = []
): GanttProject => {
  // Convert allocations to tasks
  const tasks: GanttTask[] = allocations.map((allocation, index) => {
    const employee = employees.find(emp => emp.id === allocation.employee_id);
    
    return {
      id: allocation.id.toString(),
      name: `${employee?.first_name || ''} ${employee?.last_name || ''} - ${allocation.role_on_project || 'Task'}`,
      type: 'task' as const,
      start: new Date(allocation.start_date),
      end: new Date(allocation.end_date),
      progress: allocation.actual_hours && allocation.allocated_hours
        ? Math.round((parseFloat(allocation.actual_hours) / parseFloat(allocation.allocated_hours)) * 100)
        : 0,
      priority: 'medium' as const,
      status: allocation.is_active ? 
        (allocation.actual_hours ? 'completed' : 'in-progress') : 
        'not-started' as const,
      resources: employee ? [employee.id.toString()] : [],
      dependencies: [],
      displayOrder: index,
      estimatedHours: parseFloat(allocation.allocated_hours) || 0,
      actualHours: parseFloat(allocation.actual_hours) || 0,
      hourlyRate: parseFloat(allocation.hourly_rate) || 0,
    };
  });

  // Add project-level task
  const projectTask: GanttTask = {
    id: `project-${apiProject.id}`,
    name: apiProject.name,
    type: 'project',
    start: new Date(apiProject.start_date),
    end: apiProject.end_date ? new Date(apiProject.end_date) : addDays(new Date(apiProject.start_date), 30),
    progress: calculateProjectProgress(tasks),
    priority: apiProject.priority as any,
    status: apiProject.status as any,
    resources: [],
    dependencies: [],
    displayOrder: 0,
    estimatedHours: apiProject.estimated_hours || 0,
  };

  return {
    id: apiProject.id.toString(),
    name: apiProject.name,
    description: apiProject.description,
    startDate: new Date(apiProject.start_date),
    endDate: apiProject.end_date ? new Date(apiProject.end_date) : addDays(new Date(apiProject.start_date), 30),
    status: apiProject.status as any,
    priority: apiProject.priority as any,
    progress: calculateProjectProgress(tasks),
    tasks: [projectTask, ...tasks],
    resources: employees.map(emp => ({
      id: emp.id.toString(),
      name: `${emp.first_name} ${emp.last_name}`,
      type: 'employee' as const,
      capacity: emp.default_hours || 40,
      cost: 0, // Would come from employee hourly rate if available
      skills: [], // Would come from employee skills if available
      department: emp.department_id?.toString(),
      availability: [],
    })),
    manager: {
      id: apiProject.created_by?.toString() || '0',
      name: 'Project Manager',
      email: 'pm@company.com',
    },
    budget: apiProject.budget ? parseFloat(apiProject.budget) : undefined,
  };
};

/**
 * Calculate project progress based on tasks
 */
export const calculateProjectProgress = (tasks: GanttTask[]): number => {
  if (!tasks || tasks.length === 0) return 0;

  const taskProgress = tasks
    .filter(task => task.type === 'task')
    .map(task => ({
      progress: task.progress,
      weight: task.estimatedHours || 1,
    }));

  if (taskProgress.length === 0) return 0;

  const totalWeight = taskProgress.reduce((sum, task) => sum + task.weight, 0);
  const weightedProgress = taskProgress.reduce((sum, task) => sum + (task.progress * task.weight), 0);

  return Math.round(weightedProgress / totalWeight);
};

/**
 * Critical Path Method (CPM) calculation
 */
export const calculateCriticalPath = (tasks: GanttTask[]): CriticalPathAnalysis => {
  if (!tasks || tasks.length === 0) {
    return {
      nodes: [],
      criticalPath: [],
      projectDuration: 0,
      projectStart: new Date(),
      projectEnd: new Date(),
    };
  }

  // Filter out project-level tasks and milestones for CPM calculation
  const workTasks = tasks.filter(task => task.type === 'task');
  
  if (workTasks.length === 0) {
    return {
      nodes: [],
      criticalPath: [],
      projectDuration: 0,
      projectStart: new Date(),
      projectEnd: new Date(),
    };
  }

  // Create node map
  const nodes: Map<string, CriticalPathNode> = new Map();
  
  // Initialize nodes
  workTasks.forEach(task => {
    const duration = differenceInDays(task.end, task.start);
    nodes.set(task.id, {
      taskId: task.id,
      earliestStart: task.start,
      earliestFinish: addDays(task.start, duration),
      latestStart: task.start,
      latestFinish: task.end,
      totalFloat: 0,
      isCritical: false,
    });
  });

  // Forward pass - calculate earliest start and finish times
  const calculateEarliestTimes = (taskId: string, visited: Set<string> = new Set()): Date => {
    if (visited.has(taskId)) return nodes.get(taskId)!.earliestStart;
    visited.add(taskId);

    const task = workTasks.find(t => t.id === taskId);
    if (!task) return new Date();

    let earliestStart = task.start;
    
    if (task.dependencies && task.dependencies.length > 0) {
      const dependencyFinishTimes = task.dependencies
        .map(depId => {
          const depNode = nodes.get(depId);
          if (depNode) {
            calculateEarliestTimes(depId, visited);
            return depNode.earliestFinish;
          }
          return task.start;
        })
        .filter(date => date instanceof Date);

      if (dependencyFinishTimes.length > 0) {
        earliestStart = new Date(Math.max(...dependencyFinishTimes.map(d => d.getTime())));
      }
    }

    const duration = differenceInDays(task.end, task.start);
    const earliestFinish = addDays(earliestStart, Math.max(1, duration));

    const node = nodes.get(taskId)!;
    node.earliestStart = earliestStart;
    node.earliestFinish = earliestFinish;

    return earliestStart;
  };

  workTasks.forEach(task => calculateEarliestTimes(task.id));

  // Find project end date
  const projectEnd = new Date(Math.max(...Array.from(nodes.values()).map(n => n.earliestFinish.getTime())));
  const projectStart = new Date(Math.min(...Array.from(nodes.values()).map(n => n.earliestStart.getTime())));

  // Backward pass - calculate latest start and finish times
  const calculateLatestTimes = (taskId: string, visited: Set<string> = new Set()): Date => {
    if (visited.has(taskId)) return nodes.get(taskId)!.latestFinish;
    visited.add(taskId);

    const task = workTasks.find(t => t.id === taskId);
    if (!task) return projectEnd;

    const node = nodes.get(taskId)!;
    let latestFinish = projectEnd;

    // Find tasks that depend on this task
    const dependentTasks = workTasks.filter(t => t.dependencies?.includes(taskId));
    
    if (dependentTasks.length > 0) {
      const dependentLatestStarts = dependentTasks.map(depTask => {
        calculateLatestTimes(depTask.id, visited);
        return nodes.get(depTask.id)!.latestStart;
      });
      
      latestFinish = new Date(Math.min(...dependentLatestStarts.map(d => d.getTime())));
    }

    const duration = differenceInDays(task.end, task.start);
    const latestStart = addDays(latestFinish, -Math.max(1, duration));

    node.latestStart = latestStart;
    node.latestFinish = latestFinish;

    return latestFinish;
  };

  workTasks.forEach(task => calculateLatestTimes(task.id));

  // Calculate total float and identify critical path
  const criticalTasks: string[] = [];
  
  nodes.forEach((node, taskId) => {
    const totalFloat = differenceInDays(node.latestStart, node.earliestStart);
    node.totalFloat = totalFloat;
    node.isCritical = totalFloat <= 0;
    
    if (node.isCritical) {
      criticalTasks.push(taskId);
    }
  });

  return {
    nodes: Array.from(nodes.values()),
    criticalPath: criticalTasks,
    projectDuration: differenceInDays(projectEnd, projectStart),
    projectStart,
    projectEnd,
  };
};

/**
 * Detect resource conflicts and over-allocation
 */
export const detectResourceConflicts = (
  tasks: GanttTask[],
  resources: any[]
): ResourceConflict[] => {
  const conflicts: ResourceConflict[] = [];
  const resourceMap = new Map(resources.map(r => [r.id, r]));

  // Create allocation map by resource and date
  const allocationsByResourceAndDate: Map<string, Map<string, { tasks: string[], totalAllocation: number }>> = new Map();

  tasks.forEach(task => {
    if (!task.resources || task.resources.length === 0) return;

    const startDate = new Date(task.start);
    const endDate = new Date(task.end);
    
    // Iterate through each day of the task
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateKey = format(date, 'yyyy-MM-dd');
      
      task.resources.forEach(resourceId => {
        if (!allocationsByResourceAndDate.has(resourceId)) {
          allocationsByResourceAndDate.set(resourceId, new Map());
        }
        
        const resourceAllocations = allocationsByResourceAndDate.get(resourceId)!;
        
        if (!resourceAllocations.has(dateKey)) {
          resourceAllocations.set(dateKey, { tasks: [], totalAllocation: 0 });
        }
        
        const dayAllocation = resourceAllocations.get(dateKey)!;
        dayAllocation.tasks.push(task.id);
        
        // Assume equal distribution of hours across task duration
        const taskDays = Math.max(1, differenceInDays(endDate, startDate));
        const dailyHours = (task.estimatedHours || 8) / taskDays;
        dayAllocation.totalAllocation += dailyHours;
      });
    }
  });

  // Check for conflicts
  allocationsByResourceAndDate.forEach((dateAllocations, resourceId) => {
    const resource = resourceMap.get(resourceId);
    if (!resource) return;

    const capacity = resource.capacity || 8; // 8 hours default

    dateAllocations.forEach((allocation, dateKey) => {
      if (allocation.totalAllocation > capacity) {
        conflicts.push({
          resourceId,
          resourceName: resource.name,
          date: new Date(dateKey),
          conflictingTasks: allocation.tasks,
          totalAllocation: Math.round((allocation.totalAllocation / capacity) * 100),
          severity: allocation.totalAllocation > capacity * 1.5 ? 'critical' :
                   allocation.totalAllocation > capacity * 1.2 ? 'major' : 'minor',
        });
      }
    });
  });

  return conflicts;
};

/**
 * Calculate resource utilization
 */
export const calculateResourceUtilization = (
  tasks: GanttTask[],
  resources: any[],
  startDate: Date,
  endDate: Date
): Array<{
  resourceId: string;
  resourceName: string;
  totalCapacity: number;
  totalAllocated: number;
  utilizationRate: number;
  tasks: Array<{ taskId: string; taskName: string; allocation: number }>;
}> => {
  const resourceMap = new Map(resources.map(r => [r.id, r]));
  const utilization: Map<string, any> = new Map();

  // Initialize utilization data
  resources.forEach(resource => {
    utilization.set(resource.id, {
      resourceId: resource.id,
      resourceName: resource.name,
      totalCapacity: resource.capacity || 8,
      totalAllocated: 0,
      utilizationRate: 0,
      tasks: [],
    });
  });

  // Calculate allocations
  tasks.forEach(task => {
    if (!task.resources || task.resources.length === 0) return;
    
    // Check if task overlaps with date range
    const taskStart = new Date(Math.max(task.start.getTime(), startDate.getTime()));
    const taskEnd = new Date(Math.min(task.end.getTime(), endDate.getTime()));
    
    if (taskStart > taskEnd) return; // No overlap

    const overlapDays = Math.max(1, differenceInDays(taskEnd, taskStart));
    const totalTaskDays = Math.max(1, differenceInDays(task.end, task.start));
    const overlapRatio = overlapDays / totalTaskDays;

    task.resources.forEach(resourceId => {
      const util = utilization.get(resourceId);
      if (!util) return;

      const taskAllocation = (task.estimatedHours || 8) * overlapRatio;
      util.totalAllocated += taskAllocation;
      util.tasks.push({
        taskId: task.id,
        taskName: task.name,
        allocation: taskAllocation,
      });
    });
  });

  // Calculate utilization rates
  utilization.forEach(util => {
    const periodDays = Math.max(1, differenceInDays(endDate, startDate));
    const totalCapacity = util.totalCapacity * periodDays;
    util.totalCapacity = totalCapacity;
    util.utilizationRate = totalCapacity > 0 ? (util.totalAllocated / totalCapacity) * 100 : 0;
  });

  return Array.from(utilization.values());
};

/**
 * Auto-schedule tasks based on dependencies and resource availability
 */
export const autoScheduleTasks = (
  tasks: GanttTask[],
  resources: any[],
  projectStart: Date
): GanttTask[] => {
  const scheduledTasks = [...tasks];
  const resourceMap = new Map(resources.map(r => [r.id, r]));

  // Sort tasks by dependencies (topological sort)
  const sortedTasks = topologicalSort(scheduledTasks);

  // Schedule each task
  sortedTasks.forEach(task => {
    let earliestStart = projectStart;

    // Check dependency constraints
    if (task.dependencies && task.dependencies.length > 0) {
      const dependencyEndTimes = task.dependencies
        .map(depId => {
          const depTask = scheduledTasks.find(t => t.id === depId);
          return depTask ? depTask.end : projectStart;
        })
        .filter(date => date instanceof Date);

      if (dependencyEndTimes.length > 0) {
        earliestStart = new Date(Math.max(...dependencyEndTimes.map(d => d.getTime())));
      }
    }

    // Check resource availability
    if (task.resources && task.resources.length > 0) {
      const resourceAvailabilityStart = findEarliestResourceAvailability(
        task,
        scheduledTasks,
        resourceMap,
        earliestStart
      );
      earliestStart = new Date(Math.max(earliestStart.getTime(), resourceAvailabilityStart.getTime()));
    }

    // Update task dates
    const taskIndex = scheduledTasks.findIndex(t => t.id === task.id);
    if (taskIndex >= 0) {
      const duration = differenceInDays(task.end, task.start);
      scheduledTasks[taskIndex] = {
        ...task,
        start: earliestStart,
        end: addDays(earliestStart, Math.max(1, duration)),
      };
    }
  });

  return scheduledTasks;
};

/**
 * Topological sort for tasks based on dependencies
 */
const topologicalSort = (tasks: GanttTask[]): GanttTask[] => {
  const visited = new Set<string>();
  const temp = new Set<string>();
  const result: GanttTask[] = [];

  const visit = (taskId: string) => {
    if (temp.has(taskId)) {
      throw new Error('Circular dependency detected');
    }
    if (visited.has(taskId)) return;

    temp.add(taskId);
    
    const task = tasks.find(t => t.id === taskId);
    if (task && task.dependencies) {
      task.dependencies.forEach(depId => visit(depId));
    }
    
    temp.delete(taskId);
    visited.add(taskId);
    
    if (task) {
      result.unshift(task);
    }
  };

  tasks.forEach(task => {
    if (!visited.has(task.id)) {
      visit(task.id);
    }
  });

  return result;
};

/**
 * Find earliest resource availability
 */
const findEarliestResourceAvailability = (
  task: GanttTask,
  allTasks: GanttTask[],
  resourceMap: Map<string, any>,
  earliestStart: Date
): Date => {
  if (!task.resources || task.resources.length === 0) return earliestStart;

  const taskDuration = Math.max(1, differenceInDays(task.end, task.start));
  const requiredHours = task.estimatedHours || 8;

  // For each resource, find when they have enough capacity
  const resourceAvailabilityDates = task.resources.map(resourceId => {
    const resource = resourceMap.get(resourceId);
    if (!resource) return earliestStart;

    const capacity = resource.capacity || 8;
    let checkDate = new Date(earliestStart);

    // Find first available slot with enough capacity
    for (let attempts = 0; attempts < 365; attempts++) { // Limit search to 1 year
      const endDate = addDays(checkDate, taskDuration);
      
      // Check if resource has enough capacity during this period
      const conflictingTasks = allTasks.filter(otherTask => 
        otherTask.id !== task.id &&
        otherTask.resources?.includes(resourceId) &&
        otherTask.start < endDate &&
        otherTask.end > checkDate
      );

      const totalAllocated = conflictingTasks.reduce((sum, otherTask) => {
        const overlapStart = new Date(Math.max(otherTask.start.getTime(), checkDate.getTime()));
        const overlapEnd = new Date(Math.min(otherTask.end.getTime(), endDate.getTime()));
        const overlapDays = Math.max(0, differenceInDays(overlapEnd, overlapStart));
        const taskDays = Math.max(1, differenceInDays(otherTask.end, otherTask.start));
        const allocation = ((otherTask.estimatedHours || 8) / taskDays) * overlapDays;
        return sum + allocation;
      }, 0);

      if (totalAllocated + requiredHours <= capacity * taskDuration) {
        return checkDate;
      }

      checkDate = addDays(checkDate, 1);
    }

    return checkDate;
  });

  // Return the latest date among all required resources
  return new Date(Math.max(...resourceAvailabilityDates.map(d => d.getTime())));
};

/**
 * Generate baseline snapshot
 */
export const createBaseline = (tasks: GanttTask[], name: string): any => {
  return {
    id: `baseline-${Date.now()}`,
    name,
    createdAt: new Date(),
    tasks: tasks.map(task => ({ ...task })), // Deep copy
    description: `Baseline created on ${format(new Date(), 'PPP')}`,
  };
};

/**
 * Compare current tasks with baseline
 */
export const compareWithBaseline = (
  currentTasks: GanttTask[],
  baseline: any
): any[] => {
  if (!baseline || !baseline.tasks) return [];

  const comparisons: any[] = [];
  const baselineTaskMap = new Map(baseline.tasks.map((t: GanttTask) => [t.id, t]));

  currentTasks.forEach(currentTask => {
    const baselineTask = baselineTaskMap.get(currentTask.id);
    if (!baselineTask) {
      // New task not in baseline
      comparisons.push({
        taskId: currentTask.id,
        current: currentTask,
        baseline: null,
        variance: { start: 0, end: 0, progress: 0 },
        status: 'scope-changed',
      });
      return;
    }

    const startVariance = differenceInDays(currentTask.start, baselineTask.start);
    const endVariance = differenceInDays(currentTask.end, baselineTask.end);
    const progressVariance = currentTask.progress - baselineTask.progress;

    let status: 'on-track' | 'ahead' | 'behind' | 'scope-changed' = 'on-track';
    
    if (Math.abs(startVariance) > 2 || Math.abs(endVariance) > 2) {
      status = endVariance > 0 ? 'behind' : 'ahead';
    }
    
    if (currentTask.name !== baselineTask.name || 
        Math.abs(differenceInDays(currentTask.end, currentTask.start) - 
                 differenceInDays(baselineTask.end, baselineTask.start)) > 2) {
      status = 'scope-changed';
    }

    comparisons.push({
      taskId: currentTask.id,
      current: currentTask,
      baseline: baselineTask,
      variance: {
        start: startVariance,
        end: endVariance,
        progress: progressVariance,
      },
      status,
    });
  });

  return comparisons;
};
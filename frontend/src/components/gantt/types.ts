// Gantt Chart Types
export interface GanttTask {
  id: string;
  name: string;
  type: 'task' | 'milestone' | 'project';
  start: Date;
  end: Date;
  progress: number; // 0-100
  dependencies?: string[];
  resources?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled';
  parent?: string;
  project?: string;
  hideChildren?: boolean;
  displayOrder?: number;
  styles?: {
    backgroundColor?: string;
    backgroundSelectedColor?: string;
    progressColor?: string;
    progressSelectedColor?: string;
  };
  isDisabled?: boolean;
  fontSize?: string;
  fontStyle?: string;
}

export interface GanttProject {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'active' | 'completed' | 'on-hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  tasks: GanttTask[];
  resources: GanttResource[];
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  budget?: number;
  costToDate?: number;
}

export interface GanttResource {
  id: string;
  name: string;
  type: 'employee' | 'contractor' | 'equipment' | 'material';
  capacity: number; // hours per day/week
  cost: number; // hourly rate
  skills?: string[];
  department?: string;
  availability: GanttAvailability[];
}

export interface GanttAvailability {
  start: Date;
  end: Date;
  capacity: number; // available hours
  reason?: string; // vacation, meeting, etc.
}

export interface GanttDependency {
  from: string; // task id
  to: string; // task id
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
  lag?: number; // days
}

export interface GanttMilestone {
  id: string;
  name: string;
  date: Date;
  description?: string;
  isCompleted: boolean;
  taskId?: string; // related task
  type: 'project-start' | 'project-end' | 'phase-end' | 'delivery' | 'review' | 'custom';
}

export interface GanttViewOptions {
  viewMode: 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month' | 'Year';
  showProgress: boolean;
  showDependencies: boolean;
  showResources: boolean;
  showMilestones: boolean;
  showCriticalPath: boolean;
  showBaseline?: boolean;
  listCellWidth: string;
  columnWidth: number;
  rowHeight: number;
  barCornerRadius: number;
  handleWidth: number;
  fontSize: string;
  fontFamily: string;
  rtl: boolean;
}

export interface GanttColumn {
  field: keyof GanttTask | 'resources' | 'duration' | 'startDate' | 'endDate';
  title: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  formatter?: (value: any, task: GanttTask) => string;
  editor?: 'text' | 'date' | 'number' | 'select' | 'multiselect';
  editorOptions?: any;
}

export interface GanttExportOptions {
  format: 'pdf' | 'png' | 'svg' | 'excel' | 'csv';
  filename?: string;
  title?: string;
  author?: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
  pageOrientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'a3' | 'letter' | 'legal';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface GanttFilterOptions {
  showCompleted: boolean;
  showOnHold: boolean;
  showCancelled: boolean;
  resourceIds?: string[];
  startDateRange?: {
    start?: Date;
    end?: Date;
  };
  endDateRange?: {
    start?: Date;
    end?: Date;
  };
  priorities?: ('low' | 'medium' | 'high' | 'critical')[];
  searchText?: string;
  progressRange?: {
    min: number;
    max: number;
  };
}

export interface GanttSettings {
  theme: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    gridLine: string;
    weekend: string;
    holiday: string;
    today: string;
    selected: string;
    hover: string;
  };
  statusColors: {
    'not-started': string;
    'in-progress': string;
    'completed': string;
    'on-hold': string;
    'cancelled': string;
  };
  priorityColors: {
    low: string;
    medium: string;
    high: string;
    critical: string;
  };
}

export interface GanttContextMenuAction {
  id: string;
  label: string;
  icon?: string;
  action: (task: GanttTask) => void;
  disabled?: (task: GanttTask) => boolean;
  separator?: boolean;
}

export interface GanttEvent {
  type: 'task-click' | 'task-double-click' | 'task-select' | 'task-edit' | 'task-move' | 'task-resize' | 'dependency-create' | 'dependency-delete' | 'date-change' | 'progress-change';
  task?: GanttTask;
  dependency?: GanttDependency;
  originalEvent?: Event;
  newValue?: any;
  oldValue?: any;
}

export interface GanttValidationRule {
  id: string;
  name: string;
  validate: (task: GanttTask, allTasks: GanttTask[]) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// Transform functions
export interface ProjectToGanttTask {
  (project: any, allocations: any[]): GanttTask[];
}

export interface AllocationToGanttTask {
  (allocation: any, employee: any): GanttTask;
}

// Critical Path Analysis
export interface CriticalPathNode {
  taskId: string;
  earliestStart: Date;
  earliestFinish: Date;
  latestStart: Date;
  latestFinish: Date;
  totalFloat: number; // in days
  isCritical: boolean;
}

export interface CriticalPathAnalysis {
  nodes: CriticalPathNode[];
  criticalPath: string[]; // array of task IDs
  projectDuration: number; // in days
  projectStart: Date;
  projectEnd: Date;
}

// Baseline comparison
export interface GanttBaseline {
  id: string;
  name: string;
  createdAt: Date;
  tasks: GanttTask[];
  description?: string;
}

export interface BaselineComparison {
  taskId: string;
  current: GanttTask;
  baseline: GanttTask;
  variance: {
    start: number; // days difference
    end: number; // days difference  
    progress: number; // percentage difference
  };
  status: 'on-track' | 'ahead' | 'behind' | 'scope-changed';
}

// Resource allocation and conflicts
export interface ResourceConflict {
  resourceId: string;
  resourceName: string;
  date: Date;
  conflictingTasks: string[];
  totalAllocation: number; // percentage over 100%
  severity: 'minor' | 'major' | 'critical';
}

export interface ResourceAllocation {
  taskId: string;
  resourceId: string;
  allocation: number; // percentage 0-100
  startDate: Date;
  endDate: Date;
}

// Default theme configuration
export const DEFAULT_GANTT_THEME: GanttSettings = {
  theme: 'light',
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    gridLine: '#f1f5f9',
    weekend: '#f8fafc',
    holiday: '#fef3c7',
    today: '#dbeafe',
    selected: '#3b82f6',
    hover: '#e2e8f0',
  },
  statusColors: {
    'not-started': '#64748b',
    'in-progress': '#3b82f6',
    'completed': '#10b981',
    'on-hold': '#f59e0b',
    'cancelled': '#ef4444',
  },
  priorityColors: {
    low: '#64748b',
    medium: '#3b82f6',
    high: '#f59e0b',
    critical: '#ef4444',
  },
};

// Default view options
export const DEFAULT_VIEW_OPTIONS: GanttViewOptions = {
  viewMode: 'Day',
  showProgress: true,
  showDependencies: true,
  showResources: true,
  showMilestones: true,
  showCriticalPath: true,
  showBaseline: false,
  listCellWidth: '155px',
  columnWidth: 65,
  rowHeight: 50,
  barCornerRadius: 3,
  handleWidth: 8,
  fontSize: '14px',
  fontFamily: 'Arial, sans-serif',
  rtl: false,
};
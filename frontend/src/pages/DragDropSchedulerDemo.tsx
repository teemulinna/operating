import React, { useState, useEffect } from 'react';
import { DragDropScheduler } from '../components/allocation/DragDropScheduler';
import useDragDropScheduler from '../hooks/useDragDropScheduler';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { useToast } from '../components/ui/use-toast';
import {
  Calendar,
  Users,
  Briefcase,
  AlertTriangle,
  Download,
  Upload,
  RotateCcw,
  Settings,
  Zap
} from 'lucide-react';
import { DragDropAllocation, AllocationConflict } from '../types/allocation';
import { apiService } from '../services/api';

// Define local types matching Employee and Project for mock data
interface MockEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  departmentId: string;
  position: string;
  salary: number;
  startDate: string;
  status: 'active' | 'inactive';
  skills: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MockProject {
  id: number;
  name: string;
  description?: string;
  clientName?: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  endDate?: string;
  budget?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Mock data for demonstration
const mockEmployees: MockEmployee[] = [
  {
    id: '1',
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice@company.com',
    phone: '555-0101',
    department: 'Engineering',
    departmentId: 'dept-1',
    position: 'Senior Developer',
    salary: 120000,
    startDate: '2022-01-15',
    status: 'active',
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    firstName: 'Bob',
    lastName: 'Smith',
    email: 'bob@company.com',
    phone: '555-0102',
    department: 'Engineering',
    departmentId: 'dept-1',
    position: 'Full-Stack Developer',
    salary: 110000,
    startDate: '2022-03-20',
    status: 'active',
    skills: ['Vue.js', 'Python', 'PostgreSQL', 'Docker'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    firstName: 'Carol',
    lastName: 'Wilson',
    email: 'carol@company.com',
    phone: '555-0103',
    department: 'Design',
    departmentId: 'dept-2',
    position: 'UI/UX Designer',
    salary: 95000,
    startDate: '2021-11-10',
    status: 'active',
    skills: ['Figma', 'Sketch', 'Adobe XD', 'User Research'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    firstName: 'David',
    lastName: 'Brown',
    email: 'david@company.com',
    phone: '555-0104',
    department: 'Engineering',
    departmentId: 'dept-1',
    position: 'DevOps Engineer',
    salary: 115000,
    startDate: '2022-05-01',
    status: 'active',
    skills: ['AWS', 'Kubernetes', 'Terraform', 'Jenkins'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockProjects: MockProject[] = [
  {
    id: 1,
    name: 'E-commerce Platform v2.0',
    description: 'Complete overhaul of the existing e-commerce platform',
    status: 'active',
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    budget: 250000,
    priority: 'high',
    clientName: 'TechCorp Inc.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Mobile App Development',
    description: 'Cross-platform mobile app using React Native',
    status: 'active',
    startDate: '2024-02-01',
    endDate: '2024-08-31',
    budget: 180000,
    priority: 'medium',
    clientName: 'StartupXYZ',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Data Analytics Dashboard',
    description: 'Real-time analytics dashboard for business intelligence',
    status: 'planning',
    startDate: '2024-03-01',
    endDate: '2024-09-30',
    budget: 150000,
    priority: 'medium',
    clientName: 'DataCorp',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Security Audit & Improvements',
    description: 'Comprehensive security review and implementation',
    status: 'active',
    startDate: '2024-01-15',
    endDate: '2024-04-15',
    budget: 80000,
    priority: 'critical',
    clientName: 'SecureTech',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockAllocations: DragDropAllocation[] = [
  {
    id: '1',
    allocationId: '1',
    employeeId: '1',
    projectId: '1',
    hours: 32,
    allocatedHours: 32,
    startDate: '2024-01-15',
    endDate: '2024-01-19',
    originalStartDate: '2024-01-15',
    originalEndDate: '2024-01-19',
    newStartDate: '2024-01-15',
    newEndDate: '2024-01-19',
    status: 'active',
    notes: 'Working on frontend components',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    allocationId: '2',
    employeeId: '1',
    projectId: '4',
    hours: 16,
    allocatedHours: 16,
    startDate: '2024-01-15',
    endDate: '2024-01-17',
    originalStartDate: '2024-01-15',
    originalEndDate: '2024-01-17',
    newStartDate: '2024-01-15',
    newEndDate: '2024-01-17',
    status: 'active',
    notes: 'Security code review',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    allocationId: '3',
    employeeId: '2',
    projectId: '2',
    hours: 40,
    allocatedHours: 40,
    startDate: '2024-01-15',
    endDate: '2024-01-19',
    originalStartDate: '2024-01-15',
    originalEndDate: '2024-01-19',
    newStartDate: '2024-01-15',
    newEndDate: '2024-01-19',
    status: 'active',
    notes: 'Backend API development',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    allocationId: '4',
    employeeId: '3',
    projectId: '1',
    hours: 28,
    allocatedHours: 28,
    startDate: '2024-01-15',
    endDate: '2024-01-18',
    originalStartDate: '2024-01-15',
    originalEndDate: '2024-01-18',
    newStartDate: '2024-01-15',
    newEndDate: '2024-01-18',
    status: 'active',
    notes: 'UI/UX design for checkout flow',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    allocationId: '5',
    employeeId: '4',
    projectId: '4',
    hours: 35,
    allocatedHours: 35,
    startDate: '2024-01-15',
    endDate: '2024-01-19',
    originalStartDate: '2024-01-15',
    originalEndDate: '2024-01-19',
    newStartDate: '2024-01-15',
    newEndDate: '2024-01-19',
    status: 'active',
    notes: 'Infrastructure security improvements',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DragDropSchedulerDemo: React.FC = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<MockEmployee[]>(mockEmployees);
  const [projects, setProjects] = useState<MockProject[]>(mockProjects);
  const [viewMode] = useState<'week' | 'month' | 'quarter'>('week');
  const [selectedDate] = useState(new Date());
  const [showDemo, setShowDemo] = useState(true);

  const {
    allocations,
    resourceLanes,
    conflicts,
    selectionState,
    isLoading,
    handleAllocationDelete,
    clearSelection,
    selectAll,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    refreshData,
    exportData,
  } = useDragDropScheduler({
    employees: employees as any,
    projects: projects as any,
    initialAllocations: mockAllocations,
    viewMode,
    selectedDate,
    onAllocationChange: (newAllocations: DragDropAllocation[]) => {
      console.log('Allocations changed:', newAllocations);
    },
    onConflictDetected: (newConflicts: AllocationConflict[]) => {
      console.log('Conflicts detected:', newConflicts);
    },
  });

  // Load real data if available
  const loadRealData = async () => {
    try {
      const [employeesData, projectsData] = await Promise.all([
        apiService.getEmployees(),
        apiService.getProjects(),
        apiService.getAllocations(),
      ]);

      setEmployees(employeesData as any);
      setProjects(projectsData as any);
      setShowDemo(false);

      toast({
        title: 'Data Loaded',
        description: 'Successfully loaded real data from the API',
      });
    } catch (error) {
      console.log('Using demo data - API not available');
      toast({
        title: 'Using Demo Data',
        description: 'API not available, showing demo data instead',
      });
    }
  };

  // Initialize with real or demo data
  useEffect(() => {
    loadRealData();
  }, []);

  const handleExport = (format: 'json' | 'csv') => {
    const data = exportData(format);
    const blob = new Blob([data], {
      type: format === 'json' ? 'application/json' : 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resource-allocation-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: `Data exported as ${format.toUpperCase()}`,
    });
  };

  const statsData = {
    totalEmployees: employees.length,
    totalProjects: projects.length,
    totalAllocations: allocations.length,
    totalConflicts: conflicts.length,
    averageUtilization: resourceLanes.length > 0
      ? Math.round(resourceLanes.reduce((sum: number, lane: any) => sum + lane.utilization, 0) / resourceLanes.length)
      : 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
                <Zap className="h-8 w-8 text-primary" />
                <span>Drag & Drop Resource Scheduler</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Interactive resource allocation with visual conflict detection
              </p>
            </div>

            {showDemo && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Demo Mode
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{statsData.totalEmployees}</div>
                  <div className="text-sm text-gray-500">Employees</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{statsData.totalProjects}</div>
                  <div className="text-sm text-gray-500">Projects</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{statsData.totalAllocations}</div>
                  <div className="text-sm text-gray-500">Allocations</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className={`h-5 w-5 ${
                  statsData.totalConflicts > 0 ? 'text-red-500' : 'text-gray-400'
                }`} />
                <div>
                  <div className="text-2xl font-bold">{statsData.totalConflicts}</div>
                  <div className="text-sm text-gray-500">Conflicts</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{statsData.averageUtilization}%</div>
                  <div className="text-sm text-gray-500">Avg. Utilization</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Action bar */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={!canUndo || isLoading}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Undo
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={!canRedo || isLoading}
                >
                  Redo
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectionState.selectedAllocations.size === 0}
                >
                  Clear Selection
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={allocations.length === 0}
                >
                  Select All
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>

              <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
                <Download className="h-4 w-4 mr-1" />
                Export JSON
              </Button>

              <Button variant="outline" size="sm" onClick={refreshData}>
                <Upload className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Selection info */}
        {selectionState.selectedAllocations.size > 0 && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-700">
                <strong>{selectionState.selectedAllocations.size}</strong> allocations selected
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={clearSelection}>
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    // Handle bulk delete - pass array of indices
                    const indicesToDelete = Array.from(selectionState.selectedAllocations);
                    await handleAllocationDelete(indicesToDelete);
                    clearSelection();
                  }}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Main scheduler */}
        <Card className="p-6 min-h-96">
          <DragDropScheduler
            employees={employees as any}
            projects={projects as any}
            allocations={allocations}
            onAllocationChange={(newAllocations) => {
              console.log('Scheduler allocation change:', newAllocations);
            }}
            onConflictDetected={(newConflicts) => {
              console.log('Scheduler conflict detection:', newConflicts);
            }}
            viewMode={viewMode}
            selectedDate={selectedDate}
            readOnly={false}
          />
        </Card>

        {/* Features showcase */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">✨ Features Showcase</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">🖱️ Drag & Drop</h3>
              <p className="text-sm text-gray-600">
                Drag allocation cards between employees and time periods with visual feedback.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">⚠️ Conflict Detection</h3>
              <p className="text-sm text-gray-600">
                Real-time detection of over-allocations, overlaps, and skill mismatches.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">🔄 Undo/Redo</h3>
              <p className="text-sm text-gray-600">
                Complete operation history with undo/redo support for all changes.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">📊 Capacity Tracking</h3>
              <p className="text-sm text-gray-600">
                Visual capacity indicators with utilization percentages and warnings.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">🎯 Multi-Selection</h3>
              <p className="text-sm text-gray-600">
                Select multiple allocations for bulk operations and management.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">📅 Flexible Views</h3>
              <p className="text-sm text-gray-600">
                Switch between week, month, and quarter views for different planning horizons.
              </p>
            </div>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6 bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">🚀 How to Use</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <strong>Drag allocations</strong>: Click and drag allocation cards between employees</p>
            <p>• <strong>Select multiple</strong>: Hold Ctrl/Cmd while clicking to select multiple allocations</p>
            <p>• <strong>Create allocations</strong>: Click "Add Allocation" button on resource lanes</p>
            <p>• <strong>Edit details</strong>: Click the menu (⋮) on allocation cards for options</p>
            <p>• <strong>View conflicts</strong>: Red/yellow indicators show over-allocations and conflicts</p>
            <p>• <strong>Export data</strong>: Use the export buttons to download allocation data</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DragDropSchedulerDemo;

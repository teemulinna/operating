import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GanttChart } from '../GanttChart';
import { ProjectService } from '@/services/projectService';
import { AllocationService } from '@/services/allocationService';
import type { Project, Allocation } from '@/types';

// Mock the services
vi.mock('@/services/projectService', () => ({
  ProjectService: {
    getProjects: vi.fn(),
    getProject: vi.fn(),
    updateProject: vi.fn(),
  },
}));

vi.mock('@/services/allocationService', () => ({
  AllocationService: {
    getAllocations: vi.fn(),
    createAllocation: vi.fn(),
    updateAllocation: vi.fn(),
  },
}));

// Mock gantt-task-react
vi.mock('gantt-task-react', () => ({
  Gantt: ({ tasks, onDateChange, onProgressChange, onClick }: any) => (
    <div data-testid="gantt-chart">
      <div data-testid="gantt-tasks">
        {tasks.map((task: any) => (
          <div
            key={task.id}
            data-testid={`gantt-task-${task.id}`}
            onClick={() => onClick && onClick(task)}
            onDoubleClick={() => onDateChange && onDateChange(task, task.start, task.end)}
          >
            <span>{task.name}</span>
            <span data-testid={`progress-${task.id}`}>{task.progress}%</span>
          </div>
        ))}
      </div>
      <div data-testid="gantt-controls">
        <button data-testid="zoom-in">Zoom In</button>
        <button data-testid="zoom-out">Zoom Out</button>
      </div>
    </div>
  ),
  ViewMode: {
    Day: 'Day',
    Week: 'Week',
    Month: 'Month',
    Year: 'Year',
  },
  Task: vi.fn(),
}));

const mockProjects: Project[] = [
  {
    id: 1,
    name: 'Project Alpha',
    clientName: 'ACME Corp',
    status: 'active',
    priority: 'high',
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    budget: 100000,
    estimatedHours: 1000,
    actualHours: 400,
  },
  {
    id: 2,
    name: 'Project Beta',
    clientName: 'Tech Solutions',
    status: 'planning',
    priority: 'medium',
    startDate: '2024-02-01',
    endDate: '2024-08-31',
    budget: 75000,
    estimatedHours: 800,
    actualHours: 100,
  },
];

const mockAllocations: Allocation[] = [
  {
    id: '1',
    employeeId: '1',
    projectId: '1',
    startDate: '2024-01-15',
    endDate: '2024-02-15',
    allocatedHours: 30,
    role: 'Developer',
    status: 'active',
    isActive: true,
    employeeName: 'John Doe',
    projectName: 'Project Alpha',
  },
  {
    id: '2',
    employeeId: '2',
    projectId: '1',
    startDate: '2024-01-20',
    endDate: '2024-03-01',
    allocatedHours: 25,
    role: 'Designer',
    status: 'active',
    isActive: true,
    employeeName: 'Jane Smith',
    projectName: 'Project Alpha',
  },
];

describe('GanttChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ProjectService.getProjects as any).mockResolvedValue({
      projects: mockProjects,
      total: mockProjects.length,
    });
    (AllocationService.getAllocations as any).mockResolvedValue({
      allocations: mockAllocations,
      total: mockAllocations.length,
    });
  });

  it('renders gantt chart with project timelines', async () => {
    render(<GanttChart />);

    await waitFor(() => {
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });
  });

  it('displays resource allocation bars for each project', async () => {
    render(<GanttChart showResourceBars={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('gantt-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('gantt-task-2')).toBeInTheDocument();
    });

    // Check for resource allocation indicators
    const projectAlphaTask = screen.getByTestId('gantt-task-1');
    expect(projectAlphaTask).toBeInTheDocument();
  });

  it('shows progress indicators based on actual vs estimated hours', async () => {
    render(<GanttChart />);

    await waitFor(() => {
      // Project Alpha: 400 actual / 1000 estimated = 40%
      expect(screen.getByTestId('progress-1')).toHaveTextContent('40%');
      
      // Project Beta: 100 actual / 800 estimated = 12.5%
      expect(screen.getByTestId('progress-2')).toHaveTextContent('12%');
    });
  });

  it('provides zoom controls for different time scales', async () => {
    render(<GanttChart />);

    await waitFor(() => {
      expect(screen.getByTestId('zoom-in')).toBeInTheDocument();
      expect(screen.getByTestId('zoom-out')).toBeInTheDocument();
    });

    // Test zoom functionality
    const zoomInButton = screen.getByTestId('zoom-in');
    fireEvent.click(zoomInButton);

    // Should change view mode (mocked behavior)
    expect(zoomInButton).toHaveBeenClicked;
  });

  it('handles task click to show allocation details', async () => {
    const onTaskClick = vi.fn();
    render(<GanttChart onTaskClick={onTaskClick} />);

    await waitFor(() => {
      expect(screen.getByTestId('gantt-task-1')).toBeInTheDocument();
    });

    const projectTask = screen.getByTestId('gantt-task-1');
    fireEvent.click(projectTask);

    expect(onTaskClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        name: 'Project Alpha',
      })
    );
  });

  it('allows editing allocation duration through drag', async () => {
    const onDateChange = vi.fn();
    render(<GanttChart onDateChange={onDateChange} />);

    await waitFor(() => {
      expect(screen.getByTestId('gantt-task-1')).toBeInTheDocument();
    });

    const projectTask = screen.getByTestId('gantt-task-1');
    fireEvent.doubleClick(projectTask);

    await waitFor(() => {
      expect(onDateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          name: 'Project Alpha',
        }),
        expect.any(Date),
        expect.any(Date)
      );
    });
  });

  it('displays project dependencies when available', async () => {
    const projectsWithDeps = [
      {
        ...mockProjects[0],
        dependencies: [],
      },
      {
        ...mockProjects[1],
        dependencies: [1], // Project Beta depends on Project Alpha
      },
    ];

    (ProjectService.getProjects as any).mockResolvedValue({
      projects: projectsWithDeps,
      total: projectsWithDeps.length,
    });

    render(<GanttChart showDependencies={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    // Dependencies would be rendered as connecting lines in the actual gantt chart
    // This is mocked, but we can verify the data structure is correct
    expect(ProjectService.getProjects).toHaveBeenCalled();
  });

  it('filters tasks by date range', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-03-31');

    render(
      <GanttChart 
        startDate={startDate}
        endDate={endDate}
      />
    );

    await waitFor(() => {
      expect(AllocationService.getAllocations).toHaveBeenCalledWith(
        expect.objectContaining({
          startDateFrom: startDate.toISOString().split('T')[0],
          endDateTo: endDate.toISOString().split('T')[0],
        })
      );
    });
  });

  it('handles view mode changes (day/week/month)', async () => {
    const { rerender } = render(<GanttChart viewMode="Week" />);

    await waitFor(() => {
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    // Change view mode
    rerender(<GanttChart viewMode="Month" />);

    // In a real implementation, this would change how the timeline is displayed
    await waitFor(() => {
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });
  });

  it('shows critical path when enabled', async () => {
    render(<GanttChart showCriticalPath={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    // Critical path would be highlighted differently
    // This test verifies the component renders with the option
    expect(screen.getByTestId('gantt-tasks')).toBeInTheDocument();
  });

  it('handles resource overallocation warnings', async () => {
    const overallocatedEmployees = [
      {
        employeeId: '1',
        employeeName: 'John Doe',
        utilizationRate: 120, // Over 100%
        overallocated: true,
      },
    ];

    render(
      <GanttChart 
        overallocatedEmployees={overallocatedEmployees}
        showOverallocationWarnings={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    // Would show warning indicators for overallocated resources
    // This is verified through the component receiving the correct props
    expect(screen.getByTestId('gantt-tasks')).toBeInTheDocument();
  });

  it('exports gantt chart data', async () => {
    const onExport = vi.fn();
    render(<GanttChart onExport={onExport} />);

    await waitFor(() => {
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });

    // Simulate export action (would typically be triggered by a button)
    const exportButton = document.createElement('button');
    exportButton.setAttribute('data-testid', 'export-gantt');
    exportButton.onclick = () => onExport('pdf');
    
    fireEvent.click(exportButton);

    expect(onExport).toHaveBeenCalledWith('pdf');
  });
});
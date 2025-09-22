import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ResourceTimeline } from '../ResourceTimeline';
import { AllocationService } from '@/services/allocationService';
import type { Allocation, Employee, EmployeeUtilization } from '@/types';

// Mock the allocation service
vi.mock('@/services/allocationService', () => ({
  AllocationService: {
    getMultipleEmployeeUtilization: vi.fn(),
    getAllocations: vi.fn(),
    updateAllocation: vi.fn(),
    bulkUpdateAllocations: vi.fn(),
  },
}));

// Mock react-dnd for drag functionality
vi.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, vi.fn(), vi.fn()],
  useDrop: () => [{ isOver: false }, vi.fn()],
  DndProvider: ({ children }: any) => <div data-testid="dnd-provider">{children}</div>,
}));

vi.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}));

const mockEmployees: Employee[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    position: 'Frontend Developer',
    departmentId: 'dev',
    salary: 80000,
    hireDate: new Date('2023-01-01'),
    status: 'active',
    skills: ['React', 'TypeScript'],
    weeklyCapacity: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    position: 'Backend Developer',
    departmentId: 'dev',
    salary: 85000,
    hireDate: new Date('2023-01-01'),
    status: 'active',
    skills: ['Node.js', 'Python'],
    weeklyCapacity: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockUtilization: Record<string, EmployeeUtilization> = {
  '1': {
    employeeId: '1',
    employeeName: 'John Doe',
    weeklyCapacity: 40,
    allocatedHours: 32,
    availableHours: 8,
    utilizationRate: 80,
    overallocated: false,
    conflicts: [],
    allocations: [
      {
        id: '1',
        employeeId: '1',
        projectId: '1',
        startDate: '2024-01-15',
        endDate: '2024-02-15',
        allocatedHours: 20,
        role: 'Developer',
        status: 'active',
        isActive: true,
        projectName: 'Project Alpha',
        clientName: 'ACME Corp',
      },
      {
        id: '2',
        employeeId: '1',
        projectId: '2',
        startDate: '2024-02-01',
        endDate: '2024-03-01',
        allocatedHours: 12,
        role: 'Consultant',
        status: 'active',
        isActive: true,
        projectName: 'Project Beta',
        clientName: 'Tech Solutions',
      },
    ],
  },
  '2': {
    employeeId: '2',
    employeeName: 'Jane Smith',
    weeklyCapacity: 40,
    allocatedHours: 48,
    availableHours: -8,
    utilizationRate: 120,
    overallocated: true,
    conflicts: [
      {
        id: 'conflict-1',
        type: 'overallocation',
        severity: 'high',
        description: 'Over 100% utilization',
        affectedAllocations: ['3'],
        canAutoResolve: false,
      },
    ],
    allocations: [
      {
        id: '3',
        employeeId: '2',
        projectId: '1',
        startDate: '2024-01-20',
        endDate: '2024-03-01',
        allocatedHours: 30,
        role: 'Backend Developer',
        status: 'active',
        isActive: true,
        projectName: 'Project Alpha',
        clientName: 'ACME Corp',
      },
      {
        id: '4',
        employeeId: '2',
        projectId: '3',
        startDate: '2024-02-15',
        endDate: '2024-04-15',
        allocatedHours: 18,
        role: 'API Developer',
        status: 'active',
        isActive: true,
        projectName: 'Project Gamma',
        clientName: 'StartupCo',
      },
    ],
  },
};

describe('ResourceTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AllocationService.getMultipleEmployeeUtilization as any).mockResolvedValue(mockUtilization);
  });

  it('renders horizontal timeline for each employee', async () => {
    render(
      <ResourceTimeline
        employees={mockEmployees}
        startDate="2024-01-01"
        endDate="2024-03-31"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Check for timeline structure
    expect(screen.getByTestId('dnd-provider')).toBeInTheDocument();
    expect(screen.getAllByTestId(/employee-timeline-/)).toHaveLength(2);
  });

  it('displays project blocks with allocation percentages', async () => {
    render(
      <ResourceTimeline
        employees={mockEmployees}
        startDate="2024-01-01"
        endDate="2024-03-31"
      />
    );

    await waitFor(() => {
      // John Doe allocations
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument(); // 20/40 hours
      expect(screen.getByText('30%')).toBeInTheDocument(); // 12/40 hours
    });

    await waitFor(() => {
      // Jane Smith allocations
      expect(screen.getByText('75%')).toBeInTheDocument(); // 30/40 hours
      expect(screen.getByText('45%')).toBeInTheDocument(); // 18/40 hours
    });
  });

  it('shows overallocation warnings with visual indicators', async () => {
    render(
      <ResourceTimeline
        employees={mockEmployees}
        startDate="2024-01-01"
        endDate="2024-03-31"
      />
    );

    await waitFor(() => {
      // Jane Smith is overallocated (120% utilization)
      const janeTimeline = screen.getByTestId('employee-timeline-2');
      expect(janeTimeline).toHaveClass('overallocated');
      
      // Should show warning indicator
      expect(screen.getByTestId('overallocation-warning-2')).toBeInTheDocument();
      expect(screen.getByText('120%')).toBeInTheDocument();
    });
  });

  it('handles drag to adjust allocation duration', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      allocation: mockUtilization['1'].allocations[0],
      conflicts: [],
    });

    (AllocationService.updateAllocation as any).mockImplementation(mockUpdate);

    render(
      <ResourceTimeline
        employees={mockEmployees}
        startDate="2024-01-01"
        endDate="2024-03-31"
        onAllocationUpdated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    // Simulate drag operation on allocation block
    const allocationBlock = screen.getByTestId('allocation-block-1');
    
    // Simulate drag start
    fireEvent.dragStart(allocationBlock, {
      dataTransfer: {
        setData: vi.fn(),
      },
    });

    // Simulate drag end (resize allocation)
    fireEvent.dragEnd(allocationBlock, {
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({
          allocationId: '1',
          originalEndDate: '2024-02-15',
          newEndDate: '2024-02-29',
        })),
      },
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          endDate: '2024-02-29',
        })
      );
    });
  });

  it('displays utilization percentage for each employee', async () => {
    render(
      <ResourceTimeline
        employees={mockEmployees}
        startDate="2024-01-01"
        endDate="2024-03-31"
        showUtilizationBars={true}
      />
    );

    await waitFor(() => {
      // John Doe: 80% utilization
      expect(screen.getByText('80%')).toBeInTheDocument();
      
      // Jane Smith: 120% utilization (overallocated)
      expect(screen.getByText('120%')).toBeInTheDocument();
    });

    // Check for utilization bars
    expect(screen.getByTestId('utilization-bar-1')).toBeInTheDocument();
    expect(screen.getByTestId('utilization-bar-2')).toBeInTheDocument();
  });

  it('supports zoom in and out for different time scales', async () => {
    const { rerender } = render(
      <ResourceTimeline
        employees={mockEmployees}
        startDate="2024-01-01"
        endDate="2024-03-31"
        timeScale="week"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('timeline-scale-week')).toBeInTheDocument();
    });

    // Change to day scale
    rerender(
      <ResourceTimeline
        employees={mockEmployees}
        startDate="2024-01-01"
        endDate="2024-03-31"
        timeScale="day"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('timeline-scale-day')).toBeInTheDocument();
    });
  });

  it('handles allocation block clicks to show details', async () => {
    const onAllocationClick = vi.fn();

    render(
      <ResourceTimeline
        employees={mockEmployees}
        startDate="2024-01-01"
        endDate="2024-03-31"
        onAllocationClick={onAllocationClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('allocation-block-1')).toBeInTheDocument();
    });

    const allocationBlock = screen.getByTestId('allocation-block-1');
    fireEvent.click(allocationBlock);

    expect(onAllocationClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        projectName: 'Project Alpha',
        allocatedHours: 20,
      })
    );
  });

  it('shows available capacity gaps', async () => {
    render(
      <ResourceTimeline
        employees={mockEmployees}
        startDate="2024-01-01"
        endDate="2024-03-31"
        showAvailableCapacity={true}
      />
    );

    await waitFor(() => {
      // John Doe has 8 hours available (20% of 40 hours)
      expect(screen.getByTestId('available-capacity-1')).toBeInTheDocument();
      expect(screen.getByText('8h available')).toBeInTheDocument();
    });
  });

  it('filters allocations by project when specified', async () => {
    render(
      <ResourceTimeline
        employees={mockEmployees}
        startDate="2024-01-01"
        endDate="2024-03-31"
        projectFilter="1"
      />
    );

    await waitFor(() => {
      // Should only show allocations for Project Alpha (ID: 1)
      expect(screen.getAllByText('Project Alpha')).toHaveLength(2); // John and Jane both have allocations
      expect(screen.queryByText('Project Beta')).not.toBeInTheDocument();
    });
  });

  it('handles timeline scroll and navigation', async () => {
    render(
      <ResourceTimeline
        employees={mockEmployees}
        startDate="2024-01-01"
        endDate="2024-12-31"
        onTimeRangeChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('timeline-scroll-container')).toBeInTheDocument();
    });

    const scrollContainer = screen.getByTestId('timeline-scroll-container');
    
    // Simulate horizontal scroll
    fireEvent.scroll(scrollContainer, {
      target: { scrollLeft: 500 },
    });

    expect(scrollContainer).toHaveProperty('scrollLeft', 500);
  });

  it('displays conflict indicators and tooltips', async () => {
    render(
      <ResourceTimeline
        employees={mockEmployees}
        startDate="2024-01-01"
        endDate="2024-03-31"
        showConflicts={true}
      />
    );

    await waitFor(() => {
      // Jane Smith has conflicts
      expect(screen.getByTestId('conflict-indicator-2')).toBeInTheDocument();
    });

    const conflictIndicator = screen.getByTestId('conflict-indicator-2');
    fireEvent.mouseEnter(conflictIndicator);

    await waitFor(() => {
      expect(screen.getByText('Over 100% utilization')).toBeInTheDocument();
    });
  });
});
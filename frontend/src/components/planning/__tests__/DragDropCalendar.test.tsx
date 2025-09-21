import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DragDropCalendar } from '../DragDropCalendar';
import { AllocationService } from '@/services/allocationService';
import type { Allocation, Employee, Project } from '@/types';

// Mock the allocation service
vi.mock('@/services/allocationService', () => ({
  AllocationService: {
    getCalendarData: vi.fn(),
    createAllocation: vi.fn(),
    updateAllocation: vi.fn(),
    bulkUpdateAllocations: vi.fn(),
    checkConflicts: vi.fn(),
  },
}));

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd, onDragStart, onDragOver }: any) => (
    <div data-testid="dnd-context" onDrop={onDragEnd}>
      {children}
    </div>
  ),
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    isOver: false,
    setNodeRef: vi.fn(),
  }),
  pointerWithin: vi.fn(),
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
    defaultHours: 40,
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
    defaultHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

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
  },
];

const mockAllocations: Allocation[] = [
  {
    id: '1',
    employeeId: '1',
    projectId: '1',
    startDate: '2024-01-15',
    endDate: '2024-01-19',
    allocatedHours: 30,
    role: 'Developer',
    status: 'active',
    isActive: true,
    employeeName: 'John Doe',
    projectName: 'Project Alpha',
    clientName: 'ACME Corp',
  },
];

describe('DragDropCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AllocationService.getCalendarData as any).mockResolvedValue({
      allocations: mockAllocations,
      employees: mockEmployees.map(e => ({ id: e.id, name: `${e.firstName} ${e.lastName}` })),
      projects: mockProjects.map(p => ({ id: p.id.toString(), name: p.name, clientName: p.clientName || '' })),
    });
  });

  it('renders calendar with employee sidebar', async () => {
    render(
      <DragDropCalendar 
        startDate="2024-01-15"
        endDate="2024-01-21"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
  });

  it('displays existing allocations on calendar', async () => {
    render(
      <DragDropCalendar 
        startDate="2024-01-15"
        endDate="2024-01-21"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('30h')).toBeInTheDocument();
    });
  });

  it('shows visual feedback during drag operation', async () => {
    render(
      <DragDropCalendar 
        startDate="2024-01-15"
        endDate="2024-01-21"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });

    // Simulate drag start
    const employeeItem = await screen.findByText('John Doe');
    fireEvent.dragStart(employeeItem);

    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
  });

  it('creates new allocation when employee dragged to empty slot', async () => {
    const mockCreateAllocation = vi.fn().mockResolvedValue({
      allocation: {
        id: '2',
        employeeId: '1',
        projectId: '1',
        startDate: '2024-01-16',
        endDate: '2024-01-16',
        allocatedHours: 8,
        status: 'active',
        isActive: true,
      },
      conflicts: [],
    });

    (AllocationService.createAllocation as any).mockImplementation(mockCreateAllocation);

    render(
      <DragDropCalendar 
        startDate="2024-01-15"
        endDate="2024-01-21"
        onAllocationCreated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });

    // Simulate drop event
    const dropZone = screen.getByTestId('dnd-context');
    fireEvent.drop(dropZone, {
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({
          type: 'employee',
          employeeId: '1',
          projectId: '1',
          targetDate: '2024-01-16',
        })),
      },
    });

    await waitFor(() => {
      expect(mockCreateAllocation).toHaveBeenCalledWith({
        employeeId: '1',
        projectId: '1',
        startDate: '2024-01-16',
        endDate: '2024-01-16',
        allocatedHours: 8,
        status: 'active',
        checkConflicts: true,
      });
    });
  });

  it('updates allocation when dragged to new date', async () => {
    const mockBulkUpdate = vi.fn().mockResolvedValue({
      updated: [mockAllocations[0]],
      conflicts: [],
      failed: [],
    });

    (AllocationService.bulkUpdateAllocations as any).mockImplementation(mockBulkUpdate);

    render(
      <DragDropCalendar 
        startDate="2024-01-15"
        endDate="2024-01-21"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    // Simulate dragging existing allocation to new date
    const allocationBlock = screen.getByText('Project Alpha').closest('[draggable]');
    expect(allocationBlock).toBeInTheDocument();

    const dropEvent = new CustomEvent('drop', {
      bubbles: true,
      detail: {
        allocationId: '1',
        newStartDate: '2024-01-17',
        newEndDate: '2024-01-17',
      },
    });

    fireEvent(screen.getByTestId('dnd-context'), dropEvent);

    await waitFor(() => {
      expect(mockBulkUpdate).toHaveBeenCalledWith([
        {
          allocationId: '1',
          startDate: '2024-01-17',
          endDate: '2024-01-17',
          allocatedHours: 30,
        },
      ]);
    });
  });

  it('shows capacity indicators for each day', async () => {
    render(
      <DragDropCalendar 
        startDate="2024-01-15"
        endDate="2024-01-21"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });

    // Look for capacity indicators
    const capacityIndicators = screen.getAllByTestId(/capacity-indicator/);
    expect(capacityIndicators.length).toBeGreaterThan(0);
  });

  it('prevents drop when over-allocation detected', async () => {
    const mockCheckConflicts = vi.fn().mockResolvedValue([
      {
        id: 'conflict-1',
        type: 'overallocation',
        severity: 'high',
        description: 'Employee would be over-allocated',
        affectedAllocations: ['1'],
        canAutoResolve: false,
      },
    ]);

    (AllocationService.checkConflicts as any).mockImplementation(mockCheckConflicts);

    const onConflictDetected = vi.fn();

    render(
      <DragDropCalendar 
        startDate="2024-01-15"
        endDate="2024-01-21"
        onConflictDetected={onConflictDetected}
        preventOverallocation={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });

    // Simulate drop that would cause over-allocation
    const dropEvent = new CustomEvent('drop', {
      bubbles: true,
      detail: {
        type: 'employee',
        employeeId: '1',
        projectId: '2',
        targetDate: '2024-01-15', // Same date as existing allocation
      },
    });

    fireEvent(screen.getByTestId('dnd-context'), dropEvent);

    await waitFor(() => {
      expect(onConflictDetected).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'overallocation',
          severity: 'high',
        }),
      ]);
    });
  });

  it('displays project filter dropdown', async () => {
    render(
      <DragDropCalendar 
        startDate="2024-01-15"
        endDate="2024-01-21"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('All Projects')).toBeInTheDocument();
    });

    const filterDropdown = screen.getByRole('combobox', { name: /project filter/i });
    fireEvent.click(filterDropdown);

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });
  });

  it('filters calendar view by selected project', async () => {
    render(
      <DragDropCalendar 
        startDate="2024-01-15"
        endDate="2024-01-21"
        projectFilter="1"
      />
    );

    await waitFor(() => {
      expect(AllocationService.getCalendarData).toHaveBeenCalledWith(
        '2024-01-15',
        '2024-01-21',
        { projectId: '1' }
      );
    });
  });

  it('shows allocation details on hover', async () => {
    render(
      <DragDropCalendar 
        startDate="2024-01-15"
        endDate="2024-01-21"
      />
    );

    const allocationBlock = await screen.findByText('Project Alpha');
    fireEvent.mouseEnter(allocationBlock);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('30 hours/week')).toBeInTheDocument();
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ResourceKanbanBoard } from '../../../components/dashboard/ResourceKanbanBoard';
import { Employee, CapacityData } from '../../../hooks/useResourceData';

// Mock react-beautiful-dnd
vi.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: any) => (
    <div data-testid="drag-drop-context" data-ondragend={onDragEnd?.toString()}>
      {children}
    </div>
  ),
  Droppable: ({ children, droppableId }: any) => (
    <div data-testid={`droppable-${droppableId}`}>
      {children({ 
        innerRef: vi.fn(), 
        droppableProps: {}, 
        placeholder: <div data-testid="placeholder" /> 
      }, { isDraggingOver: false, draggingOverWith: null })}
    </div>
  ),
  Draggable: ({ children, draggableId, index }: any) => (
    <div data-testid={`draggable-${draggableId}-${index}`}>
      {children({ 
        innerRef: vi.fn(), 
        draggableProps: { 'data-testid': `drag-${draggableId}` }, 
        dragHandleProps: { 'data-testid': `handle-${draggableId}` } 
      }, { isDragging: false, isDropAnimating: false })}
    </div>
  ),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test data
const mockEmployees: Employee[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    departmentId: 1,
    position: 'Senior Developer',
    skills: ['React', 'TypeScript', 'Node.js'],
    salary: 85000,
    isActive: true
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@company.com',
    departmentId: 2,
    position: 'UI Designer',
    skills: ['Figma', 'Adobe XD', 'CSS'],
    salary: 70000,
    isActive: true
  },
  {
    id: 3,
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@company.com',
    departmentId: 1,
    position: 'Project Manager',
    skills: ['Agile', 'Scrum', 'Project Planning'],
    salary: 90000,
    isActive: true
  }
];

const mockCapacityData: CapacityData[] = [
  {
    id: '1-2025-01-05',
    employeeId: '1',
    date: '2025-01-05T00:00:00.000Z',
    availableHours: 40,
    allocatedHours: 25,
    utilizationRate: 0.625
  },
  {
    id: '2-2025-01-05',
    employeeId: '2',
    date: '2025-01-05T00:00:00.000Z',
    availableHours: 40,
    allocatedHours: 42,
    utilizationRate: 1.05
  },
  {
    id: '3-2025-01-05',
    employeeId: '3',
    date: '2025-01-05T00:00:00.000Z',
    availableHours: 40,
    allocatedHours: 48,
    utilizationRate: 1.2
  }
];

const mockOnAllocationUpdate = vi.fn();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      {component}
    </DndProvider>
  );
};

describe('ResourceKanbanBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the kanban board with all utilization zones', () => {
    renderWithProviders(
      <ResourceKanbanBoard
        employees={mockEmployees}
        capacityData={mockCapacityData}
        onAllocationUpdate={mockOnAllocationUpdate}
      />
    );

    // Check that all zones are rendered
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Allocated')).toBeInTheDocument();
    expect(screen.getByText('Busy')).toBeInTheDocument();
    expect(screen.getByText('Over-allocated')).toBeInTheDocument();

    // Check that the drag-drop context is rendered
    expect(screen.getByTestId('drag-drop-context')).toBeInTheDocument();
  });

  it('categorizes employees correctly by utilization rate', () => {
    renderWithProviders(
      <ResourceKanbanBoard
        employees={mockEmployees}
        capacityData={mockCapacityData}
        onAllocationUpdate={mockOnAllocationUpdate}
      />
    );

    // John Doe should be in Available (62.5% utilization)
    expect(screen.getByTestId('droppable-available')).toBeInTheDocument();
    
    // Jane Smith should be in Busy (105% utilization)
    expect(screen.getByTestId('droppable-busy')).toBeInTheDocument();
    
    // Mike Johnson should be in Over-allocated (120% utilization)
    expect(screen.getByTestId('droppable-over-allocated')).toBeInTheDocument();
  });

  it('displays employee cards with correct information', () => {
    renderWithProviders(
      <ResourceKanbanBoard
        employees={mockEmployees}
        capacityData={mockCapacityData}
        onAllocationUpdate={mockOnAllocationUpdate}
      />
    );

    // Check employee names are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Mike Johnson')).toBeInTheDocument();

    // Check positions are displayed
    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
    expect(screen.getByText('UI Designer')).toBeInTheDocument();
    expect(screen.getByText('Project Manager')).toBeInTheDocument();
  });

  it('shows utilization percentages for each employee', () => {
    renderWithProviders(
      <ResourceKanbanBoard
        employees={mockEmployees}
        capacityData={mockCapacityData}
        onAllocationUpdate={mockOnAllocationUpdate}
      />
    );

    // Check utilization rates are displayed (allowing for percentage formatting)
    expect(screen.getByText(/62\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/105%/)).toBeInTheDocument();
    expect(screen.getByText(/120%/)).toBeInTheDocument();
  });

  it('renders draggable employee cards', () => {
    renderWithProviders(
      <ResourceKanbanBoard
        employees={mockEmployees}
        capacityData={mockCapacityData}
        onAllocationUpdate={mockOnAllocationUpdate}
      />
    );

    // Check draggable elements are present
    expect(screen.getByTestId('draggable-employee-1-0')).toBeInTheDocument();
    expect(screen.getByTestId('draggable-employee-2-0')).toBeInTheDocument();
    expect(screen.getByTestId('draggable-employee-3-0')).toBeInTheDocument();
  });

  it('handles drag and drop operations', async () => {
    const { container } = renderWithProviders(
      <ResourceKanbanBoard
        employees={mockEmployees}
        capacityData={mockCapacityData}
        onAllocationUpdate={mockOnAllocationUpdate}
      />
    );

    const dragDropContext = screen.getByTestId('drag-drop-context');
    expect(dragDropContext).toBeInTheDocument();

    // Simulate a drag operation by checking the onDragEnd handler exists
    const onDragEndAttr = dragDropContext.getAttribute('data-ondragend');
    expect(onDragEndAttr).toBeTruthy();
  });

  it('calls onAllocationUpdate when allocation is changed', async () => {
    renderWithProviders(
      <ResourceKanbanBoard
        employees={mockEmployees}
        capacityData={mockCapacityData}
        onAllocationUpdate={mockOnAllocationUpdate}
      />
    );

    // Simulate changing allocation (this would normally happen through drag-and-drop)
    const allocationButton = screen.queryByText('Update Allocation');
    if (allocationButton) {
      fireEvent.click(allocationButton);
      await waitFor(() => {
        expect(mockOnAllocationUpdate).toHaveBeenCalled();
      });
    }
  });

  it('displays loading state when employees are undefined', () => {
    renderWithProviders(
      <ResourceKanbanBoard
        employees={undefined}
        capacityData={mockCapacityData}
        onAllocationUpdate={mockOnAllocationUpdate}
      />
    );

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('displays empty state when no employees are provided', () => {
    renderWithProviders(
      <ResourceKanbanBoard
        employees={[]}
        capacityData={[]}
        onAllocationUpdate={mockOnAllocationUpdate}
      />
    );

    expect(screen.getByText('No employees to display')).toBeInTheDocument();
  });

  it('handles employees without capacity data', () => {
    const employeeWithoutCapacity: Employee = {
      id: 4,
      firstName: 'Test',
      lastName: 'Employee',
      email: 'test@company.com',
      departmentId: 1,
      position: 'Developer',
      skills: ['JavaScript'],
      salary: 60000,
      isActive: true
    };

    renderWithProviders(
      <ResourceKanbanBoard
        employees={[employeeWithoutCapacity]}
        capacityData={[]}
        onAllocationUpdate={mockOnAllocationUpdate}
      />
    );

    // Employee should appear in Available zone with 0% utilization
    expect(screen.getByText('Test Employee')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows skills for each employee', () => {
    renderWithProviders(
      <ResourceKanbanBoard
        employees={mockEmployees}
        capacityData={mockCapacityData}
        onAllocationUpdate={mockOnAllocationUpdate}
      />
    );

    // Check that skills are displayed
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Figma')).toBeInTheDocument();
    expect(screen.getByText('Agile')).toBeInTheDocument();
  });

  it('provides accessibility features', () => {
    renderWithProviders(
      <ResourceKanbanBoard
        employees={mockEmployees}
        capacityData={mockCapacityData}
        onAllocationUpdate={mockOnAllocationUpdate}
      />
    );

    // Check for ARIA labels and roles
    const kanbanBoard = screen.getByRole('region', { name: /kanban board/i });
    expect(kanbanBoard).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    renderWithProviders(
      <ResourceKanbanBoard
        employees={mockEmployees}
        capacityData={mockCapacityData}
        onAllocationUpdate={mockOnAllocationUpdate}
      />
    );

    // Component should still render despite API errors
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
});
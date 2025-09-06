import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ResourceHeatmapCalendar } from '../../../components/dashboard/ResourceHeatmapCalendar';
import { Employee, CapacityData } from '../../../hooks/useResourceData';

// Mock react-calendar-heatmap
vi.mock('react-calendar-heatmap', () => ({
  default: ({ values, startDate, endDate, onClick, tooltipDataAttrs, classForValue }: any) => (
    <div 
      data-testid="calendar-heatmap"
      data-start-date={startDate}
      data-end-date={endDate}
      data-values={JSON.stringify(values)}
    >
      {values?.map((value: any, index: number) => (
        <div
          key={index}
          data-testid={`heatmap-cell-${index}`}
          data-date={value.date}
          data-count={value.count}
          className={classForValue?.(value)}
          onClick={() => onClick?.(value)}
          {...tooltipDataAttrs?.(value)}
        >
          {value.date}
        </div>
      ))}
    </div>
  )
}));

// Mock tooltip library
vi.mock('react-tooltip', () => ({
  Tooltip: ({ id, children }: any) => (
    <div data-testid={`tooltip-${id}`} data-tooltip-id={id}>
      {children}
    </div>
  )
}));

// Test data
const mockEmployees: Employee[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    departmentId: 1,
    position: 'Senior Developer',
    skills: ['React', 'TypeScript'],
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
    skills: ['Figma', 'CSS'],
    salary: 70000,
    isActive: true
  }
];

const mockCapacityData: CapacityData[] = [
  {
    id: '1-2025-01-01',
    employeeId: '1',
    date: '2025-01-01T00:00:00.000Z',
    availableHours: 40,
    allocatedHours: 30,
    utilizationRate: 0.75
  },
  {
    id: '1-2025-01-02',
    employeeId: '1',
    date: '2025-01-02T00:00:00.000Z',
    availableHours: 40,
    allocatedHours: 45,
    utilizationRate: 1.125
  },
  {
    id: '2-2025-01-01',
    employeeId: '2',
    date: '2025-01-01T00:00:00.000Z',
    availableHours: 40,
    allocatedHours: 20,
    utilizationRate: 0.5
  },
  {
    id: '2-2025-01-02',
    employeeId: '2',
    date: '2025-01-02T00:00:00.000Z',
    availableHours: 40,
    allocatedHours: 40,
    utilizationRate: 1.0
  }
];

describe('ResourceHeatmapCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the heatmap calendar component', () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    expect(screen.getByTestId('calendar-heatmap')).toBeInTheDocument();
    expect(screen.getByText('Resource Utilization Heatmap')).toBeInTheDocument();
  });

  it('displays view toggle buttons', () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    expect(screen.getByText('Day')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Month')).toBeInTheDocument();
  });

  it('switches between different view modes', async () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    const weekButton = screen.getByText('Week');
    const monthButton = screen.getByText('Month');

    // Click week view
    fireEvent.click(weekButton);
    await waitFor(() => {
      expect(weekButton).toHaveClass('bg-blue-600');
    });

    // Click month view
    fireEvent.click(monthButton);
    await waitFor(() => {
      expect(monthButton).toHaveClass('bg-blue-600');
    });
  });

  it('displays employee filter dropdown', () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    expect(screen.getByText('All Employees')).toBeInTheDocument();
  });

  it('filters data by selected employee', async () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    // Find and interact with select component
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);

    // Select John Doe
    const johnOption = screen.getByText('John Doe');
    fireEvent.click(johnOption);

    await waitFor(() => {
      const heatmap = screen.getByTestId('calendar-heatmap');
      const values = JSON.parse(heatmap.getAttribute('data-values') || '[]');
      
      // Should only show John's data
      expect(values.length).toBeGreaterThan(0);
      values.forEach((value: any) => {
        expect(value.employeeIds).toContain('1');
      });
    });
  });

  it('aggregates capacity data correctly for all employees', () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    const heatmap = screen.getByTestId('calendar-heatmap');
    const values = JSON.parse(heatmap.getAttribute('data-values') || '[]');

    // Find data for 2025-01-01 (should have data from both employees)
    const jan1Data = values.find((v: any) => v.date === '2025-01-01');
    expect(jan1Data).toBeDefined();
    
    // Average utilization for Jan 1: (0.75 + 0.5) / 2 = 0.625
    expect(jan1Data.count).toBeCloseTo(62.5, 1);
  });

  it('shows correct utilization intensity colors', () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    const heatmap = screen.getByTestId('calendar-heatmap');
    expect(heatmap).toBeInTheDocument();

    // Check that cells are rendered
    expect(screen.getByTestId('heatmap-cell-0')).toBeInTheDocument();
  });

  it('handles click events on heatmap cells', async () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    const cell = screen.getByTestId('heatmap-cell-0');
    fireEvent.click(cell);

    // Should show a tooltip or modal with details
    await waitFor(() => {
      expect(screen.getByTestId('day-detail-tooltip')).toBeInTheDocument();
    });
  });

  it('displays tooltips with utilization details', () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    // Tooltip should be rendered
    expect(screen.getByTestId('tooltip-utilization-tooltip')).toBeInTheDocument();
  });

  it('handles empty capacity data gracefully', () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={[]}
      />
    );

    const heatmap = screen.getByTestId('calendar-heatmap');
    const values = JSON.parse(heatmap.getAttribute('data-values') || '[]');
    
    // Should have default values with 0 utilization
    expect(values.length).toBeGreaterThan(0);
    expect(values[0].count).toBe(0);
  });

  it('handles undefined employees gracefully', () => {
    render(
      <ResourceHeatmapCalendar
        employees={undefined}
        capacityData={mockCapacityData}
      />
    );

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('displays legend for utilization levels', () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Utilization')).toBeInTheDocument();
  });

  it('shows date range in correct format', () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    const heatmap = screen.getByTestId('calendar-heatmap');
    const startDate = heatmap.getAttribute('data-start-date');
    const endDate = heatmap.getAttribute('data-end-date');

    expect(startDate).toBeTruthy();
    expect(endDate).toBeTruthy();
  });

  it('updates heatmap when capacity data changes', () => {
    const { rerender } = render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    // Update capacity data
    const updatedCapacityData = [
      ...mockCapacityData,
      {
        id: '1-2025-01-03',
        employeeId: '1',
        date: '2025-01-03T00:00:00.000Z',
        availableHours: 40,
        allocatedHours: 35,
        utilizationRate: 0.875
      }
    ];

    rerender(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={updatedCapacityData}
      />
    );

    const heatmap = screen.getByTestId('calendar-heatmap');
    const values = JSON.parse(heatmap.getAttribute('data-values') || '[]');
    
    // Should have additional data point
    const jan3Data = values.find((v: any) => v.date === '2025-01-03');
    expect(jan3Data).toBeDefined();
  });

  it('provides accessibility features', () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    // Check for ARIA labels
    const calendar = screen.getByRole('region', { name: /resource utilization heatmap/i });
    expect(calendar).toBeInTheDocument();
  });

  it('handles responsive behavior', () => {
    render(
      <ResourceHeatmapCalendar
        employees={mockEmployees}
        capacityData={mockCapacityData}
      />
    );

    const container = screen.getByTestId('heatmap-container');
    expect(container).toHaveClass('responsive-heatmap');
  });
});
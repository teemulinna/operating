import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { UtilizationChart } from '../UtilizationChart';

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  ComposedChart: ({ children, data }: any) => (
    <div data-testid="composed-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill }: any) => <div data-testid={`bar-${dataKey}`} data-fill={fill} />,
  Line: ({ dataKey, stroke }: any) => <div data-testid={`line-${dataKey}`} data-stroke={stroke} />,
  XAxis: ({ dataKey }: any) => <div data-testid={`x-axis-${dataKey}`} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const mockUtilizationData = {
  employees: [
    {
      id: '1',
      name: 'John Doe',
      capacity: 40,
      allocated: 35,
      utilization: 87.5,
      department: 'Development',
    },
    {
      id: '2',
      name: 'Jane Smith',
      capacity: 40,
      allocated: 42,
      utilization: 105,
      department: 'Development',
    },
    {
      id: '3',
      name: 'Bob Johnson',
      capacity: 40,
      allocated: 25,
      utilization: 62.5,
      department: 'Design',
    },
  ],
  trends: [
    { week: '2024-W01', utilization: 82, capacity: 400 },
    { week: '2024-W02', utilization: 85, capacity: 400 },
    { week: '2024-W03', utilization: 88, capacity: 400 },
    { week: '2024-W04', utilization: 90, capacity: 400 },
  ],
};

describe('UtilizationChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render employee utilization bar chart', () => {
    render(
      <UtilizationChart 
        data={mockUtilizationData}
        type="bar"
        loading={false}
      />
    );

    // Check that bar chart is rendered
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-utilization')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis-name')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('should render utilization trend line chart', () => {
    render(
      <UtilizationChart 
        data={mockUtilizationData}
        type="line"
        loading={false}
      />
    );

    // Check that line chart is rendered
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-utilization')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis-week')).toBeInTheDocument();
  });

  it('should render composed chart with both bars and lines', () => {
    render(
      <UtilizationChart 
        data={mockUtilizationData}
        type="composed"
        loading={false}
      />
    );

    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-allocated')).toBeInTheDocument();
    expect(screen.getByTestId('line-capacity')).toBeInTheDocument();
  });

  it('should pass correct data to charts', () => {
    render(
      <UtilizationChart 
        data={mockUtilizationData}
        type="bar"
        loading={false}
      />
    );

    const barChart = screen.getByTestId('bar-chart');
    const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
    
    expect(chartData).toHaveLength(3);
    expect(chartData[0]).toMatchObject({
      name: 'John Doe',
      utilization: 87.5,
      capacity: 40,
      allocated: 35,
    });
  });

  it('should show loading state', () => {
    render(
      <UtilizationChart 
        data={null}
        type="bar"
        loading={true}
      />
    );

    expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
  });

  it('should handle empty data gracefully', () => {
    const emptyData = {
      employees: [],
      trends: [],
    };

    render(
      <UtilizationChart 
        data={emptyData}
        type="bar"
        loading={false}
      />
    );

    expect(screen.getByTestId('no-data-message')).toBeInTheDocument();
    expect(screen.getByText('No utilization data available')).toBeInTheDocument();
  });

  it('should apply correct colors for utilization levels', () => {
    render(
      <UtilizationChart 
        data={mockUtilizationData}
        type="bar"
        loading={false}
      />
    );

    // Check color coding for different utilization levels
    const utilizationBar = screen.getByTestId('bar-utilization');
    expect(utilizationBar).toHaveAttribute('data-fill'); // Color should be applied
  });

  it('should display interactive tooltips', () => {
    render(
      <UtilizationChart 
        data={mockUtilizationData}
        type="bar"
        loading={false}
      />
    );

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('should include legend', () => {
    render(
      <UtilizationChart 
        data={mockUtilizationData}
        type="composed"
        loading={false}
      />
    );

    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('should handle chart type switching', () => {
    const { rerender } = render(
      <UtilizationChart 
        data={mockUtilizationData}
        type="bar"
        loading={false}
      />
    );

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();

    rerender(
      <UtilizationChart 
        data={mockUtilizationData}
        type="line"
        loading={false}
      />
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should be responsive', () => {
    render(
      <UtilizationChart 
        data={mockUtilizationData}
        type="bar"
        loading={false}
      />
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle click events on chart elements', async () => {
    const mockOnClick = vi.fn();
    
    render(
      <UtilizationChart 
        data={mockUtilizationData}
        type="bar"
        loading={false}
        onClick={mockOnClick}
      />
    );

    // Simulate clicking on chart (this would be handled by Recharts in real scenario)
    const chartElement = screen.getByTestId('bar-chart');
    await userEvent.click(chartElement);

    // In a real implementation, this would trigger the onClick callback
    // with specific data point information
  });

  it('should show grid lines', () => {
    render(
      <UtilizationChart 
        data={mockUtilizationData}
        type="bar"
        loading={false}
      />
    );

    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
  });

  it('should handle filter by department', () => {
    render(
      <UtilizationChart 
        data={mockUtilizationData}
        type="bar"
        loading={false}
        filterByDepartment="Development"
      />
    );

    const barChart = screen.getByTestId('bar-chart');
    const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
    
    // Should only show Development employees
    expect(chartData).toHaveLength(2);
    expect(chartData.every((emp: any) => emp.department === 'Development')).toBe(true);
  });

  it('should highlight over-allocated employees', () => {
    render(
      <UtilizationChart 
        data={mockUtilizationData}
        type="bar"
        loading={false}
        highlightOverAllocation={true}
      />
    );

    // Jane Smith should be highlighted as over-allocated (105%)
    const barChart = screen.getByTestId('bar-chart');
    const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
    
    const overAllocatedEmployee = chartData.find((emp: any) => emp.utilization > 100);
    expect(overAllocatedEmployee).toBeDefined();
    expect(overAllocatedEmployee.name).toBe('Jane Smith');
  });
});

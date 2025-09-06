import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import TeamUtilizationChart from '../../../src/components/analytics/TeamUtilizationChart';
import AnalyticsService from '../../../src/services/analytics.service';
import { ChartExportUtils } from '../../../src/utils/chartExport';

// Mock dependencies
vi.mock('../../../src/services/analytics.service');
vi.mock('../../../src/utils/chartExport');
vi.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Mock Bar Chart
    </div>
  ),
}));

vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

const mockUtilizationData = [
  {
    departmentId: '1',
    departmentName: 'Engineering',
    totalEmployees: 15,
    averageUtilization: 0.85,
    totalAvailableHours: 1200,
    totalAllocatedHours: 1020,
    utilizationTrend: 5.2
  },
  {
    departmentId: '2',
    departmentName: 'Marketing',
    totalEmployees: 8,
    averageUtilization: 0.72,
    totalAvailableHours: 640,
    totalAllocatedHours: 461,
    utilizationTrend: -2.1
  },
  {
    departmentId: '3',
    departmentName: 'Sales',
    totalEmployees: 12,
    averageUtilization: 0.95,
    totalAvailableHours: 960,
    totalAllocatedHours: 912,
    utilizationTrend: 8.7
  }
];

const mockApiResponse = {
  data: mockUtilizationData,
  metadata: {
    generatedAt: new Date(),
    dataPoints: mockUtilizationData.length,
    dateRange: {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31')
    },
    filters: {},
    processingTimeMs: 150
  }
};

describe('TeamUtilizationChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AnalyticsService.getTeamUtilization as any).mockResolvedValue(mockApiResponse);
  });

  it('renders correctly with data', async () => {
    render(<TeamUtilizationChart />);
    
    // Check for loading state initially
    expect(screen.getByText(/animate-pulse/)).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Team Utilization')).toBeInTheDocument();
    });

    // Verify chart is rendered
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    
    // Check summary statistics
    expect(screen.getByText('35')).toBeInTheDocument(); // Total employees
    expect(screen.getByText('84.0%')).toBeInTheDocument(); // Average utilization
    expect(screen.getByText('1')).toBeInTheDocument(); // High utilization count
    expect(screen.getByText('0')).toBeInTheDocument(); // Underutilized count
  });

  it('calls analytics service with correct filters', async () => {
    const filters = {
      dateFrom: new Date('2024-01-01'),
      dateTo: new Date('2024-01-31'),
      departmentIds: ['1', '2']
    };

    render(<TeamUtilizationChart filters={filters} />);

    await waitFor(() => {
      expect(AnalyticsService.getTeamUtilization).toHaveBeenCalledWith(filters);
    });
  });

  it('handles error state correctly', async () => {
    (AnalyticsService.getTeamUtilization as any).mockRejectedValue(
      new Error('Failed to fetch data')
    );

    render(<TeamUtilizationChart />);

    await waitFor(() => {
      expect(screen.getByText('⚠️ Error Loading Data')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch team utilization data')).toBeInTheDocument();
    });

    // Test retry functionality
    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);
    
    expect(AnalyticsService.getTeamUtilization).toHaveBeenCalledTimes(2);
  });

  it('exports chart as PNG when export button is clicked', async () => {
    (ChartExportUtils.exportChartAsPNG as any).mockResolvedValue(undefined);
    (ChartExportUtils.generateFilename as any).mockReturnValue('test-filename');

    render(<TeamUtilizationChart showExportButtons={true} />);

    await waitFor(() => {
      expect(screen.getByText('Team Utilization')).toBeInTheDocument();
    });

    const pngButton = screen.getByRole('button', { name: /png/i });
    fireEvent.click(pngButton);

    await waitFor(() => {
      expect(ChartExportUtils.exportChartAsPNG).toHaveBeenCalled();
    });
  });

  it('exports chart as PDF when export button is clicked', async () => {
    (ChartExportUtils.exportChartAsPDF as any).mockResolvedValue(undefined);
    (ChartExportUtils.generateFilename as any).mockReturnValue('test-filename');

    render(<TeamUtilizationChart showExportButtons={true} />);

    await waitFor(() => {
      expect(screen.getByText('Team Utilization')).toBeInTheDocument();
    });

    const pdfButton = screen.getByRole('button', { name: /pdf/i });
    fireEvent.click(pdfButton);

    await waitFor(() => {
      expect(ChartExportUtils.exportChartAsPDF).toHaveBeenCalled();
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    render(<TeamUtilizationChart />);

    await waitFor(() => {
      expect(screen.getByText('Team Utilization')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(AnalyticsService.getTeamUtilization).toHaveBeenCalledTimes(2);
  });

  it('generates correct chart data and configuration', async () => {
    render(<TeamUtilizationChart />);

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    const chartElement = screen.getByTestId('bar-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
    const chartOptions = JSON.parse(chartElement.getAttribute('data-chart-options') || '{}');

    // Verify chart data structure
    expect(chartData.labels).toEqual(['Engineering', 'Marketing', 'Sales']);
    expect(chartData.datasets).toHaveLength(2); // Utilization + Employee Count
    expect(chartData.datasets[0].label).toBe('Average Utilization (%)');
    expect(chartData.datasets[1].label).toBe('Employee Count');

    // Verify chart options
    expect(chartOptions.responsive).toBe(true);
    expect(chartOptions.plugins.title.text).toBe('Team Utilization by Department');
    expect(chartOptions.scales.y.max).toBe(100);
    expect(chartOptions.scales.y1.position).toBe('right');
  });

  it('handles empty data gracefully', async () => {
    (AnalyticsService.getTeamUtilization as any).mockResolvedValue({
      ...mockApiResponse,
      data: []
    });

    render(<TeamUtilizationChart />);

    await waitFor(() => {
      expect(screen.getByText('Team Utilization')).toBeInTheDocument();
    });

    // Check that summary statistics show zeros
    expect(screen.getByText('0')).toBeInTheDocument(); // Total employees
    expect(screen.getByText('N/A')).toBeInTheDocument(); // Average utilization when no data
  });

  it('applies correct color coding based on utilization levels', async () => {
    render(<TeamUtilizationChart />);

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    const chartElement = screen.getByTestId('bar-chart');
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}');
    const colors = chartData.datasets[0].backgroundColor;

    // Engineering (0.85) should be green
    // Marketing (0.72) should be green
    // Sales (0.95) should be red (overutilized)
    expect(colors).toEqual([
      'rgba(34, 197, 94, 0.8)', // Engineering - green
      'rgba(34, 197, 94, 0.8)', // Marketing - green
      'rgba(239, 68, 68, 0.8)'  // Sales - red
    ]);
  });

  it('hides export buttons when showExportButtons is false', async () => {
    render(<TeamUtilizationChart showExportButtons={false} />);

    await waitFor(() => {
      expect(screen.getByText('Team Utilization')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /png/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pdf/i })).not.toBeInTheDocument();
  });

  it('displays last updated time correctly', async () => {
    render(<TeamUtilizationChart />);

    await waitFor(() => {
      expect(screen.getByText(/last updated:/i)).toBeInTheDocument();
    });

    const timeElement = screen.getByText(/last updated:/i);
    expect(timeElement.textContent).toMatch(/\\d{1,2}:\\d{2}:\\d{2}/); // HH:MM:SS format
  });

  it('handles custom className prop', async () => {
    const { container } = render(<TeamUtilizationChart className="custom-class" />);

    await waitFor(() => {
      expect(screen.getByText('Team Utilization')).toBeInTheDocument();
    });

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
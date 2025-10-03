// import React // Unused from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HeatMapCalendar } from '../HeatMapCalendar';
import { HeatMapService } from '../../../services/heat-map.service';
import { format } from 'date-fns';

// Mock the HeatMapService
jest.mock('../../../services/heat-map.service');

describe('HeatMapCalendar', () => {
  const mockHeatMapData = [
    {
      date: '2024-01-15',
      employeeId: 'emp-1',
      employeeName: 'John Doe',
      departmentId: 'dept-1',
      departmentName: 'Engineering',
      totalAllocated: 6,
      dailyCapacity: 8,
      utilizationPercentage: 75,
      utilizationCategory: 'blue' as const,
      projectCount: 2,
    },
    {
      date: '2024-01-15',
      employeeId: 'emp-2',
      employeeName: 'Jane Smith',
      departmentId: 'dept-1',
      departmentName: 'Engineering',
      totalAllocated: 9,
      dailyCapacity: 8,
      utilizationPercentage: 112.5,
      utilizationCategory: 'red' as const,
      projectCount: 3,
    },
  ];

  const mockGetHeatMapData = jest.fn();
  const mockRefreshHeatMap = jest.fn();
  const mockExportHeatMap = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (HeatMapService as jest.MockedClass<typeof HeatMapService>).mockImplementation(() => ({
      getHeatMapData: mockGetHeatMapData,
      refreshHeatMap: mockRefreshHeatMap,
      exportHeatMap: mockExportHeatMap,
      getHeatMapSummary: jest.fn(),
      getEmployeeTrends: jest.fn(),
      getBottlenecks: jest.fn(),
    } as any));
  });

  it('should render loading state initially', () => {
    mockGetHeatMapData.mockImplementation(() => new Promise(() => {})); // Never resolves to keep loading
    const { container } = render(<HeatMapCalendar />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should display heat map data after loading', async () => {
    mockGetHeatMapData.mockResolvedValueOnce(mockHeatMapData);
    render(<HeatMapCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Capacity Heat Map')).toBeInTheDocument();
    });

    // Check if legend is displayed
    expect(screen.getByText('≤70% (Optimal)')).toBeInTheDocument();
    expect(screen.getByText('71-85% (Good)')).toBeInTheDocument();
    expect(screen.getByText('86-100% (Warning)')).toBeInTheDocument();
    expect(screen.getByText('>100% (Critical)')).toBeInTheDocument();
  });

  it('should display error state when data fetch fails', async () => {
    mockGetHeatMapData.mockRejectedValueOnce(new Error('Network error'));
    render(<HeatMapCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load heat map data')).toBeInTheDocument();
    });
  });

  it('should handle refresh button click', async () => {
    mockGetHeatMapData.mockResolvedValueOnce(mockHeatMapData);
    mockRefreshHeatMap.mockResolvedValueOnce(undefined);
    mockGetHeatMapData.mockResolvedValueOnce(mockHeatMapData);

    render(<HeatMapCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Capacity Heat Map')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefreshHeatMap).toHaveBeenCalledTimes(1);
      expect(mockGetHeatMapData).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle export to CSV', async () => {
    const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
    mockGetHeatMapData.mockResolvedValueOnce(mockHeatMapData);
    mockExportHeatMap.mockResolvedValueOnce(mockBlob);

    // Mock URL.createObjectURL and document methods
    const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = jest.fn();
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();
    const mockClick = jest.fn();

    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const element = document.createElement(tagName);
        element.click = mockClick;
        return element;
      }
      return document.createElement(tagName);
    });

    render(<HeatMapCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Capacity Heat Map')).toBeInTheDocument();
    });

    const exportCSVButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportCSVButton);

    await waitFor(() => {
      expect(mockExportHeatMap).toHaveBeenCalledWith(
        expect.objectContaining({
          granularity: 'day',
        }),
        'csv'
      );
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  it('should handle export to JSON', async () => {
    const mockBlob = new Blob(['json data'], { type: 'application/json' });
    mockGetHeatMapData.mockResolvedValueOnce(mockHeatMapData);
    mockExportHeatMap.mockResolvedValueOnce(mockBlob);

    render(<HeatMapCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Capacity Heat Map')).toBeInTheDocument();
    });

    const exportJSONButton = screen.getByRole('button', { name: /export json/i });
    fireEvent.click(exportJSONButton);

    await waitFor(() => {
      expect(mockExportHeatMap).toHaveBeenCalledWith(
        expect.objectContaining({
          granularity: 'day',
        }),
        'json'
      );
    });
  });

  it('should handle cell click and display details', async () => {
    mockGetHeatMapData.mockResolvedValueOnce(mockHeatMapData);
    const onCellClick = jest.fn();

    render(<HeatMapCalendar onCellClick={onCellClick} />);

    await waitFor(() => {
      expect(screen.getByText('Capacity Heat Map')).toBeInTheDocument();
    });

    // Find a cell with data (75% utilization)
    const cells = screen.getAllByText('75%');
    if (cells.length > 0) {
      fireEvent.click(cells[0].parentElement!);

      await waitFor(() => {
        expect(onCellClick).toHaveBeenCalledWith(mockHeatMapData[0]);
        // Check if details are displayed
        expect(screen.getByText(/Employee: John Doe/)).toBeInTheDocument();
        expect(screen.getByText(/Department: Engineering/)).toBeInTheDocument();
        expect(screen.getByText(/Allocated: 6h \/ 8h/)).toBeInTheDocument();
      });
    }
  });

  it('should filter data by employee', async () => {
    mockGetHeatMapData.mockResolvedValueOnce(mockHeatMapData);

    render(<HeatMapCalendar employeeId="emp-1" />);

    await waitFor(() => {
      expect(mockGetHeatMapData).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-1',
        })
      );
    });
  });

  it('should filter data by department', async () => {
    mockGetHeatMapData.mockResolvedValueOnce(mockHeatMapData);

    render(<HeatMapCalendar departmentId="dept-1" />);

    await waitFor(() => {
      expect(mockGetHeatMapData).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: 'dept-1',
        })
      );
    });
  });

  it('should use correct date range', async () => {
    mockGetHeatMapData.mockResolvedValueOnce([]);
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    render(<HeatMapCalendar startDate={startDate} endDate={endDate} />);

    await waitFor(() => {
      expect(mockGetHeatMapData).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
      );
    });
  });

  it('should apply correct color classes based on utilization', async () => {
    const colorTestData = [
      { utilizationPercentage: 50, category: 'green' as const },
      { utilizationPercentage: 75, category: 'blue' as const },
      { utilizationPercentage: 95, category: 'yellow' as const },
      { utilizationPercentage: 110, category: 'red' as const },
    ];

    const testData = colorTestData.map((item, index) => ({
      date: format(new Date(), 'yyyy-MM-dd'),
      employeeId: `emp-${index}`,
      employeeName: `Employee ${index}`,
      departmentId: 'dept-1',
      departmentName: 'Engineering',
      totalAllocated: item.utilizationPercentage * 0.08,
      dailyCapacity: 8,
      utilizationPercentage: item.utilizationPercentage,
      utilizationCategory: item.category,
      projectCount: 1,
    }));

    mockGetHeatMapData.mockResolvedValueOnce(testData);

    render(<HeatMapCalendar />);

    await waitFor(() => {
      // Check each utilization percentage is displayed with correct color
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('110%')).toBeInTheDocument();
    });
  });
});
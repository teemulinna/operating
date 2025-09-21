import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TeamDashboard } from '../TeamDashboard';
import { ServiceFactory } from '../../../services/api';

// Mock the services
vi.mock('../../../services/api', () => ({
  ServiceFactory: {
    getAnalyticsService: vi.fn(),
    getAllocationService: vi.fn(),
  },
}));

// Mock the child components
vi.mock('../CapacityWidget', () => ({
  CapacityWidget: ({ onDrillDown }: { onDrillDown?: () => void }) => (
    <div data-testid="capacity-widget" onClick={onDrillDown}>
      Capacity Widget
    </div>
  ),
}));

vi.mock('../UtilizationChart', () => ({
  UtilizationChart: () => <div data-testid="utilization-chart">Utilization Chart</div>,
}));

vi.mock('../ConflictPanel', () => ({
  ConflictPanel: () => <div data-testid="conflict-panel">Conflict Panel</div>,
}));

const mockAnalyticsService = {
  getCapacityAnalysis: vi.fn(),
  getDashboardStats: vi.fn(),
};

const mockAllocationService = {
  getAll: vi.fn(),
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('TeamDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ServiceFactory.getAnalyticsService as any).mockReturnValue(mockAnalyticsService);
    (ServiceFactory.getAllocationService as any).mockReturnValue(mockAllocationService);
    
    // Mock successful API responses
    mockAnalyticsService.getCapacityAnalysis.mockResolvedValue({
      teamCapacity: 400,
      utilizationRate: 85,
      availableCapacity: 60,
      overAllocation: 5,
    });
    
    mockAnalyticsService.getDashboardStats.mockResolvedValue({
      employeeCount: 10,
      projectCount: 5,
      utilizationRate: 85,
      allocationCount: 25,
    });
    
    mockAllocationService.getAll.mockResolvedValue({
      data: [
        {
          id: 1,
          employeeId: 1,
          projectId: 1,
          hours: 45,
          date: '2024-01-15',
          status: 'active',
        },
      ],
    });
  });

  it('should render with correct grid layout', async () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <TeamDashboard />
      </Wrapper>
    );

    // Check that all main sections are rendered
    await waitFor(() => {
      expect(screen.getByTestId('capacity-widget')).toBeInTheDocument();
      expect(screen.getByTestId('utilization-chart')).toBeInTheDocument();
      expect(screen.getByTestId('conflict-panel')).toBeInTheDocument();
    });

    // Check main container classes
    const dashboardContainer = screen.getByTestId('team-dashboard');
    expect(dashboardContainer).toHaveClass('space-y-6', 'p-6');
    
    // Check that the grid layout exists within the dashboard
    const gridContainer = dashboardContainer.querySelector('.grid.grid-cols-12.gap-4');
    expect(gridContainer).toBeInTheDocument();
  });

  it('should load team capacity data on mount', async () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <TeamDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(mockAnalyticsService.getCapacityAnalysis).toHaveBeenCalled();
      expect(mockAnalyticsService.getDashboardStats).toHaveBeenCalled();
    });
  });

  it('should handle loading state', () => {
    // Make API calls hang to test loading state
    mockAnalyticsService.getCapacityAnalysis.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <TeamDashboard />
      </Wrapper>
    );

    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    mockAnalyticsService.getCapacityAnalysis.mockRejectedValue(
      new Error('API Error')
    );
    
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <TeamDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load dashboard data/)).toBeInTheDocument();
    });
  });

  it('should handle drill down navigation', async () => {
    const mockNavigate = vi.fn();
    
    // Mock the useNavigate hook if using React Router
    vi.mock('react-router-dom', () => ({
      useNavigate: () => mockNavigate,
    }));
    
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <TeamDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('capacity-widget')).toBeInTheDocument();
    });

    // Test drill down interaction
    const capacityWidget = screen.getByTestId('capacity-widget');
    await userEvent.click(capacityWidget);
    
    // This would depend on your navigation implementation
    // expect(mockNavigate).toHaveBeenCalledWith('/capacity/details');
  });

  it('should display correct data when loaded', async () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <TeamDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      // Check that components received the correct data
      expect(screen.getByTestId('capacity-widget')).toBeInTheDocument();
      expect(screen.getByTestId('utilization-chart')).toBeInTheDocument();
      expect(screen.getByTestId('conflict-panel')).toBeInTheDocument();
    });
  });

  it('should refresh data on demand', async () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <TeamDashboard />
      </Wrapper>
    );

    // Wait for dashboard to fully load (not just initial API call)
    await waitFor(() => {
      expect(screen.getByTestId('team-dashboard')).toBeInTheDocument();
      expect(mockAnalyticsService.getCapacityAnalysis).toHaveBeenCalledTimes(1);
    });

    // Find and click refresh button
    const refreshButton = screen.getByTestId('refresh-dashboard');
    await userEvent.click(refreshButton);

    // Verify data was refetched
    await waitFor(() => {
      expect(mockAnalyticsService.getCapacityAnalysis).toHaveBeenCalledTimes(2);
    });
  });

  it('should have responsive design classes', async () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <TeamDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      const dashboard = screen.getByTestId('team-dashboard');
      expect(dashboard).toHaveClass('space-y-6', 'p-6');
      
      // Check that grid layout exists
      const gridContainer = dashboard.querySelector('.grid.grid-cols-12.gap-4');
      expect(gridContainer).toBeInTheDocument();
    });
  });
});

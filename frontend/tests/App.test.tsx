import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

// Mock all lazy-loaded components
vi.mock('@/features/employees', () => ({
  EmployeeManagement: () => <div data-testid="employee-management">Employee Management</div>
}));

vi.mock('@/features/projects', () => ({
  ProjectManagement: () => <div data-testid="project-management">Project Management</div>
}));

vi.mock('@/features/allocations', () => ({
  AllocationManagement: () => <div data-testid="allocation-management">Allocation Management</div>
}));

vi.mock('@/components/pages/AllocationsPage', () => ({
  AllocationsPage: () => <div data-testid="allocations-page">Allocations Page</div>
}));

vi.mock('@/components/pages/ReportsPage', () => ({
  ReportsPage: () => <div data-testid="reports-page">Reports Page</div>
}));

vi.mock('@/components/pages/PlanningPage', () => ({
  PlanningPage: () => <div data-testid="planning-page">Planning Page</div>
}));

vi.mock('@/components/pages/TeamDashboard', () => ({
  TeamDashboard: () => <div data-testid="team-dashboard">Team Dashboard</div>
}));

vi.mock('@/components/schedule/WeeklyScheduleGrid', () => ({
  default: () => <div data-testid="weekly-schedule">Weekly Schedule</div>
}));

vi.mock('@/pages/EnhancedSchedulePage', () => ({
  default: () => <div data-testid="enhanced-schedule">Enhanced Schedule</div>
}));

vi.mock('@/components/allocations/ResourceAllocationForm', () => ({
  default: () => <div data-testid="allocation-form">Allocation Form</div>
}));

// Mock the API service
vi.mock('@/services/api', () => ({
  apiService: {
    getDashboardStats: vi.fn().mockResolvedValue({
      employeeCount: 5,
      projectCount: 3,
      utilizationRate: 75,
      allocationCount: 10
    })
  }
}));

// Mock toast provider
vi.mock('@/components/ui/toast-provider', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock error boundary
vi.mock('@/components/error/ErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(document.querySelector('[data-testid="app-container"]')).toBeInTheDocument();
  });

  it('renders navigation menu', () => {
    render(<App />);

    expect(screen.getByTestId('main-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('nav-employees')).toBeInTheDocument();
    expect(screen.getByTestId('nav-projects')).toBeInTheDocument();
    expect(screen.getByTestId('nav-allocations')).toBeInTheDocument();
    expect(screen.getByTestId('nav-schedule')).toBeInTheDocument();
    expect(screen.getByTestId('nav-enhanced-schedule')).toBeInTheDocument();
    expect(screen.getByTestId('nav-reports')).toBeInTheDocument();
    expect(screen.getByTestId('nav-planning')).toBeInTheDocument();
    expect(screen.getByTestId('nav-team-dashboard')).toBeInTheDocument();
  });

  it('renders dashboard on root path', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  it('displays dashboard stats when loaded', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // employeeCount
      expect(screen.getByText('3')).toBeInTheDocument(); // projectCount
      expect(screen.getByText('75%')).toBeInTheDocument(); // utilizationRate
    });
  });

  it('wraps application with required providers', () => {
    render(<App />);

    // The app should render successfully with all providers
    expect(screen.getByTestId('app-container')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });
});
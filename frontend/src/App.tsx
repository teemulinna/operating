import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/ui/toast-provider';
import ErrorBoundary from './components/error/ErrorBoundary';
import { apiService } from './services/api';

// Import features with lazy loading for better performance
const EmployeeManagement = React.lazy(() => import('./features/employees').then(m => ({ default: m.EmployeeManagement })));
const ProjectManagement = React.lazy(() => import('./features/projects').then(m => ({ default: m.ProjectManagement })));
const AllocationManagement = React.lazy(() => import('./features/allocations').then(m => ({ default: m.AllocationManagement })));

// Import page components with lazy loading
const AllocationsPage = React.lazy(() => import('./components/pages/AllocationsPage').then(m => ({ default: m.AllocationsPage })));
const ReportsPage = React.lazy(() => import('./components/pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const PlanningPage = React.lazy(() => import('./components/pages/PlanningPage').then(m => ({ default: m.PlanningPage })));
const TeamDashboard = React.lazy(() => import('./components/pages/TeamDashboard').then(m => ({ default: m.TeamDashboard })));
const WeeklyScheduleGrid = React.lazy(() => import('./components/schedule/WeeklyScheduleGrid'));
const EnhancedSchedulePage = React.lazy(() => import('./pages/EnhancedSchedulePage'));
const ResourceAllocationForm = React.lazy(() => import('./components/allocations/ResourceAllocationForm'));

// Loading component for lazy loaded routes
const LoadingFallback = () => (
  <div style={{ padding: '40px', textAlign: 'center' }}>
    <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    <p style={{ marginTop: '20px', color: '#666' }}>Loading...</p>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Navigation with React Router Links
function Navigation() {
  return (
    <nav data-testid="main-navigation" style={{ padding: '10px', background: '#f5f5f5' }}>
      <Link to="/" data-testid="nav-dashboard" style={{ marginRight: '10px' }}>Dashboard</Link>
      <Link to="/employees" data-testid="nav-employees" style={{ marginRight: '10px' }}>Employees</Link>
      <Link to="/projects" data-testid="nav-projects" style={{ marginRight: '10px' }}>Projects</Link>
      <Link to="/allocations" data-testid="nav-allocations" style={{ marginRight: '10px' }}>Allocations</Link>
      <Link to="/schedule" data-testid="nav-schedule" style={{ marginRight: '10px' }}>Schedule</Link>
      <Link to="/enhanced-schedule" data-testid="nav-enhanced-schedule" style={{ marginRight: '10px' }}>Enhanced Schedule</Link>
      <Link to="/reports" data-testid="nav-reports" style={{ marginRight: '10px' }}>Reports</Link>
      <Link to="/planning" data-testid="nav-planning" style={{ marginRight: '10px' }}>Planning</Link>
      <Link to="/team-dashboard" data-testid="nav-team-dashboard">Team</Link>
    </nav>
  );
}

// Dashboard Component with real data
function Dashboard() {
  const [stats, setStats] = React.useState({
    employeeCount: 0,
    projectCount: 0,
    utilizationRate: 0,
    allocationCount: 0
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Loading skeleton component
  if (loading) {
    return (
      <div data-testid="dashboard-page" style={{ padding: '20px' }}>
        <h1>Dashboard</h1>
        <p>ResourceForge - Intelligent Resource Planning & Capacity Management</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div style={{ height: '20px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '10px', animation: 'pulse 2s infinite' }}></div>
              <div style={{ height: '40px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '10px', animation: 'pulse 2s infinite' }}></div>
              <div style={{ height: '15px', background: '#e5e7eb', borderRadius: '4px', width: '60%', animation: 'pulse 2s infinite' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page" style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      <p>ResourceForge - Intelligent Resource Planning & Capacity Management</p>

      {error && (
        <div style={{ color: 'red', padding: '10px', background: '#fee', borderRadius: '4px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Employees</h3>
          <p style={{ fontSize: '2em', color: '#2563eb', fontWeight: 'bold' }}>
            {stats.employeeCount}
          </p>
          <p style={{ color: '#666' }}>Total team members</p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Projects</h3>
          <p style={{ fontSize: '2em', color: '#16a34a', fontWeight: 'bold' }}>
            {stats.projectCount}
          </p>
          <p style={{ color: '#666' }}>Active projects</p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Utilization</h3>
          <p style={{ fontSize: '2em', color: '#ea580c', fontWeight: 'bold' }}>
            {`${stats.utilizationRate}%`}
          </p>
          <p style={{ color: '#666' }}>Team capacity</p>
        </div>
      </div>

      {/* Add empty state if no data */}
      {!loading && stats.employeeCount === 0 && stats.projectCount === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', marginTop: '20px' }}>
          <h2 style={{ color: '#666' }}>Welcome to ResourceForge!</h2>
          <p style={{ color: '#999' }}>Start by adding employees and creating projects to see your resource utilization.</p>
        </div>
      )}
    </div>
  );
}

// Placeholders replaced with actual components

function App() {
  console.log('App with Router rendering');

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <Router>
            <div data-testid="app-container">
              <Navigation />
              <main data-testid="main-content" style={{ padding: '20px' }}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/employees" element={
                    <React.Suspense fallback={<LoadingFallback />}>
                      <div data-testid="employees-page">
                        <EmployeeManagement />
                      </div>
                    </React.Suspense>
                  } />
                  <Route path="/projects" element={
                    <React.Suspense fallback={<LoadingFallback />}>
                      <div data-testid="projects-page">
                        <ProjectManagement />
                      </div>
                    </React.Suspense>
                  } />
                  <Route path="/allocations" element={
                    <React.Suspense fallback={<LoadingFallback />}>
                      <div data-testid="allocations-page">
                        <AllocationManagement />
                      </div>
                    </React.Suspense>
                  } />
                  <Route path="/schedule" element={
                    <React.Suspense fallback={<LoadingFallback />}>
                      <div data-testid="schedule-page">
                        <WeeklyScheduleGrid />
                      </div>
                    </React.Suspense>
                  } />
                  <Route path="/enhanced-schedule" element={
                    <React.Suspense fallback={<LoadingFallback />}>
                      <EnhancedSchedulePage />
                    </React.Suspense>
                  } />
                  <Route path="/reports" element={
                    <React.Suspense fallback={<LoadingFallback />}>
                      <ReportsPage />
                    </React.Suspense>
                  } />
                  <Route path="/planning" element={
                    <React.Suspense fallback={<LoadingFallback />}>
                      <PlanningPage />
                    </React.Suspense>
                  } />
                  <Route path="/team-dashboard" element={
                    <React.Suspense fallback={<LoadingFallback />}>
                      <TeamDashboard />
                    </React.Suspense>
                  } />
                  <Route path="/allocations/new" element={
                    <React.Suspense fallback={<LoadingFallback />}>
                      <div style={{ padding: '20px' }}>
                        <ResourceAllocationForm onSubmit={() => console.log('Allocation created')} />
                      </div>
                    </React.Suspense>
                  } />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
            </div>
          </Router>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
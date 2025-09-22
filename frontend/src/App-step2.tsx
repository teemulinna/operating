import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Start with just EmployeeManagement to test
import { EmployeeManagement } from './features/employees';

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
      <Link to="/allocations" data-testid="nav-allocations">Allocations</Link>
    </nav>
  );
}

// Simple placeholder components
function Dashboard() {
  return <div data-testid="dashboard-page"><h1>Dashboard</h1></div>;
}

function ProjectsPlaceholder() {
  return <div data-testid="projects-page"><h1>Projects (Coming Soon)</h1></div>;
}

function AllocationsPlaceholder() {
  return <div data-testid="allocations-page"><h1>Allocations (Coming Soon)</h1></div>;
}

function App() {
  console.log('App with Router rendering');

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div data-testid="app-container">
          <Navigation />
          <main data-testid="main-content" style={{ padding: '20px' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/employees" element={
                <div data-testid="employees-page">
                  <EmployeeManagement />
                </div>
              } />
              <Route path="/projects" element={<ProjectsPlaceholder />} />
              <Route path="/allocations" element={<AllocationsPlaceholder />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainNavigation } from './components/layout/MainNavigation';

// Simple Dashboard component for TDD GREEN phase
function SimpleDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Resource planning overview and key performance metrics
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Employees</dt>
                  <dd className="text-lg font-semibold text-gray-900">42</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-lg"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Projects</dt>
                  <dd className="text-lg font-semibold text-gray-900">8</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Welcome to ResourceForge</h2>
        <p className="text-gray-600">
          Your intelligent resource planning and capacity management platform is loading successfully!
        </p>
      </div>
    </div>
  );
}

// Simple Employee Management Page for TDD GREEN phase
function SimpleEmployeePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Employee Management</h1>
      <p className="text-gray-600 mb-8">
        Employee management page loaded successfully. This is a minimal working version.
      </p>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Team Overview</h2>
        <p className="text-gray-600">
          Employee management features will be implemented here.
        </p>
      </div>
    </div>
  );
}

// Simple Project Management Page for TDD GREEN phase
function SimpleProjectPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Management</h1>
      <p className="text-gray-600 mb-8">
        Project management page loaded successfully. This is a minimal working version.
      </p>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Project Overview</h2>
        <p className="text-gray-600">
          Project management features will be implemented here.
        </p>
      </div>
    </div>
  );
}

// Simple Schedule Page for TDD GREEN phase
function SimpleSchedulePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Schedule</h1>
      <p className="text-gray-600 mb-8">
        Schedule page loaded successfully. This is a minimal working version.
      </p>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Resource Schedule</h2>
        <p className="text-gray-600">
          Schedule management features will be implemented here.
        </p>
      </div>
    </div>
  );
}

// Simple Reports Page for TDD GREEN phase
function SimpleReportsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Reporting & Analytics</h1>
      <p className="text-gray-600 mb-8">
        Reports page loaded successfully. This is a minimal working version.
      </p>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics Dashboard</h2>
        <p className="text-gray-600">
          Reporting and analytics features will be implemented here.
        </p>
      </div>
    </div>
  );
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <MainNavigation />
          <main>
            <Routes>
              <Route path="/" element={<SimpleDashboard />} />
              <Route path="/dashboard" element={<SimpleDashboard />} />
              <Route path="/employees" element={<SimpleEmployeePage />} />
              <Route path="/projects" element={<SimpleProjectPage />} />
              <Route path="/schedule" element={<SimpleSchedulePage />} />
              <Route path="/reports" element={<SimpleReportsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/error/ErrorTracker';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Lazy load components for code splitting
const Dashboard = lazy(() => import('@/components/dashboard/Dashboard'));
const EmployeeList = lazy(() => import('@/components/employees/OptimizedEmployeeList'));
const EmployeeForm = lazy(() => import('@/components/employees/EmployeeForm'));
const PerformanceDashboard = lazy(() => import('@/components/performance/PerformanceDashboard'));
const ErrorDashboard = lazy(() => import('@/components/error/ErrorTracker').then(m => ({ default: m.ErrorDashboard })));
const AvailabilityStatus = lazy(() => import('@/components/capacity/AvailabilityStatus'));

// Loading component
const LoadingFallback = ({ message = "Loading..." }: { message?: string }) => (
  <Card className="w-full max-w-sm mx-auto mt-8">
    <CardContent className="flex flex-col items-center justify-center p-6">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
      <p className="text-gray-600 text-sm">{message}</p>
    </CardContent>
  </Card>
);

// Error fallback component for routes
const RouteErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
  <Card className="max-w-2xl mx-auto mt-8 border-red-200 bg-red-50">
    <CardContent className="p-6">
      <h2 className="text-lg font-semibold text-red-800 mb-2">Failed to load page</h2>
      <p className="text-red-700 mb-4">
        There was an error loading this page. Please try again.
      </p>
      <button 
        onClick={retry}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    </CardContent>
  </Card>
);

export const LazyRoutes = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ErrorBoundary fallback={RouteErrorFallback}>
            <Suspense fallback={<LoadingFallback message="Loading dashboard..." />}>
              <Dashboard />
            </Suspense>
          </ErrorBoundary>
        }
      />
      
      <Route
        path="/employees"
        element={
          <ErrorBoundary fallback={RouteErrorFallback}>
            <Suspense fallback={<LoadingFallback message="Loading employees..." />}>
              <EmployeeList employees={[]} />
            </Suspense>
          </ErrorBoundary>
        }
      />
      
      <Route
        path="/employees/new"
        element={
          <ErrorBoundary fallback={RouteErrorFallback}>
            <Suspense fallback={<LoadingFallback message="Loading employee form..." />}>
              <EmployeeForm />
            </Suspense>
          </ErrorBoundary>
        }
      />
      
      <Route
        path="/employees/:id/edit"
        element={
          <ErrorBoundary fallback={RouteErrorFallback}>
            <Suspense fallback={<LoadingFallback message="Loading employee form..." />}>
              <EmployeeForm />
            </Suspense>
          </ErrorBoundary>
        }
      />
      
      <Route
        path="/availability"
        element={
          <ErrorBoundary fallback={RouteErrorFallback}>
            <Suspense fallback={<LoadingFallback message="Loading availability status..." />}>
              <AvailabilityStatus employees={[]} />
            </Suspense>
          </ErrorBoundary>
        }
      />
      
      <Route
        path="/performance"
        element={
          <ErrorBoundary fallback={RouteErrorFallback}>
            <Suspense fallback={<LoadingFallback message="Loading performance dashboard..." />}>
              <PerformanceDashboard />
            </Suspense>
          </ErrorBoundary>
        }
      />
      
      <Route
        path="/errors"
        element={
          <ErrorBoundary fallback={RouteErrorFallback}>
            <Suspense fallback={<LoadingFallback message="Loading error dashboard..." />}>
              <ErrorDashboard />
            </Suspense>
          </ErrorBoundary>
        }
      />
      
      {/* 404 Route */}
      <Route
        path="*"
        element={
          <Card className="max-w-2xl mx-auto mt-8">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
              <p className="text-gray-600 mb-4">
                The page you're looking for doesn't exist.
              </p>
              <button 
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors mr-2"
              >
                Go Back
              </button>
              <a 
                href="/"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Home
              </a>
            </CardContent>
          </Card>
        }
      />
    </Routes>
  );
};

export default LazyRoutes;
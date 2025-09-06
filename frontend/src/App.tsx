import React, { useState, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ErrorBoundary } from 'react-error-boundary'
import { EmployeeList } from '@/components/employees/EmployeeList'
import { EmployeeFormEnhanced } from '@/components/employees/EmployeeFormEnhanced'
import { Toaster } from '@/components/ui/toaster'
import { CSVImport } from '@/components/employees/CSVImport'
import { ProjectList } from '@/components/projects/ProjectList'
import { ProjectStatsWidget } from '@/components/dashboard/ProjectStatsWidget'
import { EnhancedDashboard } from '@/components/dashboard/EnhancedDashboard'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import { useCSVExport, useEmployees } from '@/hooks/useEmployees'
import { SkipToMainContent, GlobalErrorBoundary } from '@/components/ui/accessibility-enhancements'
import { MobileNavigation } from '@/components/ui/mobile-navigation'
import { EnhancedErrorHandler, useErrorHandler } from '@/components/ui/enhanced-error-handler'
import { LoadingSkeletons } from '@/components/ui/LoadingSkeletons'
import { LazyLoadOnVisible } from '@/components/ui/performance-optimizations'
import type { Employee } from '@/types/employee'
import './index.css'

// Lazy load heavy components
const ResourceAllocationDashboard = React.lazy(() => 
  import('@/components/dashboard/ResourceAllocationDashboard').then(module => ({
    default: module.ResourceAllocationDashboard
  }))
);

const EnhancedResourcePlanner = React.lazy(() =>
  import('@/components/resource-planning/EnhancedResourcePlanner').then(module => ({
    default: module.EnhancedResourcePlanner
  }))
);

// Create a client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (except 408)
        if (error?.response?.status >= 400 && error?.response?.status < 500 && error?.response?.status !== 408) {
          return false
        }
        return failureCount < 3
      },
    },
  },
})

// Extended view modes to include all sections
type ViewMode = 'employees' | 'create' | 'edit' | 'import' | 'resources' | 'projects' | 'dashboard'

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const csvExport = useCSVExport()
  const { data: employeesData } = useEmployees()
  const employees = employeesData?.employees || []
  const { error, clearError, handleError } = useErrorHandler()

  // Mock dashboard data - in real app, this would come from API
  const dashboardData = {
    employees: employees,
    projects: [],
    capacityData: [],
    recentActivity: [],
    metrics: {
      totalEmployees: employees.length,
      activeProjects: 0,
      avgUtilization: 0.75,
      criticalIssues: 0,
      completedTasks: 0,
      pendingTasks: 0
    }
  }

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee)
    // Could navigate to detail view or show modal
    console.log('Employee selected:', employee)
  }

  const handleEmployeeCreate = () => {
    setSelectedEmployee(null)
    setCurrentView('create')
  }

  const handleEmployeeEdit = (employee: Employee) => {
    setSelectedEmployee(employee)
    setCurrentView('edit')
  }

  const handleCSVImport = () => {
    setCurrentView('import')
  }

  const handleCSVExport = async () => {
    try {
      const blob = await csvExport.mutateAsync({})
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `employees_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleFormSuccess = (employee: Employee) => {
    console.log('Employee saved:', employee)
    setCurrentView('employees')
    setSelectedEmployee(null)
  }

  const handleFormCancel = () => {
    setCurrentView('employees')
    setSelectedEmployee(null)
  }

  const handleImportSuccess = (result: { imported: number; errors: string[] }) => {
    console.log('Import completed:', result)
    // Could show toast notification
    setTimeout(() => {
      setCurrentView('employees')
    }, 2000)
  }

  const handleImportCancel = () => {
    setCurrentView('employees')
  }

  const currentUser = {
    name: 'Admin User',
    role: 'System Administrator',
    avatar: undefined
  };

  return (
    <div className="min-h-screen bg-background" data-testid="app-loaded">
      <SkipToMainContent />
      
      {/* Mobile Navigation */}
      <MobileNavigation
        currentView={currentView}
        onNavigate={setCurrentView}
        notifications={3}
        user={currentUser}
      />

      <div className="lg:pl-0">
        {/* Desktop Header */}
        <header className="hidden lg:block sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200 safe-area-top">
          <div className="container mx-auto px-6 h-16">
            <div className="flex items-center justify-between h-full">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Resource Planning System
                </h1>
              </div>
              
              {/* Desktop Navigation */}
              <nav className="flex space-x-1" data-testid="desktop-navigation">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                  { id: 'employees', label: 'Employees', icon: '👥' },
                  { id: 'projects', label: 'Projects', icon: '📋' },
                  { id: 'resources', label: 'Resources', icon: '🔧' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as ViewMode)}
                    data-testid={`${item.id}-tab`}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      currentView === item.id || (item.id === 'employees' && ['create', 'edit', 'import'].includes(currentView))
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main id="main-content" className="pb-20 lg:pb-8">
          {/* Global Error Display */}
          {error && (
            <div className="container mx-auto px-4 py-4">
              <EnhancedErrorHandler
                error={error}
                onClose={clearError}
                onRetry={clearError}
              />
            </div>
          )}

          {/* Dashboard View */}
          {currentView === 'dashboard' && (
            <LazyLoadOnVisible
              fallback={<LoadingSkeletons.Dashboard />}
              className="container mx-auto"
            >
              <EnhancedDashboard 
                data={dashboardData}
                onNavigate={setCurrentView}
              />
            </LazyLoadOnVisible>
          )}

          {/* Employee Views */}
          {currentView === 'employees' && (
            <div className="container mx-auto px-4 py-6">
              <EmployeeList
                onEmployeeSelect={handleEmployeeSelect}
                onEmployeeCreate={handleEmployeeCreate}
                onEmployeeEdit={handleEmployeeEdit}
                onCSVImport={handleCSVImport}
                onCSVExport={handleCSVExport}
              />
            </div>
          )}

          {/* Projects View */}
          {currentView === 'projects' && (
            <div className="container mx-auto px-4 py-6">
              <ProjectList />
            </div>
          )}

          {/* Resources View */}
          {currentView === 'resources' && (
            <div data-testid="resource-planner">
              <Suspense fallback={<LoadingSkeletons.Dashboard includeResourceCards />}>
                <ResourceAllocationDashboard />
              </Suspense>
            </div>
          )}

          {/* Employee Form Views */}
          {(currentView === 'create' || currentView === 'edit') && (
            <div className="container mx-auto px-4 py-6">
              <EmployeeFormEnhanced
                employee={selectedEmployee ?? undefined}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            </div>
          )}

          {/* CSV Import View */}
          {currentView === 'import' && (
            <div className="container mx-auto px-4 py-6">
              <CSVImport
                onSuccess={handleImportSuccess}
                onCancel={handleImportCancel}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider url={import.meta.env.VITE_API_URL || 'http://localhost:3001'}>
          <AppContent />
          <Toaster />
          <ReactQueryDevtools initialIsOpen={false} />
        </WebSocketProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  )
}

export default App
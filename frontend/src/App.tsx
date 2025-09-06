import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { EmployeeList } from '@/components/employees/EmployeeList'
import { EmployeeFormEnhanced } from '@/components/employees/EmployeeFormEnhanced'
import { Toaster } from '@/components/ui/toaster'
import { CSVImport } from '@/components/employees/CSVImport'
import { ResourceAllocationDashboard } from '@/components/dashboard/ResourceAllocationDashboard'
import { ProjectList } from '@/components/projects/ProjectList'
import { ProjectStatsWidget } from '@/components/dashboard/ProjectStatsWidget'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import { useCSVExport, useEmployees } from '@/hooks/useEmployees'
import type { Employee } from '@/types/employee'
import './index.css'

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
  const [currentView, setCurrentView] = useState<ViewMode>('employees')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const csvExport = useCSVExport()
  const { data: employeesData } = useEmployees()
  const employees = employeesData?.employees || []

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Employee Management System
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your organization's workforce efficiently
              </p>
            </div>
            
            {/* Main Navigation Menu */}
            <nav className="flex space-x-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setCurrentView('employees')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  ['employees', 'create', 'edit', 'import'].includes(currentView)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                👥 Employees
              </button>
              <button
                onClick={() => setCurrentView('projects')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'projects'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📋 Projects
              </button>
              <button
                onClick={() => setCurrentView('resources')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'resources'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🔧 Resources
              </button>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main>
          {/* Dashboard View */}
          {currentView === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Stats Widget */}
                <ProjectStatsWidget />
                
                {/* Quick Actions Card */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setCurrentView('employees')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <span className="text-xl">👥</span>
                      <div className="text-left">
                        <div className="font-medium">Manage Employees</div>
                        <div className="text-sm text-blue-600">View and edit employee information</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setCurrentView('projects')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <span className="text-xl">📋</span>
                      <div className="text-left">
                        <div className="font-medium">Manage Projects</div>
                        <div className="text-sm text-green-600">Create and track project progress</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setCurrentView('resources')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <span className="text-xl">🔧</span>
                      <div className="text-left">
                        <div className="font-medium">Resource Allocation</div>
                        <div className="text-sm text-purple-600">Optimize team capacity and workload</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Additional Dashboard Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow">
                  <h4 className="text-lg font-semibold mb-2">System Status</h4>
                  <p className="text-blue-100">All systems operational</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow">
                  <h4 className="text-lg font-semibold mb-2">Recent Activity</h4>
                  <p className="text-green-100">Updates in real-time</p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow">
                  <h4 className="text-lg font-semibold mb-2">Performance</h4>
                  <p className="text-purple-100">Optimal efficiency</p>
                </div>
              </div>
            </div>
          )}

          {/* Employee Views */}
          {currentView === 'employees' && (
            <EmployeeList
              onEmployeeSelect={handleEmployeeSelect}
              onEmployeeCreate={handleEmployeeCreate}
              onEmployeeEdit={handleEmployeeEdit}
              onCSVImport={handleCSVImport}
              onCSVExport={handleCSVExport}
            />
          )}

          {/* Projects View */}
          {currentView === 'projects' && (
            <ProjectList />
          )}

          {/* Resources View */}
          {currentView === 'resources' && (
            <ResourceAllocationDashboard />
          )}

          {/* Employee Form Views */}
          {(currentView === 'create' || currentView === 'edit') && (
            <EmployeeFormEnhanced
              employee={selectedEmployee ?? undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          )}

          {/* CSV Import View */}
          {currentView === 'import' && (
            <CSVImport
              onSuccess={handleImportSuccess}
              onCancel={handleImportCancel}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider url={import.meta.env.VITE_API_URL || 'http://localhost:3001'}>
        <AppContent />
        <Toaster />
        <ReactQueryDevtools initialIsOpen={false} />
      </WebSocketProvider>
    </QueryClientProvider>
  )
}

export default App
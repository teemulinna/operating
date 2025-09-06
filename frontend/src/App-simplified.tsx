import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { EmployeeList } from '@/components/employees/EmployeeList'
import { EmployeeForm } from '@/components/employees/EmployeeForm'
import { CSVImport } from '@/components/employees/CSVImport'
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

// Simplified view modes - focus on employee management first
type ViewMode = 'list' | 'create' | 'edit' | 'import'

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewMode>('list')
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
    setCurrentView('list')
    setSelectedEmployee(null)
  }

  const handleFormCancel = () => {
    setCurrentView('list')
    setSelectedEmployee(null)
  }

  const handleImportSuccess = (result: { imported: number; errors: string[] }) => {
    console.log('Import completed:', result)
    // Could show toast notification
    setTimeout(() => {
      setCurrentView('list')
    }, 2000)
  }

  const handleImportCancel = () => {
    setCurrentView('list')
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
            
            {/* Navigation Menu - Simplified */}
            {currentView === 'list' ? (
              <div className="flex space-x-2">
                <div className="px-4 py-2 bg-gray-400 text-white rounded-lg font-medium opacity-75">
                  📅 Capacity Features (Coming Soon)
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentView('list')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← Back to Employee List
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content - Employee Management Only */}
        <main>
          {currentView === 'list' && (
            <EmployeeList
              onEmployeeSelect={handleEmployeeSelect}
              onEmployeeCreate={handleEmployeeCreate}
              onEmployeeEdit={handleEmployeeEdit}
              onCSVImport={handleCSVImport}
              onCSVExport={handleCSVExport}
            />
          )}

          {(currentView === 'create' || currentView === 'edit') && (
            <EmployeeForm
              employee={selectedEmployee ?? undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          )}

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
      <AppContent />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
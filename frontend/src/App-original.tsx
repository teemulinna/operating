import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { EmployeeList } from '@/components/employees/EmployeeList'
import { EmployeeForm } from '@/components/employees/EmployeeForm'
import { CSVImport } from '@/components/employees/CSVImport'
import { CapacityCalendar, AvailabilityStatus, CapacityEditor, ResourceUtilization, CapacitySearch } from '@/components/capacity'
import { useCSVExport, useEmployees } from '@/hooks/useEmployees'
import type { Employee } from '@/types/employee'
import type { CapacityEntry } from '@/types/capacity'
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

type ViewMode = 'list' | 'create' | 'edit' | 'import' | 'capacity-calendar' | 'availability-status' | 'capacity-editor' | 'resource-utilization' | 'capacity-search'

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewMode>('list')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [selectedCapacity, setSelectedCapacity] = useState<CapacityEntry | null>(null)
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

  // Capacity management handlers
  const handleCapacityCalendar = () => {
    setCurrentView('capacity-calendar')
  }

  const handleAvailabilityStatus = () => {
    setCurrentView('availability-status')
  }

  const handleResourceUtilization = () => {
    setCurrentView('resource-utilization')
  }

  const handleCapacitySearch = () => {
    setCurrentView('capacity-search')
  }

  const handleCapacityEdit = (capacity?: CapacityEntry) => {
    setSelectedCapacity(capacity || null)
    setCurrentView('capacity-editor')
  }

  const handleCapacityEmployeeSelect = (employee: Employee, capacity?: CapacityEntry) => {
    setSelectedEmployee(employee)
    setSelectedCapacity(capacity || null)
    setCurrentView('capacity-editor')
  }

  const handleCapacitySave = (capacity: CapacityEntry) => {
    console.log('Capacity saved:', capacity)
    setCurrentView('capacity-calendar')
    setSelectedCapacity(null)
  }

  const handleCapacityCancel = () => {
    setCurrentView('capacity-calendar')
    setSelectedCapacity(null)
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
                Manage your organization's workforce and capacity efficiently
              </p>
            </div>
            
            {/* Navigation Menu */}
            {currentView === 'list' ? (
              <div className="flex space-x-2">
                <button
                  onClick={handleCapacityCalendar}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  📅 Capacity Calendar
                </button>
                <button
                  onClick={handleAvailabilityStatus}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  📊 Team Status
                </button>
                <button
                  onClick={handleResourceUtilization}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  📈 Utilization
                </button>
                <button
                  onClick={handleCapacitySearch}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  🔍 Find Capacity
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentView('list')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← Back to Dashboard
                </button>
                
                {/* Quick nav for capacity views */}
                {(currentView.startsWith('capacity-') || currentView === 'availability-status' || currentView === 'resource-utilization') && (
                  <div className="flex space-x-2 text-sm">
                    <button
                      onClick={handleCapacityCalendar}
                      className={`px-3 py-1 rounded ${currentView === 'capacity-calendar' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Calendar
                    </button>
                    <button
                      onClick={handleAvailabilityStatus}
                      className={`px-3 py-1 rounded ${currentView === 'availability-status' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Status
                    </button>
                    <button
                      onClick={handleResourceUtilization}
                      className={`px-3 py-1 rounded ${currentView === 'resource-utilization' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Utilization
                    </button>
                    <button
                      onClick={handleCapacitySearch}
                      className={`px-3 py-1 rounded ${currentView === 'capacity-search' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Search
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
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

          {/* Capacity Management Views */}
          {currentView === 'capacity-calendar' && (
            <CapacityCalendar
              employees={employees}
              weekStart={new Date().toISOString().split('T')[0]}
              onCapacityEdit={handleCapacityEdit}
              onEmployeeClick={handleEmployeeSelect}
            />
          )}

          {currentView === 'availability-status' && (
            <AvailabilityStatus
              employees={employees}
              realTimeUpdates={true}
              onStatusChange={(employeeId, status) => {
                console.log(`Status changed for employee ${employeeId}: ${status}`)
              }}
            />
          )}

          {currentView === 'capacity-editor' && (
            <CapacityEditor
              employee={selectedEmployee || undefined}
              capacity={selectedCapacity || undefined}
              onSave={handleCapacitySave}
              onCancel={handleCapacityCancel}
              employees={employees}
            />
          )}

          {currentView === 'resource-utilization' && (
            <ResourceUtilization
              employees={employees}
              onEmployeeSelect={handleEmployeeSelect}
              onDepartmentSelect={(department) => {
                console.log('Department selected:', department)
              }}
            />
          )}

          {currentView === 'capacity-search' && (
            <CapacitySearch
              employees={employees}
              onEmployeeSelect={handleCapacityEmployeeSelect}
              onCapacityFound={(results) => {
                console.log('Capacity search results:', results)
              }}
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
import React, { useState } from 'react'
import { Plus, Search, Filter, Download, Upload, Edit, Trash2, RefreshCw, AlertCircle, Users, Clock, Calendar } from 'lucide-react'
import { useMultipleEmployeeCapacities } from '@/hooks/useEmployeeCapacity'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmployeeListSkeleton } from './EmployeeListSkeleton'
import { useToast } from '@/hooks/useToast'
import type { Employee } from '@/types/employee'
import { StatusBadge, CapacityProgressBar } from '@/components/capacity/CapacityIndicator'
import { CapacityEditor } from '@/components/capacity/CapacityEditor'
import { WeeklyCapacityCalendar } from '@/components/capacity/WeeklyCapacityCalendar'
import { useManagedEmployees } from '@/hooks/useManagedEmployees'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'

interface EmployeeListProps {
  onEmployeeSelect?: (employee: Employee) => void
  onEmployeeCreate?: () => void
  onEmployeeEdit?: (employee: Employee) => void
  onCSVImport?: () => void
  onCSVExport?: () => void
}

export function EmployeeList({ 
  onEmployeeSelect, 
  onEmployeeCreate, 
  onEmployeeEdit,
  onCSVImport,
  onCSVExport 
}: EmployeeListProps) {
  const {
    employees,
    total,
    totalPages,
    isLoading,
    isRefetching,
    error,
    pagination,
    searchTerm,
    employeeToDelete,
    isDeleting,
    handleSearchChange,
    handleSort,
    handlePageChange,
    handleDeleteRequest,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleRefresh,
    clearSearch,
    deleteEmployee,
  } = useManagedEmployees();

  // Capacity management state (incremental enhancement)
  const [viewMode, setViewMode] = useState<'table' | 'capacity'>('table')
  const [capacityEditorOpen, setCapacityEditorOpen] = useState(false)
  const [selectedEmployeeForCapacity, setSelectedEmployeeForCapacity] = useState<Employee | null>(null)
  const { toast } = useToast()

  // Get employee IDs for capacity fetching
  const employeeIds = employees.map(emp => emp.id)
  
  // Fetch capacity data for all employees (with graceful degradation)
  const { data: capacityData, isLoading: capacityLoading } = useMultipleEmployeeCapacities(
    employeeIds, 
    new Date().toISOString().split('T')[0], // Today's date
    { enabled: employeeIds.length > 0 }
  )

  // Capacity management handlers (incremental enhancement)
  const handleOpenCapacityEditor = (employee: Employee) => {
    setSelectedEmployeeForCapacity(employee)
    setCapacityEditorOpen(true)
  }

  const handleSaveCapacity = (updatedEmployee: Employee) => {
    // In a real implementation, this would update the employee list
    // For now, we'll just show a success message and close the editor
    toast({
      title: 'Capacity Updated',
      description: `${updatedEmployee.firstName} ${updatedEmployee.lastName}'s capacity has been updated.`,
      variant: 'success'
    })
  }

  const handleCloseCapacityEditor = () => {
    setCapacityEditorOpen(false)
    setSelectedEmployeeForCapacity(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString))
  }

  // Show skeleton while initially loading
  if (isLoading && employees.length === 0) {
    return <EmployeeListSkeleton />
  }

  // Error state with retry option
  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Unable to Load Employees
              </h3>
              <p className="text-gray-600 mb-4 max-w-md">
                {error.message || 'An unexpected error occurred while loading employee data.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button onClick={onEmployeeCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  const isEmpty = employees.length === 0 && !searchTerm
  const noSearchResults = employees.length === 0 && searchTerm

  if (isEmpty) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>
                Manage your organization's employee information
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onCSVImport} variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button onClick={onEmployeeCreate} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No employees yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md">
                Get started by adding your first employee or importing data from a CSV file.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={onEmployeeCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Employee
                </Button>
                <Button onClick={onCSVImport} variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Employee Directory</CardTitle>
            <CardDescription>
              Manage your organization's employee information
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="px-3"
              >
                <Users className="mr-2 h-4 w-4" />
                List View
              </Button>
              <Button
                variant={viewMode === 'capacity' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('capacity')}
                className="px-3"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Capacity View
              </Button>
            </div>
            
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={onCSVImport} variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={onCSVExport} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={onEmployeeCreate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Conditional view rendering based on viewMode */}
        {viewMode === 'capacity' ? (
          <WeeklyCapacityCalendar 
            employees={employees} 
            onEmployeeSelect={onEmployeeSelect}
          />
        ) : (
          <div>
            {/* No search results */}
            {noSearchResults ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No employees found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    No employees match your search for "<span className="font-medium">{searchTerm}</span>"
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={clearSearch}
                  >
                    Clear Search
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Show loading overlay for subsequent loads */}
            {isRefetching && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            
            {/* Employee Table */}
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('firstName')}
                    >
                      Name
                      {pagination.sortBy === 'firstName' && (
                        <span className="ml-1">
                          {pagination.sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('email')}
                    >
                      Email
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('department')}
                    >
                      Department
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('position')}
                    >
                      Position
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('salary')}
                    >
                      Salary
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('startDate')}
                    >
                      Start Date
                    </TableHead>
                    {/* Capacity columns (incremental enhancement) */}
                    <TableHead className="w-[120px]">
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        Status
                      </div>
                    </TableHead>
                    <TableHead className="w-[140px]">
                      <div className="flex items-center">
                        <Users className="mr-1 h-3 w-3" />
                        Capacity
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    // Get capacity data for this employee
                    const employeeCapacity = capacityData?.[employee.id]
                    const capacityInfo = employeeCapacity ? {
                      weeklyCapacity: {
                        weeklyHours: employeeCapacity.weeklyCapacityHours,
                        allocatedHours: employeeCapacity.currentCapacity?.allocatedHours || 0,
                        availableHours: employeeCapacity.currentCapacity?.availableHours || employeeCapacity.weeklyCapacityHours,
                        utilizationRate: employeeCapacity.weeklyUtilization,
                        lastUpdated: employeeCapacity.currentCapacity?.updatedAt || new Date().toISOString()
                      },
                      availabilityStatus: employeeCapacity.availabilityStatus,
                      currentProjects: employeeCapacity.currentCapacity?.projects?.length || 0,
                      notes: employeeCapacity.currentCapacity?.notes
                    } : null

                    return (
                    <TableRow 
                      key={employee.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => onEmployeeSelect?.(employee)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{employee.firstName} {employee.lastName}</span>
                          <span className="text-sm text-gray-500">{employee.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {employee.department}
                        </span>
                      </TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>{formatCurrency(employee.salary)}</TableCell>
                      <TableCell>{formatDate(employee.startDate)}</TableCell>
                      {/* Capacity columns (incremental enhancement) */}
                      <TableCell>
                        {capacityLoading ? (
                          <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
                        ) : capacityInfo ? (
                          <StatusBadge status={capacityInfo.availabilityStatus} />
                        ) : (
                          <StatusBadge status="available" />
                        )}
                      </TableCell>
                      <TableCell>
                        {capacityLoading ? (
                          <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                        ) : capacityInfo ? (
                          <CapacityProgressBar capacity={capacityInfo.weeklyCapacity} />
                        ) : (
                          <div className="text-xs text-gray-400">Not set</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              const employeeWithCapacity = capacityInfo ? {
                                ...employee,
                                capacity: capacityInfo
                              } : employee
                              handleOpenCapacityEditor(employeeWithCapacity)
                            }}
                            title="Edit capacity"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEmployeeEdit?.(employee)
                            }}
                            title="Edit employee"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <LoadingButton
                            variant="ghost"
                            size="icon"
                            loading={isDeleting}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteRequest(employee)
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </LoadingButton>
                        </div>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, total)} of {total} employees
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = pagination.page - 2 + i
                    if (pageNum < 1 || pageNum > totalPages) return null
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )}
    </CardContent>
    </Card>
    
    {/* Capacity Editor Modal (incremental enhancement) */}
    {selectedEmployeeForCapacity && (
      <CapacityEditor
        employee={selectedEmployeeForCapacity}
        isOpen={capacityEditorOpen}
        onClose={handleCloseCapacityEditor}
        onSave={handleSaveCapacity}
      />
    )}

    {/* Delete Confirmation Dialog */}
    {employeeToDelete && (
      <DeleteConfirmationDialog
        isOpen={!!employeeToDelete}
        onOpenChange={(isOpen) => !isOpen && handleDeleteCancel()}
        onConfirm={handleDeleteConfirm}
        employeeName={`${employeeToDelete.firstName} ${employeeToDelete.lastName}`}
      />
    )}
    </>
  )
}

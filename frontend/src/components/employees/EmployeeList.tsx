import React, { useState, useMemo } from 'react'
import { Plus, Search, Filter, Download, Upload, Edit, Trash2 } from 'lucide-react'
import { useEmployees, useDeleteEmployee } from '@/hooks/useEmployees'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Employee, EmployeeFilters, PaginationParams } from '@/types/employee'
import { debounce } from '@/lib/utils'

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
  const [filters, setFilters] = useState<EmployeeFilters>({})
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 10,
    sortBy: 'firstName',
    sortOrder: 'asc'
  })
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading, error } = useEmployees(filters, pagination)
  const deleteEmployee = useDeleteEmployee()

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setFilters(prev => ({ ...prev, search: term }))
      setPagination(prev => ({ ...prev, page: 1 }))
    }, 300),
    []
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    debouncedSearch(value)
  }

  const handleSort = (field: keyof Employee) => {
    setPagination(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1
    }))
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handleDelete = async (employee: Employee) => {
    if (window.confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
      await deleteEmployee.mutateAsync(employee.id)
    }
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

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            Error loading employees: {error.message}
          </div>
        </CardContent>
      </Card>
    )
  }

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
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Employee Table */}
            <div className="overflow-x-auto">
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
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.employees.map((employee) => (
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEmployeeEdit?.(employee)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(employee)
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Showing {((data.page - 1) * data.limit) + 1} to {Math.min(data.page * data.limit, data.total)} of {data.total} employees
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.page - 1)}
                    disabled={data.page === 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                    const pageNum = data.page - 2 + i
                    if (pageNum < 1 || pageNum > data.totalPages) return null
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === data.page ? "default" : "outline"}
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
                    onClick={() => handlePageChange(data.page + 1)}
                    disabled={data.page === data.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
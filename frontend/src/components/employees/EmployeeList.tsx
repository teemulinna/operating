import { useState } from 'react';
import { Search, Filter, Download, Upload, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployees, useDepartments, usePositions, useDeleteEmployee, useEmployeeCSV } from '@/hooks/useEmployees';
import { Employee, EmployeeFilters, PaginationParams } from '@/types/employee';
import { EmployeeDialog } from './EmployeeDialog';
import { CSVImportDialog } from './CSVImportDialog';
import { cn } from '@/utils/cn';

interface EmployeeListProps {
  onEmployeeSelect?: (employee: Employee) => void;
  selectedEmployeeId?: number;
}

export function EmployeeList({ onEmployeeSelect, selectedEmployeeId }: EmployeeListProps) {
  const [filters, setFilters] = useState<EmployeeFilters>({
    search: '',
    department: '',
    position: '',
    status: 'all',
  });

  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 20,
    sortBy: 'lastName',
    sortOrder: 'asc',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [showCSVImport, setShowCSVImport] = useState(false);

  // Data fetching
  const { data: employeesData, isLoading, error, refetch } = useEmployees(filters, pagination);
  const { data: departments } = useDepartments();
  const { data: positions } = usePositions();
  const { mutate: deleteEmployee } = useDeleteEmployee();
  const { exportCSV } = useEmployeeCSV();

  // Handlers
  const handleFilterChange = (key: keyof EmployeeFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleSort = (sortBy: keyof Employee) => {
    setPagination(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const handleEmployeeAction = (action: 'create' | 'edit' | 'view' | 'delete', employee?: Employee) => {
    switch (action) {
      case 'create':
        setSelectedEmployee(null);
        setDialogMode('create');
        break;
      case 'edit':
        setSelectedEmployee(employee!);
        setDialogMode('edit');
        break;
      case 'view':
        setSelectedEmployee(employee!);
        setDialogMode('view');
        if (onEmployeeSelect) {
          onEmployeeSelect(employee!);
        }
        break;
      case 'delete':
        if (employee && window.confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
          deleteEmployee(employee.id);
        }
        break;
    }
  };

  const handleExportCSV = async () => {
    await exportCSV(filters);
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Computed values
  const totalPages = employeesData ? Math.ceil(employeesData.total / (pagination.limit || 20)) : 0;

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading employees: {error.message}</p>
            <Button onClick={() => refetch()} variant="outline" className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Directory</h1>
          <p className="text-muted-foreground">
            {employeesData?.total || 0} employees
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowCSVImport(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button 
            onClick={() => handleEmployeeAction('create')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search employees by name, email, or department..."
          value={filters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Department</label>
                <Select
                  value={filters.department || ''}
                  onValueChange={(value) => handleFilterChange('department', value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments?.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Position</label>
                <Select
                  value={filters.position || ''}
                  onValueChange={(value) => handleFilterChange('position', value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Positions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {positions?.map((pos) => (
                      <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => handleFilterChange('status', value as 'active' | 'inactive' | 'all')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilters({ search: '', department: '', position: '', status: 'all' });
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading employees...</p>
            </div>
          ) : employeesData?.employees.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No employees found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th 
                      className="text-left p-4 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleSort('lastName')}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {pagination.sortBy === 'lastName' && (
                          <span className="text-xs">
                            {pagination.sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left p-4 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center gap-1">
                        Email
                        {pagination.sortBy === 'email' && (
                          <span className="text-xs">
                            {pagination.sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left p-4 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleSort('department')}
                    >
                      <div className="flex items-center gap-1">
                        Department
                        {pagination.sortBy === 'department' && (
                          <span className="text-xs">
                            {pagination.sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left p-4 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleSort('position')}
                    >
                      <div className="flex items-center gap-1">
                        Position
                        {pagination.sortBy === 'position' && (
                          <span className="text-xs">
                            {pagination.sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left p-4 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {pagination.sortBy === 'status' && (
                          <span className="text-xs">
                            {pagination.sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesData?.employees.map((employee) => (
                    <tr 
                      key={employee.id} 
                      className={cn(
                        "border-b hover:bg-muted/50 transition-colors",
                        selectedEmployeeId === employee.id && "bg-muted/50"
                      )}
                    >
                      <td className="p-4">
                        <div>
                          <div className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {employee.phone}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {employee.email}
                      </td>
                      <td className="p-4">
                        {employee.department}
                      </td>
                      <td className="p-4">
                        {employee.position}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          employee.status === 'active' 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400"
                        )}>
                          {employee.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEmployeeAction('view', employee)}
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEmployeeAction('edit', employee)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEmployeeAction('delete', employee)}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {employeesData && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page! - 1) * (pagination.limit || 20)) + 1} to{' '}
            {Math.min(pagination.page! * (pagination.limit || 20), employeesData.total)} of{' '}
            {employeesData.total} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page! - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={pagination.page === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-8"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page! + 1)}
              disabled={pagination.page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {dialogMode && (
        <EmployeeDialog
          employee={selectedEmployee}
          mode={dialogMode}
          open={dialogMode !== null}
          onClose={() => {
            setDialogMode(null);
            setSelectedEmployee(null);
          }}
        />
      )}

      {showCSVImport && (
        <CSVImportDialog
          open={showCSVImport}
          onClose={() => setShowCSVImport(false)}
        />
      )}
    </div>
  );
}
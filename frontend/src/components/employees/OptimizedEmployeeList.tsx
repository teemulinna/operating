import React, { useMemo, useState } from 'react';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useDebounce } from '@/hooks/useDebounce';
import { Employee } from '@/types/employee';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Users, Filter } from 'lucide-react';

interface OptimizedEmployeeListProps {
  employees: Employee[];
  onEmployeeSelect?: (employee: Employee) => void;
  onEmployeeEdit?: (employee: Employee) => void;
  loading?: boolean;
}

const EmployeeCard = React.memo<{
  employee: Employee;
  onSelect?: (employee: Employee) => void;
  onEdit?: (employee: Employee) => void;
}>(({ employee, onSelect, onEdit }) => (
  <Card className="mx-4 mb-2 hover:shadow-md transition-shadow cursor-pointer">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {employee.firstName} {employee.lastName}
          </h3>
          <p className="text-sm text-gray-600">{employee.position}</p>
          <p className="text-xs text-gray-500">{employee.department}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              ${employee.salary?.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">{employee.status}</p>
          </div>
          <div className="flex flex-col space-y-1">
            {onSelect && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelect(employee)}
              >
                View
              </Button>
            )}
            {onEdit && (
              <Button
                size="sm"
                onClick={() => onEdit(employee)}
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
));

export const OptimizedEmployeeList: React.FC<OptimizedEmployeeListProps> = ({
  employees,
  onEmployeeSelect,
  onEmployeeEdit,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Debounce search input with 300ms delay as per requirements
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Memoized filtering and sorting to prevent unnecessary recalculations
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = debouncedSearchTerm === '' || 
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        employee.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        employee.position.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, debouncedSearchTerm, departmentFilter, statusFilter]);

  // Memoized unique values for filters
  const departments = useMemo(() => {
    return Array.from(new Set(employees.map(emp => emp.department))).sort();
  }, [employees]);

  const statuses = useMemo(() => {
    return Array.from(new Set(employees.map(emp => emp.status))).sort();
  }, [employees]);

  const renderEmployeeItem = React.useCallback((employee: Employee, index: number) => (
    <EmployeeCard
      key={employee.id}
      employee={employee}
      onSelect={onEmployeeSelect}
      onEdit={onEmployeeEdit}
    />
  ), [onEmployeeSelect, onEmployeeEdit]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8">
          <div className="animate-pulse flex items-center space-x-2">
            <Users className="h-8 w-8 text-gray-400" />
            <span className="text-lg text-gray-500">Loading employees...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Employee Directory ({filteredEmployees.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input with debouncing */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {debouncedSearchTerm !== searchTerm && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <div className="flex items-center justify-between text-sm text-gray-500 px-2">
        <span>
          Showing {filteredEmployees.length} of {employees.length} employees
        </span>
        <span>
          {debouncedSearchTerm && `Search: "${debouncedSearchTerm}"`}
        </span>
      </div>

      {/* Virtualized List for Performance */}
      {filteredEmployees.length > 0 ? (
        <div className="bg-gray-50 rounded-lg p-2">
          <VirtualizedList
            items={filteredEmployees}
            itemHeight={120} // Height of each employee card
            containerHeight={600} // Fixed container height for virtual scrolling
            renderItem={renderEmployeeItem}
            overscan={5}
            className="rounded-lg"
          />
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No employees found</h3>
            <p>
              {debouncedSearchTerm 
                ? `No employees match "${debouncedSearchTerm}"` 
                : 'No employees match the current filters'
              }
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default OptimizedEmployeeList;
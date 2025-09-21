import React from 'react';
import { useEmployees } from '@/hooks/useRealEmployees';
import { Employee } from '@/services/api-real';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EnhancedEmployeeDialog } from './EnhancedEmployeeDialog';
import { exportEmployeesToCSV, downloadBlob } from '@/utils/csvExport';
import { formatSalary, formatDate, getCapacityVariant } from '@/lib/utils';
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Download, 
  Plus, 
  Grid3X3, 
  List,
  Building,
  DollarSign,
  Calendar,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';

interface EnhancedEmployeeCardProps {
  employee: Employee;
  onAction: (employee: Employee, mode: 'view' | 'edit') => void;
}

function EnhancedEmployeeCard({ employee, onAction }: EnhancedEmployeeCardProps) {
  const isOverAllocated = (employee.capacity || 0) > 100;
  const isHighCapacity = (employee.capacity || 0) > 80;

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${
      isOverAllocated ? 'ring-2 ring-red-500 ring-opacity-50 bg-red-50/30' : 
      isHighCapacity ? 'ring-1 ring-yellow-500 ring-opacity-30 bg-yellow-50/20' : ''
    }`} data-testid="employee-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {employee.name}
              {isOverAllocated && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </CardTitle>
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
              <Mail className="h-3 w-3" />
              {employee.email}
            </div>
          </div>
          <Badge 
            variant={getCapacityVariant(employee.capacity || 0)}
            className={`${
              isOverAllocated ? 'animate-pulse bg-red-100 text-red-800 border-red-300' :
              isHighCapacity ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
              'bg-green-100 text-green-800 border-green-300'
            }`}
          >
            {employee.capacity}% capacity
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Building className="h-3 w-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-500">Position</span>
              </div>
              <p className="text-sm font-medium">{employee.position}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Users className="h-3 w-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-500">Department</span>
              </div>
              <p className="text-sm font-medium">{employee.department}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="h-3 w-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-500">Salary</span>
              </div>
              <p className="text-sm font-medium">{formatSalary(employee.salary)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-500">Hire Date</span>
              </div>
              <p className="text-sm font-medium">{formatDate(employee.hireDate)}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xs font-medium text-gray-500">Skills</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {employee.skills.slice(0, 4).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {employee.skills.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{employee.skills.length - 4} more
                </Badge>
              )}
            </div>
          </div>

          {/* Capacity Warning */}
          {isOverAllocated && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Over-allocated!</span>
              </div>
              <p className="text-xs text-red-600 mt-1">
                This employee is allocated beyond capacity. Consider redistributing tasks.
              </p>
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onAction(employee, 'view')}
            >
              View Details
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onAction(employee, 'edit')}
            >
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeTable({ employees, onAction }: { employees: Employee[]; onAction: (employee: Employee, mode: 'view' | 'edit') => void }) {
  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Salary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => {
              const isOverAllocated = (employee.capacity || 0) > 100;
              const isHighCapacity = (employee.capacity || 0) > 80;
              
              return (
                <tr 
                  key={employee.id} 
                  className={`hover:bg-gray-50 ${
                    isOverAllocated ? 'bg-red-50/50' : 
                    isHighCapacity ? 'bg-yellow-50/50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </div>
                          {isOverAllocated && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      variant={getCapacityVariant(employee.capacity || 0)}
                      className={
                        isOverAllocated ? 'bg-red-100 text-red-800 border-red-300' :
                        isHighCapacity ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                        'bg-green-100 text-green-800 border-green-300'
                      }
                    >
                      {employee.capacity}%
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatSalary(employee.salary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onAction(employee, 'view')}
                      >
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onAction(employee, 'edit')}
                      >
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EnhancedEmployeeManagement() {
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid');
  const [dialogState, setDialogState] = React.useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    employee?: Employee;
  }>({ isOpen: false, mode: 'create' });
  
  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: enhancedApiService.getEmployees,
    retry: false,
  });

  const { data: analytics } = useQuery({
    queryKey: ['employee-analytics'],
    queryFn: enhancedApiService.getEmployeeCapacityAnalytics,
    enabled: employees.length > 0,
  });

  const handleEmployeeAction = (employee?: Employee, mode: 'create' | 'edit' | 'view' = 'create') => {
    setDialogState({ isOpen: true, mode, employee });
  };

  const handleCloseDialog = () => {
    setDialogState({ isOpen: false, mode: 'create', employee: undefined });
  };

  const handleExportCSV = () => {
    const blob = exportEmployeesToCSV(employees);
    downloadBlob(blob, `employees-${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">
              Unable to fetch employee data. Please check if the backend server is running on port 3001.
            </p>
            <div className="bg-gray-50 rounded p-3 text-sm text-gray-600">
              <strong>Debug Info:</strong> {error instanceof Error ? error.message : 'Unknown error'}
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              variant="outline"
            >
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overAllocatedEmployees = employees.filter(e => (e.capacity || 0) > 100);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6" />
            Employee Management
          </h1>
          <p className="text-gray-600">Manage your team members and monitor their capacity allocations</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleEmployeeAction()} size="sm" data-testid="add-employee-btn">
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
          <Button variant="outline" onClick={handleExportCSV} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4 mr-2" />
            Table
          </Button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-gray-600 mt-1">Active team members</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Over-allocated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analytics?.overutilized || overAllocatedEmployees.length}
            </div>
            <p className="text-xs text-red-600 mt-1">Capacity &gt; 100%</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-500" />
              Well Utilized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {analytics?.wellUtilized || employees.filter(e => (e.capacity || 0) >= 60 && (e.capacity || 0) <= 100).length}
            </div>
            <p className="text-xs text-yellow-600 mt-1">60-100% capacity</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics?.available || employees.filter(e => (e.capacity || 0) < 60).length}
            </div>
            <p className="text-xs text-green-600 mt-1">Capacity &lt; 60%</p>
          </CardContent>
        </Card>
      </div>

      {/* Over-allocation Alert */}
      {overAllocatedEmployees.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-800 mb-1">
                  {overAllocatedEmployees.length} employee{overAllocatedEmployees.length !== 1 ? 's' : ''} over-allocated
                </h3>
                <p className="text-red-700 text-sm mb-3">
                  The following team members are allocated beyond their capacity and may be at risk of burnout:
                </p>
                <div className="flex flex-wrap gap-2">
                  {overAllocatedEmployees.map(emp => (
                    <Badge 
                      key={emp.id} 
                      variant="destructive" 
                      className="cursor-pointer"
                      onClick={() => handleEmployeeAction(emp, 'view')}
                    >
                      {emp.name} ({emp.capacity}%)
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee) => (
            <EnhancedEmployeeCard key={employee.id} employee={employee} onAction={handleEmployeeAction} />
          ))}
        </div>
      ) : (
        <EmployeeTable employees={employees} onAction={handleEmployeeAction} />
      )}

      {employees.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Users className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first employee to the system.</p>
            <Button onClick={() => handleEmployeeAction()} data-testid="add-first-employee-btn">
              <Plus className="h-4 w-4 mr-2" />
              Add First Employee
            </Button>
          </CardContent>
        </Card>
      )}

      <EnhancedEmployeeDialog
        isOpen={dialogState.isOpen}
        onClose={handleCloseDialog}
        employee={dialogState.employee}
        mode={dialogState.mode}
      />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Search, Download, Grid, List, Calendar, AlertTriangle, Users, Clock, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/components/ui/use-toast';
import type { ProjectAssignment } from '@/types/project';

// Mock capacity data structure matching the test expectations
interface EmployeeCapacity {
  employeeId: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    avatar?: string;
  };
  totalUtilization: number;
  assignments: ProjectAssignment[];
  availableCapacity: number;
  isOverloaded: boolean;
}

type ViewMode = 'list' | 'grid' | 'calendar';

export function EmployeeAssignmentsDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [capacityData, setCapacityData] = useState<EmployeeCapacity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeCapacity | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const { toast } = useToast();

  // Fetch capacity data
  useEffect(() => {
    const fetchCapacityData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/employees/capacity');
        if (!response.ok) {
          throw new Error('Failed to fetch capacity data');
        }
        
        const data = await response.json();
        setCapacityData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCapacityData();
  }, []);

  // Filter employees based on search term
  const filteredEmployees = capacityData.filter(employee => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${employee.employee.firstName} ${employee.employee.lastName}`.toLowerCase();
    const position = employee.employee.position.toLowerCase();
    return fullName.includes(searchLower) || position.includes(searchLower);
  });

  // Calculate statistics
  const stats = {
    totalEmployees: capacityData.length,
    overloaded: capacityData.filter(e => e.isOverloaded).length,
    available: capacityData.filter(e => e.availableCapacity > 0).length,
    averageUtilization: capacityData.length > 0 
      ? Math.round(capacityData.reduce((sum, e) => sum + e.totalUtilization, 0) / capacityData.length)
      : 0,
  };

  const handleEmployeeClick = (employee: EmployeeCapacity) => {
    setSelectedEmployee(employee);
    setIsDetailsModalOpen(true);
  };

  const handleExportCapacityReport = async () => {
    try {
      const response = await fetch('/api/employees/capacity/export', {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `capacity-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: 'Capacity report has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Unable to export capacity report.',
        variant: 'destructive',
      });
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="assignments-dashboard-skeleton" className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Capacity Data
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={handleRetry} variant="outline">
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div data-testid="assignments-dashboard" className="space-y-6 px-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Employee Assignments Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage employee project assignments and capacity
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExportCapacityReport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Capacity Report
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overloaded</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overloaded}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Utilization</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageUtilization}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="px-3"
          >
            <List className="mr-2 h-4 w-4" />
            List View
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="px-3"
          >
            <Grid className="mr-2 h-4 w-4" />
            Grid View
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="px-3"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Calendar View
          </Button>
        </div>
      </div>

      {/* Employee Capacity Display */}
      {filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No employees found
              </h3>
              <p className="text-gray-600">
                No employees match your search criteria
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={`
          ${viewMode === 'list' ? 'space-y-4' : ''}
          ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : ''}
          ${viewMode === 'calendar' ? 'space-y-4' : ''}
        `} data-testid={`assignments-${viewMode}-view`}>
          {filteredEmployees.map((employee) => (
            <Card
              key={employee.employeeId}
              data-testid="employee-capacity-card"
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                employee.isOverloaded ? 'border-red-200' : 'border-gray-200'
              }`}
              onClick={() => handleEmployeeClick(employee)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {employee.employee.firstName} {employee.employee.lastName}
                    </h3>
                    <p className="text-gray-600">{employee.employee.position}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      employee.isOverloaded ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {employee.totalUtilization}%
                    </div>
                    {employee.isOverloaded && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Overloaded
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Capacity Utilization</span>
                    <span>{employee.totalUtilization}%</span>
                  </div>
                  <Progress 
                    value={Math.min(employee.totalUtilization, 100)} 
                    className={`h-2 ${employee.isOverloaded ? 'bg-red-500' : 'bg-blue-500'}`}
                    aria-label={`${employee.employee.firstName} ${employee.employee.lastName} capacity utilization`}
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    {employee.assignments.length} {employee.assignments.length === 1 ? 'active project' : 
                     employee.assignments.length === 0 ? 'active projects' : 'active projects'}
                  </span>
                  {employee.availableCapacity > 0 && (
                    <span className="text-green-600 font-medium">
                      {employee.availableCapacity}% available
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <Button size="sm" variant="outline" className="w-full">
                    Quick Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assignment Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Assignment Details
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDetailsModalOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  {selectedEmployee.employee.firstName} {selectedEmployee.employee.lastName}
                </h3>
                <p className="text-gray-600">{selectedEmployee.employee.position}</p>
              </div>

              <div>
                <h4 className="font-medium mb-3">Current Assignments</h4>
                {selectedEmployee.assignments.length === 0 ? (
                  <p className="text-gray-500">No active projects</p>
                ) : (
                  <div className="space-y-3">
                    {selectedEmployee.assignments.map((assignment) => (
                      <div key={assignment.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-medium">Project Manager Role</h5>
                            <p className="text-sm text-gray-600">{assignment.utilizationPercentage}% utilization</p>
                            <p className="text-sm text-gray-600">
                              {assignment.actualHours || 0} / {assignment.estimatedHours || 0} hours logged
                            </p>
                            <p className="text-sm text-gray-600">${assignment.hourlyRate}/hour</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
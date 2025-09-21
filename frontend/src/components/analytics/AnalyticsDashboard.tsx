import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { exportAllocationDataToCSV, exportEmployeesToCSV, exportProjectsToCSV, downloadBlob, CSVExportData } from '@/utils/csvExport';

export function AnalyticsDashboard() {
  const { data: employees = [], isLoading: employeesLoading, error: employeesError } = useQuery({
    queryKey: ['employees'],
    queryFn: apiService.getEmployees,
    retry: false,
  });

  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: apiService.getProjects,
    retry: false,
  });

  const { data: allocations = [], isLoading: allocationsLoading, error: allocationsError } = useQuery({
    queryKey: ['allocations'],
    queryFn: apiService.getAllocations,
    retry: false,
  });

  const isLoading = employeesLoading || projectsLoading || allocationsLoading;
  const hasError = employeesError || projectsError || allocationsError;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Error Loading Analytics Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              Unable to fetch analytics data. Please check if the backend server is running on port 3001.
            </p>
            <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
              <strong>Debug Info:</strong> {
                employeesError?.message || projectsError?.message || allocationsError?.message || 'Unknown error'
              }
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate analytics
  const totalEmployees = employees.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const totalProjects = projects.length;
  const activeAllocations = allocations.filter(a => a.status === 'active').length;
  
  const averageCapacity = employees.length > 0 
    ? Math.round(employees.reduce((sum, emp) => sum + emp.capacity, 0) / employees.length)
    : 0;
  
  const overutilizedEmployees = employees.filter(emp => emp.capacity > 80).length;
  const availableEmployees = employees.filter(emp => emp.capacity < 60).length;
  
  const projectsByStatus = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const departmentDistribution = employees.reduce((acc, emp) => {
    acc[emp.department] = (acc[emp.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const skillDistribution = employees.reduce((acc, emp) => {
    emp.skills.forEach(skill => {
      acc[skill] = (acc[skill] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const topSkills = Object.entries(skillDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const handleExportAllocation = () => {
    const csvData: CSVExportData = {
      employees,
      projects,
      allocations
    };
    const blob = exportAllocationDataToCSV(csvData);
    downloadBlob(blob, `analytics-allocations-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportEmployees = () => {
    const blob = exportEmployeesToCSV(employees);
    downloadBlob(blob, `analytics-employees-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportProjects = () => {
    const blob = exportProjectsToCSV(projects);
    downloadBlob(blob, `analytics-projects-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Overview of your resource planning metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportAllocation} size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Allocations
          </Button>
          <Button variant="outline" onClick={handleExportEmployees} size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Employees
          </Button>
          <Button variant="outline" onClick={handleExportProjects} size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Projects
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-gray-500 mt-1">Active team members</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeProjects}</div>
            <p className="text-xs text-gray-500 mt-1">of {totalProjects} total projects</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeAllocations}</div>
            <p className="text-xs text-gray-500 mt-1">Current assignments</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{averageCapacity}%</div>
            <p className="text-xs text-gray-500 mt-1">Team utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Capacity Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Capacity Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Overutilized ({">"} 80%)</span>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{overutilizedEmployees}</Badge>
                <span className="text-sm text-gray-500">
                  {totalEmployees > 0 ? Math.round((overutilizedEmployees / totalEmployees) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Well Utilized (60-80%)</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {totalEmployees - overutilizedEmployees - availableEmployees}
                </Badge>
                <span className="text-sm text-gray-500">
                  {totalEmployees > 0 ? Math.round(((totalEmployees - overutilizedEmployees - availableEmployees) / totalEmployees) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Available ({"<"} 60%)</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{availableEmployees}</Badge>
                <span className="text-sm text-gray-500">
                  {totalEmployees > 0 ? Math.round((availableEmployees / totalEmployees) * 100) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Project Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(projectsByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">
                  {status.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    status === 'active' ? 'default' :
                    status === 'completed' ? 'outline' :
                    status === 'on_hold' ? 'destructive' : 'secondary'
                  }>
                    {count}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Department Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(departmentDistribution)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([department, count]) => (
              <div key={department} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{department}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{count}</Badge>
                  <span className="text-sm text-gray-500">
                    {totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Skills Analysis */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Top Skills in Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {topSkills.map(([skill, count]) => (
              <div key={skill} className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div className="text-2xl font-bold text-blue-600">{count}</div>
                <div className="text-sm text-gray-600 mt-1 font-medium">{skill}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {totalEmployees === 0 && totalProjects === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
            <p className="text-gray-500">Start by adding employees and projects to see analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
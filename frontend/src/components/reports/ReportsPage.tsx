import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function ReportsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: apiService.getEmployees,
    retry: false,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: apiService.getProjects,
    retry: false,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations'],
    queryFn: apiService.getAllocations,
    retry: false,
  });

  const exportToCSV = async (type: 'employees' | 'projects' | 'allocations') => {
    setIsExporting(true);
    setExportStatus(null);
    
    try {
      let data: any[] = [];
      let headers: string[] = [];
      let filename = '';

      switch (type) {
        case 'employees':
          data = employees.map(emp => ({
            ID: emp.id,
            Name: emp.name,
            Email: emp.email,
            Role: emp.role,
            Department: emp.department,
            Capacity: `${emp.capacity}%`,
            Skills: emp.skills.join('; '),
          }));
          headers = ['ID', 'Name', 'Email', 'Role', 'Department', 'Capacity', 'Skills'];
          filename = 'employees_export.csv';
          break;
          
        case 'projects':
          data = projects.map(proj => ({
            ID: proj.id,
            Name: proj.name,
            Description: proj.description,
            Status: proj.status,
            Priority: proj.priority,
            'Start Date': new Date(proj.startDate).toLocaleDateString(),
            'End Date': new Date(proj.endDate).toLocaleDateString(),
            'Required Skills': proj.requiredSkills.join('; '),
          }));
          headers = ['ID', 'Name', 'Description', 'Status', 'Priority', 'Start Date', 'End Date', 'Required Skills'];
          filename = 'projects_export.csv';
          break;
          
        case 'allocations':
          data = allocations.map(alloc => ({
            ID: alloc.id,
            'Employee ID': alloc.employeeId,
            'Employee Name': alloc.employee?.name || 'Unknown',
            'Project ID': alloc.projectId,
            'Project Name': alloc.project?.name || 'Unknown',
            'Allocated Hours': alloc.allocatedHours,
            Status: alloc.status,
            'Start Date': new Date(alloc.startDate).toLocaleDateString(),
            'End Date': new Date(alloc.endDate).toLocaleDateString(),
          }));
          headers = ['ID', 'Employee ID', 'Employee Name', 'Project ID', 'Project Name', 'Allocated Hours', 'Status', 'Start Date', 'End Date'];
          filename = 'allocations_export.csv';
          break;
      }

      // Convert to CSV
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
          const value = row[header] || '';
          // Escape quotes and wrap in quotes if contains comma
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(','))
      ].join('\n');

      // Download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportStatus(`Successfully exported ${data.length} ${type} records`);
    } catch (error) {
      setExportStatus(`Error exporting ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      // Clear status after 5 seconds
      setTimeout(() => setExportStatus(null), 5000);
    }
  };

  // Calculate report metrics
  const totalEmployees = employees.length;
  const totalProjects = projects.length;
  const totalAllocations = allocations.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const activeAllocations = allocations.filter(a => a.status === 'active').length;

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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600">Export your data and view comprehensive analytics</p>
      </div>

      {/* Export Status */}
      {exportStatus && (
        <Card className={exportStatus.includes('Error') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <CardContent className="pt-4">
            <div className={`text-sm ${exportStatus.includes('Error') ? 'text-red-700' : 'text-green-700'}`}>
              {exportStatus}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Data Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Employees:</span>
              <span className="font-medium">{totalEmployees}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Projects:</span>
              <span className="font-medium">{totalProjects}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Allocations:</span>
              <span className="font-medium">{totalAllocations}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Active Projects:</span>
              <span className="font-medium text-green-600">{activeProjects}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Active Allocations:</span>
              <span className="font-medium text-blue-600">{activeAllocations}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Overutilized Staff:</span>
              <span className="font-medium text-red-600">{overutilizedEmployees}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Capacity Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Available:</span>
              <Badge variant="outline">{availableEmployees}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Well Utilized:</span>
              <Badge variant="secondary">{totalEmployees - overutilizedEmployees - availableEmployees}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Overutilized:</span>
              <Badge variant="destructive">{overutilizedEmployees}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <h3 className="font-medium">Employee Data</h3>
                <p className="text-sm text-gray-600">Export all employee information including skills and capacity</p>
              </div>
              <Button 
                onClick={() => exportToCSV('employees')} 
                disabled={isExporting || employees.length === 0}
                className="w-full"
                variant="outline"
              >
                {isExporting ? 'Exporting...' : `Export ${employees.length} Employees`}
              </Button>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <h3 className="font-medium">Project Data</h3>
                <p className="text-sm text-gray-600">Export project details including timelines and requirements</p>
              </div>
              <Button 
                onClick={() => exportToCSV('projects')} 
                disabled={isExporting || projects.length === 0}
                className="w-full"
                variant="outline"
              >
                {isExporting ? 'Exporting...' : `Export ${projects.length} Projects`}
              </Button>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <h3 className="font-medium">Allocation Data</h3>
                <p className="text-sm text-gray-600">Export resource assignments and scheduling information</p>
              </div>
              <Button 
                onClick={() => exportToCSV('allocations')} 
                disabled={isExporting || allocations.length === 0}
                className="w-full"
                variant="outline"
              >
                {isExporting ? 'Exporting...' : `Export ${allocations.length} Allocations`}
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
            <strong>Note:</strong> All data will be exported in CSV format. The files can be opened in Excel, Google Sheets, or any spreadsheet application.
          </div>
        </CardContent>
      </Card>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(projectsByStatus).length > 0 ? (
              Object.entries(projectsByStatus).map(([status, count]) => (
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
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">No project data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Department Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(departmentDistribution).length > 0 ? (
              Object.entries(departmentDistribution)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([department, count]) => (
                <div key={department} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{department}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{count}</Badge>
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">No employee data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {totalEmployees === 0 && totalProjects === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a4 4 0 01-4-4V5a4 4 0 014-4h10a4 4 0 014 4v12a4 4 0 01-4 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data to export</h3>
            <p className="text-gray-500">Add employees and projects to generate reports and export data.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
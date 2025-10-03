import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { employeeService, allocationService, projectService } from '../../services/api';
import type { Allocation } from '../../services/api';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  utilization: number;
  status: string;
  projects: number;
  allocations?: Allocation[];
}

export const TeamDashboard: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProjects, setTotalProjects] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all employees
        const employeesResponse = await employeeService.getAllEmployees({ limit: 100 });
        const employees = employeesResponse.data;

        // Fetch all allocations (API limit is max 100)
        const allocationsResponse = await allocationService.getAllAllocations({ limit: 100 });
        const allocations = allocationsResponse.data as Allocation[];

        // Fetch all projects
        const projectsResponse = await projectService.getAll();
        const activeProjects = projectsResponse.data.filter(p => p.status === 'active');
        setTotalProjects(activeProjects.length);

        // Calculate team member data
        const memberData: TeamMember[] = employees
          .filter(emp => emp.status === 'active')
          .map(emp => {
            // Find allocations for this employee
            const employeeAllocations = allocations.filter(
              (alloc): alloc is Allocation => {
                // Handle both API response formats
                const isActive = 'isActive' in alloc ? (alloc.isActive ?? false) : alloc.status === 'active';
                return alloc.employeeId === emp.id && isActive;
              }
            );

            // Calculate unique projects
            const uniqueProjects = new Set(employeeAllocations.map(a => a.projectId));

            // Calculate utilization (total hours allocated / weekly capacity)
            const weeklyCapacity = emp.weeklyCapacity || 40;
            const totalAllocatedHours = employeeAllocations.reduce((sum, alloc) => {
              // Handle both hours and allocatedHours fields
              const hours = alloc.hours || alloc.allocatedHours || 0;
              return sum + hours;
            }, 0);
            const utilization = Math.round((totalAllocatedHours / weeklyCapacity) * 100);

            return {
              id: emp.id,
              name: emp.name,
              role: emp.position || emp.role || 'Employee',
              utilization: Math.min(utilization, 100), // Cap at 100%
              status: emp.status,
              projects: uniqueProjects.size,
              allocations: employeeAllocations
            };
          });

        setTeamMembers(memberData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load team dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 90) return 'bg-red-500 utilization-high utilization-danger';
    if (utilization >= 75 && utilization <= 90) return 'bg-yellow-500 utilization-medium utilization-warning';
    return 'bg-green-500 utilization-low utilization-success';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading team dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const avgUtilization = teamMembers.length > 0
    ? Math.round(teamMembers.reduce((sum, member) => sum + member.utilization, 0) / teamMembers.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="team-dashboard">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" data-testid="team-dashboard-title">
        Team Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" data-testid="team-statistics">
        <Card data-testid="metric-card metric-card-team-members">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              <span data-testid="metric-icon">👥</span>
              <span data-testid="metric-label"> Team Members</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600" data-testid="metric-value">{teamMembers.length}</div>
            <p className="text-sm text-gray-500">Active employees</p>
          </CardContent>
        </Card>

        <Card data-testid="metric-card metric-card-avg-utilization">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              <span data-testid="metric-icon">📊</span>
              <span data-testid="metric-label"> Average Utilization</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600" data-testid="metric-value">
              {avgUtilization}%
            </div>
            <p className="text-sm text-gray-500">Team capacity</p>
          </CardContent>
        </Card>

        <Card data-testid="metric-card metric-card-active-projects">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              <span data-testid="metric-icon">📁</span>
              <span data-testid="metric-label"> Active Projects</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600" data-testid="metric-value">
              {totalProjects}
            </div>
            <p className="text-sm text-gray-500">Total active projects</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="team-members-table">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto" data-testid="team-member-list" role="list">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Utilization</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Projects</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50" data-testid="team-member-item" role="listitem">
                    <td className="py-3 px-4 font-medium" data-testid="member-name">{member.name}</td>
                    <td className="py-3 px-4 text-gray-600" data-testid="member-role">{member.role}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-20">
                          <div
                            data-testid="utilization-bar"
                            className={`h-2 rounded-full ${getUtilizationColor(member.utilization)}`}
                            style={{ width: `${member.utilization}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600" data-testid="member-utilization">{member.utilization}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" data-testid="member-projects-count">{member.projects} projects</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'} data-testid="member-status-badge">
                        {member.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamDashboard;

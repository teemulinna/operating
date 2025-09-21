import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export const TeamDashboard: React.FC = () => {
  const teamMembers = [
    { name: 'John Doe', role: 'Senior Developer', utilization: 85, status: 'active', projects: 2 },
    { name: 'Jane Smith', role: 'Product Manager', utilization: 92, status: 'active', projects: 3 },
    { name: 'Bob Johnson', role: 'Designer', utilization: 75, status: 'active', projects: 1 },
    { name: 'Alice Wilson', role: 'QA Engineer', utilization: 80, status: 'active', projects: 2 },
  ];

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'bg-red-500';
    if (utilization >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="team-dashboard">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" data-testid="team-dashboard-title">
        Team Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card data-testid="team-stats">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{teamMembers.length}</div>
            <p className="text-sm text-gray-500">Active employees</p>
          </CardContent>
        </Card>

        <Card data-testid="avg-utilization">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {Math.round(teamMembers.reduce((sum, member) => sum + member.utilization, 0) / teamMembers.length)}%
            </div>
            <p className="text-sm text-gray-500">Team capacity</p>
          </CardContent>
        </Card>

        <Card data-testid="active-projects">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {teamMembers.reduce((sum, member) => sum + member.projects, 0)}
            </div>
            <p className="text-sm text-gray-500">Total assignments</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="team-members-table">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{member.name}</td>
                    <td className="py-3 px-4 text-gray-600">{member.role}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-20">
                          <div 
                            className={`h-2 rounded-full ${getUtilizationColor(member.utilization)}`}
                            style={{ width: `${member.utilization}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{member.utilization}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{member.projects} projects</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
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
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProjectService } from '@/services/projectService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  PauseCircle,
  Calendar
} from 'lucide-react';
import type { ProjectStatistics } from '@/types/project';

export const ProjectStatsWidget: React.FC = () => {
  const { 
    data: stats, 
    isLoading, 
    error 
  } = useQuery<{success: boolean, data: ProjectStatistics}>({
    queryKey: ['project-stats'],
    queryFn: () => ProjectService.getProjectStatistics(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Project Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats?.success) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Project Stats Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Unable to load project statistics. Please check your connection.
          </p>
        </CardContent>
      </Card>
    );
  }

  const projectStats = stats.data;
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'on-hold':
        return <PauseCircle className="h-4 w-4 text-yellow-500" />;
      case 'planning':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'planning':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Project Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Projects Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{projectStats.totalProjects}</div>
            <div className="text-sm text-gray-600">Total Projects</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
              <DollarSign className="h-5 w-5" />
              ${projectStats.totalBudget?.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-600">Total Budget</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${projectStats.averageBudget?.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-600">Avg Budget</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              ${projectStats.averageHourlyRate || '0'}/hr
            </div>
            <div className="text-sm text-gray-600">Avg Rate</div>
          </div>
        </div>

        {/* Projects by Status */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Projects by Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(projectStats.projectsByStatus).map(([status, count]) => (
              <div key={status} className={`p-3 rounded-lg ${getStatusColor(status)}`}>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(status)}
                  <span className="text-sm font-medium capitalize">
                    {status === 'on-hold' ? 'On Hold' : status}
                  </span>
                </div>
                <div className="text-lg font-bold">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Active Projects</div>
                <div className="text-2xl font-bold text-blue-600">
                  {projectStats.projectsByStatus.active || 0}
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Completed</div>
                <div className="text-2xl font-bold text-green-600">
                  {projectStats.projectsByStatus.completed || 0}
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Success Rate */}
        {projectStats.totalProjects > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Completion Rate</span>
              <Badge variant="secondary">
                {Math.round(((projectStats.projectsByStatus.completed || 0) / projectStats.totalProjects) * 100)}%
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(((projectStats.projectsByStatus.completed || 0) / projectStats.totalProjects) * 100)}%`
                }}
              ></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { ServiceFactory } from '../../services/api';
import { CapacityWidget } from './CapacityWidget';
import { UtilizationChart } from './UtilizationChart';
import { ConflictPanel } from './ConflictPanel';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface TeamDashboardProps {
  className?: string;
}

interface DashboardData {
  capacityData: any;
  utilizationData: any;
  conflictsData: any;
  stats: any;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({ className = '' }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch capacity analysis
  const {
    data: capacityData,
    isLoading: capacityLoading,
    error: capacityError,
    refetch: refetchCapacity,
  } = useQuery({
    queryKey: ['capacity-analysis', refreshKey],
    queryFn: async () => {
      const service = ServiceFactory.getAnalyticsService();
      return service.getCapacityAnalysis();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });

  // Fetch dashboard stats
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['dashboard-stats', refreshKey],
    queryFn: async () => {
      const service = ServiceFactory.getAnalyticsService();
      return service.getDashboardStats();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch allocation conflicts
  const {
    data: conflictsData,
    isLoading: conflictsLoading,
    error: conflictsError,
    refetch: refetchConflicts,
  } = useQuery({
    queryKey: ['allocation-conflicts', refreshKey],
    queryFn: async () => {
      const service = ServiceFactory.getAllocationService();
      const allAllocations = await service.getAll();
      
      // Analyze conflicts (simplified logic)
      const conflicts: any[] = [];
      const employeeHours: { [key: string]: number } = {};
      
      allAllocations.data.forEach(allocation => {
        const employeeId = allocation.employeeId.toString();
        employeeHours[employeeId] = (employeeHours[employeeId] || 0) + allocation.hours;
      });
      
      // Simulate conflicts detection
      Object.entries(employeeHours).forEach(([employeeId, hours]) => {
        if (hours > 40) {
          conflicts.push({
            id: `over-allocation-${employeeId}`,
            type: 'over-allocation',
            severity: hours > 50 ? 'high' : 'medium',
            employee: {
              id: employeeId,
              name: `Employee ${employeeId}`,
              department: 'Development',
            },
            details: {
              allocatedHours: hours,
              capacity: 40,
              overAllocation: hours - 40,
            },
            suggestedActions: [
              'Reduce allocation',
              'Redistribute tasks',
              'Extend timeline',
            ],
            createdAt: new Date().toISOString(),
          });
        }
      });
      
      return conflicts;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const isLoading = capacityLoading || statsLoading || conflictsLoading;
  const hasError = capacityError || statsError || conflictsError;

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCapacityDrillDown = (section?: string) => {
    // Navigate to detailed capacity view
    console.log('Navigate to capacity details:', section);
  };

  const handleConflictResolve = (conflictId: string, action: string) => {
    console.log('Resolve conflict:', conflictId, action);
    // Implement conflict resolution logic
  };

  const handleViewConflictDetails = (conflictId: string) => {
    console.log('View conflict details:', conflictId);
    // Navigate to conflict details
  };

  if (isLoading) {
    return (
      <div data-testid="dashboard-loading" className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div data-testid="dashboard-error" className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 mb-4">Failed to load dashboard data</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      data-testid="team-dashboard" 
      className={`space-y-6 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor team capacity, utilization, and resource conflicts
          </p>
        </div>
        <Button 
          data-testid="refresh-dashboard"
          onClick={handleRefresh}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Capacity Overview - 4 columns */}
        <div className="col-span-12 md:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Capacity</CardTitle>
              <CardDescription>
                Current team capacity and utilization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CapacityWidget
                data={capacityData}
                onDrillDown={handleCapacityDrillDown}
                loading={capacityLoading}
              />
            </CardContent>
          </Card>
        </div>

        {/* Active Projects - 4 columns */}
        <div className="col-span-12 md:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Projects</CardTitle>
              <CardDescription>
                {statsData?.projectCount || 0} active projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Projects</span>
                  <span className="text-2xl font-bold">
                    {statsData?.projectCount || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Employees</span>
                  <span className="text-2xl font-bold">
                    {statsData?.employeeCount || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Allocations</span>
                  <span className="text-2xl font-bold">
                    {statsData?.allocationCount || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Utilization - 4 columns */}
        <div className="col-span-12 md:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Utilization Overview</CardTitle>
              <CardDescription>
                Current team utilization rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {Math.round(statsData?.utilizationRate || 0)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Average Utilization</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (statsData?.utilizationRate || 0) > 90 
                        ? 'bg-red-500'
                        : (statsData?.utilizationRate || 0) > 80
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(statsData?.utilizationRate || 0, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Utilization Chart - Full width */}
        <div className="col-span-12">
          <Card>
            <CardHeader>
              <CardTitle>Team Utilization Chart</CardTitle>
              <CardDescription>
                Employee utilization breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UtilizationChart
                data={{
                  employees: [], // This would come from a proper API call
                  trends: [],
                }}
                type="bar"
                loading={capacityLoading}
              />
            </CardContent>
          </Card>
        </div>

        {/* Conflict Warnings - Full width */}
        <div className="col-span-12">
          <Card>
            <CardHeader>
              <CardTitle>Resource Conflicts</CardTitle>
              <CardDescription>
                {conflictsData?.length || 0} active conflicts detected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConflictPanel
                conflicts={conflictsData || []}
                onResolve={handleConflictResolve}
                onViewDetails={handleViewConflictDetails}
                loading={conflictsLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeamDashboard;

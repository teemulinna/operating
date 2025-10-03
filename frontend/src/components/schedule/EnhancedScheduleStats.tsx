import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Users, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

interface ScheduleStats {
  totalEmployees: number;
  totalAllocatedHours: number;
  totalCapacity: number;
  overAllocatedCount: number;
  utilizationRate: number;
}

interface EnhancedScheduleStatsProps {
  stats: ScheduleStats;
  loading?: boolean;
}

/**
 * Enhanced Schedule Statistics Cards Component (US-ES1)
 *
 * Displays key metrics for resource scheduling:
 * - Total active employees
 * - Overall utilization rate
 * - Total allocated vs capacity hours
 * - Number of over-allocated employees
 *
 * Acceptance Criteria:
 * ✓ Shows 4 metric cards with icons
 * ✓ Displays loading state
 * ✓ Color-codes utilization (green <75%, yellow 75-90%, red >90%)
 * ✓ Highlights over-allocation warnings
 */
export const EnhancedScheduleStats: React.FC<EnhancedScheduleStatsProps> = ({
  stats,
  loading = false
}) => {
  const getUtilizationColor = (rate: number) => {
    if (rate < 75) return 'text-green-600';
    if (rate <= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUtilizationBgColor = (rate: number) => {
    if (rate < 75) return 'bg-green-50';
    if (rate <= 90) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-testid="enhanced-schedule-stats">
      {/* Total Employees */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600" data-testid="stat-total-employees">
            {stats.totalEmployees}
          </div>
          <p className="text-xs text-gray-500 mt-1">Active employees</p>
        </CardContent>
      </Card>

      {/* Utilization Rate */}
      <Card className={getUtilizationBgColor(stats.utilizationRate)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Utilization Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-3xl font-bold ${getUtilizationColor(stats.utilizationRate)}`}
            data-testid="stat-utilization-rate"
          >
            {stats.utilizationRate.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Team capacity usage
          </p>
        </CardContent>
      </Card>

      {/* Allocated vs Capacity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Hours Allocated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600" data-testid="stat-allocated-hours">
            {stats.totalAllocatedHours}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            of {stats.totalCapacity}h capacity
          </p>
        </CardContent>
      </Card>

      {/* Over-Allocated Employees */}
      <Card className={stats.overAllocatedCount > 0 ? 'bg-red-50 border-red-200' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Over-Allocated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-3xl font-bold ${stats.overAllocatedCount > 0 ? 'text-red-600' : 'text-green-600'}`}
            data-testid="stat-overallocated-count"
          >
            {stats.overAllocatedCount}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.overAllocatedCount === 0 ? 'All balanced' : 'Need attention'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedScheduleStats;

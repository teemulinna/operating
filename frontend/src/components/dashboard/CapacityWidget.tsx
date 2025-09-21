import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gauge, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { ServiceFactory } from '../../services/api';
import { Button } from '../ui/button';

interface CapacityWidgetProps {
  data?: any;
  onDrillDown?: (section?: string) => void;
  loading?: boolean;
}

export const CapacityWidget: React.FC<CapacityWidgetProps> = ({
  data,
  onDrillDown,
  loading = false,
}) => {
  // Fetch real capacity data if not provided
  const { data: capacityData, isLoading } = useQuery({
    queryKey: ['capacity-analysis'],
    queryFn: async () => {
      const analyticsService = ServiceFactory.getAnalyticsService();
      return analyticsService.getCapacityAnalysis();
    },
    enabled: !data,
    staleTime: 5 * 60 * 1000,
  });

  const finalData = data || capacityData;
  const isLoadingData = loading || isLoading;

  if (isLoadingData) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const totalCapacity = finalData?.totalCapacity || 400; // Example: 10 employees * 40h/week
  const utilizedCapacity = finalData?.utilizedCapacity || 320;
  const utilizationRate = totalCapacity > 0 ? (utilizedCapacity / totalCapacity) * 100 : 0;
  const availableCapacity = totalCapacity - utilizedCapacity;

  const getUtilizationColor = () => {
    if (utilizationRate > 95) return 'text-red-500';
    if (utilizationRate > 85) return 'text-orange-500';
    if (utilizationRate > 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getCapacityStatus = () => {
    if (utilizationRate > 95) return 'Over capacity';
    if (utilizationRate > 85) return 'High utilization';
    if (utilizationRate > 75) return 'Optimal';
    return 'Under-utilized';
  };

  return (
    <div className="space-y-4" data-testid="capacity-widget">
      {/* Main Capacity Gauge */}
      <div className="flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-8 border-gray-200 flex items-center justify-center">
            <div
              className={`absolute inset-0 rounded-full border-8 border-transparent ${
                utilizationRate > 95
                  ? 'border-t-red-500 border-r-red-500'
                  : utilizationRate > 85
                  ? 'border-t-orange-500 border-r-orange-500'
                  : utilizationRate > 75
                  ? 'border-t-yellow-500 border-r-yellow-500'
                  : 'border-t-green-500 border-r-green-500'
              }`}
              style={{
                transform: `rotate(${(utilizationRate / 100) * 360}deg)`,
                transition: 'transform 0.3s ease',
              }}
            />
            <Gauge className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Utilization Stats */}
      <div className="text-center">
        <div className={`text-2xl font-bold ${getUtilizationColor()}`}>
          {Math.round(utilizationRate)}%
        </div>
        <div className="text-sm text-gray-500 mb-2">{getCapacityStatus()}</div>
        <div className="text-xs text-gray-400">
          {utilizedCapacity}h / {totalCapacity}h capacity
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Utilized</span>
          <div className="flex items-center gap-1">
            <span className="font-medium">{utilizedCapacity}h</span>
            <TrendingUp className="w-3 h-3 text-green-500" />
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Available</span>
          <div className="flex items-center gap-1">
            <span className="font-medium">{availableCapacity}h</span>
            {availableCapacity < totalCapacity * 0.1 ? (
              <TrendingDown className="w-3 h-3 text-red-500" />
            ) : (
              <Users className="w-3 h-3 text-blue-500" />
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Team Size</span>
          <span className="font-medium">{finalData?.activeEmployees || 10}</span>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            utilizationRate > 95
              ? 'bg-red-500'
              : utilizationRate > 85
              ? 'bg-orange-500'
              : utilizationRate > 75
              ? 'bg-yellow-500'
              : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(utilizationRate, 100)}%` }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDrillDown?.('utilization')}
          className="flex-1 text-xs"
        >
          View Details
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDrillDown?.('planning')}
          className="flex-1 text-xs"
        >
          Plan Resources
        </Button>
      </div>

      {/* Alerts */}
      {utilizationRate > 95 && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          ⚠️ Team is over-capacity. Consider redistributing workload.
        </div>
      )}
      
      {availableCapacity > totalCapacity * 0.4 && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          💡 Significant capacity available. Consider taking on new projects.
        </div>
      )}
    </div>
  );
};

export default CapacityWidget;
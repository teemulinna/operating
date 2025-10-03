import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, TrendingUp, User, Users } from 'lucide-react';
import { HeatMapService, Bottleneck, HeatMapFilters } from '../../services/heat-map.service';

interface HeatMapBottlenecksProps {
  filters?: HeatMapFilters;
  onEmployeeSelect?: (employeeId: string) => void;
}

export const HeatMapBottlenecks: React.FC<HeatMapBottlenecksProps> = ({
  filters,
  onEmployeeSelect,
}) => {
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [totalBottlenecks, setTotalBottlenecks] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const heatMapService = new HeatMapService();

  useEffect(() => {
    loadBottlenecks();
  }, [filters]);

  const loadBottlenecks = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await heatMapService.getBottlenecks(filters);
      setBottlenecks(data.bottlenecks);
      setTotalBottlenecks(data.totalBottlenecks);
      setCriticalCount(data.criticalCount);
      setRecommendations(data.recommendations);
    } catch (err) {
      setError('Failed to load bottleneck analysis');
      console.error('Bottleneck load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: 'critical' | 'high' | 'medium') => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'medium':
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: 'critical' | 'high' | 'medium') => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-amber-50 border-amber-200';
      case 'medium':
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-red-500 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Capacity Bottlenecks</h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{totalBottlenecks}</div>
          <div className="text-sm text-gray-600">Total Bottlenecks</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          <div className="text-sm text-gray-600">Critical (&gt;120%)</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-600">
            {bottlenecks.filter((b: any) => b.severity === 'high').length}
          </div>
          <div className="text-sm text-gray-600">High (100-120%)</div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-900 mb-2">Recommendations</h4>
          <ul className="space-y-1">
            {recommendations.map((rec: string, index: number) => (
              <li key={index} className="text-sm text-blue-700 flex items-start">
                <span className="mr-2">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bottleneck List */}
      {bottlenecks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No capacity bottlenecks detected</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bottlenecks.map((bottleneck: any) => (
            <div
              key={bottleneck.employeeId}
              className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${getSeverityColor(
                bottleneck.severity
              )}`}
              onClick={() => onEmployeeSelect?.(bottleneck.employeeId)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getSeverityIcon(bottleneck.severity)}
                    <h4 className="font-semibold text-gray-900">
                      {bottleneck.employeeName}
                    </h4>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {bottleneck.departmentName}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Max Utilization:</span>{' '}
                      <span className="font-medium">
                        {Math.round(bottleneck.maxUtilization)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Avg Utilization:</span>{' '}
                      <span className="font-medium">
                        {Math.round(bottleneck.avgUtilization)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Affected Days:</span>{' '}
                      <span className="font-medium">{bottleneck.totalDays}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Severity:</span>{' '}
                      <span
                        className={`font-medium capitalize ${
                          bottleneck.severity === 'critical'
                            ? 'text-red-600'
                            : bottleneck.severity === 'high'
                            ? 'text-amber-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {bottleneck.severity}
                      </span>
                    </div>
                  </div>
                </div>
                <User className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
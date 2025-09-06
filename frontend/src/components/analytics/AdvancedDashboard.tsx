// Advanced Analytics Dashboard with Beautiful Visualizations
import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
  RadialLinearScale,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut, Radar, Polar } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  BoltIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { ResourceAnalytics, UtilizationTrend, CapacityForecast } from '../../types/scenario';
import { useScenarioAnalytics } from '../../hooks/useScenarioAnalytics';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
  RadialLinearScale
);

interface DashboardProps {
  scenarioIds: string[];
  timeRange: {
    start: string;
    end: string;
  };
}

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  description?: string;
  animate?: boolean;
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: 'text-blue-500',
    accent: 'border-blue-200'
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    icon: 'text-green-500',
    accent: 'border-green-200'
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    icon: 'text-yellow-500',
    accent: 'border-yellow-200'
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: 'text-red-500',
    accent: 'border-red-200'
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    icon: 'text-purple-500',
    accent: 'border-purple-200'
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    icon: 'text-indigo-500',
    accent: 'border-indigo-200'
  }
};

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  color, 
  description,
  animate = true 
}) => {
  const colors = colorMap[color];

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20 } : {}}
      animate={animate ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className={`${colors.bg} ${colors.accent} border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Icon className={`h-8 w-8 ${colors.icon}`} />
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${colors.text} opacity-80`}>
              {title}
            </h3>
            <motion.div
              initial={animate ? { scale: 0.8 } : {}}
              animate={animate ? { scale: 1 } : {}}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className={`text-2xl font-bold ${colors.text} mt-1`}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </motion.div>
          </div>
        </div>
        
        {change !== undefined && (
          <div className="text-right">
            <div className="flex items-center">
              {trend === 'up' && <TrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />}
              {trend === 'down' && <TrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />}
              <span
                className={`text-sm font-medium ${
                  trend === 'up' ? 'text-green-600' : 
                  trend === 'down' ? 'text-red-600' : 
                  'text-gray-600'
                }`}
              >
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const AdvancedDashboard: React.FC<DashboardProps> = ({ 
  scenarioIds, 
  timeRange 
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'utilization', 'capacity', 'skills', 'costs'
  ]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'trends'>('overview');

  const { 
    analytics, 
    isLoading, 
    error, 
    refreshData,
    exportData 
  } = useScenarioAnalytics(scenarioIds, timeRange);

  // Memoized chart configurations
  const utilizationChartData = useMemo(() => {
    if (!analytics?.utilizationTrends) return null;

    return {
      labels: analytics.utilizationTrends.map(trend => 
        new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: 'Average Utilization',
          data: analytics.utilizationTrends.map(trend => trend.averageUtilization),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Max Utilization',
          data: analytics.utilizationTrends.map(trend => trend.maxUtilization),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          tension: 0.4,
          borderDash: [5, 5],
        },
      ],
    };
  }, [analytics?.utilizationTrends]);

  const capacityChartData = useMemo(() => {
    if (!analytics?.capacityForecast) return null;

    const skills = [...new Set(analytics.capacityForecast.map(f => f.skillCategory))];
    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
    ];

    return {
      labels: skills,
      datasets: [
        {
          label: 'Current Capacity',
          data: skills.map(skill => {
            const skillData = analytics.capacityForecast.filter(f => f.skillCategory === skill);
            return skillData.reduce((sum, f) => sum + f.currentCapacity, 0);
          }),
          backgroundColor: colors[0],
          borderColor: colors[0].replace('0.8', '1'),
          borderWidth: 2,
        },
        {
          label: 'Projected Demand',
          data: skills.map(skill => {
            const skillData = analytics.capacityForecast.filter(f => f.skillCategory === skill);
            return skillData.reduce((sum, f) => sum + f.projectedDemand, 0);
          }),
          backgroundColor: colors[1],
          borderColor: colors[1].replace('0.8', '1'),
          borderWidth: 2,
        },
      ],
    };
  }, [analytics?.capacityForecast]);

  const skillGapsPieData = useMemo(() => {
    if (!analytics?.skillDemandAnalysis) return null;

    const criticalSkills = analytics.skillDemandAnalysis.filter(s => s.criticality === 'critical');
    const highSkills = analytics.skillDemandAnalysis.filter(s => s.criticality === 'high');
    const mediumSkills = analytics.skillDemandAnalysis.filter(s => s.criticality === 'medium');
    const lowSkills = analytics.skillDemandAnalysis.filter(s => s.criticality === 'low');

    return {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      datasets: [
        {
          data: [
            criticalSkills.length,
            highSkills.length,
            mediumSkills.length,
            lowSkills.length,
          ],
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(107, 114, 128, 0.8)',
          ],
          borderColor: [
            'rgb(239, 68, 68)',
            'rgb(245, 158, 11)',
            'rgb(59, 130, 246)',
            'rgb(107, 114, 128)',
          ],
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    };
  }, [analytics?.skillDemandAnalysis]);

  const riskRadarData = useMemo(() => {
    if (!analytics?.riskAssessment?.riskFactors) return null;

    const riskCategories = ['Resource', 'Timeline', 'Budget', 'Skill', 'External'];
    
    return {
      labels: riskCategories,
      datasets: [
        {
          label: 'Risk Score',
          data: riskCategories.map(category => {
            const categoryRisks = analytics.riskAssessment.riskFactors.filter(
              r => r.category.toLowerCase() === category.toLowerCase()
            );
            return categoryRisks.reduce((sum, r) => sum + r.riskScore, 0) / Math.max(categoryRisks.length, 1);
          }),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          pointBackgroundColor: 'rgb(239, 68, 68)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(239, 68, 68)',
          pointRadius: 6,
        },
      ],
    };
  }, [analytics?.riskAssessment]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutCubic' as const,
    },
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleExportData = async (format: 'pdf' | 'excel' | 'png') => {
    await exportData(format);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading advanced analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Failed to load analytics data</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-6">
        <div className="flex items-center justify-center min-h-96">
          <p className="text-gray-600">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" data-testid="advanced-analytics-dashboard">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Advanced Analytics Dashboard
            </h1>
            <p className="text-gray-600">
              Real-time insights and forecasting for resource management
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-4">
            {/* View Mode Selector */}
            <div className="flex bg-white rounded-lg p-1 shadow-sm">
              {['overview', 'detailed', 'trends'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <div className="relative group">
              <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-all">
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export
              </button>
              
              {/* Export Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <div className="p-2">
                  <button
                    onClick={() => handleExportData('pdf')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                  >
                    Export as PDF
                  </button>
                  <button
                    onClick={() => handleExportData('excel')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                  >
                    Export as Excel
                  </button>
                  <button
                    onClick={() => handleExportData('png')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                  >
                    Export as Image
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Resources"
          value={analytics.utilizationTrends?.[0]?.employeeCount || 0}
          change={8.2}
          trend="up"
          icon={UsersIcon}
          color="blue"
          description="vs last month"
        />
        
        <KPICard
          title="Avg Utilization"
          value={`${Math.round(
            analytics.utilizationTrends?.reduce((sum, trend) => sum + trend.averageUtilization, 0) /
            Math.max(analytics.utilizationTrends?.length || 1, 1)
          )}%`}
          change={-2.4}
          trend="down"
          icon={ChartBarIcon}
          color="green"
          description="trending down"
        />
        
        <KPICard
          title="Critical Skills"
          value={analytics.skillDemandAnalysis?.filter(s => s.criticality === 'critical').length || 0}
          change={15.3}
          trend="up"
          icon={ExclamationTriangleIcon}
          color="red"
          description="need attention"
        />
        
        <KPICard
          title="Projected Cost"
          value={`$${(analytics.costAnalysis?.totalProjectedCost || 0).toLocaleString()}`}
          change={5.7}
          trend="up"
          icon={CurrencyDollarIcon}
          color="purple"
          description="next quarter"
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Utilization Trends */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm"
          data-testid="utilization-trends-chart"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Utilization Trends</h3>
            <div className="flex items-center text-sm text-gray-500">
              <TrendingUpIcon className="h-4 w-4 mr-1" />
              Last 30 days
            </div>
          </div>
          {utilizationChartData && (
            <div className="h-80">
              <Line data={utilizationChartData} options={chartOptions} />
            </div>
          )}
        </motion.div>

        {/* Capacity vs Demand */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-sm"
          data-testid="capacity-demand-chart"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Capacity vs Demand</h3>
            <div className="flex items-center text-sm text-gray-500">
              <BoltIcon className="h-4 w-4 mr-1" />
              By Skill Category
            </div>
          </div>
          {capacityChartData && (
            <div className="h-80">
              <Bar data={capacityChartData} options={chartOptions} />
            </div>
          )}
        </motion.div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Skill Gaps Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl p-6 shadow-sm"
          data-testid="skill-gaps-chart"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Skill Gaps by Priority</h3>
          {skillGapsPieData && (
            <div className="h-64">
              <Doughnut
                data={skillGapsPieData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      position: 'bottom' as const,
                    },
                  },
                }}
              />
            </div>
          )}
        </motion.div>

        {/* Risk Assessment Radar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl p-6 shadow-sm"
          data-testid="risk-assessment-chart"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h3>
          {riskRadarData && (
            <div className="h-64">
              <Radar
                data={riskRadarData}
                options={{
                  ...chartOptions,
                  scales: {
                    r: {
                      angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)',
                      },
                      grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                      },
                      pointLabels: {
                        color: 'rgb(75, 85, 99)',
                      },
                      ticks: {
                        color: 'rgb(75, 85, 99)',
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </motion.div>

        {/* Hiring Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white rounded-xl p-6 shadow-sm"
          data-testid="hiring-recommendations-panel"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hiring Recommendations</h3>
          <div className="space-y-4">
            {analytics.hiringRecommendations?.slice(0, 3).map((rec, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm text-gray-900">{rec.skillCategory}</p>
                  <p className="text-xs text-gray-600">{rec.positionLevel}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{rec.recommendedHires}</p>
                  <p className={`text-xs px-2 py-1 rounded-full ${
                    rec.urgency === 'immediate' ? 'bg-red-100 text-red-700' :
                    rec.urgency === 'within-month' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {rec.urgency}
                  </p>
                </div>
              </div>
            )) || (
              <p className="text-gray-500 text-sm">No immediate hiring recommendations</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Detailed Metrics Table */}
      {viewMode === 'detailed' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-sm"
          data-testid="detailed-metrics-table"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Metrics</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Skill Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Demand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projected Demand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Growth Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criticality
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.skillDemandAnalysis?.map((skill, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {skill.skillCategory}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {skill.currentDemand.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {skill.projectedDemand.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        skill.growthRate > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {skill.growthRate > 0 ? '+' : ''}{skill.growthRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                        skill.criticality === 'critical' ? 'bg-red-100 text-red-800' :
                        skill.criticality === 'high' ? 'bg-yellow-100 text-yellow-800' :
                        skill.criticality === 'medium' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {skill.criticality}
                      </span>
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No skill demand data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};
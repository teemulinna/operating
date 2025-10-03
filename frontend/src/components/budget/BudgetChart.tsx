import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Activity } from 'lucide-react';

interface BudgetAnalytics {
  totalBudget: number;
  allocatedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  utilizationPercentage: number;
  burnRate: number;
  forecastedCompletion: string | null;
  costVariance: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
}

interface CostBreakdown {
  category: string;
  budgeted: number;
  allocated: number;
  spent: number;
  variance: number;
  percentage: number;
}

interface BudgetForecast {
  period: string;
  forecastedCost: number;
  actualCost: number;
  variance: number;
  trendAnalysis: 'improving' | 'stable' | 'deteriorating';
}

interface BudgetChartProps {
  budgetData: BudgetAnalytics;
  forecastData: BudgetForecast[];
  costBreakdown: CostBreakdown[];
}

export const BudgetChart: React.FC<BudgetChartProps> = ({
  budgetData,
  forecastData,
  costBreakdown
}) => {
  const [selectedChart, setSelectedChart] = useState<string>('overview');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatShortCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return formatCurrency(value);
  };

  // Colors for charts
  const COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#84CC16'  // Lime
  ];

  // Prepare data for different chart types
  const budgetOverviewData = [
    {
      name: 'Total Budget',
      value: budgetData.totalBudget,
      color: COLORS[0]
    },
    {
      name: 'Allocated',
      value: budgetData.allocatedBudget,
      color: COLORS[1]
    },
    {
      name: 'Spent',
      value: budgetData.spentBudget,
      color: COLORS[4]
    },
    {
      name: 'Remaining',
      value: budgetData.remainingBudget,
      color: COLORS[2]
    }
  ];

  // Prepare pie chart data for cost breakdown
  const pieChartData = costBreakdown.map((item, index) => ({
    name: item.category,
    value: item.budgeted,
    spent: item.spent,
    percentage: item.percentage,
    color: COLORS[index % COLORS.length]
  }));

  // Prepare bar chart data for budget vs actual
  const barChartData = costBreakdown.map(item => ({
    category: item.category,
    budgeted: item.budgeted,
    spent: item.spent,
    variance: item.variance
  }));

  // Prepare forecast line chart data
  const forecastChartData = forecastData.map(item => ({
    period: item.period,
    forecasted: item.forecastedCost,
    actual: item.actualCost,
    variance: item.variance
  }));

  // Utilization data for area chart
  const utilizationData = [
    { name: 'Utilized', value: budgetData.utilizationPercentage },
    { name: 'Available', value: 100 - budgetData.utilizationPercentage }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} style={{ color: item.color }} className="text-sm">
              {item.name}: {formatCurrency(item.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-medium capitalize">{data.name}</p>
          <p className="text-sm">Budgeted: {formatCurrency(data.value)}</p>
          <p className="text-sm">Spent: {formatCurrency(data.spent)}</p>
          <p className="text-sm">Percentage: {data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Chart Type Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Budget Visualization</h2>
        </div>
        <Select value={selectedChart} onChange={(e) => setSelectedChart(e.target.value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select chart type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overview">Budget Overview</SelectItem>
            <SelectItem value="breakdown">Cost Breakdown</SelectItem>
            <SelectItem value="comparison">Budget vs Actual</SelectItem>
            <SelectItem value="forecast">Forecast Trends</SelectItem>
            <SelectItem value="utilization">Utilization Rate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        {selectedChart === 'overview' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Budget Overview</span>
              </CardTitle>
              <CardDescription>
                Visual representation of total budget allocation and spending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={budgetOverviewData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={formatShortCurrency} />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {selectedChart === 'breakdown' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChartIcon className="h-5 w-5" />
                  <span>Cost Breakdown by Category</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentage }) => `${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pieChartData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="capitalize font-medium">{item.name}</span>
                      </div>
                      <div className="text-right text-sm">
                        <div>{formatCurrency(item.value)}</div>
                        <div className="text-gray-500">{item.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedChart === 'comparison' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Budget vs Actual Spending</span>
              </CardTitle>
              <CardDescription>
                Comparison of budgeted amounts versus actual spending by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis tickFormatter={formatShortCurrency} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="budgeted" fill="#3B82F6" name="Budgeted" />
                  <Bar dataKey="spent" fill="#EF4444" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {selectedChart === 'forecast' && forecastChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Budget Forecast Trends</span>
              </CardTitle>
              <CardDescription>
                Historical forecast accuracy and trend analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={forecastChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={formatShortCurrency} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="forecasted"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Forecasted"
                    dot={{ fill: '#3B82F6' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Actual"
                    dot={{ fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {selectedChart === 'utilization' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Utilization Rate</CardTitle>
                <CardDescription>
                  Current budget utilization percentage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={utilizationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#3B82F6" />
                      <Cell fill="#E5E7EB" />
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center mt-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {budgetData.utilizationPercentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">Budget Utilized</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Burn Rate Trend</CardTitle>
                <CardDescription>
                  Daily spending rate and projections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {formatCurrency(budgetData.burnRate)}
                    </div>
                    <div className="text-sm text-gray-500">per day</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Weekly burn rate:</span>
                      <span className="font-medium">{formatCurrency(budgetData.burnRate * 7)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly burn rate:</span>
                      <span className="font-medium">{formatCurrency(budgetData.burnRate * 30)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining budget:</span>
                      <span className="font-medium">{formatCurrency(budgetData.remainingBudget)}</span>
                    </div>
                    {budgetData.forecastedCompletion && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Estimated completion:</span>
                        <span>{new Date(budgetData.forecastedCompletion).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Chart Navigation */}
      <div className="flex justify-center">
        <Tabs value={selectedChart} onValueChange={setSelectedChart}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="utilization">Utilization</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};

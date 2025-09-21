import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  BarChart3,
  PieChart
} from 'lucide-react';
import { BudgetChart } from './BudgetChart';
import { CostAnalysis } from './CostAnalysis';
import { BudgetForm } from './BudgetForm';

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

interface ResourceCostSummary {
  employeeId: number;
  employeeName: string;
  baseRate: number;
  billableRate?: number;
  totalHours: number;
  totalCost: number;
  budgetedCost: number;
  variance: number;
  utilizationRate: number;
}

interface BudgetDashboardData {
  reports: {
    budgetAnalytics: BudgetAnalytics;
    costBreakdown: CostBreakdown[];
    resourceCosts: ResourceCostSummary[];
  };
  forecast: BudgetForecast[];
  analysis: {
    overallVariance: number;
    categoryVariances: { category: string; variance: number; percentage: number }[];
    recommendations: string[];
  };
}

interface BudgetDashboardProps {
  projectId: number;
}

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({ projectId }) => {
  const [data, setData] = useState<BudgetDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);

  useEffect(() => {
    fetchBudgetDashboardData();
  }, [projectId]);

  const fetchBudgetDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/budgets/project/${projectId}/dashboard`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch budget data');
      }
      
      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching budget dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading budget dashboard: {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchBudgetDashboardData}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No budget data found for this project.</p>
        <Button onClick={() => setShowBudgetForm(true)}>
          Create Budget
        </Button>
      </div>
    );
  }

  const { reports, forecast, analysis } = data;
  const { budgetAnalytics, costBreakdown, resourceCosts } = reports;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budget Dashboard</h1>
          <p className="text-gray-600">Project budget overview and financial analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          {getHealthStatusIcon(budgetAnalytics.healthStatus)}
          <Badge className={getHealthStatusColor(budgetAnalytics.healthStatus)}>
            {budgetAnalytics.healthStatus.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetAnalytics.totalBudget)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spent Budget</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetAnalytics.spentBudget)}</div>
            <p className="text-xs text-muted-foreground">
              {budgetAnalytics.utilizationPercentage.toFixed(1)}% utilized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetAnalytics.remainingBudget)}</div>
            {budgetAnalytics.forecastedCompletion && (
              <p className="text-xs text-muted-foreground">
                Est. completion: {new Date(budgetAnalytics.forecastedCompletion).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Burn Rate</CardTitle>
            {budgetAnalytics.costVariance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetAnalytics.burnRate)}</div>
            <p className="text-xs text-muted-foreground">per day</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Utilization Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Utilization</CardTitle>
          <CardDescription>
            Overall budget consumption and remaining allocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Budget Utilization</span>
                <span className="text-sm text-muted-foreground">
                  {budgetAnalytics.utilizationPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={budgetAnalytics.utilizationPercentage} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Allocated</p>
                <p className="font-medium">{formatCurrency(budgetAnalytics.allocatedBudget)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Spent</p>
                <p className="font-medium">{formatCurrency(budgetAnalytics.spentBudget)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Remaining</p>
                <p className="font-medium">{formatCurrency(budgetAnalytics.remainingBudget)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm">{recommendation}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="charts" className="w-full">
        <TabsList>
          <TabsTrigger value="charts" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Charts</span>
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center space-x-2">
            <PieChart className="h-4 w-4" />
            <span>Cost Breakdown</span>
          </TabsTrigger>
          <TabsTrigger value="resources">Resource Costs</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="mt-4">
          <BudgetChart 
            budgetData={budgetAnalytics}
            forecastData={forecast}
            costBreakdown={costBreakdown}
          />
        </TabsContent>

        <TabsContent value="breakdown" className="mt-4">
          <CostAnalysis 
            costBreakdown={costBreakdown}
            categoryVariances={analysis.categoryVariances}
          />
        </TabsContent>

        <TabsContent value="resources" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Cost Summary</CardTitle>
              <CardDescription>
                Individual resource costs and utilization rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Employee</th>
                      <th className="text-right py-2">Base Rate</th>
                      <th className="text-right py-2">Billable Rate</th>
                      <th className="text-right py-2">Hours</th>
                      <th className="text-right py-2">Total Cost</th>
                      <th className="text-right py-2">Variance</th>
                      <th className="text-right py-2">Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resourceCosts.map((resource) => (
                      <tr key={resource.employeeId} className="border-b">
                        <td className="py-2">{resource.employeeName}</td>
                        <td className="text-right py-2">{formatCurrency(resource.baseRate)}</td>
                        <td className="text-right py-2">
                          {resource.billableRate ? formatCurrency(resource.billableRate) : '-'}
                        </td>
                        <td className="text-right py-2">{resource.totalHours}h</td>
                        <td className="text-right py-2">{formatCurrency(resource.totalCost)}</td>
                        <td className={`text-right py-2 ${
                          resource.variance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(resource.variance)}
                        </td>
                        <td className="text-right py-2">
                          {resource.utilizationRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Forecast</CardTitle>
              <CardDescription>
                Historical trends and future budget projections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forecast.map((period, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{period.period}</p>
                      <p className="text-sm text-muted-foreground">
                        Trend: {period.trendAnalysis}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(period.forecastedCost)}</p>
                      <p className={`text-sm ${
                        period.variance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {period.variance >= 0 ? '+' : ''}{formatCurrency(period.variance)} variance
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Budget Form Modal */}
      {showBudgetForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <BudgetForm 
              projectId={projectId}
              onSuccess={() => {
                setShowBudgetForm(false);
                fetchBudgetDashboardData();
              }}
              onCancel={() => setShowBudgetForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
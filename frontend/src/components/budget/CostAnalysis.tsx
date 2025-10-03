import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  DollarSign,
  PieChart,
  BarChart3
} from 'lucide-react';

interface CostBreakdown {
  category: string;
  budgeted: number;
  allocated: number;
  spent: number;
  variance: number;
  percentage: number;
}

interface CategoryVariance {
  category: string;
  variance: number;
  percentage: number;
}

interface CostAnalysisProps {
  costBreakdown: CostBreakdown[];
  categoryVariances: CategoryVariance[];
}

export const CostAnalysis: React.FC<CostAnalysisProps> = ({
  costBreakdown,
  categoryVariances
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-yellow-500',
      'bg-purple-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-orange-500'
    ];
    return colors[index % colors.length];
  };

  const getVarianceStatus = (variance: number) => {
    if (variance > 0) {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        text: 'Under Budget',
        color: 'text-green-600 bg-green-50'
      };
    } else if (variance < 0) {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        text: 'Over Budget', 
        color: 'text-red-600 bg-red-50'
      };
    } else {
      return {
        icon: <CheckCircle className="h-4 w-4 text-gray-500" />,
        text: 'On Budget',
        color: 'text-gray-600 bg-gray-50'
      };
    }
  };

  const totalBudgeted = costBreakdown.reduce((sum, item) => sum + item.budgeted, 0);
  const totalSpent = costBreakdown.reduce((sum, item) => sum + item.spent, 0);
  const totalVariance = costBreakdown.reduce((sum, item) => sum + item.variance, 0);

  const getUtilizationPercentage = (spent: number, budgeted: number) => {
    return budgeted > 0 ? (spent / budgeted) * 100 : 0;
  };

  const getCriticalCategories = () => {
    return categoryVariances.filter(cv => Math.abs(cv.percentage) > 20);
  };

  const criticalCategories = getCriticalCategories();

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudgeted > 0 ? ((totalSpent / totalBudgeted) * 100).toFixed(1) : 0}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variance</CardTitle>
            {totalVariance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              totalVariance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(totalVariance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalVariance >= 0 ? 'Under budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Categories Alert */}
      {criticalCategories.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>High Variance Alert:</strong> The following categories have significant budget variances: {' '}
            {criticalCategories.map((cat, index) => (
              <span key={cat.category}>
                <strong>{cat.category}</strong> ({cat.percentage > 0 ? '+' : ''}{cat.percentage.toFixed(1)}%)
                {index < criticalCategories.length - 1 ? ', ' : ''}
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Cost Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <span>Budget Allocation by Category</span>
          </CardTitle>
          <CardDescription>
            Visual breakdown of budget distribution across cost categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Simple pie chart representation */}
            <div className="flex flex-wrap gap-2 mb-4">
              {costBreakdown.map((item, index) => (
                <div key={item.category} className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getCategoryColor(index)}`}></div>
                  <span className="text-sm">{item.category}</span>
                  <Badge variant="secondary">{item.percentage.toFixed(1)}%</Badge>
                </div>
              ))}
            </div>

            {/* Progress bars showing budget utilization */}
            <div className="space-y-3">
              {costBreakdown.map((item, index) => {
                const utilizationPercentage = getUtilizationPercentage(item.spent, item.budgeted);
                const status = getVarianceStatus(item.variance);
                
                return (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(index)}`}></div>
                        <span className="font-medium capitalize">{item.category}</span>
                        {status.icon}
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium">{formatCurrency(item.spent)} / {formatCurrency(item.budgeted)}</div>
                        <div className={`text-xs px-2 py-1 rounded ${status.color}`}>
                          {status.text}
                        </div>
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(utilizationPercentage, 100)} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{utilizationPercentage.toFixed(1)}% utilized</span>
                      <span>Variance: {formatCurrency(item.variance)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Cost Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Detailed Cost Analysis</span>
          </CardTitle>
          <CardDescription>
            Comprehensive breakdown of budgeted vs actual costs by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Category</th>
                  <th className="text-right py-3">Budgeted</th>
                  <th className="text-right py-3">Allocated</th>
                  <th className="text-right py-3">Spent</th>
                  <th className="text-right py-3">Variance</th>
                  <th className="text-right py-3">Utilization %</th>
                  <th className="text-center py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {costBreakdown.map((item, index) => {
                  const utilizationPercentage = getUtilizationPercentage(item.spent, item.budgeted);
                  const status = getVarianceStatus(item.variance);
                  
                  return (
                    <tr key={item.category} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getCategoryColor(index)}`}></div>
                          <span className="font-medium capitalize">{item.category}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 font-medium">
                        {formatCurrency(item.budgeted)}
                      </td>
                      <td className="text-right py-3">
                        {formatCurrency(item.allocated)}
                      </td>
                      <td className="text-right py-3">
                        {formatCurrency(item.spent)}
                      </td>
                      <td className={`text-right py-3 font-medium ${
                        item.variance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(item.variance)}
                      </td>
                      <td className="text-right py-3">
                        <div className="flex items-center justify-end space-x-1">
                          <span>{utilizationPercentage.toFixed(1)}%</span>
                          <div className="w-12">
                            <Progress value={Math.min(utilizationPercentage, 100)} className="h-1" />
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3">
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs ${status.color}`}>
                          {status.icon}
                          <span>{status.text}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-gray-300">
                <tr className="font-semibold">
                  <td className="py-3">Total</td>
                  <td className="text-right py-3">{formatCurrency(totalBudgeted)}</td>
                  <td className="text-right py-3">{formatCurrency(costBreakdown.reduce((sum, item) => sum + item.allocated, 0))}</td>
                  <td className="text-right py-3">{formatCurrency(totalSpent)}</td>
                  <td className={`text-right py-3 ${
                    totalVariance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(totalVariance)}
                  </td>
                  <td className="text-right py-3">
                    {totalBudgeted > 0 ? ((totalSpent / totalBudgeted) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="text-center py-3">
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                      getVarianceStatus(totalVariance).color
                    }`}>
                      {getVarianceStatus(totalVariance).icon}
                      <span>{getVarianceStatus(totalVariance).text}</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Variance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Variance Analysis</CardTitle>
          <CardDescription>
            Categories with significant budget variances requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoryVariances.length > 0 ? (
            <div className="space-y-3">
              {categoryVariances
                .sort((a, b) => Math.abs(b.percentage) - Math.abs(a.percentage))
                .map((variance) => {
                  const isSignificant = Math.abs(variance.percentage) > 10;
                  return (
                    <div 
                      key={variance.category}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        isSignificant ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {isSignificant && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                        <span className="font-medium capitalize">{variance.category}</span>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
                          variance.variance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(variance.variance)}
                        </div>
                        <div className={`text-sm ${
                          variance.percentage >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {variance.percentage > 0 ? '+' : ''}{variance.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              No significant variances detected. Budget is tracking well across all categories.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
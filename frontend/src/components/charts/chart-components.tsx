/**
 * Modern Chart Components
 * Reusable chart components using recharts with consistent styling
 */

import * as React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { designTokens } from '../../styles/design-tokens';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardContent } from '../ui/enhanced-card';
import { Skeleton } from '../ui/skeleton';

// Chart color palette
const chartColors = {
  primary: designTokens.colors.primary[500],
  secondary: designTokens.colors.secondary[500],
  success: designTokens.colors.success[500],
  warning: designTokens.colors.warning[500],
  error: designTokens.colors.error[500],
  info: designTokens.colors.info[500],
  gray: designTokens.colors.gray[500],
};

const colorPalette = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.success,
  chartColors.warning,
  chartColors.error,
  chartColors.info,
  chartColors.gray,
];

// Custom tooltip component
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-32">
        <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2 text-xs">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium text-gray-900">
              {typeof entry.value === 'number'
                ? entry.value.toLocaleString()
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Base chart wrapper component
interface BaseChartProps {
  title?: string;
  subtitle?: string;
  loading?: boolean;
  height?: number;
  className?: string;
  children: React.ReactNode;
}

const BaseChart: React.FC<BaseChartProps> = ({
  title,
  subtitle,
  loading = false,
  height = 300,
  className,
  children
}) => {
  if (loading) {
    return (
      <Card className={className}>
        {(title || subtitle) && (
          <CardHeader title={title} subtitle={subtitle} />
        )}
        <CardContent>
          <Skeleton variant="rectangular" height={`${height}px`} className="rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {(title || subtitle) && (
        <CardHeader title={title} subtitle={subtitle} />
      )}
      <CardContent>
        <div style={{ height: `${height}px` }}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

// Area Chart Component
interface AreaChartProps {
  data: any[];
  xKey: string;
  yKeys: string[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  height?: number;
  className?: string;
  colors?: string[];
}

export const AreaChartComponent: React.FC<AreaChartProps> = ({
  data,
  xKey,
  yKeys,
  title,
  subtitle,
  loading = false,
  height = 300,
  className,
  colors = colorPalette
}) => {
  return (
    <BaseChart
      title={title}
      subtitle={subtitle}
      loading={loading}
      height={height}
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            {yKeys.map((key, index) => (
              <linearGradient key={key} id={`colorGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={designTokens.colors.gray[200]} />
          <XAxis 
            dataKey={xKey} 
            stroke={designTokens.colors.gray[500]}
            fontSize={12}
            tick={{ fill: designTokens.colors.gray[600] }}
          />
          <YAxis 
            stroke={designTokens.colors.gray[500]}
            fontSize={12}
            tick={{ fill: designTokens.colors.gray[600] }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {yKeys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="1"
              stroke={colors[index % colors.length]}
              fillOpacity={1}
              fill={`url(#colorGradient${index})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </BaseChart>
  );
};

// Bar Chart Component
interface BarChartProps {
  data: any[];
  xKey: string;
  yKeys: string[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  height?: number;
  className?: string;
  colors?: string[];
  stacked?: boolean;
}

export const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  xKey,
  yKeys,
  title,
  subtitle,
  loading = false,
  height = 300,
  className,
  colors = colorPalette,
  stacked = false
}) => {
  return (
    <BaseChart
      title={title}
      subtitle={subtitle}
      loading={loading}
      height={height}
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={designTokens.colors.gray[200]} />
          <XAxis 
            dataKey={xKey} 
            stroke={designTokens.colors.gray[500]}
            fontSize={12}
            tick={{ fill: designTokens.colors.gray[600] }}
          />
          <YAxis 
            stroke={designTokens.colors.gray[500]}
            fontSize={12}
            tick={{ fill: designTokens.colors.gray[600] }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {yKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId={stacked ? "1" : undefined}
              fill={colors[index % colors.length]}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </BaseChart>
  );
};

// Line Chart Component
interface LineChartProps {
  data: any[];
  xKey: string;
  yKeys: string[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  height?: number;
  className?: string;
  colors?: string[];
}

export const LineChartComponent: React.FC<LineChartProps> = ({
  data,
  xKey,
  yKeys,
  title,
  subtitle,
  loading = false,
  height = 300,
  className,
  colors = colorPalette
}) => {
  return (
    <BaseChart
      title={title}
      subtitle={subtitle}
      loading={loading}
      height={height}
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={designTokens.colors.gray[200]} />
          <XAxis 
            dataKey={xKey} 
            stroke={designTokens.colors.gray[500]}
            fontSize={12}
            tick={{ fill: designTokens.colors.gray[600] }}
          />
          <YAxis 
            stroke={designTokens.colors.gray[500]}
            fontSize={12}
            tick={{ fill: designTokens.colors.gray[600] }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {yKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: colors[index % colors.length], strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </BaseChart>
  );
};

// Pie Chart Component
interface PieChartProps {
  data: Array<{ name: string; value: number; }>;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  height?: number;
  className?: string;
  colors?: string[];
  showLabels?: boolean;
}

export const PieChartComponent: React.FC<PieChartProps> = ({
  data,
  title,
  subtitle,
  loading = false,
  height = 300,
  className,
  colors = colorPalette,
  showLabels = true
}) => {
  return (
    <BaseChart
      title={title}
      subtitle={subtitle}
      loading={loading}
      height={height}
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={showLabels ? ({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : false}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </BaseChart>
  );
};

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
    period?: string;
  };
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  icon,
  loading = false,
  className
}) => {
  if (loading) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Skeleton variant="text" height="16px" width="60%" className="mb-2" />
            <Skeleton variant="text" height="32px" width="80%" className="mb-2" />
            <Skeleton variant="text" height="14px" width="40%" />
          </div>
          <Skeleton variant="circular" width="48px" height="48px" />
        </div>
      </Card>
    );
  }

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return 'text-green-600 bg-green-50';
      case 'down': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  };

  return (
    <Card className={cn('hover:shadow-lg transition-shadow duration-200', className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change && (
            <div className="flex items-center">
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                getTrendColor(change.trend)
              )}>
                <span className="mr-1">{getTrendIcon(change.trend)}</span>
                {Math.abs(change.value)}%
              </span>
              {change.period && (
                <span className="ml-2 text-xs text-gray-500">
                  vs {change.period}
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
              {icon}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
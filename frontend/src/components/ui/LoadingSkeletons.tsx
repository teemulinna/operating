import React from 'react';
import { cn } from '../../lib/utils';

// Shimmer keyframes for CSS animation
const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
  }
`;

// Base shimmer class
const shimmerClass = 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-animate-shimmer animate-shimmer';

// Custom shimmer animation styles
const ShimmerStyles = () => (
  <style>{`
    .animate-shimmer {
      animation: shimmer 2s infinite linear;
      background-size: 200px 100%;
      background-repeat: no-repeat;
    }
    ${shimmerKeyframes}
  `}</style>
);

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

const Skeleton: React.FC<SkeletonProps> = ({ className, children, ...props }) => (
  <div 
    className={cn(shimmerClass, 'rounded', className)} 
    {...props}
  >
    <ShimmerStyles />
    {children}
  </div>
);

interface ResourceCardSkeletonProps {
  count?: number;
  className?: string;
}

export const ResourceCardSkeleton: React.FC<ResourceCardSkeletonProps> = ({ 
  count = 1, 
  className = '' 
}) => {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div 
          key={index}
          className={cn('p-6 border rounded-lg animate-pulse', className)}
          data-testid="resource-card-skeleton"
          role="status"
          aria-label="Loading resource card"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              {/* Avatar */}
              <Skeleton 
                className="w-12 h-12 rounded-full"
                data-testid="skeleton-avatar"
              />
              
              {/* Employee info */}
              <div className="space-y-2">
                <Skeleton 
                  className="h-4 w-32"
                  data-testid="skeleton-name"
                />
                <Skeleton 
                  className="h-3 w-24"
                  data-testid="skeleton-position"
                />
                <Skeleton 
                  className="h-3 w-36"
                  data-testid="skeleton-email"
                />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>

            {/* Progress ring */}
            <Skeleton 
              className="w-16 h-16 rounded-full"
              data-testid="skeleton-progress-ring"
            />
          </div>

          {/* Skills section */}
          <div className="mb-4">
            <Skeleton className="h-4 w-12 mb-2" />
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton 
                  key={i}
                  className="h-6 w-16 rounded-full"
                  data-testid="skeleton-skill-badge"
                />
              ))}
            </div>
          </div>

          {/* Calendar section */}
          <div className="mb-4">
            <Skeleton className="h-4 w-32 mb-2" />
            <div 
              className="space-y-2"
              data-testid="skeleton-calendar"
            >
              <div className="flex justify-between items-center">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="w-4 h-4" />
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }, (_, i) => (
                  <Skeleton 
                    key={i}
                    className="w-6 h-6 rounded"
                    data-testid="skeleton-calendar-cell"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 border-t">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton 
                  key={i}
                  className="h-8 w-20 rounded"
                  data-testid="skeleton-action-button"
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

interface CommandPaletteSkeletonProps {
  employeeCount?: number;
  projectCount?: number;
  actionCount?: number;
}

export const CommandPaletteSkeleton: React.FC<CommandPaletteSkeletonProps> = ({
  employeeCount = 3,
  projectCount = 2,
  actionCount = 3,
}) => {
  return (
    <div 
      className="rounded-lg border shadow-md p-0 animate-pulse"
      data-testid="command-palette-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="sr-only">Loading command palette...</div>
      
      {/* Search input skeleton */}
      <div className="flex items-center border-b px-3">
        <div className="mr-2 h-4 w-4 shrink-0 opacity-50 bg-gray-300 rounded" />
        <Skeleton 
          className="h-10 w-full rounded-md"
          data-testid="skeleton-search-input"
        />
      </div>

      <div className="max-h-96 p-2 space-y-4">
        {/* Employees group */}
        <div data-testid="skeleton-employees-group">
          <Skeleton className="h-4 w-20 mb-2" />
          {Array.from({ length: employeeCount }, (_, i) => (
            <div 
              key={i}
              className="flex items-center space-x-3 p-2"
              data-testid="skeleton-employee-result"
            >
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <div className="flex gap-1">
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>

        {/* Projects group */}
        <div data-testid="skeleton-projects-group">
          <Skeleton className="h-4 w-16 mb-2" />
          {Array.from({ length: projectCount }, (_, i) => (
            <div 
              key={i}
              className="flex items-center space-x-3 p-2"
              data-testid="skeleton-project-result"
            >
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-48" />
                <div className="flex gap-1">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-18 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>

        {/* Actions group */}
        <div data-testid="skeleton-actions-group">
          <Skeleton className="h-4 w-24 mb-2" />
          {Array.from({ length: actionCount }, (_, i) => (
            <div 
              key={i}
              className="flex items-center space-x-3 p-2"
              data-testid="skeleton-action-result"
            >
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="w-8 h-4 rounded" />
            <Skeleton className="w-16 h-3" />
            <Skeleton className="w-6 h-4 rounded" />
            <Skeleton className="w-12 h-3" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="w-8 h-4 rounded" />
            <Skeleton className="w-10 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
};

interface DashboardSkeletonProps {
  includeResourceCards?: boolean;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  includeResourceCards = false,
}) => {
  return (
    <div 
      className="space-y-6 animate-pulse"
      data-testid="dashboard-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Header */}
      <div className="space-y-2">
        <Skeleton 
          className="h-8 w-80"
          data-testid="skeleton-dashboard-title"
        />
        <Skeleton 
          className="h-4 w-96"
          data-testid="skeleton-dashboard-subtitle"
        />
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div 
            key={i}
            className="p-6 rounded-lg border"
            data-testid="skeleton-metric-card"
          >
            <div className="flex items-center">
              <Skeleton 
                className="h-8 w-8 rounded"
                data-testid="skeleton-metric-icon"
              />
              <div className="ml-4 space-y-2">
                <Skeleton 
                  className="h-3 w-24"
                  data-testid="skeleton-metric-label"
                />
                <Skeleton 
                  className="h-6 w-16"
                  data-testid="skeleton-metric-value"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex space-x-2 border-b">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton 
              key={i}
              className="h-10 w-24 rounded-md"
              data-testid="skeleton-tab"
            />
          ))}
        </div>

        {/* Tab content */}
        <Skeleton 
          className="h-96 w-full rounded-lg"
          data-testid="skeleton-tab-content"
        />

        {/* Resource cards if requested */}
        {includeResourceCards && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ResourceCardSkeleton count={6} />
          </div>
        )}
      </div>
    </div>
  );
};

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
}) => {
  const columnWidths = ['w-24', 'w-32', 'w-20', 'w-28', 'w-36', 'w-16'];
  
  return (
    <div 
      className="w-full animate-pulse"
      data-testid="table-skeleton"
    >
      <table className="w-full border-collapse">
        {/* Header */}
        <thead>
          <tr>
            {Array.from({ length: columns }, (_, i) => (
              <th key={i} className="h-12 border-b p-2 text-left">
                <Skeleton 
                  className={`h-4 ${columnWidths[i % columnWidths.length]}`}
                  data-testid="skeleton-table-header-cell"
                />
              </th>
            ))}
          </tr>
        </thead>
        
        {/* Body */}
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr 
              key={rowIndex}
              data-testid="skeleton-table-row"
            >
              {Array.from({ length: columns }, (_, colIndex) => (
                <td key={colIndex} className="h-12 border-b p-2">
                  <Skeleton 
                    className={`h-4 ${columnWidths[(rowIndex + colIndex) % columnWidths.length]}`}
                    data-testid="skeleton-table-cell"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface ChartSkeletonProps {
  type?: 'bar' | 'line' | 'pie';
  showLegend?: boolean;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  type = 'bar',
  showLegend = false,
}) => {
  return (
    <div 
      className="w-full space-y-4 animate-pulse"
      data-testid="chart-skeleton"
    >
      {/* Chart title */}
      <Skeleton 
        className="h-6 w-48 mx-auto"
        data-testid="skeleton-chart-title"
      />

      {/* Chart area */}
      <div className="relative h-64 bg-gray-50 rounded border p-4">
        {type === 'bar' && (
          <>
            {/* Y-axis */}
            <div 
              className="absolute left-2 top-4 bottom-8 w-8"
              data-testid="skeleton-y-axis"
            >
              <div className="space-y-8">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-3 w-6" />
                ))}
              </div>
            </div>

            {/* Bars */}
            <div className="ml-12 mr-4 mb-8 h-full flex items-end space-x-2">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton 
                  key={i}
                  className="w-8 rounded-t"
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                  data-testid="skeleton-chart-bar"
                />
              ))}
            </div>

            {/* X-axis */}
            <div 
              className="absolute bottom-2 left-12 right-4 h-6 flex space-x-2"
              data-testid="skeleton-x-axis"
            >
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="flex-1 h-3" />
              ))}
            </div>
          </>
        )}

        {type === 'line' && (
          <>
            {/* Grid */}
            <div className="absolute inset-4 border border-gray-200 rounded">
              <Skeleton 
                className="w-full h-full rounded"
                data-testid="skeleton-chart-line"
              />
            </div>
          </>
        )}

        {type === 'pie' && (
          <div className="flex items-center justify-center h-full">
            <Skeleton 
              className="w-40 h-40 rounded-full"
              data-testid="skeleton-chart-pie"
            />
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div 
              key={i}
              className="flex items-center space-x-2"
              data-testid="skeleton-legend-item"
            >
              <Skeleton 
                className="w-4 h-4 rounded"
                data-testid="skeleton-legend-color"
              />
              <Skeleton 
                className="h-3 w-16"
                data-testid="skeleton-legend-label"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Export individual components and a combined object
export const LoadingSkeletons = {
  ResourceCard: ResourceCardSkeleton,
  CommandPalette: CommandPaletteSkeleton,
  Dashboard: DashboardSkeleton,
  Table: TableSkeleton,
  Chart: ChartSkeleton,
};

export default LoadingSkeletons;
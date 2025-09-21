import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-md';
      case 'text':
      default:
        return 'rounded h-4';
    }
  };

  const getStyle = () => {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;
    return style;
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`} data-testid="loading-skeleton">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              ...getStyle(),
              width: index === lines - 1 ? '75%' : '100%'
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={getStyle()}
      data-testid="loading-skeleton"
    />
  );
};

// Pre-built skeleton components for common use cases
export const EmployeeCardSkeleton: React.FC = () => (
  <div className="bg-white p-6 rounded-lg shadow" data-testid="employee-card-skeleton">
    <div className="flex items-center space-x-4">
      <LoadingSkeleton variant="circular" width={48} height={48} />
      <div className="flex-1">
        <LoadingSkeleton className="mb-2" width="60%" />
        <LoadingSkeleton width="40%" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <LoadingSkeleton width="30%" />
      <LoadingSkeleton width="50%" />
    </div>
  </div>
);

export const ProjectCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow overflow-hidden" data-testid="project-card-skeleton">
    <div className="p-6">
      <LoadingSkeleton className="mb-2" width="70%" height={20} />
      <LoadingSkeleton lines={3} className="mb-4" />
      <div className="flex space-x-2">
        <LoadingSkeleton variant="rectangular" width={60} height={24} />
        <LoadingSkeleton variant="rectangular" width={80} height={24} />
      </div>
    </div>
  </div>
);

export const AllocationRowSkeleton: React.FC = () => (
  <div className="px-6 py-4 border-b border-gray-200" data-testid="allocation-row-skeleton">
    <div className="flex items-center justify-between">
      <div className="flex-1 space-y-2">
        <LoadingSkeleton width="40%" />
        <LoadingSkeleton width="60%" />
        <div className="flex space-x-4">
          <LoadingSkeleton width="80px" />
          <LoadingSkeleton width="120px" />
          <LoadingSkeleton width="60px" />
        </div>
      </div>
      <div className="flex space-x-2">
        <LoadingSkeleton width="40px" height="32px" />
        <LoadingSkeleton width="50px" height="32px" />
      </div>
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="bg-white shadow overflow-hidden sm:rounded-md" data-testid="table-skeleton">
    <div className="border-b border-gray-200 px-6 py-3">
      <div className="flex space-x-8">
        {Array.from({ length: columns }).map((_, index) => (
          <LoadingSkeleton key={index} width="100px" />
        ))}
      </div>
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="border-b border-gray-100 px-6 py-4">
        <div className="flex space-x-8">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton key={colIndex} width="100px" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const DashboardStatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="dashboard-stats-skeleton">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center space-x-3">
          <LoadingSkeleton variant="circular" width={48} height={48} />
          <div className="flex-1">
            <LoadingSkeleton width="70%" className="mb-2" />
            <LoadingSkeleton width="40%" height={32} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;
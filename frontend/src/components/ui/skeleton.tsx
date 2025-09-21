/**
 * Skeleton Loading Component
 * Modern skeleton loaders with shimmer animation
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { designTokens } from '../../styles/design-tokens';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className, 
    variant = 'rectangular', 
    width, 
    height,
    lines = 1,
    animation = 'pulse',
    ...props 
  }, ref) => {
    const baseClasses = [
      'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200',
      'animate-pulse',
      animation === 'wave' && 'animate-shimmer',
      animation === 'none' && 'animate-none',
    ].filter(Boolean).join(' ');

    const variantClasses = {
      text: 'h-4 rounded',
      circular: 'rounded-full',
      rectangular: 'rounded',
      rounded: 'rounded-lg'
    };

    const style: React.CSSProperties = {
      width: width || '100%',
      height: height || (variant === 'circular' ? width : '1rem'),
    };

    if (variant === 'text' && lines > 1) {
      return (
        <div className={cn('space-y-2', className)} ref={ref} {...props}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={cn(baseClasses, variantClasses.text)}
              style={{
                ...style,
                width: index === lines - 1 ? '75%' : '100%'
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        className={cn(baseClasses, variantClasses[variant], className)}
        style={style}
        ref={ref}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Predefined skeleton components for common use cases
export const SkeletonText = ({ lines = 3, className, ...props }: Omit<SkeletonProps, 'variant'> & { lines?: number }) => (
  <Skeleton variant="text" lines={lines} className={className} {...props} />
);

export const SkeletonCard = ({ className, ...props }: Omit<SkeletonProps, 'variant'>) => (
  <div className={cn('p-6 space-y-4 bg-white rounded-lg shadow-sm border', className)} {...props}>
    <div className="flex items-center space-x-4">
      <Skeleton variant="circular" width="40px" height="40px" />
      <div className="space-y-2 flex-1">
        <Skeleton variant="text" height="16px" width="60%" />
        <Skeleton variant="text" height="14px" width="40%" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

export const SkeletonTable = ({ rows = 5, columns = 4, className, ...props }: 
  Omit<SkeletonProps, 'variant'> & { rows?: number; columns?: number }) => (
  <div className={cn('space-y-3', className)} {...props}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={`header-${index}`} variant="text" height="20px" className="flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" height="16px" className="flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonList = ({ items = 5, showAvatar = true, className, ...props }: 
  Omit<SkeletonProps, 'variant'> & { items?: number; showAvatar?: boolean }) => (
  <div className={cn('space-y-4', className)} {...props}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4">
        {showAvatar && <Skeleton variant="circular" width="32px" height="32px" />}
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" height="16px" width="70%" />
          <Skeleton variant="text" height="14px" width="50%" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonButton = ({ className, ...props }: Omit<SkeletonProps, 'variant'>) => (
  <Skeleton 
    variant="rounded" 
    height="40px" 
    width="120px" 
    className={cn('bg-gray-300', className)} 
    {...props} 
  />
);

export const SkeletonForm = ({ className, ...props }: Omit<SkeletonProps, 'variant'>) => (
  <div className={cn('space-y-6', className)} {...props}>
    {/* Form title */}
    <Skeleton variant="text" height="24px" width="40%" />
    
    {/* Form fields */}
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="space-y-2">
        <Skeleton variant="text" height="16px" width="25%" />
        <Skeleton variant="rounded" height="40px" width="100%" />
      </div>
    ))}
    
    {/* Form actions */}
    <div className="flex space-x-3 pt-4">
      <SkeletonButton />
      <SkeletonButton />
    </div>
  </div>
);

export { Skeleton };
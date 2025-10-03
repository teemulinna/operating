/**
 * Enhanced Card Component
 * Modern card component with variants, animations, and accessibility
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

const cardVariants = {
  default: 'bg-white border border-gray-200 shadow-sm hover:shadow-md',
  elevated: 'bg-white shadow-md hover:shadow-lg border-0',
  outlined: 'bg-white border-2 border-gray-200 hover:border-gray-300 shadow-none',
  filled: 'bg-gray-50 border border-gray-100 shadow-none hover:bg-gray-100',
  glass: 'bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:bg-white/90'
};

const cardSizes = {
  sm: 'p-4 rounded-lg',
  md: 'p-6 rounded-xl',
  lg: 'p-8 rounded-2xl'
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'md',
    interactive = false,
    loading = false,
    disabled = false,
    children,
    onClick,
    ...props 
  }, ref) => {
    return (
      <div
        className={cn(
          // Base styles
          'transition-all duration-200 ease-out',
          // Variant styles
          cardVariants[variant],
          // Size styles
          cardSizes[size],
          // Interactive styles
          interactive && 'cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]',
          // Loading state
          loading && 'animate-pulse opacity-70 pointer-events-none',
          // Disabled state
          disabled && 'opacity-50 pointer-events-none grayscale',
          // Focus styles for accessibility
          interactive && 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          className
        )}
        ref={ref}
        onClick={!disabled && !loading ? onClick : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(e as any);
          }
        } : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header Component
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, actions, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex items-start justify-between',
          (title || subtitle) && 'mb-4',
          className
        )}
        ref={ref}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 truncate">
              {subtitle}
            </p>
          )}
          {children}
        </div>
        {actions && (
          <div className="flex-shrink-0 ml-4">
            {actions}
          </div>
        )}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Content Component
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn('text-gray-700', className)}
        ref={ref}
        {...props}
      />
    );
  }
);

CardContent.displayName = 'CardContent';

// Card Footer Component
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex items-center justify-between pt-4 mt-4 border-t border-gray-100',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';

// Stats Card Component
interface StatsCardProps extends Omit<CardProps, 'children'> {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
    period?: string;
  };
  icon?: React.ReactNode;
  description?: string;
}

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ 
    title, 
    value, 
    change, 
    icon, 
    description, 
    className,
    ...props 
  }, ref) => {
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
      <Card
        className={cn('hover:shadow-lg transition-shadow duration-200', className)}
        ref={ref}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {value}
            </p>
            {description && (
              <p className="text-sm text-gray-500">
                {description}
              </p>
            )}
            {change && (
              <div className="flex items-center mt-2">
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
  }
);

StatsCard.displayName = 'StatsCard';

// Action Card Component
interface ActionCardProps extends CardProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

const ActionCard = React.forwardRef<HTMLDivElement, ActionCardProps>(
  ({ 
    title, 
    description, 
    actionLabel = 'Learn more', 
    onAction, 
    icon, 
    className,
    ...props 
  }, ref) => {
    return (
      <Card
        interactive
        className={cn('group cursor-pointer', className)}
        onClick={onAction}
        ref={ref}
        {...props}
      >
        <div className="flex items-start space-x-4">
          {icon && (
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 group-hover:bg-primary-100 transition-colors duration-200">
                {icon}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors duration-200">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-gray-500 mb-3">
                {description}
              </p>
            )}
            <span className="text-sm font-medium text-primary-600 group-hover:text-primary-700 transition-colors duration-200">
              {actionLabel} →
            </span>
          </div>
        </div>
      </Card>
    );
  }
);

ActionCard.displayName = 'ActionCard';

export { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  StatsCard,
  ActionCard
};
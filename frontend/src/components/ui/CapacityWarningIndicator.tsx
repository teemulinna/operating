import React from 'react';
import { AlertTriangle, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from './badge';

interface CapacityWarningIndicatorProps {
  utilizationRate: number;
  severity: 'none' | 'medium' | 'high' | 'critical';
  isOverAllocated: boolean;
  className?: string;
  showText?: boolean;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const severityConfig = {
  none: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: TrendingUp,
    iconColor: 'text-green-600'
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    iconColor: 'text-yellow-600'
  },
  high: {
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertTriangle,
    iconColor: 'text-orange-600'
  },
  critical: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertCircle,
    iconColor: 'text-red-600'
  }
};

const sizeConfig = {
  sm: {
    icon: 'w-3 h-3',
    text: 'text-xs',
    padding: 'px-1.5 py-0.5'
  },
  md: {
    icon: 'w-4 h-4',
    text: 'text-sm',
    padding: 'px-2 py-1'
  },
  lg: {
    icon: 'w-5 h-5',
    text: 'text-base',
    padding: 'px-3 py-1.5'
  }
};

export function CapacityWarningIndicator({
  utilizationRate,
  severity,
  isOverAllocated,
  className = '',
  showText = true,
  showPercentage = true,
  size = 'md'
}: CapacityWarningIndicatorProps) {
  // Don't show indicator if no over-allocation and utilization is normal
  if (!isOverAllocated && utilizationRate <= 80 && severity === 'none') {
    return null;
  }

  const config = severityConfig[severity];
  const sizeConf = sizeConfig[size];
  const IconComponent = config.icon;
  const shouldAnimate = severity === 'critical';

  const getText = () => {
    if (!showText) return null;
    
    if (severity === 'none') {
      return showPercentage ? `${Math.round(utilizationRate)}%` : 'Normal';
    }
    
    if (isOverAllocated) {
      return showPercentage 
        ? `Over ${Math.round(utilizationRate)}%`
        : 'Over-allocated';
    }
    
    return showPercentage 
      ? `${Math.round(utilizationRate)}%` 
      : 'High capacity';
  };

  return (
    <Badge
      className={`
        inline-flex items-center gap-1.5 border
        ${config.color}
        ${sizeConf.padding}
        ${shouldAnimate ? 'animate-pulse' : ''}
        ${className}
      `}
      data-testid="capacity-warning-indicator"
    >
      <IconComponent 
        className={`${sizeConf.icon} ${config.iconColor}`}
        data-testid="warning-icon"
      />
      {showText && (
        <span className={sizeConf.text} data-testid="warning-text">
          {getText()}
        </span>
      )}
    </Badge>
  );
}

export default CapacityWarningIndicator;

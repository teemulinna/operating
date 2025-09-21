import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Badge } from './badge';

interface FeatureAvailabilityBadgeProps {
  isAvailable: boolean;
  isSimulated?: boolean;
  feature: string;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
}

export function FeatureAvailabilityBadge({ 
  isAvailable, 
  isSimulated = false, 
  feature,
  size = 'default',
  showIcon = true
}: FeatureAvailabilityBadgeProps) {
  const getVariant = () => {
    if (!isAvailable) return 'destructive';
    if (isSimulated) return 'secondary';
    return 'default';
  };

  const getIcon = () => {
    if (!showIcon) return null;
    
    if (!isAvailable) {
      return <AlertCircle className="h-3 w-3" />;
    }
    if (isSimulated) {
      return <Info className="h-3 w-3" />;
    }
    return <CheckCircle className="h-3 w-3" />;
  };

  const getLabel = () => {
    if (!isAvailable) return 'Unavailable';
    if (isSimulated) return 'Simulated';
    return 'Live';
  };

  const getTitle = () => {
    if (!isAvailable) {
      return `${feature} is currently unavailable. Backend endpoint not responding.`;
    }
    if (isSimulated) {
      return `${feature} is using simulated data. Backend endpoint not available.`;
    }
    return `${feature} is working with live data from backend.`;
  };

  return (
    <Badge 
      variant={getVariant()} 
      className={`
        gap-1 
        ${size === 'sm' ? 'text-xs px-2 py-0.5' : ''}
        ${size === 'lg' ? 'text-base px-3 py-1' : ''}
        cursor-help
      `}
      title={getTitle()}
    >
      {getIcon()}
      {getLabel()}
    </Badge>
  );
}

interface FeatureStatusListProps {
  features: Array<{
    name: string;
    isAvailable: boolean;
    isSimulated?: boolean;
    description?: string;
  }>;
}

export function FeatureStatusList({ features }: FeatureStatusListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">AI Feature Status</h3>
      <div className="grid gap-2">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
            <div>
              <span className="text-sm font-medium">{feature.name}</span>
              {feature.description && (
                <p className="text-xs text-gray-600">{feature.description}</p>
              )}
            </div>
            <FeatureAvailabilityBadge
              isAvailable={feature.isAvailable}
              isSimulated={feature.isSimulated}
              feature={feature.name}
              size="sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default FeatureAvailabilityBadge;
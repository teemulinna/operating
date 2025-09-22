import React from 'react';
import { cn } from '../../lib/utils';

// ============================================
// COMPONENT
// ============================================

export const HeatMapLegend: React.FC<{ className?: string }> = ({ className = '' }) => {
  const legendItems = [
    { label: 'Available', color: 'bg-gray-100', description: '0% utilized' },
    { label: 'Low', color: 'bg-green-400', description: '1-70% utilized' },
    { label: 'Optimal', color: 'bg-blue-400', description: '71-85% utilized' },
    { label: 'High', color: 'bg-yellow-400', description: '86-95% utilized' },
    { label: 'Over-allocated', color: 'bg-red-500', description: '96%+ utilized' },
    { label: 'Unavailable', color: 'bg-gray-300', description: 'Holiday/Leave' }
  ];

  return (
    <div className={cn('flex flex-wrap items-center gap-4 p-3 bg-background border rounded-lg', className)}>
      <div className="text-sm font-medium text-muted-foreground">Legend:</div>
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={cn('h-4 w-4 rounded', item.color)} />
          <div className="text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="text-muted-foreground ml-1">({item.description})</span>
          </div>
        </div>
      ))}
    </div>
  );
};
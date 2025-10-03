import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Info } from 'lucide-react';

interface UtilizationLegendProps {
  compact?: boolean;
  showTitle?: boolean;
  className?: string;
}

/**
 * Utilization Legend Component (US-ES3)
 *
 * Visual legend explaining utilization levels and color coding:
 * - Gray: Unallocated (0%)
 * - Green: Good utilization (1-75%)
 * - Yellow: High utilization (76-100%)
 * - Red: Over-allocated (>100%)
 *
 * Acceptance Criteria:
 * ✓ Shows color-coded legend with descriptions
 * ✓ Matches schedule grid color scheme
 * ✓ Supports compact mode
 * ✓ Provides clear guidance on utilization levels
 */
export const UtilizationLegend: React.FC<UtilizationLegendProps> = ({
  compact = false,
  showTitle = true,
  className = ''
}) => {
  const legendItems = [
    {
      color: 'bg-gray-100',
      borderColor: 'border-gray-300',
      label: 'Unallocated',
      description: '0% utilized',
      range: '0h'
    },
    {
      color: 'bg-green-100',
      borderColor: 'border-green-300',
      label: 'Good Utilization',
      description: '1-75% utilized',
      range: '1-75%'
    },
    {
      color: 'bg-yellow-100',
      borderColor: 'border-yellow-300',
      label: 'High Utilization',
      description: '76-100% utilized',
      range: '76-100%'
    },
    {
      color: 'bg-red-100',
      borderColor: 'border-red-300',
      label: 'Over-Allocated',
      description: 'Over 100% utilized',
      range: '>100%',
      warning: true
    }
  ];

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-4 text-sm ${className}`} data-testid="utilization-legend-compact">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-4 h-4 ${item.color} border ${item.borderColor} rounded`}></div>
            <span className="text-gray-700">{item.label}</span>
            <span className="text-gray-500 text-xs">({item.range})</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className={className} data-testid="utilization-legend">
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Utilization Legend
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? '' : 'pt-4'}>
        <div className="space-y-3">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <div className={`w-6 h-6 ${item.color} border-2 ${item.borderColor} rounded flex-shrink-0 mt-0.5`}></div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                  {item.label}
                  {item.warning && (
                    <span className="text-red-600 text-xs">⚠️</span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {item.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            <strong>Tip:</strong> Aim for 75-90% utilization for optimal resource balance.
            Over-allocated employees (red) need immediate attention to prevent burnout.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UtilizationLegend;

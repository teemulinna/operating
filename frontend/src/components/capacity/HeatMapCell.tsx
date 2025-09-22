import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { HeatLevel } from './HeatMap';

// ============================================
// TYPES
// ============================================

export interface HeatmapCellData {
  employeeId: string;
  employeeName: string;
  department: string;
  date: Date;
  availableHours: number;
  allocatedHours: number;
  utilizationPercentage: number;
  heatLevel: HeatLevel;
  projectCount: number;
  projectNames: string[];
  isHoliday?: boolean;
  hasException?: boolean;
}

export interface HeatMapCellProps {
  cell: HeatmapCellData;
  onClick?: (cell: HeatmapCellData) => void;
  className?: string;
  showTooltip?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const HEAT_LEVEL_COLORS: Record<HeatLevel, string> = {
  available: 'bg-gray-100 hover:bg-gray-200',
  green: 'bg-green-400 hover:bg-green-500',
  blue: 'bg-blue-400 hover:bg-blue-500',
  yellow: 'bg-yellow-400 hover:bg-yellow-500',
  red: 'bg-red-500 hover:bg-red-600',
  unavailable: 'bg-gray-300 hover:bg-gray-400'
};

const HEAT_LEVEL_TEXT_COLORS: Record<HeatLevel, string> = {
  available: 'text-gray-700',
  green: 'text-white',
  blue: 'text-white',
  yellow: 'text-gray-900',
  red: 'text-white',
  unavailable: 'text-gray-600'
};

// ============================================
// COMPONENT
// ============================================

export const HeatMapCell: React.FC<HeatMapCellProps> = ({
  cell,
  onClick,
  className = '',
  showTooltip = true
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(cell);
    }
  };

  const cellContent = (
    <div
      className={cn(
        'h-10 w-full rounded cursor-pointer transition-all duration-200',
        'flex items-center justify-center text-xs font-medium',
        HEAT_LEVEL_COLORS[cell.heatLevel],
        HEAT_LEVEL_TEXT_COLORS[cell.heatLevel],
        cell.isHoliday && 'ring-2 ring-purple-400 ring-inset',
        cell.hasException && 'ring-2 ring-orange-400 ring-inset',
        onClick && 'hover:scale-105',
        className
      )}
      onClick={handleClick}
    >
      {cell.utilizationPercentage > 0 && (
        <span className="text-[10px]">
          {Math.round(cell.utilizationPercentage)}%
        </span>
      )}
    </div>
  );

  if (!showTooltip) {
    return cellContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {cellContent}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div className="font-semibold">{cell.employeeName}</div>
            <div className="text-sm text-muted-foreground">
              {new Date(cell.date).toLocaleDateString()}
              {cell.isHoliday && ' (Holiday)'}
              {cell.hasException && ' (Exception)'}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Available:</span>
                <span className="ml-1 font-medium">{cell.availableHours}h</span>
              </div>
              <div>
                <span className="text-muted-foreground">Allocated:</span>
                <span className="ml-1 font-medium">{cell.allocatedHours}h</span>
              </div>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">Utilization:</span>
              <span className={cn(
                'ml-1 font-medium',
                cell.utilizationPercentage > 100 && 'text-red-600',
                cell.utilizationPercentage > 85 && cell.utilizationPercentage <= 100 && 'text-yellow-600',
                cell.utilizationPercentage <= 85 && 'text-green-600'
              )}>
                {cell.utilizationPercentage.toFixed(1)}%
              </span>
            </div>

            {cell.projectCount > 0 && (
              <div className="text-sm">
                <div className="text-muted-foreground">Projects ({cell.projectCount}):</div>
                <div className="mt-1">
                  {cell.projectNames.slice(0, 3).map((project, idx) => (
                    <div key={idx} className="text-xs truncate">
                      • {project}
                    </div>
                  ))}
                  {cell.projectNames.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{cell.projectNames.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
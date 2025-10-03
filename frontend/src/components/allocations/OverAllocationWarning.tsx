import { AlertTriangle, Users } from 'lucide-react';
import { Badge } from '../ui/badge';

interface OverAllocationWarningProps {
  employeeName: string;
  currentAllocation: number;
  newAllocation: number;
  totalCapacity: number;
  onResolve?: () => void;
  className?: string;
}

export function OverAllocationWarning({ 
  employeeName,
  currentAllocation,
  newAllocation,
  totalCapacity,
  onResolve,
  className = ""
}: OverAllocationWarningProps) {
  const totalAllocation = currentAllocation + newAllocation;
  const overageHours = totalAllocation - totalCapacity;
  const utilizationRate = Math.round((totalAllocation / totalCapacity) * 100);
  
  const isOverAllocated = totalAllocation > totalCapacity;
  
  if (!isOverAllocated) {
    return null;
  }

  return (
    <div 
      data-testid="over-allocation-warning"
      className={`
        p-4 rounded-lg border-l-4 border-red-400 bg-red-50
        ${className}
      `}
    >
      <div className="flex items-start space-x-3">
        <div data-testid="warning-icon" className="flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-red-800">
            Warning: Capacity Exceeded
          </div>
          
          <div className="mt-1 text-sm text-red-700">
            <div className="flex items-center space-x-4 mb-2">
              <span>Employee: <strong>{employeeName}</strong></span>
              <Badge variant="destructive">
                {utilizationRate}% capacity
              </Badge>
            </div>
            
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm">
                <span>Current allocation:</span>
                <Badge variant="outline">{currentAllocation}h</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>New allocation:</span>
                <Badge variant="outline">+{newAllocation}h</Badge>
              </div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Total allocation:</span>
                <Badge variant="destructive">
                  {totalAllocation}h / {totalCapacity}h
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Over capacity by:</span>
                <Badge variant="destructive">
                  {overageHours}h
                </Badge>
              </div>
            </div>
          </div>

          <div 
            data-testid="resolution-suggestions" 
            className="mt-3 p-3 rounded-md bg-white border border-red-200"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Suggestions</span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 font-bold">→</span>
                <span>Reduce hours for existing projects</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 font-bold">→</span>
                <span>Assign work to other available team members</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 font-bold">→</span>
                <span>Extend project timeline to reduce weekly load</span>
              </li>
            </ul>
            
            {onResolve && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={onResolve}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  data-testid="resolve-warning-btn"
                >
                  Proceed Anyway
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

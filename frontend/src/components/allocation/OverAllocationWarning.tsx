/**
 * Over-allocation Protection UI Component
 * Beautiful real-time visual warnings and capacity management
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Users, Clock, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useToast } from '../ui/use-toast';
import { cn } from '../../lib/utils';

interface OverAllocation {
  id: string;
  employeeId: number;
  employeeName: string;
  department: string;
  capacity: number;
  currentLoad: number;
  overAllocation: number;
  projects: Array<{
    id: number;
    name: string;
    hoursAssigned: number;
    priority: 'low' | 'medium' | 'high';
  }>;
  severity: 'warning' | 'danger' | 'critical';
}

interface CapacityGauge {
  current: number;
  capacity: number;
  threshold: number;
}

interface OverAllocationWarningProps {
  className?: string;
  realTimeUpdates?: boolean;
}

// Animated Capacity Gauge Component
function CapacityGauge({ current, capacity, threshold }: CapacityGauge) {
  const percentage = Math.min((current / capacity) * 100, 100);
  const isOverAllocated = current > capacity;
  const isNearThreshold = current > threshold;

  const getGaugeColor = () => {
    if (isOverAllocated) return 'from-red-500 to-red-600';
    if (isNearThreshold) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
        <path
          d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-200 dark:text-gray-700"
        />
        <motion.path
          d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
          fill="none"
          strokeWidth="2"
          strokeDasharray={`${percentage}, 100`}
          className={cn('bg-gradient-to-r', getGaugeColor())}
          initial={{ strokeDasharray: '0, 100' }}
          animate={{ strokeDasharray: `${percentage}, 100` }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          style={{
            stroke: isOverAllocated ? '#ef4444' : isNearThreshold ? '#eab308' : '#22c55e'
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold">{current}h</div>
          <div className="text-xs text-gray-500">of {capacity}h</div>
        </div>
      </div>
    </div>
  );
}

// Over-allocation Item Component
function OverAllocationItem({ allocation }: { allocation: OverAllocation }) {
  const severityConfig = {
    warning: {
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-700',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      badgeVariant: 'secondary' as const
    },
    danger: {
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-700',
      iconColor: 'text-orange-600 dark:text-orange-400',
      badgeVariant: 'destructive' as const
    },
    critical: {
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-700',
      iconColor: 'text-red-600 dark:text-red-400',
      badgeVariant: 'destructive' as const
    }
  };

  const config = severityConfig[allocation.severity];
  const overAllocationPercentage = ((allocation.overAllocation / allocation.capacity) * 100).toFixed(1);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'p-4 rounded-lg border-2',
        config.bgColor,
        config.borderColor
      )}
      data-testid={`over-allocation-${allocation.employeeId}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <AlertTriangle className={cn('h-5 w-5', config.iconColor)} />
          <div>
            <div className="font-semibold">{allocation.employeeName}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{allocation.department}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={config.badgeVariant} className="capitalize">
            {allocation.severity}
          </Badge>
          <Badge variant="outline">
            +{overAllocationPercentage}%
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <CapacityGauge
          current={allocation.currentLoad}
          capacity={allocation.capacity}
          threshold={allocation.capacity * 0.8}
        />
        <div className="text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400">Over-allocated by</div>
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {allocation.overAllocation}h
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Active Projects:</div>
        {allocation.projects.map((project) => (
          <div key={project.id} className="flex items-center justify-between text-sm">
            <span className="truncate">{project.name}</span>
            <div className="flex items-center space-x-2">
              <Badge
                variant={project.priority === 'high' ? 'destructive' : 
                        project.priority === 'medium' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {project.priority}
              </Badge>
              <span className="font-medium">{project.hoursAssigned}h</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex space-x-2">
        <Button size="sm" variant="outline" className="flex-1">
          Resolve Conflict
        </Button>
        <Button size="sm" variant="outline">
          View Details
        </Button>
      </div>
    </motion.div>
  );
}

export default function OverAllocationWarning({ className, realTimeUpdates = true }: OverAllocationWarningProps) {
  const [overAllocations, setOverAllocations] = useState<OverAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAffectedEmployees, setTotalAffectedEmployees] = useState(0);
  const [averageOverAllocation, setAverageOverAllocation] = useState(0);
  const { toast } = useToast();

  // Mock data - replace with real API calls and WebSocket updates
  useEffect(() => {
    const mockOverAllocations: OverAllocation[] = [
      {
        id: '1',
        employeeId: 1,
        employeeName: 'Alice Johnson',
        department: 'Engineering',
        capacity: 40,
        currentLoad: 52,
        overAllocation: 12,
        projects: [
          { id: 1, name: 'Mobile App Redesign', hoursAssigned: 25, priority: 'high' },
          { id: 2, name: 'Backend API Migration', hoursAssigned: 15, priority: 'medium' },
          { id: 3, name: 'Code Review Tasks', hoursAssigned: 12, priority: 'low' }
        ],
        severity: 'danger'
      },
      {
        id: '2',
        employeeId: 2,
        employeeName: 'Bob Smith',
        department: 'Design',
        capacity: 40,
        currentLoad: 48,
        overAllocation: 8,
        projects: [
          { id: 4, name: 'UI Component Library', hoursAssigned: 30, priority: 'high' },
          { id: 5, name: 'Brand Guidelines Update', hoursAssigned: 18, priority: 'medium' }
        ],
        severity: 'warning'
      }
    ];

    setTimeout(() => {
      setOverAllocations(mockOverAllocations);
      setTotalAffectedEmployees(mockOverAllocations.length);
      
      const totalOverAllocation = mockOverAllocations.reduce((sum, alloc) => sum + alloc.overAllocation, 0);
      setAverageOverAllocation(totalOverAllocation / mockOverAllocations.length);
      
      setLoading(false);
    }, 1000);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    if (!realTimeUpdates) return;

    const interval = setInterval(() => {
      // Simulate new over-allocation detected
      if (Math.random() < 0.1) { // 10% chance every 5 seconds
        toast({
          title: "⚠️ New Over-allocation Detected",
          description: "John Doe has been over-allocated by 6 hours",
          variant: "destructive",
          duration: 5000,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [realTimeUpdates, toast]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32" data-testid="loading-spinner">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Checking for over-allocations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn('w-full', className)} data-testid="over-allocation-warning">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-red-600" />
              <span>Over-allocation Protection</span>
            </CardTitle>
            
            {realTimeUpdates && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center space-x-1 text-green-600 dark:text-green-400"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs">Live</span>
              </motion.div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {totalAffectedEmployees}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Affected Employees</div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {averageOverAllocation.toFixed(1)}h
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Over-allocation</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {overAllocations.filter(a => a.severity === 'critical').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Critical Cases</div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {overAllocations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
              data-testid="no-over-allocations"
            >
              <Shield className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
                All Clear!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No over-allocations detected. All employees are within capacity limits.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>{overAllocations.length} employee(s)</strong> are over-allocated. 
                  Consider redistributing tasks or adjusting project timelines.
                </AlertDescription>
              </Alert>

              <AnimatePresence>
                <div className="space-y-4">
                  {overAllocations.map((allocation) => (
                    <OverAllocationItem key={allocation.id} allocation={allocation} />
                  ))}
                </div>
              </AnimatePresence>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline">
                  Export Report
                </Button>
                <div className="flex space-x-2">
                  <Button variant="outline">
                    Auto-Resolve
                  </Button>
                  <Button>
                    Bulk Actions
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
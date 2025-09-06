import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  ExclamationTriangleIcon, 
  ClockIcon, 
  CalendarIcon,
  UserIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useResolveConflict } from '@/hooks/useAllocations';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import type { AllocationConflict, ConflictResolution } from '@/types/allocation';
import { CONFLICT_SEVERITY_COLORS } from '@/types/allocation';

interface ConflictResolverProps {
  conflicts: AllocationConflict[];
  isOpen: boolean;
  onClose: () => void;
  onResolved?: (resolvedConflicts: string[]) => void;
}

interface ConflictItemProps {
  conflict: AllocationConflict;
  onResolve: (conflictId: string, resolution: ConflictResolution) => void;
  isResolving: boolean;
}

function ConflictItem({ conflict, onResolve, isResolving }: ConflictItemProps) {
  const [resolutionType, setResolutionType] = useState<ConflictResolution['resolutionType']>('reschedule');
  const [newStartDate, setNewStartDate] = useState<Date>();
  const [newEndDate, setNewEndDate] = useState<Date>();
  const [newAllocatedHours, setNewAllocatedHours] = useState<number>();
  const [newEmployeeId, setNewEmployeeId] = useState<string>('');
  const [splitDate, setSplitDate] = useState<Date>();
  const [reason, setReason] = useState('');

  const severityColor = CONFLICT_SEVERITY_COLORS[conflict.severity] || 'bg-gray-100 text-gray-800';

  const handleResolve = () => {
    const parameters: ConflictResolution['parameters'] = {};

    switch (resolutionType) {
      case 'reschedule':
        if (newStartDate) parameters.newStartDate = format(newStartDate, 'yyyy-MM-dd');
        if (newEndDate) parameters.newEndDate = format(newEndDate, 'yyyy-MM-dd');
        break;
      case 'reduce_hours':
        if (newAllocatedHours) parameters.newAllocatedHours = newAllocatedHours;
        break;
      case 'reassign':
        if (newEmployeeId) parameters.newEmployeeId = newEmployeeId;
        break;
      case 'split_allocation':
        if (splitDate) parameters.splitDate = format(splitDate, 'yyyy-MM-dd');
        break;
    }

    const resolution: ConflictResolution = {
      conflictId: conflict.id,
      resolutionType,
      parameters,
      reason: reason || undefined,
    };

    onResolve(conflict.id, resolution);
  };

  const isResolutionValid = () => {
    switch (resolutionType) {
      case 'reschedule':
        return newStartDate && newEndDate;
      case 'reduce_hours':
        return newAllocatedHours && newAllocatedHours > 0;
      case 'reassign':
        return newEmployeeId;
      case 'split_allocation':
        return splitDate;
      case 'ignore':
        return true;
      default:
        return false;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg">{conflict.type.replace('_', ' ').toUpperCase()}</CardTitle>
            <Badge className={severityColor}>
              {conflict.severity}
            </Badge>
          </div>
          
          {conflict.canAutoResolve && (
            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
              Auto-resolvable
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Conflict Description */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">{conflict.description}</p>
          {conflict.suggestedResolution && (
            <p className="text-xs text-yellow-700 mt-2">
              <strong>Suggestion:</strong> {conflict.suggestedResolution}
            </p>
          )}
        </div>

        {/* Affected Allocations */}
        <div>
          <Label className="text-sm font-medium text-gray-700">
            Affected Allocations ({conflict.affectedAllocations.length})
          </Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {conflict.affectedAllocations.map((allocationId) => (
              <Badge key={allocationId} variant="outline" className="text-xs">
                {allocationId.slice(-8)} {/* Show last 8 chars of ID */}
              </Badge>
            ))}
          </div>
        </div>

        {/* Resolution Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Resolution Type</Label>
          <Select
            value={resolutionType}
            onValueChange={(value: ConflictResolution['resolutionType']) => setResolutionType(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reschedule">Reschedule Allocation</SelectItem>
              <SelectItem value="reduce_hours">Reduce Hours</SelectItem>
              <SelectItem value="reassign">Reassign to Different Employee</SelectItem>
              <SelectItem value="split_allocation">Split Allocation</SelectItem>
              <SelectItem value="ignore">Ignore Conflict</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Resolution Parameters */}
        {resolutionType === 'reschedule' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>New Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newStartDate ? format(newStartDate, 'MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newStartDate}
                    onSelect={setNewStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>New End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newEndDate ? format(newEndDate, 'MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newEndDate}
                    onSelect={setNewEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {resolutionType === 'reduce_hours' && (
          <div className="space-y-2">
            <Label>New Hours per Week</Label>
            <Input
              type="number"
              min="1"
              max="168"
              step="0.5"
              value={newAllocatedHours || ''}
              onChange={(e) => setNewAllocatedHours(parseFloat(e.target.value))}
              placeholder="e.g., 20"
            />
          </div>
        )}

        {resolutionType === 'reassign' && (
          <div className="space-y-2">
            <Label>New Employee ID</Label>
            <Input
              value={newEmployeeId}
              onChange={(e) => setNewEmployeeId(e.target.value)}
              placeholder="Enter employee ID or select from list"
            />
          </div>
        )}

        {resolutionType === 'split_allocation' && (
          <div className="space-y-2">
            <Label>Split Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !splitDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {splitDate ? format(splitDate, 'MMM d, yyyy') : 'Pick split date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={splitDate}
                  onSelect={setSplitDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Reason */}
        <div className="space-y-2">
          <Label>Reason (Optional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this resolution was chosen..."
            className="min-h-[60px]"
          />
        </div>

        {/* Resolve Button */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleResolve}
            disabled={!isResolutionValid() || isResolving}
            className="min-w-[120px]"
          >
            {isResolving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Resolving...
              </div>
            ) : (
              <>
                <CheckCircleIcon className="mr-2 h-4 w-4" />
                Resolve
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConflictResolver({ 
  conflicts, 
  isOpen, 
  onClose, 
  onResolved 
}: ConflictResolverProps) {
  const [resolvingConflicts, setResolvingConflicts] = useState<Set<string>>(new Set());
  const [resolvedConflicts, setResolvedConflicts] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const resolveMutation = useResolveConflict();

  const handleResolveConflict = async (conflictId: string, resolution: ConflictResolution) => {
    setResolvingConflicts(prev => new Set(prev).add(conflictId));

    try {
      const result = await resolveMutation.mutateAsync(resolution);
      
      if (result.success) {
        setResolvedConflicts(prev => new Set(prev).add(conflictId));
        toast({
          title: 'Conflict Resolved',
          description: 'The conflict has been successfully resolved.',
          variant: 'success',
        });

        // If there are remaining conflicts, show them
        if (result.remainingConflicts && result.remainingConflicts.length > 0) {
          toast({
            title: 'Additional Conflicts',
            description: `${result.remainingConflicts.length} additional conflicts detected.`,
            variant: 'warning',
          });
        }
      } else {
        toast({
          title: 'Resolution Failed',
          description: 'Failed to resolve the conflict. Please try a different approach.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Resolution Error',
        description: error.message || 'An error occurred while resolving the conflict.',
        variant: 'destructive',
      });
    } finally {
      setResolvingConflicts(prev => {
        const newSet = new Set(prev);
        newSet.delete(conflictId);
        return newSet;
      });
    }
  };

  const handleResolveAll = async () => {
    // Auto-resolve conflicts that can be automatically resolved
    const autoResolvable = conflicts.filter(c => c.canAutoResolve && !resolvedConflicts.has(c.id));
    
    for (const conflict of autoResolvable) {
      const resolution: ConflictResolution = {
        conflictId: conflict.id,
        resolutionType: 'reschedule', // Default auto-resolution
        reason: 'Auto-resolved by system',
      };
      
      await handleResolveConflict(conflict.id, resolution);
    }
  };

  const pendingConflicts = conflicts.filter(c => !resolvedConflicts.has(c.id));
  const autoResolvableCount = pendingConflicts.filter(c => c.canAutoResolve).length;
  const allResolved = pendingConflicts.length === 0;

  const handleClose = () => {
    if (resolvedConflicts.size > 0) {
      onResolved?.(Array.from(resolvedConflicts));
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ExclamationTriangleIcon className="mr-2 h-6 w-6 text-orange-600" />
            Resolve Allocation Conflicts
          </DialogTitle>
          <div className="text-sm text-gray-600">
            {pendingConflicts.length} conflict{pendingConflicts.length !== 1 ? 's' : ''} need{pendingConflicts.length === 1 ? 's' : ''} resolution
            {autoResolvableCount > 0 && (
              <span className="text-green-600 ml-2">
                ({autoResolvableCount} auto-resolvable)
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="py-4">
          {/* Quick Actions */}
          {autoResolvableCount > 0 && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-green-800">Quick Resolution</h4>
                  <p className="text-sm text-green-700">
                    {autoResolvableCount} conflict{autoResolvableCount !== 1 ? 's' : ''} can be automatically resolved
                  </p>
                </div>
                <Button
                  onClick={handleResolveAll}
                  disabled={resolveMutation.isPending}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Resolve All Auto-Resolvable
                </Button>
              </div>
            </div>
          )}

          {/* Conflicts List */}
          {allResolved ? (
            <div className="text-center py-12">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-600" />
              <h3 className="mt-2 text-lg font-semibold text-gray-900">All Conflicts Resolved</h3>
              <p className="mt-1 text-sm text-gray-500">
                Great! All allocation conflicts have been successfully resolved.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingConflicts.map((conflict) => (
                <ConflictItem
                  key={conflict.id}
                  conflict={conflict}
                  onResolve={handleResolveConflict}
                  isResolving={resolvingConflicts.has(conflict.id)}
                />
              ))}
            </div>
          )}

          {/* Resolved Conflicts Summary */}
          {resolvedConflicts.size > 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">
                  {resolvedConflicts.size} conflict{resolvedConflicts.size !== 1 ? 's' : ''} resolved
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={resolvingConflicts.size > 0}
          >
            {allResolved ? 'Done' : 'Close'}
          </Button>
          
          {!allResolved && (
            <Button
              onClick={handleClose}
              disabled={resolvingConflicts.size > 0}
              className="ml-2"
            >
              Finish Later
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
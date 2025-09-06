import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Employee, AvailabilityStatus } from '@/types/Employee';
import { useUpdateCapacity } from '@/hooks/useCapacity';
import { useToast } from '@/hooks/useToast';
import { Clock, User, AlertCircle } from 'lucide-react';

interface CapacityEditorProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (employee: Employee) => void;
}

const statusOptions: Array<{ value: AvailabilityStatus; label: string; description: string }> = [
  { value: 'available', label: 'Available', description: 'Ready to take on new work' },
  { value: 'busy', label: 'Busy', description: 'At capacity but can handle urgent tasks' },
  { value: 'unavailable', label: 'Unavailable', description: 'Not available for new assignments' },
  { value: 'out-of-office', label: 'Out of Office', description: 'Away from work' }
];

export function CapacityEditor({ employee, isOpen, onClose, onSave }: CapacityEditorProps) {
  const [weeklyHours, setWeeklyHours] = useState(
    employee.capacity?.weeklyCapacity.weeklyHours || 40
  );
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>(
    employee.capacity?.availabilityStatus || 'available'
  );
  const [notes, setNotes] = useState(employee.capacity?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateCapacity = useUpdateCapacity();
  const { toast } = useToast();

  const handleSave = async () => {
    if (weeklyHours <= 0 || weeklyHours > 80) {
      toast({
        title: 'Invalid Hours',
        description: 'Weekly hours must be between 1 and 80.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // In a real implementation, this would update the employee's capacity
      await updateCapacity.mutateAsync({
        employeeId: employee.id,
        date: new Date().toISOString().split('T')[0],
        totalHours: weeklyHours,
        status: availabilityStatus,
        notes: notes || undefined
      });

      // Create updated employee object
      const updatedEmployee: Employee = {
        ...employee,
        capacity: {
          employeeId: employee.id,
          weeklyCapacity: {
            weeklyHours,
            allocatedHours: employee.capacity?.weeklyCapacity.allocatedHours || 0,
            availableHours: Math.max(0, weeklyHours - (employee.capacity?.weeklyCapacity.allocatedHours || 0)),
            utilizationRate: employee.capacity?.weeklyCapacity.allocatedHours 
              ? (employee.capacity.weeklyCapacity.allocatedHours / weeklyHours) * 100 
              : 0,
            lastUpdated: new Date().toISOString()
          },
          availabilityStatus,
          currentProjects: employee.capacity?.currentProjects || 0,
          notes: notes || undefined
        }
      };

      onSave?.(updatedEmployee);
      onClose();
      
      toast({
        title: 'Capacity Updated',
        description: `${employee.firstName} ${employee.lastName}'s capacity has been updated.`,
        variant: 'success'
      });
    } catch (error) {
      console.error('Failed to update capacity:', error);
      toast({
        title: 'Update Failed',
        description: 'Unable to update capacity. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const currentAllocated = employee.capacity?.weeklyCapacity.allocatedHours || 0;
  const newAvailable = Math.max(0, weeklyHours - currentAllocated);
  const newUtilization = weeklyHours > 0 ? (currentAllocated / weeklyHours) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Edit Capacity - {employee.firstName} {employee.lastName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Employee Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <div className="text-sm font-medium text-gray-900">
              {employee.firstName} {employee.lastName}
            </div>
            <div className="text-sm text-gray-600">
              {employee.position} • {employee.department}
            </div>
          </div>

          {/* Weekly Hours */}
          <div className="space-y-2">
            <Label htmlFor="weekly-hours" className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>Weekly Capacity (hours)</span>
            </Label>
            <Input
              id="weekly-hours"
              type="number"
              min="1"
              max="80"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(parseInt(e.target.value) || 0)}
              placeholder="40"
            />
            <div className="text-xs text-gray-500">
              Standard full-time is 40 hours. Maximum is 80 hours.
            </div>
          </div>

          {/* Availability Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Availability Status</Label>
            <Select value={availabilityStatus} onValueChange={(value: AvailabilityStatus) => setAvailabilityStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Capacity Preview */}
          <div className="bg-blue-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center space-x-1 text-sm font-medium text-blue-900">
              <AlertCircle className="h-4 w-4" />
              <span>Capacity Preview</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-blue-600">Total</div>
                <div className="font-medium text-blue-900">{weeklyHours}h</div>
              </div>
              <div>
                <div className="text-xs text-blue-600">Allocated</div>
                <div className="font-medium text-blue-900">{currentAllocated}h</div>
              </div>
              <div>
                <div className="text-xs text-blue-600">Available</div>
                <div className="font-medium text-blue-900">{newAvailable}h</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-blue-600">
                <span>Utilization</span>
                <span>{newUtilization.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    newUtilization >= 100 ? 'bg-red-500' :
                    newUtilization >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(newUtilization, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about availability or constraints..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || weeklyHours <= 0 || weeklyHours > 80}
          >
            {isSubmitting ? 'Updating...' : 'Save Capacity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
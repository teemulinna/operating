import { EmployeeDeleteDialogProps } from '../types/employee.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';

/**
 * EmployeeDeleteDialog Component
 * Confirmation dialog for employee deletion with proper accessibility
 */
export function EmployeeDeleteDialog({
  employee,
  isOpen,
  onConfirm,
  onCancel,
  isDeleting
}: EmployeeDeleteDialogProps) {
  
  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg 
                className="h-6 w-6 text-red-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            <DialogTitle className="ml-3 text-xl font-semibold text-gray-900">
              Delete Employee
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="text-gray-600" data-testid="delete-confirmation-message">
          <p className="mb-3">
            Are you sure you want to delete <strong className="text-gray-900">
              {employee.firstName} {employee.lastName}
            </strong>?
          </p>
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="text-sm space-y-1">
              <div><strong>Position:</strong> {employee.position}</div>
              <div><strong>Email:</strong> {employee.email}</div>
              <div><strong>Hours/Week:</strong> {employee.weeklyCapacity}</div>
            </div>
          </div>
          <p className="text-red-600 text-sm font-medium">
            This action cannot be undone. All employee data and associated allocations will be permanently removed.
          </p>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            data-testid="cancel-delete-button"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
            data-testid="confirm-delete-button"
          >
            {isDeleting ? (
              <>
                <svg 
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Deleting...
              </>
            ) : (
              'Delete Employee'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EmployeeDeleteDialog;
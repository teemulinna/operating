import { Button } from '@/components/ui/button';
import { Project } from '@/types/project';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  project: Project;
  isLoading?: boolean;
}

export function DeleteProjectDialog({
  isOpen,
  onClose,
  onConfirm,
  project,
  isLoading = false,
}: DeleteProjectDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      data-testid="delete-project-dialog"
      aria-labelledby="dialog-title"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <h3 id="dialog-title" className="text-lg font-medium text-gray-900">
                Delete Project
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            
            {/* Project Details */}
            <div className="bg-gray-50 rounded-md p-3">
              <div className="text-sm">
                <div className="font-medium text-gray-900 mb-1">
                  {project.name}
                </div>
                {project.description && (
                  <div className="text-gray-600 mb-2">
                    {project.description}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {project.status}
                  </span>
                  {project.clientName && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {project.clientName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Warning for active projects */}
            {project.status === 'active' && (
              <div className="mt-3 p-3 bg-yellow-100 border border-yellow-200 rounded-md">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This project is currently active and may have ongoing work and team assignments.
                  </div>
                </div>
              </div>
            )}

            {/* Warning for projects with team members */}
            {project.assignedEmployees && project.assignedEmployees > 0 && (
              <div className="mt-3 p-3 bg-orange-100 border border-orange-200 rounded-md">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-orange-800">
                    <strong>Notice:</strong> This project has {project.assignedEmployees} team member{project.assignedEmployees > 1 ? 's' : ''} assigned. 
                    Their allocations will be removed.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading}
              className="min-w-[120px]"
              aria-label="Confirm delete"
            >
              {isLoading ? 'Deleting...' : 'Delete Project'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
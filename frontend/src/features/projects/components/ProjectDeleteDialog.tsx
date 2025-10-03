import { Project } from '../hooks/useProjectOperations';

export interface ProjectDeleteDialogProps {
  project: Project;
  loading: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * ProjectDeleteDialog component for confirming project deletion
 * 
 * Features:
 * - Confirmation dialog with project name
 * - Warning message about irreversible action
 * - Loading state during deletion
 * - Accessibility support with proper ARIA labels
 * - Future extensibility for allocation checks
 */
export function ProjectDeleteDialog({ 
  project, 
  loading, 
  onConfirm, 
  onCancel 
}: ProjectDeleteDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      data-testid="delete-confirmation-dialog"
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">Delete Project</h2>
        
        <div className="mb-6">
          <p 
            className="text-gray-600 mb-4" 
            data-testid="delete-confirmation-message"
          >
            Are you sure you want to delete project{' '}
            <strong className="text-gray-900">{project.name}</strong>?
          </p>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Warning:</strong> This action cannot be undone. All project data including 
                  any associated resource allocations will be permanently deleted.
                </p>
              </div>
            </div>
          </div>
          
          {/* Future: Add allocation checks here */}
          {/* This section will be extended to show allocation warnings */}
          {project.status === 'active' && (
            <div className="mt-3 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    <strong>Active Project:</strong> This project is currently active. 
                    Consider changing the status to 'completed' or 'cancelled' before deletion.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={loading}
            data-testid="cancel-delete-button"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            disabled={loading}
            data-testid="confirm-delete-button"
          >
            {loading ? 'Deleting...' : 'Delete Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectDeleteDialog;
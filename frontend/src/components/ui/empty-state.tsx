/**
 * Empty State Component
 * Modern empty state with illustrations and actions
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { EnhancedButton } from './enhanced-button';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  illustration,
  action,
  secondaryAction,
  className
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-12 px-6',
      className
    )}>
      {/* Illustration or Icon */}
      <div className="mb-6">
        {illustration || (
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
            {icon || <DefaultEmptyIcon />}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mb-6 max-w-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-500 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <EnhancedButton
              variant={action.variant || 'default'}
              onClick={action.onClick}
            >
              {action.label}
            </EnhancedButton>
          )}
          {secondaryAction && (
            <EnhancedButton
              variant="outline"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </EnhancedButton>
          )}
        </div>
      )}
    </div>
  );
};

// Predefined empty states for common scenarios
export const NoProjectsEmptyState: React.FC<{
  onCreateProject: () => void;
  onImportProjects?: () => void;
}> = ({ onCreateProject, onImportProjects }) => (
  <EmptyState
    title="No projects yet"
    description="Get started by creating your first project or importing existing ones."
    icon={<ProjectIcon />}
    action={{
      label: "Create Project",
      onClick: onCreateProject
    }}
    secondaryAction={onImportProjects ? {
      label: "Import Projects",
      onClick: onImportProjects
    } : undefined}
  />
);

export const NoEmployeesEmptyState: React.FC<{
  onAddEmployee: () => void;
  onImportEmployees?: () => void;
}> = ({ onAddEmployee, onImportEmployees }) => (
  <EmptyState
    title="No team members found"
    description="Start building your team by adding employees to your organization."
    icon={<UsersIcon />}
    action={{
      label: "Add Employee",
      onClick: onAddEmployee
    }}
    secondaryAction={onImportEmployees ? {
      label: "Import from CSV",
      onClick: onImportEmployees
    } : undefined}
  />
);

export const NoDataEmptyState: React.FC<{
  title?: string;
  description?: string;
}> = ({ 
  title = "No data available", 
  description = "There's no data to display right now. Try refreshing the page or check back later." 
}) => (
  <EmptyState
    title={title}
    description={description}
    icon={<ChartIcon />}
  />
);

export const SearchEmptyState: React.FC<{
  query: string;
  onClearSearch?: () => void;
}> = ({ query, onClearSearch }) => (
  <EmptyState
    title={`No results for "${query}"`}
    description="Try adjusting your search terms or clearing the search to see all items."
    icon={<SearchIcon />}
    action={onClearSearch ? {
      label: "Clear Search",
      onClick: onClearSearch,
      variant: "outline"
    } : undefined}
  />
);

// Default empty icon
const DefaultEmptyIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
  </svg>
);

// Icon components
const ProjectIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
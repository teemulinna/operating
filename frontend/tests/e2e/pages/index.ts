/**
 * Page Object Models Index
 * Exports all page objects for easy importing
 */

export { BasePage } from './BasePage';
export { EmployeePage, type EmployeeData } from './EmployeePage';
export { ProjectPage, type ProjectData } from './ProjectPage';
export { AllocationPage, type AllocationData } from './AllocationPage';

// Re-export all interfaces for convenience
export type { EmployeeData as Employee };
export type { ProjectData as Project };
export type { AllocationData as Allocation };
/**
 * Page Object Model exports
 * Centralized imports for all page objects
 */

export { BasePage } from './BasePage';
export { EmployeesPage } from './EmployeesPage';
export { ReportsPage } from './ReportsPage';
export { ResourceAllocationPage } from './ResourceAllocationPage';
export { TeamDashboardPage } from './TeamDashboardPage';
export { GanttChartPage } from './GanttChartPage';

// Export types if needed
export type { Page, Locator } from '@playwright/test';
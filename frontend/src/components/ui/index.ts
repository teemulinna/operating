/**
 * Enhanced UI Component Library
 * Export all modern UI components
 */

// Core components
export { Button, buttonVariants } from './button';
export { EnhancedButton, ButtonGroup } from './enhanced-button';
export { Card, CardHeader, CardContent, CardFooter } from './card';
export { Card as EnhancedCard, CardHeader as EnhancedCardHeader, CardContent as EnhancedCardContent, CardFooter as EnhancedCardFooter, StatsCard, ActionCard } from './enhanced-card';
export { Input } from './input';
export { Label } from './label';
export { Select } from './select';
export { Textarea } from './textarea';
export { Dialog } from './dialog';
export { Badge } from './badge';
export { Toast } from './toast';

// Enhanced components
export { Skeleton, SkeletonText, SkeletonCard, SkeletonTable, SkeletonList, SkeletonButton, SkeletonForm } from './skeleton';
export { CommandPalette, useCommandPalette } from './command-palette';
export { Breadcrumb, HomeBreadcrumb, useBreadcrumb } from './breadcrumb';
export { EmptyState, NoProjectsEmptyState, NoEmployeesEmptyState, NoDataEmptyState, SearchEmptyState } from './empty-state';

// Chart components
export { 
  AreaChartComponent, 
  BarChartComponent, 
  LineChartComponent, 
  PieChartComponent,
  KPICard 
} from '../charts/chart-components';

// Dashboard components
export { default as ModernDashboard } from '../dashboard/ModernDashboard';

// Types
export type { CommandPaletteAction } from './command-palette';
export type { BreadcrumbItem } from './breadcrumb';
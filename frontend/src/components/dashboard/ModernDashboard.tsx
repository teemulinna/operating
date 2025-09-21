/**
 * Modern Dashboard Component
 * Showcases the new design system with KPI cards, charts, and modern layout
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, StatsCard, ActionCard } from '../ui/enhanced-card';
import { EnhancedButton } from '../ui/enhanced-button';
import { CommandPalette, useCommandPalette, CommandPaletteAction } from '../ui/command-palette';
import { Breadcrumb, HomeBreadcrumb } from '../ui/breadcrumb';
import { 
  AreaChartComponent, 
  BarChartComponent, 
  LineChartComponent, 
  PieChartComponent,
  KPICard 
} from '../charts/chart-components';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';

// Mock data for charts
const resourceUtilizationData = [
  { month: 'Jan', utilized: 85, available: 100, allocated: 92 },
  { month: 'Feb', utilized: 78, available: 95, allocated: 88 },
  { month: 'Mar', utilized: 92, available: 98, allocated: 95 },
  { month: 'Apr', utilized: 88, available: 102, allocated: 90 },
  { month: 'May', utilized: 95, available: 105, allocated: 98 },
  { month: 'Jun', utilized: 82, available: 100, allocated: 85 }
];

const projectStatusData = [
  { name: 'In Progress', value: 45 },
  { name: 'Completed', value: 30 },
  { name: 'Planning', value: 15 },
  { name: 'On Hold', value: 10 }
];

const skillDistributionData = [
  { skill: 'Frontend', developers: 12, projects: 8 },
  { skill: 'Backend', developers: 15, projects: 10 },
  { skill: 'DevOps', developers: 6, projects: 12 },
  { skill: 'Design', developers: 8, projects: 6 },
  { skill: 'QA', developers: 10, projects: 9 }
];

interface ModernDashboardProps {
  className?: string;
}

export const ModernDashboard: React.FC<ModernDashboardProps> = ({ className }) => {
  const [loading, setLoading] = useState(false);

  // Command palette actions
  const commandActions: CommandPaletteAction[] = [
    {
      id: 'new-project',
      title: 'Create New Project',
      subtitle: 'Start a new project with team allocation',
      icon: <PlusIcon />,
      category: 'Projects',
      action: () => console.log('Creating new project'),
      keywords: ['create', 'new', 'project']
    },
    {
      id: 'add-employee',
      title: 'Add Employee',
      subtitle: 'Add a new team member',
      icon: <UserPlusIcon />,
      category: 'Team',
      action: () => console.log('Adding employee'),
      keywords: ['add', 'employee', 'team', 'member']
    },
    {
      id: 'view-analytics',
      title: 'View Analytics',
      subtitle: 'Open detailed analytics dashboard',
      icon: <ChartBarIcon />,
      category: 'Analytics',
      action: () => console.log('Opening analytics'),
      keywords: ['analytics', 'reports', 'metrics']
    },
    {
      id: 'resource-planning',
      title: 'Resource Planning',
      subtitle: 'Plan resource allocation for projects',
      icon: <CalendarIcon />,
      category: 'Planning',
      action: () => console.log('Opening resource planning'),
      keywords: ['resource', 'planning', 'allocation']
    }
  ];

  const { CommandPaletteComponent } = useCommandPalette(commandActions);

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' }
  ];

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Command Palette */}
      <CommandPaletteComponent />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <HomeBreadcrumb items={breadcrumbItems} className="mb-4" />
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Resource Management Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor team performance, project progress, and resource utilization
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <EnhancedButton
                variant="outline"
                leftIcon={<SearchIcon />}
                onClick={() => {}} // Command palette is handled by global shortcut
              >
                Search (⌘K)
              </EnhancedButton>
              
              <EnhancedButton
                variant="default"
                leftIcon={<PlusIcon />}
                onClick={() => console.log('Quick action')}
              >
                New Project
              </EnhancedButton>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Projects"
            value={47}
            change={{ value: 12, trend: 'up', period: 'last month' }}
            icon={<ProjectIcon />}
            loading={loading}
          />
          
          <KPICard
            title="Active Team Members"
            value={156}
            change={{ value: 5, trend: 'up', period: 'last month' }}
            icon={<UsersIcon />}
            loading={loading}
          />
          
          <KPICard
            title="Resource Utilization"
            value="87%"
            change={{ value: 3, trend: 'down', period: 'last month' }}
            icon={<ChartBarIcon />}
            loading={loading}
          />
          
          <KPICard
            title="Completion Rate"
            value="94%"
            change={{ value: 8, trend: 'up', period: 'last month' }}
            icon={<CheckCircleIcon />}
            loading={loading}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Resource Utilization Chart */}
          <AreaChartComponent
            data={resourceUtilizationData}
            xKey="month"
            yKeys={['utilized', 'allocated']}
            title="Resource Utilization Trend"
            subtitle="Monthly resource utilization vs allocation"
            loading={loading}
            height={350}
          />

          {/* Project Status Distribution */}
          <PieChartComponent
            data={projectStatusData}
            title="Project Status Distribution"
            subtitle="Current status of all projects"
            loading={loading}
            height={350}
          />
        </div>

        {/* Skills and Team Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Skills Distribution */}
          <div className="lg:col-span-2">
            <BarChartComponent
              data={skillDistributionData}
              xKey="skill"
              yKeys={['developers', 'projects']}
              title="Team Skills Distribution"
              subtitle="Developers and projects by skill area"
              loading={loading}
              height={300}
            />
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            
            <ActionCard
              title="Schedule Team Meeting"
              description="Plan resource allocation for Q4 projects"
              actionLabel="Schedule now"
              icon={<CalendarIcon />}
              onAction={() => console.log('Schedule meeting')}
            />
            
            <ActionCard
              title="Review Allocations"
              description="Check current resource allocations and conflicts"
              actionLabel="Review now"
              icon={<ClipboardCheckIcon />}
              onAction={() => console.log('Review allocations')}
            />
            
            <ActionCard
              title="Generate Reports"
              description="Create monthly performance and utilization reports"
              actionLabel="Generate"
              icon={<DocumentChartBarIcon />}
              onAction={() => console.log('Generate reports')}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader 
            title="Recent Activity"
            subtitle="Latest updates and changes in your projects"
          />
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  action: 'Project "Mobile App Redesign" completed',
                  time: '2 hours ago',
                  user: 'Sarah Johnson',
                  type: 'completion'
                },
                {
                  action: 'New team member assigned to "API Development"',
                  time: '4 hours ago',
                  user: 'Mike Chen',
                  type: 'assignment'
                },
                {
                  action: 'Resource conflict detected in "Frontend Revamp"',
                  time: '6 hours ago',
                  user: 'System',
                  type: 'warning'
                },
                {
                  action: 'Weekly standup scheduled for Development Team',
                  time: '1 day ago',
                  user: 'Emily Rodriguez',
                  type: 'meeting'
                }
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                  <div className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    activity.type === 'completion' && 'bg-green-500',
                    activity.type === 'assignment' && 'bg-blue-500',
                    activity.type === 'warning' && 'bg-yellow-500',
                    activity.type === 'meeting' && 'bg-purple-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Icon components (simplified SVGs)
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const UserPlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ChartBarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ProjectIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClipboardCheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const DocumentChartBarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export default ModernDashboard;
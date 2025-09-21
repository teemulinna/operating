import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { DragDropCalendar } from '../planning/DragDropCalendar';
import { GanttChart } from '../planning/GanttChart';
import { ResourceTimeline } from '../planning/ResourceTimeline';
import { ServiceFactory, type Project } from '../../services/api';
import { addDays, format } from 'date-fns';

interface PlanningPageState {
  projects: Project[];
  employees: any[];
  startDate: string;
  endDate: string;
}

export const PlanningPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'gantt' | 'timeline'>('calendar');
  const [dateRange] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd')
  });

  // Fetch projects data
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const service = ServiceFactory.getProjectService();
      const response = await service.getAll({ status: 'active' });
      return response.data;
    },
  });

  // Fetch employees data
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const service = ServiceFactory.getEmployeeService();
      const response = await service.getAll({ status: 'active' });
      return response.data;
    },
  });

  const isLoading = projectsLoading || employeesLoading;

  const tabs = [
    { id: 'calendar' as const, label: 'Calendar' },
    { id: 'gantt' as const, label: 'Gantt Chart' },
    { id: 'timeline' as const, label: 'Timeline' },
  ];

  const renderActiveComponent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading planning data...</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'calendar':
        return (
          <DragDropCalendar
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            preventOverallocation={true}
            onAllocationCreated={(allocation) => {
              console.log('Allocation created:', allocation);
              // Handle refresh or optimistic updates
            }}
            onAllocationUpdated={(allocation) => {
              console.log('Allocation updated:', allocation);
              // Handle refresh or optimistic updates
            }}
            onConflictDetected={(conflicts) => {
              console.log('Conflicts detected:', conflicts);
              // Handle conflict display
            }}
          />
        );
      case 'gantt':
        return (
          <GanttChart
            projects={projects}
            startDate={new Date(dateRange.startDate)}
            endDate={new Date(dateRange.endDate)}
            showResourceBars={true}
            showDependencies={true}
            showCriticalPath={true}
            onTaskClick={(task) => {
              console.log('Task clicked:', task);
              // Navigate to project details
            }}
            onDateChange={(task, start, end) => {
              console.log('Task dates changed:', task, start, end);
              // Update project dates
            }}
            onProgressChange={(task, progress) => {
              console.log('Task progress changed:', task, progress);
              // Update project progress
            }}
          />
        );
      case 'timeline':
        return (
          <ResourceTimeline
            employees={employees}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            showUtilizationBars={true}
            showAvailableCapacity={true}
            showConflicts={true}
            onAllocationClick={(allocation) => {
              console.log('Allocation clicked:', allocation);
              // Show allocation details
            }}
            onAllocationUpdated={(allocation) => {
              console.log('Allocation updated:', allocation);
              // Handle refresh or optimistic updates
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="planning-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" data-testid="planning-title">
        Resource Planning
      </h1>
      
      <Card>
        <CardHeader>
          <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 ${
                  activeTab === tab.id 
                    ? 'bg-white shadow-sm' 
                    : 'hover:bg-gray-200'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {renderActiveComponent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanningPage;
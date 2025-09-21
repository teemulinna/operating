import React, { useState } from 'react';
import { DragDropCalendar } from './DragDropCalendar';
import { GanttChart } from './GanttChart';
import { ResourceTimeline } from './ResourceTimeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock data for demonstration
const mockEmployees = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    position: 'Frontend Developer',
    departmentId: 'dev',
    salary: 80000,
    hireDate: new Date('2023-01-01'),
    status: 'active' as const,
    skills: ['React', 'TypeScript'],
    defaultHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    position: 'Backend Developer',
    departmentId: 'dev',
    salary: 85000,
    hireDate: new Date('2023-01-01'),
    status: 'active' as const,
    skills: ['Node.js', 'Python'],
    defaultHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockProjects = [
  {
    id: 1,
    name: 'Project Alpha',
    clientName: 'ACME Corp',
    status: 'active' as const,
    priority: 'high' as const,
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    budget: 100000,
    estimatedHours: 1000,
    actualHours: 400,
  },
  {
    id: 2,
    name: 'Project Beta',
    clientName: 'Tech Solutions',
    status: 'planning' as const,
    priority: 'medium' as const,
    startDate: '2024-02-01',
    endDate: '2024-08-31',
    budget: 75000,
    estimatedHours: 800,
    actualHours: 100,
  },
];

export const PlanningDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('calendar');
  const startDate = '2024-01-01';
  const endDate = '2024-03-31';

  const handleAllocationCreated = (allocation: any) => {
    console.log('Allocation created:', allocation);
  };

  const handleAllocationUpdated = (allocation: any) => {
    console.log('Allocation updated:', allocation);
  };

  const handleConflictDetected = (conflicts: any[]) => {
    console.log('Conflicts detected:', conflicts);
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Resource Planning Dashboard</CardTitle>
          <p className="text-gray-600">
            Drag-and-drop visual resource planning with real-time conflict detection
          </p>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calendar">Drag & Drop Calendar</TabsTrigger>
              <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
              <TabsTrigger value="timeline">Resource Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-6">
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <strong>Features:</strong> Drag employees from sidebar to calendar slots, 
                  visual capacity indicators, conflict detection, and over-allocation warnings.
                </div>
                <DragDropCalendar
                  startDate={startDate}
                  endDate={endDate}
                  onAllocationCreated={handleAllocationCreated}
                  onAllocationUpdated={handleAllocationUpdated}
                  onConflictDetected={handleConflictDetected}
                  preventOverallocation={true}
                />
              </div>
            </TabsContent>

            <TabsContent value="gantt" className="mt-6">
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <strong>Features:</strong> Project timelines with dependencies, 
                  resource allocation bars, zoom controls, and progress indicators.
                </div>
                <GanttChart
                  projects={mockProjects}
                  showResourceBars={true}
                  showDependencies={true}
                  showOverallocationWarnings={true}
                  onTaskClick={(task) => console.log('Task clicked:', task)}
                  onDateChange={(task, start, end) => console.log('Date changed:', task, start, end)}
                  onExport={(format) => console.log('Export:', format)}
                />
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="mt-6">
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <strong>Features:</strong> Horizontal timeline per employee, 
                  project blocks with allocation percentages, and drag to adjust duration.
                </div>
                <ResourceTimeline
                  employees={mockEmployees}
                  startDate={startDate}
                  endDate={endDate}
                  showUtilizationBars={true}
                  showAvailableCapacity={true}
                  showConflicts={true}
                  onAllocationClick={(allocation) => console.log('Allocation clicked:', allocation)}
                  onAllocationUpdated={handleAllocationUpdated}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
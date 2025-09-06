import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ResourceAllocationMatrix } from './ResourceAllocationMatrix';
import { TeamCapacityOverview } from './TeamCapacityOverview';
import { ProjectResourcePlanner } from './ProjectResourcePlanner';
import { ConflictDetectionPanel } from './ConflictDetectionPanel';
import { ManagementReporting } from './ManagementReporting';
import { ResourceOptimizationEngine } from './ResourceOptimizationEngine';
import { SmartResourceCard } from './SmartResourceCard';
import { CommandPalette } from './CommandPalette';
import { ResourceKanbanBoard } from './ResourceKanbanBoard';
import { ResourceHeatmapCalendar } from './ResourceHeatmapCalendar';
import { CollaborationLayer } from './CollaborationLayer';
import { NotificationSystem } from './NotificationSystem';
import { LoadingSkeletons } from '../ui/LoadingSkeletons';
import { useResourceData } from '../../hooks/useResourceData';
import { useResourceAllocationUpdates } from '../../hooks/useWebSocket';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { ChartBarIcon, UsersIcon, CalendarIcon, ExclamationTriangleIcon, DocumentChartBarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface ResourceAllocationDashboardProps {
  className?: string;
}

export const ResourceAllocationDashboard: React.FC<ResourceAllocationDashboardProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentUserId] = useState('current-user-123'); // In real app, get from auth context
  
  const {
    employees,
    departments,
    capacityData,
    projects,
    conflicts,
    isLoading,
    error,
    refreshData
  } = useResourceData(refreshKey);

  const { isConnected } = useWebSocket();

  // Handle real-time resource allocation updates
  useResourceAllocationUpdates((data) => {
    console.log('Resource allocation updated:', data);
    handleRefresh(); // Refresh data when allocation is updated
    
    // Add notification
    const notification = {
      id: `allocation-${data.employeeId}-${Date.now()}`,
      type: 'resource_allocation',
      title: 'Resource Allocation Updated',
      message: `${data.employeeName}'s utilization updated to ${Math.round(data.utilizationRate * 100)}%`,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 'medium',
      actions: [
        {
          label: 'View Details',
          action: 'view',
          data: { employeeId: data.employeeId }
        }
      ]
    };
    setNotifications(prev => [notification, ...prev]);
  });

  // Listen for user presence updates
  useEffect(() => {
    const handleUserPresence = (event: CustomEvent) => {
      const { type, user } = event.detail;
      
      if (type === 'user_joined') {
        setActiveUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
      } else if (type === 'user_left') {
        setActiveUsers(prev => prev.filter(u => u.id !== user.id));
      } else if (type === 'presence_update') {
        setActiveUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...user } : u));
      }
    };

    window.addEventListener('user-presence-changed', handleUserPresence);
    return () => window.removeEventListener('user-presence-changed', handleUserPresence);
  }, []);

  // Listen for real-time notifications
  useEffect(() => {
    const handleRealtimeNotification = (event: CustomEvent) => {
      const notification = event.detail;
      setNotifications(prev => [notification, ...prev]);
    };

    window.addEventListener('realtime-notification', handleRealtimeNotification);
    return () => window.removeEventListener('realtime-notification', handleRealtimeNotification);
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refreshData();
  };

  // Handle cursor movement for collaboration
  const handleCursorMove = (x: number, y: number) => {
    // Cursor positions are handled by the CollaborationLayer itself
    console.log(`Cursor moved to: ${x}, ${y}`);
  };

  // Handle selection changes for collaboration
  const handleSelectionChange = (elementId: string | null, action: string) => {
    console.log(`Selection ${action}: ${elementId}`);
  };

  // Handle notification actions
  const handleNotificationAction = (action: string, data: any, notificationId: string) => {
    console.log(`Notification action: ${action}`, data);
    
    if (action === 'view' && data.employeeId) {
      // Navigate to employee details or perform action
      // For now, just mark as read
      handleMarkAsRead(notificationId);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  // Clear all notifications
  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const totalEmployees = employees?.length || 0;
  const activeProjects = projects?.filter(p => p.status === 'active').length || 0;
  const criticalConflicts = conflicts?.filter(c => c.severity === 'critical').length || 0;
  
  const avgUtilization = capacityData && capacityData.length > 0 
    ? capacityData.reduce((sum, c) => sum + c.utilizationRate, 0) / capacityData.length 
    : 0;

  // Command palette handlers
  const handleEmployeeSelect = (employee: any) => {
    console.log('Selected employee:', employee);
    // Navigate to employee details or perform action
  };

  const handleProjectSelect = (project: any) => {
    console.log('Selected project:', project);
    // Navigate to project details or perform action
  };

  const handleActionSelect = (action: string) => {
    console.log('Selected action:', action);
    // Perform the selected action
    switch (action) {
      case 'create-assignment':
        // Open assignment dialog
        break;
      case 'view-analytics':
        setActiveTab('reporting');
        break;
      case 'export-data':
        // Trigger data export
        break;
      case 'schedule-meeting':
        // Open scheduling interface
        break;
    }
  };

  // Resource card handlers
  const handleSchedule = (employee: any) => {
    console.log('Schedule employee:', employee);
    // Open scheduling interface
  };

  const handleAssign = (employee: any) => {
    console.log('Assign employee:', employee);
    // Open assignment interface
  };

  const handleAnalytics = (employee: any) => {
    console.log('View analytics for employee:', employee);
    // Open analytics view
  };

  const handleAllocationUpdate = async (employeeId: string, newUtilization: number) => {
    console.log('Updating allocation for employee:', employeeId, 'to:', newUtilization);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/capacity/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          utilizationRate: newUtilization,
          date: new Date().toISOString()
        })
      });

      if (response.ok) {
        handleRefresh(); // Refresh data to show changes
      } else {
        console.error('Failed to update allocation:', response.status);
      }
    } catch (error) {
      console.error('Error updating allocation:', error);
    }
  };

  if (error) {
    return (
      <Alert className="m-4">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription>
          Error loading resource data: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <LoadingSkeletons.Dashboard includeResourceCards={true} />;
  }

  return (
    <div className={`resource-allocation-dashboard relative ${className}`}>
      {/* Real-time Collaboration and Notifications */}
      <CollaborationLayer
        currentUserId={currentUserId}
        activeUsers={activeUsers}
        onCursorMove={handleCursorMove}
        onSelectionChange={handleSelectionChange}
      />
      
      <NotificationSystem
        notifications={notifications}
        onNotificationAction={handleNotificationAction}
        onMarkAsRead={handleMarkAsRead}
        onClearAll={handleClearAllNotifications}
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Resource Allocation Dashboard</h1>
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-500">
                {isConnected ? 'Real-time connected' : 'Offline'}
              </span>
            </div>
          </div>
          <p className="text-gray-600 mt-1">Comprehensive resource management and project assignment platform</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setIsCommandPaletteOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            Search
            <kbd className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded border">
              ⌘K
            </kbd>
          </Button>
          <Button onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <ResourceOptimizationEngine 
            employees={employees || []}
            projects={projects || []}
            capacityData={capacityData || []}
            onOptimizationComplete={handleRefresh}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Resources</p>
                <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900">{activeProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(avgUtilization * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Critical Conflicts</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">{criticalConflicts}</p>
                  {criticalConflicts > 0 && (
                    <Badge variant="destructive">Alert</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="reporting">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TeamCapacityOverview 
              employees={employees || []}
              departments={departments || []}
              capacityData={capacityData || []}
              compact={true}
            />
            <ConflictDetectionPanel 
              conflicts={conflicts || []}
              projects={projects || []}
              employees={employees || []}
              compact={true}
            />
          </div>
          
          {/* Smart Resource Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Team Resources</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsCommandPaletteOpen(true)}
              >
                Search Resources
              </Button>
            </div>
            
            {employees && employees.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {employees.slice(0, 6).map((employee) => (
                  <div 
                    key={employee.id}
                    data-resource-id={`resource-card-${employee.id}`}
                  >
                    <SmartResourceCard
                      employee={employee}
                      capacityData={capacityData || []}
                      onSchedule={handleSchedule}
                      onAssign={handleAssign}
                      onAnalytics={handleAnalytics}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <LoadingSkeletons.ResourceCard count={6} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" />
            )}
            
            {employees && employees.length > 6 && (
              <div className="text-center">
                <Button 
                  variant="outline"
                  onClick={() => setIsCommandPaletteOpen(true)}
                >
                  View All {totalEmployees} Resources
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="allocation">
          <ResourceAllocationMatrix
            employees={employees || []}
            projects={projects || []}
            allocations={capacityData || []}
            onAllocationChange={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="capacity">
          <TeamCapacityOverview 
            employees={employees || []}
            departments={departments || []}
            capacityData={capacityData || []}
          />
        </TabsContent>

        <TabsContent value="planning">
          <ProjectResourcePlanner
            projects={projects || []}
            employees={employees || []}
            capacityData={capacityData || []}
            onPlanningChange={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="conflicts">
          <ConflictDetectionPanel 
            conflicts={conflicts || []}
            projects={projects || []}
            employees={employees || []}
          />
        </TabsContent>

        <TabsContent value="kanban">
          <ResourceKanbanBoard
            employees={employees}
            capacityData={capacityData || []}
            onAllocationUpdate={handleAllocationUpdate}
          />
        </TabsContent>

        <TabsContent value="heatmap">
          <ResourceHeatmapCalendar
            employees={employees}
            capacityData={capacityData || []}
          />
        </TabsContent>

        <TabsContent value="reporting">
          <ManagementReporting
            employees={employees || []}
            projects={projects || []}
            capacityData={capacityData || []}
            departments={departments || []}
          />
        </TabsContent>
      </Tabs>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onOpen={() => setIsCommandPaletteOpen(true)}
        onClose={() => setIsCommandPaletteOpen(false)}
        employees={employees || []}
        projects={projects || []}
        onEmployeeSelect={handleEmployeeSelect}
        onProjectSelect={handleProjectSelect}
        onActionSelect={handleActionSelect}
      />
    </div>
  );
};
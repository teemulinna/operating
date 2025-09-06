import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ExclamationTriangleIcon, ClockIcon, UserIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface Conflict {
  id: string;
  type: 'overallocation' | 'skill_mismatch' | 'time_overlap' | 'resource_unavailable';
  severity: 'low' | 'medium' | 'high' | 'critical';
  employeeId: string;
  projectIds: string[];
  description: string;
  suggestedResolution: string;
  detectedAt: string;
  resolvedAt?: string;
  status: 'active' | 'resolved' | 'ignored';
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  startDate: string;
  endDate: string;
  requiredSkills: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: number;
  position: string;
  skills: string[];
}

interface ConflictDetectionPanelProps {
  conflicts: Conflict[];
  projects: Project[];
  employees: Employee[];
  compact?: boolean;
}

export const ConflictDetectionPanel: React.FC<ConflictDetectionPanelProps> = ({
  conflicts,
  projects,
  employees,
  compact = false
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const conflictStats = useMemo(() => {
    const active = conflicts.filter(c => c.status === 'active');
    const critical = active.filter(c => c.severity === 'critical');
    const high = active.filter(c => c.severity === 'high');
    const byType = active.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: active.length,
      critical: critical.length,
      high: high.length,
      byType
    };
  }, [conflicts]);

  const filteredConflicts = useMemo(() => {
    return conflicts.filter(conflict => {
      if (selectedSeverity !== 'all' && conflict.severity !== selectedSeverity) return false;
      if (selectedType !== 'all' && conflict.type !== selectedType) return false;
      if (conflict.status !== 'active') return false;
      return true;
    });
  }, [conflicts, selectedSeverity, selectedType]);

  const getEmployee = (employeeId: string) => {
    return employees.find(emp => emp.id.toString() === employeeId);
  };

  const getProject = (projectId: string) => {
    return projects.find(proj => proj.id === projectId);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'overallocation':
        return <ClockIcon className="h-4 w-4" />;
      case 'skill_mismatch':
        return <UserIcon className="h-4 w-4" />;
      case 'time_overlap':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'resource_unavailable':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4" />;
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: 'resolve' | 'ignore') => {
    try {
      const response = await fetch(`/api/conflicts/${conflictId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: resolution === 'resolve' ? 'resolved' : 'ignored',
          resolvedAt: new Date().toISOString()
        }),
      });

      if (response.ok) {
        // Refresh conflicts data
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const openConflictDetail = (conflict: Conflict) => {
    setSelectedConflict(conflict);
    setIsDetailDialogOpen(true);
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            Resource Conflicts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conflictStats.total === 0 ? (
            <div className="text-center py-4">
              <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-green-600">No active conflicts detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{conflictStats.critical}</p>
                  <p className="text-xs text-gray-600">Critical</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{conflictStats.high}</p>
                  <p className="text-xs text-gray-600">High Priority</p>
                </div>
              </div>
              
              {filteredConflicts.slice(0, 3).map(conflict => {
                const employee = getEmployee(conflict.employeeId);
                return (
                  <div key={conflict.id} className="flex justify-between items-center p-2 border rounded">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(conflict.type)}
                      <span className="text-sm">{employee?.firstName} {employee?.lastName}</span>
                    </div>
                    <Badge className={getSeverityColor(conflict.severity)}>
                      {conflict.severity}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Conflict Detection & Resolution</h2>
          <p className="text-gray-600 mt-1">Monitor and resolve resource allocation conflicts</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="overallocation">Over-allocation</SelectItem>
              <SelectItem value="skill_mismatch">Skill Mismatch</SelectItem>
              <SelectItem value="time_overlap">Time Overlap</SelectItem>
              <SelectItem value="resource_unavailable">Resource Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{conflictStats.critical}</div>
            <div className="text-sm text-gray-600">Critical Conflicts</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{conflictStats.high}</div>
            <div className="text-sm text-gray-600">High Priority</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{conflictStats.total}</div>
            <div className="text-sm text-gray-600">Total Active</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{conflictStats.byType.overallocation || 0}</div>
            <div className="text-sm text-gray-600">Over-allocations</div>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts List */}
      {filteredConflicts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">No Conflicts Found</h3>
            <p className="text-gray-600">All resource allocations are optimized with no detected conflicts.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active Conflicts ({filteredConflicts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredConflicts.map(conflict => {
                const employee = getEmployee(conflict.employeeId);
                const affectedProjects = conflict.projectIds.map(id => getProject(id)).filter(Boolean);
                
                return (
                  <div key={conflict.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(conflict.type)}
                            <Badge className={getSeverityColor(conflict.severity)}>
                              {conflict.severity}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(conflict.detectedAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                        </div>
                        
                        <div className="mb-2">
                          <h4 className="font-medium">
                            {employee?.firstName} {employee?.lastName} - {employee?.position}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{conflict.description}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-2">
                          {affectedProjects.map(project => (
                            <Badge key={project!.id} variant="outline" className="text-xs">
                              {project!.name}
                            </Badge>
                          ))}
                        </div>
                        
                        <Alert className="mt-2 bg-blue-50 border-blue-200">
                          <AlertDescription className="text-sm">
                            <strong>Suggested Resolution:</strong> {conflict.suggestedResolution}
                          </AlertDescription>
                        </Alert>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openConflictDetail(conflict)}
                        >
                          Details
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleResolveConflict(conflict.id, 'ignore')}
                        >
                          Ignore
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleResolveConflict(conflict.id, 'resolve')}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflict Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Conflict Details</DialogTitle>
          </DialogHeader>
          
          {selectedConflict && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getTypeIcon(selectedConflict.type)}
                    <span className="capitalize">{selectedConflict.type.replace('_', ' ')}</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Severity</label>
                  <div className="mt-1">
                    <Badge className={getSeverityColor(selectedConflict.severity)}>
                      {selectedConflict.severity}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Employee</label>
                <div className="mt-1">
                  {(() => {
                    const emp = getEmployee(selectedConflict.employeeId);
                    return emp ? `${emp.firstName} ${emp.lastName} - ${emp.position}` : 'Unknown Employee';
                  })()}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Affected Projects</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedConflict.projectIds.map(projectId => {
                    const project = getProject(projectId);
                    return project ? (
                      <Badge key={projectId} variant="outline">
                        {project.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="mt-1 text-sm">{selectedConflict.description}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Suggested Resolution</label>
                <Alert className="mt-2 bg-blue-50 border-blue-200">
                  <AlertDescription>
                    {selectedConflict.suggestedResolution}
                  </AlertDescription>
                </Alert>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => handleResolveConflict(selectedConflict.id, 'ignore')}
                >
                  Ignore Conflict
                </Button>
                <Button 
                  onClick={() => handleResolveConflict(selectedConflict.id, 'resolve')}
                >
                  Mark as Resolved
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
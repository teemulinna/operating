// Pipeline Board Component with Drag & Drop Kanban Interface
import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, Filter, Plus, Sync, AlertTriangle, DollarSign, Calendar, Users } from 'lucide-react';
import {
  PipelineProject,
  PipelineStage,
  PipelinePriority,
  PipelineFilters,
  PIPELINE_STAGE_COLORS,
  PIPELINE_PRIORITY_COLORS,
  SYNC_STATUS_COLORS,
  formatCurrency,
  formatPercentage,
  calculateWeightedValue,
  getDaysUntilStart,
  getProjectRiskScore
} from '@/types/pipeline';
import { PipelineService } from '@/services/pipelineService';
import { PipelineProjectDialog } from './PipelineProjectDialog';
import { PipelineProjectCard } from './PipelineProjectCard';
import { PipelineFiltersDialog } from './PipelineFiltersDialog';

interface PipelineBoardProps {
  onProjectSelect?: (project: PipelineProject) => void;
  refreshTrigger?: number;
}

const PIPELINE_STAGES: PipelineStage[] = [
  'lead', 'prospect', 'opportunity', 'proposal', 'negotiation', 'won', 'lost', 'on-hold'
];

const STAGE_LABELS = {
  lead: 'Leads',
  prospect: 'Prospects', 
  opportunity: 'Opportunities',
  proposal: 'Proposals',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
  'on-hold': 'On Hold'
};

export const PipelineBoard: React.FC<PipelineBoardProps> = ({ 
  onProjectSelect, 
  refreshTrigger 
}) => {
  const [projects, setProjects] = useState<PipelineProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<PipelineProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<PipelineFilters>({});
  const [selectedProject, setSelectedProject] = useState<PipelineProject | null>(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showFiltersDialog, setShowFiltersDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<PipelineProject | null>(null);
  const [syncingProjects, setSyncingProjects] = useState<Set<string>>(new Set());

  // Load projects
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await PipelineService.getPipelineProjects(filters);
      setProjects(result.projects);
    } catch (err) {
      setError('Failed to load pipeline projects');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Effect to load projects on mount and filter changes
  useEffect(() => {
    loadProjects();
  }, [loadProjects, refreshTrigger]);

  // Filter projects based on search term
  useEffect(() => {
    let filtered = projects;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = projects.filter(project =>
        project.name.toLowerCase().includes(term) ||
        project.clientName.toLowerCase().includes(term) ||
        project.description?.toLowerCase().includes(term) ||
        project.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm]);

  // Group projects by stage
  const projectsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = filteredProjects.filter(project => project.stage === stage);
    return acc;
  }, {} as Record<PipelineStage, PipelineProject[]>);

  // Calculate stage totals
  const stageTotals = PIPELINE_STAGES.reduce((acc, stage) => {
    const stageProjects = projectsByStage[stage];
    acc[stage] = {
      count: stageProjects.length,
      value: stageProjects.reduce((sum, p) => sum + p.estimatedValue, 0),
      weightedValue: stageProjects.reduce((sum, p) => sum + calculateWeightedValue(p), 0)
    };
    return acc;
  }, {} as Record<PipelineStage, { count: number; value: number; weightedValue: number }>);

  // Handle drag and drop
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination || destination.droppableId === source.droppableId) {
      return;
    }

    const newStage = destination.droppableId as PipelineStage;
    const projectId = draggableId;

    // Optimistically update UI
    const updatedProjects = projects.map(project => {
      if (project.id === projectId) {
        return { ...project, stage: newStage };
      }
      return project;
    });
    setProjects(updatedProjects);

    try {
      await PipelineService.updatePipelineProject(projectId, { stage: newStage });
      toast({
        title: 'Success',
        description: `Project moved to ${STAGE_LABELS[newStage]}`
      });
    } catch (err) {
      // Revert optimistic update
      setProjects(projects);
      toast({
        title: 'Error',
        description: 'Failed to update project stage',
        variant: 'destructive'
      });
      console.error('Error updating project stage:', err);
    }
  }, [projects]);

  // Handle project creation/editing
  const handleProjectSave = useCallback(async () => {
    await loadProjects();
    setShowProjectDialog(false);
    setEditingProject(null);
  }, [loadProjects]);

  // Handle project selection
  const handleProjectClick = useCallback((project: PipelineProject) => {
    setSelectedProject(project);
    if (onProjectSelect) {
      onProjectSelect(project);
    }
  }, [onProjectSelect]);

  // Handle project edit
  const handleProjectEdit = useCallback((project: PipelineProject) => {
    setEditingProject(project);
    setShowProjectDialog(true);
  }, []);

  // Handle project sync
  const handleProjectSync = useCallback(async (projectId: string, crmSystemId: string) => {
    setSyncingProjects(prev => new Set([...prev, projectId]));
    
    try {
      const result = await PipelineService.syncProjectToCRM(projectId, crmSystemId);
      if (result.success) {
        toast({
          title: 'Sync Successful',
          description: 'Project synced to CRM successfully'
        });
        await loadProjects();
      } else {
        toast({
          title: 'Sync Failed',
          description: result.error || 'Failed to sync project',
          variant: 'destructive'
        });
      }
    } catch (err) {
      toast({
        title: 'Sync Error',
        description: 'Failed to sync project to CRM',
        variant: 'destructive'
      });
    } finally {
      setSyncingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  }, [loadProjects]);

  // Handle bulk sync
  const handleBulkSync = useCallback(async () => {
    // Implementation for bulk sync operations
    toast({
      title: 'Bulk Sync',
      description: 'Bulk sync feature coming soon'
    });
  }, []);

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading pipeline...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            Manage opportunities and track deals through your sales process
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setShowFiltersDialog(true)}>
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkSync}>
            <Sync className="w-4 h-4 mr-2" />
            Sync All
          </Button>
          <Button onClick={() => setShowProjectDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Search and Summary */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-6 text-sm">
          <div className="text-center">
            <div className="font-semibold text-lg">
              {formatCurrency(
                Object.values(stageTotals).reduce((sum, stage) => sum + stage.weightedValue, 0)
              )}
            </div>
            <div className="text-muted-foreground">Weighted Value</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">
              {filteredProjects.length}
            </div>
            <div className="text-muted-foreground">Projects</div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Pipeline Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageProjects = projectsByStage[stage];
            const totals = stageTotals[stage];

            return (
              <div key={stage} className="flex-shrink-0 w-80">
                <div className="bg-gray-50 rounded-lg">
                  {/* Stage Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {STAGE_LABELS[stage]}
                      </h3>
                      <Badge 
                        variant="secondary" 
                        className={PIPELINE_STAGE_COLORS[stage]}
                      >
                        {totals.count}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Total Value:</span>
                        <span className="font-medium">
                          {formatCurrency(totals.value)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weighted:</span>
                        <span className="font-medium">
                          {formatCurrency(totals.weightedValue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-4 space-y-3 min-h-[400px] ${
                          snapshot.isDraggingOver ? 'bg-blue-50' : ''
                        }`}
                      >
                        {stageProjects.map((project, index) => (
                          <Draggable
                            key={project.id}
                            draggableId={project.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`${
                                  snapshot.isDragging ? 'rotate-5 shadow-lg' : ''
                                }`}
                              >
                                <PipelineProjectCard
                                  project={project}
                                  onClick={() => handleProjectClick(project)}
                                  onEdit={() => handleProjectEdit(project)}
                                  onSync={(crmSystemId) => handleProjectSync(project.id, crmSystemId)}
                                  isSyncing={syncingProjects.has(project.id)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {/* Empty State */}
                        {stageProjects.length === 0 && (
                          <div className="text-center py-8 text-gray-500 text-sm">
                            No projects in this stage
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Project Dialog */}
      <PipelineProjectDialog
        open={showProjectDialog}
        onClose={() => {
          setShowProjectDialog(false);
          setEditingProject(null);
        }}
        onSave={handleProjectSave}
        project={editingProject}
      />

      {/* Filters Dialog */}
      <PipelineFiltersDialog
        open={showFiltersDialog}
        onClose={() => setShowFiltersDialog(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Project Details Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedProject?.name}</span>
              <div className="flex items-center space-x-2">
                <Badge className={PIPELINE_STAGE_COLORS[selectedProject?.stage || 'lead']}>
                  {selectedProject?.stage}
                </Badge>
                <Badge className={PIPELINE_PRIORITY_COLORS[selectedProject?.priority || 'medium']}>
                  {selectedProject?.priority}
                </Badge>
                <Badge className={SYNC_STATUS_COLORS[selectedProject?.syncStatus || 'pending']}>
                  {selectedProject?.syncStatus}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedProject && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="text-sm text-muted-foreground">Estimated Value</div>
                        <div className="font-semibold">
                          {formatCurrency(selectedProject.estimatedValue)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
                        %
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Probability</div>
                        <div className="font-semibold">
                          {formatPercentage(selectedProject.probability)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-orange-600" />
                      <div>
                        <div className="text-sm text-muted-foreground">Days to Start</div>
                        <div className="font-semibold">
                          {getDaysUntilStart(selectedProject.estimatedStartDate)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="text-sm text-muted-foreground">Resource Demand</div>
                        <div className="font-semibold">
                          {selectedProject.resourceDemand?.length || 0} roles
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Description */}
              {selectedProject.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-gray-700">{selectedProject.description}</p>
                </div>
              )}

              {/* Client Information */}
              <div>
                <h4 className="font-semibold mb-2">Client Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium">{selectedProject.clientName}</div>
                  {selectedProject.clientContact && (
                    <div className="text-sm text-gray-600 mt-1">
                      <div>{selectedProject.clientContact.name}</div>
                      <div>{selectedProject.clientContact.email}</div>
                      {selectedProject.clientContact.phone && (
                        <div>{selectedProject.clientContact.phone}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Required Skills */}
              {selectedProject.requiredSkills?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.requiredSkills.map((skill, index) => (
                      <Badge key={index} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              {selectedProject.riskFactors?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Risk Factors</h4>
                  <div className="space-y-2">
                    {selectedProject.riskFactors.map((risk, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-red-800">{risk.category}</span>
                          <Badge variant="destructive" className="capitalize">
                            {risk.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-red-700">{risk.description}</p>
                        {risk.mitigationStrategy && (
                          <p className="text-xs text-red-600 mt-1">
                            <strong>Mitigation:</strong> {risk.mitigationStrategy}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedProject.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="text-sm">{selectedProject.notes}</p>
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedProject.tags?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PipelineBoard;
import React, { useState } from 'react';
import { 
  Users, Clock, Star, Tag, DollarSign, CheckCircle, 
  AlertCircle, MapPin, Calendar, Copy, Download,
  Edit, Trash2, X, ExternalLink
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { 
  AllocationTemplate, 
  allocationTemplatesService,
  TemplateRole,
  TemplateMilestone 
} from '../../services/allocation-templates.service';

interface TemplateDetailsModalProps {
  template: AllocationTemplate;
  onClose: () => void;
  onApply: (template: AllocationTemplate) => void;
  onEdit?: (template: AllocationTemplate) => void;
  onDelete?: (template: AllocationTemplate) => void;
  canEdit?: boolean;
}

export const TemplateDetailsModal: React.FC<TemplateDetailsModalProps> = ({
  template,
  onClose,
  onApply,
  onEdit,
  onDelete,
  canEdit = false
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  const categoryInfo = {
    icon: allocationTemplatesService.getCategoryIcon(template.category),
    label: allocationTemplatesService.getCategoryDisplayName(template.category)
  };

  const costEstimate = allocationTemplatesService.calculateTemplateCost(template);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const handleClone = async () => {
    try {
      setLoading(true);
      const clonedTemplate = await allocationTemplatesService.cloneTemplate(
        template.id, 
        `${template.name} (Copy)`
      );
      // Handle success (maybe show toast or redirect to edit)
      console.log('Template cloned:', clonedTemplate);
    } catch (error) {
      console.error('Error cloning template:', error);
    } finally {
      setLoading(false);
    }
  };

  const RoleCard: React.FC<{ role: TemplateRole }> = ({ role }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {role.role_name}
              {role.is_critical && (
                <Badge variant="destructive" className="text-xs">
                  Critical
                </Badge>
              )}
              {role.can_be_remote && (
                <Badge variant="secondary" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  Remote OK
                </Badge>
              )}
            </CardTitle>
            {role.description && (
              <p className="text-gray-600 mt-2">{role.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {role.planned_allocation_percentage}%
            </div>
            <div className="text-xs text-gray-600">Allocation</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Role Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-600">Experience Level</div>
            <div className="capitalize">
              {allocationTemplatesService.getExperienceLevelDisplayName(role.minimum_experience_level)}
            </div>
          </div>
          
          {role.estimated_hours_per_week && (
            <div>
              <div className="font-medium text-gray-600">Hours/Week</div>
              <div>{role.estimated_hours_per_week}</div>
            </div>
          )}
          
          {role.duration_weeks && (
            <div>
              <div className="font-medium text-gray-600">Duration</div>
              <div>{role.duration_weeks} weeks</div>
            </div>
          )}
          
          <div>
            <div className="font-medium text-gray-600">Max Assignments</div>
            <div>{role.max_assignments}</div>
          </div>
        </div>

        {/* Hourly Rate Range */}
        {role.hourly_rate_range && (
          <div>
            <div className="font-medium text-gray-600 mb-2">Rate Range</div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span>
                {allocationTemplatesService.formatCurrency(role.hourly_rate_range[0])} - {' '}
                {allocationTemplatesService.formatCurrency(role.hourly_rate_range[1])} /hour
              </span>
            </div>
          </div>
        )}

        {/* Required Skills */}
        {role.skills_details && role.skills_details.length > 0 && (
          <div>
            <div className="font-medium text-gray-600 mb-2">Required Skills</div>
            <div className="flex flex-wrap gap-1">
              {role.skills_details.map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Preferred Skills */}
        {role.preferred_skills_details && role.preferred_skills_details.length > 0 && (
          <div>
            <div className="font-medium text-gray-600 mb-2">Preferred Skills</div>
            <div className="flex flex-wrap gap-1">
              {role.preferred_skills_details.map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const MilestoneCard: React.FC<{ milestone: TemplateMilestone }> = ({ milestone }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {milestone.name}
              {milestone.is_critical && (
                <Badge variant="destructive" className="text-xs">
                  Critical
                </Badge>
              )}
            </CardTitle>
            {milestone.description && (
              <p className="text-gray-600 mt-2">{milestone.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-purple-600">
              Week {milestone.week_offset}
            </div>
            <div className="text-xs text-gray-600">
              {milestone.duration_weeks} week{milestone.duration_weeks !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Deliverables */}
        {milestone.deliverables && milestone.deliverables.length > 0 && (
          <div>
            <div className="font-medium text-gray-600 mb-2">Deliverables</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {milestone.deliverables.map((deliverable, index) => (
                <li key={index} className="text-gray-700">{deliverable}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Dependencies */}
        {milestone.depends_on && milestone.depends_on.length > 0 && (
          <div>
            <div className="font-medium text-gray-600 mb-2">Dependencies</div>
            <div className="text-sm text-gray-700">
              Depends on {milestone.depends_on.length} other milestone{milestone.depends_on.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl flex items-center gap-3">
                {template.name}
                <Badge className={`bg-blue-100 text-blue-800`}>
                  {categoryInfo.icon} {categoryInfo.label}
                </Badge>
              </DialogTitle>
              <DialogDescription className="mt-2 text-base">
                {template.description}
              </DialogDescription>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {canEdit && (
                <>
                  <Button variant="outline" size="sm" onClick={() => onEdit?.(template)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onDelete?.(template)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              <Button variant="outline" size="sm" onClick={handleClone} disabled={loading}>
                <Copy className="h-4 w-4 mr-2" />
                Clone
              </Button>
              
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t">
            <div className="flex items-center gap-1">
              {renderStars(template.usage_stats.average_rating)}
              <span className="ml-2 text-sm">
                ({template.usage_stats.total_uses} uses)
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{template.total_roles} roles</span>
            </div>
            
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{template.default_duration_weeks || 'N/A'} weeks</span>
            </div>
            
            {costEstimate && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                <span>
                  {allocationTemplatesService.formatCurrency(costEstimate.min)} - {' '}
                  {allocationTemplatesService.formatCurrency(costEstimate.max)}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Badge variant="outline">{template.visibility}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="roles">Roles ({template.total_roles})</TabsTrigger>
              <TabsTrigger value="milestones">Milestones ({template.total_milestones})</TabsTrigger>
              <TabsTrigger value="usage">Usage & Stats</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto">
              <TabsContent value="overview" className="space-y-6 p-1">
                {/* Template Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle>Template Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="font-medium text-gray-600">Created by</div>
                        <div>{template.creator_name}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-600">Created</div>
                        <div>{new Date(template.created_at).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-600">Version</div>
                        <div>{template.version}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-600">Usage Count</div>
                        <div>{template.usage_count}</div>
                      </div>
                    </div>

                    {/* Tags */}
                    {template.tags && template.tags.length > 0 && (
                      <div>
                        <div className="font-medium text-gray-600 mb-2">Tags</div>
                        <div className="flex flex-wrap gap-2">
                          {template.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Budget Range */}
                    {template.default_budget_range && (
                      <div>
                        <div className="font-medium text-gray-600 mb-2">Default Budget Range</div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span>
                            {allocationTemplatesService.formatCurrency(template.default_budget_range[0])} - {' '}
                            {allocationTemplatesService.formatCurrency(template.default_budget_range[1])}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Resource Allocation Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Resource Allocation Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {template.roles.slice(0, 3).map((role, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{role.role_name}</div>
                            <div className="text-sm text-gray-600">
                              {role.duration_weeks} weeks • {role.estimated_hours_per_week}h/week
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Progress 
                              value={role.planned_allocation_percentage} 
                              className="w-24"
                            />
                            <div className="text-sm font-medium w-10">
                              {role.planned_allocation_percentage}%
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {template.roles.length > 3 && (
                        <div className="text-sm text-gray-600 text-center pt-2">
                          +{template.roles.length - 3} more roles
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="roles" className="space-y-4 p-1">
                <div className="text-sm text-gray-600 mb-4">
                  {template.total_roles} roles defined in this template
                </div>
                {template.roles.map((role) => (
                  <RoleCard key={role.id} role={role} />
                ))}
              </TabsContent>

              <TabsContent value="milestones" className="space-y-4 p-1">
                {template.milestones && template.milestones.length > 0 ? (
                  <>
                    <div className="text-sm text-gray-600 mb-4">
                      {template.total_milestones} milestones defined in this template
                    </div>
                    {template.milestones
                      .sort((a, b) => a.week_offset - b.week_offset)
                      .map((milestone) => (
                        <MilestoneCard key={milestone.id} milestone={milestone} />
                      ))}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No milestones defined for this template
                  </div>
                )}
              </TabsContent>

              <TabsContent value="usage" className="space-y-6 p-1">
                {/* Usage Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {template.usage_stats.total_uses}
                        </div>
                        <div className="text-sm text-gray-600">Total Uses</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {template.usage_stats.average_rating.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600">Avg Rating</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {template.usage_stats.positive_ratings}
                        </div>
                        <div className="text-sm text-gray-600">4+ Stars</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {template.usage_count}
                        </div>
                        <div className="text-sm text-gray-600">All Time</div>
                      </div>
                    </div>

                    {template.usage_stats.last_used && (
                      <div>
                        <div className="font-medium text-gray-600">Last Used</div>
                        <div>{new Date(template.usage_stats.last_used).toLocaleDateString()}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Rating Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rating Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[5, 4, 3, 2, 1].map((stars) => (
                        <div key={stars} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-16">
                            {renderStars(stars)}
                          </div>
                          <Progress 
                            value={stars <= template.usage_stats.average_rating ? 80 : 20} 
                            className="flex-1"
                          />
                          <div className="text-sm text-gray-600 w-12">
                            {stars === 5 ? template.usage_stats.positive_ratings : Math.max(0, Math.floor(Math.random() * 5))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onApply(template)} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Apply to Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
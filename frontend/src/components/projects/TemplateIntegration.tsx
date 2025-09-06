import React, { useState } from 'react';
import { Template, Wand2, Settings, Calendar, DollarSign, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Slider } from '../ui/slider';
import { Alert, AlertDescription } from '../ui/alert';
import { TemplateSelectorModal } from '../allocation-templates/TemplateSelectorModal';
import { 
  AllocationTemplate, 
  ApplyTemplateRequest,
  allocationTemplatesService 
} from '../../services/allocation-templates.service';

interface TemplateIntegrationProps {
  projectData: {
    id?: number;
    name: string;
    description?: string;
    startDate: string;
    budget?: number;
  };
  onTemplateApplied: (result: any) => void;
  disabled?: boolean;
}

export const TemplateIntegration: React.FC<TemplateIntegrationProps> = ({
  projectData,
  onTemplateApplied,
  disabled = false
}) => {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AllocationTemplate | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [applying, setApplying] = useState(false);
  
  // Customization options
  const [scaleDuration, setScaleDuration] = useState([1]);
  const [skipRoles, setSkipRoles] = useState<string[]>([]);
  const [budgetOverride, setBudgetOverride] = useState('');

  const handleTemplateSelect = (template: AllocationTemplate) => {
    setSelectedTemplate(template);
    setShowCustomization(true);
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !projectData.id) return;

    try {
      setApplying(true);
      
      const applicationRequest: ApplyTemplateRequest = {
        project_id: projectData.id,
        start_date: projectData.startDate,
        scale_duration: scaleDuration[0] !== 1 ? scaleDuration[0] : undefined,
        budget_override: budgetOverride ? parseFloat(budgetOverride) : undefined,
        skip_roles: skipRoles.length > 0 ? skipRoles : undefined,
        customizations: {
          // Could add role modifications here if needed
        }
      };

      const result = await allocationTemplatesService.applyTemplateToProject(
        selectedTemplate.id,
        applicationRequest
      );

      onTemplateApplied(result);
      setSelectedTemplate(null);
      setShowCustomization(false);
      
    } catch (error) {
      console.error('Error applying template:', error);
      // Handle error (show toast, etc.)
    } finally {
      setApplying(false);
    }
  };

  const handleRoleSkipToggle = (roleName: string, skip: boolean) => {
    setSkipRoles(prev => 
      skip 
        ? [...prev, roleName]
        : prev.filter(name => name !== roleName)
    );
  };

  const resetCustomizations = () => {
    setScaleDuration([1]);
    setSkipRoles([]);
    setBudgetOverride('');
    setShowCustomization(false);
    setSelectedTemplate(null);
  };

  const calculateEstimatedCost = () => {
    if (!selectedTemplate) return null;
    
    const baseCost = allocationTemplatesService.calculateTemplateCost(selectedTemplate);
    if (!baseCost) return null;
    
    const scaleFactor = scaleDuration[0];
    const budgetOverrideValue = budgetOverride ? parseFloat(budgetOverride) : null;
    
    if (budgetOverrideValue) {
      return { min: budgetOverrideValue, max: budgetOverrideValue };
    }
    
    // Filter out skipped roles (simplified estimation)
    const activeRoles = selectedTemplate.roles.filter(role => !skipRoles.includes(role.role_name));
    const roleFactor = activeRoles.length / selectedTemplate.roles.length;
    
    return {
      min: baseCost.min * scaleFactor * roleFactor,
      max: baseCost.max * scaleFactor * roleFactor
    };
  };

  const estimatedCost = calculateEstimatedCost();

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Template className="h-5 w-5" />
            Project Template
          </CardTitle>
          <CardDescription>
            Use a pre-built template to quickly set up resource allocation patterns
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!selectedTemplate ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <Template className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <div className="text-gray-600 mb-4">
                No template selected. Start with a template to speed up project setup.
              </div>
              <Button 
                onClick={() => setShowTemplateSelector(true)}
                disabled={disabled}
                className="gap-2"
              >
                <Wand2 className="h-4 w-4" />
                Browse Templates
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Template Info */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{selectedTemplate.name}</h4>
                      <Badge className="bg-blue-100 text-blue-800">
                        {allocationTemplatesService.getCategoryDisplayName(selectedTemplate.category)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {selectedTemplate.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{selectedTemplate.total_roles} roles</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{selectedTemplate.default_duration_weeks || 'N/A'} weeks</span>
                      </div>
                      {estimatedCost && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>
                            {allocationTemplatesService.formatCurrency(estimatedCost.min)} - {' '}
                            {allocationTemplatesService.formatCurrency(estimatedCost.max)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomization(!showCustomization)}
                      className="gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Customize
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetCustomizations}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              </div>

              {/* Customization Options */}
              {showCustomization && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Template Customization</CardTitle>
                    <CardDescription>
                      Adjust the template to match your project requirements
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Duration Scaling */}
                    <div className="space-y-3">
                      <Label>Duration Scaling</Label>
                      <div className="space-y-2">
                        <Slider
                          value={scaleDuration}
                          onValueChange={setScaleDuration}
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>50% shorter</span>
                          <span className="font-medium">
                            {scaleDuration[0]}x ({Math.round((selectedTemplate.default_duration_weeks || 0) * scaleDuration[0])} weeks)
                          </span>
                          <span>2x longer</span>
                        </div>
                      </div>
                    </div>

                    {/* Budget Override */}
                    <div className="space-y-2">
                      <Label htmlFor="budget-override">Budget Override</Label>
                      <Input
                        id="budget-override"
                        type="number"
                        placeholder="Enter custom budget (optional)"
                        value={budgetOverride}
                        onChange={(e) => setBudgetOverride(e.target.value)}
                      />
                      <p className="text-xs text-gray-600">
                        Override the template's default budget calculation
                      </p>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-3">
                      <Label>Roles to Include</Label>
                      <div className="space-y-2">
                        {selectedTemplate.roles.map((role) => (
                          <div key={role.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`role-${role.id}`}
                              checked={!skipRoles.includes(role.role_name)}
                              onCheckedChange={(checked) => 
                                handleRoleSkipToggle(role.role_name, !checked)
                              }
                            />
                            <Label 
                              htmlFor={`role-${role.id}`}
                              className="flex-1 flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{role.role_name}</span>
                                {role.is_critical && (
                                  <Badge variant="destructive" className="text-xs">
                                    Critical
                                  </Badge>
                                )}
                              </div>
                              <div className="text-gray-600">
                                {role.planned_allocation_percentage}% • {role.duration_weeks} weeks
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                      {skipRoles.length > 0 && (
                        <Alert>
                          <AlertDescription>
                            {skipRoles.length} role{skipRoles.length !== 1 ? 's' : ''} will be skipped: {skipRoles.join(', ')}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {/* Cost Estimation */}
                    {estimatedCost && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-sm mb-2">Estimated Cost</h4>
                        <div className="text-2xl font-bold text-green-600">
                          {allocationTemplatesService.formatCurrency(estimatedCost.min)} - {' '}
                          {allocationTemplatesService.formatCurrency(estimatedCost.max)}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Based on role hourly rates and time allocation
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Apply Button */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetCustomizations}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleApplyTemplate}
                  disabled={!projectData.id || applying}
                  loading={applying}
                  className="gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  Apply Template
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Selector Modal */}
      <TemplateSelectorModal
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelect}
        projectData={projectData}
      />
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Search, Filter, Star, Users, Clock, Tag, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { 
  AllocationTemplate, 
  allocationTemplatesService,
  TemplateFilters 
} from '../../services/allocation-templates.service';

interface TemplateSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: AllocationTemplate) => void;
  projectData?: {
    name?: string;
    description?: string;
    startDate?: string;
    budget?: number;
  };
}

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'web_development', label: 'Web Development', icon: '🌐' },
  { value: 'mobile_app', label: 'Mobile App', icon: '📱' },
  { value: 'data_analytics', label: 'Data Analytics', icon: '📊' },
  { value: 'devops', label: 'DevOps', icon: '⚙️' },
  { value: 'consulting', label: 'Consulting', icon: '💼' },
  { value: 'research', label: 'Research', icon: '🔬' },
  { value: 'design', label: 'Design', icon: '🎨' },
  { value: 'marketing', label: 'Marketing', icon: '📢' },
  { value: 'custom', label: 'Custom', icon: '🔧' },
];

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  open,
  onClose,
  onSelect,
  projectData
}) => {
  const [templates, setTemplates] = useState<AllocationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSelectedTemplate(null);
    }
  }, [open, searchTerm, categoryFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const filters: TemplateFilters = {
        search: searchTerm || undefined,
        category: categoryFilter || undefined,
        visibility: 'public', // Only show public and organization templates for selection
        page: 1,
        limit: 20
      };

      const result = await allocationTemplatesService.getTemplates(filters);
      setTemplates(result.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      onSelect(template);
      onClose();
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getRecommendedTemplates = () => {
    if (!projectData) return templates;

    // Simple recommendation logic based on project data
    const projectDescription = (projectData.description || '').toLowerCase();
    const projectName = (projectData.name || '').toLowerCase();
    
    const keywordMap: Record<string, string[]> = {
      'web_development': ['web', 'website', 'frontend', 'backend', 'api', 'react', 'vue', 'angular'],
      'mobile_app': ['mobile', 'app', 'ios', 'android', 'react native', 'flutter'],
      'data_analytics': ['data', 'analytics', 'dashboard', 'visualization', 'ml', 'ai'],
      'devops': ['devops', 'deployment', 'infrastructure', 'docker', 'kubernetes', 'ci/cd'],
      'consulting': ['consulting', 'advisory', 'strategy', 'analysis'],
      'research': ['research', 'study', 'analysis', 'investigation'],
      'design': ['design', 'ui', 'ux', 'branding', 'graphics'],
      'marketing': ['marketing', 'campaign', 'advertising', 'social media']
    };

    const projectText = `${projectName} ${projectDescription}`;
    
    return [...templates].sort((a, b) => {
      const aKeywords = keywordMap[a.category] || [];
      const bKeywords = keywordMap[b.category] || [];
      
      const aScore = aKeywords.reduce((score, keyword) => 
        projectText.includes(keyword) ? score + 1 : score, 0
      ) + (a.usage_count * 0.01); // Slight weight for popularity
      
      const bScore = bKeywords.reduce((score, keyword) => 
        projectText.includes(keyword) ? score + 1 : score, 0
      ) + (b.usage_count * 0.01);
      
      return bScore - aScore;
    });
  };

  const recommendedTemplates = getRecommendedTemplates();
  const hasRecommendations = recommendedTemplates.length > 0 && projectData;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Template for Project</DialogTitle>
          <DialogDescription>
            Choose a template to apply resource allocation patterns to your project.
            {hasRecommendations && ' Templates are ordered by relevance to your project.'}
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 py-4 border-b">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.icon && `${category.icon} `}{category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <div className="text-gray-400 text-lg mb-2">No templates found</div>
                <div className="text-gray-600">
                  Try adjusting your search terms or filters
                </div>
              </div>
            </div>
          ) : (
            <RadioGroup value={selectedTemplate || ''} onValueChange={setSelectedTemplate}>
              <div className="space-y-3 p-4">
                {hasRecommendations && recommendedTemplates.slice(0, 3).some((_, index) => 
                  recommendedTemplates[index] !== templates[index]
                ) && (
                  <div className="mb-6">
                    <div className="text-sm font-medium text-blue-600 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Recommended for your project
                    </div>
                    <div className="space-y-3">
                      {recommendedTemplates.slice(0, 2).map((template) => (
                        <TemplateCard 
                          key={`rec-${template.id}`} 
                          template={template} 
                          isRecommended 
                        />
                      ))}
                    </div>
                    <div className="border-b my-6"></div>
                    <div className="text-sm font-medium text-gray-600 mb-3">
                      All Templates
                    </div>
                  </div>
                )}
                
                {templates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {templates.length} template{templates.length !== 1 ? 's' : ''} available
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSelectTemplate} 
              disabled={!selectedTemplate}
            >
              Use This Template
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  function TemplateCard({ template, isRecommended = false }: { 
    template: AllocationTemplate; 
    isRecommended?: boolean 
  }) {
    const categoryInfo = CATEGORIES.find(cat => cat.value === template.category);
    const costEstimate = allocationTemplatesService.calculateTemplateCost(template);
    
    return (
      <div className="flex items-start space-x-3">
        <RadioGroupItem value={template.id} id={template.id} className="mt-4" />
        <Card 
          className={`flex-1 cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''
          } ${isRecommended ? 'border-blue-200 bg-blue-50' : ''}`}
          onClick={() => setSelectedTemplate(template.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-base">
                    {template.name}
                  </CardTitle>
                  {isRecommended && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                      Recommended
                    </Badge>
                  )}
                  <Badge className="bg-gray-100 text-gray-800">
                    {categoryInfo?.icon} {categoryInfo?.label || template.category}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {template.description}
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {/* Template Stats */}
            <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{template.total_roles} roles</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{template.default_duration_weeks || 'N/A'} weeks</span>
                </div>
                {costEstimate && (
                  <div className="flex items-center gap-1">
                    <span className="text-green-600 font-medium">
                      {allocationTemplatesService.formatCurrency(costEstimate.min)} - {' '}
                      {allocationTemplatesService.formatCurrency(costEstimate.max)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {renderStars(template.usage_stats?.average_rating || 0)}
                <span className="ml-1 text-xs">
                  ({template.usage_stats?.total_uses || 0})
                </span>
              </div>
            </div>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 4).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{template.tags.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* Creator and Usage */}
            <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t">
              <span>by {template.creator_name}</span>
              <span>{template.usage_count} uses</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
};
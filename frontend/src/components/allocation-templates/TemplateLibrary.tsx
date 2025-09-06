import React, { useState, useEffect } from 'react';
import { Search, Filter, Grid, List, Star, Users, Clock, Tag, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { allocationTemplatesService } from '../../services/allocation-templates.service';
import { TemplateDetailsModal } from './TemplateDetailsModal';
import { CreateTemplateModal } from './CreateTemplateModal';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  visibility: string;
  creator_name: string;
  total_roles: number;
  total_milestones: number;
  usage_count: number;
  default_duration_weeks: number;
  created_at: string;
  usage_stats: {
    average_rating: number;
    total_uses: number;
  };
}

interface TemplateFilters {
  category: string;
  visibility: string;
  search: string;
  tags: string[];
}

const CATEGORIES = [
  { value: 'web_development', label: 'Web Development', icon: '🌐', color: 'bg-blue-100 text-blue-800' },
  { value: 'mobile_app', label: 'Mobile App', icon: '📱', color: 'bg-green-100 text-green-800' },
  { value: 'data_analytics', label: 'Data Analytics', icon: '📊', color: 'bg-purple-100 text-purple-800' },
  { value: 'devops', label: 'DevOps', icon: '⚙️', color: 'bg-orange-100 text-orange-800' },
  { value: 'consulting', label: 'Consulting', icon: '💼', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'research', label: 'Research', icon: '🔬', color: 'bg-pink-100 text-pink-800' },
  { value: 'design', label: 'Design', icon: '🎨', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'marketing', label: 'Marketing', icon: '📢', color: 'bg-red-100 text-red-800' },
  { value: 'custom', label: 'Custom', icon: '🔧', color: 'bg-gray-100 text-gray-800' },
];

const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'All Templates' },
  { value: 'public', label: 'Public' },
  { value: 'organization', label: 'Organization' },
  { value: 'private', label: 'My Templates' }
];

export const TemplateLibrary: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<TemplateFilters>({
    category: '',
    visibility: 'all',
    search: '',
    tags: []
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchTemplates();
  }, [filters, currentPage]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: currentPage,
        limit: 12
      };
      
      const response = await allocationTemplatesService.getTemplates(params);
      setTemplates(response.templates);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.total);
    } catch (err) {
      setError('Failed to load templates');
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof TemplateFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearchChange = (value: string) => {
    handleFilterChange('search', value);
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(cat => cat.value === category) || CATEGORIES[CATEGORIES.length - 1];
  };

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

  const TemplateCard: React.FC<{ template: Template }> = ({ template }) => {
    const categoryInfo = getCategoryInfo(template.category);
    
    return (
      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
            onClick={() => setSelectedTemplate(template)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                {template.name}
              </CardTitle>
              <CardDescription className="mt-2 line-clamp-2">
                {template.description}
              </CardDescription>
            </div>
            <Badge className={`ml-2 ${categoryInfo.color}`}>
              {categoryInfo.icon} {categoryInfo.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pb-3">
          {/* Template Stats */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{template.total_roles} roles</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{template.default_duration_weeks || 'N/A'} weeks</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {renderStars(template.usage_stats?.average_rating || 0)}
              <span className="ml-1">({template.usage_stats?.total_uses || 0})</span>
            </div>
          </div>

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {template.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{template.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-3 border-t">
          <div className="flex items-center justify-between w-full text-sm">
            <div className="text-gray-600">
              By {template.creator_name}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{template.visibility}</Badge>
              <Badge variant="outline">{template.usage_count} uses</Badge>
            </div>
          </div>
        </CardFooter>
      </Card>
    );
  };

  const TemplateListItem: React.FC<{ template: Template }> = ({ template }) => {
    const categoryInfo = getCategoryInfo(template.category);
    
    return (
      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => setSelectedTemplate(template)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg hover:text-blue-600">
                      {template.name}
                    </h3>
                    <Badge className={`${categoryInfo.color}`}>
                      {categoryInfo.icon} {categoryInfo.label}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                  
                  {/* Tags */}
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-600">
                    Created by {template.creator_name} • {template.usage_count} uses
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-2">
                    {renderStars(template.usage_stats?.average_rating || 0)}
                    <span className="ml-1 text-sm">
                      ({template.usage_stats?.total_uses || 0})
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{template.total_roles} roles</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{template.default_duration_weeks || 'N/A'} weeks</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge variant="outline">{template.visibility}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-2">Error loading templates</div>
          <div className="text-gray-600">{error}</div>
          <Button onClick={fetchTemplates} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Library</h1>
          <p className="text-gray-600 mt-1">
            Reusable allocation patterns for common project types
          </p>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <CreateTemplateModal onClose={() => {
            setShowCreateModal(false);
            fetchTemplates();
          }} />
        </Dialog>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Category Filter */}
          <Select
            value={filters.category}
            onValueChange={(value) => handleFilterChange('category', value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {CATEGORIES.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.icon} {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Visibility Filter */}
          <Select
            value={filters.visibility}
            onValueChange={(value) => handleFilterChange('visibility', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Templates" />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITY_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Results Count */}
          <div className="text-sm text-gray-600 ml-auto">
            {totalItems} templates found
          </div>
        </div>
      </div>

      {/* Templates Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No templates found</div>
          <div className="text-gray-600">
            Try adjusting your filters or create a new template
          </div>
        </div>
      ) : (
        <div>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <TemplateListItem key={template.id} template={template} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, currentPage - 2) + i;
              if (pageNum > totalPages) return null;
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Template Details Modal */}
      {selectedTemplate && (
        <TemplateDetailsModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onApply={() => {
            setSelectedTemplate(null);
            // Handle template application
          }}
        />
      )}
    </div>
  );
};
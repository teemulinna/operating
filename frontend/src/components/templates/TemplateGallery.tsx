import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select } from '../ui/select';
import { TemplateCard } from './TemplateCard';
import { TemplateCustomizer } from './TemplateCustomizer';
import { ProjectTemplate, TemplateSearchFilters, TemplateCategory } from '../../types/template';

interface TemplateGalleryProps {
  onApplyTemplate?: (templateId: string, options: any) => void;
  onCreateFromTemplate?: (template: ProjectTemplate) => void;
  showUserTemplates?: boolean;
  className?: string;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  onApplyTemplate,
  onCreateFromTemplate,
  showUserTemplates = false,
  className = ''
}) => {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [popularTemplates, setPopularTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedComplexity, setSelectedComplexity] = useState<string>('');
  const [selectedMethodology, setSelectedMethodology] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [showBuiltInOnly, setShowBuiltInOnly] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    loadTemplates();
    loadCategories();
    loadPopularTemplates();
  }, [showUserTemplates]);

  useEffect(() => {
    loadTemplates();
  }, [searchTerm, selectedCategory, selectedComplexity, selectedMethodology, minRating, showBuiltInOnly, currentPage]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      const filters: TemplateSearchFilters = {};
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedComplexity) filters.complexity = selectedComplexity;
      if (selectedMethodology) filters.methodology = selectedMethodology;
      if (minRating > 0) filters.minRating = minRating;
      if (showBuiltInOnly) filters.isPublic = true;
      
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
      
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      queryParams.append('limit', ITEMS_PER_PAGE.toString());
      queryParams.append('offset', ((currentPage - 1) * ITEMS_PER_PAGE).toString());

      const endpoint = showUserTemplates 
        ? '/api/templates/user/templates'
        : showBuiltInOnly 
        ? '/api/templates/built-in'
        : '/api/templates/search';

      const response = await fetch(`${endpoint}?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setTemplates(data.data);
        if (data.pagination) {
          setTotalPages(Math.ceil(data.pagination.total / ITEMS_PER_PAGE));
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/templates/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadPopularTemplates = async () => {
    try {
      const response = await fetch('/api/templates/popular');
      const data = await response.json();
      if (data.success) {
        setPopularTemplates(data.data);
      }
    } catch (error) {
      console.error('Error loading popular templates:', error);
    }
  };

  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(search) ||
        template.description.toLowerCase().includes(search) ||
        template.category.toLowerCase().includes(search) ||
        template.metadata?.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }

    return filtered;
  }, [templates, searchTerm]);

  const handleApplyTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setShowCustomizer(true);
  };

  const handleCustomizeComplete = (options: any) => {
    if (selectedTemplate && onApplyTemplate) {
      onApplyTemplate(selectedTemplate.templateId, options);
    }
    setShowCustomizer(false);
    setSelectedTemplate(null);
  };

  const handleDuplicateTemplate = async (template: ProjectTemplate) => {
    try {
      const response = await fetch(`/api/templates/${template.templateId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${template.name} (Copy)`
        })
      });

      if (response.ok) {
        loadTemplates(); // Refresh the list
      }
    } catch (error) {
      console.error('Error duplicating template:', error);
    }
  };

  const handleRateTemplate = async (templateId: string, rating: number) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating })
      });

      if (response.ok) {
        loadTemplates(); // Refresh to show updated rating
      }
    } catch (error) {
      console.error('Error rating template:', error);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedComplexity('');
    setSelectedMethodology('');
    setMinRating(0);
    setShowBuiltInOnly(false);
    setCurrentPage(1);
  };

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {showUserTemplates ? 'My Templates' : 'Project Templates'}
          </h2>
          <p className="text-gray-600 mt-1">
            Choose from pre-built templates to kickstart your projects
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
      </div>

      {/* Popular Templates Section */}
      {!showUserTemplates && popularTemplates.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Templates</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {popularTemplates.slice(0, 5).map((template) => (
              <div key={template.templateId} className="flex-shrink-0 w-80">
                <TemplateCard
                  template={template}
                  onApply={() => handleApplyTemplate(template)}
                  onDuplicate={() => handleDuplicateTemplate(template)}
                  onRate={(rating) => handleRateTemplate(template.templateId, rating)}
                  size="small"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search templates by name, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Select
                value={selectedCategory}
                onChange={(value) => setSelectedCategory(value)}
                placeholder="All Categories"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.category} value={category.category}>
                    {category.category} ({category.count})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Select
                value={selectedComplexity}
                onChange={(value) => setSelectedComplexity(value)}
                placeholder="Any Complexity"
              >
                <option value="">Any Complexity</option>
                <option value="simple">Simple</option>
                <option value="moderate">Moderate</option>
                <option value="complex">Complex</option>
                <option value="enterprise">Enterprise</option>
              </Select>
            </div>

            <div>
              <Select
                value={selectedMethodology}
                onChange={(value) => setSelectedMethodology(value)}
                placeholder="Any Methodology"
              >
                <option value="">Any Methodology</option>
                <option value="agile">Agile</option>
                <option value="waterfall">Waterfall</option>
                <option value="hybrid">Hybrid</option>
                <option value="lean">Lean</option>
              </Select>
            </div>

            <div>
              <Select
                value={minRating.toString()}
                onChange={(value) => setMinRating(parseFloat(value))}
                placeholder="Any Rating"
              >
                <option value="0">Any Rating</option>
                <option value="3">3+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showBuiltInOnly}
                  onChange={(e) => setShowBuiltInOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Built-in only</span>
              </label>
            </div>
          </div>

          {/* Active filters and clear button */}
          {(searchTerm || selectedCategory || selectedComplexity || selectedMethodology || minRating > 0 || showBuiltInOnly) && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500">Active filters:</span>
                {searchTerm && (
                  <Badge variant="secondary">Search: {searchTerm}</Badge>
                )}
                {selectedCategory && (
                  <Badge variant="secondary">Category: {selectedCategory}</Badge>
                )}
                {selectedComplexity && (
                  <Badge variant="secondary">Complexity: {selectedComplexity}</Badge>
                )}
                {selectedMethodology && (
                  <Badge variant="secondary">Method: {selectedMethodology}</Badge>
                )}
                {minRating > 0 && (
                  <Badge variant="secondary">{minRating}+ Stars</Badge>
                )}
                {showBuiltInOnly && (
                  <Badge variant="secondary">Built-in</Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Templates Grid/List */}
      {filteredTemplates.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search criteria or create a custom template
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </Card>
      ) : (
        <>
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.templateId}
                template={template}
                onApply={() => handleApplyTemplate(template)}
                onDuplicate={() => handleDuplicateTemplate(template)}
                onRate={(rating) => handleRateTemplate(template.templateId, rating)}
                onCreateFromTemplate={() => onCreateFromTemplate?.(template)}
                layout={viewMode}
                showActions={!showUserTemplates}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                  if (page > totalPages) return null;
                  
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Template Customizer Modal */}
      {showCustomizer && selectedTemplate && (
        <TemplateCustomizer
          template={selectedTemplate}
          onApply={handleCustomizeComplete}
          onCancel={() => {
            setShowCustomizer(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
};
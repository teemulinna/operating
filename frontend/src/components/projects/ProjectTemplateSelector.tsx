import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Badge } from '../ui/badge';
import { TemplateGallery } from '../templates/TemplateGallery';
import { ProjectTemplate, ApplyTemplateOptions } from '../../types/template';

interface ProjectTemplateSelectorProps {
  onTemplateApplied?: (project: any) => void;
  onClose?: () => void;
  className?: string;
}

export const ProjectTemplateSelector: React.FC<ProjectTemplateSelectorProps> = ({
  onTemplateApplied,
  onClose,
  className = ''
}) => {
  const [showGallery, setShowGallery] = useState(false);
  const [quickStartMode, setQuickStartMode] = useState(true);
  const [popularTemplates, setPopularTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPopularTemplates();
  }, []);

  const loadPopularTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates/popular?limit=6');
      const data = await response.json();
      
      if (data.success) {
        setPopularTemplates(data.data);
      }
    } catch (error) {
      console.error('Error loading popular templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = async (template: ProjectTemplate) => {
    const options: ApplyTemplateOptions = {
      templateId: template.templateId,
      projectName: `${template.name} Project`,
      startDate: new Date(),
      customizations: {
        // Include all tasks and milestones by default for quick start
        includeTasks: template.defaultTasks.map(task => task.id),
        includeMilestones: template.defaultMilestones.map(milestone => milestone.id)
      }
    };

    try {
      const response = await fetch('/api/templates/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options)
      });

      const data = await response.json();
      
      if (data.success && onTemplateApplied) {
        onTemplateApplied(data.data);
      }
    } catch (error) {
      console.error('Error applying template:', error);
    }
  };

  const handleCustomizeTemplate = (templateId: string, options: ApplyTemplateOptions) => {
    // This will be called from the TemplateCustomizer
    handleApplyTemplate(options);
  };

  const handleApplyTemplate = async (options: ApplyTemplateOptions) => {
    try {
      const response = await fetch('/api/templates/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options)
      });

      const data = await response.json();
      
      if (data.success && onTemplateApplied) {
        onTemplateApplied(data.data);
      }
    } catch (error) {
      console.error('Error applying template:', error);
    }
  };

  if (showGallery) {
    return (
      <div className={`${className}`}>
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setShowGallery(false)}
          >
            ← Back to Quick Start
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
        <TemplateGallery
          onApplyTemplate={handleCustomizeTemplate}
          className="max-h-screen overflow-auto"
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Start Your Project
        </h2>
        <p className="text-gray-600">
          Choose from our templates to get started quickly, or browse all templates for more options
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={() => setShowGallery(true)}
          className="flex-1 sm:flex-initial"
        >
          Browse All Templates
        </Button>
        <Button
          variant="outline"
          onClick={() => onTemplateApplied?.(null)}
          className="flex-1 sm:flex-initial"
        >
          Start from Scratch
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>

      {/* Quick Start Templates */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Start Templates
        </h3>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="mt-4 h-8 bg-gray-200 rounded"></div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularTemplates.map((template) => (
              <Card key={template.templateId} className="p-4 hover:shadow-lg transition-shadow">
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{template.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {template.metadata?.complexity || 'Moderate'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                </div>

                <div className="space-y-2 mb-4 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{template.defaultDuration || 30} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tasks:</span>
                    <span>{template.defaultTasks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Team Size:</span>
                    <span>{template.defaultTeamSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usage:</span>
                    <span>{template.usageCount} times</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleQuickStart(template)}
                    className="flex-1"
                  >
                    Quick Start
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // This would open the customizer - for now just do quick start
                      handleQuickStart(template);
                    }}
                  >
                    Customize
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!loading && popularTemplates.length === 0 && (
          <Card className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates available</h3>
            <p className="text-gray-600 mb-4">
              There are no templates to display at the moment.
            </p>
            <Button
              variant="outline"
              onClick={() => onTemplateApplied?.(null)}
            >
              Start from Scratch
            </Button>
          </Card>
        )}
      </div>

      {/* Benefits Section */}
      <div className="mt-8 pt-6 border-t">
        <h3 className="text-md font-medium text-gray-900 mb-3">
          Why use templates?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Faster Setup</div>
              <div>Get started in minutes instead of hours</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Best Practices</div>
              <div>Built-in industry standards and workflows</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Proven Success</div>
              <div>Templates based on successful project outcomes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ProjectTemplate } from '../../types/template';

interface TemplateCardProps {
  template: ProjectTemplate;
  onApply?: () => void;
  onDuplicate?: () => void;
  onRate?: (rating: number) => void;
  onCreateFromTemplate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  layout?: 'grid' | 'list';
  size?: 'small' | 'medium' | 'large';
  showActions?: boolean;
  showRating?: boolean;
  className?: string;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onApply,
  onDuplicate,
  onRate,
  onCreateFromTemplate,
  onEdit,
  onDelete,
  layout = 'grid',
  size = 'medium',
  showActions = true,
  showRating = true,
  className = ''
}) => {
  const [showRatingInput, setShowRatingInput] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRatingSubmit = () => {
    if (selectedRating > 0 && onRate) {
      onRate(selectedRating);
      setShowRatingInput(false);
      setSelectedRating(0);
    }
  };

  const formatDuration = (days: number) => {
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.round(days / 7)} weeks`;
    return `${Math.round(days / 30)} months`;
  };

  const formatBudget = (budget?: number) => {
    if (!budget) return 'Budget varies';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(budget);
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'complex': return 'bg-orange-100 text-orange-800';
      case 'enterprise': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (rating: number, interactive = false, onStarClick?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onStarClick?.(star)}
            disabled={!interactive}
            className={`text-sm ${interactive ? 'hover:text-yellow-400 cursor-pointer' : ''} ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  const cardContent = (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className={`font-semibold text-gray-900 ${
            size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
          }`}>
            {template.name}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{template.category}</p>
        </div>
        
        <div className="flex items-center gap-1">
          {template.isBuiltIn && (
            <Badge variant="secondary" className="text-xs">Built-in</Badge>
          )}
          {template.isPublic && (
            <Badge variant="outline" className="text-xs">Public</Badge>
          )}
        </div>
      </div>

      {/* Description */}
      <p className={`text-gray-600 mb-4 ${
        size === 'small' ? 'text-xs' : 'text-sm'
      } ${!isExpanded && layout === 'grid' ? 'line-clamp-2' : ''}`}>
        {template.description}
      </p>

      {/* Metadata */}
      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap gap-2">
          {template.metadata?.complexity && (
            <Badge className={`text-xs ${getComplexityColor(template.metadata.complexity)}`}>
              {template.metadata.complexity}
            </Badge>
          )}
          {template.metadata?.methodology && (
            <Badge variant="outline" className="text-xs">
              {template.metadata.methodology}
            </Badge>
          )}
          {template.metadata?.industry && (
            <Badge variant="secondary" className="text-xs">
              {template.metadata.industry}
            </Badge>
          )}
        </div>

        {template.metadata?.tags && template.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.metadata.tags.slice(0, isExpanded ? undefined : 3).map((tag, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
              >
                {tag}
              </span>
            ))}
            {!isExpanded && template.metadata.tags.length > 3 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                +{template.metadata.tags.length - 3} more
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className={`grid grid-cols-2 gap-4 mb-4 text-sm ${
        layout === 'list' ? 'md:grid-cols-4' : ''
      }`}>
        <div>
          <div className="text-gray-500 text-xs">Duration</div>
          <div className="font-medium">
            {formatDuration(template.getEstimatedProjectDuration())}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Budget</div>
          <div className="font-medium">
            {formatBudget(template.defaultBudget)}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Tasks</div>
          <div className="font-medium">{template.defaultTasks.length}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Team Size</div>
          <div className="font-medium">{template.defaultTeamSize}</div>
        </div>
      </div>

      {/* Usage and Rating */}
      {showRating && (
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="flex items-center gap-2">
            {renderStars(template.averageRating)}
            <span className="text-gray-500">
              {template.averageRating.toFixed(1)} ({template.usageCount} uses)
            </span>
          </div>
          {!showRatingInput && onRate && (
            <button
              onClick={() => setShowRatingInput(true)}
              className="text-blue-600 hover:text-blue-800 text-xs"
            >
              Rate
            </button>
          )}
        </div>
      )}

      {/* Rating Input */}
      {showRatingInput && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-700 mb-2">Rate this template:</div>
          <div className="flex items-center gap-2">
            {renderStars(selectedRating, true, setSelectedRating)}
            <Button
              size="sm"
              onClick={handleRatingSubmit}
              disabled={selectedRating === 0}
              className="ml-2"
            >
              Submit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowRatingInput(false);
                setSelectedRating(0);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className={`flex gap-2 ${
          layout === 'list' ? 'flex-row' : 'flex-col'
        }`}>
          {onApply && (
            <Button
              onClick={onApply}
              className={`flex-1 ${size === 'small' ? 'text-xs py-1' : ''}`}
            >
              Use Template
            </Button>
          )}
          
          <div className="flex gap-2">
            {onCreateFromTemplate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateFromTemplate}
                className={size === 'small' ? 'text-xs py-1 px-2' : ''}
              >
                Create
              </Button>
            )}
            {onDuplicate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDuplicate}
                className={size === 'small' ? 'text-xs py-1 px-2' : ''}
              >
                Copy
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className={size === 'small' ? 'text-xs py-1 px-2' : ''}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className={`text-red-600 hover:text-red-800 ${
                  size === 'small' ? 'text-xs py-1 px-2' : ''
                }`}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Created By */}
      {template.createdBy && (
        <div className="mt-4 pt-3 border-t text-xs text-gray-500">
          Created by {template.createdBy.name} • {new Date(template.createdAt).toLocaleDateString()}
        </div>
      )}
    </>
  );

  if (layout === 'list') {
    return (
      <Card className={`p-4 hover:shadow-md transition-shadow ${className}`}>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            {cardContent}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 hover:shadow-md transition-shadow ${className}`}>
      {cardContent}
    </Card>
  );
};
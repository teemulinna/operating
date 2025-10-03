import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Lightbulb, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Tip {
  id: string;
  title: string;
  description: string;
  category: 'scheduling' | 'allocation' | 'capacity' | 'performance';
}

interface ScheduleTipsProps {
  dismissible?: boolean;
  showNavigation?: boolean;
  className?: string;
  onDismiss?: () => void;
}

/**
 * Schedule Tips Component
 *
 * Provides helpful tips and guidance for using the schedule:
 * - Best practices for resource allocation
 * - Tips for avoiding over-allocation
 * - Capacity planning guidance
 * - Performance optimization tips
 *
 * Features:
 * ✓ Rotating tip carousel
 * ✓ Dismissible with local storage persistence
 * ✓ Categorized tips
 * ✓ Navigation controls
 */
export const ScheduleTips: React.FC<ScheduleTipsProps> = ({
  dismissible = true,
  showNavigation = true,
  className = '',
  onDismiss
}) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const tips: Tip[] = [
    {
      id: 'tip-1',
      title: 'Optimal Utilization',
      description: 'Aim for 75-90% team utilization. Below 75% means underutilization, above 90% risks burnout.',
      category: 'capacity'
    },
    {
      id: 'tip-2',
      title: 'Buffer Time',
      description: 'Always leave 10-15% buffer capacity for unexpected tasks, meetings, and administrative work.',
      category: 'scheduling'
    },
    {
      id: 'tip-3',
      title: 'Weekly Planning',
      description: 'Review allocations weekly to catch over-allocation early. Use the alerts panel to identify issues quickly.',
      category: 'allocation'
    },
    {
      id: 'tip-4',
      title: 'Skill Matching',
      description: 'Match employee skills to project requirements for better efficiency and quality outcomes.',
      category: 'allocation'
    },
    {
      id: 'tip-5',
      title: 'Drag & Drop',
      description: 'Use drag-and-drop to quickly adjust allocations across weeks. Right-click for advanced options.',
      category: 'performance'
    },
    {
      id: 'tip-6',
      title: 'Color Coding',
      description: 'Green cells (1-75%) are good, yellow (76-100%) is high utilization, red (>100%) needs immediate attention.',
      category: 'scheduling'
    },
    {
      id: 'tip-7',
      title: 'Batch Updates',
      description: 'When allocating multiple employees to a project, use the batch allocation feature to save time.',
      category: 'performance'
    },
    {
      id: 'tip-8',
      title: 'Capacity Alerts',
      description: 'Enable notifications for over-allocation warnings to stay informed of capacity issues in real-time.',
      category: 'capacity'
    }
  ];

  const currentTip = tips[currentTipIndex];

  const handleNext = () => {
    setCurrentTipIndex((prev) => (prev + 1) % tips.length);
  };

  const handlePrevious = () => {
    setCurrentTipIndex((prev) => (prev - 1 + tips.length) % tips.length);
  };

  const handleDismissClick = () => {
    if (onDismiss) {
      onDismiss();
    }
    // Could also save to localStorage to remember dismissal
    localStorage.setItem('scheduleTipsDismissed', 'true');
  };

  return (
    <Card className={`border-blue-200 bg-blue-50 ${className}`} data-testid="schedule-tips">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-900">
            <Lightbulb className="h-4 w-4 text-blue-600" />
            💡 Scheduling Tip
          </CardTitle>
          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissClick}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              title="Dismiss tips"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Current Tip */}
          <div>
            <h4 className="font-semibold text-sm text-blue-900 mb-1">
              {currentTip.title}
            </h4>
            <p className="text-sm text-blue-800">
              {currentTip.description}
            </p>
          </div>

          {/* Navigation */}
          {showNavigation && (
            <div className="flex items-center justify-between pt-2 border-t border-blue-200">
              <div className="text-xs text-blue-700">
                Tip {currentTipIndex + 1} of {tips.length}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                  title="Previous tip"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                  title="Next tip"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleTips;

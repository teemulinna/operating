import React from 'react';
import { AlertTriangle, Clock, Users, TrendingUp } from 'lucide-react';

interface Project {
  name: string;
  hours: number;
  priority: string;
}

interface OverAllocationWarningProps {
  employeeName: string;
  totalHours: number;
  defaultHours: number;
  projects: Project[];
  onResolve?: () => void;
  className?: string;
}

type Severity = 'medium' | 'high' | 'critical';

const getSeverity = (overageHours: number): Severity => {
  if (overageHours >= 20) return 'critical';
  if (overageHours >= 10) return 'high';
  return 'medium';
};

const severityConfig = {
  medium: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-500',
    textColor: 'text-yellow-800'
  },
  high: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    textColor: 'text-red-800'
  },
  critical: {
    bgColor: 'bg-red-100',
    borderColor: 'border-red-400',
    iconColor: 'text-red-600',
    textColor: 'text-red-900'
  }
};

const getSeverityIcon = (severity: Severity) => {
  const iconClass = `w-5 h-5 ${severityConfig[severity].iconColor}`;
  
  switch (severity) {
    case 'critical':
      return <AlertTriangle className={`${iconClass} animate-pulse`} />;
    case 'high':
      return <AlertTriangle className={iconClass} />;
    case 'medium':
      return <Clock className={iconClass} />;
    default:
      return <TrendingUp className={iconClass} />;
  }
};

const generateSuggestions = (projects: Project[], overageHours: number): string[] => {
  const suggestions = [];
  
  // Sort projects by priority (low priority first for reduction suggestions)
  const sortedProjects = [...projects].sort((a, b) => {
    const priorityOrder = { 'low': 0, 'medium': 1, 'high': 2, 'critical': 3 };
    return (priorityOrder[a.priority as keyof typeof priorityOrder] || 1) - 
           (priorityOrder[b.priority as keyof typeof priorityOrder] || 1);
  });

  if (sortedProjects.length > 0) {
    const lowestPriority = sortedProjects[0];
    if (lowestPriority.priority === 'low') {
      suggestions.push(`Consider reducing hours on low-priority project "${lowestPriority.name}"`);
    }
  }

  if (overageHours >= 10) {
    suggestions.push('Split work across multiple team members');
    suggestions.push('Extend project timeline to reduce weekly load');
  }

  suggestions.push('Review project scope and requirements');
  suggestions.push('Consider hiring additional team members');

  return suggestions;
};

export function OverAllocationWarning({ 
  employeeName,
  totalHours,
  defaultHours,
  projects,
  onResolve,
  className = ""
}: OverAllocationWarningProps) {
  const overageHours = totalHours - defaultHours;
  const severity = getSeverity(overageHours);
  const config = severityConfig[severity];
  const shouldAnimate = severity === 'critical';
  const utilizationRate = Math.round((totalHours / defaultHours) * 100);
  
  const suggestions = generateSuggestions(projects, overageHours);

  return (
    <div 
      data-testid="over-allocation-warning"
      className={`
        p-4 rounded-lg border-l-4 
        ${config.bgColor} 
        ${config.borderColor}
        ${shouldAnimate ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      <div className="flex items-start space-x-3">
        <div data-testid="warning-icon" className="flex-shrink-0 mt-0.5">
          {getSeverityIcon(severity)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${config.textColor}`}>
            Over-Allocation Warning for {employeeName}
          </div>
          
          <div className={`mt-1 text-sm ${config.textColor}`}>
            <div className="flex items-center space-x-4 mb-2">
              <span>📊 {utilizationRate}% capacity</span>
              <span>⏰ {overageHours}h over limit</span>
              <span>📈 {totalHours}h / {defaultHours}h</span>
            </div>
            
            <div className="mb-2">
              <strong>Current allocations:</strong>
              <ul className="mt-1 ml-4">
                {projects.map((project, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <span>• {project.name}</span>
                    <span className="ml-2">
                      {project.hours}h 
                      <span className={`ml-1 text-xs px-1 py-0.5 rounded ${
                        project.priority === 'critical' ? 'bg-red-200 text-red-800' :
                        project.priority === 'high' ? 'bg-orange-200 text-orange-800' :
                        project.priority === 'medium' ? 'bg-blue-200 text-blue-800' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {project.priority}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div 
            data-testid="resolution-suggestions" 
            className={`mt-3 p-3 rounded-md bg-white border ${config.borderColor}`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Resolution Suggestions</span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-blue-500 font-bold">→</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
            
            {onResolve && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={onResolve}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  data-testid="resolve-warning-btn"
                >
                  Mark as Reviewed
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
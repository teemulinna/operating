import React, { useState, useMemo } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Clock, DollarSign, Users, Zap } from 'lucide-react';

interface OptimizationRecommendation {
  id: string;
  type: 'reassignment' | 'capacity_adjustment' | 'skill_development' | 'hiring' | 'rebalancing';
  title: string;
  description: string;
  employeeId?: number;
  employeeName?: string;
  fromProjectId?: number;
  fromProjectName?: string;
  toProjectId?: number;
  toProjectName?: string;
  adjustment?: number;
  reason: string;
  expectedImprovement: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedCost?: number;
  timeline?: string;
  impact: {
    efficiency: number;
    utilization: number;
    satisfaction: number;
  };
}

interface OptimizationData {
  recommendations: OptimizationRecommendation[];
  totalImprovement: number;
  riskLevel: 'low' | 'medium' | 'high';
  summary: {
    currentUtilization: number;
    projectedUtilization: number;
    efficiency: number;
    costImpact: number;
  };
}

interface ResourceOptimizerProps {
  data: OptimizationData;
  onAcceptRecommendation?: (recommendation: OptimizationRecommendation) => void;
  onRejectRecommendation?: (recommendationId: string) => void;
  onAcceptAll?: () => void;
  onRefreshRecommendations?: () => void;
  isLoading?: boolean;
}

interface RecommendationCardProps {
  recommendation: OptimizationRecommendation;
  onAccept: (recommendation: OptimizationRecommendation) => void;
  onReject: (id: string) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onAccept,
  onReject
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showImpactDetails, setShowImpactDetails] = useState(false);

  const getTypeIcon = () => {
    switch (recommendation.type) {
      case 'reassignment':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'capacity_adjustment':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'skill_development':
        return <Brain className="w-5 h-5 text-purple-600" />;
      case 'hiring':
        return <Users className="w-5 h-5 text-orange-600" />;
      case 'rebalancing':
        return <Zap className="w-5 h-5 text-yellow-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeColor = () => {
    switch (recommendation.type) {
      case 'reassignment':
        return 'bg-blue-50 border-blue-200';
      case 'capacity_adjustment':
        return 'bg-green-50 border-green-200';
      case 'skill_development':
        return 'bg-purple-50 border-purple-200';
      case 'hiring':
        return 'bg-orange-50 border-orange-200';
      case 'rebalancing':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getRiskColor = () => {
    switch (recommendation.riskLevel) {
      case 'low':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'high':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${getTypeColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getTypeIcon()}
          <div>
            <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
            <p className="text-sm text-gray-600">{recommendation.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor()}`}>
            {recommendation.riskLevel} risk
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              +{recommendation.expectedImprovement}%
            </div>
            <div className="text-xs text-gray-500">
              {recommendation.confidence * 100}% confidence
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-3 text-sm text-gray-600">
        <p>{recommendation.reason}</p>
        
        {recommendation.employeeName && (
          <div className="mt-2">
            <span className="font-medium">Employee:</span> {recommendation.employeeName}
          </div>
        )}
        
        {recommendation.fromProjectName && recommendation.toProjectName && (
          <div className="mt-2">
            <span className="font-medium">Move from:</span> {recommendation.fromProjectName} → {recommendation.toProjectName}
          </div>
        )}
        
        {recommendation.adjustment && (
          <div className="mt-2">
            <span className="font-medium">Adjustment:</span> {recommendation.adjustment > 0 ? '+' : ''}{recommendation.adjustment} hours/week
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">
            +{recommendation.impact.efficiency}%
          </div>
          <div className="text-xs text-gray-500">Efficiency</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">
            +{recommendation.impact.utilization}%
          </div>
          <div className="text-xs text-gray-500">Utilization</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-purple-600">
            +{recommendation.impact.satisfaction}%
          </div>
          <div className="text-xs text-gray-500">Satisfaction</div>
        </div>
      </div>

      {/* Additional Info */}
      {(recommendation.estimatedCost || recommendation.timeline) && (
        <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
          {recommendation.estimatedCost && (
            <div className="flex items-center space-x-1">
              <DollarSign className="w-4 h-4" />
              <span>${recommendation.estimatedCost.toLocaleString()}</span>
            </div>
          )}
          {recommendation.timeline && (
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{recommendation.timeline}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? 'Show Less' : 'Show Details'}
        </button>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onReject(recommendation.id)}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => onAccept(recommendation)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Implementation Steps</h5>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                {recommendation.type === 'reassignment' && (
                  <>
                    <li>Notify affected employee and project managers</li>
                    <li>Schedule transition meetings</li>
                    <li>Transfer project context and responsibilities</li>
                    <li>Monitor initial performance</li>
                  </>
                )}
                {recommendation.type === 'capacity_adjustment' && (
                  <>
                    <li>Review current workload distribution</li>
                    <li>Adjust project timelines if necessary</li>
                    <li>Implement new capacity allocation</li>
                    <li>Monitor utilization metrics</li>
                  </>
                )}
                {recommendation.type === 'skill_development' && (
                  <>
                    <li>Identify training programs or resources</li>
                    <li>Schedule training sessions</li>
                    <li>Assign mentorship if needed</li>
                    <li>Track skill development progress</li>
                  </>
                )}
              </ol>
            </div>
            
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Risk Mitigation</h5>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                {recommendation.riskLevel === 'high' && (
                  <>
                    <li>Gradual implementation over 2-3 weeks</li>
                    <li>Close monitoring of team dynamics</li>
                    <li>Backup plan for quick rollback</li>
                  </>
                )}
                {recommendation.riskLevel === 'medium' && (
                  <>
                    <li>Regular check-ins with affected team members</li>
                    <li>Performance tracking for first month</li>
                  </>
                )}
                {recommendation.riskLevel === 'low' && (
                  <li>Standard implementation process</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ResourceOptimizer: React.FC<ResourceOptimizerProps> = ({
  data,
  onAcceptRecommendation,
  onRejectRecommendation,
  onAcceptAll,
  onRefreshRecommendations,
  isLoading = false
}) => {
  const [filter, setFilter] = useState<'all' | 'high-impact' | 'low-risk' | 'quick-wins'>('all');
  const [sortBy, setSortBy] = useState<'impact' | 'confidence' | 'risk'>('impact');

  const filteredRecommendations = useMemo(() => {
    let filtered = [...data.recommendations];

    // Apply filters
    switch (filter) {
      case 'high-impact':
        filtered = filtered.filter(rec => rec.expectedImprovement >= 15);
        break;
      case 'low-risk':
        filtered = filtered.filter(rec => rec.riskLevel === 'low');
        break;
      case 'quick-wins':
        filtered = filtered.filter(rec => 
          rec.expectedImprovement >= 10 && 
          rec.riskLevel !== 'high' && 
          rec.confidence >= 0.8
        );
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'impact':
        filtered.sort((a, b) => b.expectedImprovement - a.expectedImprovement);
        break;
      case 'confidence':
        filtered.sort((a, b) => b.confidence - a.confidence);
        break;
      case 'risk':
        const riskOrder = { low: 0, medium: 1, high: 2 };
        filtered.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
        break;
    }

    return filtered;
  }, [data.recommendations, filter, sortBy]);

  const handleAccept = (recommendation: OptimizationRecommendation) => {
    onAcceptRecommendation?.(recommendation);
  };

  const handleReject = (id: string) => {
    onRejectRecommendation?.(id);
  };

  const getRiskIndicatorColor = () => {
    switch (data.riskLevel) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Resources...</h3>
          <p className="text-gray-600">AI is processing your resource data to generate optimizations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Resource Optimization</h3>
              <p className="text-sm text-gray-600">AI-Powered Suggestions</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div 
              data-testid={`risk-indicator-${data.riskLevel}`}
              className={`flex items-center space-x-1 ${getRiskIndicatorColor()}`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Overall Risk: {data.riskLevel}</span>
            </div>
            
            <button
              onClick={onRefreshRecommendations}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Brain className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.totalImprovement}%
            </div>
            <div className="text-sm text-blue-600">Total Improvement</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.summary.projectedUtilization}%
            </div>
            <div className="text-sm text-green-600">Projected Utilization</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {data.summary.efficiency}%
            </div>
            <div className="text-sm text-purple-600">Efficiency Gain</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              ${Math.abs(data.summary.costImpact).toLocaleString()}
            </div>
            <div className="text-sm text-orange-600">
              {data.summary.costImpact >= 0 ? 'Cost Impact' : 'Cost Savings'}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Filter:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="all">All Recommendations</option>
                <option value="high-impact">High Impact (15%+)</option>
                <option value="low-risk">Low Risk Only</option>
                <option value="quick-wins">Quick Wins</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="impact">Expected Impact</option>
                <option value="confidence">Confidence</option>
                <option value="risk">Risk Level</option>
              </select>
            </div>
          </div>
          
          {filteredRecommendations.length > 0 && (
            <button
              onClick={onAcceptAll}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Accept All ({filteredRecommendations.length})
            </button>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        {filteredRecommendations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Available</h4>
            <p className="text-gray-600">
              {data.recommendations.length === 0 
                ? "Your resource allocation is already optimized!"
                : "No recommendations match the current filter criteria."
              }
            </p>
          </div>
        ) : (
          filteredRecommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ResourceOptimizer;
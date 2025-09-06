import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Target, TrendingUp, Award, Clock, Download, BarChart3 } from 'lucide-react';
import { competencyService } from '../../services/competencyService';
import type { EmployeeSkill, ProficiencyLevel } from '../../models/Skill';

interface CompetencyTrackerProps {
  employeeId: string;
  editable?: boolean;
  showCategoryBreakdown?: boolean;
  showGaps?: boolean;
  trackUsage?: boolean;
  visualizations?: ('radar' | 'timeline' | 'distribution')[];
  showTrends?: boolean;
  enableGoals?: boolean;
  enableExport?: boolean;
  showTeamComparison?: boolean;
  showLearningPath?: boolean;
}

const PROFICIENCY_LEVELS: ProficiencyLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const PROFICIENCY_COLORS = {
  Beginner: 'bg-red-100 text-red-800 border-red-200',
  Intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Advanced: 'bg-blue-100 text-blue-800 border-blue-200',
  Expert: 'bg-green-100 text-green-800 border-green-200',
};

const CONFIDENCE_LEVELS = {
  high: { threshold: 85, label: 'High Confidence', color: 'text-green-600' },
  medium: { threshold: 65, label: 'Medium Confidence', color: 'text-yellow-600' },
  low: { threshold: 0, label: 'Low Confidence', color: 'text-red-600' },
};

export function CompetencyTracker({
  employeeId,
  editable = true,
  showCategoryBreakdown = false,
  showGaps = false,
  trackUsage = false,
  visualizations = [],
  showTrends = false,
  enableGoals = false,
  enableExport = false,
  showTeamComparison = false,
  showLearningPath = false
}: CompetencyTrackerProps) {
  const [competencies, setCompetencies] = useState<EmployeeSkill[]>([]);
  const [filteredCompetencies, setFilteredCompetencies] = useState<EmployeeSkill[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [gaps, setGaps] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [learningPath, setLearningPath] = useState<any[]>([]);
  const [teamAverages, setTeamAverages] = useState<any>({});
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [selectedSkillForGoal, setSelectedSkillForGoal] = useState<EmployeeSkill | null>(null);

  useEffect(() => {
    loadData();
  }, [employeeId]);

  useEffect(() => {
    filterCompetencies();
  }, [competencies, levelFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await competencyService.getEmployeeCompetencies(employeeId);
      setCompetencies(data);

      // Load additional data based on props
      const promises = [];
      
      if (showGaps) {
        promises.push(competencyService.getCompetencyGaps(employeeId).then(setGaps));
      }
      
      if (showTrends) {
        promises.push(competencyService.getSkillTrends(employeeId).then(setTrends));
      }
      
      if (showLearningPath) {
        promises.push(competencyService.generateLearningPath(employeeId).then(setLearningPath));
      }
      
      if (showTeamComparison) {
        promises.push(competencyService.getTeamAverages().then(setTeamAverages));
      }
      
      if (enableGoals) {
        promises.push(competencyService.getCompetencyGoals(employeeId).then(setGoals));
      }

      await Promise.all(promises);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load competency data');
    } finally {
      setLoading(false);
    }
  };

  const filterCompetencies = () => {
    let filtered = competencies;
    
    if (levelFilter !== 'all') {
      filtered = competencies.filter(c => c.proficiency_level === levelFilter);
    }
    
    setFilteredCompetencies(filtered);
  };

  const handleProficiencyUpdate = async (skillId: string, newLevel: number) => {
    try {
      const proficiencyLevel = competencyService.getProficiencyFromNumeric(newLevel);
      await competencyService.updateCompetencyLevel(skillId, proficiencyLevel);
      
      setCompetencies(prev => 
        prev.map(c => c.id === skillId ? { ...c, proficiency_level: proficiencyLevel } : c)
      );
    } catch (err) {
      setError('Failed to update proficiency level');
    }
  };

  const handleSetGoal = async (skillId: string, targetLevel: ProficiencyLevel, targetDate: Date) => {
    try {
      await competencyService.setCompetencyGoal(employeeId, skillId, targetLevel, targetDate);
      loadData(); // Refresh data
      setIsGoalDialogOpen(false);
    } catch (err) {
      setError('Failed to set competency goal');
    }
  };

  const exportCompetencies = async () => {
    try {
      const blob = await competencyService.exportCompetencyData(employeeId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `competencies_${employeeId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export competency data');
    }
  };

  const getCategoryBreakdown = () => {
    const categories: Record<string, { advanced: number; total: number }> = {};
    
    filteredCompetencies.forEach(comp => {
      // This would need actual skill category data
      const category = 'Technical Skills'; // Placeholder
      if (!categories[category]) {
        categories[category] = { advanced: 0, total: 0 };
      }
      
      categories[category].total++;
      if (['Advanced', 'Expert'].includes(comp.proficiency_level)) {
        categories[category].advanced++;
      }
    });
    
    return categories;
  };

  const getConfidenceLevel = (score: number) => {
    if (score >= CONFIDENCE_LEVELS.high.threshold) return CONFIDENCE_LEVELS.high;
    if (score >= CONFIDENCE_LEVELS.medium.threshold) return CONFIDENCE_LEVELS.medium;
    return CONFIDENCE_LEVELS.low;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading competency tracker...</div>;
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="text-red-600">Error: {error}</div>
          <Button onClick={loadData} className="mt-2">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const categoryBreakdown = getCategoryBreakdown();
  const overallScore = competencyService.calculateCompetencyScore(competencies);
  const confidence = getConfidenceLevel(overallScore);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Competency Tracker
            </CardTitle>
            <CardDescription>
              Track and monitor skill proficiency levels with interactive controls
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {enableExport && (
              <Button variant="outline" size="sm" onClick={exportCompetencies}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Label>Filter by Level:</Label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {PROFICIENCY_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Overall Score */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Overall Competency Score</h3>
                <p className="text-sm text-gray-600">Based on all skill proficiency levels</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{overallScore}%</div>
                <div className={`text-sm ${confidence.color}`}>{confidence.label}</div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {showCategoryBreakdown && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Skills by Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(categoryBreakdown).map(([category, data]) => (
                  <Card key={category} className="p-4">
                    <h4 className="font-medium">{category}</h4>
                    <div className="text-2xl font-bold text-blue-600">
                      {data.advanced}/{data.total}
                    </div>
                    <div className="text-sm text-gray-600">Advanced+</div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Skills Grid */}
          <div className="grid gap-4">
            {filteredCompetencies.map((competency) => {
              const numericValue = competencyService.getProficiencyNumericValue(competency.proficiency_level);
              const usageStatus = trackUsage 
                ? competencyService.getSkillUsageStatus(competency.last_used_date)
                : null;
              const teamAverage = showTeamComparison ? teamAverages[competency.skill_id] : null;
              const goal = goals.find(g => g.skill_id === competency.skill_id);

              return (
                <Card key={competency.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{competency.skill?.name || 'Unknown Skill'}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{competency.years_experience} years</span>
                        {competency.is_certified && (
                          <Badge variant="secondary" className="text-xs">
                            <Award className="w-3 h-3 mr-1" />
                            Certified
                          </Badge>
                        )}
                        {!competency.is_certified && (
                          <Badge variant="outline" className="text-xs">
                            Not Certified
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge className={PROFICIENCY_COLORS[competency.proficiency_level]}>
                        {competency.proficiency_level}
                      </Badge>
                      {enableGoals && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2"
                          onClick={() => {
                            setSelectedSkillForGoal(competency);
                            setIsGoalDialogOpen(true);
                          }}
                        >
                          <Target className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Proficiency Slider */}
                  {editable && (
                    <div className="mb-3">
                      <div className="flex items-center gap-4">
                        <Label className="text-sm">Proficiency:</Label>
                        <div className="flex-1">
                          <Slider
                            value={[numericValue]}
                            onValueChange={([value]) => handleProficiencyUpdate(competency.id, value)}
                            max={4}
                            min={1}
                            step={1}
                            className="flex-1"
                          />
                        </div>
                        <span className="text-sm font-medium w-20">
                          {competency.proficiency_level}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Usage Status */}
                  {trackUsage && usageStatus && (
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3 h-3" />
                      <span className={`
                        ${usageStatus === 'recent' ? 'text-green-600' : ''}
                        ${usageStatus === 'stale' ? 'text-yellow-600' : ''}
                        ${usageStatus === 'unused' ? 'text-red-600' : ''}
                      `}>
                        {usageStatus === 'recent' && 'Recently Used'}
                        {usageStatus === 'stale' && 'Needs Practice'}
                        {usageStatus === 'unused' && 'Unused'}
                      </span>
                    </div>
                  )}

                  {/* Team Comparison */}
                  {showTeamComparison && teamAverage && (
                    <div className="text-xs text-gray-600 mt-2">
                      <span>vs Team Average: </span>
                      <span className={numericValue > teamAverage.average_proficiency ? 'text-green-600' : 'text-red-600'}>
                        {numericValue > teamAverage.average_proficiency ? '+' : ''}
                        {(numericValue - teamAverage.average_proficiency).toFixed(1)} 
                        {numericValue > teamAverage.average_proficiency ? 'above' : 'below'} average
                      </span>
                    </div>
                  )}

                  {/* Goal Progress */}
                  {goal && (
                    <div className="mt-2 p-2 bg-blue-50 rounded">
                      <div className="text-xs text-blue-600">
                        Goal: {goal.target_level} by {new Date(goal.target_date).toLocaleDateString()}
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-1 mt-1">
                        <div 
                          className="bg-blue-600 h-1 rounded-full" 
                          style={{ width: `${goal.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {filteredCompetencies.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No competencies found matching the current filter.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skill Gaps */}
      {showGaps && gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Skill Gaps</CardTitle>
            <CardDescription>
              Identified areas for skill development
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gaps.map((gap, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{gap.skill_name}</h4>
                    <Badge variant="destructive">Gap Level {gap.gap_level}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{gap.recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Timeline */}
      {showTrends && trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Progress Timeline
            </CardTitle>
            <CardDescription>
              Historical skill proficiency changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trends.map((trend, index) => (
                <div key={index} className="flex items-center gap-3 p-2 border rounded">
                  <div className="text-sm text-gray-600">{trend.date}</div>
                  <div className="font-medium">Improved from {trends[index-1]?.proficiency_level || 'Beginner'} to {trend.proficiency_level}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Recommendations */}
      {showLearningPath && learningPath.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Learning Recommendations</CardTitle>
            <CardDescription>
              Personalized learning path based on current skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {learningPath.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">
                      {item.skill_name}: {item.current_level} → {item.target_level}
                    </h4>
                    <Badge variant="outline">Estimated: {item.estimated_duration}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Recommended Resources:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {item.recommended_resources.map((resource: string, idx: number) => (
                        <li key={idx}>{resource}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Radar Chart Visualization */}
      {visualizations.includes('radar') && (
        <Card>
          <CardHeader>
            <CardTitle>Competency Radar</CardTitle>
            <CardDescription>
              Visual representation of skill proficiency across categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              data-testid="competency-radar-chart"
              className="h-64 bg-gray-50 rounded-lg flex items-center justify-center"
            >
              <p className="text-gray-500">Radar Chart Visualization</p>
              {/* Chart implementation would go here */}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal Setting Dialog */}
      {enableGoals && (
        <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Competency Goal</DialogTitle>
              <DialogDescription>
                Set a target proficiency level and timeline for skill development
              </DialogDescription>
            </DialogHeader>
            {/* Goal form would go here */}
            <div className="space-y-4">
              <div>
                <Label>Target Level</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target proficiency level" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFICIENCY_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Date</Label>
                <Input type="date" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGoalDialogOpen(false)}>
                Cancel
              </Button>
              <Button>Save Goal</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
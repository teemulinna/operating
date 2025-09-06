import React, { useState, useMemo } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from '../ui/use-toast';
import { CpuChipIcon, LightBulbIcon, CheckCircleIcon, ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: number;
  position: string;
  skills: string[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  startDate: string;
  endDate: string;
  requiredSkills: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface CapacityData {
  id: string;
  employeeId: string;
  date: string;
  availableHours: number;
  allocatedHours: number;
  utilizationRate: number;
}

interface OptimizationSuggestion {
  type: 'reallocation' | 'skill_development' | 'capacity_adjustment' | 'project_prioritization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  currentState: string;
  suggestedState: string;
  expectedImpact: string;
  confidence: number;
  affectedEmployees: string[];
  affectedProjects: string[];
  implementation: {
    steps: string[];
    timeframe: string;
    effort: 'low' | 'medium' | 'high';
  };
}

interface ResourceOptimizationEngineProps {
  employees: Employee[];
  projects: Project[];
  capacityData: CapacityData[];
  onOptimizationComplete: () => void;
}

export const ResourceOptimizationEngine: React.FC<ResourceOptimizationEngineProps> = ({
  employees,
  projects,
  capacityData,
  onOptimizationComplete
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<OptimizationSuggestion | null>(null);
  const [optimizationMode, setOptimizationMode] = useState<'balanced' | 'utilization' | 'skills' | 'revenue'>('balanced');

  // Generate optimization suggestions based on current data
  const generateOptimizationSuggestions = useMemo((): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze utilization patterns
    const utilizationAnalysis = employees.map(emp => {
      const empCapacity = capacityData.filter(cap => cap.employeeId === emp.id.toString());
      const avgUtilization = empCapacity.length > 0 
        ? empCapacity.reduce((sum, cap) => sum + cap.utilizationRate, 0) / empCapacity.length
        : 0;
      
      return {
        employee: emp,
        utilization: avgUtilization,
        capacity: empCapacity,
        isOverUtilized: avgUtilization > 0.9,
        isUnderUtilized: avgUtilization < 0.6
      };
    });

    // Find reallocation opportunities
    const overUtilized = utilizationAnalysis.filter(emp => emp.isOverUtilized);
    const underUtilized = utilizationAnalysis.filter(emp => emp.isUnderUtilized);

    overUtilized.forEach(over => {
      // Find employees with similar skills who are under-utilized
      const potentialMatches = underUtilized.filter(under => {
        const skillOverlap = over.employee.skills.filter(skill => 
          under.employee.skills.includes(skill)
        ).length;
        return skillOverlap > 0;
      });

      if (potentialMatches.length > 0) {
        const bestMatch = potentialMatches.reduce((best, current) => {
          const bestSkillOverlap = over.employee.skills.filter(skill => 
            best.employee.skills.includes(skill)
          ).length;
          const currentSkillOverlap = over.employee.skills.filter(skill => 
            current.employee.skills.includes(skill)
          ).length;
          return currentSkillOverlap > bestSkillOverlap ? current : best;
        });

        suggestions.push({
          type: 'reallocation',
          priority: 'high',
          description: `Redistribute workload from over-utilized to under-utilized resources`,
          currentState: `${over.employee.firstName} ${over.employee.lastName} is ${(over.utilization * 100).toFixed(0)}% utilized`,
          suggestedState: `Move 20% of workload to ${bestMatch.employee.firstName} ${bestMatch.employee.lastName} (currently ${(bestMatch.utilization * 100).toFixed(0)}% utilized)`,
          expectedImpact: `Improve overall team utilization by 15-20%`,
          confidence: 85,
          affectedEmployees: [
            `${over.employee.firstName} ${over.employee.lastName}`,
            `${bestMatch.employee.firstName} ${bestMatch.employee.lastName}`
          ],
          affectedProjects: [],
          implementation: {
            steps: [
              'Analyze current task allocation',
              'Identify transferable responsibilities',
              'Coordinate handover process',
              'Monitor impact for 2 weeks'
            ],
            timeframe: '1-2 weeks',
            effort: 'medium'
          }
        });
      }
    });

    // Skill gap analysis
    const projectSkillDemands = projects.reduce((acc, project) => {
      project.requiredSkills.forEach(skill => {
        acc[skill] = (acc[skill] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const teamSkills = employees.reduce((acc, emp) => {
      emp.skills.forEach(skill => {
        acc[skill] = (acc[skill] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    // Find skills in high demand but low supply
    Object.entries(projectSkillDemands).forEach(([skill, demand]) => {
      const supply = teamSkills[skill] || 0;
      if (demand > supply * 1.5) { // Demand exceeds supply by 50%
        // Find employees who could learn this skill
        const candidatesForTraining = employees.filter(emp => 
          !emp.skills.includes(skill) && emp.skills.length < 8 // Not overloaded with skills
        );

        if (candidatesForTraining.length > 0) {
          const bestCandidate = candidatesForTraining[0]; // Could use more sophisticated selection

          suggestions.push({
            type: 'skill_development',
            priority: 'medium',
            description: `Address skill gap in ${skill}`,
            currentState: `Only ${supply} team members have ${skill} skills, but ${demand} projects require it`,
            suggestedState: `Train ${bestCandidate.firstName} ${bestCandidate.lastName} in ${skill}`,
            expectedImpact: `Increase ${skill} capacity by 25%, reduce project bottlenecks`,
            confidence: 75,
            affectedEmployees: [`${bestCandidate.firstName} ${bestCandidate.lastName}`],
            affectedProjects: projects.filter(p => p.requiredSkills.includes(skill)).map(p => p.name),
            implementation: {
              steps: [
                'Assess current skill level',
                'Design training program',
                'Schedule training sessions',
                'Validate skill acquisition'
              ],
              timeframe: '4-6 weeks',
              effort: 'medium'
            }
          });
        }
      }
    });

    // Project prioritization optimization
    const criticalProjects = projects.filter(p => p.priority === 'critical' && p.status !== 'completed');
    const activeProjects = projects.filter(p => p.status === 'active');

    if (criticalProjects.length > activeProjects.length * 0.3) {
      suggestions.push({
        type: 'project_prioritization',
        priority: 'high',
        description: 'Optimize project prioritization to focus on critical initiatives',
        currentState: `${criticalProjects.length} critical projects competing for resources`,
        suggestedState: 'Focus 70% of resources on top 3 critical projects',
        expectedImpact: 'Improve critical project delivery by 30%, reduce context switching',
        confidence: 90,
        affectedEmployees: employees.map(emp => `${emp.firstName} ${emp.lastName}`),
        affectedProjects: criticalProjects.map(p => p.name),
        implementation: {
          steps: [
            'Rank critical projects by business impact',
            'Allocate primary resources to top priorities',
            'Schedule lower-priority work for later phases',
            'Establish weekly priority review process'
          ],
          timeframe: '1 week',
          effort: 'low'
        }
      });
    }

    // Capacity adjustment suggestions
    const totalUtilization = utilizationAnalysis.reduce((sum, emp) => sum + emp.utilization, 0) / utilizationAnalysis.length;
    
    if (totalUtilization > 0.85) {
      suggestions.push({
        type: 'capacity_adjustment',
        priority: 'critical',
        description: 'Team operating at unsustainable utilization levels',
        currentState: `Average team utilization is ${(totalUtilization * 100).toFixed(0)}%`,
        suggestedState: 'Consider hiring additional resources or reducing project scope',
        expectedImpact: 'Prevent burnout, improve work quality, reduce delivery risks',
        confidence: 95,
        affectedEmployees: employees.map(emp => `${emp.firstName} ${emp.lastName}`),
        affectedProjects: projects.filter(p => p.status === 'active').map(p => p.name),
        implementation: {
          steps: [
            'Calculate exact capacity deficit',
            'Evaluate hiring vs scope reduction options',
            'Present recommendations to leadership',
            'Implement approved solution'
          ],
          timeframe: '2-4 weeks',
          effort: 'high'
        }
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [employees, projects, capacityData]);

  const runOptimization = async () => {
    setIsOptimizing(true);
    setOptimizationProgress(0);

    // Simulate optimization process
    const steps = [
      'Analyzing current resource allocation...',
      'Identifying optimization opportunities...',
      'Calculating impact scenarios...',
      'Generating recommendations...',
      'Validating suggestions...'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOptimizationProgress((i + 1) / steps.length * 100);
    }

    setSuggestions(generateOptimizationSuggestions);
    setIsOptimizing(false);
    
    toast({
      title: "Optimization Complete",
      description: `Generated ${generateOptimizationSuggestions.length} optimization suggestions`
    });
  };

  const implementSuggestion = async (suggestion: OptimizationSuggestion) => {
    try {
      // This would integrate with your backend API
      const response = await fetch('/api/resource-optimization/implement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(suggestion),
      });

      if (response.ok) {
        toast({
          title: "Optimization Implemented",
          description: `Successfully implemented: ${suggestion.description}`
        });
        onOptimizationComplete();
        setIsDialogOpen(false);
      }
    } catch (error) {
      toast({
        title: "Implementation Failed",
        description: "Failed to implement optimization suggestion",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reallocation':
        return <ArrowRightIcon className="h-5 w-5" />;
      case 'skill_development':
        return <LightBulbIcon className="h-5 w-5" />;
      case 'capacity_adjustment':
        return <CpuChipIcon className="h-5 w-5" />;
      case 'project_prioritization':
        return <CheckCircleIcon className="h-5 w-5" />;
      default:
        return <CpuChipIcon className="h-5 w-5" />;
    }
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <CpuChipIcon className="h-4 w-4 mr-2" />
            AI Optimization
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CpuChipIcon className="h-5 w-5 text-purple-600" />
              Resource Optimization Engine
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Optimization Controls */}
            <div className="flex items-center gap-4">
              <Select value={optimizationMode} onValueChange={setOptimizationMode}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Balanced Optimization</SelectItem>
                  <SelectItem value="utilization">Maximize Utilization</SelectItem>
                  <SelectItem value="skills">Optimize Skills</SelectItem>
                  <SelectItem value="revenue">Maximize Revenue</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                onClick={runOptimization} 
                disabled={isOptimizing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isOptimizing ? 'Optimizing...' : 'Run Analysis'}
              </Button>
            </div>

            {/* Optimization Progress */}
            {isOptimizing && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Running AI optimization analysis...</span>
                      <span>{optimizationProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={optimizationProgress} className="w-full" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Optimization Results */}
            {suggestions.length > 0 && !isOptimizing && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Optimization Suggestions</h3>
                  <Badge className="bg-green-100 text-green-800">
                    {suggestions.length} recommendations found
                  </Badge>
                </div>

                {suggestions.map((suggestion, index) => (
                  <Card key={index} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(suggestion.type)}
                          <div>
                            <h4 className="font-medium">{suggestion.description}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getSeverityColor(suggestion.priority)}>
                                {suggestion.priority}
                              </Badge>
                              <Badge variant="outline">
                                {suggestion.confidence}% confidence
                              </Badge>
                              <Badge variant="outline">
                                {suggestion.implementation.effort} effort
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedSuggestion(suggestion)}
                          >
                            View Details
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => implementSuggestion(suggestion)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Implement
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">Current State:</p>
                          <p>{suggestion.currentState}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Suggested Change:</p>
                          <p>{suggestion.suggestedState}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm text-green-800">
                          <strong>Expected Impact:</strong> {suggestion.expectedImpact}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Initial state */}
            {suggestions.length === 0 && !isOptimizing && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CpuChipIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Ready for Optimization</h3>
                  <p className="text-gray-600 mb-4">
                    Our AI will analyze your current resource allocation and provide intelligent suggestions for improvement.
                  </p>
                  <Alert className="max-w-md mx-auto">
                    <LightBulbIcon className="h-4 w-4" />
                    <AlertDescription>
                      The optimization engine considers utilization rates, skill matches, project priorities, and capacity constraints.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Suggestion Detail Dialog */}
      <Dialog open={!!selectedSuggestion} onOpenChange={() => setSelectedSuggestion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Implementation Plan</DialogTitle>
          </DialogHeader>
          
          {selectedSuggestion && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-gray-700">{selectedSuggestion.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Affected Employees</h4>
                  <div className="space-y-1">
                    {selectedSuggestion.affectedEmployees.map(emp => (
                      <Badge key={emp} variant="outline" className="mr-1">
                        {emp}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Affected Projects</h4>
                  <div className="space-y-1">
                    {selectedSuggestion.affectedProjects.map(project => (
                      <Badge key={project} variant="outline" className="mr-1">
                        {project}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Implementation Steps</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {selectedSuggestion.implementation.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Timeframe</p>
                  <p className="font-medium">{selectedSuggestion.implementation.timeframe}</p>
                </div>
                <div>
                  <p className="text-gray-600">Effort Level</p>
                  <p className="font-medium capitalize">{selectedSuggestion.implementation.effort}</p>
                </div>
                <div>
                  <p className="text-gray-600">Confidence</p>
                  <p className="font-medium">{selectedSuggestion.confidence}%</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedSuggestion(null)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    implementSuggestion(selectedSuggestion);
                    setSelectedSuggestion(null);
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Implement Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
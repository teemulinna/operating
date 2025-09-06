import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  Target, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Zap,
  Award,
  MapPin,
  DollarSign,
  Calendar
} from 'lucide-react';
import { skillService } from '../../services/skillService';
import type { Skill, ProficiencyLevel } from '../../models/Skill';

interface ProjectRequirement {
  skillId: string;
  skillName: string;
  proficiency: ProficiencyLevel;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedHours: number;
  deadline?: Date;
  notes?: string;
}

interface TeamMember {
  employeeId: string;
  employeeName: string;
  department: string;
  location: string;
  availability: number; // percentage
  hourlyRate: number;
  skills: Array<{
    skillId: string;
    skillName: string;
    proficiency: ProficiencyLevel;
    experience: number;
    certified: boolean;
  }>;
  currentProjects: number;
  performanceScore: number;
}

interface ProjectMatch {
  matchScore: number;
  coverageScore: number;
  availabilityScore: number;
  costScore: number;
  timeline: number; // days to complete
  estimatedCost: number;
  teamComposition: TeamMember[];
  missingSkills: ProjectRequirement[];
  skillGaps: Array<{
    skill: string;
    required: ProficiencyLevel;
    available: ProficiencyLevel;
    gap: number;
  }>;
  riskFactors: Array<{
    type: 'skill_gap' | 'availability' | 'deadline' | 'cost';
    severity: 'low' | 'medium' | 'high';
    description: string;
    mitigation?: string;
  }>;
  recommendations: string[];
}

interface ProjectSkillMatcherProps {
  onMatchComplete?: (match: ProjectMatch) => void;
  enableTeamOptimization?: boolean;
  showCostAnalysis?: boolean;
  maxTeamSize?: number;
  budgetLimit?: number;
}

const PROFICIENCY_LEVELS: ProficiencyLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const PRIORITY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;

const PROFICIENCY_WEIGHTS = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Expert: 4
};

const PRIORITY_WEIGHTS = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

export function ProjectSkillMatcher({
  onMatchComplete,
  enableTeamOptimization = true,
  showCostAnalysis = true,
  maxTeamSize = 8,
  budgetLimit
}: ProjectSkillMatcherProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectDeadline, setProjectDeadline] = useState('');
  const [requirements, setRequirements] = useState<ProjectRequirement[]>([]);
  const [currentMatch, setCurrentMatch] = useState<ProjectMatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'requirements' | 'results' | 'team'>('requirements');

  // Form state for new requirement
  const [newRequirement, setNewRequirement] = useState<{
    skillId: string;
    proficiency: ProficiencyLevel;
    priority: 'critical' | 'high' | 'medium' | 'low';
    estimatedHours: number;
    notes: string;
  }>({
    skillId: '',
    proficiency: 'Intermediate',
    priority: 'medium',
    estimatedHours: 40,
    notes: ''
  });

  useEffect(() => {
    loadSkills();
  }, []);

  useEffect(() => {
    if (requirements.length > 0) {
      performMatching();
    }
  }, [requirements]);

  const loadSkills = async () => {
    try {
      const allSkills = await skillService.getAllSkills();
      setSkills(allSkills);
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
  };

  const addRequirement = () => {
    if (!newRequirement.skillId) return;

    const skill = skills.find(s => s.id === newRequirement.skillId);
    if (!skill) return;

    const requirement: ProjectRequirement = {
      skillId: newRequirement.skillId,
      skillName: skill.name,
      proficiency: newRequirement.proficiency,
      priority: newRequirement.priority,
      estimatedHours: newRequirement.estimatedHours,
      deadline: projectDeadline ? new Date(projectDeadline) : undefined,
      notes: newRequirement.notes
    };

    setRequirements(prev => [...prev, requirement]);
    
    // Reset form
    setNewRequirement({
      skillId: '',
      proficiency: 'Intermediate',
      priority: 'medium',
      estimatedHours: 40,
      notes: ''
    });
  };

  const removeRequirement = (index: number) => {
    setRequirements(prev => prev.filter((_, i) => i !== index));
  };

  const performMatching = async () => {
    if (requirements.length === 0) return;

    setLoading(true);
    try {
      // Mock implementation - replace with actual API call
      const match = await generateProjectMatch();
      setCurrentMatch(match);
      onMatchComplete?.(match);
      setActiveTab('results');
    } catch (error) {
      console.error('Matching failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateProjectMatch = async (): Promise<ProjectMatch> => {
    // Mock team members - in real app, this would come from the employee API
    const mockTeamMembers: TeamMember[] = [
      {
        employeeId: '1',
        employeeName: 'Alice Johnson',
        department: 'Engineering',
        location: 'San Francisco',
        availability: 80,
        hourlyRate: 95,
        currentProjects: 2,
        performanceScore: 92,
        skills: requirements.slice(0, 3).map(req => ({
          skillId: req.skillId,
          skillName: req.skillName,
          proficiency: req.proficiency,
          experience: Math.floor(Math.random() * 8) + 1,
          certified: Math.random() > 0.6
        }))
      },
      {
        employeeId: '2',
        employeeName: 'Bob Smith',
        department: 'Engineering',
        location: 'Remote',
        availability: 100,
        hourlyRate: 85,
        currentProjects: 1,
        performanceScore: 88,
        skills: requirements.slice(1, 4).map(req => ({
          skillId: req.skillId,
          skillName: req.skillName,
          proficiency: PROFICIENCY_LEVELS[Math.max(0, PROFICIENCY_LEVELS.indexOf(req.proficiency) - 1)],
          experience: Math.floor(Math.random() * 6) + 1,
          certified: Math.random() > 0.7
        }))
      },
      {
        employeeId: '3',
        employeeName: 'Carol Davis',
        department: 'Design',
        location: 'New York',
        availability: 60,
        hourlyRate: 75,
        currentProjects: 3,
        performanceScore: 95,
        skills: requirements.slice(2, 5).map(req => ({
          skillId: req.skillId,
          skillName: req.skillName,
          proficiency: req.proficiency,
          experience: Math.floor(Math.random() * 5) + 2,
          certified: Math.random() > 0.8
        }))
      }
    ];

    // Calculate coverage
    const totalSkills = requirements.length;
    const coveredSkills = new Set();
    mockTeamMembers.forEach(member => {
      member.skills.forEach(skill => {
        const req = requirements.find(r => r.skillId === skill.skillId);
        if (req && PROFICIENCY_WEIGHTS[skill.proficiency] >= PROFICIENCY_WEIGHTS[req.proficiency]) {
          coveredSkills.add(skill.skillId);
        }
      });
    });

    const coverageScore = Math.round((coveredSkills.size / totalSkills) * 100);

    // Calculate missing skills and gaps
    const missingSkills = requirements.filter(req => 
      !Array.from(coveredSkills).includes(req.skillId)
    );

    const skillGaps: Array<{
      skill: string;
      required: ProficiencyLevel;
      available: ProficiencyLevel;
      gap: number;
    }> = [];

    requirements.forEach(req => {
      const bestMatch = mockTeamMembers
        .flatMap(member => member.skills)
        .filter(skill => skill.skillId === req.skillId)
        .sort((a, b) => PROFICIENCY_WEIGHTS[b.proficiency] - PROFICIENCY_WEIGHTS[a.proficiency])[0];

      if (bestMatch && PROFICIENCY_WEIGHTS[bestMatch.proficiency] < PROFICIENCY_WEIGHTS[req.proficiency]) {
        skillGaps.push({
          skill: req.skillName,
          required: req.proficiency,
          available: bestMatch.proficiency,
          gap: PROFICIENCY_WEIGHTS[req.proficiency] - PROFICIENCY_WEIGHTS[bestMatch.proficiency]
        });
      }
    });

    // Calculate scores
    const matchScore = Math.round((coverageScore + 
      (mockTeamMembers.reduce((sum, m) => sum + m.performanceScore, 0) / mockTeamMembers.length)) / 2);
    
    const availabilityScore = Math.round(
      mockTeamMembers.reduce((sum, m) => sum + m.availability, 0) / mockTeamMembers.length
    );

    const totalHours = requirements.reduce((sum, req) => sum + req.estimatedHours, 0);
    const estimatedCost = mockTeamMembers.reduce((sum, member) => {
      const memberHours = totalHours / mockTeamMembers.length;
      return sum + (memberHours * member.hourlyRate);
    }, 0);

    const costScore = budgetLimit ? 
      Math.max(0, 100 - ((estimatedCost / budgetLimit) * 100)) : 75;

    // Generate risk factors
    const riskFactors: ProjectMatch['riskFactors'] = [];
    
    if (coverageScore < 80) {
      riskFactors.push({
        type: 'skill_gap',
        severity: 'high',
        description: `${100 - coverageScore}% of required skills are not adequately covered`,
        mitigation: 'Consider hiring contractors or providing training'
      });
    }

    if (availabilityScore < 70) {
      riskFactors.push({
        type: 'availability',
        severity: 'medium',
        description: 'Team members have limited availability',
        mitigation: 'Adjust project timeline or add more resources'
      });
    }

    if (budgetLimit && estimatedCost > budgetLimit * 0.9) {
      riskFactors.push({
        type: 'cost',
        severity: 'high',
        description: 'Project cost approaches or exceeds budget limit',
        mitigation: 'Optimize team composition or reduce scope'
      });
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (missingSkills.length > 0) {
      recommendations.push(`Consider hiring specialists for: ${missingSkills.map(s => s.skillName).join(', ')}`);
    }

    if (skillGaps.length > 0) {
      recommendations.push(`Provide training to bridge skill gaps in: ${skillGaps.map(g => g.skill).join(', ')}`);
    }

    if (availabilityScore < 80) {
      recommendations.push('Consider extending timeline to accommodate team availability');
    }

    recommendations.push('Schedule regular skill assessments to track progress');

    return {
      matchScore,
      coverageScore,
      availabilityScore,
      costScore,
      timeline: Math.ceil(totalHours / (mockTeamMembers.length * 40)), // weeks
      estimatedCost: Math.round(estimatedCost),
      teamComposition: mockTeamMembers,
      missingSkills,
      skillGaps,
      riskFactors,
      recommendations
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Project Skill Matcher
          </CardTitle>
          <CardDescription>
            Define project requirements and find the optimal team composition
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <Label htmlFor="deadline">Deadline (Optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={projectDeadline}
                onChange={(e) => setProjectDeadline(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Project Description</Label>
            <Textarea
              id="description"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Describe the project objectives and scope"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'requirements', label: 'Requirements', icon: Target },
            { id: 'results', label: 'Match Results', icon: TrendingUp },
            { id: 'team', label: 'Team Composition', icon: Users }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Requirements Tab */}
      {activeTab === 'requirements' && (
        <div className="space-y-6">
          {/* Add Requirement Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add Skill Requirement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label>Skill</Label>
                  <Select 
                    value={newRequirement.skillId}
                    onValueChange={(value) => setNewRequirement(prev => ({ ...prev, skillId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {skills.map(skill => (
                        <SelectItem key={skill.id} value={skill.id}>
                          {skill.name} ({skill.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Required Proficiency</Label>
                  <Select 
                    value={newRequirement.proficiency}
                    onValueChange={(value) => setNewRequirement(prev => ({ 
                      ...prev, 
                      proficiency: value as ProficiencyLevel 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFICIENCY_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={newRequirement.priority}
                    onValueChange={(value) => setNewRequirement(prev => ({ 
                      ...prev, 
                      priority: value as 'critical' | 'high' | 'medium' | 'low'
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_LEVELS.map(priority => (
                        <SelectItem key={priority} value={priority} className="capitalize">
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Estimated Hours</Label>
                  <Input
                    type="number"
                    value={newRequirement.estimatedHours}
                    onChange={(e) => setNewRequirement(prev => ({ 
                      ...prev, 
                      estimatedHours: parseInt(e.target.value) || 0 
                    }))}
                    min="1"
                  />
                </div>
              </div>

              <div className="mb-4">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={newRequirement.notes}
                  onChange={(e) => setNewRequirement(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or specific requirements"
                  rows={2}
                />
              </div>

              <Button 
                onClick={addRequirement}
                disabled={!newRequirement.skillId}
                className="flex items-center gap-2"
              >
                <Target className="w-4 h-4" />
                Add Requirement
              </Button>
            </CardContent>
          </Card>

          {/* Requirements List */}
          {requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Project Requirements ({requirements.length})</CardTitle>
                <CardDescription>
                  Total estimated effort: {requirements.reduce((sum, req) => sum + req.estimatedHours, 0)} hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requirements.map((req, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{req.skillName}</h4>
                          <Badge className={getPriorityColor(req.priority)}>
                            {req.priority}
                          </Badge>
                          <Badge variant="outline">
                            {req.proficiency}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Clock className="w-3 h-3" />
                            {req.estimatedHours}h
                          </div>
                        </div>
                        {req.notes && (
                          <p className="text-sm text-gray-600">{req.notes}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeRequirement(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && currentMatch && (
        <div className="space-y-6">
          {/* Match Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Match Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {currentMatch.matchScore}%
                  </div>
                  <div className="text-sm text-gray-600">Overall Match</div>
                  <Progress value={currentMatch.matchScore} className="mt-2" />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {currentMatch.coverageScore}%
                  </div>
                  <div className="text-sm text-gray-600">Skill Coverage</div>
                  <Progress value={currentMatch.coverageScore} className="mt-2" />
                </div>
                <div className="text-3xl font-bold text-purple-600 mb-1 text-center">
                  {currentMatch.timeline}
                </div>
                <div className="text-sm text-gray-600 text-center">Weeks</div>
                {showCostAnalysis && (
                  <>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-1">
                        ${currentMatch.estimatedCost.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Est. Cost</div>
                      {budgetLimit && (
                        <Progress 
                          value={(currentMatch.estimatedCost / budgetLimit) * 100} 
                          className="mt-2"
                        />
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Risk Factors */}
              {currentMatch.riskFactors.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Risk Factors
                  </h4>
                  <div className="space-y-2">
                    {currentMatch.riskFactors.map((risk, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{risk.type.replace('_', ' ')}</span>
                          <Badge className={getRiskSeverityColor(risk.severity)}>
                            {risk.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                        {risk.mitigation && (
                          <p className="text-sm text-blue-600">
                            <strong>Mitigation:</strong> {risk.mitigation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  Recommendations
                </h4>
                <ul className="space-y-1">
                  {currentMatch.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Skill Gaps */}
          {currentMatch.skillGaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skill Gaps Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentMatch.skillGaps.map((gap, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h5 className="font-medium">{gap.skill}</h5>
                        <p className="text-sm text-gray-600">
                          Required: {gap.required} | Available: {gap.available}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-orange-600">
                        Gap: {gap.gap} level{gap.gap !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && currentMatch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Recommended Team ({currentMatch.teamComposition.length} members)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {currentMatch.teamComposition.map((member, index) => (
                <div key={member.employeeId} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{member.employeeName}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>{member.department}</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {member.location}
                        </div>
                        {showCostAnalysis && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${member.hourlyRate}/hr
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {member.performanceScore}%
                      </div>
                      <div className="text-xs text-gray-600">Performance</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-sm font-medium mb-1">Availability</div>
                      <Progress value={member.availability} className="mb-1" />
                      <div className="text-xs text-gray-600">{member.availability}% available</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Current Load</div>
                      <div className="text-sm">{member.currentProjects} active projects</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Relevant Skills</div>
                      <div className="text-sm">{member.skills.length} matching</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-2">Skills Match</div>
                    <div className="flex flex-wrap gap-2">
                      {member.skills.map((skill, skillIndex) => (
                        <div key={skillIndex} className="flex items-center gap-1">
                          <Badge variant="outline">{skill.skillName}</Badge>
                          <Badge className="text-xs">{skill.proficiency}</Badge>
                          {skill.certified && (
                            <Award className="w-3 h-3 text-yellow-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Analyzing project requirements...</span>
        </div>
      )}
    </div>
  );
}
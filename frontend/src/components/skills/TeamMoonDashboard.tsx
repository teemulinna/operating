import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  Search, 
  Filter, 
  Users, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Award,
  MapPin,
  Clock,
  Zap,
  BarChart3,
  FileText,
  Download,
  Settings
} from 'lucide-react';
import { AdvancedSkillsFilter } from './AdvancedSkillsFilter';
import { ProjectSkillMatcher } from './ProjectSkillMatcher';
import { skillService } from '../../services/skillService';
import type { Skill, ProficiencyLevel } from '../../models/Skill';

interface SkillMatch {
  employeeId: string;
  employeeName: string;
  department: string;
  matchedSkills: Array<{
    skillId: string;
    skillName: string;
    proficiency: ProficiencyLevel;
    experience: number;
    certified: boolean;
    confidence: number;
  }>;
  overallScore: number;
  availability: 'available' | 'partial' | 'busy';
  capacity: number;
  location: string;
  hourlyRate?: number;
}

interface ProjectMatch {
  matchScore: number;
  coverageScore: number;
  availabilityScore: number;
  timeline: number;
  estimatedCost: number;
  teamComposition: Array<{
    employeeId: string;
    employeeName: string;
    department: string;
    location: string;
    availability: number;
    hourlyRate: number;
  }>;
  recommendations: string[];
}

interface TeamMoonDashboardProps {
  showAnalytics?: boolean;
  enableProjectMatching?: boolean;
  maxResults?: number;
  defaultView?: 'filter' | 'projects' | 'analytics';
}

const SKILL_CATEGORIES = ['technical', 'soft', 'domain', 'certification', 'language'];

export function TeamMoonDashboard({
  showAnalytics = true,
  enableProjectMatching = true,
  maxResults = 50,
  defaultView = 'filter'
}: TeamMoonDashboardProps) {
  const [activeView, setActiveView] = useState(defaultView);
  const [searchResults, setSearchResults] = useState<SkillMatch[]>([]);
  const [projectMatch, setProjectMatch] = useState<ProjectMatch | null>(null);
  const [savedSearches, setSavedSearches] = useState<Array<{
    id: string;
    name: string;
    criteria: any;
    createdAt: Date;
  }>>([]);
  const [skillsOverview, setSkillsOverview] = useState<{
    totalSkills: number;
    categoryBreakdown: Record<string, number>;
    topSkills: Array<{ name: string; count: number }>;
    skillGaps: Array<{ skill: string; gap: number }>;
  } | null>(null);

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'json'>('csv');

  useEffect(() => {
    loadSkillsOverview();
    loadSavedSearches();
  }, []);

  const loadSkillsOverview = async () => {
    try {
      // Mock implementation - replace with actual API call
      const mockOverview = {
        totalSkills: 79,
        categoryBreakdown: {
          technical: 45,
          soft: 12,
          domain: 10,
          certification: 7,
          language: 5
        },
        topSkills: [
          { name: 'JavaScript', count: 24 },
          { name: 'React', count: 18 },
          { name: 'Python', count: 16 },
          { name: 'Node.js', count: 14 },
          { name: 'AWS', count: 12 }
        ],
        skillGaps: [
          { skill: 'Machine Learning', gap: 65 },
          { skill: 'Kubernetes', gap: 58 },
          { skill: 'Go', gap: 52 },
          { skill: 'Blockchain', gap: 48 },
          { skill: 'Rust', gap: 45 }
        ]
      };
      setSkillsOverview(mockOverview);
    } catch (error) {
      console.error('Failed to load skills overview:', error);
    }
  };

  const loadSavedSearches = () => {
    // Mock implementation - in real app, load from localStorage or API
    const mockSavedSearches = [
      {
        id: '1',
        name: 'Frontend React Developers',
        criteria: { skillIds: ['react-id'], categories: ['technical'] },
        createdAt: new Date('2024-09-01')
      },
      {
        id: '2', 
        name: 'Full Stack Python Team',
        criteria: { skillIds: ['python-id', 'django-id'], categories: ['technical'] },
        createdAt: new Date('2024-09-03')
      },
      {
        id: '3',
        name: 'DevOps Specialists',
        criteria: { skillIds: ['docker-id', 'kubernetes-id'], categories: ['technical'] },
        createdAt: new Date('2024-09-04')
      }
    ];
    setSavedSearches(mockSavedSearches);
  };

  const handleFilterResults = (results: SkillMatch[]) => {
    setSearchResults(results);
  };

  const handleSaveFilter = (filter: any) => {
    const newSavedSearch = {
      id: Date.now().toString(),
      name: filter.name,
      criteria: filter,
      createdAt: new Date()
    };
    setSavedSearches(prev => [...prev, newSavedSearch]);
    // In real app, also save to backend/localStorage
  };

  const handleProjectMatch = (match: ProjectMatch) => {
    setProjectMatch(match);
  };

  const exportResults = () => {
    if (searchResults.length === 0) return;

    const dataToExport = {
      searchResults,
      projectMatch,
      exportDate: new Date().toISOString(),
      summary: {
        totalMatches: searchResults.length,
        averageScore: searchResults.reduce((sum, r) => sum + r.overallScore, 0) / searchResults.length,
        availableCount: searchResults.filter(r => r.availability === 'available').length
      }
    };

    switch (exportFormat) {
      case 'csv':
        exportToCsv(dataToExport);
        break;
      case 'json':
        exportToJson(dataToExport);
        break;
      case 'pdf':
        // Would integrate with a PDF library
        console.log('PDF export would be implemented here');
        break;
    }

    setShowExportDialog(false);
  };

  const exportToCsv = (data: any) => {
    const csvContent = [
      ['Employee Name', 'Department', 'Overall Score', 'Availability', 'Capacity', 'Location', 'Top Skills'].join(','),
      ...data.searchResults.map((result: SkillMatch) => [
        result.employeeName,
        result.department,
        result.overallScore,
        result.availability,
        result.capacity,
        result.location,
        result.matchedSkills.map(s => s.skillName).slice(0, 3).join('; ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-moon-search-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToJson = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-moon-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'busy': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              Team Moon - Skills Resource Filtering
            </h1>
            <p className="text-gray-600 mt-2">
              Advanced skills-based resource discovery for project managers using {skillsOverview?.totalSkills || 79} comprehensive skills
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {(searchResults.length > 0 || projectMatch) && (
              <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export Results
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Results</DialogTitle>
                    <DialogDescription>
                      Choose the format to export your search results and project matches
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Export Format</label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {[
                          { value: 'csv', label: 'CSV', icon: FileText },
                          { value: 'json', label: 'JSON', icon: FileText },
                          { value: 'pdf', label: 'PDF', icon: FileText }
                        ].map(format => {
                          const Icon = format.icon;
                          return (
                            <button
                              key={format.value}
                              onClick={() => setExportFormat(format.value as any)}
                              className={`p-3 border rounded-lg flex flex-col items-center gap-2 ${
                                exportFormat === format.value 
                                  ? 'border-blue-500 bg-blue-50 text-blue-600' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                              <span className="text-sm font-medium">{format.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={exportResults}>Export</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        {skillsOverview && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{skillsOverview.totalSkills}</div>
                <div className="text-sm text-gray-600">Total Skills</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{skillsOverview.categoryBreakdown.technical}</div>
                <div className="text-sm text-gray-600">Technical Skills</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">{searchResults.length}</div>
                <div className="text-sm text-gray-600">Current Matches</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {searchResults.filter(r => r.availability === 'available').length}
                </div>
                <div className="text-sm text-gray-600">Available Now</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{skillsOverview.skillGaps.length}</div>
                <div className="text-sm text-gray-600">Skill Gaps</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="filter" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Skills Filter
          </TabsTrigger>
          {enableProjectMatching && (
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Project Matching
            </TabsTrigger>
          )}
          {showAnalytics && (
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          )}
        </TabsList>

        {/* Skills Filter Tab */}
        <TabsContent value="filter" className="space-y-6">
          <AdvancedSkillsFilter
            onFilterChange={handleFilterResults}
            onSaveFilter={handleSaveFilter}
            savedFilters={savedSearches.map(s => ({ id: s.id, name: s.name, criteria: s.criteria }))}
            showCapacityFilter={true}
            showLocationFilter={true}
            showTeamAnalytics={true}
            maxResults={maxResults}
            enableExport={true}
          />

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Search Results ({searchResults.length})
                  </span>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {searchResults.filter(r => r.availability === 'available').length} available
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {searchResults.slice(0, 10).map((result) => (
                    <div key={result.employeeId} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">{result.employeeName}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span>{result.department}</span>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {result.location}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
                            {result.overallScore}%
                          </div>
                          <div className="text-xs text-gray-600">Match Score</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <Badge className={getAvailabilityColor(result.availability)}>
                          {result.availability}
                        </Badge>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {result.capacity}% capacity
                          </div>
                          {result.hourlyRate && (
                            <div>${result.hourlyRate}/hr</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">Matched Skills</div>
                        <div className="flex flex-wrap gap-2">
                          {result.matchedSkills.slice(0, 5).map((skill, index) => (
                            <div key={index} className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {skill.skillName}
                              </Badge>
                              <Badge className="text-xs">
                                {skill.proficiency}
                              </Badge>
                              {skill.certified && (
                                <Award className="w-3 h-3 text-yellow-500" />
                              )}
                            </div>
                          ))}
                          {result.matchedSkills.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{result.matchedSkills.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {searchResults.length > 10 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline">
                      Show {searchResults.length - 10} more results
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Project Matching Tab */}
        {enableProjectMatching && (
          <TabsContent value="projects" className="space-y-6">
            <ProjectSkillMatcher
              onMatchComplete={handleProjectMatch}
              enableTeamOptimization={true}
              showCostAnalysis={true}
              maxTeamSize={8}
            />
          </TabsContent>
        )}

        {/* Analytics Tab */}
        {showAnalytics && (
          <TabsContent value="analytics" className="space-y-6">
            {skillsOverview && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Skills Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle>Skills by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(skillsOverview.categoryBreakdown).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="capitalize font-medium">{category}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${(count / skillsOverview.totalSkills) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold w-8">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Skills */}
                <Card>
                  <CardHeader>
                    <CardTitle>Most In-Demand Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {skillsOverview.topSkills.map((skill, index) => (
                        <div key={skill.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                              {index + 1}
                            </div>
                            <span className="font-medium">{skill.name}</span>
                          </div>
                          <Badge variant="outline">{skill.count} employees</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Skill Gaps */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Critical Skill Gaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {skillsOverview.skillGaps.map((gap) => (
                        <div key={gap.skill} className="flex items-center justify-between">
                          <span className="font-medium">{gap.skill}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-red-500 h-2 rounded-full transition-all"
                                style={{ width: `${gap.gap}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold w-8 text-red-600">{gap.gap}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Saved Searches */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Searches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {savedSearches.slice(0, 5).map((search) => (
                        <div key={search.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{search.name}</div>
                            <div className="text-xs text-gray-600">
                              {search.createdAt.toLocaleDateString()}
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Load
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
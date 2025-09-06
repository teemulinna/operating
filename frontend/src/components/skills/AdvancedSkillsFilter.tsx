import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Slider } from '../ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Search, Filter, X, Users, Award, TrendingUp, Target, Zap } from 'lucide-react';
import { skillService } from '../../services/skillService';
import type { Skill, ProficiencyLevel } from '../../models/Skill';

interface SkillFilterCriteria {
  skillIds: string[];
  categories: string[];
  minProficiency: ProficiencyLevel;
  minExperience: number;
  requireCertification: boolean;
  availability: 'available' | 'partial' | 'any';
  capacityRange: [number, number];
  location: string[];
  teamCompatibility: boolean;
}

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
    lastUsed: Date;
    confidence: number;
  }>;
  overallScore: number;
  availability: 'available' | 'partial' | 'busy';
  capacity: number;
  location: string;
  hourlyRate?: number;
}

interface AdvancedSkillsFilterProps {
  onFilterChange: (results: SkillMatch[]) => void;
  onSaveFilter?: (filter: SkillFilterCriteria & { name: string }) => void;
  savedFilters?: Array<{ id: string; name: string; criteria: SkillFilterCriteria }>;
  showCapacityFilter?: boolean;
  showLocationFilter?: boolean;
  showTeamAnalytics?: boolean;
  maxResults?: number;
  enableExport?: boolean;
}

const PROFICIENCY_LEVELS: ProficiencyLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const SKILL_CATEGORIES = ['technical', 'soft', 'domain', 'certification', 'language'];

const PROFICIENCY_WEIGHTS = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Expert: 4
};

export function AdvancedSkillsFilter({
  onFilterChange,
  onSaveFilter,
  savedFilters = [],
  showCapacityFilter = true,
  showLocationFilter = true,
  showTeamAnalytics = false,
  maxResults = 50,
  enableExport = false
}: AdvancedSkillsFilterProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<Skill[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SkillMatch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  
  const [criteria, setCriteria] = useState<SkillFilterCriteria>({
    skillIds: [],
    categories: [],
    minProficiency: 'Beginner',
    minExperience: 0,
    requireCertification: false,
    availability: 'any',
    capacityRange: [0, 100],
    location: [],
    teamCompatibility: false
  });

  const [analytics, setAnalytics] = useState<{
    totalMatches: number;
    averageScore: number;
    skillCoverage: Record<string, number>;
    availabilityBreakdown: Record<string, number>;
    departmentDistribution: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  useEffect(() => {
    filterSkills();
  }, [skills, searchTerm]);

  useEffect(() => {
    if (criteria.skillIds.length > 0 || criteria.categories.length > 0) {
      performSearch();
    } else {
      setResults([]);
      setAnalytics(null);
    }
  }, [criteria]);

  const loadSkills = async () => {
    try {
      const allSkills = await skillService.getAllSkills();
      setSkills(allSkills);
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
  };

  const filterSkills = () => {
    let filtered = skills;

    if (searchTerm) {
      filtered = skills.filter(skill =>
        skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skill.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skill.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (criteria.categories.length > 0) {
      filtered = filtered.filter(skill => 
        criteria.categories.includes(skill.category)
      );
    }

    setFilteredSkills(filtered);
  };

  const performSearch = async () => {
    if (criteria.skillIds.length === 0 && criteria.categories.length === 0) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Mock implementation - in real app, this would call the backend
      const mockResults = await generateMockResults();
      const sortedResults = mockResults
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, maxResults);
      
      setResults(sortedResults);
      generateAnalytics(sortedResults);
      onFilterChange(sortedResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockResults = async (): Promise<SkillMatch[]> => {
    // Mock implementation - replace with actual API call
    const mockEmployees = [
      { id: '1', name: 'Alice Johnson', department: 'Engineering', location: 'San Francisco' },
      { id: '2', name: 'Bob Smith', department: 'Product', location: 'Remote' },
      { id: '3', name: 'Carol Davis', department: 'Design', location: 'New York' },
      { id: '4', name: 'David Wilson', department: 'Data Science', location: 'Austin' },
      { id: '5', name: 'Eve Martinez', department: 'Engineering', location: 'San Francisco' }
    ];

    return mockEmployees.map(emp => ({
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      location: emp.location,
      availability: Math.random() > 0.5 ? 'available' : 'partial' as 'available' | 'partial',
      capacity: Math.floor(Math.random() * 100),
      overallScore: Math.floor(Math.random() * 100),
      matchedSkills: criteria.skillIds.map(skillId => {
        const skill = skills.find(s => s.id === skillId);
        return {
          skillId,
          skillName: skill?.name || 'Unknown',
          proficiency: PROFICIENCY_LEVELS[Math.floor(Math.random() * PROFICIENCY_LEVELS.length)],
          experience: Math.floor(Math.random() * 10),
          certified: Math.random() > 0.7,
          lastUsed: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
          confidence: Math.floor(Math.random() * 100)
        };
      }),
      hourlyRate: Math.floor(Math.random() * 100) + 50
    }));
  };

  const generateAnalytics = (results: SkillMatch[]) => {
    if (results.length === 0) {
      setAnalytics(null);
      return;
    }

    const totalMatches = results.length;
    const averageScore = results.reduce((sum, r) => sum + r.overallScore, 0) / totalMatches;
    
    const skillCoverage: Record<string, number> = {};
    const availabilityBreakdown: Record<string, number> = {};
    const departmentDistribution: Record<string, number> = {};

    results.forEach(result => {
      // Availability breakdown
      availabilityBreakdown[result.availability] = (availabilityBreakdown[result.availability] || 0) + 1;
      
      // Department distribution
      departmentDistribution[result.department] = (departmentDistribution[result.department] || 0) + 1;
      
      // Skill coverage
      result.matchedSkills.forEach(skill => {
        skillCoverage[skill.skillName] = (skillCoverage[skill.skillName] || 0) + 1;
      });
    });

    setAnalytics({
      totalMatches,
      averageScore: Math.round(averageScore),
      skillCoverage,
      availabilityBreakdown,
      departmentDistribution
    });
  };

  const handleSkillToggle = (skillId: string) => {
    setCriteria(prev => ({
      ...prev,
      skillIds: prev.skillIds.includes(skillId)
        ? prev.skillIds.filter(id => id !== skillId)
        : [...prev.skillIds, skillId]
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setCriteria(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const clearAllFilters = () => {
    setCriteria({
      skillIds: [],
      categories: [],
      minProficiency: 'Beginner',
      minExperience: 0,
      requireCertification: false,
      availability: 'any',
      capacityRange: [0, 100],
      location: [],
      teamCompatibility: false
    });
    setSearchTerm('');
    setResults([]);
    setAnalytics(null);
  };

  const saveFilter = () => {
    if (!filterName.trim() || !onSaveFilter) return;
    
    onSaveFilter({
      name: filterName,
      ...criteria
    });
    
    setFilterName('');
    setShowSaveDialog(false);
  };

  const loadSavedFilter = (savedCriteria: SkillFilterCriteria) => {
    setCriteria(savedCriteria);
  };

  const exportResults = () => {
    if (!enableExport || results.length === 0) return;

    const csvData = results.map(result => ({
      Employee: result.employeeName,
      Department: result.department,
      'Overall Score': result.overallScore,
      Availability: result.availability,
      'Capacity %': result.capacity,
      Location: result.location,
      'Matched Skills': result.matchedSkills.map(s => s.skillName).join('; '),
      'Avg Proficiency': result.matchedSkills.reduce((sum, s) => sum + PROFICIENCY_WEIGHTS[s.proficiency], 0) / result.matchedSkills.length
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skills_search_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Advanced Skills Filter
              </CardTitle>
              <CardDescription>
                Find the perfect team members based on skills, availability, and capacity
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {savedFilters.length > 0 && (
                <Select onValueChange={(filterId) => {
                  const savedFilter = savedFilters.find(f => f.id === filterId);
                  if (savedFilter) loadSavedFilter(savedFilter.criteria);
                }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Load saved filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedFilters.map(filter => (
                      <SelectItem key={filter.id} value={filter.id}>
                        {filter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" onClick={clearAllFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear All
              </Button>
              {onSaveFilter && (
                <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Save Filter</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Filter</DialogTitle>
                      <DialogDescription>
                        Save this filter configuration for future use
                      </DialogDescription>
                    </DialogHeader>
                    <Input
                      placeholder="Filter name"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveFilter} disabled={!filterName.trim()}>
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Skill Search */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filters */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Categories</Label>
              <div className="flex flex-wrap gap-2">
                {SKILL_CATEGORIES.map(category => (
                  <Button
                    key={category}
                    variant={criteria.categories.includes(category) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleCategoryToggle(category)}
                    className="capitalize"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            {/* Selected Skills */}
            {criteria.skillIds.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Selected Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {criteria.skillIds.map(skillId => {
                    const skill = skills.find(s => s.id === skillId);
                    return (
                      <Badge key={skillId} variant="secondary" className="flex items-center gap-1">
                        {skill?.name}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => handleSkillToggle(skillId)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Skill Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto border rounded p-3">
              {filteredSkills.map(skill => (
                <div key={skill.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={criteria.skillIds.includes(skill.id)}
                    onCheckedChange={() => handleSkillToggle(skill.id)}
                  />
                  <span className="text-sm">{skill.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {skill.category}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Criteria */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Proficiency Level */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Minimum Proficiency</Label>
              <Select
                value={criteria.minProficiency}
                onValueChange={(value) => setCriteria(prev => ({ 
                  ...prev, 
                  minProficiency: value as ProficiencyLevel 
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

            {/* Experience */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Min Experience: {criteria.minExperience} years
              </Label>
              <Slider
                value={[criteria.minExperience]}
                onValueChange={(values) => setCriteria(prev => ({ 
                  ...prev, 
                  minExperience: values[0] 
                }))}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            {/* Availability */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Availability</Label>
              <Select
                value={criteria.availability}
                onValueChange={(value) => setCriteria(prev => ({ 
                  ...prev, 
                  availability: value as 'available' | 'partial' | 'any'
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="partial">Partially Available</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Capacity Range */}
            {showCapacityFilter && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Capacity: {criteria.capacityRange[0]}% - {criteria.capacityRange[1]}%
                </Label>
                <Slider
                  value={criteria.capacityRange}
                  onValueChange={(values) => setCriteria(prev => ({ 
                    ...prev, 
                    capacityRange: values as [number, number]
                  }))}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            )}

            {/* Certification */}
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={criteria.requireCertification}
                onCheckedChange={(checked) => setCriteria(prev => ({ 
                  ...prev, 
                  requireCertification: !!checked 
                }))}
              />
              <Label className="text-sm">Require Certification</Label>
            </div>

            {/* Team Compatibility */}
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={criteria.teamCompatibility}
                onCheckedChange={(checked) => setCriteria(prev => ({ 
                  ...prev, 
                  teamCompatibility: !!checked 
                }))}
              />
              <Label className="text-sm">Team Compatibility</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Dashboard */}
      {showTeamAnalytics && analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Team Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analytics.totalMatches}</div>
                <div className="text-sm text-gray-600">Total Matches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analytics.averageScore}</div>
                <div className="text-sm text-gray-600">Avg Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(analytics.skillCoverage).length}
                </div>
                <div className="text-sm text-gray-600">Skills Covered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Object.keys(analytics.departmentDistribution).length}
                </div>
                <div className="text-sm text-gray-600">Departments</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2">Availability</h4>
                {Object.entries(analytics.availabilityBreakdown).map(([status, count]) => (
                  <div key={status} className="flex justify-between text-sm">
                    <span className="capitalize">{status}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-medium mb-2">Top Departments</h4>
                {Object.entries(analytics.departmentDistribution)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([dept, count]) => (
                    <div key={dept} className="flex justify-between text-sm">
                      <span>{dept}</span>
                      <span>{count}</span>
                    </div>
                  ))}
              </div>
              <div>
                <h4 className="font-medium mb-2">Skill Coverage</h4>
                {Object.entries(analytics.skillCoverage)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([skill, count]) => (
                    <div key={skill} className="flex justify-between text-sm">
                      <span className="truncate">{skill}</span>
                      <span>{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Button */}
      {enableExport && results.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={exportResults} className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Export Results ({results.length})
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Searching for matching team members...</span>
        </div>
      )}
    </div>
  );
}
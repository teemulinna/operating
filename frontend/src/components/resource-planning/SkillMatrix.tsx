import React, { useState, useMemo } from 'react';
import { Target, User, AlertTriangle, Search, Filter, Star, TrendingUp } from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  skills: string[];
  seniority?: 'junior' | 'mid' | 'senior' | 'lead';
  department?: string;
}

interface Project {
  id: number;
  name: string;
  requiredSkills: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface SkillMatrixProps {
  employees: Employee[];
  projects: Project[];
  onSkillFilter?: (skill: string) => void;
  onEmployeeSelect?: (employeeId: number) => void;
  onProjectSelect?: (projectId: number) => void;
  showSkillGaps?: boolean;
}

interface SkillMatchIndicatorProps {
  hasSkill: boolean;
  isRequired: boolean;
  skillLevel?: 'basic' | 'intermediate' | 'advanced';
  employeeId: number;
  projectId: number;
  skill: string;
}

const SkillMatchIndicator: React.FC<SkillMatchIndicatorProps> = ({
  hasSkill,
  isRequired,
  skillLevel = 'intermediate',
  employeeId,
  projectId,
  skill
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getIndicatorStyle = () => {
    if (!isRequired && !hasSkill) return 'bg-gray-100';
    if (!isRequired && hasSkill) return 'bg-blue-100 border border-blue-300';
    if (isRequired && !hasSkill) return 'bg-red-100 border border-red-300';
    if (isRequired && hasSkill) return 'bg-green-500';
    return 'bg-gray-100';
  };

  const getIndicatorContent = () => {
    if (!isRequired && !hasSkill) return null;
    if (!isRequired && hasSkill) return <div className="w-2 h-2 bg-blue-500 rounded-full" />;
    if (isRequired && !hasSkill) return <AlertTriangle className="w-3 h-3 text-red-500" />;
    if (isRequired && hasSkill) {
      const levelIcons = {
        basic: 1,
        intermediate: 2,
        advanced: 3
      };
      return (
        <div className="flex">
          {Array.from({ length: levelIcons[skillLevel] }, (_, i) => (
            <Star key={i} className="w-2 h-2 text-white fill-current" />
          ))}
        </div>
      );
    }
    return null;
  };

  const getTooltipText = () => {
    if (!isRequired && !hasSkill) return 'Skill not required, not available';
    if (!isRequired && hasSkill) return `Has ${skill} skill (not required)`;
    if (isRequired && !hasSkill) return `Missing required skill: ${skill}`;
    if (isRequired && hasSkill) return `Has required skill: ${skill} (${skillLevel})`;
    return '';
  };

  return (
    <div className="relative">
      <div
        data-testid={`skill-match-${employeeId}-${projectId}-${skill}`}
        className={`w-8 h-8 rounded flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 ${getIndicatorStyle()}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {getIndicatorContent()}
      </div>
      
      {showTooltip && (
        <div className="absolute z-10 bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
          {getTooltipText()}
        </div>
      )}
    </div>
  );
};

export const SkillMatrix: React.FC<SkillMatrixProps> = ({
  employees,
  projects,
  onSkillFilter,
  onEmployeeSelect,
  onProjectSelect,
  showSkillGaps = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [view, setView] = useState<'matrix' | 'gaps' | 'recommendations'>('matrix');

  // Extract all unique skills
  const allSkills = useMemo(() => {
    const skillSet = new Set<string>();
    employees.forEach(emp => emp.skills?.forEach(skill => skillSet.add(skill)));
    projects.forEach(proj => proj.requiredSkills?.forEach(skill => skillSet.add(skill)));
    return Array.from(skillSet).sort();
  }, [employees, projects]);

  // Filter data based on search and filters
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           emp.skills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
      const matchesSkill = !selectedSkill || emp.skills?.includes(selectedSkill);
      
      return matchesSearch && matchesDepartment && matchesSkill;
    });
  }, [employees, searchTerm, departmentFilter, selectedSkill]);

  const filteredProjects = useMemo(() => {
    return projects.filter(proj => {
      const matchesSearch = proj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           proj.requiredSkills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesPriority = priorityFilter === 'all' || proj.priority === priorityFilter;
      const matchesSkill = !selectedSkill || proj.requiredSkills?.includes(selectedSkill);
      
      return matchesSearch && matchesPriority && matchesSkill;
    });
  }, [projects, searchTerm, priorityFilter, selectedSkill]);

  // Calculate skill gaps
  const skillGaps = useMemo(() => {
    const gaps: { skill: string; requiredBy: string[]; availableFrom: string[]; severity: 'low' | 'medium' | 'high' }[] = [];
    
    allSkills.forEach(skill => {
      const requiredByProjects = projects.filter(proj => proj.requiredSkills?.includes(skill));
      const availableFromEmployees = employees.filter(emp => emp.skills?.includes(skill));
      
      if (requiredByProjects.length > availableFromEmployees.length) {
        const highPriorityProjects = requiredByProjects.filter(p => p.priority === 'high' || p.priority === 'critical');
        const severity = highPriorityProjects.length > 0 ? 'high' : 
                        requiredByProjects.length > availableFromEmployees.length * 2 ? 'medium' : 'low';
        
        gaps.push({
          skill,
          requiredBy: requiredByProjects.map(p => p.name),
          availableFrom: availableFromEmployees.map(e => e.name),
          severity
        });
      }
    });
    
    return gaps.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [allSkills, projects, employees]);

  const departments = useMemo(() => {
    return Array.from(new Set(employees.map(emp => emp.department).filter(Boolean)));
  }, [employees]);

  const handleSkillClick = (skill: string) => {
    const newSelectedSkill = selectedSkill === skill ? null : skill;
    setSelectedSkill(newSelectedSkill);
    if (newSelectedSkill) {
      onSkillFilter?.(newSelectedSkill);
    }
  };

  const getSkillMatchScore = (employee: Employee, project: Project) => {
    const requiredSkills = project.requiredSkills || [];
    const employeeSkills = employee.skills || [];
    const matches = requiredSkills.filter(skill => employeeSkills.includes(skill));
    return requiredSkills.length > 0 ? (matches.length / requiredSkills.length) * 100 : 0;
  };

  if (view === 'gaps') {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-xl font-semibold text-gray-900">Skill Gaps Analysis</h3>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setView('matrix')}
                className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Matrix View
              </button>
              <button
                onClick={() => setView('recommendations')}
                className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Recommendations
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {skillGaps.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Skill Gaps Found</h4>
              <p className="text-gray-600">All required skills are adequately covered by your team.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {skillGaps.map((gap, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    gap.severity === 'high' ? 'border-red-500 bg-red-50' :
                    gap.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                  data-testid="skill-gap-warning"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{gap.skill}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Required by {gap.requiredBy.length} project{gap.requiredBy.length > 1 ? 's' : ''}, 
                        available from {gap.availableFrom.length} team member{gap.availableFrom.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      gap.severity === 'high' ? 'bg-red-100 text-red-700' :
                      gap.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {gap.severity} priority
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">Required by:</div>
                      <div className="text-gray-600">{gap.requiredBy.join(', ')}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Available from:</div>
                      <div className="text-gray-600">{gap.availableFrom.length > 0 ? gap.availableFrom.join(', ') : 'None'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Target className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Skill Matrix</h3>
            {showSkillGaps && skillGaps.length > 0 && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 rounded-full">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  {skillGaps.length} skill gap{skillGaps.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setView('gaps')}
              className={`px-3 py-2 text-sm border rounded-lg ${
                view === 'gaps' ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
              }`}
            >
              Skill Gaps
            </button>
            <button
              onClick={() => setView('recommendations')}
              className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              Recommendations
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {selectedSkill && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 rounded-full">
              <span className="text-sm font-medium text-blue-700">Filtering by: {selectedSkill}</span>
              <button
                onClick={() => setSelectedSkill(null)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Skill Headers */}
          <div className="bg-gray-50 border-b">
            <div className="flex">
              <div className="w-48 p-3 font-medium text-gray-700 border-r">
                Employee / Project
              </div>
              <div className="flex-1 flex">
                {allSkills.map((skill, index) => (
                  <div
                    key={skill}
                    className={`w-12 p-2 text-xs font-medium text-gray-600 border-r last:border-r-0 cursor-pointer hover:bg-blue-50 transition-colors ${
                      selectedSkill === skill ? 'bg-blue-100' : ''
                    }`}
                    onClick={() => handleSkillClick(skill)}
                    title={skill}
                  >
                    <div className="transform -rotate-45 origin-bottom-left whitespace-nowrap overflow-hidden">
                      {skill}
                    </div>
                  </div>
                ))}
              </div>
              <div className="w-24 p-3 text-xs font-medium text-gray-600 text-center">
                Match %
              </div>
            </div>
          </div>

          {/* Employee Rows */}
          <div className="divide-y">
            {filteredEmployees.map((employee) => (
              <div key={`emp-${employee.id}`} className="flex hover:bg-gray-50">
                <div className="w-48 p-3 border-r flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <div 
                      className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                      onClick={() => onEmployeeSelect?.(employee.id)}
                    >
                      {employee.name}
                    </div>
                    {employee.department && (
                      <div className="text-xs text-gray-500">{employee.department}</div>
                    )}
                  </div>
                </div>
                <div className="flex-1 flex">
                  {allSkills.map((skill) => (
                    <div key={skill} className="w-12 p-2 border-r last:border-r-0 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500" 
                           style={{ 
                             opacity: employee.skills?.includes(skill) ? 1 : 0,
                             backgroundColor: employee.skills?.includes(skill) ? '#3b82f6' : 'transparent'
                           }} 
                      />
                    </div>
                  ))}
                </div>
                <div className="w-24 p-3 text-center text-sm text-gray-600">
                  —
                </div>
              </div>
            ))}
          </div>

          {/* Project Rows */}
          <div className="border-t-2 border-gray-200">
            {filteredProjects.map((project) => (
              <div key={`proj-${project.id}`} className="flex hover:bg-gray-50">
                <div className="w-48 p-3 border-r bg-gray-50 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <div>
                    <div 
                      className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                      onClick={() => onProjectSelect?.(project.id)}
                    >
                      {project.name}
                    </div>
                    {project.priority && (
                      <div className={`text-xs px-1 rounded ${
                        project.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        project.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        project.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {project.priority}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 flex">
                  {allSkills.map((skill) => (
                    <div key={skill} className="w-12 p-2 border-r last:border-r-0 flex items-center justify-center">
                      {project.requiredSkills?.includes(skill) && (
                        <Target className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="w-24 p-3 text-center text-sm text-gray-600">
                  —
                </div>
              </div>
            ))}
          </div>

          {/* Match Matrix */}
          <div className="border-t-2 border-gray-200 bg-gray-50">
            <div className="p-3 text-sm font-medium text-gray-700">
              Employee-Project Skill Matches
            </div>
            {filteredEmployees.map((employee) => (
              <div key={`match-${employee.id}`}>
                {filteredProjects.map((project) => {
                  const matchScore = getSkillMatchScore(employee, project);
                  return (
                    <div key={`${employee.id}-${project.id}`} className="flex hover:bg-gray-100">
                      <div className="w-48 p-2 text-xs text-gray-600 border-r">
                        {employee.name} → {project.name}
                      </div>
                      <div className="flex-1 flex">
                        {allSkills.map((skill) => (
                          <div key={skill} className="w-12 p-2 border-r last:border-r-0 flex items-center justify-center">
                            <SkillMatchIndicator
                              hasSkill={employee.skills?.includes(skill) || false}
                              isRequired={project.requiredSkills?.includes(skill) || false}
                              employeeId={employee.id}
                              projectId={project.id}
                              skill={skill}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="w-24 p-2 text-center">
                        <div className={`text-xs font-medium px-2 py-1 rounded ${
                          matchScore >= 80 ? 'bg-green-100 text-green-700' :
                          matchScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          matchScore >= 40 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {matchScore.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Has Skill</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="w-3 h-3 text-red-500" />
              <span className="text-sm text-gray-600">Required</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Match</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-sm text-gray-600">Gap</span>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            {filteredEmployees.length} employees × {filteredProjects.length} projects
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillMatrix;
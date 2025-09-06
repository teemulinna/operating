import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Plus, Edit2, Trash2, Save, X, Filter, Download, Upload } from 'lucide-react';
import { skillService } from '../../services/skillService';
import type { Employee } from '../../models/Employee';
import type { Skill, EmployeeSkill, ProficiencyLevel } from '../../models/Skill';

interface SkillsMatrixProps {
  employee: Employee;
  onBulkUpdate?: (updates: Array<{
    skill_id: string;
    proficiency_level: ProficiencyLevel;
    years_experience: number;
  }>) => void;
  showAnalytics?: boolean;
  editable?: boolean;
}

interface SkillFormData {
  skill_id: string;
  proficiency_level: ProficiencyLevel;
  years_experience: number;
  is_certified: boolean;
  certification_date?: Date;
  certification_body?: string;
  notes?: string;
}

const PROFICIENCY_LEVELS: ProficiencyLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const PROFICIENCY_COLORS = {
  Beginner: 'bg-red-100 text-red-800',
  Intermediate: 'bg-yellow-100 text-yellow-800',
  Advanced: 'bg-blue-100 text-blue-800',
  Expert: 'bg-green-100 text-green-800',
};

export function SkillsMatrix({ 
  employee, 
  onBulkUpdate, 
  showAnalytics = false, 
  editable = true 
}: SkillsMatrixProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<EmployeeSkill[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<EmployeeSkill | null>(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const [formData, setFormData] = useState<SkillFormData>({
    skill_id: '',
    proficiency_level: 'Beginner',
    years_experience: 0,
    is_certified: false,
    certification_date: undefined,
    certification_body: '',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [employee.id]);

  useEffect(() => {
    filterSkills();
  }, [employeeSkills, categoryFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allSkills, empSkills] = await Promise.all([
        skillService.getAllSkills(),
        skillService.getEmployeeSkills(employee.id)
      ]);

      setSkills(allSkills);
      setEmployeeSkills(empSkills);

      if (showAnalytics) {
        const analyticsData = await skillService.getEmployeeSkillsAnalytics(employee.id);
        setAnalytics(analyticsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills data');
    } finally {
      setLoading(false);
    }
  };

  const filterSkills = () => {
    let filtered = employeeSkills;

    if (categoryFilter !== 'all') {
      filtered = employeeSkills.filter(es => {
        const skill = skills.find(s => s.id === es.skill_id);
        return skill?.category === categoryFilter;
      });
    }

    setFilteredSkills(filtered);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.skill_id) {
      errors.skill_id = 'Skill is required';
    }

    if (!formData.proficiency_level) {
      errors.proficiency_level = 'Proficiency level is required';
    }

    if (formData.years_experience < 0) {
      errors.years_experience = 'Years of experience cannot be negative';
    }

    if (formData.is_certified && !formData.certification_body) {
      errors.certification_body = 'Certification body is required when certified';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSkill = async () => {
    if (!validateForm()) return;

    try {
      const newSkill = await skillService.addEmployeeSkill({
        employee_id: employee.id,
        ...formData
      });

      setEmployeeSkills(prev => [...prev, newSkill]);
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add skill');
    }
  };

  const handleUpdateSkill = async (skillId: string, updates: Partial<SkillFormData>) => {
    try {
      const updatedSkill = await skillService.updateEmployeeSkill(skillId, updates);
      
      setEmployeeSkills(prev => 
        prev.map(es => es.id === skillId ? { ...es, ...updatedSkill } : es)
      );
      
      setEditingSkill(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update skill');
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    const employeeSkill = employeeSkills.find(es => es.skill_id === skillId);
    if (!employeeSkill) return;

    try {
      await skillService.removeEmployeeSkill(employee.id, skillId);
      setEmployeeSkills(prev => prev.filter(es => es.skill_id !== skillId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove skill');
    }
  };

  const handleBulkUpdate = async () => {
    if (!onBulkUpdate || selectedSkills.length === 0) return;

    const updates = selectedSkills.map(skillId => {
      const employeeSkill = employeeSkills.find(es => es.skill_id === skillId);
      return {
        skill_id: skillId,
        proficiency_level: employeeSkill?.proficiency_level || 'Beginner' as ProficiencyLevel,
        years_experience: employeeSkill?.years_experience || 0
      };
    });

    onBulkUpdate(updates);
    setBulkEditMode(false);
    setSelectedSkills([]);
  };

  const resetForm = () => {
    setFormData({
      skill_id: '',
      proficiency_level: 'Beginner',
      years_experience: 0,
      is_certified: false,
      certification_date: undefined,
      certification_body: '',
      notes: ''
    });
    setFormErrors({});
  };

  const exportSkills = async () => {
    try {
      const blob = await skillService.exportEmployeeSkills(employee.id, 'csv');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${employee.first_name}_${employee.last_name}_skills.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export skills');
    }
  };

  const getSkillName = (skillId: string): string => {
    const skill = skills.find(s => s.id === skillId);
    return skill?.name || 'Unknown Skill';
  };

  const getSkillCategory = (skillId: string): string => {
    const skill = skills.find(s => s.id === skillId);
    return skill?.category || 'Unknown';
  };

  const getAvailableSkills = () => {
    const employeeSkillIds = employeeSkills.map(es => es.skill_id);
    return skills.filter(skill => !employeeSkillIds.includes(skill.id));
  };

  const getCategories = () => {
    const categories = [...new Set(skills.map(skill => skill.category))];
    return categories.sort();
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading skills matrix...</div>;
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Skills Matrix - {employee.first_name} {employee.last_name}</CardTitle>
            <CardDescription>
              Manage and track employee skills and proficiency levels
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {editable && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkEditMode(!bulkEditMode)}
                >
                  {bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Skill
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Skill</DialogTitle>
                      <DialogDescription>
                        Add a new skill to {employee.first_name}'s profile
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="skill">Skill</Label>
                        <Select
                          value={formData.skill_id}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, skill_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a skill" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableSkills().map(skill => (
                              <SelectItem key={skill.id} value={skill.id}>
                                {skill.name} ({skill.category})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formErrors.skill_id && (
                          <p className="text-sm text-red-600 mt-1">{formErrors.skill_id}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="proficiency">Proficiency Level</Label>
                        <Select
                          value={formData.proficiency_level}
                          onValueChange={(value) => setFormData(prev => ({ 
                            ...prev, 
                            proficiency_level: value as ProficiencyLevel 
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
                        {formErrors.proficiency_level && (
                          <p className="text-sm text-red-600 mt-1">{formErrors.proficiency_level}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="experience">Years of Experience</Label>
                        <Input
                          id="experience"
                          type="number"
                          min="0"
                          value={formData.years_experience}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            years_experience: parseInt(e.target.value) || 0 
                          }))}
                        />
                        {formErrors.years_experience && (
                          <p className="text-sm text-red-600 mt-1">{formErrors.years_experience}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="certified"
                          checked={formData.is_certified}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            is_certified: e.target.checked 
                          }))}
                        />
                        <Label htmlFor="certified">Certified</Label>
                      </div>

                      {formData.is_certified && (
                        <div>
                          <Label htmlFor="certBody">Certification Body</Label>
                          <Input
                            id="certBody"
                            value={formData.certification_body}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              certification_body: e.target.value 
                            }))}
                          />
                          {formErrors.certification_body && (
                            <p className="text-sm text-red-600 mt-1">{formErrors.certification_body}</p>
                          )}
                        </div>
                      )}

                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <textarea
                          id="notes"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={3}
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            notes: e.target.value 
                          }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddSkill}>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
            <Button variant="outline" size="sm" onClick={exportSkills}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <Label>Category:</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {getCategories().map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Edit Actions */}
          {bulkEditMode && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <p className="text-sm text-blue-700">
                  {selectedSkills.length} skills selected
                </p>
                <Button
                  size="sm"
                  onClick={handleBulkUpdate}
                  disabled={selectedSkills.length === 0}
                >
                  Apply Changes
                </Button>
              </div>
            </div>
          )}

          {/* Skills Table */}
          <Table>
            <TableHeader>
              <TableRow>
                {bulkEditMode && <TableHead className="w-12"></TableHead>}
                <TableHead>Skill</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Proficiency</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Certified</TableHead>
                <TableHead>Last Used</TableHead>
                {editable && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSkills.map((employeeSkill) => (
                <TableRow key={employeeSkill.id}>
                  {bulkEditMode && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedSkills.includes(employeeSkill.skill_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSkills(prev => [...prev, employeeSkill.skill_id]);
                          } else {
                            setSelectedSkills(prev => prev.filter(id => id !== employeeSkill.skill_id));
                          }
                        }}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    {getSkillName(employeeSkill.skill_id)}
                  </TableCell>
                  <TableCell>{getSkillCategory(employeeSkill.skill_id)}</TableCell>
                  <TableCell>
                    <Badge className={PROFICIENCY_COLORS[employeeSkill.proficiency_level]}>
                      {employeeSkill.proficiency_level}
                    </Badge>
                  </TableCell>
                  <TableCell>{employeeSkill.years_experience} years</TableCell>
                  <TableCell>
                    {employeeSkill.is_certified ? (
                      <div>
                        <Badge variant="secondary">Certified</Badge>
                        {employeeSkill.certification_body && (
                          <p className="text-xs text-gray-600 mt-1">
                            {employeeSkill.certification_body}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline">Not Certified</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {employeeSkill.last_used_date 
                      ? new Date(employeeSkill.last_used_date).toLocaleDateString()
                      : 'N/A'
                    }
                  </TableCell>
                  {editable && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSkill(employeeSkill)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveSkill(employeeSkill.skill_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredSkills.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No skills found. {editable && 'Add some skills to get started.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Card */}
      {showAnalytics && analytics && (
        <Card>
          <CardHeader>
            <CardTitle>Skills Analytics</CardTitle>
            <CardDescription>
              Insights and recommendations for skill development
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.skill_utilization}%
                </div>
                <div className="text-sm text-gray-600">Skill Utilization</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.certification_rate}%
                </div>
                <div className="text-sm text-gray-600">Certification Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {analytics.skill_gaps}
                </div>
                <div className="text-sm text-gray-600">Skill Gaps</div>
              </div>
            </div>
            
            {analytics.improvement_suggestions.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Improvement Suggestions</h4>
                <ul className="list-disc list-inside space-y-1">
                  {analytics.improvement_suggestions.map((suggestion: string, index: number) => (
                    <li key={index} className="text-sm text-gray-600">{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}